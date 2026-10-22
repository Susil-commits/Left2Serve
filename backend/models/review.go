package models

import "time"

type Review struct {
	ID            int       `json:"id"`
	ReservationID int       `json:"reservation_id"`
	ListingID     int       `json:"listing_id"`
	ReviewerID    int       `json:"reviewer_id"`
	RevieweeID    int       `json:"reviewee_id"`
	Rating        int       `json:"rating"`
	Comment       *string   `json:"comment"`
	CreatedAt     time.Time `json:"created_at"`

	ReviewerName *string `json:"reviewer_name,omitempty"`
	ReviewerRole *string `json:"reviewer_role,omitempty"`
	FoodTitle    *string `json:"food_title,omitempty"`
}

type CreateReviewRequest struct {
	ReservationID int     `json:"reservationId" binding:"required,min=1"`
	Rating        int     `json:"rating" binding:"required,min=1,max=5"`
	Comment       *string `json:"comment"`
}

type ReservationReviewInfo struct {
	CanReview     bool      `json:"canReview"`
	MyReview      *Review   `json:"myReview"`
	Reviewee      *SafeUser `json:"reviewee"`
	FoodTitle     string    `json:"foodTitle"`
	ReservationID int       `json:"reservationId"`
}

type UserReviewsResponse struct {
	Average float64  `json:"average"`
	Count   int      `json:"count"`
	Reviews []Review `json:"reviews"`
}
