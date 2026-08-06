package sftp

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"io"
	"os"
)

const chunkSize = 32 * 1024 // 32KB chunks

// DownloadFile downloads remote file with progress tracking
func (c *Client) DownloadFile(remotePath, localPath string, onProgress func(TransferProgress)) error {
	c.mu.Lock()
	remoteFile, err := c.sftpClient.Open(remotePath)
	c.mu.Unlock()
	if err != nil {
		return fmt.Errorf("open remote failed: %w", err)
	}
	defer remoteFile.Close()

	stat, err := remoteFile.Stat()
	if err != nil {
		return fmt.Errorf("stat failed: %w", err)
	}

	localFile, err := os.Create(localPath)
	if err != nil {
		return fmt.Errorf("create local failed: %w", err)
	}
	defer localFile.Close()

	return c.copyWithProgress(localFile, remoteFile, stat.Size(), "download", remotePath, localPath, onProgress)
}

// UploadFile uploads local file with progress tracking
func (c *Client) UploadFile(localPath, remotePath string, onProgress func(TransferProgress)) error {
	localFile, err := os.Open(localPath)
	if err != nil {
		return fmt.Errorf("open local failed: %w", err)
	}
	defer localFile.Close()

	stat, err := localFile.Stat()
	if err != nil {
		return fmt.Errorf("stat failed: %w", err)
	}

	c.mu.Lock()
	remoteFile, err := c.sftpClient.Create(remotePath)
	c.mu.Unlock()
	if err != nil {
		return fmt.Errorf("create remote failed: %w", err)
	}
	defer remoteFile.Close()

	return c.copyWithProgress(remoteFile, localFile, stat.Size(), "upload", remotePath, localPath, onProgress)
}

// UploadFileData uploads base64 encoded data to remote file (for browser uploads)
func (c *Client) UploadFileData(remotePath, base64Data string, onProgress func(TransferProgress)) error {
	data, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return fmt.Errorf("decode base64 failed: %w", err)
	}

	c.mu.Lock()
	remoteFile, err := c.sftpClient.Create(remotePath)
	c.mu.Unlock()
	if err != nil {
		return fmt.Errorf("create remote failed: %w", err)
	}
	defer remoteFile.Close()

	reader := bytes.NewReader(data)
	return c.copyWithProgress(remoteFile, reader, int64(len(data)), "upload", remotePath, "", onProgress)
}

// copyWithProgress copies data with progress callback
func (c *Client) copyWithProgress(dst io.Writer, src io.Reader, total int64, op, remotePath, localPath string, onProgress func(TransferProgress)) error {
	buf := make([]byte, chunkSize)
	var written int64

	for {
		nr, err := src.Read(buf)
		if nr > 0 {
			nw, ew := dst.Write(buf[:nr])
			if nw > 0 {
				written += int64(nw)
			}
			if ew != nil {
				return ew
			}
			if nr != nw {
				return io.ErrShortWrite
			}

			if onProgress != nil {
				pct := float64(written) / float64(total) * 100
				onProgress(TransferProgress{
					Operation:    op,
					RemotePath:   remotePath,
					LocalPath:    localPath,
					BytesTotal:   total,
					BytesCurrent: written,
					Percentage:   pct,
					Completed:    false,
				})
			}
		}

		if err != nil {
			if err == io.EOF {
				break
			}
			return err
		}
	}

	if onProgress != nil {
		onProgress(TransferProgress{
			Operation:    op,
			RemotePath:   remotePath,
			LocalPath:    localPath,
			BytesTotal:   total,
			BytesCurrent: written,
			Percentage:   100,
			Completed:    true,
		})
	}

	return nil
}
