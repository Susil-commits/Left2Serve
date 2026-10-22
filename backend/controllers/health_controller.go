package controllers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
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
