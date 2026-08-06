package ssh

import (
	"testing"
)

func TestManagerCreation(t *testing.T) {
	m := NewManager()
	if m == nil {
		t.Fatal("NewManager returned nil")
	}
	if m.ActiveSessions() != 0 {
		t.Errorf("expected 0 active sessions, got %d", m.ActiveSessions())
	}
}

func TestSessionTracking(t *testing.T) {
	m := NewManager()
	m.sessions["test-id"] = &Session{ID: "test-id"}
	
	if m.ActiveSessions() != 1 {
		t.Errorf("expected 1 active session, got %d", m.ActiveSessions())
	}
	
	_, exists := m.GetSession("test-id")
	if !exists {
		t.Error("expected session to exist")
	}
	
	_, exists = m.GetSession("nonexistent")
	if exists {
		t.Error("expected session to not exist")
	}
}
