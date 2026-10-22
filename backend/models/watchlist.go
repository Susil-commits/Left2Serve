package models

import "time"

type Watchlist struct {
	ID        int       `json:"id"`
	UserID    int       `json:"user_id"`
	Keyword   *string   `json:"keyword"`
	Latitude  float64   `json:"latitude"`
	Longitude float64   `json:"longitude"`
	RadiusKM  float64   `json:"radius_km"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateWatchlistRequest struct {
	Keyword   *string `json:"keyword"`
	Latitude  float64 `json:"latitude" binding:"required"`
	Longitude float64 `json:"longitude" binding:"required"`
	RadiusKM  float64 `json:"radius_km"`
}
