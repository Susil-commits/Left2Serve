package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type rateBucket struct {
	tokens     int
	lastRefill time.Time
	mu         sync.Mutex
}

type RateLimiter struct {
	buckets map[string]*rateBucket
	mu      sync.Mutex
	max     int
	window  time.Duration
}

func NewRateLimiter(max int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		buckets: make(map[string]*rateBucket),
		max:     max,
		window:  window,
	}

	// Periodic garbage collection for idle clients
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		for range ticker.C {
			rl.mu.Lock()
			now := time.Now()
			for ip, b := range rl.buckets {
				b.mu.Lock()
				if now.Sub(b.lastRefill) > rl.window*2 {
					delete(rl.buckets, ip)
				}
				b.mu.Unlock()
			}
			rl.mu.Unlock()
		}
	}()

	return rl
}

func (rl *RateLimiter) Middleware(message string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()

		rl.mu.Lock()
		b, exists := rl.buckets[ip]
		if !exists {
			b = &rateBucket{
				tokens:     rl.max,
				lastRefill: time.Now(),
			}
			rl.buckets[ip] = b
		}
		rl.mu.Unlock()

		b.mu.Lock()
		defer b.mu.Unlock()

		now := time.Now()
		elapsed := now.Sub(b.lastRefill)
		if elapsed >= rl.window {
			b.tokens = rl.max
			b.lastRefill = now
		}

		if b.tokens <= 0 {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": message})
			c.Abort()
			return
		}

		b.tokens--
		c.Next()
	}
}

func RequestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		reqID := uuid.New().String()
		c.Set("reqId", reqID)
		c.Header("X-Request-Id", reqID)
		c.Next()
	}
}

func SecurityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Next()
	}
}
