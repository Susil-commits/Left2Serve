package controllers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"left2serve/backend/models"
	"left2serve/backend/services"
	"left2serve/backend/utils"
)

type WatchlistController struct{}

var GlobalWatchlistController = &WatchlistController{}

func (ctl *WatchlistController) GetUserWatchlists(c *gin.Context) {
	userID := c.GetInt("userID")
	lists, err := services.GlobalWatchlistService.GetUserWatchlists(c.Request.Context(), userID)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, lists)
}

func (ctl *WatchlistController) CreateWatchlist(c *gin.Context) {
	userID := c.GetInt("userID")

	var req models.CreateWatchlistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	w, err := services.GlobalWatchlistService.CreateWatchlist(c.Request.Context(), userID, &req)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusCreated, w)
}

func (ctl *WatchlistController) DeleteWatchlist(c *gin.Context) {
	userID := c.GetInt("userID")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid watchlist ID"})
		return
	}

	if err := services.GlobalWatchlistService.DeleteWatchlist(c.Request.Context(), id, userID); err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Deleted successfully"})
}
