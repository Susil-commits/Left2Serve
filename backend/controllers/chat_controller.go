package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"left2serve/backend/services"
	"left2serve/backend/utils"
)

type ChatController struct{}

var GlobalChatController = &ChatController{}

func (ctl *ChatController) GetMessages(c *gin.Context) {
	reservationID := c.Param("reservationId")
	userID := c.GetInt("userID")
	userRole := c.GetString("userRole")

	messages, err := services.GlobalChatService.GetMessages(c.Request.Context(), reservationID, userID, userRole)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, messages)
}
