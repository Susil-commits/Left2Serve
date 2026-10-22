package models

import (
	"encoding/json"
	"time"
)

type Reservation struct {
	ID                int             `json:"id"`
	FoodListingID     int             `json:"food_listing_id"`
	UserID            int             `json:"user_id"`
	Quantity          int             `json:"quantity"`
	Status            string          `json:"status"`
	PaymentMethod     string          `json:"payment_method"`
	PaymentStatus     string          `json:"payment_status"`
	Amount            float64         `json:"amount"`
	RazorpayOrderID   *string         `json:"razorpay_order_id"`
	RazorpayPaymentID *string         `json:"razorpay_payment_id"`
	RazorpaySignature *string         `json:"razorpay_signature"`
	PickupTime        *time.Time      `json:"pickup_time"`
	Notes             *string         `json:"notes"`
	CreatedAt         time.Time       `json:"created_at"`
	AgreedToWaiver    bool            `json:"agreed_to_waiver"`

	// Joined fields
	FoodTitle     *string         `json:"food_title,omitempty"`
	PickupAddress *string         `json:"pickup_address,omitempty"`
	ImageURLs     json.RawMessage `json:"image_urls,omitempty"`
	DonorName     *string         `json:"donor_name,omitempty"`
	DonorPhone    *string         `json:"donor_phone,omitempty"`
	DonorOrg      *string         `json:"donor_org,omitempty"`
	ReserverName  *string         `json:"reserver_name,omitempty"`
	ReserverPhone *string         `json:"reserver_phone,omitempty"`
	ReserverOrg   *string         `json:"reserver_org,omitempty"`
}

type CreateReservationRequest struct {
	FoodListingID int        `json:"food_listing_id" binding:"required,min=1"`
	Quantity      int        `json:"quantity" binding:"required,min=1"`
	PickupTime    *time.Time `json:"pickup_time"`
	Notes         *string    `json:"notes"`
	PaymentMethod string     `json:"payment_method"`
}

type VerifyQRRequest struct {
	Token string `json:"token" binding:"required"`
}

type UpdateReservationStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=approved collected cancelled"`
}
