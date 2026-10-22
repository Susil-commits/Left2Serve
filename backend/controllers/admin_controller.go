package controllers

import (
	"crypto/subtle"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"left2serve/backend/config"
	"left2serve/backend/middleware"
	"left2serve/backend/models"
	"left2serve/backend/services"
	"left2serve/backend/utils"
)

type AdminController struct {
	cfg *config.Config
}

var GlobalAdminController *AdminController

func InitAdminController(cfg *config.Config) {
	GlobalAdminController = &AdminController{cfg: cfg}
}

func (ctl *AdminController) Login(c *gin.Context) {
	var req models.AdminLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Admin code is required"})
		return
	}

	if ctl.cfg.AdminCode == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Admin access is not configured"})
		return
	}

	// Constant-time comparison
	match := subtle.ConstantTimeCompare([]byte(req.AdminCode), []byte(ctl.cfg.AdminCode)) == 1
	if !match {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid admin code"})
		return
	}

	token, err := middleware.SignAdminToken(ctl.cfg)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user": map[string]any{
			"id":    0,
			"name":  "Administrator",
			"email": "admin@left2serve.com",
			"role":  "admin",
		},
	})
}

func (ctl *AdminController) GetStats(c *gin.Context) {
	stats, err := services.GlobalAdminService.GetStats(c.Request.Context())
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, stats)
}

func (ctl *AdminController) GetUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	result, err := services.GlobalAdminService.GetUsers(c.Request.Context(), page, limit)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

func (ctl *AdminController) GetNgos(c *gin.Context) {
	ngos, err := services.GlobalAdminService.GetNgos(c.Request.Context())
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, ngos)
}

func (ctl *AdminController) GetOrders(c *gin.Context) {
	orders, err := services.GlobalAdminService.GetOrders(c.Request.Context())
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, orders)
}

func (ctl *AdminController) GetListings(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	result, err := services.GlobalAdminService.GetListings(c.Request.Context(), page, limit)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

func (ctl *AdminController) DeleteListing(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid listing ID"})
		return
	}

	if err := services.GlobalAdminService.DeleteListing(c.Request.Context(), id, c.ClientIP()); err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Listing deleted"})
}

func (ctl *AdminController) UpdateOrder(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}

	var req models.AdminUpdateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status"})
		return
	}

	if err := services.GlobalAdminService.UpdateOrder(c.Request.Context(), id, req.Status, c.ClientIP()); err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Order updated"})
}

func (ctl *AdminController) UpdateUser(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req models.AdminUpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updated, err := services.GlobalAdminService.UpdateUser(c.Request.Context(), id, &req, c.ClientIP())
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, updated)
}

func (ctl *AdminController) DeleteUser(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	if err := services.GlobalAdminService.DeleteUser(c.Request.Context(), id, c.ClientIP()); err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted"})
}

func (ctl *AdminController) ResetUserPassword(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req models.AdminResetUserPasswordRequest
	_ = c.ShouldBindJSON(&req)

	password, err := services.GlobalAdminService.ResetUserPassword(c.Request.Context(), id, req.Password, c.ClientIP())
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	resp := gin.H{"message": "Password reset. The user will need to log in again."}
	if req.Password == nil {
		resp["password"] = password
	}

	c.JSON(http.StatusOK, resp)
}

func (ctl *AdminController) GetTrends(c *gin.Context) {
	days, _ := strconv.Atoi(c.DefaultQuery("days", "14"))

	trends, err := services.GlobalAdminService.GetTrends(c.Request.Context(), days)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, trends)
}

func (ctl *AdminController) GetAuditLog(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	logs, err := services.GlobalAdminService.GetAuditLog(c.Request.Context(), limit)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, logs)
}

func (ctl *AdminController) ExportData(c *gin.Context) {
	exportType := c.Query("type")

	csvData, err := services.GlobalAdminService.GetExportData(c.Request.Context(), exportType, c.ClientIP())
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=export_%s_%d.csv", exportType, time.Now().Unix()))
	c.String(http.StatusOK, csvData)
}
