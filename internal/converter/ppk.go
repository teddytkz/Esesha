package converter

import (
	"crypto/ecdsa"
	"crypto/ed25519"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"os"
	"strings"

	"github.com/edutko/putty-go/ppk"
)

// ConvertPPKToPEM converts a PuTTY .ppk file to OpenSSH PEM format using a
// pure-Go PPK parser (no external puttygen.exe dependency).
func ConvertPPKToPEM(ppkPath, pemPath, passphrase string) error {
	// Load PPK keypair (handles v2/v3, encrypted/unencrypted)
	keyPair, err := ppk.LoadKeypair(ppkPath, []byte(passphrase))
	if err != nil {
		return mapPPKError(err)
	}

	// Get crypto.PrivateKey
	privateKey := keyPair.Private()

	// Marshal to PEM
	pemBytes, err := marshalPrivateKeyToPEM(privateKey)
	if err != nil {
		return fmt.Errorf("failed to marshal private key: %w", err)
	}

	// Write with 0600 permissions (owner read/write only)
	if err := os.WriteFile(pemPath, pemBytes, 0600); err != nil {
		return fmt.Errorf("Failed to write PEM file: %s", err)
	}

	return nil
}

func marshalPrivateKeyToPEM(key interface{}) ([]byte, error) {
	var der []byte
	var pemType string

	switch k := key.(type) {
	case *rsa.PrivateKey:
		der = x509.MarshalPKCS1PrivateKey(k)
		pemType = "RSA PRIVATE KEY"
	case *ecdsa.PrivateKey:
		var err error
		der, err = x509.MarshalECPrivateKey(k)
		if err != nil {
			return nil, err
		}
		pemType = "EC PRIVATE KEY"
	case *ed25519.PrivateKey:
		var err error
		der, err = x509.MarshalPKCS8PrivateKey(k)
		if err != nil {
			return nil, err
		}
		pemType = "PRIVATE KEY"
	case ed25519.PrivateKey:
		var err error
		der, err = x509.MarshalPKCS8PrivateKey(k)
		if err != nil {
			return nil, err
		}
		pemType = "PRIVATE KEY"
	default:
		return nil, fmt.Errorf("unsupported key type: %T", key)
	}

	return pem.EncodeToMemory(&pem.Block{
		Type:  pemType,
		Bytes: der,
	}), nil
}

func mapPPKError(err error) error {
	if os.IsNotExist(err) {
		return fmt.Errorf("PPK file not found")
	}
	errStr := err.Error()
	if strings.Contains(errStr, "MAC") || strings.Contains(errStr, "decrypt") ||
		strings.Contains(errStr, "corrupted data") || strings.Contains(errStr, "incorrect password") {
		return fmt.Errorf("Incorrect passphrase or corrupted key file")
	}
	if strings.Contains(errStr, "no such file") {
		return fmt.Errorf("PPK file not found")
	}
	if strings.Contains(errStr, "unsupported") || strings.Contains(errStr, "invalid") {
		return fmt.Errorf("Invalid PPK file format")
	}
	return fmt.Errorf("failed to load PPK file: %w", err)
}
