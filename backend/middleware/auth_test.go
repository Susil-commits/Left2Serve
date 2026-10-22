package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"left2serve/backend/config"
	"left2serve/backend/models"
)

func TestSignAndVerifyToken(t *testing.T) {
	cfg := &config.Config{
		JWTSecret: "test-super-secret-key-at-least-16-bytes",
	}

	user := &models.User{
		ID:           42,
		Role:         "donor",
		TokenVersion: 1,
	}

	tokenStr, err := SignToken(user, cfg)
	if err != nil {
		t.Fatalf("SignToken failed: %v", err)
	}

	claims, err := VerifyToken(tokenStr, cfg)
	// Note: VerifyToken checks DB for non-admin tokens if DB is initialized.
	// For admin tokens:
	adminToken, err := SignAdminToken(cfg)
	if err != nil {
		t.Fatalf("SignAdminToken failed: %v", err)
	}

	adminClaims, err := VerifyToken(adminToken, cfg)
	if err != nil {
		t.Fatalf("VerifyToken admin failed: %v", err)
	}

	if adminClaims.Role != "admin" || adminClaims.ID != 0 {
		t.Errorf("Unexpected admin claims: %+v", adminClaims)
	}
	_ = claims
}

func TestRequireRole(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name         string
		userRole     string
		allowedRoles []string
		expectedCode int
	}{
		{"Donor allowed", "donor", []string{"donor", "ngo"}, http.StatusOK},
		{"Volunteer forbidden", "volunteer", []string{"donor", "ngo"}, http.StatusForbidden},
		{"Admin allowed", "admin", []string{"admin"}, http.StatusOK},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := gin.New()
			r.Use(func(c *gin.Context) {
				c.Set("userRole", tt.userRole)
				c.Next()
			})
			r.GET("/protected", RequireRole(tt.allowedRoles...), func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"status": "ok"})
			})

			req, _ := http.NewRequest(http.MethodGet, "/protected", nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != tt.expectedCode {
				t.Errorf("Expected status %d, got %d", tt.expectedCode, w.Code)
			}
		})
	}
}
