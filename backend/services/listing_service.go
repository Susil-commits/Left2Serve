package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"strings"

	"left2serve/backend/database"
	"left2serve/backend/models"
	"left2serve/backend/sockets"
	"left2serve/backend/utils"
)

type ListingService struct{}

var GlobalListingService = &ListingService{}

func (s *ListingService) GetAllListings(ctx context.Context, opts *models.ListingQueryOptions) (*models.PaginatedListings, error) {
	page := opts.Page
	if page < 1 {
		page = 1
	}
	limit := opts.Limit
	if limit < 1 {
		limit = 12
	} else if limit > 48 {
		limit = 48
	}

	selectCols := fmt.Sprintf(`fl.*, u.name as donor_name, u.organization as donor_org, GREATEST(%s, 0) AS remaining`, database.RemainingSQL)
	hasGeo := opts.Lat != nil && opts.Lng != nil

	if hasGeo {
		geoDist := fmt.Sprintf(`( 6371 * acos(LEAST(1.0, GREATEST(-1.0, cos(radians(%f)) * cos(radians(fl.latitude)) * cos(radians(fl.longitude) - radians(%f)) + sin(radians(%f)) * sin(radians(fl.latitude))))) ) AS distance_km`,
			*opts.Lat, *opts.Lng, *opts.Lat)
		selectCols += ", " + geoDist
	}

	baseQuery := fmt.Sprintf("FROM food_listings fl JOIN users u ON fl.user_id = u.id WHERE fl.is_template = false")
	countBaseQuery := "FROM food_listings fl WHERE fl.is_template = false"

	conditions := make([]string, 0)
	args := make([]any, 0)
	countArgs := make([]any, 0)
	argIdx := 1

	if hasGeo && opts.Distance != nil && *opts.Distance > 0 {
		radius := *opts.Distance
		latDelta := radius / 111.045
		lngDelta := radius / (111.045 * math.Cos(*opts.Lat*(math.Pi/180.0)))
		minLat, maxLat := *opts.Lat-latDelta, *opts.Lat+latDelta
		minLng, maxLng := *opts.Lng-lngDelta, *opts.Lng+lngDelta

		boxCond := fmt.Sprintf("fl.latitude BETWEEN $%d AND $%d AND fl.longitude BETWEEN $%d AND $%d",
			argIdx, argIdx+1, argIdx+2, argIdx+3)
		conditions = append(conditions, boxCond)
		args = append(args, minLat, maxLat, minLng, maxLng)
		countArgs = append(countArgs, minLat, maxLat, minLng, maxLng)
		argIdx += 4

		distCond := fmt.Sprintf(`( 6371 * acos(LEAST(1.0, GREATEST(-1.0, cos(radians($%d)) * cos(radians(fl.latitude)) * cos(radians(fl.longitude) - radians($%d)) + sin(radians($%d)) * sin(radians(fl.latitude))))) ) <= $%d`,
			argIdx, argIdx+1, argIdx+2, argIdx+3)
		conditions = append(conditions, distCond)
		args = append(args, *opts.Lat, *opts.Lng, *opts.Lat, radius)
		countArgs = append(countArgs, *opts.Lat, *opts.Lng, *opts.Lat, radius)
		argIdx += 4
	}

	if opts.Category != "" {
		conditions = append(conditions, fmt.Sprintf("fl.category = $%d", argIdx))
		args = append(args, opts.Category)
		countArgs = append(countArgs, opts.Category)
		argIdx++
	}

	if opts.Dietary != "" {
		tags := make([]string, 0)
		for _, t := range strings.Split(opts.Dietary, ",") {
			trimmed := strings.TrimSpace(t)
			if trimmed != "" {
				tags = append(tags, trimmed)
			}
		}
		if len(tags) > 0 {
			tagsJSON, _ := json.Marshal(tags)
			conditions = append(conditions, fmt.Sprintf("fl.dietary_preferences @> $%d::jsonb", argIdx))
			args = append(args, string(tagsJSON))
			countArgs = append(countArgs, string(tagsJSON))
			argIdx++
		}
	}

	if opts.Status != "" {
		conditions = append(conditions, fmt.Sprintf("fl.status = $%d", argIdx))
		args = append(args, opts.Status)
		countArgs = append(countArgs, opts.Status)
		argIdx++
	} else {
		conditions = append(conditions, "fl.status = 'available' AND fl.expiry_date > NOW()")
	}

	if opts.Search != "" {
		words := strings.Fields(opts.Search)
		if len(words) > 0 {
			for i, w := range words {
				words[i] = w + ":*"
			}
			tsQuery := strings.Join(words, " & ")
			vectorSQL := "to_tsvector('english', fl.title || ' ' || COALESCE(fl.description, '') || ' ' || fl.category)"
			conditions = append(conditions, fmt.Sprintf("%s @@ to_tsquery('english', $%d)", vectorSQL, argIdx))
			args = append(args, tsQuery)
			countArgs = append(countArgs, tsQuery)
			argIdx++
		}
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = " AND " + strings.Join(conditions, " AND ")
	}

	// Count query
	countQuery := fmt.Sprintf("SELECT COUNT(*) %s %s", countBaseQuery, whereClause)
	var total int
	err := database.DB.QueryRowContext(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, err
	}

	orderBy := "fl.created_at DESC"
	if opts.Sort == "expiring" {
		orderBy = "fl.expiry_date ASC"
	} else if opts.Sort == "quantity" {
		orderBy = "fl.quantity DESC, fl.created_at DESC"
	}

	offset := (page - 1) * limit
	finalQuery := fmt.Sprintf("SELECT %s %s %s ORDER BY %s LIMIT %d OFFSET %d",
		selectCols, baseQuery, whereClause, orderBy, limit, offset)

	rows, err := database.DB.QueryContext(ctx, finalQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	listings := make([]models.FoodListing, 0)
	for rows.Next() {
		var l models.FoodListing
		var rawImages, rawDietary []byte
		var donorName, donorOrg sql.NullString
		var distKM sql.NullFloat64

		scanDests := []any{
			&l.ID, &l.UserID, &l.Title, &l.Description, &l.Category, &l.Quantity, &l.Unit,
			&l.Price, &l.ExpiryDate, &l.PickupAddress, &l.PickupInstructions, &rawImages,
			&rawDietary, &l.Status, &l.CreatedAt, &l.Latitude, &l.Longitude,
			&l.HasSafetyChecklist, &l.IsTemplate, &donorName, &donorOrg, &l.Remaining,
		}

		if hasGeo {
			scanDests = append(scanDests, &distKM)
		}

		if err := rows.Scan(scanDests...); err != nil {
			return nil, err
		}

		if len(rawImages) > 0 {
			l.ImageURLs = json.RawMessage(rawImages)
		} else {
			l.ImageURLs = json.RawMessage("[]")
		}

		if len(rawDietary) > 0 {
			l.DietaryPreferences = json.RawMessage(rawDietary)
		} else {
			l.DietaryPreferences = json.RawMessage("[]")
		}

		if donorName.Valid {
			l.DonorName = &donorName.String
		}
		if donorOrg.Valid {
			l.DonorOrg = &donorOrg.String
		}
		if distKM.Valid {
			l.DistanceKM = &distKM.Float64
		}

		listings = append(listings, l)
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))
	if totalPages < 1 {
		totalPages = 1
	}

	return &models.PaginatedListings{
		Listings: listings,
		Pagination: models.ListingPagination{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}

func (s *ListingService) CreateListing(ctx context.Context, userID int, req *models.CreateListingRequest) (*models.FoodListing, error) {
	if req.Unit == "" {
		req.Unit = "servings"
	}

	imagesJSON, _ := json.Marshal(req.ImageURLs)
	if len(req.ImageURLs) == 0 {
		imagesJSON = []byte("[]")
	}

	dietaryJSON, _ := json.Marshal(req.DietaryPreferences)
	if len(req.DietaryPreferences) == 0 {
		dietaryJSON = []byte("[]")
	}

	var newID int
	err := database.DB.QueryRowContext(ctx, `
		INSERT INTO food_listings (
			user_id, title, description, category, quantity, unit, price, expiry_date, 
			pickup_address, pickup_instructions, image_urls, dietary_preferences, 
			latitude, longitude, has_safety_checklist, is_template
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
		RETURNING id`,
		userID, strings.TrimSpace(req.Title), req.Description, req.Category, req.Quantity, req.Unit,
		req.Price, req.ExpiryDate, strings.TrimSpace(req.PickupAddress), req.PickupInstructions,
		imagesJSON, dietaryJSON, req.Latitude, req.Longitude, req.HasSafetyChecklist, req.IsTemplate,
	).Scan(&newID)
	if err != nil {
		return nil, err
	}

	// Invalidate listings cache
	utils.InvalidateCachePrefix("__gin__/api/listings")

	listing, err := s.GetOne(ctx, newID, &models.User{ID: userID, Role: "donor"})
	if err != nil {
		return nil, err
	}

	// Trigger smart alerts for matching watchlists
	if req.Latitude != nil && req.Longitude != nil && !req.IsTemplate {
		go func() {
			bgCtx := context.Background()
			desc := ""
			if req.Description != nil {
				desc = *req.Description
			}
			searchStr := fmt.Sprintf("%s %s %s", req.Title, desc, req.Category)

			rows, err := database.DB.QueryContext(bgCtx, `
				SELECT user_id, keyword FROM watchlists 
				WHERE user_id != $1 
				  AND (keyword IS NULL OR keyword = '' OR $2 ILIKE '%' || keyword || '%')
				  AND ( 6371 * acos(LEAST(1.0, GREATEST(-1.0, cos(radians($3)) * cos(radians(latitude)) * cos(radians(longitude) - radians($4)) + sin(radians($5)) * sin(radians(latitude))))) ) <= radius_km`,
				userID, searchStr, *req.Latitude, *req.Longitude, *req.Latitude,
			)
			if err == nil {
				defer rows.Close()
				for rows.Next() {
					var watcherID int
					var kw sql.NullString
					if err := rows.Scan(&watcherID, &kw); err == nil {
						_ = GlobalNotificationService.CreateNotification(
							bgCtx,
							watcherID,
							"watchlist_alert",
							"New Food Alert!",
							fmt.Sprintf("A new listing \"%s\" matches your watchlist criteria!", req.Title),
							map[string]any{"listingId": newID, "keyword": kw.String},
						)
					}
				}
			}
		}()
	}

	if sockets.GlobalSocketServer != nil {
		sockets.GlobalSocketServer.EmitAll("new_listing", listing)
	}

	return listing, nil
}

func (s *ListingService) GetOne(ctx context.Context, id int, currentUser *models.User) (*models.FoodListing, error) {
	q := fmt.Sprintf(`
		SELECT fl.*, u.name as donor_name, u.organization as donor_org, u.phone as donor_phone, 
		       GREATEST(%s, 0) AS remaining 
		FROM food_listings fl 
		JOIN users u ON fl.user_id = u.id 
		WHERE fl.id = $1`, database.RemainingSQL)

	var l models.FoodListing
	var rawImages, rawDietary []byte
	var donorName, donorOrg, donorPhone sql.NullString

	err := database.DB.QueryRowContext(ctx, q, id).Scan(
		&l.ID, &l.UserID, &l.Title, &l.Description, &l.Category, &l.Quantity, &l.Unit,
		&l.Price, &l.ExpiryDate, &l.PickupAddress, &l.PickupInstructions, &rawImages,
		&rawDietary, &l.Status, &l.CreatedAt, &l.Latitude, &l.Longitude,
		&l.HasSafetyChecklist, &l.IsTemplate, &donorName, &donorOrg, &donorPhone, &l.Remaining,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	if len(rawImages) > 0 {
		l.ImageURLs = json.RawMessage(rawImages)
	} else {
		l.ImageURLs = json.RawMessage("[]")
	}

	if len(rawDietary) > 0 {
		l.DietaryPreferences = json.RawMessage(rawDietary)
	} else {
		l.DietaryPreferences = json.RawMessage("[]")
	}

	if donorName.Valid {
		l.DonorName = &donorName.String
	}
	if donorOrg.Valid {
		l.DonorOrg = &donorOrg.String
	}

	// Privacy check for donor phone
	canSeeDonorPhone := false
	if currentUser != nil {
		if currentUser.ID == l.UserID || currentUser.Role == "admin" {
			canSeeDonorPhone = true
		} else if currentUser.Role == "ngo" || currentUser.Role == "volunteer" {
			var resID int
			err := database.DB.QueryRowContext(ctx, `
				SELECT id FROM reservations 
				WHERE food_listing_id = $1 AND user_id = $2 AND status IN ('approved','collected')`,
				l.ID, currentUser.ID,
			).Scan(&resID)
			if err == nil {
				canSeeDonorPhone = true
			}
		}
	}

	if canSeeDonorPhone && donorPhone.Valid {
		l.DonorPhone = &donorPhone.String
	}

	return &l, nil
}

func (s *ListingService) UpdateListing(ctx context.Context, id, userID int, req *models.UpdateListingRequest) (*models.FoodListing, error) {
	var current models.FoodListing
	var rawImages, rawDietary []byte

	err := database.DB.QueryRowContext(ctx, `
		SELECT id, user_id, title, description, category, quantity, unit, price, expiry_date, 
		       pickup_address, pickup_instructions, image_urls, dietary_preferences, status, 
		       latitude, longitude 
		FROM food_listings WHERE id = $1`, id,
	).Scan(
		&current.ID, &current.UserID, &current.Title, &current.Description, &current.Category,
		&current.Quantity, &current.Unit, &current.Price, &current.ExpiryDate, &current.PickupAddress,
		&current.PickupInstructions, &rawImages, &rawDietary, &current.Status,
		&current.Latitude, &current.Longitude,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, utils.NotFound("Listing not found")
		}
		return nil, err
	}

	if current.UserID != userID {
		return nil, utils.Forbidden("Not authorized")
	}

	if current.Status == "expired" || current.Status == "collected" || current.Status == "cancelled" {
		return nil, utils.Conflict("Cannot edit a listing that is already closed")
	}

	title := current.Title
	if req.Title != nil {
		title = strings.TrimSpace(*req.Title)
	}
	desc := current.Description
	if req.Description != nil {
		desc = req.Description
	}
	category := current.Category
	if req.Category != nil {
		category = *req.Category
	}
	quantity := current.Quantity
	if req.Quantity != nil {
		quantity = *req.Quantity
	}
	unit := current.Unit
	if req.Unit != nil {
		unit = *req.Unit
	}
	price := current.Price
	if req.Price != nil {
		price = *req.Price
	}
	expiryDate := current.ExpiryDate
	if req.ExpiryDate != nil {
		expiryDate = *req.ExpiryDate
	}
	pickupAddr := current.PickupAddress
	if req.PickupAddress != nil {
		pickupAddr = strings.TrimSpace(*req.PickupAddress)
	}
	pickupInst := current.PickupInstructions
	if req.PickupInstructions != nil {
		pickupInst = req.PickupInstructions
	}

	imagesJSON := rawImages
	if req.ImageURLs != nil {
		imagesJSON, _ = json.Marshal(req.ImageURLs)
	}

	dietaryJSON := rawDietary
	if req.DietaryPreferences != nil {
		dietaryJSON, _ = json.Marshal(req.DietaryPreferences)
	}

	status := current.Status
	if req.Status != nil {
		status = *req.Status
	}

	lat := current.Latitude
	if req.Latitude != nil {
		lat = req.Latitude
	}
	lng := current.Longitude
	if req.Longitude != nil {
		lng = req.Longitude
	}

	_, err = database.DB.ExecContext(ctx, `
		UPDATE food_listings 
		SET title = $1, description = $2, category = $3, quantity = $4, unit = $5, 
		    price = $6, expiry_date = $7, pickup_address = $8, pickup_instructions = $9, 
		    image_urls = $10, dietary_preferences = $11, status = $12, latitude = $13, longitude = $14 
		WHERE id = $15`,
		title, desc, category, quantity, unit, price, expiryDate, pickupAddr, pickupInst,
		imagesJSON, dietaryJSON, status, lat, lng, id,
	)
	if err != nil {
		return nil, err
	}

	_ = database.RecomputeListingStatus(ctx, id)
	utils.InvalidateCachePrefix("__gin__/api/listings")

	return s.GetOne(ctx, id, &models.User{ID: userID, Role: "donor"})
}

func (s *ListingService) DeleteListing(ctx context.Context, id, userID int) error {
	var ownerID int
	err := database.DB.QueryRowContext(ctx, "SELECT user_id FROM food_listings WHERE id = $1", id).Scan(&ownerID)
	if err != nil {
		if err == sql.ErrNoRows {
			return utils.NotFound("Listing not found")
		}
		return err
	}

	if ownerID != userID {
		return utils.Forbidden("Not authorized")
	}

	var activeCount int
	_ = database.DB.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM reservations 
		WHERE food_listing_id = $1 AND status IN ('pending', 'approved')`, id,
	).Scan(&activeCount)

	if activeCount > 0 {
		return utils.Conflict("Cannot delete a listing with active reservations. Cancel them first.")
	}

	_, err = database.DB.ExecContext(ctx, "DELETE FROM food_listings WHERE id = $1", id)
	if err == nil {
		utils.InvalidateCachePrefix("__gin__/api/listings")
	}
	return err
}

func (s *ListingService) CloseListing(ctx context.Context, id, userID int) error {
	var ownerID int
	var currentStatus string
	err := database.DB.QueryRowContext(ctx, "SELECT user_id, status FROM food_listings WHERE id = $1", id).Scan(&ownerID, &currentStatus)
	if err != nil {
		if err == sql.ErrNoRows {
			return utils.NotFound("Listing not found")
		}
		return err
	}

	if ownerID != userID {
		return utils.Forbidden("Not authorized")
	}

	if currentStatus == "collected" || currentStatus == "expired" || currentStatus == "cancelled" {
		return utils.BadRequest("Listing is already closed")
	}

	var activeCount int
	_ = database.DB.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM reservations 
		WHERE food_listing_id = $1 AND status IN ('pending', 'approved')`, id,
	).Scan(&activeCount)

	if activeCount > 0 {
		return utils.Conflict("Cannot close a listing with pending or approved reservations")
	}

	_, err = database.DB.ExecContext(ctx, "UPDATE food_listings SET status = 'collected' WHERE id = $1", id)
	if err == nil {
		utils.InvalidateCachePrefix("__gin__/api/listings")
	}
	return err
}

func (s *ListingService) GetMine(ctx context.Context, userID int) ([]models.FoodListing, error) {
	q := fmt.Sprintf(`
		SELECT fl.*, GREATEST(%s, 0) AS remaining 
		FROM food_listings fl 
		WHERE fl.user_id = $1 AND fl.is_template = false 
		ORDER BY fl.created_at DESC`, database.RemainingSQL)

	rows, err := database.DB.QueryContext(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	listings := make([]models.FoodListing, 0)
	for rows.Next() {
		var l models.FoodListing
		var rawImages, rawDietary []byte

		if err := rows.Scan(
			&l.ID, &l.UserID, &l.Title, &l.Description, &l.Category, &l.Quantity, &l.Unit,
			&l.Price, &l.ExpiryDate, &l.PickupAddress, &l.PickupInstructions, &rawImages,
			&rawDietary, &l.Status, &l.CreatedAt, &l.Latitude, &l.Longitude,
			&l.HasSafetyChecklist, &l.IsTemplate, &l.Remaining,
		); err != nil {
			return nil, err
		}

		if len(rawImages) > 0 {
			l.ImageURLs = json.RawMessage(rawImages)
		} else {
			l.ImageURLs = json.RawMessage("[]")
		}

		if len(rawDietary) > 0 {
			l.DietaryPreferences = json.RawMessage(rawDietary)
		} else {
			l.DietaryPreferences = json.RawMessage("[]")
		}

		listings = append(listings, l)
	}

	return listings, nil
}

func (s *ListingService) GetTemplates(ctx context.Context, userID int) ([]models.FoodListing, error) {
	rows, err := database.DB.QueryContext(ctx, "SELECT * FROM food_listings WHERE user_id = $1 AND is_template = true ORDER BY created_at DESC", userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	templates := make([]models.FoodListing, 0)
	for rows.Next() {
		var l models.FoodListing
		var rawImages, rawDietary []byte

		if err := rows.Scan(
			&l.ID, &l.UserID, &l.Title, &l.Description, &l.Category, &l.Quantity, &l.Unit,
			&l.Price, &l.ExpiryDate, &l.PickupAddress, &l.PickupInstructions, &rawImages,
			&rawDietary, &l.Status, &l.CreatedAt, &l.Latitude, &l.Longitude,
			&l.HasSafetyChecklist, &l.IsTemplate,
		); err != nil {
			return nil, err
		}

		if len(rawImages) > 0 {
			l.ImageURLs = json.RawMessage(rawImages)
		} else {
			l.ImageURLs = json.RawMessage("[]")
		}
		templates = append(templates, l)
	}
	return templates, nil
}

func (s *ListingService) GetStats(ctx context.Context) (map[string]any, error) {
	var activeListings, totalDonors, totalReceivers, mealsSaved int

	_ = database.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM food_listings WHERE status = 'available'").Scan(&activeListings)
	_ = database.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM users WHERE role = 'donor'").Scan(&totalDonors)
	_ = database.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM users WHERE role IN ('ngo','volunteer')").Scan(&totalReceivers)
	_ = database.DB.QueryRowContext(ctx, "SELECT COALESCE(SUM(quantity), 0) FROM reservations WHERE status = 'collected'").Scan(&mealsSaved)

	return map[string]any{
		"activeListings": activeListings,
		"totalDonors":   totalDonors,
		"totalReceivers": totalReceivers,
		"mealsSaved":     mealsSaved,
	}, nil
}

func (s *ListingService) GetImpactStats(ctx context.Context) (map[string]any, error) {
	var meals, totalListings, totalDonors, totalReceivers int

	_ = database.DB.QueryRowContext(ctx, "SELECT COALESCE(SUM(quantity), 0) FROM reservations WHERE status = 'collected'").Scan(&meals)
	_ = database.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM food_listings").Scan(&totalListings)
	_ = database.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM users WHERE role = 'donor'").Scan(&totalDonors)
	_ = database.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM users WHERE role IN ('ngo','volunteer')").Scan(&totalReceivers)

	co2Kg := int(math.Round(float64(meals) * 2.5))
	trees := math.Round((float64(co2Kg)/21.0)*10.0) / 10.0
	waterLiters := meals * 1250

	return map[string]any{
		"mealsSaved":     meals,
		"co2Kg":          co2Kg,
		"trees":          trees,
		"waterLiters":    waterLiters,
		"totalListings":  totalListings,
		"totalDonors":    totalDonors,
		"totalReceivers": totalReceivers,
	}, nil
}

func (s *ListingService) GetAnalyticsMe(ctx context.Context, userID int) (map[string]any, error) {
	rows, err := database.DB.QueryContext(ctx, `
		SELECT TO_CHAR(r.created_at, 'YYYY-MM') as month, SUM(r.quantity) as meals_saved
		FROM reservations r
		JOIN food_listings fl ON r.food_listing_id = fl.id
		WHERE fl.user_id = $1 AND r.status = 'collected'
		GROUP BY TO_CHAR(r.created_at, 'YYYY-MM')
		ORDER BY month ASC`, userID,
	)

	monthlyStats := make([]map[string]any, 0)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var month string
			var saved int
			if err := rows.Scan(&month, &saved); err == nil {
				monthlyStats = append(monthlyStats, map[string]any{
					"month":       month,
					"meals_saved": saved,
				})
			}
		}
	}

	var totalListings, totalDonated int
	_ = database.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM food_listings WHERE user_id = $1", userID).Scan(&totalListings)
	_ = database.DB.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(r.quantity), 0) 
		FROM reservations r 
		JOIN food_listings fl ON r.food_listing_id = fl.id 
		WHERE fl.user_id = $1 AND r.status = 'collected'`, userID,
	).Scan(&totalDonated)

	return map[string]any{
		"monthlyStats":  monthlyStats,
		"totalListings": totalListings,
		"totalDonated":  totalDonated,
	}, nil
}
