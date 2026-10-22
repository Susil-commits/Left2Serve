package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/smtp"
	"strings"
	"time"

	"left2serve/backend/config"
)

type EmailService struct {
	cfg *config.Config
}

var GlobalEmailService *EmailService

func InitEmailService(cfg *config.Config) {
	GlobalEmailService = &EmailService{cfg: cfg}
}

func (s *EmailService) SendEmail(to, subject, htmlBody, textBody string) {
	go func() {
		// Retry with backoff up to 3 times
		maxAttempts := 3
		delay := 1 * time.Second

		for attempt := 1; attempt <= maxAttempts; attempt++ {
			err := s.executeSend(to, subject, htmlBody, textBody)
			if err == nil {
				return
			}
			log.Printf("Email send attempt %d failed: %v\n", attempt, err)
			time.Sleep(delay)
			delay *= 2
		}
		log.Printf("Email to %s failed after %d attempts\n", to, maxAttempts)
	}()
}

func (s *EmailService) executeSend(to, subject, htmlBody, textBody string) error {
	// 1. SendGrid if configured
	if s.cfg.SendGridAPIKey != "" {
		return s.sendWithSendGrid(to, subject, htmlBody, textBody)
	}

	// 2. SMTP (Brevo, Gmail, etc.)
	if s.cfg.SMTPHost != "" && s.cfg.SMTPUser != "" {
		return s.sendWithSMTP(to, subject, htmlBody)
	}

	log.Printf("No email provider configured. Simulating email to: %s with subject: %s\n", to, subject)
	return nil
}

func (s *EmailService) sendWithSMTP(to, subject, htmlBody string) error {
	addr := fmt.Sprintf("%s:%d", s.cfg.SMTPHost, s.cfg.SMTPPort)
	auth := smtp.PlainAuth("", s.cfg.SMTPUser, s.cfg.SMTPPass, s.cfg.SMTPHost)

	fromHeader := s.cfg.SMTPFrom
	if !strings.Contains(fromHeader, "<") {
		fromHeader = fmt.Sprintf("Left2Serve <%s>", s.cfg.SMTPFrom)
	}

	headers := make(map[string]string)
	headers["From"] = fromHeader
	headers["To"] = to
	headers["Subject"] = subject
	headers["MIME-Version"] = "1.0"
	headers["Content-Type"] = "text/html; charset=UTF-8"

	var msg strings.Builder
	for k, v := range headers {
		msg.WriteString(fmt.Sprintf("%s: %s\r\n", k, v))
	}
	msg.WriteString("\r\n" + htmlBody)

	return smtp.SendMail(addr, auth, s.cfg.SMTPUser, []string{to}, []byte(msg.String()))
}

func (s *EmailService) sendWithSendGrid(to, subject, htmlBody, textBody string) error {
	url := "https://api.sendgrid.com/v3/mail/send"

	payload := map[string]any{
		"personalizations": []map[string]any{
			{"to": []map[string]string{{"email": to}}},
		},
		"from": map[string]string{
			"email": s.cfg.SMTPFrom,
			"name":  "Left2Serve",
		},
		"subject": subject,
		"content": []map[string]string{
			{"type": "text/html", "value": htmlBody},
		},
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(data))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", "Bearer "+s.cfg.SendGridAPIKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("sendgrid returned status %d", resp.StatusCode)
	}
	return nil
}

func (s *EmailService) SendWelcomeEmail(to, name string) {
	subject := "Welcome to Left2Serve! 🍲"
	html := fmt.Sprintf(`
		<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
			<h2 style="color: #16a34a;">Welcome to Left2Serve, %s!</h2>
			<p>Thank you for joining our mission to rescue surplus food and serve our communities.</p>
			<p>You can now browse listings, share surplus food, and track your positive impact.</p>
			<hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
			<p style="color: #64748b; font-size: 12px;">Left2Serve — No Good Food Left Behind.</p>
		</div>`, name)
	s.SendEmail(to, subject, html, "")
}

func (s *EmailService) SendPasswordResetEmail(to, name, resetLink string) {
	subject := "Reset your Left2Serve Password 🔒"
	html := fmt.Sprintf(`
		<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
			<h2>Password Reset Request</h2>
			<p>Hello %s,</p>
			<p>We received a request to reset your password. Click the link below to set a new password:</p>
			<p><a href="%s" style="display: inline-block; padding: 10px 20px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
			<p style="color: #64748b; font-size: 12px;">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
		</div>`, name, resetLink)
	s.SendEmail(to, subject, html, "")
}

func (s *EmailService) SendReservationApprovedEmail(to, name, foodTitle, pickupAddress string) {
	subject := fmt.Sprintf("Reservation Approved: %s ✅", foodTitle)
	html := fmt.Sprintf(`
		<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
			<h2 style="color: #16a34a;">Reservation Approved!</h2>
			<p>Hello %s,</p>
			<p>Your reservation for <strong>"%s"</strong> has been approved by the donor.</p>
			<p><strong>Pickup Address:</strong> %s</p>
			<p>Please present your pickup QR code when collecting your order.</p>
		</div>`, name, foodTitle, pickupAddress)
	s.SendEmail(to, subject, html, "")
}

func (s *EmailService) SendOrderUpdateEmail(to, name, foodTitle, status string) {
	subject := fmt.Sprintf("Order Update: %s (%s)", foodTitle, status)
	html := fmt.Sprintf(`
		<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
			<h2>Order Update</h2>
			<p>Hello %s,</p>
			<p>Your order for <strong>"%s"</strong> has been updated to: <span style="text-transform: capitalize; font-weight: bold;">%s</span>.</p>
		</div>`, name, foodTitle, status)
	s.SendEmail(to, subject, html, "")
}

func (s *EmailService) SendOrderCancelledEmail(to, name, foodTitle string) {
	subject := fmt.Sprintf("Order Cancelled: %s ❌", foodTitle)
	html := fmt.Sprintf(`
		<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
			<h2 style="color: #dc2626;">Order Cancelled</h2>
			<p>Hello %s,</p>
			<p>The reservation for <strong>"%s"</strong> has been cancelled.</p>
		</div>`, name, foodTitle)
	s.SendEmail(to, subject, html, "")
}
