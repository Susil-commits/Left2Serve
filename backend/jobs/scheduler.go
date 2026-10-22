package jobs

import (
	"context"
	"log"

	"github.com/robfig/cron/v3"
	"left2serve/backend/database"
)

func SetupBackgroundJobs() *cron.Cron {
	c := cron.New()

	// Every 5 minutes: sweep expired listings
	_, err := c.AddFunc("*/5 * * * *", func() {
		ctx := context.Background()
		count, err := database.SweepExpiredListings(ctx)
		if err != nil {
			log.Printf("Background job sweep-expired error: %v\n", err)
		} else if count > 0 {
			log.Printf("Background job: Swept %d expired listing(s)\n", count)
		}
	})
	if err != nil {
		log.Printf("Failed to schedule sweep-expired: %v\n", err)
	}

	// Daily at midnight (00:00): maintenance
	_, err = c.AddFunc("0 0 * * *", func() {
		ctx := context.Background()
		log.Println("Background job: Running daily maintenance...")

		// Delete old read notifications older than 30 days
		_, _ = database.DB.ExecContext(ctx, "DELETE FROM notifications WHERE is_read = TRUE AND created_at < NOW() - INTERVAL '30 days'")
		log.Println("Background job: Old read notifications purged")

		// Auto-cancel orphaned reservations on expired listings
		_, _ = database.DB.ExecContext(ctx, `
			UPDATE reservations 
			SET status = 'cancelled' 
			WHERE status IN ('pending', 'approved') 
			  AND food_listing_id IN (SELECT id FROM food_listings WHERE status = 'expired')`,
		)
		log.Println("Background job: Orphaned reservations auto-cancelled")
	})
	if err != nil {
		log.Printf("Failed to schedule daily-maintenance: %v\n", err)
	}

	c.Start()
	log.Println("Background cron scheduler started")
	return c
}
