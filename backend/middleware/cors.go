package middleware

import (
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"left2serve/backend/config"
)

func CORSMiddleware(cfg *config.Config) gin.HandlerFunc {
	allowedList := []string{
		"http://localhost:5173",
		"http://localhost:4173",
		"http://127.0.0.1:5173",
	}

	if cfg.ClientURL != "" {
		for _, u := range strings.Split(cfg.ClientURL, ",") {
			trimmed := strings.TrimSpace(u)
			if trimmed != "" {
				allowedList = append(allowedList, trimmed)
			}
		}
	}

	allowedSet := make(map[string]bool)
	for _, origin := range allowedList {
		allowedSet[origin] = true
	}

	corsConfig := cors.Config{
		AllowOriginFunc: func(origin string) bool {
			if origin == "" {
				return true
			}
			if allowedSet[origin] {
				return true
			}
			parsed, err := url.Parse(origin)
			if err == nil && strings.HasSuffix(parsed.Hostname(), ".vercel.app") {
				return true
			}
			return false
		},
		AllowMethods: []string{
			http.MethodGet,
			http.MethodPost,
			http.MethodPut,
			http.MethodPatch,
			http.MethodDelete,
			http.MethodOptions,
		},
		AllowHeaders: []string{
			"Origin",
			"Content-Type",
			"Accept",
			"Authorization",
			"X-Request-Id",
			"X-Requested-With",
		},
		ExposeHeaders: []string{
			"Content-Length",
			"X-Cache",
			"Content-Disposition",
		},
		AllowCredentials: true,
		MaxAge:           24 * time.Hour,
	}

	return cors.New(corsConfig)
}
