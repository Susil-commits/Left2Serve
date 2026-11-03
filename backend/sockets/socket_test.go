package sockets

import (
	"encoding/json"
	"testing"

	"left2serve/backend/config"
)

func TestSocketServerRegistrationAndRooms(t *testing.T) {
	cfg := &config.Config{}
	srv := InitSocketServer(cfg)

	if srv.nodeID == "" {
		t.Fatal("Expected socket server to have a generated nodeID")
	}

	client := &SocketClient{
		ID:       "client-1",
		UserID:   42,
		Rooms:    make(map[string]bool),
		sendChan: make(chan string, 10),
	}

	srv.RegisterClient(client)

	srv.mu.RLock()
	if srv.clients["client-1"] != client {
		t.Errorf("Expected client to be registered")
	}
	srv.mu.RUnlock()

	// Join room
	srv.JoinRoom(client, "reservation_99")

	srv.mu.RLock()
	if srv.rooms["reservation_99"]["client-1"] != client {
		t.Errorf("Expected client to be in room reservation_99")
	}
	srv.mu.RUnlock()

	// Emit to room
	testPayload := map[string]string{"text": "hello"}
	srv.EmitToRoom("reservation_99", "chat_msg", testPayload)

	select {
	case msg := <-client.sendChan:
		if len(msg) < 2 || msg[:2] != "42" {
			t.Errorf("Expected Socket.IO 42 packet, got %s", msg)
		}
		var parsed []any
		if err := json.Unmarshal([]byte(msg[2:]), &parsed); err != nil {
			t.Fatalf("Failed to parse packet payload: %v", err)
		}
		if parsed[0] != "chat_msg" {
			t.Errorf("Expected event name chat_msg, got %v", parsed[0])
		}
	default:
		t.Errorf("Expected message to be sent to client channel")
	}

	// Unregister client
	srv.UnregisterClient(client)

	srv.mu.RLock()
	if _, exists := srv.clients["client-1"]; exists {
		t.Errorf("Expected client to be unregistered")
	}
	if len(srv.rooms["reservation_99"]) != 0 {
		t.Errorf("Expected room to be empty after unregistering client")
	}
	srv.mu.RUnlock()
}

