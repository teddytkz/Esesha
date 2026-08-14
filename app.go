package main

import (
	"context"
	"encoding/base64"
	"esesha/internal/converter"
	"esesha/internal/crypto"
	"esesha/internal/db"
	"esesha/internal/editor"
	"esesha/internal/models"
	"esesha/internal/sftp"
	"esesha/internal/ssh"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"time"

	"github.com/go-ole/go-ole"
	"github.com/go-ole/go-ole/oleutil"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx           context.Context
	store         *db.Store
	sshManager    *ssh.Manager
	sftpManager   *sftp.Manager
	editorManager *editor.Manager
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	store, err := db.New()
	if err != nil {
		fmt.Printf("Failed to initialize database: %v\n", err)
		return
	}
	a.store = store

	// Initialize SSH manager with event callbacks
	a.sshManager = ssh.NewManager()
	a.sshManager.SetHostKeyStore(store)

	// Host key verification callbacks
	onNewHost := func(hostname, fingerprint string) (bool, error) {
		selection, err := runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
			Type:          runtime.QuestionDialog,
			Title:         "Unknown Host Key",
			Message:       fmt.Sprintf("The authenticity of host '%s' can't be established.\n\nFingerprint: %s\n\nDo you want to continue connecting?", hostname, fingerprint),
			Buttons:       []string{"Yes", "No"},
			DefaultButton: "No",
		})
		if err != nil {
			return false, err
		}
		return selection == "Yes", nil
	}

	onKeyMoved := func(hostname, fingerprint, oldFingerprint string) (bool, error) {
		selection, err := runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
			Type:          runtime.WarningDialog,
			Title:         "WARNING: Host Key Changed",
			Message:       fmt.Sprintf("The host key for '%s' has changed!\n\nOld fingerprint: %s\nNew fingerprint: %s\n\nThis could indicate a man-in-the-middle attack.\nDo you want to trust the new key?", hostname, oldFingerprint, fingerprint),
			Buttons:       []string{"Yes", "No"},
			DefaultButton: "No",
		})
		if err != nil {
			return false, err
		}
		return selection == "Yes", nil
	}

	a.sshManager.SetHostKeyCallbacks(onNewHost, onKeyMoved)

	a.sshManager.SetCallbacks(
		func(sessionID string, data []byte) {
			runtime.EventsEmit(ctx, "ssh:output", map[string]interface{}{
				"sessionId": sessionID,
				"data":      string(data),
			})
		},
		func(sessionID string, err error) {
			runtime.EventsEmit(ctx, "ssh:error", map[string]interface{}{
				"sessionId": sessionID,
				"error":     err.Error(),
			})
		},
		func(sessionID string) {
			runtime.EventsEmit(ctx, "ssh:closed", map[string]interface{}{
				"sessionId": sessionID,
			})
		},
	)

	// Initialize SFTP manager
	a.sftpManager = sftp.NewManager()

	// Initialize editor manager
	editorMgr, err := editor.NewManager()
	if err != nil {
		fmt.Printf("Failed to initialize editor manager: %v\n", err)
	} else {
		a.editorManager = editorMgr
	}
}

func (a *App) shutdown(ctx context.Context) {
	if a.editorManager != nil {
		a.editorManager.Cleanup()
	}
	if a.sftpManager != nil {
		a.sftpManager.CloseAll()
	}
	if a.sshManager != nil {
		a.sshManager.DisconnectAll()
	}
	if a.store != nil {
		a.store.Close()
	}
}

// CreateConnection creates a new SSH connection profile
func (a *App) CreateConnection(name, host string, port int, username, password, privateKeyPath string) (int, error) {
	var encryptedPassword []byte
	if password != "" {
		encrypted, err := crypto.Encrypt([]byte(password))
		if err != nil {
			return 0, fmt.Errorf("failed to encrypt password: %w", err)
		}
		encryptedPassword = encrypted
	}

	conn := &models.Connection{
		Name:              name,
		Host:              host,
		Port:              port,
		Username:          username,
		EncryptedPassword: encryptedPassword,
		PrivateKeyPath:    privateKeyPath,
	}

	if err := a.store.CreateConnection(conn); err != nil {
		return 0, err
	}

	return conn.ID, nil
}

// ImportConnectionFromBackup imports a connection with an existing encrypted password
// (used when restoring backups that contain encrypted_password field)
func (a *App) ImportConnectionFromBackup(name, host string, port int, username, privateKeyPath string, encryptedPassword []byte) (int, error) {
	conn := &models.Connection{
		Name:              name,
		Host:              host,
		Port:              port,
		Username:          username,
		EncryptedPassword: encryptedPassword,
		PrivateKeyPath:    privateKeyPath,
	}

	if err := a.store.CreateConnection(conn); err != nil {
		return 0, err
	}

	return conn.ID, nil
}

// GetConnection retrieves a connection by ID
func (a *App) GetConnection(id int) (*models.Connection, error) {
	return a.store.GetConnection(id)
}

// ListConnections retrieves all connections
func (a *App) ListConnections() ([]*models.Connection, error) {
	return a.store.ListConnections()
}

// UpdateConnection updates an existing connection
func (a *App) UpdateConnection(id int, name, host string, port int, username, password, privateKeyPath string) error {
	conn, err := a.store.GetConnection(id)
	if err != nil {
		return err
	}
	if conn == nil {
		return fmt.Errorf("connection not found")
	}

	conn.Name = name
	conn.Host = host
	conn.Port = port
	conn.Username = username
	conn.PrivateKeyPath = privateKeyPath

	if password != "" {
		encrypted, err := crypto.Encrypt([]byte(password))
		if err != nil {
			return fmt.Errorf("failed to encrypt password: %w", err)
		}
		conn.EncryptedPassword = encrypted
	}

	return a.store.UpdateConnection(conn)
}

// DeleteConnection deletes a connection by ID
func (a *App) DeleteConnection(id int) error {
	return a.store.DeleteConnection(id)
}

// GetDecryptedPassword retrieves and decrypts the password for a connection
func (a *App) GetDecryptedPassword(id int) (string, error) {
	conn, err := a.store.GetConnection(id)
	if err != nil {
		return "", err
	}
	if conn == nil {
		return "", fmt.Errorf("connection not found")
	}
	if len(conn.EncryptedPassword) == 0 {
		return "", nil
	}

	decrypted, err := crypto.Decrypt(conn.EncryptedPassword)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt password: %w", err)
	}
	return string(decrypted), nil
}

// SelectPrivateKeyFile opens file picker to select private key file
func (a *App) SelectPrivateKeyFile() (string, error) {
	filePath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Private Key File",
		Filters: []runtime.FileFilter{
			{DisplayName: "Private Key Files", Pattern: "*.pem;*.key;*.ppk;id_rsa;id_ecdsa;id_ed25519"},
			{DisplayName: "All Files", Pattern: "*"},
		},
	})
	return filePath, err
}

// SelectPEMOutputFile opens a file save dialog for PEM output
func (a *App) SelectPEMOutputFile(defaultFilename string) (string, error) {
	filePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Save PEM File",
		DefaultFilename: defaultFilename,
		Filters: []runtime.FileFilter{
			{DisplayName: "PEM Files", Pattern: "*.pem"},
			{DisplayName: "All Files", Pattern: "*"},
		},
	})
	return filePath, err
}

// ConvertPPKToPEM converts a PuTTY .ppk file to OpenSSH PEM format
func (a *App) ConvertPPKToPEM(ppkPath, pemPath, passphrase string) error {
	return converter.ConvertPPKToPEM(ppkPath, pemPath, passphrase)
}

// ConnectSSH establishes SSH connection and starts PTY session
func (a *App) ConnectSSH(connectionID int, cols, rows int) (string, error) {
	return a.ConnectSSHWithPassphrase(connectionID, "", cols, rows)
}

// ConnectSSHWithPassphrase establishes SSH connection with optional key passphrase
func (a *App) ConnectSSHWithPassphrase(connectionID int, keyPassphrase string, cols, rows int) (string, error) {
	conn, err := a.store.GetConnection(connectionID)
	if err != nil {
		return "", err
	}
	if conn == nil {
		return "", fmt.Errorf("connection not found")
	}

	var password string
	if len(conn.EncryptedPassword) > 0 {
		decrypted, err := crypto.Decrypt(conn.EncryptedPassword)
		if err != nil {
			return "", fmt.Errorf("failed to decrypt password: %w", err)
		}
		password = string(decrypted)
	}

	sessionID, err := a.sshManager.ConnectWithPassphrase(
		conn.Host,
		conn.Port,
		conn.Username,
		password,
		conn.PrivateKeyPath,
		keyPassphrase,
		cols,
		rows,
	)

	if err != nil {
		return "", fmt.Errorf("ssh connection failed: %w", err)
	}

	return sessionID, nil
}

// PingConnection measures TCP connection latency to the host in milliseconds
func (a *App) PingConnection(connectionID int) (int64, error) {
	conn, err := a.store.GetConnection(connectionID)
	if err != nil {
		return 0, err
	}
	if conn == nil {
		return 0, fmt.Errorf("connection not found")
	}

	start := time.Now()
	netConn, err := net.DialTimeout("tcp", fmt.Sprintf("%s:%d", conn.Host, conn.Port), 5*time.Second)
	if err != nil {
		return 0, fmt.Errorf("ping failed: %w", err)
	}
	netConn.Close()
	return time.Since(start).Milliseconds(), nil
}

// SendInput sends input to SSH session
func (a *App) SendInput(sessionID string, data string) error {
	return a.sshManager.SendInput(sessionID, []byte(data))
}

// ResizeTerminal resizes SSH terminal
func (a *App) ResizeTerminal(sessionID string, cols, rows int) error {
	return a.sshManager.Resize(sessionID, cols, rows)
}

// DisconnectSSH closes SSH session
func (a *App) DisconnectSSH(sessionID string) error {
	return a.sshManager.Disconnect(sessionID)
}

// GetActiveSessions returns count of active SSH sessions
func (a *App) GetActiveSessions() int {
	return a.sshManager.ActiveSessions()
}

// ListDirectory lists files in remote directory via SFTP
func (a *App) ListDirectory(sessionID, path string) ([]sftp.FileInfo, error) {
	sshClient, err := a.sshManager.GetSSHClient(sessionID)
	if err != nil {
		return nil, err
	}

	sftpClient, err := a.sftpManager.GetOrCreateClient(sessionID, sshClient.GetSSHClient())
	if err != nil {
		return nil, fmt.Errorf("sftp init failed: %w", err)
	}

	return sftpClient.ListDirectory(path)
}

// DownloadFile downloads file from remote via SFTP
func (a *App) DownloadFile(sessionID, remotePath, localPath string) error {
	sshClient, err := a.sshManager.GetSSHClient(sessionID)
	if err != nil {
		return err
	}

	sftpClient, err := a.sftpManager.GetOrCreateClient(sessionID, sshClient.GetSSHClient())
	if err != nil {
		return fmt.Errorf("sftp init failed: %w", err)
	}

	return sftpClient.DownloadFile(remotePath, localPath, func(progress sftp.TransferProgress) {
		progress.SessionID = sessionID
		runtime.EventsEmit(a.ctx, "sftp:progress", progress)
	})
}

// UploadFile uploads file to remote via SFTP
func (a *App) UploadFile(sessionID, localPath, remotePath string) error {
	sshClient, err := a.sshManager.GetSSHClient(sessionID)
	if err != nil {
		return err
	}

	sftpClient, err := a.sftpManager.GetOrCreateClient(sessionID, sshClient.GetSSHClient())
	if err != nil {
		return fmt.Errorf("sftp init failed: %w", err)
	}

	return sftpClient.UploadFile(localPath, remotePath, func(progress sftp.TransferProgress) {
		progress.SessionID = sessionID
		runtime.EventsEmit(a.ctx, "sftp:progress", progress)
	})
}

// UploadFileData uploads file content from base64 data (for browser uploads)
func (a *App) UploadFileData(sessionID, remotePath, base64Data string) error {
	sshClient, err := a.sshManager.GetSSHClient(sessionID)
	if err != nil {
		return err
	}

	sftpClient, err := a.sftpManager.GetOrCreateClient(sessionID, sshClient.GetSSHClient())
	if err != nil {
		return fmt.Errorf("sftp init failed: %w", err)
	}

	return sftpClient.UploadFileData(remotePath, base64Data, func(progress sftp.TransferProgress) {
		progress.SessionID = sessionID
		runtime.EventsEmit(a.ctx, "sftp:progress", progress)
	})
}

// DownloadFileToDialog downloads file and shows save dialog
func (a *App) DownloadFileToDialog(sessionID, remotePath string) error {
	// Show save dialog
	savePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		DefaultFilename: filepath.Base(remotePath),
		Title:           "Save File",
	})
	if err != nil || savePath == "" {
		return err
	}

	return a.DownloadFile(sessionID, remotePath, savePath)
}

// ReadFile reads a remote file and returns its contents as base64
func (a *App) ReadFile(sessionID, remotePath string) (string, error) {
	sshClient, err := a.sshManager.GetSSHClient(sessionID)
	if err != nil {
		return "", err
	}

	sftpClient, err := a.sftpManager.GetOrCreateClient(sessionID, sshClient.GetSSHClient())
	if err != nil {
		return "", fmt.Errorf("sftp init failed: %w", err)
	}

	c := sftpClient.GetClient()
	f, err := c.Open(remotePath)
	if err != nil {
		return "", err
	}
	defer f.Close()

	stat, err := f.Stat()
	if err != nil {
		return "", err
	}

	data := make([]byte, stat.Size())
	_, err = f.Read(data)
	if err != nil {
		return "", err
	}

	return base64.StdEncoding.EncodeToString(data), nil
}

// WriteFile writes base64 data to a remote file
func (a *App) WriteFile(sessionID, remotePath, base64Data string) error {
	data, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return fmt.Errorf("decode base64 failed: %w", err)
	}

	sshClient, err := a.sshManager.GetSSHClient(sessionID)
	if err != nil {
		return err
	}

	sftpClient, err := a.sftpManager.GetOrCreateClient(sessionID, sshClient.GetSSHClient())
	if err != nil {
		return fmt.Errorf("sftp init failed: %w", err)
	}

	c := sftpClient.GetClient()
	f, err := c.Create(remotePath)
	if err != nil {
		return err
	}
	defer f.Close()

	if _, err := f.Write(data); err != nil {
		return err
	}

	runtime.EventsEmit(a.ctx, "editor:saved", map[string]interface{}{
		"sessionId":  sessionID,
		"remotePath": remotePath,
	})
	return nil
}

// DeletePath deletes file or directory via SFTP
func (a *App) DeletePath(sessionID, remotePath string) error {
	sshClient, err := a.sshManager.GetSSHClient(sessionID)
	if err != nil {
		return err
	}

	sftpClient, err := a.sftpManager.GetOrCreateClient(sessionID, sshClient.GetSSHClient())
	if err != nil {
		return fmt.Errorf("sftp init failed: %w", err)
	}

	return sftpClient.DeletePath(remotePath)
}

// RenamePath renames file or directory via SFTP
func (a *App) RenamePath(sessionID, oldPath, newPath string) error {
	sshClient, err := a.sshManager.GetSSHClient(sessionID)
	if err != nil {
		return err
	}

	sftpClient, err := a.sftpManager.GetOrCreateClient(sessionID, sshClient.GetSSHClient())
	if err != nil {
		return fmt.Errorf("sftp init failed: %w", err)
	}

	return sftpClient.RenamePath(oldPath, newPath)
}

// CreateDirectory creates directory via SFTP
func (a *App) CreateDirectory(sessionID, path string) error {
	sshClient, err := a.sshManager.GetSSHClient(sessionID)
	if err != nil {
		return err
	}

	sftpClient, err := a.sftpManager.GetOrCreateClient(sessionID, sshClient.GetSSHClient())
	if err != nil {
		return fmt.Errorf("sftp init failed: %w", err)
	}

	return sftpClient.CreateDirectory(path)
}

// ChangePermissions changes file/dir permissions via SFTP
func (a *App) ChangePermissions(sessionID, path string, mode uint32) error {
	sshClient, err := a.sshManager.GetSSHClient(sessionID)
	if err != nil {
		return err
	}

	sftpClient, err := a.sftpManager.GetOrCreateClient(sessionID, sshClient.GetSSHClient())
	if err != nil {
		return fmt.Errorf("sftp init failed: %w", err)
	}

	return sftpClient.ChangePermissions(path, os.FileMode(mode))
}

// EditFile downloads remote file, opens in editor, watches for changes and auto-uploads
func (a *App) EditFile(sessionID, remotePath string) error {
	if a.editorManager == nil {
		return fmt.Errorf("editor manager not initialized")
	}

	sshClient, err := a.sshManager.GetSSHClient(sessionID)
	if err != nil {
		return err
	}

	sftpClient, err := a.sftpManager.GetOrCreateClient(sessionID, sshClient.GetSSHClient())
	if err != nil {
		return fmt.Errorf("sftp init failed: %w", err)
	}

	downloadFunc := func() ([]byte, error) {
		c := sftpClient.GetClient()
		f, err := c.Open(remotePath)
		if err != nil {
			return nil, err
		}
		defer f.Close()

		stat, err := f.Stat()
		if err != nil {
			return nil, err
		}

		data := make([]byte, stat.Size())
		_, err = f.Read(data)
		return data, err
	}

	uploadFunc := func(data []byte) error {
		c := sftpClient.GetClient()
		f, err := c.Create(remotePath)
		if err != nil {
			return err
		}
		defer f.Close()

		_, err = f.Write(data)
		if err != nil {
			return err
		}

		runtime.EventsEmit(a.ctx, "editor:saved", map[string]interface{}{
			"sessionId":  sessionID,
			"remotePath": remotePath,
		})
		return nil
	}

	_, err = a.editorManager.EditFile(sessionID, remotePath, downloadFunc, uploadFunc)
	if err != nil {
		runtime.EventsEmit(a.ctx, "editor:error", map[string]interface{}{
			"sessionId":  sessionID,
			"remotePath": remotePath,
			"error":      err.Error(),
		})
		return err
	}

	return nil
}

// BackupConnections exports connections to backup folder
func (a *App) BackupConnections() (string, error) {
	// Get executable directory
	exePath, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("get executable path: %w", err)
	}
	exeDir := filepath.Dir(exePath)

	// Create backup directory if not exists
	backupDir := filepath.Join(exeDir, "backup")
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		return "", fmt.Errorf("create backup directory: %w", err)
	}

	// Generate filename with timestamp
	filename := fmt.Sprintf("esesha-backup-%s.json", time.Now().Format("20060102-150405"))
	filePath := filepath.Join(backupDir, filename)

	if err := a.store.ExportJSON(filePath); err != nil {
		return "", err
	}

	return filePath, nil
}

// RestoreConnections imports connections from a user-selected JSON file
func (a *App) RestoreConnections() error {
	filePath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Restore Connections",
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON Files (*.json)", Pattern: "*.json"},
			{DisplayName: "All Files (*.*)", Pattern: "*.*"},
		},
	})
	if err != nil {
		return fmt.Errorf("dialog error: %w", err)
	}
	if filePath == "" {
		return nil // User cancelled, not an error
	}

	return a.store.ImportJSON(filePath)
}

// CreateDesktopShortcut creates a Windows .lnk shortcut on the desktop
func (a *App) CreateDesktopShortcut() error {
	exePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("get executable path: %w", err)
	}

	homeDir, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("get home dir: %w", err)
	}

	shortcutPath := filepath.Join(homeDir, "Desktop", "Esesha SSH Manager.lnk")
	workingDir := filepath.Dir(exePath)

	ole.CoInitializeEx(0, ole.COINIT_APARTMENTTHREADED|ole.COINIT_SPEED_OVER_MEMORY)
	defer ole.CoUninitialize()

	oleShellObject, err := oleutil.CreateObject("WScript.Shell")
	if err != nil {
		return fmt.Errorf("create shell object: %w", err)
	}
	defer oleShellObject.Release()

	wshell, err := oleShellObject.QueryInterface(ole.IID_IDispatch)
	if err != nil {
		return fmt.Errorf("query interface: %w", err)
	}
	defer wshell.Release()

	cs, err := oleutil.CallMethod(wshell, "CreateShortcut", shortcutPath)
	if err != nil {
		return fmt.Errorf("create shortcut: %w", err)
	}
	idispatch := cs.ToIDispatch()
	defer idispatch.Release()

	oleutil.PutProperty(idispatch, "TargetPath", exePath)
	oleutil.PutProperty(idispatch, "WorkingDirectory", workingDir)
	oleutil.PutProperty(idispatch, "Description", "Esesha SSH Manager - Secure SSH and SFTP Client")

	_, err = oleutil.CallMethod(idispatch, "Save")
	if err != nil {
		return fmt.Errorf("save shortcut: %w", err)
	}

	return nil
}

// GetAboutInfo returns application metadata
func (a *App) GetAboutInfo() map[string]string {
	return map[string]string{
		"name":    "Esesha SSH Manager",
		"version": "1.0.0",
		"license": "MIT",
		"credits": "Built with Wails v2.13.0\nGo 1.25.0 + React 18 + TypeScript 5",
	}
}
