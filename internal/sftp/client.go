package sftp

import (
	"fmt"
	"sync"

	"github.com/pkg/sftp"
	"golang.org/x/crypto/ssh"
)

// Client wraps SFTP connection
type Client struct {
	sftpClient *sftp.Client
	sshClient  *ssh.Client
	mu         sync.Mutex
}

// NewClient creates SFTP client from existing SSH connection
func NewClient(sshClient *ssh.Client) (*Client, error) {
	sftpClient, err := sftp.NewClient(sshClient)
	if err != nil {
		return nil, fmt.Errorf("sftp init failed: %w", err)
	}

	return &Client{
		sftpClient: sftpClient,
		sshClient:  sshClient,
	}, nil
}

// Close closes SFTP connection
func (c *Client) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.sftpClient != nil {
		return c.sftpClient.Close()
	}
	return nil
}

// GetClient returns underlying SFTP client
func (c *Client) GetClient() *sftp.Client {
	return c.sftpClient
}
