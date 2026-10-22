package models

import "time"

type Message struct {
	ID            int       `json:"id"`
	ReservationID int       `json:"reservation_id"`
	SenderID      int       `json:"sender_id"`
	SenderName    *string   `json:"sender_name,omitempty"`
	Content       string    `json:"content"`
	CreatedAt     time.Time `json:"created_at"`
}
