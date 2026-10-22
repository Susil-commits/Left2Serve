package models

import (
	"encoding/json"
	"time"
)

type FoodListing struct {
	ID                 int             `json:"id"`
	UserID             int             `json:"user_id"`
	Title              string          `json:"title"`
	Description        *string         `json:"description"`
	Category           string          `json:"category"`
	Quantity           int             `json:"quantity"`
	Unit               string          `json:"unit"`
	Price              float64         `json:"price"`
	ExpiryDate         time.Time       `json:"expiry_date"`
	PickupAddress      string          `json:"pickup_address"`
	PickupInstructions *string         `json:"pickup_instructions"`
	ImageURLs          json.RawMessage `json:"image_urls"`
	DietaryPreferences json.RawMessage `json:"dietary_preferences"`
	Status             string          `json:"status"`
	CreatedAt          time.Time       `json:"created_at"`
	Latitude           *float64        `json:"latitude"`
	Longitude          *float64        `json:"longitude"`
	HasSafetyChecklist bool            `json:"has_safety_checklist"`
	IsTemplate         bool            `json:"is_template"`

	DonorName  *string  `json:"donor_name,omitempty"`
	DonorOrg   *string  `json:"donor_org,omitempty"`
	DonorPhone *string  `json:"donor_phone,omitempty"`
	Remaining  int      `json:"remaining"`
	DistanceKM *float64 `json:"distance_km,omitempty"`
}

type CreateListingRequest struct {
	Title              string    `json:"title" binding:"required"`
	Description        *string   `json:"description"`
	Category           string    `json:"category" binding:"required,oneof=event restaurant hotel caterer household"`
	Quantity           int       `json:"quantity" binding:"required,min=1"`
	Unit               string    `json:"unit"`
	Price              float64   `json:"price"`
	ExpiryDate         time.Time `json:"expiry_date" binding:"required"`
	PickupAddress      string    `json:"pickup_address" binding:"required"`
	PickupInstructions *string   `json:"pickup_instructions"`
	ImageURLs          []string  `json:"image_urls"`
	DietaryPreferences []string  `json:"dietary_preferences"`
	Latitude           *float64  `json:"latitude"`
	Longitude          *float64  `json:"longitude"`
	HasSafetyChecklist bool      `json:"has_safety_checklist"`
	IsTemplate         bool      `json:"is_template"`
}

type UpdateListingRequest struct {
	Title              *string   `json:"title"`
	Description        *string   `json:"description"`
	Category           *string   `json:"category"`
	Quantity           *int      `json:"quantity"`
	Unit               *string   `json:"unit"`
	Price              *float64  `json:"price"`
	ExpiryDate         *time.Time `json:"expiry_date"`
	PickupAddress      *string   `json:"pickup_address"`
	PickupInstructions *string   `json:"pickup_instructions"`
	ImageURLs          []string  `json:"image_urls"`
	DietaryPreferences []string  `json:"dietary_preferences"`
	Status             *string   `json:"status"`
	Latitude           *float64  `json:"latitude"`
	Longitude          *float64  `json:"longitude"`
}

type ListingQueryOptions struct {
	Category string
	Status   string
	Search   string
	Sort     string
	Dietary  string
	Page     int
	Limit    int
	Lat      *float64
	Lng      *float64
	Distance *float64
}

type ListingPagination struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"totalPages"`
}

type PaginatedListings struct {
	Listings   []FoodListing     `json:"listings"`
	Pagination ListingPagination `json:"pagination"`
}
