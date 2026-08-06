package editor

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sync"
)

// Manager handles file editing operations
type Manager struct {
	tempDir  string
	watchers map[string]*Watcher
	mu       sync.RWMutex
}

// NewManager creates editor manager
func NewManager() (*Manager, error) {
	tempDir := filepath.Join(os.TempDir(), "esesha-editor")
	if err := os.MkdirAll(tempDir, 0700); err != nil {
		return nil, fmt.Errorf("failed to create temp dir: %w", err)
	}

	return &Manager{
		tempDir:  tempDir,
		watchers: make(map[string]*Watcher),
	}, nil
}

// EditFile downloads remote file, opens editor, watches for changes
func (m *Manager) EditFile(sessionID, remotePath string, downloadFunc func() ([]byte, error), uploadFunc func([]byte) error) (string, error) {
	// Create temp file
	filename := filepath.Base(remotePath)
	rb := make([]byte, 8)
	rand.Read(rb)
	tempPath := filepath.Join(m.tempDir, fmt.Sprintf("%s_%s_%s", sessionID, filename, hex.EncodeToString(rb)))

	// Download file
	data, err := downloadFunc()
	if err != nil {
		return "", fmt.Errorf("download failed: %w", err)
	}

	if err := os.WriteFile(tempPath, data, 0600); err != nil {
		return "", fmt.Errorf("failed to write temp file: %w", err)
	}

	// Launch editor
	if err := m.openEditor(tempPath); err != nil {
		os.Remove(tempPath)
		return "", fmt.Errorf("failed to open editor: %w", err)
	}

	// Start watcher
	watcher := NewWatcher(tempPath, uploadFunc)
	m.mu.Lock()
	m.watchers[tempPath] = watcher
	m.mu.Unlock()

	go watcher.Start()

	return tempPath, nil
}

// openEditor launches system default editor
func (m *Manager) openEditor(path string) error {
	var cmd *exec.Cmd

	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", "", path)
	case "darwin":
		cmd = exec.Command("open", path)
	default:
		cmd = exec.Command("xdg-open", path)
	}

	return cmd.Start()
}

// StopWatching stops watching a temp file
func (m *Manager) StopWatching(tempPath string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if watcher, exists := m.watchers[tempPath]; exists {
		watcher.Stop()
		delete(m.watchers, tempPath)
		os.Remove(tempPath)
	}
}

// Cleanup stops all watchers and removes temp files
func (m *Manager) Cleanup() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for path, watcher := range m.watchers {
		watcher.Stop()
		os.Remove(path)
	}
	m.watchers = make(map[string]*Watcher)
	os.RemoveAll(m.tempDir)
}
