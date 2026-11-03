package jobs

import (
	"context"
	"log"

	"github.com/robfig/cron/v3"
	"left2serve/backend/database"
)

func SetupBackgroundJobs() *cron.Cron {
	c := cron.New()

	// Every 5 minutes: sweep expired listings using cluster advisory lock
	_, err := c.AddFunc("*/5 * * * *", func() {
		ctx := context.Background()
		acquired, err := database.RunWithAdvisoryLock(ctx, database.LockKeySweepExpired, func(lockCtx context.Context) error {
			count, err := database.SweepExpiredListings(lockCtx)
			if err != nil {
				return err
			}
			if count > 0 {
				log.Printf("Background job: Swept %d expired listing(s)\n", count)
			}
			return nil
		})

		if err != nil {
			log.Printf("Background job sweep-expired error: %v\n", err)
		} else if !acquired {
			log.Println("Background job sweep-expired skipped: lock held by another cluster instance")
		}
	})
	if err != nil {
		log.Printf("Failed to schedule sweep-expired: %v\n", err)
	}

	// Daily at midnight (00:00): maintenance using cluster advisory lock
	_, err = c.AddFunc("0 0 * * *", func() {
		ctx := context.Background()
		log.Println("Background job: Checking daily maintenance schedule...")

		acquired, err := database.RunWithAdvisoryLock(ctx, database.LockKeyDailyMaintenance, func(lockCtx context.Context) error {
			log.Println("Background job: Running daily maintenance...")

			// Delete old read notifications older than 30 days
			_, _ = database.DB.ExecContext(lockCtx, "DELETE FROM notifications WHERE is_read = TRUE AND created_at < NOW() - INTERVAL '30 days'")
			log.Println("Background job: Old read notifications purged")

			// Auto-cancel orphaned reservations on expired listings
			_, _ = database.DB.ExecContext(lockCtx, `
				UPDATE reservations 
				SET status = 'cancelled' 
				WHERE status IN ('pending', 'approved') 
				  AND food_listing_id IN (SELECT id FROM food_listings WHERE status = 'expired')`,
			)
			log.Println("Background job: Orphaned reservations auto-cancelled")
			return nil
		})

		if err != nil {
			log.Printf("Background job daily-maintenance error: %v\n", err)
		} else if !acquired {
			log.Println("Background job daily-maintenance skipped: lock held by another cluster instance")
		}
	})
	if err != nil {
		log.Printf("Failed to schedule daily-maintenance: %v\n", err)
	}

	c.Start()
	log.Println("Background cron scheduler started")
	return c
}
