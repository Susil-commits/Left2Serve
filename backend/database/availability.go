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
  - COALESCE((SELECT SUM(quantity) FROM reservations WHERE food_listing_id = fl.id AND status IN ('pending','approved')), 0)
  - COALESCE((SELECT SUM(quantity) FROM reservations WHERE food_listing_id = fl.id AND status = 'collected'), 0))`

func GetAvailability(ctx context.Context, listingID int) (Availability, error) {
	var quantity int
	err := DB.QueryRowContext(ctx, "SELECT quantity FROM food_listings WHERE id = $1", listingID).Scan(&quantity)
	if err != nil {
		if err == sql.ErrNoRows {
			return Availability{}, nil
		}
		return Availability{}, err
	}

	var active, collected int
	err = DB.QueryRowContext(ctx, `
		SELECT
			COALESCE(SUM(CASE WHEN status IN ('pending','approved') THEN quantity ELSE 0 END), 0) AS active,
			COALESCE(SUM(CASE WHEN status = 'collected' THEN quantity ELSE 0 END), 0) AS collected
		FROM reservations WHERE food_listing_id = $1`, listingID).Scan(&active, &collected)
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

func RecomputeListingStatus(ctx context.Context, listingID int) error {
	var currentStatus string
	err := DB.QueryRowContext(ctx, "SELECT status FROM food_listings WHERE id = $1", listingID).Scan(&currentStatus)
	if err != nil {
		return err
	}

	if currentStatus == "expired" || currentStatus == "cancelled" || currentStatus == "collected" {
		return nil
	}

	avail, err := GetAvailability(ctx, listingID)
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
		_, err = DB.ExecContext(ctx, `
			UPDATE food_listings 
			SET status = $1 
			WHERE id = $2 AND status NOT IN ('expired','cancelled','collected')`,
			nextStatus, listingID,
		)
		return err
	}
	return nil
}
