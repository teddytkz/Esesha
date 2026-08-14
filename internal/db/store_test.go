package db

import (
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"esesha/internal/crypto"
	"esesha/internal/models"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestBinaryStorageRoundtrip(t *testing.T) {
	tmpDir := t.TempDir()
	storePath := filepath.Join(tmpDir, "esesha.bin")

	// Create test connection
	testConn := &models.Connection{
		ID:                1,
		Name:              "Test Server",
		Host:              "192.168.1.100",
		Port:              22,
		Username:          "testuser",
		EncryptedPassword: []byte("encrypted_data"),
		PrivateKeyPath:    "/path/to/key",
		CreatedAt:         time.Now().Unix(),
		UpdatedAt:         time.Now().Unix(),
	}

	// Derive machine key
	key, err := deriveMachineKey(tmpDir)
	if err != nil {
		t.Fatalf("failed to derive key: %v", err)
	}

	// Create store and add connection
	store := &Store{
		filePath:    storePath,
		connections: []*models.Connection{testConn},
		hostKeys:    []HostKey{},
		nextID:      2,
		encryptKey:  key,
	}

	// Save (encrypted)
	if err := store.save(); err != nil {
		t.Fatalf("save failed: %v", err)
	}

	// Verify file is binary
	data, err := os.ReadFile(storePath)
	if err != nil {
		t.Fatalf("failed to read file: %v", err)
	}

	if string(data[:len(magicHeader)]) != magicHeader {
		t.Errorf("file is not binary format, got header: %q", data[:8])
	}

	// Verify not human-readable JSON
	var testJSON map[string]interface{}
	if json.Unmarshal(data, &testJSON) == nil {
		t.Error("file is readable JSON, expected encrypted binary")
	}

	// Load from disk
	store2 := &Store{
		filePath:   storePath,
		encryptKey: key,
	}

	if err := store2.load(); err != nil {
		t.Fatalf("load failed: %v", err)
	}

	// Verify data
	if len(store2.connections) != 1 {
		t.Fatalf("expected 1 connection, got %d", len(store2.connections))
	}

	loaded := store2.connections[0]
	if loaded.Name != testConn.Name {
		t.Errorf("name mismatch: got %q, want %q", loaded.Name, testConn.Name)
	}
	if loaded.Host != testConn.Host {
		t.Errorf("host mismatch: got %q, want %q", loaded.Host, testConn.Host)
	}
	if loaded.Username != testConn.Username {
		t.Errorf("username mismatch: got %q, want %q", loaded.Username, testConn.Username)
	}
}

func TestJSONMigrationToBinary(t *testing.T) {
	tmpDir := t.TempDir()
	storePath := filepath.Join(tmpDir, "esesha.bin")
	keyPath := storePath + ".key"

	// Test migration from old .key file to machine-bound key
	// Step 1: Create old-style key file manually (simulate pre-migration state)
	oldKey := make([]byte, 32)
	if _, err := rand.Read(oldKey); err != nil {
		t.Fatal(err)
	}

	// Save old key using DPAPI
	encryptedKey, err := crypto.Encrypt(oldKey)
	if err != nil {
		t.Fatal(err)
	}
	encoded := base64.StdEncoding.EncodeToString(encryptedKey)
	if err := os.WriteFile(keyPath, []byte(encoded), 0600); err != nil {
		t.Fatal(err)
	}

	// Create JSON format file
	jsonContent := jsonData{
		Connections: []*models.Connection{
			{
				ID:                1,
				Name:              "Legacy Server",
				Host:              "example.com",
				Port:              22,
				Username:          "user",
				EncryptedPassword: []byte("data"),
				CreatedAt:         time.Now().Unix(),
				UpdatedAt:         time.Now().Unix(),
			},
		},
		HostKeys: []HostKey{},
	}

	jsonBytes, err := json.MarshalIndent(jsonContent, "", "  ")
	if err != nil {
		t.Fatal(err)
	}

	if err := os.WriteFile(storePath, jsonBytes, 0600); err != nil {
		t.Fatal(err)
	}

	// Step 2: Derive machine key and trigger migration
	machineKey, err := deriveMachineKey(tmpDir)
	if err != nil {
		t.Fatal(err)
	}

	// Manually encrypt with old key to simulate pre-migration state
	encrypted, err := encryptData(jsonBytes, oldKey)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(storePath, encrypted, 0600); err != nil {
		t.Fatal(err)
	}

	// Step 3: Trigger migration
	if err := migrateFromKeyFile(keyPath, storePath, machineKey); err != nil {
		t.Fatalf("migration failed: %v", err)
	}

	// Verify .key file was renamed
	if _, err := os.Stat(keyPath); !os.IsNotExist(err) {
		t.Error("expected .key file to be removed/renamed")
	}
	if _, err := os.Stat(keyPath + ".migrated"); os.IsNotExist(err) {
		t.Error("expected .key.migrated backup to exist")
	}

	// Load with machine key (should work now)
	store := &Store{
		filePath:   storePath,
		encryptKey: machineKey,
	}

	if err := store.load(); err != nil {
		t.Fatalf("load failed: %v", err)
	}

	// Verify data loaded correctly
	if len(store.connections) != 1 {
		t.Fatalf("expected 1 connection, got %d", len(store.connections))
	}

	if store.connections[0].Name != "Legacy Server" {
		t.Errorf("connection name mismatch: got %q", store.connections[0].Name)
	}

	// Trigger save to complete migration to binary
	if err := store.save(); err != nil {
		t.Fatalf("save after migration failed: %v", err)
	}

	// Verify file is now binary
	data, err := os.ReadFile(storePath)
	if err != nil {
		t.Fatal(err)
	}

	isBinary, err := detectFormat(data)
	if err != nil {
		t.Fatal(err)
	}

	if !isBinary {
		t.Error("file not migrated to binary format")
	}
}

func TestMachineKeyDerivation(t *testing.T) {
	tmpDir := t.TempDir()

	// Test that key derivation is deterministic
	key1, err := deriveMachineKey(tmpDir)
	if err != nil {
		t.Fatal(err)
	}

	key2, err := deriveMachineKey(tmpDir)
	if err != nil {
		t.Fatal(err)
	}

	if len(key1) != 32 {
		t.Errorf("expected 32-byte key, got %d bytes", len(key1))
	}

	if string(key1) != string(key2) {
		t.Error("key derivation not deterministic")
	}

	// Different path should produce different key
	key3, err := deriveMachineKey(tmpDir + "_different")
	if err != nil {
		t.Fatal(err)
	}

	if string(key1) == string(key3) {
		t.Error("different paths should produce different keys")
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) && containsHelper(s, substr))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func TestCorruptedFileDetection(t *testing.T) {
	tmpDir := t.TempDir()
	storePath := filepath.Join(tmpDir, "esesha.bin")

	// Create valid encrypted file
	key, err := deriveMachineKey(tmpDir)
	if err != nil {
		t.Fatal(err)
	}

	testData := jsonData{
		Connections: []*models.Connection{},
		HostKeys:    []HostKey{},
	}

	jsonBytes, _ := json.Marshal(testData)
	encrypted, err := encryptData(jsonBytes, key)
	if err != nil {
		t.Fatal(err)
	}

	if err := os.WriteFile(storePath, encrypted, 0600); err != nil {
		t.Fatal(err)
	}

	// Corrupt the file (modify ciphertext)
	data, _ := os.ReadFile(storePath)
	corruptOffset := len(magicHeader) + 4 + nonceSize + 5
	if corruptOffset < len(data) {
		data[corruptOffset] ^= 0xFF
		os.WriteFile(storePath, data, 0600)
	}

	// Try to load
	store := &Store{
		filePath:   storePath,
		encryptKey: key,
	}

	err = store.load()
	if err == nil {
		t.Error("expected error when loading corrupted file")
	}
}

func TestExportJSON(t *testing.T) {
	tmpDir := t.TempDir()
	storePath := filepath.Join(tmpDir, "esesha.bin")
	exportPath := filepath.Join(tmpDir, "export.json")

	// Create encrypted store
	key, err := deriveMachineKey(tmpDir)
	if err != nil {
		t.Fatal(err)
	}

	store := &Store{
		filePath:   storePath,
		encryptKey: key,
		connections: []*models.Connection{
			{
				ID:       1,
				Name:     "Export Test",
				Host:     "test.local",
				Port:     22,
				Username: "testuser",
			},
		},
		hostKeys: []HostKey{},
		nextID:   2,
	}

	// Save encrypted
	if err := store.save(); err != nil {
		t.Fatal(err)
	}

	// Export to JSON
	if err := store.ExportJSON(exportPath); err != nil {
		t.Fatalf("export failed: %v", err)
	}

	// Verify export is readable JSON
	exportData, err := os.ReadFile(exportPath)
	if err != nil {
		t.Fatal(err)
	}

	var exported jsonData
	if err := json.Unmarshal(exportData, &exported); err != nil {
		t.Fatalf("exported file is not valid JSON: %v", err)
	}

	// Verify content
	if len(exported.Connections) != 1 {
		t.Fatalf("expected 1 connection in export, got %d", len(exported.Connections))
	}

	if exported.Connections[0].Name != "Export Test" {
		t.Errorf("exported connection name mismatch: got %q", exported.Connections[0].Name)
	}
}

func TestExportImportEncryptedPrivateKey(t *testing.T) {
	tmpDir := t.TempDir()
	storePath := filepath.Join(tmpDir, "esesha.bin")
	exportPath := filepath.Join(tmpDir, "export.json")

	key, err := deriveMachineKey(tmpDir)
	if err != nil {
		t.Fatal(err)
	}

	encKey := []byte("machine-bound-encrypted-pem-content")
	store := &Store{
		filePath:   storePath,
		encryptKey: key,
		connections: []*models.Connection{
			{
				ID:                  1,
				Name:                "Key Test",
				Host:                "host.local",
				Port:                22,
				Username:            "user",
				EncryptedPrivateKey: encKey,
			},
		},
		hostKeys: []HostKey{},
		nextID:   2,
	}
	if err := store.save(); err != nil {
		t.Fatal(err)
	}
	if err := store.ExportJSON(exportPath); err != nil {
		t.Fatalf("export failed: %v", err)
	}

	// Import into a fresh store
	importStore := &Store{
		filePath:    filepath.Join(tmpDir, "import.bin"),
		encryptKey:  key,
		connections: []*models.Connection{},
		hostKeys:    []HostKey{},
		nextID:      1,
	}
	if err := importStore.ImportJSON(exportPath); err != nil {
		t.Fatalf("import failed: %v", err)
	}

	conns, err := importStore.ListConnections()
	if err != nil {
		t.Fatal(err)
	}
	if len(conns) != 1 {
		t.Fatalf("expected 1 imported connection, got %d", len(conns))
	}
	if !bytes.Equal(conns[0].EncryptedPrivateKey, encKey) {
		t.Errorf("encrypted private key not preserved: got %q, want %q", conns[0].EncryptedPrivateKey, encKey)
	}
}

func TestCrossPathDecryption(t *testing.T) {
	tmpDir := t.TempDir()
	storePath := filepath.Join(tmpDir, "esesha.bin")

	// Create with path1
	path1 := filepath.Join(tmpDir, "dir1")
	os.MkdirAll(path1, 0755)
	key1, err := deriveMachineKey(path1)
	if err != nil {
		t.Fatal(err)
	}

	store1 := &Store{
		filePath:   storePath,
		encryptKey: key1,
		connections: []*models.Connection{
			{ID: 1, Name: "Test", Host: "host", Port: 22, Username: "user"},
		},
		hostKeys: []HostKey{},
		nextID:   2,
	}

	if err := store1.save(); err != nil {
		t.Fatal(err)
	}

	// Try to load with key from different path (different machine context)
	path2 := filepath.Join(tmpDir, "dir2")
	os.MkdirAll(path2, 0755)
	key2, err := deriveMachineKey(path2)
	if err != nil {
		t.Fatal(err)
	}

	store2 := &Store{
		filePath:   storePath,
		encryptKey: key2,
	}

	err = store2.load()
	if err == nil {
		t.Error("expected decryption to fail with different path-derived key")
	}
}
