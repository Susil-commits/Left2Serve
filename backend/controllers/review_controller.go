package controllers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"left2serve/backend/models"
	"left2serve/backend/services"
	"left2serve/backend/utils"
)

type ReviewController struct{}

var GlobalReviewController = &ReviewController{}

func (ctl *ReviewController) CreateReview(c *gin.Context) {
	userID := c.GetInt("userID")

	var req models.CreateReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	review, err := services.GlobalReviewService.CreateReview(c.Request.Context(), userID, &req)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusCreated, review)
}

func (ctl *ReviewController) GetReservationReview(c *gin.Context) {
	userID := c.GetInt("userID")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reservation ID"})
		return
	}

	info, err := services.GlobalReviewService.GetReservationReviewInfo(c.Request.Context(), id, userID)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, info)
}

func (ctl *ReviewController) GetUserReviews(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	info, err := services.GlobalReviewService.GetUserReviews(c.Request.Context(), userID)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, info)
}
