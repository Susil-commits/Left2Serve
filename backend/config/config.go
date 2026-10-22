package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                string
	ClientURL           string
	DatabaseURL         string
	DBHost              string
	DBPort              int
	DBUser              string
	DBPassword          string
	DBName              string
	DBSSL               bool
	JWTSecret           string
	AdminCode           string
	AdminEmail          string
	CloudinaryCloudName string
	CloudinaryAPIKey    string
	CloudinaryAPISecret string
	GeminiAPIKey        string
	RazorpayKeyID       string
	RazorpayKeySecret   string
	SendGridAPIKey      string
	SMTPHost            string
	SMTPPort            int
	SMTPUser            string
	SMTPPass            string
	SMTPFrom            string
	RedisURL            string
	IsProduction        bool
}

var AppConfig *Config

func LoadConfig() (*Config, error) {
	// Try loading .env if it exists
	_ = godotenv.Load(".env")

	port := getEnv("PORT", "5000")
	clientURL := getEnv("CLIENT_URL", "http://localhost:5173")
	databaseURL := os.Getenv("DATABASE_URL")
	dbHost := os.Getenv("DB_HOST")
	dbPort, _ := strconv.Atoi(getEnv("DB_PORT", "5432"))
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")
	dbSSL := os.Getenv("DB_SSL") == "1" || os.Getenv("DB_SSL") == "true"

	jwtSecret := os.Getenv("JWT_SECRET")
	if len(jwtSecret) < 16 {
		if jwtSecret == "" {
			return nil, fmt.Errorf("FATAL: JWT_SECRET environment variable is missing")
		}
		return nil, fmt.Errorf("FATAL: JWT_SECRET must be at least 16 characters long")
	}

	smtpPort, _ := strconv.Atoi(getEnv("SMTP_PORT", "587"))

	cfg := &Config{
		Port:                port,
		ClientURL:           clientURL,
		DatabaseURL:         databaseURL,
		DBHost:              dbHost,
		DBPort:              dbPort,
		DBUser:              dbUser,
		DBPassword:          dbPassword,
		DBName:              dbName,
		DBSSL:               dbSSL,
		JWTSecret:           jwtSecret,
		AdminCode:           os.Getenv("ADMIN_CODE"),
		AdminEmail:          os.Getenv("ADMIN_EMAIL"),
		CloudinaryCloudName: os.Getenv("CLOUDINARY_CLOUD_NAME"),
		CloudinaryAPIKey:    os.Getenv("CLOUDINARY_API_KEY"),
		CloudinaryAPISecret: os.Getenv("CLOUDINARY_API_SECRET"),
		GeminiAPIKey:        os.Getenv("GEMINI_API_KEY"),
		RazorpayKeyID:       os.Getenv("RAZORPAY_KEY_ID"),
		RazorpayKeySecret:   os.Getenv("RAZORPAY_KEY_SECRET"),
		SendGridAPIKey:      os.Getenv("SENDGRID_API_KEY"),
		SMTPHost:            getEnv("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:            smtpPort,
		SMTPUser:            os.Getenv("SMTP_USER"),
		SMTPPass:            os.Getenv("SMTP_PASS"),
		SMTPFrom:            getEnv("SMTP_FROM", os.Getenv("SMTP_USER")),
		RedisURL:            os.Getenv("REDIS_URL"),
		IsProduction:        os.Getenv("NODE_ENV") == "production" || os.Getenv("GO_ENV") == "production",
	}

	if cfg.SMTPFrom == "" {
		cfg.SMTPFrom = "Left2Serve <no-reply@left2serve.com>"
	}

	AppConfig = cfg
	return cfg, nil
}

func getEnv(key, defaultVal string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return defaultVal
}
