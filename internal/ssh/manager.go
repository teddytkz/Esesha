package ssh

import (
	"fmt"
	"io"
	"sync"

	"github.com/google/uuid"
	"golang.org/x/crypto/ssh"
)

// Manager manages multiple SSH sessions
type Manager struct {
	sessions       map[string]*Session
	clients        map[string]*Client
	mu             sync.RWMutex
	onOutput       func(sessionID string, data []byte)
	onError        func(sessionID string, err error)
	onClose        func(sessionID string)
	hostKeyStore   HostKeyStore
	hostKeyHandler *HostKeyCallback
}

// NewManager creates session manager
func NewManager() *Manager {
	return &Manager{
		sessions: make(map[string]*Session),
		clients:  make(map[string]*Client),
	}
}

// SetHostKeyStore sets the host key store for verification
func (m *Manager) SetHostKeyStore(store HostKeyStore) {
	m.hostKeyStore = store
	m.hostKeyHandler = NewHostKeyCallback(store)
}

// SetCallbacks sets event callbacks
func (m *Manager) SetCallbacks(onOutput func(string, []byte), onError func(string, error), onClose func(string)) {
	m.onOutput = onOutput
	m.onError = onError
	m.onClose = onClose
}

// SetHostKeyCallbacks sets user interaction callbacks for host key verification
func (m *Manager) SetHostKeyCallbacks(
	onNewHost func(hostname, fingerprint string) (bool, error),
	onKeyMoved func(hostname, fingerprint, oldFingerprint string) (bool, error),
) {
	if m.hostKeyHandler != nil {
		m.hostKeyHandler.SetCallbacks(onNewHost, onKeyMoved)
	}
}

// Connect establishes SSH connection and starts PTY session
func (m *Manager) Connect(host string, port int, username, password, privateKeyPath string, cols, rows int) (string, error) {
	return m.ConnectWithPassphrase(host, port, username, password, privateKeyPath, "", cols, rows)
}

// ConnectWithPassphrase establishes SSH connection with optional key passphrase
func (m *Manager) ConnectWithPassphrase(host string, port int, username, password, privateKeyPath, keyPassphrase string, cols, rows int) (string, error) {
	var client *Client
	var err error

	// Use host key verification if store is configured
	var hostKeyCallback ssh.HostKeyCallback = ssh.InsecureIgnoreHostKey()
	if m.hostKeyHandler != nil {
		hostKeyCallback = m.hostKeyHandler.Callback
	}

	if privateKeyPath != "" {
		client, err = NewClientWithKeyPassphraseAndHostKey(host, port, username, privateKeyPath, keyPassphrase, hostKeyCallback)
	} else {
		client, err = NewClientWithHostKeyCallback(host, port, username, password, "", hostKeyCallback)
	}

	if err != nil {
		return "", err
	}

	sessionID := uuid.New().String()

	session, err := NewSession(sessionID, client, TerminalModes{
		Cols:   cols,
		Rows:   rows,
		Width:  cols * 8,
		Height: rows * 16,
	})

	if err != nil {
		client.Close()
		return "", err
	}

	m.mu.Lock()
	m.sessions[sessionID] = session
	m.clients[sessionID] = client
	m.mu.Unlock()

	// Start output streaming
	go m.streamOutput(sessionID, session)

	// Monitor session completion
	go func() {
		err := session.Wait()
		if err != nil && m.onError != nil {
			m.onError(sessionID, err)
		}
		m.Disconnect(sessionID)
		if m.onClose != nil {
			m.onClose(sessionID)
		}
	}()

	return sessionID, nil
}

// streamOutput reads from session and emits to callback
func (m *Manager) streamOutput(sessionID string, session *Session) {
	buf := make([]byte, 8192)
	for {
		n, err := session.Read(buf)
		if err != nil {
			if err != io.EOF && m.onError != nil {
				m.onError(sessionID, fmt.Errorf("read failed: %w", err))
			}
			return
		}

		if n > 0 && m.onOutput != nil {
			data := make([]byte, n)
			copy(data, buf[:n])
			m.onOutput(sessionID, data)
		}
	}
}

// SendInput sends input to session
func (m *Manager) SendInput(sessionID string, data []byte) error {
	m.mu.RLock()
	session, exists := m.sessions[sessionID]
	m.mu.RUnlock()

	if !exists {
		return fmt.Errorf("session not found: %s", sessionID)
	}

	return session.Write(data)
}

// Resize resizes terminal
func (m *Manager) Resize(sessionID string, cols, rows int) error {
	m.mu.RLock()
	session, exists := m.sessions[sessionID]
	m.mu.RUnlock()

	if !exists {
		return fmt.Errorf("session not found: %s", sessionID)
	}

	return session.Resize(cols, rows)
}

// Disconnect closes session and client
func (m *Manager) Disconnect(sessionID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	session, sessionExists := m.sessions[sessionID]
	client, clientExists := m.clients[sessionID]

	if sessionExists {
		delete(m.sessions, sessionID)
		session.Close()
	}

	if clientExists {
		delete(m.clients, sessionID)
		client.Close()
	}

	if !sessionExists && !clientExists {
		return fmt.Errorf("session not found: %s", sessionID)
	}

	return nil
}

// DisconnectAll closes all sessions
func (m *Manager) DisconnectAll() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for id, session := range m.sessions {
		session.Close()
		delete(m.sessions, id)
	}

	for id, client := range m.clients {
		client.Close()
		delete(m.clients, id)
	}
}

// GetSession retrieves session by ID
func (m *Manager) GetSession(sessionID string) (*Session, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	session, exists := m.sessions[sessionID]
	return session, exists
}

// ActiveSessions returns count of active sessions
func (m *Manager) ActiveSessions() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.sessions)
}

// GetSSHClient returns SSH client for session (used by SFTP)
func (m *Manager) GetSSHClient(sessionID string) (*Client, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	client, exists := m.clients[sessionID]
	if !exists {
		return nil, fmt.Errorf("session not found")
	}
	return client, nil
}
