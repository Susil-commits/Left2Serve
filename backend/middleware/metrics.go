package middleware

import (
	"fmt"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
)

type MetricsCollector struct {
	requestCounts sync.Map
	totalRequests uint64
}

var GlobalMetricsCollector = &MetricsCollector{}

func MetricsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		status := c.Writer.Status()
		method := c.Request.Method
		path := c.FullPath()
		if path == "" {
			path = c.Request.URL.Path
		}

		// Don't track metrics endpoint itself to avoid recursive inflation
		if strings.HasPrefix(path, "/metrics") {
			return
		}

		key := fmt.Sprintf(`method="%s",path="%s",status="%d"`, method, path, status)
		val, _ := GlobalMetricsCollector.requestCounts.LoadOrStore(key, new(uint64))
		counter := val.(*uint64)
		atomic.AddUint64(counter, 1)
		atomic.AddUint64(&GlobalMetricsCollector.totalRequests, 1)

		_ = time.Since(start)
	}
}

func (m *MetricsCollector) ExportPrometheus(dbStatsFn func() (int, int, int, int64), wsCount int, queueDepth int) string {
	var sb strings.Builder

	sb.WriteString("# HELP http_requests_total Total number of HTTP requests processed\n")
	sb.WriteString("# TYPE http_requests_total counter\n")

	m.requestCounts.Range(func(key, val any) bool {
		cnt := atomic.LoadUint64(val.(*uint64))
		sb.WriteString(fmt.Sprintf("http_requests_total{%s} %d\n", key.(string), cnt))
		return true
	})

	sb.WriteString(fmt.Sprintf("\n# HELP active_websocket_clients Number of currently connected WebSocket clients\n# TYPE active_websocket_clients gauge\nactive_websocket_clients %d\n", wsCount))
	sb.WriteString(fmt.Sprintf("\n# HELP task_queue_depth Number of tasks waiting in background worker queue\n# TYPE task_queue_depth gauge\ntask_queue_depth %d\n", queueDepth))

	if dbStatsFn != nil {
		open, inUse, idle, waitCount := dbStatsFn()
		sb.WriteString("\n# HELP db_connections_open Number of open database connections\n# TYPE db_connections_open gauge\n")
		sb.WriteString(fmt.Sprintf("db_connections_open %d\n", open))
		sb.WriteString("\n# HELP db_connections_in_use Number of database connections currently in use\n# TYPE db_connections_in_use gauge\n")
		sb.WriteString(fmt.Sprintf("db_connections_in_use %d\n", inUse))
		sb.WriteString("\n# HELP db_connections_idle Number of idle database connections in pool\n# TYPE db_connections_idle gauge\n")
		sb.WriteString(fmt.Sprintf("db_connections_idle %d\n", idle))
		sb.WriteString("\n# HELP db_connections_wait_total Total number of connection pool waits\n# TYPE db_connections_wait_total counter\n")
		sb.WriteString(fmt.Sprintf("db_connections_wait_total %d\n", waitCount))
	}

	return sb.String()
}

