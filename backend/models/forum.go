package models

import (
	"encoding/json"
	"time"
)

type ForumCategory struct {
	ID          int             `json:"id"`
	Name        string          `json:"name"`
	Description *string         `json:"description"`
	ReadRoles   json.RawMessage `json:"read_roles"`
	WriteRoles  json.RawMessage `json:"write_roles"`
	CreatedAt   time.Time       `json:"created_at"`
}

type ForumPost struct {
	ID         int       `json:"id"`
	CategoryID int       `json:"category_id"`
	UserID     int       `json:"user_id"`
	Title      string    `json:"title"`
	Content    string    `json:"content"`
	CreatedAt  time.Time `json:"created_at"`

	AuthorName *string `json:"author_name,omitempty"`
	AuthorRole *string `json:"author_role,omitempty"`
	ReplyCount int     `json:"reply_count"`
}

type ForumReply struct {
	ID        int       `json:"id"`
	PostID    int       `json:"post_id"`
	UserID    int       `json:"user_id"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`

	AuthorName *string `json:"author_name,omitempty"`
	AuthorRole *string `json:"author_role,omitempty"`
}

type CreatePostRequest struct {
	Title   string `json:"title" binding:"required,min=2,max=200"`
	Content string `json:"content" binding:"required,min=2,max=5000"`
}

type UpdatePostRequest struct {
	Title   *string `json:"title"`
	Content *string `json:"content"`
}

type CreateReplyRequest struct {
	Content string `json:"content" binding:"required,min=2,max=3000"`
}
