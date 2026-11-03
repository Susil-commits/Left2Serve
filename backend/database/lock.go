package database

import (
	"context"
	"fmt"
)

// Well-known 64-bit advisory lock keys for background cron tasks across multi-instance clusters
const (
	LockKeySweepExpired     int64 = 72001
	LockKeyDailyMaintenance int64 = 72002
)

// RunWithAdvisoryLock executes fn only if it can obtain a PostgreSQL transaction-level advisory lock.
// If another instance already holds the lock, it immediately returns (false, nil) without waiting.
// When fn finishes (or panics/fails), the transaction terminates and Postgres automatically releases the lock.
func RunWithAdvisoryLock(ctx context.Context, lockKey int64, fn func(ctx context.Context) error) (bool, error) {
	if DB == nil {
		return false, fmt.Errorf("database connection is nil")
	}

	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return false, fmt.Errorf("failed to begin lock transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback()
	}()

	var acquired bool
	err = tx.QueryRowContext(ctx, "SELECT pg_try_advisory_xact_lock($1)", lockKey).Scan(&acquired)
	if err != nil {
		return false, fmt.Errorf("failed to query advisory lock: %w", err)
	}

	if !acquired {
		return false, nil // Another instance is currently executing this job
	}

	if err := fn(ctx); err != nil {
		return true, err
	}

	if err := tx.Commit(); err != nil {
		return true, fmt.Errorf("failed to commit lock transaction: %w", err)
	}

	return true, nil
}

