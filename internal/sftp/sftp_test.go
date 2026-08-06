package sftp

import (
	"os"
	"path/filepath"
	"testing"
)

func TestFileOperations(t *testing.T) {
	// Basic structure test - actual SFTP tests require live SSH server
	t.Run("FileInfo structure", func(t *testing.T) {
		fi := FileInfo{
			Name:  "test.txt",
			Size:  1024,
			Mode:  0644,
			IsDir: false,
			Path:  "/home/user/test.txt",
		}

		if fi.Name != "test.txt" {
			t.Errorf("expected name test.txt, got %s", fi.Name)
		}
		if fi.Size != 1024 {
			t.Errorf("expected size 1024, got %d", fi.Size)
		}
	})

	t.Run("TransferProgress structure", func(t *testing.T) {
		progress := TransferProgress{
			Operation:    "upload",
			RemotePath:   "/remote/file.txt",
			LocalPath:    "/local/file.txt",
			BytesTotal:   1000,
			BytesCurrent: 500,
			Percentage:   50.0,
			Completed:    false,
		}

		if progress.Percentage != 50.0 {
			t.Errorf("expected 50%%, got %.2f%%", progress.Percentage)
		}
	})
}

func TestManagerBasics(t *testing.T) {
	t.Run("NewManager creates instance", func(t *testing.T) {
		manager := NewManager()
		if manager == nil {
			t.Fatal("expected manager, got nil")
		}
		if manager.clients == nil {
			t.Error("expected initialized clients map")
		}
	})
}

func TestCopyWithProgress(t *testing.T) {
	// Test progress calculation logic without actual SFTP
	t.Run("Progress calculation", func(t *testing.T) {
		tmpDir := t.TempDir()
		srcFile := filepath.Join(tmpDir, "source.txt")
		dstFile := filepath.Join(tmpDir, "dest.txt")

		// Create test file
		content := []byte("test content for progress tracking")
		if err := os.WriteFile(srcFile, content, 0644); err != nil {
			t.Fatal(err)
		}

		src, err := os.Open(srcFile)
		if err != nil {
			t.Fatal(err)
		}
		defer src.Close()

		dst, err := os.Create(dstFile)
		if err != nil {
			t.Fatal(err)
		}
		defer dst.Close()

		var progressCalls int
		progressFunc := func(p TransferProgress) {
			progressCalls++
			if p.BytesCurrent > p.BytesTotal {
				t.Errorf("current bytes %d exceeds total %d", p.BytesCurrent, p.BytesTotal)
			}
		}

		client := &Client{}
		err = client.copyWithProgress(dst, src, int64(len(content)), "test", "/remote", "/local", progressFunc)
		if err != nil {
			t.Errorf("copy failed: %v", err)
		}

		if progressCalls < 1 {
			t.Error("expected at least one progress callback")
		}
	})
}
