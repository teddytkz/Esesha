package db

import (
	"esesha/internal/models"
	"fmt"
	"sort"
	"time"
)

// CreateConnection inserts a new connection into storage
func (s *Store) CreateConnection(conn *models.Connection) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	conn.ID = s.nextID
	conn.CreatedAt = now
	conn.UpdatedAt = now
	s.nextID++

	s.connections = append(s.connections, conn)
	return s.save()
}

// GetConnection retrieves a connection by ID
func (s *Store) GetConnection(id int) (*models.Connection, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, conn := range s.connections {
		if conn.ID == id {
			return conn, nil
		}
	}
	return nil, nil
}

// ListConnections retrieves all connections
func (s *Store) ListConnections() ([]*models.Connection, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]*models.Connection, len(s.connections))
	copy(result, s.connections)

	sort.Slice(result, func(i, j int) bool {
		return result[i].Name < result[j].Name
	})

	return result, nil
}

// UpdateConnection updates an existing connection
func (s *Store) UpdateConnection(conn *models.Connection) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, c := range s.connections {
		if c.ID == conn.ID {
			now := time.Now()
			conn.UpdatedAt = now
			s.connections[i] = conn
			return s.save()
		}
	}

	return fmt.Errorf("connection not found")
}

// DeleteConnection deletes a connection by ID
func (s *Store) DeleteConnection(id int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, conn := range s.connections {
		if conn.ID == id {
			s.connections = append(s.connections[:i], s.connections[i+1:]...)
			return s.save()
		}
	}

	return fmt.Errorf("connection not found")
}
