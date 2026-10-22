package utils

import (
	"strings"
	"unicode"

	"golang.org/x/crypto/bcrypt"
)

const MinPasswordLength = 8

var passwordBlocklist = map[string]bool{
	"password":      true,
	"passw0rd":      true,
	"password1":     true,
	"12345678":      true,
	"123456789":     true,
	"qwerty123":     true,
	"left2serve":    true,
	"left2serve123": true,
	"welcome123":    true,
	"letmein":       true,
	"iloveyou":      true,
	"admin123":      true,
}

func ValidatePassword(password string) (bool, string) {
	if len(password) < MinPasswordLength {
		return false, "Password must be at least 8 characters"
	}
	if len(password) > 128 {
		return false, "Password is too long"
	}

	var hasLower, hasUpper, hasDigit, hasSpecial bool
	for _, ch := range password {
		switch {
		case unicode.IsLower(ch):
			hasLower = true
		case unicode.IsUpper(ch):
			hasUpper = true
		case unicode.IsDigit(ch):
			hasDigit = true
		case unicode.IsPunct(ch) || unicode.IsSymbol(ch):
			hasSpecial = true
		}
	}

	classes := 0
	if hasLower {
		classes++
	}
	if hasUpper {
		classes++
	}
	if hasDigit {
		classes++
	}
	if hasSpecial {
		classes++
	}

	if classes < 3 {
		return false, "Use at least 3 of: uppercase, lowercase, numbers, symbols"
	}

	if passwordBlocklist[strings.ToLower(password)] {
		return false, "This password is too common"
	}

	return true, ""
}

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	return string(bytes), err
}

func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
