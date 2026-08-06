package sftp

import (
	"fmt"
	"sync"

	"golang.org/x/crypto/ssh"
)

// Manager manages SFTP clients per SSH connection
type Manager struct {
	clients map[string]*Client
	mu      sync.RWMutex
}

// NewManager creates SFTP manager
func NewManager() *Manager {
	return &Manager{
		clients: make(map[string]*Client),
	}
}

// GetOrCreateClient gets existing or creates new SFTP client for SSH connection
func (m *Manager) GetOrCreateClient(sessionID string, sshClient *ssh.Client) (*Client, error) {
	m.mu.RLock()
	client, exists := m.clients[sessionID]
	m.mu.RUnlock()

	if exists {
		return client, nil
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	// Double-check after acquiring write lock
	if client, exists := m.clients[sessionID]; exists {
		return client, nil
	}

	client, err := NewClient(sshClient)
	if err != nil {
		return nil, err
	}

	m.clients[sessionID] = client
	return client, nil
}

// GetClient retrieves SFTP client by session ID
func (m *Manager) GetClient(sessionID string) (*Client, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	client, exists := m.clients[sessionID]
	if !exists {
		return nil, fmt.Errorf("sftp client not found for session %s", sessionID)
	}

	return client, nil
}

// CloseClient closes and removes SFTP client
func (m *Manager) CloseClient(sessionID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	client, exists := m.clients[sessionID]
	if !exists {
		return nil
	}

	err := client.Close()
	delete(m.clients, sessionID)
	return err
}

// CloseAll closes all SFTP clients
func (m *Manager) CloseAll() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, client := range m.clients {
		client.Close()
	}
	m.clients = make(map[string]*Client)
}
