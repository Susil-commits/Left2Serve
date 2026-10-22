package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"left2serve/backend/models"
	"left2serve/backend/services"
	"left2serve/backend/utils"
)

type AIController struct{}

var GlobalAIController = &AIController{}

func (ctl *AIController) Describe(c *gin.Context) {
	var req models.DescribeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Title and category are required."})
		return
	}

	res, err := services.GlobalAIService.GenerateDescription(c.Request.Context(), req.Title, req.Category)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, res)
}

func (ctl *AIController) Chat(c *gin.Context) {
	var req models.ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "A valid 'message' string is required."})
		return
	}

	res, err := services.GlobalAIService.GuardedChat(c.Request.Context(), req.Message, req.History)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, res)
}
