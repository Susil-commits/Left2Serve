package database

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/url"
	"regexp"
	"strings"
	"time"

	_ "github.com/lib/pq"
	"left2serve/backend/config"
)

var DB *sql.DB

func Connect(cfg *config.Config) (*sql.DB, error) {
	var connStr string

	if cfg.DatabaseURL != "" {
		connStr = cfg.DatabaseURL
		if cfg.DBSSL && !strings.Contains(connStr, "sslmode=") {
			if strings.Contains(connStr, "?") {
				connStr += "&sslmode=require"
			} else {
				connStr += "?sslmode=require"
			}
		} else if !strings.Contains(connStr, "sslmode=") {
			if strings.Contains(connStr, "?") {
				connStr += "&sslmode=disable"
			} else {
				connStr += "?sslmode=disable"
			}
		}
	} else {
		sslMode := "disable"
		if cfg.DBSSL || strings.Contains(cfg.DBHost, "supabase.co") || strings.Contains(cfg.DBHost, "supabase.com") {
			sslMode = "require"
		}
		u := url.URL{
			Scheme: "postgres",
			User:   url.UserPassword(cfg.DBUser, cfg.DBPassword),
			Host:   fmt.Sprintf("%s:%d", cfg.DBHost, cfg.DBPort),
			Path:   cfg.DBName,
		}
		q := u.Query()
		q.Set("sslmode", sslMode)
		u.RawQuery = q.Encode()
		connStr = u.String()
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	DB = db
	log.Println("Connected to PostgreSQL database successfully")
	return db, nil
}

// ConvertSQLPlaceholders converts '?' placeholders to '$1', '$2', ... for PostgreSQL.
func ConvertSQLPlaceholders(query string) string {
	if !strings.Contains(query, "?") {
		return query
	}

	var sb strings.Builder
	idx := 1
	inString := false

	runes := []rune(query)
	for i := 0; i < len(runes); i++ {
		r := runes[i]
		if r == '\'' {
			if inString && i+1 < len(runes) && runes[i+1] == '\'' {
				sb.WriteRune('\'')
				sb.WriteRune('\'')
				i++
				continue
			}
			inString = !inString
			sb.WriteRune(r)
			continue
		}

		if r == '?' && !inString {
			sb.WriteString(fmt.Sprintf("$%d", idx))
			idx++
		} else {
			sb.WriteRune(r)
		}
	}

	return sb.String()
}

// QueryRow runs a single-row query converting '?' to '$N'
func QueryRow(ctx context.Context, query string, args ...any) *sql.Row {
	return DB.QueryRowContext(ctx, ConvertSQLPlaceholders(query), args...)
}

// Query runs a multi-row query converting '?' to '$N'
func Query(ctx context.Context, query string, args ...any) (*sql.Rows, error) {
	return DB.QueryContext(ctx, ConvertSQLPlaceholders(query), args...)
}

// Exec runs a non-query command converting '?' to '$N'
func Exec(ctx context.Context, query string, args ...any) (sql.Result, error) {
	return DB.ExecContext(ctx, ConvertSQLPlaceholders(query), args...)
}

// Insert runs an INSERT statement and returns the generated integer ID
func Insert(ctx context.Context, query string, args ...any) (int, error) {
	q := ConvertSQLPlaceholders(query)
	re := regexp.MustCompile(`(?i)\bRETURNING\b`)
	if !re.MatchString(q) {
		q += " RETURNING id"
	}

	var id int
	err := DB.QueryRowContext(ctx, q, args...).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

// InsertTx runs an INSERT within a transaction and returns the generated integer ID
func InsertTx(ctx context.Context, tx *sql.Tx, query string, args ...any) (int, error) {
	q := ConvertSQLPlaceholders(query)
	re := regexp.MustCompile(`(?i)\bRETURNING\b`)
	if !re.MatchString(q) {
		q += " RETURNING id"
	}

	var id int
	err := tx.QueryRowContext(ctx, q, args...).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

// WithTransaction wraps execution in a database transaction
func WithTransaction(ctx context.Context, fn func(tx *sql.Tx) error) error {
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback()
			panic(p)
		}
	}()

	if err := fn(tx); err != nil {
		_ = tx.Rollback()
		return err
	}

	return tx.Commit()
}
