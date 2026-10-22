package routes

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"left2serve/backend/config"
	"left2serve/backend/controllers"
	"left2serve/backend/services"
	"left2serve/backend/sockets"
)

func TestRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cfg := &config.Config{
		JWTSecret:    "super-secret-key-16-bytes-long",
		ClientURL:    "http://localhost:5173",
		IsProduction: false,
	}

	sockets.InitSocketServer(cfg)
	controllers.InitListingController(cfg)
	controllers.InitPaymentController(cfg)
	controllers.InitAdminController(cfg)
	services.InitEmailService(cfg)
	services.InitAuthService(cfg)
	services.InitReservationService(cfg)
	services.InitPaymentService(cfg)
	services.InitAIService(cfg)

	r := SetupRouter(cfg)

	t.Run("Root endpoint", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Expected status 200, got %d", w.Code)
		}

		var res map[string]any
		if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
			t.Fatalf("Failed to parse JSON: %v", err)
		}

		if res["status"] != "ok" || res["name"] != "Left2Serve API" {
			t.Errorf("Unexpected root response: %+v", res)
		}
	})

	t.Run("Health check endpoint", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/health", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Expected status 200, got %d", w.Code)
		}

		var res map[string]any
		_ = json.Unmarshal(w.Body.Bytes(), &res)
		if res["status"] != "ok" {
			t.Errorf("Unexpected health response: %+v", res)
		}
	})

	t.Run("Notifications health check endpoint", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/health/notifications", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Expected status 200, got %d", w.Code)
		}

		var res map[string]any
		_ = json.Unmarshal(w.Body.Bytes(), &res)
		if res["state"] != "CLOSED" {
			t.Errorf("Unexpected notifications health: %+v", res)
		}
	})

	t.Run("tRPC Compatibility endpoint", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/trpc/health", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Expected status 200, got %d", w.Code)
		}
	})

	t.Run("404 Not Found", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/non-existent-route", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusNotFound {
			t.Fatalf("Expected status 404, got %d", w.Code)
		}
	})

	t.Run("Protected route without token returns 401", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/auth/me", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("Expected status 401, got %d", w.Code)
		}
	})
}
