package services

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/pquerna/otp/totp"
	"github.com/skip2/go-qrcode"
	"left2serve/backend/config"
	"left2serve/backend/database"
	"left2serve/backend/middleware"
	"left2serve/backend/models"
	"left2serve/backend/utils"
)

type AuthService struct {
	cfg *config.Config
}

var GlobalAuthService *AuthService

func InitAuthService(cfg *config.Config) {
	GlobalAuthService = &AuthService{cfg: cfg}
}

func (s *AuthService) Register(ctx context.Context, req *models.RegisterRequest) (map[string]any, error) {
	normalizedEmail := strings.ToLower(strings.TrimSpace(req.Email))

	var existingID int
	err := database.DB.QueryRowContext(ctx, "SELECT id FROM users WHERE LOWER(email) = $1", normalizedEmail).Scan(&existingID)
	if err == nil {
		return nil, utils.Conflict("Email already registered")
	}

	hash, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, utils.InternalError("Failed to hash password")
	}

	trimmedName := strings.TrimSpace(req.Name)
	var newID int
	err = database.DB.QueryRowContext(ctx, `
		INSERT INTO users (name, email, password_hash, role, phone, address, organization) 
		VALUES ($1, $2, $3, $4, $5, $6, $7) 
		RETURNING id`,
		trimmedName, normalizedEmail, hash, req.Role, req.Phone, req.Address, req.Organization,
	).Scan(&newID)
	if err != nil {
		return nil, utils.InternalError("Failed to create user account")
	}

	user := &models.User{
		ID:           newID,
		Name:         trimmedName,
		Email:        normalizedEmail,
		Role:         req.Role,
		TokenVersion: 0,
	}

	token, err := middleware.SignToken(user, s.cfg)
	if err != nil {
		return nil, utils.InternalError("Failed to sign token")
	}

	if GlobalEmailService != nil {
		GlobalEmailService.SendWelcomeEmail(normalizedEmail, trimmedName)
	}

	return map[string]any{
		"token": token,
		"user": map[string]any{
			"id":    newID,
			"name":  trimmedName,
			"email": normalizedEmail,
			"role":  req.Role,
		},
	}, nil
}

func (s *AuthService) Login(ctx context.Context, req *models.LoginRequest, ip string) (map[string]any, error) {
	normalizedEmail := strings.ToLower(strings.TrimSpace(req.Email))

	var user models.User
	var rawBadges []byte
	var lockedUntil sql.NullTime

	err := database.DB.QueryRowContext(ctx, `
		SELECT id, name, email, password_hash, role, phone, address, organization, is_active, 
		       token_version, failed_attempts, locked_until, two_factor_secret, two_factor_enabled, 
		       avatar_url, badges, meals_saved, created_at
		FROM users 
		WHERE LOWER(email) = $1`, normalizedEmail,
	).Scan(
		&user.ID, &user.Name, &user.Email, &user.PasswordHash, &user.Role, &user.Phone, &user.Address,
		&user.Organization, &user.IsActive, &user.TokenVersion, &user.FailedAttempts, &lockedUntil,
		&user.TwoFactorSecret, &user.TwoFactorEnabled, &user.AvatarURL, &rawBadges, &user.MealsSaved, &user.CreatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, utils.Unauthorized("Invalid credentials")
		}
		return nil, err
	}

	if lockedUntil.Valid && lockedUntil.Time.After(time.Now()) {
		mins := int(math.Ceil(time.Until(lockedUntil.Time).Minutes()))
		if mins < 1 {
			mins = 1
		}
		return nil, utils.Locked(fmt.Sprintf("Account temporarily locked. Try again in %d minute(s).", mins))
	}

	if !utils.CheckPasswordHash(req.Password, user.PasswordHash) {
		attempts := user.FailedAttempts + 1
		if attempts >= 5 {
			_, _ = database.DB.ExecContext(ctx, "UPDATE users SET failed_attempts = 0, locked_until = NOW() + INTERVAL '15 minutes' WHERE id = $1", user.ID)
		} else {
			_, _ = database.DB.ExecContext(ctx, "UPDATE users SET failed_attempts = $1 WHERE id = $2", attempts, user.ID)
		}

		utils.Audit(ctx, utils.AuditOptions{
			ActorRole:  "anonymous",
			Action:     "login_failed",
			TargetType: "user",
			TargetID:   &user.ID,
			Detail:     fmt.Sprintf("attempt %d", attempts),
			IP:         ip,
		})

		return nil, utils.Unauthorized("Invalid credentials")
	}

	if !user.IsActive {
		utils.Audit(ctx, utils.AuditOptions{
			ActorID:   &user.ID,
			ActorRole: user.Role,
			Action:    "login_blocked_suspended",
			IP:        ip,
		})
		return nil, utils.Forbidden("Your account has been suspended. Contact an administrator.")
	}

	if user.TwoFactorEnabled {
		if req.OTP == "" {
			return map[string]any{
				"requires2fa": true,
				"message":     "Two-factor authentication code required",
			}, nil
		}

		if user.TwoFactorSecret == nil || !totp.Validate(req.OTP, *user.TwoFactorSecret) {
			return nil, utils.Unauthorized("Invalid two-factor authentication code")
		}
	}

	_, _ = database.DB.ExecContext(ctx, "UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = $1", user.ID)

	token, err := middleware.SignToken(&user, s.cfg)
	if err != nil {
		return nil, utils.InternalError("Failed to sign token")
	}

	if len(rawBadges) > 0 {
		user.Badges = json.RawMessage(rawBadges)
	} else {
		user.Badges = json.RawMessage("[]")
	}

	safeUser := models.SafeUser{
		ID:               user.ID,
		Name:             user.Name,
		Email:            user.Email,
		Role:             user.Role,
		Phone:            user.Phone,
		Address:          user.Address,
		Organization:     user.Organization,
		AvatarURL:        user.AvatarURL,
		TwoFactorEnabled: user.TwoFactorEnabled,
		MealsSaved:       user.MealsSaved,
		Badges:           user.Badges,
		CreatedAt:        user.CreatedAt,
	}

	utils.Audit(ctx, utils.AuditOptions{
		ActorID:   &user.ID,
		ActorRole: user.Role,
		Action:    "login_success",
		IP:        ip,
	})

	return map[string]any{
		"token": token,
		"user":  safeUser,
	}, nil
}

func (s *AuthService) GetMe(ctx context.Context, userID int) (*models.SafeUser, error) {
	var user models.SafeUser
	var rawBadges []byte

	err := database.DB.QueryRowContext(ctx, `
		SELECT id, name, email, role, phone, address, organization, avatar_url, 
		       two_factor_enabled, badges, meals_saved, created_at
		FROM users 
		WHERE id = $1`, userID,
	).Scan(
		&user.ID, &user.Name, &user.Email, &user.Role, &user.Phone, &user.Address,
		&user.Organization, &user.AvatarURL, &user.TwoFactorEnabled, &rawBadges, &user.MealsSaved, &user.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, utils.NotFound("User not found")
		}
		return nil, err
	}

	if len(rawBadges) > 0 {
		user.Badges = json.RawMessage(rawBadges)
	} else {
		user.Badges = json.RawMessage("[]")
	}

	return &user, nil
}

func (s *AuthService) GetImpact(ctx context.Context, userID int, role string) (map[string]any, error) {
	if role == "donor" {
		var meals int
		_ = database.DB.QueryRowContext(ctx, `
			SELECT COALESCE(SUM(r.quantity), 0) 
			FROM reservations r 
			JOIN food_listings fl ON r.food_listing_id = fl.id 
			WHERE fl.user_id = $1 AND r.status = 'collected'`, userID,
		).Scan(&meals)

		var totalListings, activeListings, reservationsReceived int
		_ = database.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM food_listings WHERE user_id = $1", userID).Scan(&totalListings)
		_ = database.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM food_listings WHERE user_id = $1 AND status = 'available'", userID).Scan(&activeListings)
		_ = database.DB.QueryRowContext(ctx, `
			SELECT COUNT(*) 
			FROM reservations r 
			JOIN food_listings fl ON r.food_listing_id = fl.id 
			WHERE fl.user_id = $1`, userID,
		).Scan(&reservationsReceived)

		return map[string]any{
			"role":                 "donor",
			"mealsDonated":         meals,
			"listingsCreated":      totalListings,
			"activeListings":       activeListings,
			"reservationsReceived": reservationsReceived,
			"co2Kg":                int(math.Round(float64(meals) * 2.5)),
		}, nil
	} else if role == "ngo" || role == "volunteer" {
		var meals, reservationsMade int
		_ = database.DB.QueryRowContext(ctx, `
			SELECT COALESCE(SUM(quantity), 0) 
			FROM reservations 
			WHERE user_id = $1 AND status = 'collected'`, userID,
		).Scan(&meals)

		_ = database.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM reservations WHERE user_id = $1", userID).Scan(&reservationsMade)

		return map[string]any{
			"role":             role,
			"mealsReceived":    meals,
			"reservationsMade": reservationsMade,
			"co2Kg":            int(math.Round(float64(meals) * 2.5)),
		}, nil
	}

	return map[string]any{"role": "admin"}, nil
}

func (s *AuthService) UpdateProfile(ctx context.Context, userID int, req *models.UpdateProfileRequest) (*models.SafeUser, error) {
	fields := make([]string, 0)
	args := make([]any, 0)
	argIdx := 1

	if req.Name != nil {
		trimmed := strings.TrimSpace(*req.Name)
		fields = append(fields, fmt.Sprintf("name = $%d", argIdx))
		args = append(args, trimmed)
		argIdx++
	}
	if req.Phone != nil {
		fields = append(fields, fmt.Sprintf("phone = $%d", argIdx))
		args = append(args, req.Phone)
		argIdx++
	}
	if req.Address != nil {
		fields = append(fields, fmt.Sprintf("address = $%d", argIdx))
		args = append(args, req.Address)
		argIdx++
	}
	if req.Organization != nil {
		fields = append(fields, fmt.Sprintf("organization = $%d", argIdx))
		args = append(args, req.Organization)
		argIdx++
	}
	if req.AvatarURL != nil {
		fields = append(fields, fmt.Sprintf("avatar_url = $%d", argIdx))
		args = append(args, req.AvatarURL)
		argIdx++
	}

	if len(fields) > 0 {
		args = append(args, userID)
		q := fmt.Sprintf("UPDATE users SET %s WHERE id = $%d", strings.Join(fields, ", "), argIdx)
		_, err := database.DB.ExecContext(ctx, q, args...)
		if err != nil {
			return nil, err
		}
	}

	return s.GetMe(ctx, userID)
}

func (s *AuthService) UpdatePassword(ctx context.Context, userID int, role string, req *models.ChangePasswordRequest, ip string) (map[string]any, error) {
	var currentHash string
	var tokenVersion int

	err := database.DB.QueryRowContext(ctx, "SELECT password_hash, token_version FROM users WHERE id = $1", userID).Scan(&currentHash, &tokenVersion)
	if err != nil {
		return nil, err
	}

	if !utils.CheckPasswordHash(req.Current, currentHash) {
		return nil, utils.Unauthorized("Current password is incorrect")
	}

	newHash, err := utils.HashPassword(req.NewPass)
	if err != nil {
		return nil, utils.InternalError("Failed to hash password")
	}

	nextTokenVersion := tokenVersion + 1
	_, err = database.DB.ExecContext(ctx, "UPDATE users SET password_hash = $1, token_version = $2 WHERE id = $3", newHash, nextTokenVersion, userID)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		ID:           userID,
		Role:         role,
		TokenVersion: nextTokenVersion,
	}
	token, _ := middleware.SignToken(user, s.cfg)

	utils.Audit(ctx, utils.AuditOptions{
		ActorID:   &userID,
		ActorRole: role,
		Action:    "password_change",
		IP:        ip,
	})

	return map[string]any{
		"message": "Password updated",
		"token":   token,
	}, nil
}

func (s *AuthService) ForgotPassword(ctx context.Context, req *models.ForgotPasswordRequest) (map[string]any, error) {
	normalizedEmail := strings.ToLower(strings.TrimSpace(req.Email))

	var userID int
	var name string
	err := database.DB.QueryRowContext(ctx, "SELECT id, name FROM users WHERE LOWER(email) = $1", normalizedEmail).Scan(&userID, &name)
	if err != nil {
		return map[string]any{"message": "If that email exists, a reset link has been sent."}, nil
	}

	bytes := make([]byte, 32)
	_, _ = rand.Read(bytes)
	token := hex.EncodeToString(bytes)

	_, err = database.DB.ExecContext(ctx, "UPDATE users SET reset_token = $1, reset_expires = NOW() + INTERVAL '1 hour' WHERE id = $2", token, userID)
	if err != nil {
		return nil, err
	}

	resetLink := fmt.Sprintf("%s/reset-password?token=%s", s.cfg.ClientURL, token)
	if GlobalEmailService != nil {
		GlobalEmailService.SendPasswordResetEmail(normalizedEmail, name, resetLink)
	}

	return map[string]any{"message": "If that email exists, a reset link has been sent."}, nil
}

func (s *AuthService) ResetPassword(ctx context.Context, req *models.ResetPasswordRequest) (map[string]any, error) {
	var userID int
	err := database.DB.QueryRowContext(ctx, "SELECT id FROM users WHERE reset_token = $1 AND reset_expires > NOW()", req.Token).Scan(&userID)
	if err != nil {
		return nil, utils.BadRequest("Invalid or expired reset token")
	}

	hash, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		return nil, utils.InternalError("Failed to hash password")
	}

	_, err = database.DB.ExecContext(ctx, `
		UPDATE users 
		SET password_hash = $1, reset_token = NULL, reset_expires = NULL, 
		    token_version = token_version + 1, failed_attempts = 0, locked_until = NULL 
		WHERE id = $2`,
		hash, userID,
	)
	if err != nil {
		return nil, err
	}

	return map[string]any{"message": "Password has been reset successfully. You can now log in."}, nil
}

func (s *AuthService) Setup2FA(ctx context.Context, userID int) (map[string]any, error) {
	var email string
	var enabled bool

	err := database.DB.QueryRowContext(ctx, "SELECT email, two_factor_enabled FROM users WHERE id = $1", userID).Scan(&email, &enabled)
	if err != nil {
		return nil, utils.NotFound("User not found")
	}
	if enabled {
		return nil, utils.BadRequest("Two-factor authentication is already enabled")
	}

	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "Left2Serve",
		AccountName: email,
	})
	if err != nil {
		return nil, utils.InternalError("Failed to generate 2FA secret")
	}

	secret := key.Secret()
	_, err = database.DB.ExecContext(ctx, "UPDATE users SET two_factor_secret = $1 WHERE id = $2", secret, userID)
	if err != nil {
		return nil, err
	}

	png, err := qrcode.Encode(key.URL(), qrcode.Medium, 256)
	if err != nil {
		return nil, utils.InternalError("Failed to generate QR code")
	}

	qrCodeURL := "data:image/png;base64," + base64.StdEncoding.EncodeToString(png)

	return map[string]any{
		"secret":    secret,
		"qrCodeUrl": qrCodeURL,
	}, nil
}

func (s *AuthService) Verify2FA(ctx context.Context, userID int, token string) (map[string]any, error) {
	var secret sql.NullString
	var enabled bool

	err := database.DB.QueryRowContext(ctx, "SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = $1", userID).Scan(&secret, &enabled)
	if err != nil {
		return nil, utils.NotFound("User not found")
	}
	if enabled {
		return nil, utils.BadRequest("Two-factor authentication is already enabled")
	}
	if !secret.Valid || secret.String == "" {
		return nil, utils.BadRequest("2FA setup not initiated")
	}

	if !totp.Validate(token, secret.String) {
		return nil, utils.BadRequest("Invalid token")
	}

	_, err = database.DB.ExecContext(ctx, "UPDATE users SET two_factor_enabled = TRUE WHERE id = $1", userID)
	if err != nil {
		return nil, err
	}

	return map[string]any{"message": "Two-factor authentication enabled successfully"}, nil
}

func (s *AuthService) Disable2FA(ctx context.Context, userID int, token string) (map[string]any, error) {
	var secret sql.NullString
	var enabled bool

	err := database.DB.QueryRowContext(ctx, "SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = $1", userID).Scan(&secret, &enabled)
	if err != nil {
		return nil, utils.NotFound("User not found")
	}
	if !enabled {
		return nil, utils.BadRequest("Two-factor authentication is not enabled")
	}
	if !secret.Valid || !totp.Validate(token, secret.String) {
		return nil, utils.BadRequest("Invalid token")
	}

	_, err = database.DB.ExecContext(ctx, "UPDATE users SET two_factor_enabled = FALSE, two_factor_secret = NULL WHERE id = $1", userID)
	if err != nil {
		return nil, err
	}

	return map[string]any{"message": "Two-factor authentication disabled"}, nil
}
