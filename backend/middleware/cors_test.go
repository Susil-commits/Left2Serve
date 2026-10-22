package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"left2serve/backend/config"
)

func TestCORSMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cfg := &config.Config{
		ClientURL: "https://my-custom-frontend.com",
	}

	r := gin.New()
	r.Use(CORSMiddleware(cfg))
	r.GET("/test-cors", func(c *gin.Context) {
		c.String(http.StatusOK, "cors ok")
	})

	tests := []struct {
		origin      string
		shouldAllow bool
	}{
		{"http://localhost:5173", true},
		{"http://localhost:4173", true},
		{"http://127.0.0.1:5173", true},
		{"https://my-custom-frontend.com", true},
		{"https://left2serve-xyz.vercel.app", true},
		{"https://another-branch.vercel.app", true},
		{"https://unauthorized-domain.com", false},
	}

	for _, tt := range tests {
		t.Run(tt.origin, func(t *testing.T) {
			req, _ := http.NewRequest(http.MethodGet, "/test-cors", nil)
			req.Header.Set("Origin", tt.origin)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			allowHeader := w.Header().Get("Access-Control-Allow-Origin")
			if tt.shouldAllow {
				if allowHeader != tt.origin {
					t.Errorf("Expected allow header %q for origin %q, got %q", tt.origin, tt.origin, allowHeader)
				}
			} else {
				if allowHeader == tt.origin {
					t.Errorf("Did not expect origin %q to be allowed", tt.origin)
				}
			}
		})
	}
}
