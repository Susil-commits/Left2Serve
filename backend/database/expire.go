package database

import (
	"context"
	"log"
)

func SweepExpiredListings(ctx context.Context) (int, error) {
	rows, err := DB.QueryContext(ctx, `
		UPDATE food_listings 
		SET status = 'expired' 
		WHERE status = 'available' AND expiry_date < NOW() 
		RETURNING id
	`)
	if err != nil {
		log.Printf("SweepExpiredListings error: %v\n", err)
		return 0, err
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		count++
	}
	return count, nil
}
