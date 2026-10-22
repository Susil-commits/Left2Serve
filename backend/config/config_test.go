package config

import (
	"os"
	"testing"
)

func TestGetEnv(t *testing.T) {
	key := "TEST_ENV_KEY_XYZ"
	defaultVal := "fallback_value"

	_ = os.Unsetenv(key)
	if got := getEnv(key, defaultVal); got != defaultVal {
		t.Errorf("getEnv(%q, %q) = %q, expected default %q", key, defaultVal, got, defaultVal)
	}

	_ = os.Setenv(key, "actual_value")
	defer func() { _ = os.Unsetenv(key) }()

	if got := getEnv(key, defaultVal); got != "actual_value" {
		t.Errorf("getEnv(%q, %q) = %q, expected %q", key, defaultVal, got, "actual_value")
	}
}

func TestLoadConfigMissingJWTSecret(t *testing.T) {
	// Temporarily override JWT_SECRET
	orig := os.Getenv("JWT_SECRET")
	defer func() { _ = os.Setenv("JWT_SECRET", orig) }()

	_ = os.Setenv("JWT_SECRET", "too-short")
	_, err := LoadConfig()
	if err == nil {
		t.Error("Expected error when JWT_SECRET is less than 16 characters")
	}

	_ = os.Setenv("JWT_SECRET", "this-is-a-valid-length-jwt-secret-key")
	cfg, err := LoadConfig()
	if err != nil {
		t.Fatalf("Unexpected error with valid JWT_SECRET: %v", err)
	}
	if cfg.JWTSecret != "this-is-a-valid-length-jwt-secret-key" {
		t.Errorf("JWTSecret mismatch: got %q", cfg.JWTSecret)
	}
}
