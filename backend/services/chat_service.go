package services

import (
	"context"
	"database/sql"
	"strconv"

	"left2serve/backend/database"
	"left2serve/backend/models"
	"left2serve/backend/utils"
)

type ChatService struct{}

var GlobalChatService = &ChatService{}

func (s *ChatService) GetMessages(ctx context.Context, reservationIDStr string, userID int, userRole string) ([]models.Message, error) {
	resID, err := strconv.Atoi(reservationIDStr)
	if err != nil {
		return nil, utils.BadRequest("Invalid reservation ID")
	}

	var resUserID, foodListingID int
	err = database.DB.QueryRowContext(ctx, "SELECT user_id, food_listing_id FROM reservations WHERE id = $1", resID).Scan(&resUserID, &foodListingID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, utils.NotFound("Reservation not found")
		}
		return nil, err
	}

	var donorID int
	_ = database.DB.QueryRowContext(ctx, "SELECT user_id FROM food_listings WHERE id = $1", foodListingID).Scan(&donorID)

	isReserver := userID == resUserID
	isDonor := userID == donorID
	isAdmin := userRole == "admin"

	if !isReserver && !isDonor && !isAdmin {
		return nil, utils.Forbidden("Not authorized to view this chat")
	}

	rows, err := database.DB.QueryContext(ctx, `
		SELECT m.id, m.reservation_id, m.sender_id, m.content, m.created_at, u.name as sender_name 
		FROM messages m 
		JOIN users u ON m.sender_id = u.id 
		WHERE m.reservation_id = $1 
		ORDER BY m.created_at ASC`, resID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	messages := make([]models.Message, 0)
	for rows.Next() {
		var m models.Message
		var senderName sql.NullString
		if err := rows.Scan(&m.ID, &m.ReservationID, &m.SenderID, &m.Content, &m.CreatedAt, &senderName); err != nil {
			return nil, err
		}
		if senderName.Valid {
			m.SenderName = &senderName.String
		}
		messages = append(messages, m)
	}

	return messages, nil
}
