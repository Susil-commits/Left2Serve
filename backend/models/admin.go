package models

import "time"

type AdminLoginRequest struct {
	AdminCode string `json:"adminCode" binding:"required"`
}

type AdminStats struct {
	TotalUsers           int     `json:"totalUsers"`
	TotalNgos            int     `json:"totalNgos"`
	TotalDonors          int     `json:"totalDonors"`
	TotalVolunteers      int     `json:"totalVolunteers"`
	TotalListings        int     `json:"totalListings"`
	ActiveListings       int     `json:"activeListings"`
	TotalReservations    int     `json:"totalReservations"`
	PendingReservations  int     `json:"pendingReservations"`
	ApprovedReservations int     `json:"approvedReservations"`
	CollectedReservations int    `json:"collectedReservations"`
	MealsSaved           float64 `json:"mealsSaved"`
}

type AdminUpdateUserRequest struct {
	Role     *string `json:"role"`
	IsActive *bool   `json:"isActive"`
}

type AdminResetUserPasswordRequest struct {
	Password *string `json:"password"`
}

type AdminUpdateOrderRequest struct {
	Status string `json:"status" binding:"required,oneof=approved collected cancelled"`
}

type TrendSeries struct {
	Date         string  `json:"date"`
	Reservations int     `json:"reservations"`
	Meals        float64 `json:"meals"`
}

type CategoryCount struct {
	Category string `json:"category"`
	Count    int    `json:"count"`
}

type TrendsResponse struct {
	Series     []TrendSeries   `json:"series"`
	ByCategory []CategoryCount `json:"byCategory"`
}

type AuditLog struct {
	ID         int       `json:"id"`
	ActorID    *int      `json:"actor_id"`
	ActorRole  *string   `json:"actor_role"`
	Action     string    `json:"action"`
	TargetType *string   `json:"target_type"`
	TargetID   *int      `json:"target_id"`
	Detail     *string   `json:"detail"`
	IP         *string   `json:"ip"`
	CreatedAt  time.Time `json:"created_at"`
}

type NGOOverview struct {
	ID                    int       `json:"id"`
	Name                  string    `json:"name"`
	Email                 string    `json:"email"`
	Phone                 *string   `json:"phone"`
	Address               *string   `json:"address"`
	Organization          *string   `json:"organization"`
	IsActive              bool      `json:"is_active"`
	CreatedAt             time.Time `json:"created_at"`
	TotalReservations     int       `json:"totalReservations"`
	PendingReservations   int       `json:"pendingReservations"`
	CollectedReservations int       `json:"collectedReservations"`
}
