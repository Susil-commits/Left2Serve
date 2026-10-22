package services

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"testing"

	"left2serve/backend/config"
)

func TestPaymentSignatureVerification(t *testing.T) {
	secret := "test_secret_key_12345"
	cfg := &config.Config{
		RazorpayKeyID:     "rzp_test_123",
		RazorpayKeySecret: secret,
	}
	svc := &PaymentService{cfg: cfg}

	if !svc.IsConfigured() {
		t.Fatal("Expected PaymentService to be configured")
	}

	orderID := "order_EKwxwAgItmmMnv"
	paymentID := "pay_29QQoUBi66xm2f"

	// Compute legitimate HMAC-SHA256 signature
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(orderID + "|" + paymentID))
	validSig := hex.EncodeToString(h.Sum(nil))

	// Test 1: Valid signature should pass
	if !svc.VerifySignature(orderID, paymentID, validSig) {
		t.Errorf("Expected valid signature to verify successfully")
	}

	// Test 2: Forged / tampered signature should fail
	fakeSig := "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
	if svc.VerifySignature(orderID, paymentID, fakeSig) {
		t.Errorf("Expected forged signature to fail verification")
	}

	// Test 3: Tampered paymentID should fail
	if svc.VerifySignature(orderID, "pay_TAMPERED", validSig) {
		t.Errorf("Expected signature with altered payment ID to fail")
	}
}
