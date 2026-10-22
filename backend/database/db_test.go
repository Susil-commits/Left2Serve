package database

import (
	"testing"
)

func TestConvertSQLPlaceholders(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "No placeholders",
			input:    "SELECT * FROM users",
			expected: "SELECT * FROM users",
		},
		{
			name:     "Single placeholder",
			input:    "SELECT * FROM users WHERE id = ?",
			expected: "SELECT * FROM users WHERE id = $1",
		},
		{
			name:     "Multiple placeholders",
			input:    "INSERT INTO items (name, qty, price) VALUES (?, ?, ?)",
			expected: "INSERT INTO items (name, qty, price) VALUES ($1, $2, $3)",
		},
		{
			name:     "Question mark inside string literal",
			input:    "SELECT * FROM faq WHERE question = 'Is this food?' AND active = ?",
			expected: "SELECT * FROM faq WHERE question = 'Is this food?' AND active = $1",
		},
		{
			name:     "Escaped quotes inside string literal",
			input:    "SELECT * FROM notes WHERE title = 'It''s fine?' AND user_id = ?",
			expected: "SELECT * FROM notes WHERE title = 'It''s fine?' AND user_id = $1",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ConvertSQLPlaceholders(tt.input)
			if got != tt.expected {
				t.Errorf("ConvertSQLPlaceholders(%q) = %q, expected %q", tt.input, got, tt.expected)
			}
		})
	}
}
