package models

import (
	"encoding/json"
	"strings"
	"testing"
	"time"
)

func TestUserJSONSerialization(t *testing.T) {
	now := time.Now()
	secret := "2FA_SECRET_TOKEN"
	passHash := "$2a$12$SomeHashedPassword"
	resetToken := "reset_token_xyz"

	user := User{
		ID:               1,
		Name:             "John Doe",
		Email:            "john@example.com",
		PasswordHash:     passHash,
		Role:             "donor",
		IsActive:         true,
		TokenVersion:     0,
		CreatedAt:        now,
		ResetToken:       &resetToken,
		TwoFactorSecret:  &secret,
		TwoFactorEnabled: true,
	}

	data, err := json.Marshal(user)
	if err != nil {
		t.Fatalf("Failed to marshal User: %v", err)
	}

	str := string(data)

	// Ensure sensitive fields with json:"-" are NEVER included in JSON
	if strings.Contains(str, passHash) {
		t.Error("PasswordHash leaked in JSON output")
	}
	if strings.Contains(str, secret) {
		t.Error("TwoFactorSecret leaked in JSON output")
	}
	if strings.Contains(str, resetToken) {
		t.Error("ResetToken leaked in JSON output")
	}

	// SafeUser check
	safe := SafeUser{
		ID:       1,
		Name:     "John Doe",
		Email:    "john@example.com",
		Role:     "donor",
		IsActive: true,
	}
	safeData, err := json.Marshal(safe)
	if err != nil {
		t.Fatalf("Failed to marshal SafeUser: %v", err)
	}

	var safeMap map[string]any
	_ = json.Unmarshal(safeData, &safeMap)
	if safeMap["email"] != "john@example.com" {
		t.Errorf("Unexpected SafeUser email: %v", safeMap["email"])
	}
}
