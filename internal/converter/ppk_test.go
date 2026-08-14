package converter

import (
	"crypto/ecdsa"
	"crypto/ed25519"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

const testPassphrase = "hunter2"

func readPassphrase(t *testing.T) string {
	t.Helper()
	b, err := os.ReadFile("testdata/password")
	if err != nil {
		t.Fatalf("read passphrase fixture: %v", err)
	}
	return strings.TrimSpace(string(b))
}

func TestConvertPPKToPEM_InvalidFile(t *testing.T) {
	tmpDir := t.TempDir()
	invalidPPK := filepath.Join(tmpDir, "invalid.ppk")
	outputPEM := filepath.Join(tmpDir, "output.pem")

	// Create invalid PPK file
	err := os.WriteFile(invalidPPK, []byte("not a valid ppk file"), 0600)
	if err != nil {
		t.Fatal(err)
	}

	// Should fail with invalid format error
	err = ConvertPPKToPEM(invalidPPK, outputPEM, "")
	if err == nil {
		t.Error("Expected error for invalid PPK file, got nil")
	}
	if !strings.Contains(err.Error(), "Invalid PPK file format") {
		t.Errorf("Expected 'Invalid PPK file format' error, got: %v", err)
	}
}

func TestConvertPPKToPEM_FileNotFound(t *testing.T) {
	tmpDir := t.TempDir()
	nonExistentPPK := filepath.Join(tmpDir, "nonexistent.ppk")
	outputPEM := filepath.Join(tmpDir, "output.pem")

	err := ConvertPPKToPEM(nonExistentPPK, outputPEM, "")
	if err == nil {
		t.Error("Expected error for non-existent file, got nil")
	}
	if !strings.Contains(err.Error(), "not found") {
		t.Errorf("Expected 'not found' error, got: %v", err)
	}
}

func TestConvertPPKToPEM_UnencryptedRSA(t *testing.T) {
	outputPEM := filepath.Join(t.TempDir(), "out.pem")
	if err := ConvertPPKToPEM("testdata/rsa-2048.ppk", outputPEM, ""); err != nil {
		t.Fatalf("conversion failed: %v", err)
	}
	assertPEM(t, outputPEM, "RSA PRIVATE KEY", func(k interface{}) {
		if _, ok := k.(*rsa.PrivateKey); !ok {
			t.Errorf("expected *rsa.PrivateKey, got %T", k)
		}
	})
}

func TestConvertPPKToPEM_EncryptedRSA(t *testing.T) {
	outputPEM := filepath.Join(t.TempDir(), "out.pem")
	pass := readPassphrase(t)
	if err := ConvertPPKToPEM("testdata/rsa-2048-enc.ppk", outputPEM, pass); err != nil {
		t.Fatalf("conversion failed: %v", err)
	}
	assertPEM(t, outputPEM, "RSA PRIVATE KEY", func(k interface{}) {
		if _, ok := k.(*rsa.PrivateKey); !ok {
			t.Errorf("expected *rsa.PrivateKey, got %T", k)
		}
	})
}

func TestConvertPPKToPEM_UnencryptedECDSA(t *testing.T) {
	outputPEM := filepath.Join(t.TempDir(), "out.pem")
	if err := ConvertPPKToPEM("testdata/ecdsa-256.ppk", outputPEM, ""); err != nil {
		t.Fatalf("conversion failed: %v", err)
	}
	assertPEM(t, outputPEM, "EC PRIVATE KEY", func(k interface{}) {
		if _, ok := k.(*ecdsa.PrivateKey); !ok {
			t.Errorf("expected *ecdsa.PrivateKey, got %T", k)
		}
	})
}

func TestConvertPPKToPEM_Ed25519(t *testing.T) {
	outputPEM := filepath.Join(t.TempDir(), "out.pem")
	if err := ConvertPPKToPEM("testdata/ed25519.ppk", outputPEM, ""); err != nil {
		t.Fatalf("conversion failed: %v", err)
	}
	assertPEM(t, outputPEM, "PRIVATE KEY", func(k interface{}) {
		if _, ok := k.(ed25519.PrivateKey); !ok {
			t.Errorf("expected ed25519.PrivateKey, got %T", k)
		}
	})
}

func TestConvertPPKToPEM_WrongPassphrase(t *testing.T) {
	outputPEM := filepath.Join(t.TempDir(), "out.pem")
	err := ConvertPPKToPEM("testdata/rsa-2048-enc.ppk", outputPEM, "wrongP@ssw0rd")
	if err == nil {
		t.Fatal("expected error for wrong passphrase, got nil")
	}
	if !strings.Contains(err.Error(), "Incorrect passphrase") {
		t.Errorf("expected 'Incorrect passphrase' error, got: %v", err)
	}
}

func TestConvertPPKToPEM_PPKv3(t *testing.T) {
	outputPEM := filepath.Join(t.TempDir(), "out.pem")
	if err := ConvertPPKToPEM("testdata/rsa-2048.ppk", outputPEM, ""); err != nil {
		t.Fatalf("v3 conversion failed: %v", err)
	}
	assertPEM(t, outputPEM, "RSA PRIVATE KEY", nil)
}

func TestConvertPPKToPEM_PPKv2(t *testing.T) {
	outputPEM := filepath.Join(t.TempDir(), "out.pem")
	if err := ConvertPPKToPEM("testdata/v2-rsa-2048.ppk", outputPEM, ""); err != nil {
		t.Fatalf("v2 conversion failed: %v", err)
	}
	assertPEM(t, outputPEM, "RSA PRIVATE KEY", nil)
}

func assertPEM(t *testing.T, path, wantType string, check func(interface{})) {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read PEM: %v", err)
	}
	block, _ := pem.Decode(data)
	if block == nil {
		t.Fatalf("failed to decode PEM")
	}
	if block.Type != wantType {
		t.Errorf("expected PEM type %q, got %q", wantType, block.Type)
	}
	key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		// fall back to type-specific parsers
		switch wantType {
		case "RSA PRIVATE KEY":
			key, err = x509.ParsePKCS1PrivateKey(block.Bytes)
		case "EC PRIVATE KEY":
			key, err = x509.ParseECPrivateKey(block.Bytes)
		}
		if err != nil {
			t.Fatalf("failed to parse private key: %v", err)
		}
	}
	if check != nil {
		check(key)
	}
	// Verify 0600 permissions (owner-only). Windows does not enforce POSIX
	// modes, so only assert on non-Windows platforms.
	if runtime.GOOS != "windows" {
		info, err := os.Stat(path)
		if err == nil && info.Mode().Perm() != 0600 {
			t.Errorf("expected 0600 perms, got %v", info.Mode().Perm())
		}
	}
}
