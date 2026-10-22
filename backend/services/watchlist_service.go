package services

import (
	"context"
	"database/sql"
	"strings"

	"left2serve/backend/database"
	"left2serve/backend/models"
	"left2serve/backend/utils"
)

type WatchlistService struct{}

var GlobalWatchlistService = &WatchlistService{}

func (s *WatchlistService) GetUserWatchlists(ctx context.Context, userID int) ([]models.Watchlist, error) {
	rows, err := database.DB.QueryContext(ctx, "SELECT id, user_id, keyword, latitude, longitude, radius_km, created_at FROM watchlists WHERE user_id = $1 ORDER BY created_at DESC", userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	lists := make([]models.Watchlist, 0)
	for rows.Next() {
		var w models.Watchlist
		var kw sql.NullString
		if err := rows.Scan(&w.ID, &w.UserID, &kw, &w.Latitude, &w.Longitude, &w.RadiusKM, &w.CreatedAt); err != nil {
			return nil, err
		}
		if kw.Valid {
			w.Keyword = &kw.String
		}
		lists = append(lists, w)
	}

	return lists, nil
}

func (s *WatchlistService) CreateWatchlist(ctx context.Context, userID int, req *models.CreateWatchlistRequest) (*models.Watchlist, error) {
	var keyword *string
	if req.Keyword != nil {
		k := strings.TrimSpace(*req.Keyword)
		if k != "" {
			keyword = &k
		}
	}

	radius := req.RadiusKM
	if radius <= 0 {
		radius = 10
	}

	var newID int
	err := database.DB.QueryRowContext(ctx, `
		INSERT INTO watchlists (user_id, keyword, latitude, longitude, radius_km) 
		VALUES ($1, $2, $3, $4, $5) 
		RETURNING id`,
		userID, keyword, req.Latitude, req.Longitude, radius,
	).Scan(&newID)
	if err != nil {
		return nil, err
	}

	var w models.Watchlist
	var kw sql.NullString
	err = database.DB.QueryRowContext(ctx, "SELECT id, user_id, keyword, latitude, longitude, radius_km, created_at FROM watchlists WHERE id = $1", newID).Scan(
		&w.ID, &w.UserID, &kw, &w.Latitude, &w.Longitude, &w.RadiusKM, &w.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	if kw.Valid {
		w.Keyword = &kw.String
	}

	return &w, nil
}

func (s *WatchlistService) DeleteWatchlist(ctx context.Context, id, userID int) error {
	var ownerID int
	err := database.DB.QueryRowContext(ctx, "SELECT user_id FROM watchlists WHERE id = $1", id).Scan(&ownerID)
	if err != nil {
		if err == sql.ErrNoRows {
			return utils.NotFound("Watchlist not found")
		}
		return err
	}

	if ownerID != userID {
		return utils.Forbidden("Not authorized")
	}

	_, err = database.DB.ExecContext(ctx, "DELETE FROM watchlists WHERE id = $1", id)
	return err
}
