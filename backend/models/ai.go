package models

type DescribeRequest struct {
	Title    string `json:"title" binding:"required"`
	Category string `json:"category" binding:"required"`
}

type DescribeResponse struct {
	Description string `json:"description"`
}

type ChatMessage struct {
	Role string `json:"role"`
	Text string `json:"text"`
}

type ChatRequest struct {
	Message string        `json:"message" binding:"required"`
	History []ChatMessage `json:"history"`
}

type GuardedChatResponse struct {
	Text               string `json:"text"`
	GuardrailTriggered bool   `json:"guardrailTriggered"`
	Category           string `json:"category,omitempty"`
	Reason             string `json:"reason,omitempty"`
}

type AnalyzeImageRequest struct {
	ImageURL string `json:"imageUrl" binding:"required"`
}

type AnalyzeImageResponse struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"`
}
