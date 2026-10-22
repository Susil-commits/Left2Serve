package sockets

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"left2serve/backend/config"
	"left2serve/backend/database"
	"left2serve/backend/middleware"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // CORS is verified or allowed
	},
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type SocketClient struct {
	ID        string
	Conn      *websocket.Conn
	UserID    int
	UserRole  string
	Rooms     map[string]bool
	sendChan  chan string
	mu        sync.Mutex
	isClosed  bool
}

type SocketServer struct {
	cfg     *config.Config
	clients map[string]*SocketClient
	rooms   map[string]map[string]*SocketClient
	mu      sync.RWMutex
}

var GlobalSocketServer *SocketServer

func InitSocketServer(cfg *config.Config) *SocketServer {
	srv := &SocketServer{
		cfg:     cfg,
		clients: make(map[string]*SocketClient),
		rooms:   make(map[string]map[string]*SocketClient),
	}
	GlobalSocketServer = srv
	return srv
}

func (s *SocketServer) RegisterClient(client *SocketClient) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.clients[client.ID] = client
}

func (s *SocketServer) UnregisterClient(client *SocketClient) {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.clients, client.ID)
	for room := range client.Rooms {
		if s.rooms[room] != nil {
			delete(s.rooms[room], client.ID)
			if len(s.rooms[room]) == 0 {
				delete(s.rooms, room)
			}
		}
	}
}

func (s *SocketServer) JoinRoom(client *SocketClient, room string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	client.mu.Lock()
	client.Rooms[room] = true
	client.mu.Unlock()

	if s.rooms[room] == nil {
		s.rooms[room] = make(map[string]*SocketClient)
	}
	s.rooms[room][client.ID] = client
}

func (s *SocketServer) EmitToRoom(room, event string, payload any) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	clients := s.rooms[room]
	if len(clients) == 0 {
		return
	}

	raw, err := json.Marshal([]any{event, payload})
	if err != nil {
		return
	}
	msg := "42" + string(raw)

	for _, c := range clients {
		c.SendMessage(msg)
	}
}

func (s *SocketServer) EmitToUser(userID int, event string, payload any) {
	s.EmitToRoom(fmt.Sprintf("user_%d", userID), event, payload)
}

func (s *SocketServer) EmitAll(event string, payload any) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	raw, err := json.Marshal([]any{event, payload})
	if err != nil {
		return
	}
	msg := "42" + string(raw)

	for _, c := range s.clients {
		c.SendMessage(msg)
	}
}

func (c *SocketClient) SendMessage(msg string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.isClosed {
		return
	}

	select {
	case c.sendChan <- msg:
	default:
		// Drop message if channel is full to prevent hanging
	}
}

func (c *SocketClient) Close() {
	c.mu.Lock()
	if c.isClosed {
		c.mu.Unlock()
		return
	}
	c.isClosed = true
	close(c.sendChan)
	if c.Conn != nil {
		_ = c.Conn.Close()
	}
	c.mu.Unlock()
}

func (s *SocketServer) HandleSocketIO(c *gin.Context) {
	transport := c.Query("transport")

	// If HTTP Long-Polling
	if transport == "polling" {
		s.handlePolling(c)
		return
	}

	// If WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v\n", err)
		return
	}

	client := &SocketClient{
		ID:       uuid.New().String(),
		Conn:     conn,
		Rooms:    make(map[string]bool),
		sendChan: make(chan string, 64),
	}

	s.RegisterClient(client)
	defer func() {
		s.UnregisterClient(client)
		client.Close()
	}()

	// Send Engine.IO v4 handshake packet
	handshake := fmt.Sprintf(`0{"sid":"%s","upgrades":[],"pingInterval":25000,"pingTimeout":20000,"maxPayload":1000000}`, client.ID)
	_ = conn.WriteMessage(websocket.TextMessage, []byte(handshake))

	// Write pump
	go func() {
		ticker := time.NewTicker(20 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case msg, ok := <-client.sendChan:
				if !ok {
					return
				}
				_ = conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
				if err := conn.WriteMessage(websocket.TextMessage, []byte(msg)); err != nil {
					return
				}
			case <-ticker.C:
				_ = conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
				// Engine.IO ping
				if err := conn.WriteMessage(websocket.TextMessage, []byte("2")); err != nil {
					return
				}
			}
		}
	}()

	// Read pump
	_ = conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.SetPongHandler(func(string) error {
		_ = conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			break
		}
		_ = conn.SetReadDeadline(time.Now().Add(60 * time.Second))

		s.processPacket(client, string(message))
	}
}

func (s *SocketServer) handlePolling(c *gin.Context) {
	sid := c.Query("sid")
	if c.Request.Method == http.MethodGet {
		if sid == "" {
			newSid := uuid.New().String()
			handshake := fmt.Sprintf(`0{"sid":"%s","upgrades":["websocket"],"pingInterval":25000,"pingTimeout":20000,"maxPayload":1000000}`, newSid)
			c.Header("Content-Type", "text/plain; charset=UTF-8")
			c.String(http.StatusOK, handshake)
			return
		}

		c.Header("Content-Type", "text/plain; charset=UTF-8")
		c.String(http.StatusOK, "1") // close or no-op poll response to force websocket upgrade
		return
	}

	if c.Request.Method == http.MethodPost {
		c.Header("Content-Type", "text/plain; charset=UTF-8")
		c.String(http.StatusOK, "ok")
		return
	}
}

func (s *SocketServer) processPacket(client *SocketClient, packet string) {
	if packet == "2" {
		// Ping from client -> respond with pong
		client.SendMessage("3")
		return
	}
	if packet == "3" {
		// Pong from client
		return
	}

	// Socket.IO CONNECT packet (e.g. 40 or 40{"token":"..."})
	if strings.HasPrefix(packet, "40") {
		authData := strings.TrimPrefix(packet, "40")
		token := ""

		if authData != "" {
			var authPayload struct {
				Token string `json:"token"`
			}
			if err := json.Unmarshal([]byte(authData), &authPayload); err == nil && authPayload.Token != "" {
				token = authPayload.Token
			}
		}

		if token != "" {
			claims, err := middleware.VerifyToken(token, s.cfg)
			if err == nil {
				client.UserID = claims.ID
				client.UserRole = claims.Role
				s.JoinRoom(client, fmt.Sprintf("user_%d", claims.ID))
			}
		}

		// Acknowledge connect
		client.SendMessage(fmt.Sprintf(`40{"sid":"%s"}`, client.ID))
		return
	}

	// Socket.IO EVENT packet (starts with 42)
	if strings.HasPrefix(packet, "42") {
		eventData := strings.TrimPrefix(packet, "42")
		var rawEvents []json.RawMessage
		if err := json.Unmarshal([]byte(eventData), &rawEvents); err != nil || len(rawEvents) == 0 {
			return
		}

		var eventName string
		if err := json.Unmarshal(rawEvents[0], &eventName); err != nil {
			return
		}

		switch eventName {
		case "join_reservation":
			if len(rawEvents) < 2 {
				return
			}
			var resID int
			if err := json.Unmarshal(rawEvents[1], &resID); err != nil || resID <= 0 {
				return
			}

			// Validate user has permission for this reservation
			var resUserID, foodListingID int
			err := database.DB.QueryRow("SELECT user_id, food_listing_id FROM reservations WHERE id = $1", resID).Scan(&resUserID, &foodListingID)
			if err != nil {
				return
			}

			var donorID int
			_ = database.DB.QueryRow("SELECT user_id FROM food_listings WHERE id = $1", foodListingID).Scan(&donorID)

			isReserver := client.UserID == resUserID
			isDonor := client.UserID == donorID
			isAdmin := client.UserRole == "admin"

			if isReserver || isDonor || isAdmin {
				s.JoinRoom(client, fmt.Sprintf("reservation_%d", resID))
			}

		case "send_message":
			if len(rawEvents) < 2 || client.UserID == 0 {
				return
			}

			var payload struct {
				ReservationID int    `json:"reservationId"`
				Content       string `json:"content"`
			}
			if err := json.Unmarshal(rawEvents[1], &payload); err != nil || payload.ReservationID <= 0 {
				return
			}

			roomName := fmt.Sprintf("reservation_%d", payload.ReservationID)
			client.mu.Lock()
			hasRoom := client.Rooms[roomName]
			client.mu.Unlock()

			if !hasRoom {
				return
			}

			content := strings.TrimSpace(payload.Content)
			if content == "" {
				return
			}
			if len(content) > 2000 {
				content = content[:2000]
			}

			// Insert into messages table
			var msgID int
			err := database.DB.QueryRow(`
				INSERT INTO messages (reservation_id, sender_id, content) 
				VALUES ($1, $2, $3) RETURNING id`,
				payload.ReservationID, client.UserID, content,
			).Scan(&msgID)
			if err != nil {
				log.Printf("Failed to insert message: %v\n", err)
				return
			}

			var senderName string
			_ = database.DB.QueryRow("SELECT name FROM users WHERE id = $1", client.UserID).Scan(&senderName)

			msgObj := map[string]any{
				"id":             msgID,
				"reservation_id": payload.ReservationID,
				"sender_id":      client.UserID,
				"sender_name":    senderName,
				"content":        content,
				"created_at":     time.Now().UTC().Format(time.RFC3339),
			}

			s.EmitToRoom(roomName, "new_message", msgObj)
		}
	}
}
