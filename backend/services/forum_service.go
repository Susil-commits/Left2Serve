package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"left2serve/backend/database"
	"left2serve/backend/models"
	"left2serve/backend/utils"
)

type ForumService struct{}

var GlobalForumService = &ForumService{}

func hasRolePermission(rolesJSON json.RawMessage, role string) bool {
	var roles []string
	if err := json.Unmarshal(rolesJSON, &roles); err != nil {
		return false
	}
	for _, r := range roles {
		if r == role {
			return true
		}
	}
	return false
}

func (s *ForumService) GetCategories(ctx context.Context, role string) ([]models.ForumCategory, error) {
	rows, err := database.DB.QueryContext(ctx, "SELECT id, name, description, read_roles, write_roles, created_at FROM forum_categories ORDER BY id ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	categories := make([]models.ForumCategory, 0)
	for rows.Next() {
		var c models.ForumCategory
		var rawRead, rawWrite []byte
		if err := rows.Scan(&c.ID, &c.Name, &c.Description, &rawRead, &rawWrite, &c.CreatedAt); err != nil {
			return nil, err
		}
		c.ReadRoles = json.RawMessage(rawRead)
		c.WriteRoles = json.RawMessage(rawWrite)

		if hasRolePermission(c.ReadRoles, role) {
			categories = append(categories, c)
		}
	}

	return categories, nil
}

func (s *ForumService) GetPostsInCategory(ctx context.Context, categoryID int, role string) (map[string]any, error) {
	var cat models.ForumCategory
	var rawRead, rawWrite []byte
	err := database.DB.QueryRowContext(ctx, "SELECT id, name, description, read_roles, write_roles, created_at FROM forum_categories WHERE id = $1", categoryID).Scan(
		&cat.ID, &cat.Name, &cat.Description, &rawRead, &rawWrite, &cat.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, utils.NotFound("Category not found")
		}
		return nil, err
	}

	cat.ReadRoles = json.RawMessage(rawRead)
	cat.WriteRoles = json.RawMessage(rawWrite)

	if !hasRolePermission(cat.ReadRoles, role) {
		return nil, utils.Forbidden("You do not have permission to view this category")
	}

	rows, err := database.DB.QueryContext(ctx, `
		SELECT p.id, p.category_id, p.user_id, p.title, p.content, p.created_at, 
		       u.name as author_name, u.role as author_role, 
		       (SELECT COUNT(*) FROM forum_replies r WHERE r.post_id = p.id) as reply_count 
		FROM forum_posts p 
		JOIN users u ON p.user_id = u.id 
		WHERE p.category_id = $1 
		ORDER BY p.created_at DESC`, categoryID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	posts := make([]models.ForumPost, 0)
	for rows.Next() {
		var p models.ForumPost
		var authorName, authorRole sql.NullString
		if err := rows.Scan(&p.ID, &p.CategoryID, &p.UserID, &p.Title, &p.Content, &p.CreatedAt, &authorName, &authorRole, &p.ReplyCount); err != nil {
			return nil, err
		}
		if authorName.Valid {
			p.AuthorName = &authorName.String
		}
		if authorRole.Valid {
			p.AuthorRole = &authorRole.String
		}
		posts = append(posts, p)
	}

	return map[string]any{
		"category": cat,
		"posts":    posts,
	}, nil
}

func (s *ForumService) CreatePost(ctx context.Context, categoryID, userID int, role string, req *models.CreatePostRequest) (*models.ForumPost, error) {
	var rawWrite []byte
	err := database.DB.QueryRowContext(ctx, "SELECT write_roles FROM forum_categories WHERE id = $1", categoryID).Scan(&rawWrite)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, utils.NotFound("Category not found")
		}
		return nil, err
	}

	if !hasRolePermission(json.RawMessage(rawWrite), role) {
		return nil, utils.Forbidden("You do not have permission to post in this category")
	}

	var newID int
	err = database.DB.QueryRowContext(ctx, `
		INSERT INTO forum_posts (category_id, user_id, title, content) 
		VALUES ($1, $2, $3, $4) 
		RETURNING id`,
		categoryID, userID, strings.TrimSpace(req.Title), strings.TrimSpace(req.Content),
	).Scan(&newID)
	if err != nil {
		return nil, err
	}

	var post models.ForumPost
	_ = database.DB.QueryRowContext(ctx, "SELECT id, category_id, user_id, title, content, created_at FROM forum_posts WHERE id = $1", newID).Scan(
		&post.ID, &post.CategoryID, &post.UserID, &post.Title, &post.Content, &post.CreatedAt,
	)

	return &post, nil
}

func (s *ForumService) GetPostDetails(ctx context.Context, postID int, role string) (map[string]any, error) {
	var p models.ForumPost
	var rawRead []byte
	var authorName, authorRole sql.NullString

	err := database.DB.QueryRowContext(ctx, `
		SELECT p.id, p.category_id, p.user_id, p.title, p.content, p.created_at, 
		       u.name as author_name, u.role as author_role, c.read_roles 
		FROM forum_posts p 
		JOIN users u ON p.user_id = u.id 
		JOIN forum_categories c ON p.category_id = c.id 
		WHERE p.id = $1`, postID,
	).Scan(&p.ID, &p.CategoryID, &p.UserID, &p.Title, &p.Content, &p.CreatedAt, &authorName, &authorRole, &rawRead)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, utils.NotFound("Post not found")
		}
		return nil, err
	}

	if !hasRolePermission(json.RawMessage(rawRead), role) {
		return nil, utils.Forbidden("You do not have permission to view this post")
	}

	if authorName.Valid {
		p.AuthorName = &authorName.String
	}
	if authorRole.Valid {
		p.AuthorRole = &authorRole.String
	}

	rows, err := database.DB.QueryContext(ctx, `
		SELECT r.id, r.post_id, r.user_id, r.content, r.created_at, u.name as author_name, u.role as author_role 
		FROM forum_replies r 
		JOIN users u ON r.user_id = u.id 
		WHERE r.post_id = $1 
		ORDER BY r.created_at ASC`, postID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	replies := make([]models.ForumReply, 0)
	for rows.Next() {
		var r models.ForumReply
		var rAuthorName, rAuthorRole sql.NullString
		if err := rows.Scan(&r.ID, &r.PostID, &r.UserID, &r.Content, &r.CreatedAt, &rAuthorName, &rAuthorRole); err != nil {
			return nil, err
		}
		if rAuthorName.Valid {
			r.AuthorName = &rAuthorName.String
		}
		if rAuthorRole.Valid {
			r.AuthorRole = &rAuthorRole.String
		}
		replies = append(replies, r)
	}

	return map[string]any{
		"post":    p,
		"replies": replies,
	}, nil
}

func (s *ForumService) CreateReply(ctx context.Context, postID, userID int, role, content string) (*models.ForumReply, error) {
	var rawWrite []byte
	err := database.DB.QueryRowContext(ctx, `
		SELECT c.write_roles 
		FROM forum_posts p 
		JOIN forum_categories c ON p.category_id = c.id 
		WHERE p.id = $1`, postID,
	).Scan(&rawWrite)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, utils.NotFound("Post not found")
		}
		return nil, err
	}

	if !hasRolePermission(json.RawMessage(rawWrite), role) {
		return nil, utils.Forbidden("You do not have permission to reply in this category")
	}

	var newID int
	err = database.DB.QueryRowContext(ctx, `
		INSERT INTO forum_replies (post_id, user_id, content) 
		VALUES ($1, $2, $3) 
		RETURNING id`,
		postID, userID, strings.TrimSpace(content),
	).Scan(&newID)
	if err != nil {
		return nil, err
	}

	var r models.ForumReply
	var authorName, authorRole sql.NullString
	_ = database.DB.QueryRowContext(ctx, `
		SELECT r.id, r.post_id, r.user_id, r.content, r.created_at, u.name, u.role 
		FROM forum_replies r 
		JOIN users u ON r.user_id = u.id 
		WHERE r.id = $1`, newID,
	).Scan(&r.ID, &r.PostID, &r.UserID, &r.Content, &r.CreatedAt, &authorName, &authorRole)

	if authorName.Valid {
		r.AuthorName = &authorName.String
	}
	if authorRole.Valid {
		r.AuthorRole = &authorRole.String
	}

	return &r, nil
}

func (s *ForumService) UpdateReply(ctx context.Context, replyID, userID int, role, content string) (*models.ForumReply, error) {
	var ownerID int
	err := database.DB.QueryRowContext(ctx, "SELECT user_id FROM forum_replies WHERE id = $1", replyID).Scan(&ownerID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, utils.NotFound("Reply not found")
		}
		return nil, err
	}

	if ownerID != userID && role != "admin" {
		return nil, utils.Forbidden("Not authorized to edit this reply")
	}

	_, err = database.DB.ExecContext(ctx, "UPDATE forum_replies SET content = $1 WHERE id = $2", strings.TrimSpace(content), replyID)
	if err != nil {
		return nil, err
	}

	var r models.ForumReply
	var authorName, authorRole sql.NullString
	_ = database.DB.QueryRowContext(ctx, `
		SELECT r.id, r.post_id, r.user_id, r.content, r.created_at, u.name, u.role 
		FROM forum_replies r 
		JOIN users u ON r.user_id = u.id 
		WHERE r.id = $1`, replyID,
	).Scan(&r.ID, &r.PostID, &r.UserID, &r.Content, &r.CreatedAt, &authorName, &authorRole)

	if authorName.Valid {
		r.AuthorName = &authorName.String
	}
	if authorRole.Valid {
		r.AuthorRole = &authorRole.String
	}

	return &r, nil
}

func (s *ForumService) DeleteReply(ctx context.Context, replyID, userID int, role string) error {
	var ownerID int
	err := database.DB.QueryRowContext(ctx, "SELECT user_id FROM forum_replies WHERE id = $1", replyID).Scan(&ownerID)
	if err != nil {
		if err == sql.ErrNoRows {
			return utils.NotFound("Reply not found")
		}
		return err
	}

	if ownerID != userID && role != "admin" {
		return utils.Forbidden("Not authorized to delete this reply")
	}

	_, err = database.DB.ExecContext(ctx, "DELETE FROM forum_replies WHERE id = $1", replyID)
	return err
}

func (s *ForumService) UpdatePost(ctx context.Context, postID, userID int, role string, req *models.UpdatePostRequest) (*models.ForumPost, error) {
	var ownerID int
	err := database.DB.QueryRowContext(ctx, "SELECT user_id FROM forum_posts WHERE id = $1", postID).Scan(&ownerID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, utils.NotFound("Post not found")
		}
		return nil, err
	}

	if ownerID != userID && role != "admin" {
		return nil, utils.Forbidden("Not authorized to edit this post")
	}

	fields := make([]string, 0)
	args := make([]any, 0)
	argIdx := 1

	if req.Title != nil {
		fields = append(fields, fmt.Sprintf("title = $%d", argIdx))
		args = append(args, strings.TrimSpace(*req.Title))
		argIdx++
	}
	if req.Content != nil {
		fields = append(fields, fmt.Sprintf("content = $%d", argIdx))
		args = append(args, strings.TrimSpace(*req.Content))
		argIdx++
	}

	if len(fields) > 0 {
		args = append(args, postID)
		q := fmt.Sprintf("UPDATE forum_posts SET %s WHERE id = $%d", strings.Join(fields, ", "), argIdx)
		_, err = database.DB.ExecContext(ctx, q, args...)
		if err != nil {
			return nil, err
		}
	}

	var p models.ForumPost
	var authorName, authorRole sql.NullString
	_ = database.DB.QueryRowContext(ctx, `
		SELECT p.id, p.category_id, p.user_id, p.title, p.content, p.created_at, u.name, u.role 
		FROM forum_posts p 
		JOIN users u ON p.user_id = u.id 
		WHERE p.id = $1`, postID,
	).Scan(&p.ID, &p.CategoryID, &p.UserID, &p.Title, &p.Content, &p.CreatedAt, &authorName, &authorRole)

	if authorName.Valid {
		p.AuthorName = &authorName.String
	}
	if authorRole.Valid {
		p.AuthorRole = &authorRole.String
	}

	return &p, nil
}

func (s *ForumService) DeletePost(ctx context.Context, postID, userID int, role string) error {
	var ownerID int
	err := database.DB.QueryRowContext(ctx, "SELECT user_id FROM forum_posts WHERE id = $1", postID).Scan(&ownerID)
	if err != nil {
		if err == sql.ErrNoRows {
			return utils.NotFound("Post not found")
		}
		return err
	}

	if ownerID != userID && role != "admin" {
		return utils.Forbidden("Not authorized to delete this post")
	}

	_, err = database.DB.ExecContext(ctx, "DELETE FROM forum_posts WHERE id = $1", postID)
	return err
}
