package db

import (
	"encoding/json"
	"esesha/internal/crypto"
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
	encryptKey  []byte
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

// exportConnection represents connection with plain text password for backup
type exportConnection struct {
	ID                  int    `json:"id"`
	Name                string `json:"name"`
	Host                string `json:"host"`
	Port                int    `json:"port"`
	Username            string `json:"username"`
	Password            string `json:"password"`
	PrivateKeyPath      string `json:"privateKeyPath"`
	EncryptedPrivateKey []byte `json:"encrypted_private_key"` // Machine-bound DPAPI; preserved as-is for security
	CreatedAt           int64  `json:"createdAt"`
	UpdatedAt           int64  `json:"updatedAt"`
}

type exportData struct {
	Connections []*exportConnection `json:"connections"`
	HostKeys    []HostKey           `json:"host_keys"`
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
	jsonPath := filepath.Join(exeDir, "esesha.bin")
	keyPath := jsonPath + ".key"

	// Derive machine-bound encryption key
	key, err := deriveMachineKey(exeDir)
	if err != nil {
		return nil, fmt.Errorf("failed to derive machine key: %w", err)
	}

	// Check for migration from old .key file
	if err := migrateFromKeyFile(keyPath, jsonPath, key); err != nil {
		return nil, fmt.Errorf("failed to migrate from key file: %w", err)
	}

	store := &Store{
		filePath:    jsonPath,
		encryptKey:  key,
		connections: []*models.Connection{},
		hostKeys:    []HostKey{},
		nextID:      1,
	}

	// Migrate from old filename if needed
	if err := migrateFromConnectionsJSON(exeDir, jsonPath); err != nil {
		return nil, err
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

	// Detect format
	isBinary, err := detectFormat(data)
	if err != nil {
		return fmt.Errorf("failed to detect format: %w", err)
	}

	var jsonBytes []byte

	if isBinary {
		// Decrypt binary format
		decrypted, err := decryptData(data, s.encryptKey)
		if err != nil {
			return fmt.Errorf("failed to decrypt storage file: %w", err)
		}
		jsonBytes = decrypted
		log.Println("Loaded encrypted binary format")
	} else {
		// JSON format (migration needed)
		jsonBytes = data
		log.Println("Loaded JSON format, will migrate to binary on next save")

		// Create pre-binary-migration backup
		// Note: This backup is created when migrating JSON plaintext → binary encrypted format.
		// This is separate from .pre-migration (connections.json → esesha.bin rename).
		backupPath := s.filePath + ".pre-binary-migration"
		if _, statErr := os.Stat(backupPath); os.IsNotExist(statErr) {
			if backupErr := os.WriteFile(backupPath, data, 0600); backupErr != nil {
				log.Printf("Warning: failed to create pre-binary-migration backup: %v", backupErr)
			} else {
				log.Printf("Created pre-binary-migration backup at %s", backupPath)
			}
		}
	}

	// Try new format first
	var jd jsonData
	err = json.Unmarshal(jsonBytes, &jd)

	if err == nil {
		s.connections = jd.Connections
		s.hostKeys = jd.HostKeys
		s.updateNextID()
		return nil
	}

	// New format failed → attempt timestamp migration
	return migrateLegacyTimestamps(s, jsonBytes)
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

	// Encrypt data
	encrypted, err := encryptData(data, s.encryptKey)
	if err != nil {
		return fmt.Errorf("failed to encrypt data: %w", err)
	}

	tmpPath := s.filePath + ".tmp"
	if err := os.WriteFile(tmpPath, encrypted, 0600); err != nil {
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

// ExportJSON exports connections and host keys to a JSON file at the specified path
func (s *Store) ExportJSON(path string) error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Decrypt passwords for export
	exportConns := make([]*exportConnection, 0, len(s.connections))
	for _, conn := range s.connections {
		ec := &exportConnection{
			ID:                  conn.ID,
			Name:                conn.Name,
			Host:                conn.Host,
			Port:                conn.Port,
			Username:            conn.Username,
			PrivateKeyPath:      conn.PrivateKeyPath,
			EncryptedPrivateKey: conn.EncryptedPrivateKey,
			CreatedAt:           conn.CreatedAt,
			UpdatedAt:           conn.UpdatedAt,
		}

		// Decrypt password if exists
		if len(conn.EncryptedPassword) > 0 {
			decrypted, err := crypto.Decrypt(conn.EncryptedPassword)
			if err != nil {
				log.Printf("Warning: failed to decrypt password for connection %s: %v", conn.Name, err)
			} else {
				ec.Password = string(decrypted)
			}
		}

		exportConns = append(exportConns, ec)
	}

	ed := exportData{
		Connections: exportConns,
		HostKeys:    s.hostKeys,
	}

	data, err := json.MarshalIndent(ed, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal JSON: %w", err)
	}

	tmpPath := path + ".tmp"
	if err := os.WriteFile(tmpPath, data, 0600); err != nil {
		return fmt.Errorf("failed to write temp file: %w", err)
	}

	if err := os.Rename(tmpPath, path); err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("failed to rename temp file: %w", err)
	}

	return nil
}

// ImportJSON imports connections and host keys from a JSON file at the specified path
func (s *Store) ImportJSON(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("failed to read file: %w", err)
	}

	// Try to parse as export format (with plain text passwords)
	var ed exportData
	if err := json.Unmarshal(data, &ed); err == nil && len(ed.Connections) > 0 {
		s.mu.Lock()
		defer s.mu.Unlock()

		// Import connections with password encryption
		for _, ec := range ed.Connections {
			now := time.Now()
			conn := &models.Connection{
				ID:                  s.nextID,
				Name:                ec.Name,
				Host:                ec.Host,
				Port:                ec.Port,
				Username:            ec.Username,
				PrivateKeyPath:      ec.PrivateKeyPath,
				EncryptedPrivateKey: ec.EncryptedPrivateKey,
				CreatedAt:           now.Unix(),
				UpdatedAt:           now.Unix(),
			}

			// Encrypt password if exists
			if ec.Password != "" {
				encrypted, err := crypto.Encrypt([]byte(ec.Password))
				if err != nil {
					log.Printf("Warning: failed to encrypt password for connection %s: %v", ec.Name, err)
				} else {
					conn.EncryptedPassword = encrypted
				}
			}

			s.nextID++
			s.connections = append(s.connections, conn)
		}

		// Import host keys
		for _, hk := range ed.HostKeys {
			found := false
			for i, existingHk := range s.hostKeys {
				if existingHk.Hostname == hk.Hostname {
					s.hostKeys[i].Fingerprint = hk.Fingerprint
					s.hostKeys[i].UpdatedAt = time.Now()
					found = true
					break
				}
			}

			if !found {
				hk.UpdatedAt = time.Now()
				s.hostKeys = append(s.hostKeys, hk)
			}
		}

		return s.save()
	}

	// Fallback: try old format with encrypted passwords
	var jd jsonData
	if err := json.Unmarshal(data, &jd); err != nil {
		return fmt.Errorf("failed to unmarshal JSON: %w", err)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// Import connections with existing encrypted passwords
	for _, conn := range jd.Connections {
		now := time.Now()
		newConn := &models.Connection{
			ID:                s.nextID,
			Name:              conn.Name,
			Host:              conn.Host,
			Port:              conn.Port,
			Username:          conn.Username,
			EncryptedPassword: conn.EncryptedPassword,
			PrivateKeyPath:    conn.PrivateKeyPath,
			CreatedAt:         now.Unix(),
			UpdatedAt:         now.Unix(),
		}
		s.nextID++
		s.connections = append(s.connections, newConn)
	}

	// Import host keys
	for _, hk := range jd.HostKeys {
		// Check if hostname already exists
		found := false
		for i, existingHk := range s.hostKeys {
			if existingHk.Hostname == hk.Hostname {
				s.hostKeys[i].Fingerprint = hk.Fingerprint
				s.hostKeys[i].UpdatedAt = time.Now()
				found = true
				break
			}
		}

		if !found {
			hk.UpdatedAt = time.Now()
			s.hostKeys = append(s.hostKeys, hk)
		}
	}

	return s.save()
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

// migrateFromConnectionsJSON handles migration from connections.json → esesha.bin
// Note: .pre-migration backup is created here to protect original connections.json
func migrateFromConnectionsJSON(exeDir, jsonPath string) error {
	oldPath := filepath.Join(exeDir, "connections.json")
	if _, err := os.Stat(oldPath); err == nil {
		if _, err := os.Stat(jsonPath); os.IsNotExist(err) {
			log.Printf("Migrating from connections.json to esesha.bin...")
			backupPath := oldPath + ".pre-migration"
			if data, readErr := os.ReadFile(oldPath); readErr == nil {
				if writeErr := os.WriteFile(backupPath, data, 0600); writeErr != nil {
					log.Printf("Warning: failed to create pre-migration backup: %v", writeErr)
				} else {
					log.Printf("Created backup at %s", backupPath)
				}
			}
			if renameErr := os.Rename(oldPath, jsonPath); renameErr != nil {
				return fmt.Errorf("failed to migrate connections.json: %w", renameErr)
			}
			log.Println("Migration complete")
		}
	}
	return nil
}

// migrateLegacyTimestamps handles migration from time.Time → Unix timestamp format
// Note: Creates .pre-migration backup if it doesn't exist (for timestamp migration only)
func migrateLegacyTimestamps(s *Store, jsonBytes []byte) error {
	log.Println("Attempting timestamp migration from legacy format...")

	backupPath := s.filePath + ".pre-migration"
	if _, statErr := os.Stat(backupPath); os.IsNotExist(statErr) {
		if backupErr := os.WriteFile(backupPath, jsonBytes, 0600); backupErr != nil {
			log.Printf("Warning: failed to create backup: %v", backupErr)
		} else {
			log.Printf("Created backup at %s", backupPath)
		}
	}

	var legacyData legacyJsonData
	if err := json.Unmarshal(jsonBytes, &legacyData); err != nil {
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
