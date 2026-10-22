package controllers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"left2serve/backend/config"
	"left2serve/backend/models"
	"left2serve/backend/services"
	"left2serve/backend/utils"
)

type ListingController struct {
	cfg *config.Config
}

var GlobalListingController *ListingController

func InitListingController(cfg *config.Config) {
	GlobalListingController = &ListingController{cfg: cfg}
}

func (ctl *ListingController) GetAll(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "12"))

	var latPtr, lngPtr, distPtr *float64
	if latStr := c.Query("lat"); latStr != "" {
		if lat, err := strconv.ParseFloat(latStr, 64); err == nil {
			latPtr = &lat
		}
	}
	if lngStr := c.Query("lng"); lngStr != "" {
		if lng, err := strconv.ParseFloat(lngStr, 64); err == nil {
			lngPtr = &lng
		}
	}
	if distStr := c.Query("distance"); distStr != "" {
		if dist, err := strconv.ParseFloat(distStr, 64); err == nil {
			distPtr = &dist
		}
	}

	opts := &models.ListingQueryOptions{
		Category: c.Query("category"),
		Status:   c.Query("status"),
		Search:   c.Query("search"),
		Sort:     c.Query("sort"),
		Dietary:  c.Query("dietary"),
		Page:     page,
		Limit:    limit,
		Lat:      latPtr,
		Lng:      lngPtr,
		Distance: distPtr,
	}

	result, err := services.GlobalListingService.GetAllListings(c.Request.Context(), opts)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

func (ctl *ListingController) GetOne(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid listing ID"})
		return
	}

	var currentUser *models.User
	if uid, exists := c.Get("userID"); exists {
		currentUser = &models.User{
			ID:   uid.(int),
			Role: c.GetString("userRole"),
		}
	}

	listing, err := services.GlobalListingService.GetOne(c.Request.Context(), id, currentUser)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}
	if listing == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Listing not found"})
		return
	}

	c.JSON(http.StatusOK, listing)
}

func (ctl *ListingController) Create(c *gin.Context) {
	userID := c.GetInt("userID")

	var req models.CreateListingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.ExpiryDate.Before(time.Now()) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Expiry date must be in the future"})
		return
	}

	listing, err := services.GlobalListingService.CreateListing(c.Request.Context(), userID, &req)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusCreated, listing)
}

func (ctl *ListingController) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid listing ID"})
		return
	}
	userID := c.GetInt("userID")

	var req models.UpdateListingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	listing, err := services.GlobalListingService.UpdateListing(c.Request.Context(), id, userID, &req)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, listing)
}

func (ctl *ListingController) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid listing ID"})
		return
	}
	userID := c.GetInt("userID")

	if err := services.GlobalListingService.DeleteListing(c.Request.Context(), id, userID); err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Listing deleted"})
}

func (ctl *ListingController) Close(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid listing ID"})
		return
	}
	userID := c.GetInt("userID")

	if err := services.GlobalListingService.CloseListing(c.Request.Context(), id, userID); err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Listing marked as donated"})
}

func (ctl *ListingController) GetMine(c *gin.Context) {
	userID := c.GetInt("userID")
	listings, err := services.GlobalListingService.GetMine(c.Request.Context(), userID)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}
	c.JSON(http.StatusOK, listings)
}

func (ctl *ListingController) GetTemplates(c *gin.Context) {
	userID := c.GetInt("userID")
	templates, err := services.GlobalListingService.GetTemplates(c.Request.Context(), userID)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}
	c.JSON(http.StatusOK, templates)
}

func (ctl *ListingController) GetStats(c *gin.Context) {
	stats, err := services.GlobalListingService.GetStats(c.Request.Context())
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (ctl *ListingController) GetImpact(c *gin.Context) {
	impact, err := services.GlobalListingService.GetImpactStats(c.Request.Context())
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}
	c.JSON(http.StatusOK, impact)
}

func (ctl *ListingController) GetAnalyticsMe(c *gin.Context) {
	userID := c.GetInt("userID")
	analytics, err := services.GlobalListingService.GetAnalyticsMe(c.Request.Context(), userID)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}
	c.JSON(http.StatusOK, analytics)
}

func (ctl *ListingController) Upload(c *gin.Context) {
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form"})
		return
	}

	files := form.File["images"]
	if len(files) == 0 {
		c.JSON(http.StatusOK, gin.H{"urls": []string{}})
		return
	}

	urls := make([]string, 0)
	uploadsDir := filepath.Join("uploads", "left2serve")
	_ = os.MkdirAll(uploadsDir, 0755)

	scheme := "http"
	if c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https" {
		scheme = "https"
	}
	host := c.Request.Host

	for _, file := range files {
		ext := strings.ToLower(filepath.Ext(file.Filename))
		if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
			continue
		}

		filename := fmt.Sprintf("%d-%d%s", time.Now().UnixNano(), os.Getpid(), ext)
		dst := filepath.Join(uploadsDir, filename)

		if err := c.SaveUploadedFile(file, dst); err == nil {
			urls = append(urls, fmt.Sprintf("%s://%s/uploads/left2serve/%s", scheme, host, filename))
		}
	}

	c.JSON(http.StatusOK, gin.H{"urls": urls})
}

func (ctl *ListingController) AnalyzeImage(c *gin.Context) {
	var req models.AnalyzeImageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "imageUrl is required"})
		return
	}

	res, err := services.GlobalAIService.AnalyzeFoodImage(c.Request.Context(), req.ImageURL)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, res)
}
