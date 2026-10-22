package controllers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"left2serve/backend/models"
	"left2serve/backend/services"
	"left2serve/backend/utils"
)

type ForumController struct{}

var GlobalForumController = &ForumController{}

func (ctl *ForumController) GetCategories(c *gin.Context) {
	userRole := c.GetString("userRole")
	categories, err := services.GlobalForumService.GetCategories(c.Request.Context(), userRole)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, categories)
}

func (ctl *ForumController) GetPostsInCategory(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category ID"})
		return
	}
	userRole := c.GetString("userRole")

	data, err := services.GlobalForumService.GetPostsInCategory(c.Request.Context(), id, userRole)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, data)
}

func (ctl *ForumController) CreatePost(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category ID"})
		return
	}
	userID := c.GetInt("userID")
	userRole := c.GetString("userRole")

	var req models.CreatePostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	post, err := services.GlobalForumService.CreatePost(c.Request.Context(), id, userID, userRole, &req)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusCreated, post)
}

func (ctl *ForumController) GetPostDetails(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid post ID"})
		return
	}
	userRole := c.GetString("userRole")

	data, err := services.GlobalForumService.GetPostDetails(c.Request.Context(), id, userRole)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, data)
}

func (ctl *ForumController) CreateReply(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid post ID"})
		return
	}
	userID := c.GetInt("userID")
	userRole := c.GetString("userRole")

	var req models.CreateReplyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	reply, err := services.GlobalForumService.CreateReply(c.Request.Context(), id, userID, userRole, req.Content)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusCreated, reply)
}

func (ctl *ForumController) UpdateReply(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reply ID"})
		return
	}
	userID := c.GetInt("userID")
	userRole := c.GetString("userRole")

	var req models.CreateReplyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	reply, err := services.GlobalForumService.UpdateReply(c.Request.Context(), id, userID, userRole, req.Content)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, reply)
}

func (ctl *ForumController) DeleteReply(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reply ID"})
		return
	}
	userID := c.GetInt("userID")
	userRole := c.GetString("userRole")

	if err := services.GlobalForumService.DeleteReply(c.Request.Context(), id, userID, userRole); err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Reply deleted"})
}

func (ctl *ForumController) UpdatePost(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid post ID"})
		return
	}
	userID := c.GetInt("userID")
	userRole := c.GetString("userRole")

	var req models.UpdatePostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	post, err := services.GlobalForumService.UpdatePost(c.Request.Context(), id, userID, userRole, &req)
	if err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, post)
}

func (ctl *ForumController) DeletePost(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid post ID"})
		return
	}
	userID := c.GetInt("userID")
	userRole := c.GetString("userRole")

	if err := services.GlobalForumService.DeletePost(c.Request.Context(), id, userID, userRole); err != nil {
		utils.RespondWithError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Post deleted"})
}
