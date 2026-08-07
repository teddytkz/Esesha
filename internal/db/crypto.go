package db

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"esesha/internal/crypto"
	"fmt"
	"os"

	"golang.org/x/sys/windows/registry"
)

const (
	magicHeader = "ESESHA01"
	version     = uint32(1)
	nonceSize   = 12
	keySize     = 32
)

// encryptData encrypts plaintext using AES-256-GCM with the provided key
func encryptData(plaintext, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	nonce := make([]byte, nonceSize)
	if _, err := rand.Read(nonce); err != nil {
		return nil, fmt.Errorf("failed to generate nonce: %w", err)
	}

	ciphertext := gcm.Seal(nil, nonce, plaintext, nil)

	// Build binary format: magic(8) + version(4) + nonce(12) + ciphertext+tag
	result := make([]byte, 0, len(magicHeader)+4+nonceSize+len(ciphertext))
	result = append(result, []byte(magicHeader)...)

	versionBytes := make([]byte, 4)
	binary.BigEndian.PutUint32(versionBytes, version)
	result = append(result, versionBytes...)

	result = append(result, nonce...)
	result = append(result, ciphertext...)

	return result, nil
}

// decryptData decrypts binary format data using AES-256-GCM
func decryptData(data, key []byte) ([]byte, error) {
	minSize := len(magicHeader) + 4 + nonceSize + 16 // magic + version + nonce + min ciphertext+tag
	if len(data) < minSize {
		return nil, fmt.Errorf("data too short: %d bytes", len(data))
	}

	// Verify magic header
	if string(data[:len(magicHeader)]) != magicHeader {
		return nil, fmt.Errorf("invalid magic header")
	}

	// Read version
	fileVersion := binary.BigEndian.Uint32(data[len(magicHeader) : len(magicHeader)+4])
	if fileVersion != version {
		return nil, fmt.Errorf("unsupported version: %d", fileVersion)
	}

	// Extract nonce and ciphertext
	offset := len(magicHeader) + 4
	nonce := data[offset : offset+nonceSize]
	ciphertext := data[offset+nonceSize:]

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt (corrupted or tampered): %w", err)
	}

	return plaintext, nil
}

// loadOrCreateKey loads encryption key from file (used only during migration)
func loadOrCreateKey(keyPath string) ([]byte, error) {
	// Try to load existing key
	if data, err := os.ReadFile(keyPath); err == nil {
		// Decode base64
		encryptedKey, err := base64.StdEncoding.DecodeString(string(data))
		if err != nil {
			return nil, fmt.Errorf("key file corrupted (invalid base64): %w", err)
		}

		// Decrypt with DPAPI
		key, err := crypto.Decrypt(encryptedKey)
		if err != nil {
			return nil, fmt.Errorf("failed to decrypt key (wrong machine/user?): %w", err)
		}

		if len(key) != keySize {
			return nil, fmt.Errorf("key has invalid size: %d bytes", len(key))
		}

		return key, nil
	}

	return nil, fmt.Errorf("key file not found: %s", keyPath)
}

// detectFormat determines if data is binary format or JSON
func detectFormat(data []byte) (isBinary bool, err error) {
	if len(data) < len(magicHeader) {
		return false, nil
	}

	if string(data[:len(magicHeader)]) == magicHeader {
		return true, nil
	}

	// JSON detection (starts with '{' or whitespace followed by '{')
	for _, b := range data {
		if b == '{' {
			return false, nil
		}
		if b != ' ' && b != '\t' && b != '\n' && b != '\r' {
			break
		}
	}

	return false, nil
}

// getMachineGUID reads Windows Machine GUID from registry
func getMachineGUID() (string, error) {
	k, err := registry.OpenKey(registry.LOCAL_MACHINE, `SOFTWARE\Microsoft\Cryptography`, registry.QUERY_VALUE)
	if err != nil {
		return "", fmt.Errorf("failed to open registry key: %w", err)
	}
	defer k.Close()

	guid, _, err := k.GetStringValue("MachineGuid")
	if err != nil {
		return "", fmt.Errorf("failed to read MachineGuid: %w", err)
	}

	if guid == "" {
		return "", fmt.Errorf("MachineGuid is empty")
	}

	return guid, nil
}

// deriveMachineKey derives a 32-byte encryption key from machine GUID + exe directory
func deriveMachineKey(exeDir string) ([]byte, error) {
	machineGUID, err := getMachineGUID()
	if err != nil {
		return nil, fmt.Errorf("failed to get machine GUID: %w", err)
	}

	// Combine with delimiter
	input := machineGUID + "|" + exeDir

	// Hash to 32 bytes
	hash := sha256.Sum256([]byte(input))
	return hash[:], nil
}

// migrateFromKeyFile handles migration from .key file to machine-bound encryption
func migrateFromKeyFile(keyPath, dataPath string, machineKey []byte) error {
	// Check if .key file exists
	if _, err := os.Stat(keyPath); os.IsNotExist(err) {
		return nil // No migration needed
	}

	// Load old key
	oldKey, err := loadOrCreateKey(keyPath)
	if err != nil {
		return fmt.Errorf("failed to load old key for migration: %w", err)
	}

	// Read encrypted data
	data, err := os.ReadFile(dataPath)
	if os.IsNotExist(err) {
		// No data file yet, just remove key file
		if err := os.Rename(keyPath, keyPath+".migrated"); err != nil {
			return fmt.Errorf("failed to rename key file: %w", err)
		}
		return nil
	}
	if err != nil {
		return fmt.Errorf("failed to read data file: %w", err)
	}

	// Decrypt with old key
	plaintext, err := decryptData(data, oldKey)
	if err != nil {
		return fmt.Errorf("failed to decrypt with old key: %w", err)
	}

	// Re-encrypt with machine key
	encrypted, err := encryptData(plaintext, machineKey)
	if err != nil {
		return fmt.Errorf("failed to re-encrypt with machine key: %w", err)
	}

	// Write back
	if err := os.WriteFile(dataPath, encrypted, 0600); err != nil {
		return fmt.Errorf("failed to write re-encrypted data: %w", err)
	}

	// Rename key file to .migrated (backup, not deleted)
	if err := os.Rename(keyPath, keyPath+".migrated"); err != nil {
		return fmt.Errorf("failed to rename key file: %w", err)
	}

	return nil
}
