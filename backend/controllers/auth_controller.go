package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"left2serve/backend/models"
	"left2serve/backend/services"
	"left2serve/backend/utils"
)

type AuthController struct{}

var GlobalAuthController = &AuthController{}

func (ctl *AuthController) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	valid, msg := utils.ValidatePassword(req.Password)
	if !valid {
		c.JSON(http.StatusBadRequest, gin.H{"error": msg})
		return
	}

	result, err := services.GlobalAuthService.Register(c.Request.Context(), &req)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusCreated, result)
}

func (ctl *AuthController) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := services.GlobalAuthService.Login(c.Request.Context(), &req, c.ClientIP())
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

func (ctl *AuthController) GetMe(c *gin.Context) {
	userID := c.GetInt("userID")
	user, err := services.GlobalAuthService.GetMe(c.Request.Context(), userID)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, user)
}

func (ctl *AuthController) GetImpact(c *gin.Context) {
	userID := c.GetInt("userID")
	userRole := c.GetString("userRole")

	impact, err := services.GlobalAuthService.GetImpact(c.Request.Context(), userID, userRole)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, impact)
}

func (ctl *AuthController) UpdateProfile(c *gin.Context) {
	userID := c.GetInt("userID")

	var req models.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := services.GlobalAuthService.UpdateProfile(c.Request.Context(), userID, &req)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, user)
}

func (ctl *AuthController) UpdatePassword(c *gin.Context) {
	userID := c.GetInt("userID")
	userRole := c.GetString("userRole")

	var req models.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	valid, msg := utils.ValidatePassword(req.NewPass)
	if !valid {
		c.JSON(http.StatusBadRequest, gin.H{"error": msg})
		return
	}

	result, err := services.GlobalAuthService.UpdatePassword(c.Request.Context(), userID, userRole, &req, c.ClientIP())
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

func (ctl *AuthController) ForgotPassword(c *gin.Context) {
	var req models.ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := services.GlobalAuthService.ForgotPassword(c.Request.Context(), &req)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

func (ctl *AuthController) ResetPassword(c *gin.Context) {
	var req models.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	valid, msg := utils.ValidatePassword(req.NewPassword)
	if !valid {
		c.JSON(http.StatusBadRequest, gin.H{"error": msg})
		return
	}

	result, err := services.GlobalAuthService.ResetPassword(c.Request.Context(), &req)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

func (ctl *AuthController) Setup2FA(c *gin.Context) {
	userID := c.GetInt("userID")
	result, err := services.GlobalAuthService.Setup2FA(c.Request.Context(), userID)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

func (ctl *AuthController) Verify2FA(c *gin.Context) {
	userID := c.GetInt("userID")
	var req models.Verify2FARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := services.GlobalAuthService.Verify2FA(c.Request.Context(), userID, req.Token)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

func (ctl *AuthController) Disable2FA(c *gin.Context) {
	userID := c.GetInt("userID")
	var req models.Verify2FARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := services.GlobalAuthService.Disable2FA(c.Request.Context(), userID, req.Token)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}
