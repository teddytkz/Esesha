package ssh

import (
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"net"

	"golang.org/x/crypto/ssh"
)

// HostKeyCallback creates callback for host key verification
type HostKeyCallback struct {
	store      HostKeyStore
	onNewHost  func(hostname, fingerprint string) (bool, error)
	onKeyMoved func(hostname, fingerprint, oldFingerprint string) (bool, error)
}

// HostKeyStore interface for storing/retrieving host keys
type HostKeyStore interface {
	GetHostKey(hostname string) (string, error)
	SaveHostKey(hostname, fingerprint string) error
}

// NewHostKeyCallback creates host key callback with store
func NewHostKeyCallback(store HostKeyStore) *HostKeyCallback {
	return &HostKeyCallback{store: store}
}

// SetCallbacks sets user interaction callbacks
func (h *HostKeyCallback) SetCallbacks(
	onNewHost func(hostname, fingerprint string) (bool, error),
	onKeyMoved func(hostname, fingerprint, oldFingerprint string) (bool, error),
) {
	h.onNewHost = onNewHost
	h.onKeyMoved = onKeyMoved
}

// Callback implements ssh.HostKeyCallback
func (h *HostKeyCallback) Callback(hostname string, remote net.Addr, key ssh.PublicKey) error {
	fingerprint := fingerprintSHA256(key)
	storedFP, err := h.store.GetHostKey(hostname)

	if err != nil || storedFP == "" {
		// New host
		if h.onNewHost != nil {
			accept, err := h.onNewHost(hostname, fingerprint)
			if err != nil {
				return err
			}
			if !accept {
				return fmt.Errorf("host key rejected by user")
			}
			return h.store.SaveHostKey(hostname, fingerprint)
		}
		return fmt.Errorf("unknown host key")
	}

	if storedFP != fingerprint {
		// Key changed
		if h.onKeyMoved != nil {
			accept, err := h.onKeyMoved(hostname, fingerprint, storedFP)
			if err != nil {
				return err
			}
			if !accept {
				return fmt.Errorf("host key mismatch rejected by user")
			}
			return h.store.SaveHostKey(hostname, fingerprint)
		}
		return fmt.Errorf("host key mismatch")
	}

	return nil
}

// fingerprintSHA256 generates SHA256 fingerprint
func fingerprintSHA256(key ssh.PublicKey) string {
	hash := sha256.Sum256(key.Marshal())
	return "SHA256:" + base64.RawStdEncoding.EncodeToString(hash[:])
}
