# Esesha

**Modern SSH/SFTP Desktop Manager for Windows**

Esesha is a lightweight, single-executable SSH connection manager with integrated terminal emulation and SFTP file browser. Think Termius meets WinSCP, built for speed and security.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Interface

Esesha's UI is a futuristic **"Mission Control"** console — deep space-navy surfaces, cyan/violet accents, an animated connection status bar, and scanline sidebar texture. No more default-editor look.

> **Screenshots coming soon.** Placeholder for the redesigned UI: sidebar with connection cards and scanline texture · animated status bar · empty states · loading skeletons.

_Design system reference: [docs/design-system.md](docs/design-system.md)_

---

## Features

- **SSH Connection Manager** — Save connection profiles with encrypted credentials
- **Interactive Terminal** — Full-featured terminal emulation with xterm.js
- **SFTP File Browser** — Browse, upload, download, edit remote files
- **System Editor Integration** — Edit remote files with your favorite local editor
- **Multi-Session Support** — Connect to multiple servers simultaneously
- **Native Menu System** — File and Help menus with keyboard shortcuts (Ctrl+Q to exit)
- **Desktop Shortcut Creation** — Create shortcuts from File menu at runtime
- **Professional Icon System** — SVG icons with full accessibility support
- **Polished UI** — Smooth animations, hover effects, consistent spacing
- **Encrypted Binary Storage** — AES-256-GCM full-file encryption with machine binding
- **Secure Credential Storage** — Windows DPAPI encryption for passwords and keys
- **Host Key Verification** — Protection against MITM attacks
- **Encrypted Private Key Support** — Use passphrase-protected SSH keys
- **Single Executable** — No installation required, just 13.3 MB

---

## Quick Start

### Download & Run

1. Download `esesha.exe` from the [releases page](https://github.com/yourusername/esesha/releases)
2. Double-click to run — no installation needed
3. Add your first SSH connection
4. Start connecting!

### System Requirements

- **OS:** Windows 10 (1809+) or Windows 11
- **Architecture:** x64
- **RAM:** 100 MB minimum
- **Storage:** 50 MB for application and database

---

## Usage Overview

### Adding a Connection

1. Click **[+] New Connection**
2. Fill in connection details:
   - Name (e.g., "Production Server")
   - Host (e.g., `server.example.com`)
   - Port (default: 22)
   - Username
   - Authentication: Password or Private Key
3. Click **Save**

### Connecting via SSH

1. Select a connection from the list
2. Click **Connect**
3. If using an encrypted key, enter the passphrase
4. Verify host key fingerprint on first connection
5. Terminal opens — start typing commands!

### Browsing Files via SFTP

1. While connected, click **Files** button
2. Navigate the file tree (double-click folders)
3. Right-click for actions:
   - **Download** — Save to local machine
   - **Upload** — Choose local file to upload
   - **Edit** — Opens in system default editor, auto-uploads on save
   - **Delete** — Remove file or directory
   - **Rename** — Change name
   - **Permissions** — Change chmod

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

- **[Documentation Index](docs/README.md)** — All project documentation
- **[Design System](docs/design-system.md)** — "Mission Control" UI design system (colors, typography, motion)
- **[Binary Storage Encryption](docs/guides/binary-storage-encryption.md)** — User guide for encrypted storage
- **[Security Considerations](docs/guides/security-considerations.md)** — Security architecture and threat model
- **[UI Development Guide](docs/guides/ui-development.md)** — Building UI with the design system
- **[Changelog](docs/planning/changelog.md)** — Complete project history
- **[React Effect Stability Patterns](docs/guides/react-effect-stability.md)** — Effect-dependency patterns for the terminal and file manager
- **[Known Issues & Technical Debt](docs/guides/known-issues.md)** — Open issues and deferred work

---

## Security

- **Machine-Bound Encryption:** AES-256-GCM full-file encryption with key derived from Windows Machine GUID + exe path
- **No Separate Key File:** Only 2 files needed: `esesha.exe` + `esesha.bin` (no registry storage)
- **Credentials:** SSH passwords encrypted with Windows DPAPI (CurrentUser scope)
- **Host Keys:** SHA-256 fingerprint verification on first connection
- **Private Keys:** Supports passphrase-protected keys
- **Temp Files:** Created with 0600 permissions, random names
- **Path Validation:** Protection against directory traversal attacks

**Security Note:** Machine-bound encryption provides convenience (no extra files) but is weaker than DPAPI key file protection. Suitable for personal computers and casual protection. Not recommended for shared computers or highly sensitive credentials.

See [Security Considerations](docs/guides/security-considerations.md) for full threat model.

---

## Tech Stack

- **Backend:** Go 1.21+ with `golang.org/x/crypto/ssh`
- **Frontend:** React 18 + TypeScript 5 + Vite
- **Desktop Framework:** Wails v2
- **Storage:** Encrypted binary format (AES-256-GCM) with machine-bound keyless encryption
- **Terminal:** xterm.js
- **Credential Encryption:** Windows DPAPI (CurrentUser scope)
- **Registry Access:** `golang.org/x/sys/windows/registry` for Machine GUID derivation

---

## Project Structure

```
esesha/
├── internal/
│   ├── ssh/       # SSH client and session management
│   ├── sftp/      # SFTP operations
│   ├── crypto/    # Windows DPAPI encryption
│   ├── db/        # Encrypted binary storage + connection management
│   │   ├── store.go      # Storage layer with encryption
│   │   ├── crypto.go     # AES-256-GCM encryption + machine key derivation
│   │   └── *_test.go     # Unit and integration tests
│   ├── editor/    # File editing and watching
│   └── models/    # Data structures
├── frontend/      # React + TypeScript UI
├── app.go         # Wails app methods
├── main.go        # Entry point
├── docs/          # Documentation
└── build/         # Build output
    └── bin/
        ├── esesha.exe  # Application executable
        └── esesha.bin  # Encrypted connections storage
```

**Files at Runtime:**
- `esesha.exe` — Application executable (~13-16 MB)
- `esesha.bin` — Encrypted connections and host keys (binary format)
- `esesha.bin.key.migrated` — Backup of old key file after migration (if upgrading from PRD-006)

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

**Last Updated:** 2026-08-06

### What's New in v1.0

- Native Windows menu bar (File, Help)
- Create desktop shortcuts from File menu
- Professional SVG icons throughout the UI
- Improved accessibility (ARIA labels, keyboard navigation)
- Visual polish: shadows, smooth transitions, better spacing
