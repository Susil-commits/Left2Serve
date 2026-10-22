package models

import (
	"encoding/json"
	"time"
)

type Notification struct {
	ID        int             `json:"id"`
	UserID    int             `json:"user_id"`
	Type      string          `json:"type"`
	Title     string          `json:"title"`
	Message   string          `json:"message"`
	Data      json.RawMessage `json:"data"`
	IsRead    bool            `json:"is_read"`
	CreatedAt time.Time       `json:"created_at"`
}
