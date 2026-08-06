package ssh

import (
	"fmt"
	"io/ioutil"
	"strings"
	"time"

	"golang.org/x/crypto/ssh"
)

// Client wraps SSH connection
type Client struct {
	conn      *ssh.Client
	config    *ssh.ClientConfig
	keepAlive chan struct{}
}

// NewClient creates SSH client with password auth
func NewClient(host string, port int, username, password string) (*Client, error) {
	return NewClientWithHostKeyCallback(host, port, username, password, "", ssh.InsecureIgnoreHostKey())
}

// NewClientWithHostKeyCallback creates SSH client with custom host key callback
func NewClientWithHostKeyCallback(host string, port int, username, password, privateKeyPath string, hostKeyCallback ssh.HostKeyCallback) (*Client, error) {
	var authMethods []ssh.AuthMethod
	
	if privateKeyPath != "" {
		key, err := ioutil.ReadFile(privateKeyPath)
		if err != nil {
			return nil, fmt.Errorf("read private key failed: %w", err)
		}
		signer, err := ssh.ParsePrivateKey(key)
		if err != nil {
			return nil, fmt.Errorf("parse private key failed: %w", err)
		}
		authMethods = append(authMethods, ssh.PublicKeys(signer))
	} else {
		authMethods = append(authMethods, ssh.Password(password))
	}

	config := &ssh.ClientConfig{
		User:            username,
		Auth:            authMethods,
		HostKeyCallback: hostKeyCallback,
		Timeout:         10 * time.Second,
	}

	addr := fmt.Sprintf("%s:%d", host, port)
	conn, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		return nil, fmt.Errorf("ssh dial failed: %w", err)
	}

	return &Client{conn: conn, config: config}, nil
}

// NewClientWithKey creates SSH client with private key auth
func NewClientWithKey(host string, port int, username, privateKeyPath string) (*Client, error) {
	return NewClientWithKeyAndPassphrase(host, port, username, privateKeyPath, "")
}

// NewClientWithKeyAndPassphrase creates SSH client with private key auth and optional passphrase
func NewClientWithKeyAndPassphrase(host string, port int, username, privateKeyPath, passphrase string) (*Client, error) {
	return NewClientWithKeyPassphraseAndHostKey(host, port, username, privateKeyPath, passphrase, ssh.InsecureIgnoreHostKey())
}

// NewClientWithKeyPassphraseAndHostKey creates SSH client with all options
func NewClientWithKeyPassphraseAndHostKey(host string, port int, username, privateKeyPath, passphrase string, hostKeyCallback ssh.HostKeyCallback) (*Client, error) {
	key, err := ioutil.ReadFile(privateKeyPath)
	if err != nil {
		return nil, fmt.Errorf("read private key failed: %w", err)
	}

	var signer ssh.Signer
	if strings.Contains(string(key), "ENCRYPTED") || passphrase != "" {
		signer, err = ssh.ParsePrivateKeyWithPassphrase(key, []byte(passphrase))
		if err != nil {
			return nil, fmt.Errorf("parse encrypted private key failed: %w", err)
		}
	} else {
		signer, err = ssh.ParsePrivateKey(key)
		if err != nil {
			return nil, fmt.Errorf("parse private key failed: %w", err)
		}
	}

	config := &ssh.ClientConfig{
		User: username,
		Auth: []ssh.AuthMethod{
			ssh.PublicKeys(signer),
		},
		HostKeyCallback: hostKeyCallback,
		Timeout:         10 * time.Second,
	}

	addr := fmt.Sprintf("%s:%d", host, port)
	conn, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		return nil, fmt.Errorf("ssh dial failed: %w", err)
	}

	return &Client{conn: conn, config: config}, nil
}

// NewSession creates new SSH session
func (c *Client) NewSession() (*ssh.Session, error) {
	return c.conn.NewSession()
}

// Close closes SSH connection
func (c *Client) Close() error {
	if c.keepAlive != nil {
		close(c.keepAlive)
	}
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}

// KeepAlive sends keepalive to prevent timeout
func (c *Client) KeepAlive(interval time.Duration) {
	c.keepAlive = make(chan struct{})
	ticker := time.NewTicker(interval)
	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-c.keepAlive:
				return
			case <-ticker.C:
				_, _, _ = c.conn.SendRequest("keepalive@openssh.com", true, nil)
			}
		}
	}()
}

// GetSSHClient returns underlying SSH client for SFTP
func (c *Client) GetSSHClient() *ssh.Client {
	return c.conn
}
