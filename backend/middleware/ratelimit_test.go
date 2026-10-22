package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestRateLimiter(t *testing.T) {
	gin.SetMode(gin.TestMode)

	limiter := NewRateLimiter(2, 100*time.Millisecond)

	r := gin.New()
	r.Use(limiter.Middleware("Rate limit exceeded"))
	r.GET("/ping", func(c *gin.Context) {
		c.String(http.StatusOK, "pong")
	})

	// 1st request -> OK
	req1, _ := http.NewRequest(http.MethodGet, "/ping", nil)
	w1 := httptest.NewRecorder()
	r.ServeHTTP(w1, req1)
	if w1.Code != http.StatusOK {
		t.Fatalf("Expected 200 on 1st request, got %d", w1.Code)
	}

	// 2nd request -> OK
	req2, _ := http.NewRequest(http.MethodGet, "/ping", nil)
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)
	if w2.Code != http.StatusOK {
		t.Fatalf("Expected 200 on 2nd request, got %d", w2.Code)
	}

	// 3rd request immediately -> 429 Too Many Requests
	req3, _ := http.NewRequest(http.MethodGet, "/ping", nil)
	w3 := httptest.NewRecorder()
	r.ServeHTTP(w3, req3)
	if w3.Code != http.StatusTooManyRequests {
		t.Fatalf("Expected 429 on 3rd request, got %d", w3.Code)
	}

	// Wait for window to replenish
	time.Sleep(150 * time.Millisecond)

	// 4th request after refill -> OK
	req4, _ := http.NewRequest(http.MethodGet, "/ping", nil)
	w4 := httptest.NewRecorder()
	r.ServeHTTP(w4, req4)
	if w4.Code != http.StatusOK {
		t.Fatalf("Expected 200 after window refill, got %d", w4.Code)
	}
}

func TestSecurityAndRequestIDMiddlewares(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.Use(RequestIDMiddleware())
	r.Use(SecurityHeadersMiddleware())
	r.GET("/headers", func(c *gin.Context) {
		c.String(http.StatusOK, "ok")
	})

	req, _ := http.NewRequest(http.MethodGet, "/headers", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Header().Get("X-Request-Id") == "" {
		t.Error("X-Request-Id header is missing")
	}
	if w.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Error("X-Content-Type-Options header mismatch")
	}
	if w.Header().Get("X-Frame-Options") != "DENY" {
		t.Error("X-Frame-Options header mismatch")
	}
}
