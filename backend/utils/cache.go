package utils

import (
	"bytes"
	"context"
	"crypto/tls"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"left2serve/backend/config"
)

var (
	redisClient *redis.Client
	memCache    = sync.Map{}
	ctx         = context.Background()
)

type memItem struct {
	val       string
	expiresAt time.Time
}

func InitRedis(cfg *config.Config) {
	if cfg.RedisURL == "" {
		log.Println("Redis URL not provided, using in-memory cache")
		return
	}

	opt, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		log.Printf("Failed to parse Redis URL (%v), falling back to in-memory cache\n", err)
		return
	}

	// Handle Upstash TLS or rediss scheme
	if strings.HasPrefix(cfg.RedisURL, "rediss://") || strings.Contains(cfg.RedisURL, "upstash.io") {
		if opt.TLSConfig == nil {
			opt.TLSConfig = &tls.Config{InsecureSkipVerify: true}
		}
	}

	client := redis.NewClient(opt)
	pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	if err := client.Ping(pingCtx).Err(); err != nil {
		log.Printf("Failed to connect to Redis (%v), falling back to in-memory cache\n", err)
		return
	}

	redisClient = client
	log.Println("Connected to Redis successfully")
}

func CacheGet(key string) (string, bool) {
	if redisClient != nil {
		val, err := redisClient.Get(ctx, key).Result()
		if err == nil {
			return val, true
		}
	}

	if item, ok := memCache.Load(key); ok {
		m := item.(memItem)
		if time.Now().Before(m.expiresAt) {
			return m.val, true
		}
		memCache.Delete(key)
	}

	return "", false
}

func CacheSet(key string, val string, ttl time.Duration) {
	if redisClient != nil {
		_ = redisClient.Set(ctx, key, val, ttl).Err()
		return
	}

	memCache.Store(key, memItem{
		val:       val,
		expiresAt: time.Now().Add(ttl),
	})
}

func CacheDel(key string) {
	if redisClient != nil {
		_ = redisClient.Del(ctx, key).Err()
	}
	memCache.Delete(key)
}

type bodyWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w bodyWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

func CacheMiddleware(durationSecs int) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method != http.MethodGet {
			c.Next()
			return
		}

		userRole := ""
		if role, exists := c.Get("userRole"); exists {
			userRole = "_" + role.(string)
		}

		key := "__gin__" + c.Request.RequestURI + userRole
		if cached, ok := CacheGet(key); ok {
			c.Header("X-Cache", "HIT")
			c.Header("Content-Type", "application/json; charset=utf-8")
			c.String(http.StatusOK, cached)
			c.Abort()
			return
		}

		c.Header("X-Cache", "MISS")

		wb := &bodyWriter{body: bytes.NewBufferString(""), ResponseWriter: c.Writer}
		c.Writer = wb

		c.Next()

		if c.Writer.Status() >= 200 && c.Writer.Status() < 300 {
			CacheSet(key, wb.body.String(), time.Duration(durationSecs)*time.Second)
		}
	}
}

func InvalidateCachePrefix(prefix string) {
	if redisClient != nil {
		keys, err := redisClient.Keys(ctx, prefix+"*").Result()
		if err == nil && len(keys) > 0 {
			_ = redisClient.Del(ctx, keys...).Err()
		}
	}
	memCache.Range(func(key, value any) bool {
		if strings.HasPrefix(key.(string), prefix) {
			memCache.Delete(key)
		}
		return true
	})
}
