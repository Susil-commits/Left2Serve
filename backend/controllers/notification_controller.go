package controllers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"left2serve/backend/services"
	"left2serve/backend/utils"
)

type NotificationController struct{}

var GlobalNotificationController = &NotificationController{}

func (ctl *NotificationController) GetNotifications(c *gin.Context) {
	userID := c.GetInt("userID")
	notifications, err := services.GlobalNotificationService.GetNotifications(c.Request.Context(), userID)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, notifications)
}

func (ctl *NotificationController) GetUnreadCount(c *gin.Context) {
	userID := c.GetInt("userID")
	count, err := services.GlobalNotificationService.GetUnreadCount(c.Request.Context(), userID)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"count": count})
}

func (ctl *NotificationController) MarkAllAsRead(c *gin.Context) {
	userID := c.GetInt("userID")
	if err := services.GlobalNotificationService.MarkAllAsRead(c.Request.Context(), userID); err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "All notifications marked as read"})
}

func (ctl *NotificationController) MarkAsRead(c *gin.Context) {
	userID := c.GetInt("userID")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid notification ID"})
		return
	}

	if err := services.GlobalNotificationService.MarkAsRead(c.Request.Context(), id, userID); err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification marked as read"})
}

func (ctl *NotificationController) DeleteNotification(c *gin.Context) {
	userID := c.GetInt("userID")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid notification ID"})
		return
	}

	if err := services.GlobalNotificationService.DeleteNotification(c.Request.Context(), id, userID); err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification deleted"})
}

func (ctl *NotificationController) SubscribePush(c *gin.Context) {
	userID := c.GetInt("userID")
	var sub map[string]any
	if err := c.ShouldBindJSON(&sub); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid push subscription object"})
		return
	}

	if err := services.GlobalNotificationService.SubscribePush(c.Request.Context(), userID, sub); err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Push notification subscription registered"})
}

func (ctl *NotificationController) UnsubscribePush(c *gin.Context) {
	userID := c.GetInt("userID")
	endpoint := c.Query("endpoint")
	if endpoint == "" {
		var req struct {
			Endpoint string `json:"endpoint"`
		}
		_ = c.ShouldBindJSON(&req)
		endpoint = req.Endpoint
	}

	if err := services.GlobalNotificationService.UnsubscribePush(c.Request.Context(), userID, endpoint); err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Push notification subscription removed"})
}
