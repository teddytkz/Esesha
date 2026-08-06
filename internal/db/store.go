package db

import (
	"encoding/json"
	"esesha/internal/models"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type Store struct {
	mu          sync.RWMutex
	filePath    string
	connections []*models.Connection
	hostKeys    []HostKey
	nextID      int
}

type HostKey struct {
	Hostname    string    `json:"hostname"`
	Fingerprint string    `json:"fingerprint"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type jsonData struct {
	Connections []*models.Connection `json:"connections"`
	HostKeys    []HostKey            `json:"host_keys"`
}

// New creates a new store with JSON file storage
func New() (*Store, error) {
	exePath, err := os.Executable()
	if err != nil {
		return nil, fmt.Errorf("failed to get executable path: %w", err)
	}

	exeDir := filepath.Dir(exePath)
	jsonPath := filepath.Join(exeDir, "connections.json")

	store := &Store{
		filePath:    jsonPath,
		connections: []*models.Connection{},
		hostKeys:    []HostKey{},
		nextID:      1,
	}

	if err := store.load(); err != nil {
		return nil, err
	}

	return store, nil
}

func (s *Store) load() error {
	data, err := os.ReadFile(s.filePath)
	if os.IsNotExist(err) {
		return s.save()
	}
	if err != nil {
		return fmt.Errorf("failed to read file: %w", err)
	}

	var jd jsonData
	if err := json.Unmarshal(data, &jd); err != nil {
		return fmt.Errorf("failed to parse JSON: %w", err)
	}

	s.connections = jd.Connections
	s.hostKeys = jd.HostKeys

	for _, conn := range s.connections {
		if conn.ID >= s.nextID {
			s.nextID = conn.ID + 1
		}
	}

	return nil
}

func (s *Store) save() error {
	jd := jsonData{
		Connections: s.connections,
		HostKeys:    s.hostKeys,
	}

	data, err := json.MarshalIndent(jd, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal JSON: %w", err)
	}

	tmpPath := s.filePath + ".tmp"
	if err := os.WriteFile(tmpPath, data, 0600); err != nil {
		return fmt.Errorf("failed to write temp file: %w", err)
	}

	if err := os.Rename(tmpPath, s.filePath); err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("failed to rename temp file: %w", err)
	}

	return nil
}

func (s *Store) Close() error {
	return nil
}

// GetHostKey retrieves stored host key fingerprint
func (s *Store) GetHostKey(hostname string) (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, hk := range s.hostKeys {
		if hk.Hostname == hostname {
			return hk.Fingerprint, nil
		}
	}
	return "", nil
}

// SaveHostKey stores host key fingerprint
func (s *Store) SaveHostKey(hostname, fingerprint string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, hk := range s.hostKeys {
		if hk.Hostname == hostname {
			s.hostKeys[i].Fingerprint = fingerprint
			s.hostKeys[i].UpdatedAt = time.Now()
			return s.save()
		}
	}

	s.hostKeys = append(s.hostKeys, HostKey{
		Hostname:    hostname,
		Fingerprint: fingerprint,
		UpdatedAt:   time.Now(),
	})

	return s.save()
}
