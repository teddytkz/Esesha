package db

import (
	"encoding/json"
	"esesha/internal/models"
	"fmt"
	"log"
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

// legacyConnection represents old format with time.Time timestamps
type legacyConnection struct {
	ID                int       `json:"id"`
	Name              string    `json:"name"`
	Host              string    `json:"host"`
	Port              int       `json:"port"`
	Username          string    `json:"username"`
	EncryptedPassword []byte    `json:"encrypted_password"`
	PrivateKeyPath    string    `json:"privateKeyPath"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

type legacyJsonData struct {
	Connections []*legacyConnection `json:"connections"`
	HostKeys    []HostKey           `json:"host_keys"`
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
	err = json.Unmarshal(data, &jd)
	
	if err == nil {
		// New format succeeded
		s.connections = jd.Connections
		s.hostKeys = jd.HostKeys
		s.updateNextID()
		return nil
	}

	// New format failed → attempt migration
	log.Println("Attempting timestamp migration from legacy format...")
	
	backupPath := s.filePath + ".pre-migration"
	if _, statErr := os.Stat(backupPath); os.IsNotExist(statErr) {
		if backupErr := os.WriteFile(backupPath, data, 0600); backupErr != nil {
			log.Printf("Warning: failed to create backup: %v", backupErr)
		} else {
			log.Printf("Created backup at %s", backupPath)
		}
	}

	var legacyData legacyJsonData
	if err := json.Unmarshal(data, &legacyData); err != nil {
		return fmt.Errorf("failed to parse JSON (tried both formats): %w", err)
	}

	s.connections = make([]*models.Connection, len(legacyData.Connections))
	for i, legacy := range legacyData.Connections {
		s.connections[i] = &models.Connection{
			ID:                legacy.ID,
			Name:              legacy.Name,
			Host:              legacy.Host,
			Port:              legacy.Port,
			Username:          legacy.Username,
			EncryptedPassword: legacy.EncryptedPassword,
			PrivateKeyPath:    legacy.PrivateKeyPath,
			CreatedAt:         convertTimestamp(legacy.CreatedAt),
			UpdatedAt:         convertTimestamp(legacy.UpdatedAt),
		}
	}
	s.hostKeys = legacyData.HostKeys
	s.updateNextID()

	if err := s.save(); err != nil {
		return fmt.Errorf("migration completed but failed to save: %w", err)
	}

	log.Printf("Successfully migrated %d connections to new format", len(s.connections))
	return nil
}

func (s *Store) updateNextID() {
	for _, conn := range s.connections {
		if conn.ID >= s.nextID {
			s.nextID = conn.ID + 1
		}
	}
}

func convertTimestamp(t time.Time) int64 {
	if t.IsZero() {
		return time.Now().Unix()
	}
	return t.Unix()
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
