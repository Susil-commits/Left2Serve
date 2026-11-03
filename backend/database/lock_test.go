package database

import (
	"context"
	"testing"
)

func TestRunWithAdvisoryLockNilDB(t *testing.T) {
	// When DB is nil (e.g. uninitialized in isolated unit tests), it returns an error gracefully
	prevDB := DB
	DB = nil
	defer func() { DB = prevDB }()

	called := false
	acquired, err := RunWithAdvisoryLock(context.Background(), LockKeySweepExpired, func(ctx context.Context) error {
		called = true
		return nil
	})

	if acquired {
		t.Errorf("Expected acquired to be false when DB is nil")
	}
	if err == nil {
		t.Errorf("Expected error when DB is nil, got nil")
	}
	if called {
		t.Errorf("Expected fn to not be called when DB is nil")
	}
}

