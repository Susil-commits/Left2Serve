package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"left2serve/backend/config"
	"left2serve/backend/models"
	"left2serve/backend/services"
	"left2serve/backend/utils"
)

type PaymentController struct {
	cfg *config.Config
}

var GlobalPaymentController *PaymentController

func InitPaymentController(cfg *config.Config) {
	GlobalPaymentController = &PaymentController{cfg: cfg}
}

func (ctl *PaymentController) GetConfig(c *gin.Context) {
	configured := services.GlobalPaymentService.IsConfigured()
	var keyID *string
	if configured {
		keyID = &ctl.cfg.RazorpayKeyID
	}

	c.JSON(http.StatusOK, gin.H{
		"configured": configured,
		"key_id":     keyID,
	})
}

func (ctl *PaymentController) CreateOrder(c *gin.Context) {
	if !services.GlobalPaymentService.IsConfigured() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Razorpay is not configured on the server"})
		return
	}

	userID := c.GetInt("userID")
	var req models.CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	order, err := services.GlobalPaymentService.CreateOrder(c.Request.Context(), userID, &req)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusCreated, order)
}

func (ctl *PaymentController) VerifyPayment(c *gin.Context) {
	if !services.GlobalPaymentService.IsConfigured() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Razorpay is not configured on the server"})
		return
	}

	userID := c.GetInt("userID")
	var req models.VerifyPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := services.GlobalPaymentService.VerifyPayment(c.Request.Context(), userID, &req)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}
