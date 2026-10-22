package controllers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"left2serve/backend/models"
	"left2serve/backend/services"
	"left2serve/backend/utils"
)

type ReservationController struct{}

var GlobalReservationController = &ReservationController{}

func (ctl *ReservationController) Create(c *gin.Context) {
	userID := c.GetInt("userID")

	var req models.CreateReservationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	reservation, err := services.GlobalReservationService.CreateReservation(c.Request.Context(), userID, &req)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusCreated, reservation)
}

func (ctl *ReservationController) GetMine(c *gin.Context) {
	userID := c.GetInt("userID")

	reservations, err := services.GlobalReservationService.GetMyReservations(c.Request.Context(), userID)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, reservations)
}

func (ctl *ReservationController) GetForListing(c *gin.Context) {
	userID := c.GetInt("userID")
	listingID, err := strconv.Atoi(c.Param("listingId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid listing ID"})
		return
	}

	reservations, err := services.GlobalReservationService.GetListingReservations(c.Request.Context(), listingID, userID)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, reservations)
}

func (ctl *ReservationController) GenerateQRToken(c *gin.Context) {
	userID := c.GetInt("userID")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reservation ID"})
		return
	}

	token, err := services.GlobalReservationService.GenerateQRToken(c.Request.Context(), id, userID)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": token})
}

func (ctl *ReservationController) VerifyQRToken(c *gin.Context) {
	userID := c.GetInt("userID")

	var req models.VerifyQRRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token is required"})
		return
	}

	updated, err := services.GlobalReservationService.VerifyQR(c.Request.Context(), req.Token, userID)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, updated)
}

func (ctl *ReservationController) UpdateStatus(c *gin.Context) {
	userID := c.GetInt("userID")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reservation ID"})
		return
	}

	var req models.UpdateReservationStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updated, err := services.GlobalReservationService.UpdateReservationStatus(c.Request.Context(), id, userID, req.Status)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, updated)
}
