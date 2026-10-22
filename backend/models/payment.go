package models

import "time"

type CreateOrderRequest struct {
	FoodListingID int        `json:"food_listing_id" binding:"required,min=1"`
	Quantity      int        `json:"quantity" binding:"required,min=1"`
	PickupTime    *time.Time `json:"pickup_time"`
	Notes         *string    `json:"notes"`
}

type VerifyPaymentRequest struct {
	ReservationID     int    `json:"reservation_id" binding:"required,min=1"`
	RazorpayOrderID   string `json:"razorpay_order_id" binding:"required"`
	RazorpayPaymentID string `json:"razorpay_payment_id" binding:"required"`
	RazorpaySignature string `json:"razorpay_signature" binding:"required"`
}

type OrderResponse struct {
	ReservationID   int          `json:"reservation_id"`
	RazorpayOrderID string       `json:"razorpay_order_id"`
	Amount          int          `json:"amount"` // in paise
	Currency        string       `json:"currency"`
	KeyID           string       `json:"key_id"`
	Name            string       `json:"name"`
	Description     string       `json:"description"`
	Reservation     *Reservation `json:"reservation"`
	Prefill         struct {
		Name    string `json:"name"`
		Email   string `json:"email"`
		Contact string `json:"contact"`
	} `json:"prefill"`
}
