package utils

import (
	"testing"
)

func TestValidatePassword(t *testing.T) {
	tests := []struct {
		name     string
		password string
		valid    bool
	}{
		{"Too short", "Aa1!", false},
		{"Only lowercase", "onlylowercase", false},
		{"Only 2 classes: lower and digit", "password1234", false},
		{"Only 2 classes: upper and digit", "PASSWORD1234", false},
		{"Only 2 classes: upper and lower", "PasswordOnly", false},
		{"Valid 3 classes: lower, upper, digit", "Password123", true},
		{"Valid 3 classes: lower, upper, special", "Password!@#", true},
		{"Valid 4 classes", "P@ssword123", true},
		{"Valid complex password", "Susil@2004123", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			valid, msg := ValidatePassword(tt.password)
			if valid != tt.valid {
				t.Errorf("ValidatePassword(%q) = %v (msg: %s), expected %v", tt.password, valid, msg, tt.valid)
			}
		})
	}
}

func TestHashAndVerifyPassword(t *testing.T) {
	raw := "SecureP@ss123"
	hash, err := HashPassword(raw)
	if err != nil {
		t.Fatalf("HashPassword failed: %v", err)
	}

	if !CheckPasswordHash(raw, hash) {
		t.Errorf("CheckPasswordHash returned false for matching password")
	}

	if CheckPasswordHash("WrongPassword123!", hash) {
		t.Errorf("CheckPasswordHash returned true for wrong password")
	}
}
