package editor

import (
	"crypto/sha256"
	"fmt"
	"os"
	"sync"
	"time"
)

// Watcher monitors file changes and triggers upload
type Watcher struct {
	path       string
	uploadFunc func([]byte) error
	lastHash   [32]byte
	stopCh     chan struct{}
	mu         sync.Mutex
}

// NewWatcher creates file watcher
func NewWatcher(path string, uploadFunc func([]byte) error) *Watcher {
	return &Watcher{
		path:       path,
		uploadFunc: uploadFunc,
		stopCh:     make(chan struct{}),
	}
}

// Start begins watching file
func (w *Watcher) Start() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	// Initialize hash
	if data, err := os.ReadFile(w.path); err == nil {
		w.lastHash = sha256.Sum256(data)
	}

	for {
		select {
		case <-w.stopCh:
			return
		case <-ticker.C:
			w.checkAndUpload()
		}
	}
}

// checkAndUpload checks if file changed and uploads
func (w *Watcher) checkAndUpload() {
	// Read file outside lock to avoid blocking on I/O
	data, err := os.ReadFile(w.path)
	if err != nil {
		return // File might be locked by editor
	}

	hash := sha256.Sum256(data)

	// Check if changed while holding lock briefly
	w.mu.Lock()
	if hash == w.lastHash {
		w.mu.Unlock()
		return // No change
	}
	w.mu.Unlock()

	// Upload outside lock to avoid blocking on network I/O
	if err := w.uploadFunc(data); err != nil {
		fmt.Printf("Upload failed: %v\n", err)
		return
	}

	// Update hash only after successful upload
	w.mu.Lock()
	w.lastHash = hash
	w.mu.Unlock()
}

// Stop stops watching
func (w *Watcher) Stop() {
	close(w.stopCh)
}
