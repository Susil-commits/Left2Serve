package services

import (
	"context"
	"encoding/json"
	"time"

	"left2serve/backend/database"
	"left2serve/backend/models"
	"left2serve/backend/sockets"
	"left2serve/backend/utils"
)

type NotificationService struct{}

var GlobalNotificationService = &NotificationService{}

func (s *NotificationService) CreateNotification(ctx context.Context, userID int, notifType, title, message string, data any) error {
	if userID <= 0 {
		return nil
	}

	dataBytes, err := json.Marshal(data)
	if err != nil {
		dataBytes = []byte("{}")
	}

	var notifID int
	err = database.DB.QueryRowContext(ctx, `
		INSERT INTO notifications (user_id, type, title, message, data) 
		VALUES ($1, $2, $3, $4, $5) 
		RETURNING id`,
		userID, notifType, title, message, dataBytes,
	).Scan(&notifID)
	if err != nil {
		return err
	}

	if sockets.GlobalSocketServer != nil {
		sockets.GlobalSocketServer.EmitToUser(userID, "new_notification", map[string]any{
			"id":         notifID,
			"user_id":    userID,
			"type":       notifType,
			"title":      title,
			"message":    message,
			"data":       json.RawMessage(dataBytes),
			"is_read":    false,
			"created_at": time.Now().UTC().Format(time.RFC3339),
		})
	}

	return nil
}

func (s *NotificationService) GetNotifications(ctx context.Context, userID int) ([]models.Notification, error) {
	rows, err := database.DB.QueryContext(ctx, `
		SELECT id, user_id, type, title, message, data, is_read, created_at 
		FROM notifications 
		WHERE user_id = $1 
		ORDER BY created_at DESC 
		LIMIT 30`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	notifications := make([]models.Notification, 0)
	for rows.Next() {
		var n models.Notification
		var rawData []byte
		if err := rows.Scan(&n.ID, &n.UserID, &n.Type, &n.Title, &n.Message, &rawData, &n.IsRead, &n.CreatedAt); err != nil {
			return nil, err
		}
		if len(rawData) > 0 {
			n.Data = json.RawMessage(rawData)
		} else {
			n.Data = json.RawMessage("{}")
		}
		notifications = append(notifications, n)
	}

	return notifications, nil
}

func (s *NotificationService) GetUnreadCount(ctx context.Context, userID int) (int, error) {
	var count int
	err := database.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE", userID).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

func (s *NotificationService) MarkAllAsRead(ctx context.Context, userID int) error {
	_, err := database.DB.ExecContext(ctx, "UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE", userID)
	return err
}

func (s *NotificationService) MarkAsRead(ctx context.Context, id, userID int) error {
	res, err := database.DB.ExecContext(ctx, "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2", id, userID)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return utils.NotFound("Notification not found")
	}
	return nil
}

func (s *NotificationService) DeleteNotification(ctx context.Context, id, userID int) error {
	res, err := database.DB.ExecContext(ctx, "DELETE FROM notifications WHERE id = $1 AND user_id = $2", id, userID)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return utils.NotFound("Notification not found")
	}
	return nil
}
