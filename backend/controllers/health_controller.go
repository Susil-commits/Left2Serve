package controllers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"left2serve/backend/database"
	"left2serve/backend/jobs"
	"left2serve/backend/middleware"
	"left2serve/backend/sockets"
)

type HealthController struct{}

var GlobalHealthController = &HealthController{}

func (ctl *HealthController) Root(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"name":      "Left2Serve API",
		"status":    "ok",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

func (ctl *HealthController) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (ctl *HealthController) NotificationsHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"state":               "CLOSED",
		"consecutiveFailures": 0,
		"lastStateChange":     time.Now().UTC().Format(time.RFC3339),
	})
}

func (ctl *HealthController) Metrics(c *gin.Context) {
	var wsCount, queueDepth int
	if sockets.GlobalSocketServer != nil {
		wsCount = sockets.GlobalSocketServer.ClientCount()
	}
	if jobs.GlobalTaskQueue != nil {
		queueDepth = jobs.GlobalTaskQueue.QueueDepth()
	}

	dbStatsFn := func() (int, int, int, int64) {
		if database.DB != nil {
			st := database.DB.Stats()
			return st.OpenConnections, st.InUse, st.Idle, st.WaitCount
		}
		return 0, 0, 0, 0
	}

	out := middleware.GlobalMetricsCollector.ExportPrometheus(dbStatsFn, wsCount, queueDepth)
	c.Data(http.StatusOK, "text/plain; version=0.0.4; charset=utf-8", []byte(out))
}

func (ctl *HealthController) TRPCCompat(c *gin.Context) {
	// Simple JSON response for tRPC health check
	c.JSON(http.StatusOK, []map[string]any{
		{
			"result": map[string]any{
				"data": map[string]any{
					"status":    "ok",
					"timestamp": time.Now().UTC().Format(time.RFC3339),
				},
			},
		},
	})
}
