package services

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"left2serve/backend/database"
	"left2serve/backend/models"
	"left2serve/backend/utils"
)

type AdminService struct{}

var GlobalAdminService = &AdminService{}

func (s *AdminService) GetStats(ctx context.Context) (*models.AdminStats, error) {
	var stats models.AdminStats

	_ = database.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM users").Scan(&stats.TotalUsers)
	_ = database.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM users WHERE role = 'ngo'").Scan(&stats.TotalNgos)
	_ = database.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM users WHERE role = 'donor'").Scan(&stats.TotalDonors)
	_ = database.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM users WHERE role = 'volunteer'").Scan(&stats.TotalVolunteers)

	_ = database.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM food_listings").Scan(&stats.TotalListings)
	_ = database.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM food_listings WHERE status = 'available'").Scan(&stats.ActiveListings)

	_ = database.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM reservations").Scan(&stats.TotalReservations)
	_ = database.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM reservations WHERE status = 'pending'").Scan(&stats.PendingReservations)
	_ = database.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM reservations WHERE status = 'approved'").Scan(&stats.ApprovedReservations)
	_ = database.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM reservations WHERE status = 'collected'").Scan(&stats.CollectedReservations)

	_ = database.DB.QueryRowContext(ctx, "SELECT COALESCE(SUM(quantity), 0) FROM reservations WHERE status = 'collected'").Scan(&stats.MealsSaved)

	return &stats, nil
}

func (s *AdminService) GetUsers(ctx context.Context, page, limit int) (map[string]any, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 50
	} else if limit > 100 {
		limit = 100
	}

	offset := (page - 1) * limit
	rows, err := database.DB.QueryContext(ctx, `
		SELECT id, name, email, role, phone, address, organization, is_active, created_at 
		FROM users 
		ORDER BY created_at DESC 
		LIMIT $1 OFFSET $2`, limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]models.SafeUser, 0)
	for rows.Next() {
		var u models.SafeUser
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.Phone, &u.Address, &u.Organization, &u.IsActive, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}

	var total int
	_ = database.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM users").Scan(&total)

	totalPages := (total + limit - 1) / limit
	if totalPages < 1 {
		totalPages = 1
	}

	return map[string]any{
		"users": users,
		"pagination": map[string]any{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": totalPages,
		},
	}, nil
}

func (s *AdminService) GetNgos(ctx context.Context) ([]models.NGOOverview, error) {
	rows, err := database.DB.QueryContext(ctx, `
		SELECT 
			u.id, u.name, u.email, u.phone, u.address, u.organization, u.is_active, u.created_at,
			COUNT(r.id) as "totalReservations",
			COUNT(CASE WHEN r.status = 'pending' THEN 1 END) as "pendingReservations",
			COUNT(CASE WHEN r.status = 'collected' THEN 1 END) as "collectedReservations"
		FROM users u
		LEFT JOIN reservations r ON u.id = r.user_id
		WHERE u.role = 'ngo'
		GROUP BY u.id
		ORDER BY u.created_at DESC
		LIMIT 500`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ngos := make([]models.NGOOverview, 0)
	for rows.Next() {
		var n models.NGOOverview
		if err := rows.Scan(
			&n.ID, &n.Name, &n.Email, &n.Phone, &n.Address, &n.Organization, &n.IsActive,
			&n.CreatedAt, &n.TotalReservations, &n.PendingReservations, &n.CollectedReservations,
		); err != nil {
			return nil, err
		}
		ngos = append(ngos, n)
	}

	return ngos, nil
}

func (s *AdminService) GetOrders(ctx context.Context) ([]map[string]any, error) {
	rows, err := database.DB.QueryContext(ctx, `
		SELECT r.id, r.food_listing_id, r.user_id, r.quantity, r.status, r.payment_method, 
		       r.payment_status, r.amount, r.pickup_time, r.created_at, 
		       fl.title as food_title, fl.category as food_category, fl.quantity as food_quantity, 
		       fl.unit as food_unit, fl.pickup_address, fl.expiry_date, fl.status as listing_status, 
		       u.name as reserver_name, u.email as reserver_email, u.phone as reserver_phone, 
		       u.organization as reserver_org, d.name as donor_name, d.email as donor_email 
		FROM reservations r 
		JOIN food_listings fl ON r.food_listing_id = fl.id 
		JOIN users u ON r.user_id = u.id 
		JOIN users d ON fl.user_id = d.id 
		ORDER BY r.created_at DESC 
		LIMIT 500`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	orders := make([]map[string]any, 0)
	for rows.Next() {
		var id, listingID, resUserID, qty, foodQty int
		var status, method, pStatus, title, category, unit, address, listingStatus string
		var amount float64
		var pickupTime, expiryDate sql.NullTime
		var createdAt time.Time
		var resName, resEmail, resPhone, resOrg, donorName, donorEmail sql.NullString

		if err := rows.Scan(
			&id, &listingID, &resUserID, &qty, &status, &method, &pStatus, &amount,
			&pickupTime, &createdAt, &title, &category, &foodQty, &unit, &address,
			&expiryDate, &listingStatus, &resName, &resEmail, &resPhone, &resOrg,
			&donorName, &donorEmail,
		); err != nil {
			return nil, err
		}

		orders = append(orders, map[string]any{
			"id":              id,
			"food_listing_id": listingID,
			"user_id":         resUserID,
			"quantity":        qty,
			"status":          status,
			"payment_method":  method,
			"payment_status":  pStatus,
			"amount":          amount,
			"pickup_time":     pickupTime.Time,
			"created_at":      createdAt,
			"food_title":      title,
			"food_category":   category,
			"food_quantity":   foodQty,
			"food_unit":       unit,
			"pickup_address":  address,
			"expiry_date":     expiryDate.Time,
			"listing_status":  listingStatus,
			"reserver_name":   resName.String,
			"reserver_email":  resEmail.String,
			"reserver_phone":  resPhone.String,
			"reserver_org":    resOrg.String,
			"donor_name":      donorName.String,
			"donor_email":     donorEmail.String,
		})
	}

	return orders, nil
}

func (s *AdminService) GetListings(ctx context.Context, page, limit int) (map[string]any, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 50
	} else if limit > 100 {
		limit = 100
	}

	offset := (page - 1) * limit
	rows, err := database.DB.QueryContext(ctx, `
		SELECT fl.id, fl.user_id, fl.title, fl.description, fl.category, fl.quantity, 
		       fl.unit, fl.price, fl.expiry_date, fl.pickup_address, fl.image_urls, 
		       fl.status, fl.created_at, u.name as donor_name, u.email as donor_email, 
		       u.phone as donor_phone, u.organization as donor_org 
		FROM food_listings fl 
		JOIN users u ON fl.user_id = u.id 
		ORDER BY fl.created_at DESC 
		LIMIT $1 OFFSET $2`, limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	listings := make([]models.FoodListing, 0)
	for rows.Next() {
		var l models.FoodListing
		var rawImages []byte
		var donorName, donorEmail, donorPhone, donorOrg sql.NullString

		if err := rows.Scan(
			&l.ID, &l.UserID, &l.Title, &l.Description, &l.Category, &l.Quantity,
			&l.Unit, &l.Price, &l.ExpiryDate, &l.PickupAddress, &rawImages,
			&l.Status, &l.CreatedAt, &donorName, &donorEmail, &donorPhone, &donorOrg,
		); err != nil {
			return nil, err
		}

		if len(rawImages) > 0 {
			l.ImageURLs = json.RawMessage(rawImages)
		} else {
			l.ImageURLs = json.RawMessage("[]")
		}

		if donorName.Valid {
			l.DonorName = &donorName.String
		}
		if donorOrg.Valid {
			l.DonorOrg = &donorOrg.String
		}
		if donorPhone.Valid {
			l.DonorPhone = &donorPhone.String
		}

		listings = append(listings, l)
	}

	var total int
	_ = database.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM food_listings").Scan(&total)

	totalPages := (total + limit - 1) / limit
	if totalPages < 1 {
		totalPages = 1
	}

	return map[string]any{
		"listings": listings,
		"pagination": map[string]any{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": totalPages,
		},
	}, nil
}

func (s *AdminService) DeleteListing(ctx context.Context, id int, ip string) error {
	var ownerID int
	var title, status string
	err := database.DB.QueryRowContext(ctx, "SELECT user_id, title, status FROM food_listings WHERE id = $1", id).Scan(&ownerID, &title, &status)
	if err != nil {
		if err == sql.ErrNoRows {
			return utils.NotFound("Listing not found")
		}
		return err
	}

	_, err = database.DB.ExecContext(ctx, "DELETE FROM food_listings WHERE id = $1", id)
	if err != nil {
		return err
	}

	_ = GlobalNotificationService.CreateNotification(
		ctx,
		ownerID,
		"listing_removed",
		"Listing removed",
		fmt.Sprintf("An admin removed your listing \"%s\".", title),
		map[string]any{"listingId": id},
	)

	utils.Audit(ctx, utils.AuditOptions{
		ActorRole:  "admin",
		Action:     "listing_delete",
		TargetType: "listing",
		TargetID:   &id,
		Detail:     fmt.Sprintf("removed listing \"%s\" (%s)", title, status),
		IP:         ip,
	})

	return nil
}

func (s *AdminService) UpdateOrder(ctx context.Context, id int, status, ip string) error {
	var foodListingID, resUserID int
	err := database.DB.QueryRowContext(ctx, "SELECT food_listing_id, user_id FROM reservations WHERE id = $1", id).Scan(&foodListingID, &resUserID)
	if err != nil {
		if err == sql.ErrNoRows {
			return utils.NotFound("Order not found")
		}
		return err
	}

	_, err = database.DB.ExecContext(ctx, "UPDATE reservations SET status = $1 WHERE id = $2", status, id)
	if err != nil {
		return err
	}

	_ = database.RecomputeListingStatus(ctx, foodListingID)

	var title string
	_ = database.DB.QueryRowContext(ctx, "SELECT title FROM food_listings WHERE id = $1", foodListingID).Scan(&title)

	ctxData := map[string]any{"reservationId": id, "listingId": foodListingID}
	if status == "approved" {
		_ = GlobalNotificationService.CreateNotification(ctx, resUserID, "reservation_approved", "Reservation approved", fmt.Sprintf("Admin approved your reservation for \"%s\".", title), ctxData)
	} else if status == "collected" {
		_ = GlobalNotificationService.CreateNotification(ctx, resUserID, "reservation_collected", "Pickup completed", fmt.Sprintf("Admin marked your reservation for \"%s\" as collected.", title), ctxData)
	} else if status == "cancelled" {
		_ = GlobalNotificationService.CreateNotification(ctx, resUserID, "reservation_cancelled", "Reservation cancelled", fmt.Sprintf("Admin cancelled your reservation for \"%s\".", title), ctxData)
	}

	utils.Audit(ctx, utils.AuditOptions{
		ActorRole:  "admin",
		Action:     fmt.Sprintf("order_%s", status),
		TargetType: "reservation",
		TargetID:   &id,
		Detail:     fmt.Sprintf("order #%d -> %s", id, status),
		IP:         ip,
	})

	return nil
}

func (s *AdminService) UpdateUser(ctx context.Context, id int, req *models.AdminUpdateUserRequest, ip string) (*models.SafeUser, error) {
	var current models.User
	err := database.DB.QueryRowContext(ctx, "SELECT id, role, is_active FROM users WHERE id = $1", id).Scan(&current.ID, &current.Role, &current.IsActive)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, utils.NotFound("User not found")
		}
		return nil, err
	}

	updates := make([]string, 0)
	args := make([]any, 0)
	argIdx := 1
	detailParts := make([]string, 0)

	if req.Role != nil {
		newRole := *req.Role
		if newRole != "donor" && newRole != "ngo" && newRole != "volunteer" {
			return nil, utils.BadRequest("Invalid role")
		}
		if current.Role == "admin" {
			return nil, utils.BadRequest("Cannot modify admin role")
		}
		updates = append(updates, fmt.Sprintf("role = $%d", argIdx))
		args = append(args, newRole)
		argIdx++
		detailParts = append(detailParts, "role->"+newRole)
	}

	if req.IsActive != nil {
		updates = append(updates, fmt.Sprintf("is_active = $%d", argIdx))
		args = append(args, *req.IsActive)
		argIdx++
		detailParts = append(detailParts, fmt.Sprintf("active->%v", *req.IsActive))

		if !*req.IsActive {
			updates = append(updates, "token_version = token_version + 1")
		}
	}

	if len(updates) == 0 {
		return nil, utils.BadRequest("No valid fields to update")
	}

	args = append(args, id)
	q := fmt.Sprintf("UPDATE users SET %s WHERE id = $%d", strings.Join(updates, ", "), argIdx)
	_, err = database.DB.ExecContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}

	utils.Audit(ctx, utils.AuditOptions{
		ActorRole:  "admin",
		Action:     "user_update",
		TargetType: "user",
		TargetID:   &id,
		Detail:     strings.Join(detailParts, ", "),
		IP:         ip,
	})

	return GlobalAuthService.GetMe(ctx, id)
}

func (s *AdminService) DeleteUser(ctx context.Context, id int, ip string) error {
	var role string
	err := database.DB.QueryRowContext(ctx, "SELECT role FROM users WHERE id = $1", id).Scan(&role)
	if err != nil {
		if err == sql.ErrNoRows {
			return utils.NotFound("User not found")
		}
		return err
	}

	if role == "admin" {
		return utils.BadRequest("Cannot delete admin user")
	}

	_, err = database.DB.ExecContext(ctx, "DELETE FROM users WHERE id = $1", id)
	if err != nil {
		return err
	}

	utils.Audit(ctx, utils.AuditOptions{
		ActorRole:  "admin",
		Action:     "user_delete",
		TargetType: "user",
		TargetID:   &id,
		Detail:     fmt.Sprintf("deleted user #%d", id),
		IP:         ip,
	})

	return nil
}

func (s *AdminService) ResetUserPassword(ctx context.Context, id int, providedPassword *string, ip string) (string, error) {
	var role, email string
	err := database.DB.QueryRowContext(ctx, "SELECT role, email FROM users WHERE id = $1", id).Scan(&role, &email)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", utils.NotFound("User not found")
		}
		return "", err
	}

	if role == "admin" {
		return "", utils.BadRequest("Cannot reset an admin password")
	}

	password := ""
	if providedPassword != nil && *providedPassword != "" {
		if len(*providedPassword) < 8 {
			return "", utils.BadRequest("New password must be at least 8 characters")
		}
		password = *providedPassword
	} else {
		chars := "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%"
		bytes := make([]byte, 14)
		_, _ = rand.Read(bytes)
		for i := 0; i < len(bytes); i++ {
			bytes[i] = chars[int(bytes[i])%len(chars)]
		}
		password = string(bytes)
	}

	hash, err := utils.HashPassword(password)
	if err != nil {
		return "", utils.InternalError("Failed to hash password")
	}

	_, err = database.DB.ExecContext(ctx, `
		UPDATE users 
		SET password_hash = $1, token_version = token_version + 1, failed_attempts = 0, locked_until = NULL 
		WHERE id = $2`, hash, id,
	)
	if err != nil {
		return "", err
	}

	_ = GlobalNotificationService.CreateNotification(
		ctx,
		id,
		"password_reset",
		"Password reset",
		"An administrator reset your password. Please log in with the new password provided to you.",
		map[string]any{},
	)

	utils.Audit(ctx, utils.AuditOptions{
		ActorRole:  "admin",
		Action:     "password_reset",
		TargetType: "user",
		TargetID:   &id,
		Detail:     fmt.Sprintf("reset password for %s", email),
		IP:         ip,
	})

	return password, nil
}

func (s *AdminService) GetTrends(ctx context.Context, days int) (*models.TrendsResponse, error) {
	if days < 1 {
		days = 14
	} else if days > 90 {
		days = 90
	}

	rows, err := database.DB.QueryContext(ctx, `
		SELECT TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date, COUNT(*) as count 
		FROM reservations 
		WHERE created_at >= NOW() AT TIME ZONE 'UTC' - INTERVAL '1 day' * $1 
		GROUP BY 1 ORDER BY date ASC`, days,
	)

	resMap := make(map[string]int)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var d string
			var count int
			if err := rows.Scan(&d, &count); err == nil {
				resMap[d] = count
			}
		}
	}

	mRows, err := database.DB.QueryContext(ctx, `
		SELECT TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date, COALESCE(SUM(quantity), 0) as count 
		FROM reservations 
		WHERE status = 'collected' AND created_at >= NOW() AT TIME ZONE 'UTC' - INTERVAL '1 day' * $1 
		GROUP BY 1 ORDER BY date ASC`, days,
	)

	mealsMap := make(map[string]float64)
	if err == nil {
		defer mRows.Close()
		for mRows.Next() {
			var d string
			var count float64
			if err := mRows.Scan(&d, &count); err == nil {
				mealsMap[d] = count
			}
		}
	}

	series := make([]models.TrendSeries, 0)
	now := time.Now().UTC()
	for i := days - 1; i >= 0; i-- {
		d := now.AddDate(0, 0, -i)
		key := d.Format("2006-01-02")
		series = append(series, models.TrendSeries{
			Date:         key,
			Reservations: resMap[key],
			Meals:        mealsMap[key],
		})
	}

	cRows, err := database.DB.QueryContext(ctx, "SELECT category, COUNT(*) FROM food_listings GROUP BY category ORDER BY count DESC")
	byCat := make([]models.CategoryCount, 0)
	if err == nil {
		defer cRows.Close()
		for cRows.Next() {
			var cat string
			var count int
			if err := cRows.Scan(&cat, &count); err == nil {
				byCat = append(byCat, models.CategoryCount{Category: cat, Count: count})
			}
		}
	}

	return &models.TrendsResponse{
		Series:     series,
		ByCategory: byCat,
	}, nil
}

func (s *AdminService) GetAuditLog(ctx context.Context, limit int) ([]models.AuditLog, error) {
	if limit < 1 {
		limit = 50
	} else if limit > 200 {
		limit = 200
	}

	rows, err := database.DB.QueryContext(ctx, `
		SELECT id, actor_id, actor_role, action, target_type, target_id, detail, ip, created_at 
		FROM audit_log 
		ORDER BY created_at DESC 
		LIMIT $1`, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	logs := make([]models.AuditLog, 0)
	for rows.Next() {
		var a models.AuditLog
		if err := rows.Scan(&a.ID, &a.ActorID, &a.ActorRole, &a.Action, &a.TargetType, &a.TargetID, &a.Detail, &a.IP, &a.CreatedAt); err != nil {
			return nil, err
		}
		logs = append(logs, a)
	}

	return logs, nil
}

func (s *AdminService) GetExportData(ctx context.Context, exportType, ip string) (string, error) {
	if exportType != "users" && exportType != "listings" && exportType != "reservations" {
		return "", utils.BadRequest("Invalid export type. Must be users, listings, or reservations.")
	}

	var sb strings.Builder
	writer := csv.NewWriter(&sb)

	if exportType == "users" {
		rows, err := database.DB.QueryContext(ctx, "SELECT id, name, email, role, phone, organization, is_active, created_at FROM users ORDER BY created_at DESC")
		if err != nil {
			return "", err
		}
		defer rows.Close()

		_ = writer.Write([]string{"id", "name", "email", "role", "phone", "organization", "is_active", "created_at"})
		for rows.Next() {
			var id int
			var name, email, role string
			var phone, org sql.NullString
			var isActive bool
			var createdAt time.Time
			_ = rows.Scan(&id, &name, &email, &role, &phone, &org, &isActive, &createdAt)
			_ = writer.Write([]string{
				fmt.Sprintf("%d", id), name, email, role, phone.String, org.String, fmt.Sprintf("%v", isActive), createdAt.Format(time.RFC3339),
			})
		}
	} else if exportType == "listings" {
		rows, err := database.DB.QueryContext(ctx, "SELECT id, user_id, title, category, quantity, status, created_at FROM food_listings ORDER BY created_at DESC")
		if err != nil {
			return "", err
		}
		defer rows.Close()

		_ = writer.Write([]string{"id", "user_id", "title", "category", "quantity", "status", "created_at"})
		for rows.Next() {
			var id, userID, qty int
			var title, category, status string
			var createdAt time.Time
			_ = rows.Scan(&id, &userID, &title, &category, &qty, &status, &createdAt)
			_ = writer.Write([]string{
				fmt.Sprintf("%d", id), fmt.Sprintf("%d", userID), title, category, fmt.Sprintf("%d", qty), status, createdAt.Format(time.RFC3339),
			})
		}
	} else if exportType == "reservations" {
		rows, err := database.DB.QueryContext(ctx, "SELECT id, food_listing_id, user_id, quantity, status, payment_method, amount, created_at FROM reservations ORDER BY created_at DESC")
		if err != nil {
			return "", err
		}
		defer rows.Close()

		_ = writer.Write([]string{"id", "food_listing_id", "user_id", "quantity", "status", "payment_method", "amount", "created_at"})
		for rows.Next() {
			var id, listingID, userID, qty int
			var status, method string
			var amount float64
			var createdAt time.Time
			_ = rows.Scan(&id, &listingID, &userID, &qty, &status, &method, &amount, &createdAt)
			_ = writer.Write([]string{
				fmt.Sprintf("%d", id), fmt.Sprintf("%d", listingID), fmt.Sprintf("%d", userID), fmt.Sprintf("%d", qty), status, method, fmt.Sprintf("%.2f", amount), createdAt.Format(time.RFC3339),
			})
		}
	}

	writer.Flush()
	csvStr := sb.String()

	utils.Audit(ctx, utils.AuditOptions{
		ActorRole:  "admin",
		Action:     "csv_export",
		TargetType: "export",
		Detail:     fmt.Sprintf("Exported %s to CSV", exportType),
		IP:         ip,
	})

	return csvStr, nil
}
