package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"left2serve/backend/config"
	"left2serve/backend/database"
	"left2serve/backend/models"
	"left2serve/backend/utils"
)

type ReservationService struct {
	cfg *config.Config
}

var GlobalReservationService *ReservationService

func InitReservationService(cfg *config.Config) {
	GlobalReservationService = &ReservationService{cfg: cfg}
}

func (s *ReservationService) CreateReservation(ctx context.Context, userID int, req *models.CreateReservationRequest) (*models.Reservation, error) {
	var reservation models.Reservation

	err := database.WithTransaction(ctx, func(tx *sql.Tx) error {
		var listing models.FoodListing
		err := tx.QueryRowContext(ctx, "SELECT id, user_id, title, unit, price, expiry_date, status, quantity FROM food_listings WHERE id = $1 FOR UPDATE", req.FoodListingID).Scan(
			&listing.ID, &listing.UserID, &listing.Title, &listing.Unit, &listing.Price, &listing.ExpiryDate, &listing.Status, &listing.Quantity,
		)
		if err != nil {
			if err == sql.ErrNoRows {
				return utils.NotFound("Listing not found")
			}
			return err
		}

		if listing.Status != "available" {
			return utils.BadRequest("Listing is no longer available")
		}

		if listing.ExpiryDate.Before(time.Now()) {
			return utils.BadRequest("This listing has expired")
		}

		avail, err := database.GetAvailability(ctx, req.FoodListingID)
		if err != nil {
			return err
		}
		if req.Quantity > avail.Remaining {
			return utils.BadRequest(fmt.Sprintf("Only %d %s available", avail.Remaining, listing.Unit))
		}

		var existingID int
		err = tx.QueryRowContext(ctx, "SELECT id FROM reservations WHERE food_listing_id = $1 AND user_id = $2 AND status IN ('pending','approved')", req.FoodListingID, userID).Scan(&existingID)
		if err == nil {
			return utils.Conflict("You already have an active reservation for this listing")
		}

		amount := math.Round(listing.Price*float64(req.Quantity)*100) / 100
		method := "none"
		paymentStatus := "paid"

		if amount > 0 {
			if req.PaymentMethod == "razorpay" {
				return utils.BadRequest("Use the payment endpoint for Razorpay")
			}
			method = "cod"
			paymentStatus = "pending"
		}

		var resID int
		err = tx.QueryRowContext(ctx, `
			INSERT INTO reservations (food_listing_id, user_id, quantity, pickup_time, notes, payment_method, payment_status, amount) 
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
			RETURNING id`,
			req.FoodListingID, userID, req.Quantity, req.PickupTime, req.Notes, method, paymentStatus, amount,
		).Scan(&resID)
		if err != nil {
			return err
		}

		_ = database.RecomputeListingStatus(ctx, req.FoodListingID)

		err = tx.QueryRowContext(ctx, `
			SELECT id, food_listing_id, user_id, quantity, status, payment_method, payment_status, 
			       amount, razorpay_order_id, razorpay_payment_id, razorpay_signature, pickup_time, 
			       notes, created_at, agreed_to_waiver 
			FROM reservations WHERE id = $1`, resID,
		).Scan(
			&reservation.ID, &reservation.FoodListingID, &reservation.UserID, &reservation.Quantity,
			&reservation.Status, &reservation.PaymentMethod, &reservation.PaymentStatus, &reservation.Amount,
			&reservation.RazorpayOrderID, &reservation.RazorpayPaymentID, &reservation.RazorpaySignature,
			&reservation.PickupTime, &reservation.Notes, &reservation.CreatedAt, &reservation.AgreedToWaiver,
		)
		if err != nil {
			return err
		}

		var reserverName string
		_ = tx.QueryRowContext(ctx, "SELECT name FROM users WHERE id = $1", userID).Scan(&reserverName)

		_ = GlobalNotificationService.CreateNotification(
			ctx,
			listing.UserID,
			"reservation_new",
			"New reservation request",
			fmt.Sprintf("%s requested %d %s of \"%s\"", reserverName, req.Quantity, listing.Unit, listing.Title),
			map[string]any{
				"reservationId": resID,
				"listingId":     req.FoodListingID,
				"reserverName":  reserverName,
			},
		)

		return nil
	})

	if err != nil {
		return nil, err
	}

	return &reservation, nil
}

func (s *ReservationService) GetMyReservations(ctx context.Context, userID int) ([]models.Reservation, error) {
	rows, err := database.DB.QueryContext(ctx, `
		SELECT r.id, r.food_listing_id, r.user_id, r.quantity, r.status, r.payment_method, 
		       r.payment_status, r.amount, r.razorpay_order_id, r.razorpay_payment_id, 
		       r.razorpay_signature, r.pickup_time, r.notes, r.created_at, r.agreed_to_waiver, 
		       fl.title as food_title, fl.pickup_address, fl.image_urls, 
		       u.name as donor_name, u.phone as donor_phone, u.organization as donor_org 
		FROM reservations r 
		JOIN food_listings fl ON r.food_listing_id = fl.id 
		JOIN users u ON fl.user_id = u.id 
		WHERE r.user_id = $1 
		ORDER BY r.created_at DESC`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	reservations := make([]models.Reservation, 0)
	for rows.Next() {
		var r models.Reservation
		var rawImages []byte
		var foodTitle, pickupAddress, donorName, donorPhone, donorOrg sql.NullString

		if err := rows.Scan(
			&r.ID, &r.FoodListingID, &r.UserID, &r.Quantity, &r.Status, &r.PaymentMethod,
			&r.PaymentStatus, &r.Amount, &r.RazorpayOrderID, &r.RazorpayPaymentID,
			&r.RazorpaySignature, &r.PickupTime, &r.Notes, &r.CreatedAt, &r.AgreedToWaiver,
			&foodTitle, &pickupAddress, &rawImages, &donorName, &donorPhone, &donorOrg,
		); err != nil {
			return nil, err
		}

		if foodTitle.Valid {
			r.FoodTitle = &foodTitle.String
		}
		if pickupAddress.Valid {
			r.PickupAddress = &pickupAddress.String
		}
		if len(rawImages) > 0 {
			r.ImageURLs = json.RawMessage(rawImages)
		} else {
			r.ImageURLs = json.RawMessage("[]")
		}
		if donorName.Valid {
			r.DonorName = &donorName.String
		}
		if donorOrg.Valid {
			r.DonorOrg = &donorOrg.String
		}
		if (r.Status == "approved" || r.Status == "collected") && donorPhone.Valid {
			r.DonorPhone = &donorPhone.String
		}

		reservations = append(reservations, r)
	}

	return reservations, nil
}

func (s *ReservationService) GetListingReservations(ctx context.Context, listingID, userID int) ([]models.Reservation, error) {
	var ownerID int
	err := database.DB.QueryRowContext(ctx, "SELECT user_id FROM food_listings WHERE id = $1", listingID).Scan(&ownerID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, utils.NotFound("Listing not found")
		}
		return nil, err
	}
	if ownerID != userID {
		return nil, utils.Forbidden("Not authorized")
	}

	rows, err := database.DB.QueryContext(ctx, `
		SELECT r.id, r.food_listing_id, r.user_id, r.quantity, r.status, r.payment_method, 
		       r.payment_status, r.amount, r.razorpay_order_id, r.razorpay_payment_id, 
		       r.razorpay_signature, r.pickup_time, r.notes, r.created_at, r.agreed_to_waiver, 
		       u.name as reserver_name, u.phone as reserver_phone, u.organization as reserver_org 
		FROM reservations r 
		JOIN users u ON r.user_id = u.id 
		WHERE r.food_listing_id = $1 
		ORDER BY r.created_at DESC`, listingID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	reservations := make([]models.Reservation, 0)
	for rows.Next() {
		var r models.Reservation
		var reserverName, reserverPhone, reserverOrg sql.NullString

		if err := rows.Scan(
			&r.ID, &r.FoodListingID, &r.UserID, &r.Quantity, &r.Status, &r.PaymentMethod,
			&r.PaymentStatus, &r.Amount, &r.RazorpayOrderID, &r.RazorpayPaymentID,
			&r.RazorpaySignature, &r.PickupTime, &r.Notes, &r.CreatedAt, &r.AgreedToWaiver,
			&reserverName, &reserverPhone, &reserverOrg,
		); err != nil {
			return nil, err
		}

		if reserverName.Valid {
			r.ReserverName = &reserverName.String
		}
		if reserverPhone.Valid {
			r.ReserverPhone = &reserverPhone.String
		}
		if reserverOrg.Valid {
			r.ReserverOrg = &reserverOrg.String
		}

		reservations = append(reservations, r)
	}

	return reservations, nil
}

func (s *ReservationService) GenerateQRToken(ctx context.Context, reservationID, userID int) (string, error) {
	var resUserID int
	var status string
	err := database.DB.QueryRowContext(ctx, "SELECT user_id, status FROM reservations WHERE id = $1", reservationID).Scan(&resUserID, &status)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", utils.NotFound("Reservation not found")
		}
		return "", err
	}

	if resUserID != userID {
		return "", utils.Forbidden("Not authorized")
	}

	if status != "approved" {
		return "", utils.BadRequest("Only approved reservations can be collected")
	}

	claims := jwt.MapClaims{
		"reservationId": reservationID,
		"action":        "collect",
		"exp":           time.Now().Add(1 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}

func (s *ReservationService) VerifyQR(ctx context.Context, tokenString string, userID int) (*models.Reservation, error) {
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		return []byte(s.cfg.JWTSecret), nil
	})
	if err != nil || !token.Valid {
		return nil, utils.BadRequest("Invalid or expired QR token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || claims["action"] != "collect" {
		return nil, utils.BadRequest("Invalid token action")
	}

	reservationID := int(claims["reservationId"].(float64))

	var res models.Reservation
	var foodListingID int
	err = database.DB.QueryRowContext(ctx, "SELECT id, food_listing_id, user_id, quantity, status FROM reservations WHERE id = $1", reservationID).Scan(
		&res.ID, &foodListingID, &res.UserID, &res.Quantity, &res.Status,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, utils.NotFound("Reservation not found")
		}
		return nil, err
	}

	var donorID int
	var title string
	err = database.DB.QueryRowContext(ctx, "SELECT user_id, title FROM food_listings WHERE id = $1", foodListingID).Scan(&donorID, &title)
	if err != nil || donorID != userID {
		return nil, utils.Forbidden("Only the donor can scan this QR code")
	}

	if res.Status == "collected" {
		return nil, utils.BadRequest("Already collected")
	}
	if res.Status != "approved" {
		return nil, utils.BadRequest("Reservation is not approved")
	}

	_, err = database.DB.ExecContext(ctx, "UPDATE reservations SET status = 'collected' WHERE id = $1", res.ID)
	if err != nil {
		return nil, err
	}

	_ = database.RecomputeListingStatus(ctx, foodListingID)
	_ = GlobalBadgeService.AddMealsAndCheckBadges(ctx, donorID, res.Quantity)

	_ = GlobalNotificationService.CreateNotification(
		ctx,
		res.UserID,
		"reservation_collected",
		"Pickup completed",
		fmt.Sprintf("Donor scanned your QR code and marked \"%s\" as collected.", title),
		map[string]any{"reservationId": res.ID, "listingId": foodListingID},
	)

	var reserverName, reserverEmail string
	_ = database.DB.QueryRowContext(ctx, "SELECT name, email FROM users WHERE id = $1", res.UserID).Scan(&reserverName, &reserverEmail)
	if GlobalEmailService != nil && reserverEmail != "" {
		GlobalEmailService.SendOrderUpdateEmail(reserverEmail, reserverName, title, "collected")
	}

	res.Status = "collected"
	return &res, nil
}

func (s *ReservationService) UpdateReservationStatus(ctx context.Context, reservationID, userID int, status string) (*models.Reservation, error) {
	var res models.Reservation
	var foodListingID int
	err := database.DB.QueryRowContext(ctx, "SELECT id, food_listing_id, user_id, quantity, status FROM reservations WHERE id = $1", reservationID).Scan(
		&res.ID, &foodListingID, &res.UserID, &res.Quantity, &res.Status,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, utils.NotFound("Reservation not found")
		}
		return nil, err
	}

	var donorID int
	var title, pickupAddress string
	err = database.DB.QueryRowContext(ctx, "SELECT user_id, title, pickup_address FROM food_listings WHERE id = $1", foodListingID).Scan(&donorID, &title, &pickupAddress)
	if err != nil {
		return nil, err
	}

	isOwner := donorID == userID
	isReserver := res.UserID == userID

	if !isOwner && !isReserver {
		return nil, utils.Forbidden("Not authorized")
	}

	allowed := false
	if isOwner && (status == "approved" || status == "collected") {
		allowed = true
	}
	if isReserver && status == "cancelled" {
		allowed = true
	}

	if !allowed {
		return nil, utils.BadRequest(fmt.Sprintf("Cannot set status to %s", status))
	}

	_, err = database.DB.ExecContext(ctx, "UPDATE reservations SET status = $1 WHERE id = $2", status, reservationID)
	if err != nil {
		return nil, err
	}

	_ = database.RecomputeListingStatus(ctx, foodListingID)

	if status == "collected" {
		_ = GlobalBadgeService.AddMealsAndCheckBadges(ctx, donorID, res.Quantity)
	}

	var reserverName, reserverEmail string
	_ = database.DB.QueryRowContext(ctx, "SELECT name, email FROM users WHERE id = $1", res.UserID).Scan(&reserverName, &reserverEmail)

	var donorName, donorEmail string
	_ = database.DB.QueryRowContext(ctx, "SELECT name, email FROM users WHERE id = $1", donorID).Scan(&donorName, &donorEmail)

	ctxData := map[string]any{"reservationId": res.ID, "listingId": foodListingID}

	if status == "approved" && isOwner {
		_ = GlobalNotificationService.CreateNotification(ctx, res.UserID, "reservation_approved", "Reservation approved", fmt.Sprintf("Your reservation for \"%s\" was approved.", title), ctxData)
		if GlobalEmailService != nil && reserverEmail != "" {
			GlobalEmailService.SendReservationApprovedEmail(reserverEmail, reserverName, title, pickupAddress)
		}
	} else if status == "collected" {
		if isOwner {
			_ = GlobalNotificationService.CreateNotification(ctx, res.UserID, "reservation_collected", "Pickup completed", fmt.Sprintf("Donor marked your reservation for \"%s\" as collected.", title), ctxData)
			if GlobalEmailService != nil && reserverEmail != "" {
				GlobalEmailService.SendOrderUpdateEmail(reserverEmail, reserverName, title, "collected")
			}
		} else if isReserver {
			_ = GlobalNotificationService.CreateNotification(ctx, donorID, "reservation_collected", "Pickup completed", fmt.Sprintf("Your listing \"%s\" was collected.", title), ctxData)
			if GlobalEmailService != nil && donorEmail != "" {
				GlobalEmailService.SendOrderUpdateEmail(donorEmail, donorName, title, "collected")
			}
		}
	} else if status == "cancelled" {
		targetID := res.UserID
		targetEmail := reserverEmail
		targetName := reserverName
		by := "Donor cancelled"
		if isReserver {
			targetID = donorID
			targetEmail = donorEmail
			targetName = donorName
			by = "Reserver cancelled"
		}
		_ = GlobalNotificationService.CreateNotification(ctx, targetID, "reservation_cancelled", "Reservation cancelled", fmt.Sprintf("%s the reservation for \"%s\".", by, title), ctxData)
		if GlobalEmailService != nil && targetEmail != "" {
			GlobalEmailService.SendOrderCancelledEmail(targetEmail, targetName, title)
		}
	}

	res.Status = status
	return &res, nil
}
