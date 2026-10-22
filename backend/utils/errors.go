package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type AppError struct {
	StatusCode int    `json:"statusCode"`
	Message    string `json:"error"`
}

func (e *AppError) Error() string {
	return e.Message
}

func NewAppError(statusCode int, message string) *AppError {
	return &AppError{
		StatusCode: statusCode,
		Message:    message,
	}
}

func RespondWithError(c *gin.Context, err error) {
	if appErr, ok := err.(*AppError); ok {
		c.JSON(appErr.StatusCode, gin.H{"error": appErr.Message})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
}

func RespondWithMessage(c *gin.Context, statusCode int, message string) {
	c.JSON(statusCode, gin.H{"error": message})
}

func InternalError(msg string) *AppError {
	return NewAppError(http.StatusInternalServerError, msg)
}

func BadRequest(msg string) *AppError {
	return NewAppError(http.StatusBadRequest, msg)
}

func Unauthorized(msg string) *AppError {
	return NewAppError(http.StatusUnauthorized, msg)
}

func Forbidden(msg string) *AppError {
	return NewAppError(http.StatusForbidden, msg)
}

func NotFound(msg string) *AppError {
	return NewAppError(http.StatusNotFound, msg)
}

func Conflict(msg string) *AppError {
	return NewAppError(http.StatusConflict, msg)
}

func Locked(msg string) *AppError {
	return NewAppError(http.StatusLocked, msg)
}

func ServiceUnavailable(msg string) *AppError {
	return NewAppError(http.StatusServiceUnavailable, msg)
}
