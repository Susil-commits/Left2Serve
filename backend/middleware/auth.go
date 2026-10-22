package middleware

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"left2serve/backend/config"
	"left2serve/backend/database"
	"left2serve/backend/models"
)

type JWTClaims struct {
	ID   int    `json:"id"`
	Role string `json:"role"`
	TV   int    `json:"tv"`
	jwt.RegisteredClaims
}

func SignToken(user *models.User, cfg *config.Config) (string, error) {
	claims := JWTClaims{
		ID:   user.ID,
		Role: user.Role,
		TV:   user.TokenVersion,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWTSecret))
}

func SignAdminToken(cfg *config.Config) (string, error) {
	claims := JWTClaims{
		ID:   0,
		Role: "admin",
		TV:   0,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(8 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWTSecret))
}

func VerifyToken(tokenString string, cfg *config.Config) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(cfg.JWTSecret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	if claims.Role == "admin" {
		if claims.ID != 0 {
			return nil, errors.New("bad admin token")
		}
		return claims, nil
	}

	// Validate against database
	if database.DB != nil {
		var tokenVersion int
		var isActive bool
		err = database.DB.QueryRow("SELECT token_version, is_active FROM users WHERE id = $1", claims.ID).Scan(&tokenVersion, &isActive)
		if err != nil {
			if err == sql.ErrNoRows {
				return nil, errors.New("user not found")
			}
			return nil, err
		}

		if !isActive {
			return nil, errors.New("account suspended")
		}

		if claims.TV != tokenVersion {
			return nil, errors.New("token revoked")
		}
	}

	return claims, nil
}

func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "No token provided"})
			c.Abort()
			return
		}

		tokenStr := strings.TrimPrefix(header, "Bearer ")
		claims, err := VerifyToken(tokenStr, cfg)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		c.Set("userID", claims.ID)
		c.Set("userRole", claims.Role)
		c.Set("tokenVersion", claims.TV)
		c.Next()
	}
}

func OptionalAuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header != "" && strings.HasPrefix(header, "Bearer ") {
			tokenStr := strings.TrimPrefix(header, "Bearer ")
			claims, err := VerifyToken(tokenStr, cfg)
			if err == nil {
				c.Set("userID", claims.ID)
				c.Set("userRole", claims.Role)
				c.Set("tokenVersion", claims.TV)
			}
		}
		c.Next()
	}
}

func RequireRole(roles ...string) gin.HandlerFunc {
	roleMap := make(map[string]bool)
	for _, r := range roles {
		roleMap[r] = true
	}

	return func(c *gin.Context) {
		roleVal, exists := c.Get("userRole")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
			c.Abort()
			return
		}

		userRole := roleVal.(string)
		if !roleMap[userRole] {
			c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
			c.Abort()
			return
		}

		c.Next()
	}
}
