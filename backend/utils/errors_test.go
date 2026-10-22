package utils

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestAppErrorConstructors(t *testing.T) {
	tests := []struct {
		err  *AppError
		code int
		msg  string
	}{
		{NotFound("not found"), http.StatusNotFound, "not found"},
		{BadRequest("bad input"), http.StatusBadRequest, "bad input"},
		{Unauthorized("unauthorized"), http.StatusUnauthorized, "unauthorized"},
		{Forbidden("forbidden"), http.StatusForbidden, "forbidden"},
		{Conflict("conflict"), http.StatusConflict, "conflict"},
		{InternalError("server error"), http.StatusInternalServerError, "server error"},
		{ServiceUnavailable("unavailable"), http.StatusServiceUnavailable, "unavailable"},
	}

	for _, tt := range tests {
		if tt.err.StatusCode != tt.code {
			t.Errorf("AppError status code = %d, expected %d", tt.err.StatusCode, tt.code)
		}
		if tt.err.Message != tt.msg {
			t.Errorf("AppError message = %q, expected %q", tt.err.Message, tt.msg)
		}
		if tt.err.Error() != tt.msg {
			t.Errorf("AppError Error() = %q, expected %q", tt.err.Error(), tt.msg)
		}
	}
}

func TestRespondWithError(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("Custom AppError", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		RespondWithError(c, NotFound("Item does not exist"))

		if w.Code != http.StatusNotFound {
			t.Errorf("Expected 404, got %d", w.Code)
		}

		var res map[string]any
		_ = json.Unmarshal(w.Body.Bytes(), &res)
		if res["error"] != "Item does not exist" {
			t.Errorf("Unexpected body: %+v", res)
		}
	})

	t.Run("Standard Go error defaults to 500", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		RespondWithError(c, errors.New("unexpected database error"))

		if w.Code != http.StatusInternalServerError {
			t.Errorf("Expected 500, got %d", w.Code)
		}
	})
}
