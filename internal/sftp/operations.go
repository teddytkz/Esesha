package sftp

import (
	"fmt"
	"io/fs"
	"path/filepath"
	"strings"
)

// validatePath prevents path traversal attacks
func validatePath(path string) error {
	cleaned := filepath.Clean(path)
	if strings.Contains(cleaned, "..") {
		return fmt.Errorf("invalid path: traversal detected")
	}
	return nil
}

// ListDirectory lists files in remote directory
func (c *Client) ListDirectory(path string) ([]FileInfo, error) {
	if err := validatePath(path); err != nil {
		return nil, err
	}
	c.mu.Lock()
	defer c.mu.Unlock()

	entries, err := c.sftpClient.ReadDir(path)
	if err != nil {
		return nil, fmt.Errorf("list dir failed: %w", err)
	}

	files := make([]FileInfo, 0, len(entries))
	for _, entry := range entries {
		files = append(files, FileInfo{
			Name:         entry.Name(),
			Size:         entry.Size(),
			Mode:         uint32(entry.Mode()),
			ModifiedTime: entry.ModTime().Unix(),
			IsDir:        entry.IsDir(),
			Path:         filepath.Join(path, entry.Name()),
		})
	}

	return files, nil
}

// DeletePath removes remote file or directory
func (c *Client) DeletePath(path string) error {
	if err := validatePath(path); err != nil {
		return err
	}
	c.mu.Lock()
	defer c.mu.Unlock()

	stat, err := c.sftpClient.Stat(path)
	if err != nil {
		return fmt.Errorf("stat failed: %w", err)
	}

	if stat.IsDir() {
		return c.removeDir(path)
	}

	return c.sftpClient.Remove(path)
}

// removeDir recursively removes directory
func (c *Client) removeDir(path string) error {
	entries, err := c.sftpClient.ReadDir(path)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		childPath := filepath.Join(path, entry.Name())
		if entry.IsDir() {
			if err := c.removeDir(childPath); err != nil {
				return err
			}
		} else {
			if err := c.sftpClient.Remove(childPath); err != nil {
				return err
			}
		}
	}

	return c.sftpClient.RemoveDirectory(path)
}

// RenamePath renames remote file or directory
func (c *Client) RenamePath(oldPath, newPath string) error {
	if err := validatePath(oldPath); err != nil {
		return err
	}
	if err := validatePath(newPath); err != nil {
		return err
	}
	c.mu.Lock()
	defer c.mu.Unlock()

	return c.sftpClient.Rename(oldPath, newPath)
}

// CreateDirectory creates remote directory
func (c *Client) CreateDirectory(path string) error {
	if err := validatePath(path); err != nil {
		return err
	}
	c.mu.Lock()
	defer c.mu.Unlock()

	return c.sftpClient.Mkdir(path)
}

// ChangePermissions changes remote file/dir permissions
func (c *Client) ChangePermissions(path string, mode fs.FileMode) error {
	if err := validatePath(path); err != nil {
		return err
	}
	c.mu.Lock()
	defer c.mu.Unlock()

	return c.sftpClient.Chmod(path, mode)
}

// GetStat gets remote file info
func (c *Client) GetStat(path string) (*FileInfo, error) {
	if err := validatePath(path); err != nil {
		return nil, err
	}
	c.mu.Lock()
	defer c.mu.Unlock()

	stat, err := c.sftpClient.Stat(path)
	if err != nil {
		return nil, fmt.Errorf("stat failed: %w", err)
	}

	return &FileInfo{
		Name:         stat.Name(),
		Size:         stat.Size(),
		Mode:         uint32(stat.Mode()),
		ModifiedTime: stat.ModTime().Unix(),
		IsDir:        stat.IsDir(),
		Path:         path,
	}, nil
}
