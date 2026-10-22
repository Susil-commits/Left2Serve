package models

import (
	"encoding/json"
	"time"
)

type User struct {
	ID                int             `json:"id"`
	Name              string          `json:"name"`
	Email             string          `json:"email"`
	PasswordHash      string          `json:"-"`
	Role              string          `json:"role"`
	Phone             *string         `json:"phone"`
	Address           *string         `json:"address"`
	Organization      *string         `json:"organization"`
	IsActive          bool            `json:"is_active"`
	TokenVersion      int             `json:"token_version"`
	FailedAttempts    int             `json:"failed_attempts"`
	LockedUntil       *time.Time      `json:"locked_until"`
	CreatedAt         time.Time       `json:"created_at"`
	ResetToken        *string         `json:"-"`
	ResetExpires      *time.Time      `json:"-"`
	TwoFactorSecret   *string         `json:"-"`
	TwoFactorEnabled  bool            `json:"two_factor_enabled"`
	AvatarURL         *string         `json:"avatar_url"`
	Badges            json.RawMessage `json:"badges"`
	MealsSaved        int             `json:"meals_saved"`
	PushSubscriptions json.RawMessage `json:"push_subscriptions"`
}

type SafeUser struct {
	ID               int             `json:"id"`
	Name             string          `json:"name"`
	Email            string          `json:"email"`
	Role             string          `json:"role"`
	Phone            *string         `json:"phone"`
	Address          *string         `json:"address"`
	Organization     *string         `json:"organization"`
	IsActive         bool            `json:"is_active"`
	AvatarURL        *string         `json:"avatar_url"`
	TwoFactorEnabled bool            `json:"two_factor_enabled"`
	MealsSaved       int             `json:"meals_saved"`
	Badges           json.RawMessage `json:"badges"`
	CreatedAt        time.Time       `json:"created_at"`
}

type RegisterRequest struct {
	Name         string  `json:"name" binding:"required,min=2"`
	Email        string  `json:"email" binding:"required,email"`
	Password     string  `json:"password" binding:"required"`
	Role         string  `json:"role" binding:"required,oneof=donor ngo volunteer"`
	Phone        *string `json:"phone"`
	Address      *string `json:"address"`
	Organization *string `json:"organization"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
	OTP      string `json:"otp"`
}

type UpdateProfileRequest struct {
	Name         *string `json:"name"`
	Phone        *string `json:"phone"`
	Address      *string `json:"address"`
	Organization *string `json:"organization"`
	AvatarURL    *string `json:"avatar_url"`
}

type ChangePasswordRequest struct {
	Current string `json:"current" binding:"required"`
	NewPass string `json:"newPass" binding:"required"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type ResetPasswordRequest struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"newPassword" binding:"required"`
}

type Verify2FARequest struct {
	Token string `json:"token" binding:"required"`
}
