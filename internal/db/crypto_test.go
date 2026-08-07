package db

import (
	"bytes"
	"crypto/rand"
	"testing"
)

func TestEncryptDecryptRoundtrip(t *testing.T) {
	key := make([]byte, keySize)
	if _, err := rand.Read(key); err != nil {
		t.Fatal(err)
	}

	plaintext := []byte(`{"connections":[],"host_keys":[]}`)

	encrypted, err := encryptData(plaintext, key)
	if err != nil {
		t.Fatalf("encryption failed: %v", err)
	}

	// Verify binary format structure
	if len(encrypted) < len(magicHeader)+4+nonceSize+16 {
		t.Fatalf("encrypted data too short: %d bytes", len(encrypted))
	}

	if string(encrypted[:len(magicHeader)]) != magicHeader {
		t.Errorf("magic header mismatch: got %q", encrypted[:len(magicHeader)])
	}

	decrypted, err := decryptData(encrypted, key)
	if err != nil {
		t.Fatalf("decryption failed: %v", err)
	}

	if !bytes.Equal(plaintext, decrypted) {
		t.Errorf("roundtrip failed: got %q, want %q", decrypted, plaintext)
	}
}

func TestDecryptWithWrongKey(t *testing.T) {
	key1 := make([]byte, keySize)
	key2 := make([]byte, keySize)
	rand.Read(key1)
	rand.Read(key2)

	plaintext := []byte("test data")

	encrypted, err := encryptData(plaintext, key1)
	if err != nil {
		t.Fatal(err)
	}

	_, err = decryptData(encrypted, key2)
	if err == nil {
		t.Error("expected decryption to fail with wrong key")
	}
}

func TestDecryptTamperedData(t *testing.T) {
	key := make([]byte, keySize)
	rand.Read(key)

	plaintext := []byte("test data")

	encrypted, err := encryptData(plaintext, key)
	if err != nil {
		t.Fatal(err)
	}

	// Tamper with ciphertext (not header/version/nonce)
	tamperOffset := len(magicHeader) + 4 + nonceSize + 5
	if tamperOffset < len(encrypted) {
		encrypted[tamperOffset] ^= 0xFF
	}

	_, err = decryptData(encrypted, key)
	if err == nil {
		t.Error("expected decryption to fail with tampered data")
	}
}

func TestDetectFormat(t *testing.T) {
	tests := []struct {
		name     string
		data     []byte
		isBinary bool
	}{
		{
			name:     "binary format",
			data:     []byte("ESESHA01\x00\x00\x00\x01..."),
			isBinary: true,
		},
		{
			name:     "JSON format",
			data:     []byte(`{"connections":[]}`),
			isBinary: false,
		},
		{
			name:     "JSON with whitespace",
			data:     []byte("  \n{\n  \"connections\": []\n}"),
			isBinary: false,
		},
		{
			name:     "too short",
			data:     []byte("SHORT"),
			isBinary: false,
		},
		{
			name:     "empty",
			data:     []byte{},
			isBinary: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isBinary, err := detectFormat(tt.data)
			if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
			if isBinary != tt.isBinary {
				t.Errorf("got isBinary=%v, want %v", isBinary, tt.isBinary)
			}
		})
	}
}

func TestDecryptInvalidData(t *testing.T) {
	key := make([]byte, keySize)
	rand.Read(key)

	tests := []struct {
		name string
		data []byte
	}{
		{
			name: "too short",
			data: []byte("SHORT"),
		},
		{
			name: "wrong magic",
			data: []byte("WRONGMAG\x00\x00\x00\x01" + string(make([]byte, nonceSize+16))),
		},
		{
			name: "unsupported version",
			data: []byte("ESESHA01\x00\x00\x00\x99" + string(make([]byte, nonceSize+16))),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := decryptData(tt.data, key)
			if err == nil {
				t.Error("expected error for invalid data")
			}
		})
	}
}
