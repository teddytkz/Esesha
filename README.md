# Esesha

**Modern SSH/SFTP Desktop Manager (Windows, macOS, Linux)**

Esesha is a lightweight, single-executable SSH connection manager with integrated terminal emulation and SFTP file browser. Think Termius meets WinSCP, built for speed and security.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Interface

Esesha's UI is a futuristic **"Mission Control"** console — deep space-navy surfaces, cyan/violet accents, an animated connection status bar, and scanline sidebar texture. No more default-editor look.

> **Screenshots coming soon.** Placeholder for the redesigned UI: sidebar with connection cards and scanline texture · animated status bar · empty states · loading skeletons.

_Design system reference: [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md)_

---

## Features

### Connection Management
- **SSH Connection Manager** — Save connection profiles with encrypted credentials
- **Connection Ping** — Measure TCP latency to verify host availability before connecting
- **Backup & Restore** — Export/import connections to JSON with automatic key file backup
- **Multi-Session Support** — Connect to multiple servers simultaneously
- **Active Session Counter** — Track number of active SSH connections

### Terminal & SSH
- **Interactive Terminal** — Full-featured terminal emulation with xterm.js
- **Copy/Paste Support** — Right-click menu or `Ctrl`+`C` / `Ctrl`+`V` with Windows clipboard integration
- **Terminal Resize** — Dynamic terminal resizing with PTY support
- **Keyboard Accessibility** — Full keyboard navigation support
- **Host Key Verification** — Protection against MITM attacks with SHA-256 fingerprint verification
- **Encrypted Private Key Support** — Use passphrase-protected SSH keys with secure passphrase dialog

### File Management (SFTP)
- **SFTP File Browser** — Browse, download, edit remote files with tree view
- **Batch Upload Dialog** — Multi-file upload with per-file progress, speed tracking, and cancel controls
- **Drag & Drop Upload** — Drag files from OS file explorer directly into upload dialog
- **Download to Dialog** — Save remote files with native save dialog
- **System Editor Integration** — Edit remote files with your favorite local editor, auto-upload on save
- **File Operations** — Create files/folders, rename, delete, change permissions (chmod)
- **Read/Write File** — Direct file content read/write with base64 encoding for binary safety

### Security & Encryption
- **Encrypted Binary Storage** — AES-256-GCM full-file encryption with machine binding (Windows Machine GUID + exe path)
- **Secure Credential Storage** — Windows DPAPI encryption for passwords and private keys
- **Key File Management** — Automatic copy of private keys to secure `keys/` folder with 0600 permissions
- **Encrypted Key Storage** — Private key content encrypted with DPAPI before storage
- **Passphrase Dialog** — Secure input dialog for encrypted private keys

### Tools & Utilities
- **PPK to PEM Converter** — Convert PuTTY `.ppk` keys to OpenSSH `.pem` from **Tools → PPK Formatter**
  - Pure-Go implementation (no external dependencies)
  - Supports RSA, ECDSA, Ed25519 keys
  - Handles PuTTY v2 and v3 formats
  - Passphrase-protected keys supported
- **Desktop Shortcut Creation** — Create shortcuts from File menu at runtime
- **About Dialog** — Application version and credits information
- **Native Menu System** — File, Tools, and Help menus with keyboard shortcuts (Ctrl+Q to exit)

### User Interface
- **"Mission Control" Theme** — Deep space-navy surfaces, cyan/violet accents, animated status bar
- **Professional Icon System** — SVG icons with full accessibility support (lucide-react)
- **Polished UI** — Smooth animations, hover effects, consistent spacing, scanline sidebar texture
- **Empty States** — Helpful guidance when no connections exist
- **Loading Skeletons** — Smooth loading indicators during operations
- **Error Handling** — Clear error messages with visual feedback

### Platform & Distribution
- **Single Executable** — No installation required, ~13-16 MB
- **Single Instance** — Only one app instance allowed (Windows mutex), focuses existing window
- **Cross-Platform** — Windows, macOS, Linux support

---

## Quick Start

### Download & Run

1. Download `esesha.exe` from the [releases page](https://github.com/yourusername/esesha/releases)
2. Double-click to run — no installation needed
3. Add your first SSH connection
4. Start connecting!

### System Requirements

- **OS:** Windows 10 (1809+) or Windows 11, macOS, or Linux
- **Architecture:** x64 (AMD64)
- **RAM:** 100 MB minimum
- **Storage:** 50 MB for application and database
- **No external dependencies required** — everything is bundled in a single executable

---

## Usage Overview

### Adding a Connection

1. Click **[+] New Connection** button
2. Fill in connection details:
   - **Name** — Friendly name (e.g., "Production Server")
   - **Host** — Hostname or IP address (e.g., `server.example.com`)
   - **Port** — SSH port (default: 22)
   - **Username** — SSH username
   - **Authentication** — Choose one:
     - **Password** — Enter password (encrypted with DPAPI)
     - **Private Key** — Click "Select Private Key File" to choose a `.pem`, `.key`, or `.ppk` file
       - Key file is automatically copied to `keys/` folder
       - Key content is encrypted with DPAPI before storage
       - If key is passphrase-protected, you'll be prompted on connection
3. Click **Save** — connection is stored in encrypted `esesha.bin`

**Optional:** Click the connection's **⋮** menu → **Test Connection** to ping the host and measure latency.

### Connecting via SSH

1. Select a connection from the sidebar
2. Click **Connect** button
3. **Authentication flow:**
   - If using an encrypted private key, passphrase dialog appears
   - On first connection, host key verification dialog shows SHA-256 fingerprint
   - Click **Yes** to trust and store the host key
4. Terminal opens with active SSH session
5. Start typing commands — output appears in real-time
6. **Terminal features:**
   - Copy: Select text and right-click → Copy (or `Ctrl+C` when text is selected)
   - Paste: Right-click → Paste (or `Ctrl+V`)
   - Resize: Terminal automatically resizes with window
   - Web Links: Clickable URLs (via WebLinksAddon)

**Multiple sessions:** Click **Connect** on another connection to open a second terminal tab.

### Browsing Files via SFTP

1. While connected, click **Files** button
2. Navigate the file tree (double-click folders)
3. Use toolbar buttons:
   - **Upload** — Opens batch upload dialog for multiple files
   - **New Folder** — Create a new directory
   - **New File** — Create a new empty file
   - **Refresh** — Reload directory listing
   - **Go Up** — Navigate to parent directory
4. Right-click on files/folders for actions:
   - **Download** — Save to local machine with save dialog
   - **Edit** — Opens in system default editor, auto-uploads on save
   - **Delete** — Remove file or directory
   - **Rename** — Change name
   - **Permissions** — Change chmod (Unix file permissions)
5. **Upload Dialog** features:
   - Drag & drop files from OS file explorer
   - Multi-file selection and management
   - Per-file progress bars with transfer speed
   - Overall progress tracking
   - Cancel individual or all uploads
   - See [File Manager & Upload Dialog](docs/user-guide/file-manager.md)

### Converting a PuTTY Key (.ppk → .pem)

1. Click **Tools → PPK Formatter**
2. **Select PPK File** — choose your PuTTY private key
3. Enter the **passphrase** (leave blank if the key is unencrypted)
4. **Select Output** — the `.pem` filename is suggested automatically
5. Click **Convert** — the tool will:
   - Validate the PPK format
   - Decrypt with passphrase (if encrypted)
   - Convert to OpenSSH PEM format
   - Save with 0600 permissions (Unix)
6. Use the `.pem` as a Private Key in any connection

**Supported formats:**
- PuTTY v2 and v3 formats
- RSA, ECDSA (256/384/521), Ed25519 keys
- Encrypted and unencrypted keys

No PuTTY installation needed. See [PPK to PEM Converter](docs/guides/ppk-converter.md).

---

## Building from Source

### Prerequisites

- [Go 1.21+](https://go.dev/dl/)
- [Node.js 18+](https://nodejs.org/)
- [Wails CLI v2.9+](https://wails.io/docs/gettingstarted/installation)

### Development Build

```bash
wails dev
```

Opens application with hot-reload enabled.

### Production Build

```bash
wails build -clean -platform windows/amd64 -ldflags "-s -w"
```

Or use the build script:

```cmd
build.bat
```

**Output:** `build\bin\esesha.exe` (~13-16 MB)

---

## Documentation

- **[Documentation Index](docs/README.md)** — Complete documentation structure
- **[Design System](docs/DESIGN-SYSTEM.md)** — "Mission Control" UI design system (colors, typography, motion, components)
- **[Changelog](docs/planning/changelog.md)** — Complete project history and version tracking

### User Guides
- **[Terminal Guide](docs/user-guide/terminal.md)** — Using the interactive SSH terminal
- **[File Manager](docs/user-guide/file-manager.md)** — SFTP file browser and upload dialog
- **[Backup & Restore](docs/user-guide/backup-restore.md)** — Exporting and importing connections
- **[PPK Converter](docs/guides/ppk-converter.md)** — Converting PuTTY keys to OpenSSH format

### Technical Documentation
- **[Connection API](docs/api/connection-api.md)** — Connection management API reference
- **[Key Management](docs/features/key-file-management.md)** — Private key storage and security
- **[Secure Key Storage](docs/features/secure-key-storage.md)** — DPAPI encryption implementation
- **[PEM Encryption](docs/technical/pem-encryption.md)** — Private key encryption technical details

### Component Documentation
- **[File Explorer](docs/components/file-explorer.md)** — SFTP file browser component
- **[Terminal](docs/components/terminal.md)** — xterm.js terminal component
- **[Upload Dialog](docs/components/upload-dialog.md)** — Batch upload dialog component

---

## Security

### Encryption & Storage
- **Machine-Bound Encryption:** AES-256-GCM full-file encryption with key derived from Windows Machine GUID + exe path
- **No Separate Key File:** Only 2 files needed: `esesha.exe` + `esesha.bin` (no registry storage)
- **Credentials:** SSH passwords encrypted with Windows DPAPI (CurrentUser scope)
- **Private Key Storage:** Key file content encrypted with DPAPI before storage in database
- **Key File Management:** Imported keys automatically copied to `keys/` folder with secure permissions

### Connection Security
- **Host Key Verification:** SHA-256 fingerprint verification on first connection
- **MITM Protection:** Alerts when host key changes (potential man-in-the-middle attack)
- **Interactive Verification:** Dialogs for unknown or changed host keys
- **Host Key Storage:** Persistent storage of verified host keys in encrypted database

### Key Management
- **Passphrase Support:** Secure passphrase input for encrypted private keys
- **Key Validation:** SSH key format validation before storage
- **Secure Key Copy:** Keys copied to local `keys/` folder with 0600 permissions
- **Timestamp Deduplication:** Automatic filename deduplication for key imports

### File Operations
- **Temp Files:** Created with 0600 permissions, random names, auto-cleanup
- **Path Validation:** Protection against directory traversal attacks
- **Safe Uploads:** Progress tracking with cancellation support
- **Editor Integration:** Temporary file watching with secure cleanup

### Converter Security
- **PEM Permissions:** Converted PEM files written with 0600 permissions (Unix)
- **Passphrase Safety:** Passphrases never logged or stored
- **Format Validation:** Strict PPK format validation before conversion

### Backup & Restore
- **Encrypted Backups:** Connection backups include encrypted password/key data
- **Key File Backup:** Automatic backup of `keys/` folder alongside connection data
- **Timestamped Backups:** Backup files named with timestamp to prevent overwrites

**Security Note:** Machine-bound encryption provides convenience (no extra files) but is tied to the specific machine and exe path. Suitable for personal computers and casual protection. Not recommended for shared computers or highly sensitive credentials. For maximum security, store connections on an encrypted drive and use key-based authentication with passphrase-protected keys.

---

## Tech Stack

### Backend (Go)
- **Language:** Go 1.21+
- **SSH/SFTP:** `golang.org/x/crypto/ssh` for SSH protocol and SFTP operations
- **Encryption:** AES-256-GCM with `crypto/aes` and `crypto/cipher`
- **DPAPI:** Windows DPAPI via `golang.org/x/sys/windows` for credential encryption
- **PPK Converter:** Pure-Go implementation supporting PuTTY v2/v3 formats
- **File Operations:** `os`, `filepath`, `io` for file management and temp file handling
- **COM Integration:** `github.com/go-ole/go-ole` for clipboard and shortcut creation

### Frontend (React)
- **Framework:** React 18 + TypeScript 5
- **Build Tool:** Vite 5.4
- **Terminal:** xterm.js with FitAddon and WebLinksAddon
- **Icons:** lucide-react (SVG icons with accessibility)
- **CSS:** CSS Modules for scoped styling
- **Type Safety:** Full TypeScript coverage with strict mode

### Desktop Integration
- **Framework:** Wails v2.9+
- **IPC:** Go ↔ JavaScript bindings with Wails runtime
- **Events:** Real-time event system for SSH output, errors, and SFTP progress
- **Dialogs:** Native file dialogs (open, save) and message dialogs
- **Menus:** Native menu bar integration (Windows)
- **Single Instance:** Windows named mutex for single-instance enforcement

### Storage & Crypto
- **Format:** Custom binary format with AES-256-GCM encryption
- **Key Derivation:** Machine GUID + exe path → SHA-256 hash → AES key
- **Credential Storage:** Windows DPAPI (CurrentUser scope) for passwords and keys
- **Host Keys:** SHA-256 fingerprint storage in encrypted database
- **Backup Format:** JSON export with encrypted credentials preserved

---

## Project Structure

```
esesha/
├── main.go                 # Application entry point with single-instance guard
├── app.go                  # Wails application methods and IPC handlers
├── go.mod                  # Go dependencies
├── wails.json              # Wails configuration
├── build.bat               # Windows build script
├── internal/               # Internal Go packages
│   ├── ssh/                # SSH client and session management
│   │   ├── manager.go      # SSH connection pool and session lifecycle
│   │   ├── client.go       # SSH client wrapper with auth
│   │   ├── session.go      # PTY session with xterm integration
│   │   └── hostkey.go      # Host key verification and storage
│   ├── sftp/               # SFTP operations and transfer management
│   │   ├── manager.go      # SFTP client pool per session
│   │   ├── client.go       # SFTP client wrapper
│   │   ├── operations.go   # File operations (list, download, upload, etc.)
│   │   ├── transfer.go     # Progress tracking and cancellation
│   │   └── types.go        # SFTP data types and structures
│   ├── crypto/             # Encryption and security
│   │   └── dpapi.go        # Windows DPAPI wrapper for credentials
│   ├── db/                 # Database and storage
│   │   ├── store.go        # Encrypted binary storage layer
│   │   ├── crypto.go       # AES-256-GCM encryption with machine key
│   │   ├── connections.go  # Connection CRUD operations
│   │   └── *_test.go       # Unit and integration tests
│   ├── converter/          # PPK to PEM key conversion
│   │   ├── ppk.go          # Pure-Go PPK parser and converter
│   │   ├── testdata/       # Test key files for all formats
│   │   └── ppk_test.go     # Conversion tests
│   ├── editor/             # File editing integration
│   │   ├── editor.go       # System editor launcher
│   │   └── watcher.go      # File change detection for auto-upload
│   └── models/             # Data structures
│       └── connection.go   # Connection model definition
├── frontend/               # React + TypeScript UI
│   ├── src/
│   │   ├── main.tsx        # React entry point
│   │   ├── components/     # React components
│   │   │   ├── App.tsx     # Main application component
│   │   │   ├── Terminal.tsx             # xterm.js terminal component
│   │   │   ├── FileExplorer.tsx         # SFTP file browser
│   │   │   ├── FileItem.tsx             # File/folder tree item
│   │   │   ├── FileEditor.tsx           # Remote file editor
│   │   │   ├── UploadDialog.tsx         # Batch upload dialog
│   │   │   ├── PassphraseDialog.tsx     # Encrypted key passphrase input
│   │   │   └── PPKConverterDialog.tsx   # PPK to PEM converter UI
│   │   ├── styles/         # Global styles
│   │   │   └── global.css  # Mission Control theme styles
│   │   └── types/          # TypeScript definitions
│   │       ├── wails.d.ts           # Wails runtime types
│   │       ├── components.d.ts      # Component prop types
│   │       └── events.d.ts          # Event payload types
│   ├── wailsjs/            # Generated Wails bindings
│   │   ├── go/             # Go method bindings
│   │   └── runtime/        # Runtime API bindings
│   ├── package.json        # Node dependencies
│   ├── tsconfig.json       # TypeScript configuration
│   └── vite.config.ts      # Vite build configuration
├── docs/                   # Documentation
│   ├── README.md           # Documentation index
│   ├── DESIGN-SYSTEM.md    # Mission Control UI design system
│   ├── api/                # API documentation
│   ├── components/         # Component documentation
│   ├── features/           # Feature documentation
│   ├── guides/             # User guides
│   ├── planning/           # Project planning
│   │   └── changelog.md    # Version history
│   ├── technical/          # Technical documentation
│   └── user-guide/         # End-user documentation
└── build/                  # Build output and assets
    ├── bin/                # Compiled executables
    │   ├── esesha.exe      # Main executable
    │   ├── keys/           # Private key storage (runtime)
    │   └── backup/         # Connection backups (runtime)
    └── windows/            # Windows-specific build resources
        ├── icon.ico
        ├── info.json       # Application metadata
        └── installer/      # NSIS installer scripts
```

**Files at Runtime:**
- `esesha.exe` — Application executable (~13-16 MB)
- `esesha.bin` — Encrypted connections and host keys (binary format, AES-256-GCM)
- `keys/` — Private key storage directory (created on first key import, 0700 permissions)
- `backup/` — Connection backups with timestamped JSON files and key snapshots
- `esesha.bin.key.migrated` — Backup of old key file after migration (if upgrading from older version)

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Credits

Built with:
- [Wails](https://wails.io/) — Go + Web GUI framework
- [xterm.js](https://xtermjs.org/) — Terminal emulator
- [React](https://react.dev/) — UI framework
- [golang.org/x/crypto/ssh](https://pkg.go.dev/golang.org/x/crypto/ssh) — SSH protocol implementation

---

## Support

- **Issues:** [GitHub Issues](https://github.com/yourusername/esesha/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/esesha/discussions)

---

**Last Updated:** 2026-08-15

### What's New in v1.0

#### Core Features
- SSH connection manager with encrypted credential storage
- Interactive terminal with xterm.js
- SFTP file browser with full file operations
- Batch upload dialog with progress tracking
- PPK to PEM converter (pure-Go, no dependencies)
- Backup & restore with automatic key file backup
- Connection ping for latency measurement

#### Security
- AES-256-GCM database encryption with machine binding
- Windows DPAPI encryption for credentials and private keys
- Host key verification with MITM protection
- Secure key file management with automatic copy to `keys/` folder
- Passphrase-protected private key support

#### User Interface
- "Mission Control" theme with space-navy design
- Native Windows menu bar (File, Tools, Help)
- Professional SVG icons (lucide-react)
- Desktop shortcut creation
- About dialog with version info
- Improved accessibility (ARIA labels, keyboard navigation)
- Visual polish: animations, shadows, smooth transitions

#### Platform
- Single executable (~13-16 MB)
- Single instance enforcement (Windows mutex)
- Windows clipboard integration
- Cross-platform support (Windows, macOS, Linux)
