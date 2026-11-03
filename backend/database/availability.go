package database

import (
	"context"
	"database/sql"
)

type Availability struct {
	Remaining int
	Active    int
	Collected int
	Quantity  int
}

const RemainingSQL = `(fl.quantity
  - COALESCE((SELECT SUM(quantity) FROM reservations WHERE food_listing_id = fl.id AND status IN ('pending','approved','collected')), 0))`

// GetAvailability retrieves remaining portions for a listing using the global DB connection.
func GetAvailability(ctx context.Context, listingID int) (Availability, error) {
	return GetAvailabilityTx(ctx, nil, listingID)
}

// GetAvailabilityTx retrieves remaining portions for a listing within an active transaction if provided.
func GetAvailabilityTx(ctx context.Context, tx *sql.Tx, listingID int) (Availability, error) {
	var row *sql.Row
	if tx != nil {
		row = tx.QueryRowContext(ctx, "SELECT quantity FROM food_listings WHERE id = $1", listingID)
	} else {
		row = DB.QueryRowContext(ctx, "SELECT quantity FROM food_listings WHERE id = $1", listingID)
	}

	var quantity int
	err := row.Scan(&quantity)
	if err != nil {
		if err == sql.ErrNoRows {
			return Availability{}, nil
		}
		return Availability{}, err
	}

	var active, collected int
	query := `
		SELECT
			COALESCE(SUM(CASE WHEN status IN ('pending','approved') THEN quantity ELSE 0 END), 0) AS active,
			COALESCE(SUM(CASE WHEN status = 'collected' THEN quantity ELSE 0 END), 0) AS collected
		FROM reservations WHERE food_listing_id = $1`

	if tx != nil {
		err = tx.QueryRowContext(ctx, query, listingID).Scan(&active, &collected)
	} else {
		err = DB.QueryRowContext(ctx, query, listingID).Scan(&active, &collected)
	}
	if err != nil {
		return Availability{}, err
	}

	remaining := quantity - active - collected
	if remaining < 0 {
		remaining = 0
	}

	return Availability{
		Remaining: remaining,
		Active:    active,
		Collected: collected,
		Quantity:  quantity,
	}, nil
}

// RecomputeListingStatus evaluates availability and updates status using the global DB connection.
func RecomputeListingStatus(ctx context.Context, listingID int) error {
	return RecomputeListingStatusTx(ctx, nil, listingID)
}

// RecomputeListingStatusTx evaluates availability and updates status within an active transaction if provided.
func RecomputeListingStatusTx(ctx context.Context, tx *sql.Tx, listingID int) error {
	var currentStatus string
	var err error
	if tx != nil {
		err = tx.QueryRowContext(ctx, "SELECT status FROM food_listings WHERE id = $1", listingID).Scan(&currentStatus)
	} else {
		err = DB.QueryRowContext(ctx, "SELECT status FROM food_listings WHERE id = $1", listingID).Scan(&currentStatus)
	}
	if err != nil {
		return err
	}

	if currentStatus == "expired" || currentStatus == "cancelled" || currentStatus == "collected" {
		return nil
	}

	avail, err := GetAvailabilityTx(ctx, tx, listingID)
	if err != nil {
		return err
	}

	var nextStatus string
	if avail.Remaining > 0 {
		nextStatus = "available"
	} else if avail.Active > 0 {
		nextStatus = "reserved"
	} else {
		nextStatus = "collected"
	}

	if nextStatus != currentStatus {
		updateQuery := `
			UPDATE food_listings 
			SET status = $1 
			WHERE id = $2 AND status NOT IN ('expired','cancelled','collected')`

		if tx != nil {
			_, err = tx.ExecContext(ctx, updateQuery, nextStatus, listingID)
		} else {
			_, err = DB.ExecContext(ctx, updateQuery, nextStatus, listingID)
		}
		return err
	}
	return nil
}
