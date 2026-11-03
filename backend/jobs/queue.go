package jobs

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"math"
	"sync"
	"time"

	"left2serve/backend/database"
)

type NotificationDispatcher func(ctx context.Context, userID int, notifType, title, message string, data map[string]any) error

var globalNotificationDispatcher NotificationDispatcher
var dispatcherMu sync.RWMutex

// RegisterNotificationDispatcher wires the notification sender without circular dependencies
func RegisterNotificationDispatcher(fn NotificationDispatcher) {
	dispatcherMu.Lock()
	defer dispatcherMu.Unlock()
	globalNotificationDispatcher = fn
}

func dispatchNotification(ctx context.Context, userID int, notifType, title, message string, data map[string]any) error {
	dispatcherMu.RLock()
	fn := globalNotificationDispatcher
	dispatcherMu.RUnlock()

	if fn != nil {
		return fn(ctx, userID, notifType, title, message, data)
	}
	return nil
}

type WatchlistMatchTask struct {
	ListingID   int     `json:"listing_id"`
	UserID      int     `json:"user_id"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Category    string  `json:"category"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
}

type TaskQueue struct {
	tasks      chan WatchlistMatchTask
	workerCnt  int
	ctx        context.Context
	cancel     context.CancelFunc
	wg         sync.WaitGroup
	isShutdown bool
	mu         sync.Mutex
}

var GlobalTaskQueue *TaskQueue

func InitTaskQueue(workerCount int, queueCap int) *TaskQueue {
	if workerCount <= 0 {
		workerCount = 4
	}
	if queueCap <= 0 {
		queueCap = 1000
	}

	ctx, cancel := context.WithCancel(context.Background())
	q := &TaskQueue{
		tasks:     make(chan WatchlistMatchTask, queueCap),
		workerCnt: workerCount,
		ctx:       ctx,
		cancel:    cancel,
	}

	for i := 0; i < workerCount; i++ {
		q.wg.Add(1)
		go q.workerLoop(i + 1)
	}

	GlobalTaskQueue = q
	log.Printf("Background task queue initialized with %d worker(s)\n", workerCount)
	return q
}

func (q *TaskQueue) EnqueueWatchlistMatch(task WatchlistMatchTask) bool {
	if q == nil {
		return false
	}

	q.mu.Lock()
	defer q.mu.Unlock()
	if q.isShutdown {
		return false
	}

	select {
	case q.tasks <- task:
		return true
	default:
		// Queue full: run asynchronously in fallback to prevent blocking HTTP handler
		log.Printf("Warning: TaskQueue channel full, running task in fallback goroutine\n")
		go q.processWatchlistMatch(task)
		return true
	}
}

func (q *TaskQueue) workerLoop(workerID int) {
	defer q.wg.Done()

	for {
		select {
		case <-q.ctx.Done():
			return
		case task, ok := <-q.tasks:
			if !ok {
				return
			}
			q.processWatchlistMatch(task)
		}
	}
}

func (q *TaskQueue) processWatchlistMatch(task WatchlistMatchTask) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("TaskQueue: Recovered from panic in processWatchlistMatch: %v\n", r)
		}
	}()

	bgCtx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	searchStr := fmt.Sprintf("%s %s %s", task.Title, task.Description, task.Category)

	// Bounding box filter for index acceleration:
	// A maximum typical watchlist radius is capped at 100 km (~0.9 degrees of latitude)
	// This enables Postgres to use idx_watchlists_lat_lng to instantly discard out-of-range rows
	maxRadiusKM := 100.0
	latDelta := maxRadiusKM / 111.045
	lngDelta := maxRadiusKM / (111.045 * math.Cos(task.Latitude*(math.Pi/180.0)))
	if lngDelta < 0 {
		lngDelta = -lngDelta
	}

	minLat, maxLat := task.Latitude-latDelta, task.Latitude+latDelta
	minLng, maxLng := task.Longitude-lngDelta, task.Longitude+lngDelta

	query := `
		SELECT user_id, keyword, radius_km FROM watchlists 
		WHERE user_id != $1 
		  AND latitude BETWEEN $2 AND $3
		  AND longitude BETWEEN $4 AND $5
		  AND (keyword IS NULL OR keyword = '' OR $6 ILIKE '%' || keyword || '%')
		  AND ( 6371 * acos(LEAST(1.0, GREATEST(-1.0, cos(radians($7)) * cos(radians(latitude)) * cos(radians(longitude) - radians($8)) + sin(radians($9)) * sin(radians(latitude))))) ) <= radius_km`

	rows, err := database.DB.QueryContext(bgCtx, query,
		task.UserID,
		minLat, maxLat, minLng, maxLng,
		searchStr,
		task.Latitude, task.Longitude, task.Latitude,
	)
	if err != nil {
		log.Printf("TaskQueue: Watchlist match query failed: %v\n", err)
		return
	}
	defer rows.Close()

	matchedUsers := make(map[int]string)
	for rows.Next() {
		var watcherID int
		var kw sql.NullString
		var radius float64
		if err := rows.Scan(&watcherID, &kw, &radius); err == nil {
			matchedUsers[watcherID] = kw.String
		}
	}

	for watcherID, keyword := range matchedUsers {
		_ = dispatchNotification(
			bgCtx,
			watcherID,
			"watchlist_alert",
			"New Food Alert!",
			fmt.Sprintf("A new listing \"%s\" matches your watchlist criteria!", task.Title),
			map[string]any{"listingId": task.ListingID, "keyword": keyword},
		)
	}
}

func (q *TaskQueue) QueueDepth() int {
	if q == nil || q.tasks == nil {
		return 0
	}
	return len(q.tasks)
}

func (q *TaskQueue) Stop() {
	q.mu.Lock()
	if q.isShutdown {
		q.mu.Unlock()
		return
	}
	q.isShutdown = true
	q.mu.Unlock()

	q.cancel()
	close(q.tasks)
	q.wg.Wait()
	log.Println("TaskQueue stopped cleanly")
}

