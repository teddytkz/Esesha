package ssh

import (
	"fmt"
	"io"
	"sync"

	"golang.org/x/crypto/ssh"
)

// Session wraps SSH session with PTY
type Session struct {
	ID      string
	client  *Client
	session *ssh.Session
	stdin   io.WriteCloser
	stdout  io.Reader
	stderr  io.Reader
	mu      sync.Mutex
	closed  bool
}

// TerminalModes represents PTY terminal modes
type TerminalModes struct {
	Cols   int
	Rows   int
	Width  int
	Height int
}

// NewSession creates PTY session
func NewSession(id string, client *Client, modes TerminalModes) (*Session, error) {
	sshSession, err := client.NewSession()
	if err != nil {
		return nil, fmt.Errorf("create session failed: %w", err)
	}

	stdin, err := sshSession.StdinPipe()
	if err != nil {
		sshSession.Close()
		return nil, fmt.Errorf("stdin pipe failed: %w", err)
	}

	stdout, err := sshSession.StdoutPipe()
	if err != nil {
		sshSession.Close()
		return nil, fmt.Errorf("stdout pipe failed: %w", err)
	}

	stderr, err := sshSession.StderrPipe()
	if err != nil {
		sshSession.Close()
		return nil, fmt.Errorf("stderr pipe failed: %w", err)
	}

	termModes := ssh.TerminalModes{
		ssh.ECHO:          1,
		ssh.TTY_OP_ISPEED: 14400,
		ssh.TTY_OP_OSPEED: 14400,
	}

	if err := sshSession.RequestPty("xterm-256color", modes.Rows, modes.Cols, termModes); err != nil {
		sshSession.Close()
		return nil, fmt.Errorf("request pty failed: %w", err)
	}

	if err := sshSession.Shell(); err != nil {
		sshSession.Close()
		return nil, fmt.Errorf("start shell failed: %w", err)
	}

	return &Session{
		ID:      id,
		client:  client,
		session: sshSession,
		stdin:   stdin,
		stdout:  stdout,
		stderr:  stderr,
	}, nil
}

// Write sends data to terminal
func (s *Session) Write(data []byte) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed {
		return fmt.Errorf("session closed")
	}

	_, err := s.stdin.Write(data)
	return err
}

// Read reads from stdout
func (s *Session) Read(p []byte) (int, error) {
	return s.stdout.Read(p)
}

// Resize changes terminal dimensions
func (s *Session) Resize(cols, rows int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed {
		return fmt.Errorf("session closed")
	}

	return s.session.WindowChange(rows, cols)
}

// Close closes session
func (s *Session) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed {
		return nil
	}

	s.closed = true

	if s.stdin != nil {
		s.stdin.Close()
	}

	if s.session != nil {
		return s.session.Close()
	}

	return nil
}

// Wait waits for session to complete
func (s *Session) Wait() error {
	return s.session.Wait()
}
