package services

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"time"

	"left2serve/backend/config"
	"left2serve/backend/database"
	"left2serve/backend/models"
	"left2serve/backend/utils"
)

type PaymentService struct {
	cfg *config.Config
}

var GlobalPaymentService *PaymentService

func InitPaymentService(cfg *config.Config) {
	GlobalPaymentService = &PaymentService{cfg: cfg}
}

func (s *PaymentService) IsConfigured() bool {
	return s.cfg.RazorpayKeyID != "" && s.cfg.RazorpayKeySecret != ""
}

func (s *PaymentService) VerifySignature(orderID, paymentID, signature string) bool {
	h := hmac.New(sha256.New, []byte(s.cfg.RazorpayKeySecret))
	h.Write([]byte(orderID + "|" + paymentID))
	expected := hex.EncodeToString(h.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}

func (s *PaymentService) CreateOrder(ctx context.Context, userID int, req *models.CreateOrderRequest) (*models.OrderResponse, error) {
	if !s.IsConfigured() {
		return nil, utils.ServiceUnavailable("Razorpay is not configured on the server")
	}

	if req.PickupTime != nil && req.PickupTime.Before(time.Now()) {
		return nil, utils.BadRequest("Pickup time must be in the future")
	}

	var listing models.FoodListing
	err := database.DB.QueryRowContext(ctx, "SELECT id, user_id, title, unit, price, expiry_date, status FROM food_listings WHERE id = $1", req.FoodListingID).Scan(
		&listing.ID, &listing.UserID, &listing.Title, &listing.Unit, &listing.Price, &listing.ExpiryDate, &listing.Status,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, utils.NotFound("Listing not found")
		}
		return nil, err
	}

	if listing.Status != "available" {
		return nil, utils.BadRequest("Listing is no longer available")
	}
	if listing.ExpiryDate.Before(time.Now()) {
		return nil, utils.BadRequest("This listing has expired")
	}

	avail, err := database.GetAvailability(ctx, req.FoodListingID)
	if err != nil {
		return nil, err
	}
	if req.Quantity > avail.Remaining {
		return nil, utils.BadRequest(fmt.Sprintf("Only %d %s available", avail.Remaining, listing.Unit))
	}

	if listing.Price <= 0 {
		return nil, utils.BadRequest("This listing is free and does not need online payment")
	}

	var existingID int
	err = database.DB.QueryRowContext(ctx, "SELECT id FROM reservations WHERE food_listing_id = $1 AND user_id = $2 AND status IN ('pending','approved')", req.FoodListingID, userID).Scan(&existingID)
	if err == nil {
		return nil, utils.Conflict("You already have an active reservation for this listing")
	}

	amountPaise := int(math.Round(listing.Price * float64(req.Quantity) * 100))
	amountRupees := float64(amountPaise) / 100.0

	// Call Razorpay API
	razorpayReq := map[string]any{
		"amount":          amountPaise,
		"currency":        "INR",
		"receipt":         fmt.Sprintf("l2s_%d_%d", userID, time.Now().Unix()),
		"payment_capture": 1,
	}
	reqData, _ := json.Marshal(razorpayReq)

	client := &http.Client{Timeout: 10 * time.Second}
	httpReq, err := http.NewRequestWithContext(ctx, "POST", "https://api.razorpay.com/v1/orders", bytes.NewBuffer(reqData))
	if err != nil {
		return nil, utils.InternalError("Failed to prepare payment request")
	}

	authStr := base64.StdEncoding.EncodeToString([]byte(fmt.Sprintf("%s:%s", s.cfg.RazorpayKeyID, s.cfg.RazorpayKeySecret)))
	httpReq.Header.Set("Authorization", "Basic "+authStr)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, utils.NewAppError(http.StatusBadGateway, "Failed to connect to Razorpay")
	}
	defer resp.Body.Close()

	var orderData struct {
		ID    string `json:"id"`
		Error *struct {
			Description string `json:"description"`
		} `json:"error"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&orderData)

	if resp.StatusCode >= 400 || orderData.ID == "" {
		msg := "Failed to create Razorpay order"
		if orderData.Error != nil && orderData.Error.Description != "" {
			msg = orderData.Error.Description
		}
		return nil, utils.NewAppError(http.StatusBadGateway, msg)
	}

	var resID int
	err = database.DB.QueryRowContext(ctx, `
		INSERT INTO reservations (food_listing_id, user_id, quantity, pickup_time, notes, payment_method, payment_status, amount, razorpay_order_id) 
		VALUES ($1, $2, $3, $4, $5, 'razorpay', 'pending', $6, $7) 
		RETURNING id`,
		req.FoodListingID, userID, req.Quantity, req.PickupTime, req.Notes, amountRupees, orderData.ID,
	).Scan(&resID)
	if err != nil {
		return nil, err
	}

	_ = database.RecomputeListingStatus(ctx, req.FoodListingID)

	var res models.Reservation
	_ = database.DB.QueryRowContext(ctx, "SELECT id, food_listing_id, user_id, quantity, status, payment_method, payment_status, amount, razorpay_order_id, created_at FROM reservations WHERE id = $1", resID).Scan(
		&res.ID, &res.FoodListingID, &res.UserID, &res.Quantity, &res.Status, &res.PaymentMethod, &res.PaymentStatus, &res.Amount, &res.RazorpayOrderID, &res.CreatedAt,
	)

	var reserverName, reserverEmail, reserverPhone string
	_ = database.DB.QueryRowContext(ctx, "SELECT name, email, COALESCE(phone, '') FROM users WHERE id = $1", userID).Scan(&reserverName, &reserverEmail, &reserverPhone)

	_ = GlobalNotificationService.CreateNotification(
		ctx,
		listing.UserID,
		"reservation_new",
		"New reservation request",
		fmt.Sprintf("%s requested %d %s of \"%s\"", reserverName, req.Quantity, listing.Unit, listing.Title),
		map[string]any{"reservationId": resID, "listingId": req.FoodListingID, "reserverName": reserverName},
	)

	response := &models.OrderResponse{
		ReservationID:   resID,
		RazorpayOrderID: orderData.ID,
		Amount:          amountPaise,
		Currency:        "INR",
		KeyID:           s.cfg.RazorpayKeyID,
		Name:            "Left2Serve",
		Description:     fmt.Sprintf("Payment for %s", listing.Title),
		Reservation:     &res,
	}
	response.Prefill.Name = reserverName
	response.Prefill.Email = reserverEmail
	response.Prefill.Contact = reserverPhone

	return response, nil
}

func (s *PaymentService) VerifyPayment(ctx context.Context, userID int, req *models.VerifyPaymentRequest) (map[string]any, error) {
	if !s.IsConfigured() {
		return nil, utils.ServiceUnavailable("Razorpay is not configured on the server")
	}

	var res models.Reservation
	err := database.DB.QueryRowContext(ctx, `
		SELECT id, food_listing_id, user_id, payment_method, payment_status, razorpay_order_id 
		FROM reservations WHERE id = $1`, req.ReservationID,
	).Scan(&res.ID, &res.FoodListingID, &res.UserID, &res.PaymentMethod, &res.PaymentStatus, &res.RazorpayOrderID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, utils.NotFound("Reservation not found")
		}
		return nil, err
	}

	if res.UserID != userID {
		return nil, utils.Forbidden("Not authorized")
	}
	if res.PaymentMethod != "razorpay" {
		return nil, utils.BadRequest("This reservation is not a Razorpay payment")
	}
	if res.RazorpayOrderID == nil || *res.RazorpayOrderID != req.RazorpayOrderID {
		return nil, utils.BadRequest("Order ID mismatch")
	}
	if res.PaymentStatus == "paid" {
		return map[string]any{"success": true, "message": "Payment already verified", "reservation": res}, nil
	}

	if !s.VerifySignature(req.RazorpayOrderID, req.RazorpayPaymentID, req.RazorpaySignature) {
		_, _ = database.DB.ExecContext(ctx, "UPDATE reservations SET payment_status = 'failed' WHERE id = $1", req.ReservationID)
		return nil, utils.BadRequest("Payment signature verification failed")
	}

	_, err = database.DB.ExecContext(ctx, `
		UPDATE reservations 
		SET payment_status = 'paid', status = 'pending', razorpay_payment_id = $1, razorpay_signature = $2 
		WHERE id = $3`,
		req.RazorpayPaymentID, req.RazorpaySignature, req.ReservationID,
	)
	if err != nil {
		return nil, err
	}

	_ = database.RecomputeListingStatus(ctx, res.FoodListingID)

	res.PaymentStatus = "paid"
	res.Status = "pending"
	res.RazorpayPaymentID = &req.RazorpayPaymentID
	res.RazorpaySignature = &req.RazorpaySignature

	return map[string]any{
		"success":     true,
		"reservation": res,
	}, nil
}
