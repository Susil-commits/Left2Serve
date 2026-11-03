package jobs

import (
	"context"
	"sync"
	"testing"
)

func TestTaskQueueLifecycleAndEnqueue(t *testing.T) {
	q := InitTaskQueue(2, 50)
	if q == nil {
		t.Fatal("Expected task queue to initialize")
	}

	task := WatchlistMatchTask{
		ListingID:   10,
		UserID:      1,
		Title:       "Surplus Pizza",
		Description: "Fresh slices",
		Category:    "restaurant",
		Latitude:    12.9716,
		Longitude:   77.5946,
	}

	enqueued := q.EnqueueWatchlistMatch(task)
	if !enqueued {
		t.Errorf("Expected task to be enqueued successfully")
	}

	// Graceful shutdown
	q.Stop()

	// Enqueuing after stop should return false
	afterStop := q.EnqueueWatchlistMatch(task)
	if afterStop {
		t.Errorf("Expected enqueue after stop to return false")
	}
}

func TestRegisterNotificationDispatcher(t *testing.T) {
	var mu sync.Mutex
	dispatched := false

	RegisterNotificationDispatcher(func(ctx context.Context, userID int, notifType, title, message string, data map[string]any) error {
		mu.Lock()
		defer mu.Unlock()
		dispatched = true
		return nil
	})

	err := dispatchNotification(context.Background(), 99, "test", "Title", "Msg", nil)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	mu.Lock()
	if !dispatched {
		t.Errorf("Expected notification dispatcher to be invoked")
	}
	mu.Unlock()
}
