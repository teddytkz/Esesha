# Esesha Build Guide

Quick reference for building Esesha SSH/SFTP desktop manager.

**Last Updated:** 2026-08-06

---

## Quick Start

### First Time Setup

```bash
cd frontend
npm install
cd ..
```

**Required before first build.** Installs frontend dependencies (Svelte, Vite, etc.).

### Development Build (Hot-Reload)

```bash
wails dev
```

Opens application with hot-reload enabled. Frontend changes reload automatically.

### Production Build

```bash
wails build -clean -platform windows/amd64 -ldflags "-s -w"
```

Or use the build script:

```cmd
build.bat
```

**Output:**
- **Location:** `build\bin\esesha.exe`
- **Size:** ~13-16 MB
- **Type:** Standalone executable (no dependencies)

**Note:** If you see `esesha.exe` at the project root, that's a stale artifact from the old nested folder structure. Delete it. The actual build output is always in `build\bin\`.

---

## Requirements

| Tool | Minimum Version | Download |
|------|----------------|----------|
| Go | 1.21+ | [go.dev](https://go.dev/dl/) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org/) |
| Wails CLI | v2.9+ | `go install github.com/wailsapp/wails/v2/cmd/wails@latest` |
| Windows | 10 (1809+) or 11 | - |

**Verify installation:**

```powershell
go version      # Should show 1.21 or higher
node --version  # Should show v18 or higher
wails version   # Should show v2.9 or higher
```

---

## Build Commands

### Development Mode

```bash
wails dev
```

**Features:**
- Hot-reload for frontend changes
- Backend recompilation on Go file changes
- DevTools enabled (F12)
- Console output visible

### Production Build (Full)

```bash
wails build -clean -platform windows/amd64 -ldflags "-s -w"
```

**Flags:**
- `-clean` — Remove build cache first
- `-platform windows/amd64` — Target Windows 64-bit
- `-ldflags "-s -w"` — Strip debug symbols (reduces size ~30%)

### Production Build (Quick)

```bash
wails build
```

Uses cached builds when possible (faster, but may include stale artifacts).

---

## Build Optimization

### Further Size Reduction

```bash
# Compress with UPX (optional, requires upx.exe)
upx --best --lzma build\bin\esesha.exe
# Reduces to ~5-8 MB, but slower startup
```

### Other Platforms

```bash
# Windows ARM64
wails build -platform windows/arm64

# 32-bit Windows (legacy)
wails build -platform windows/386
```

---

## Distribution

The built executable is **fully self-contained**:

- ✅ No installation required
- ✅ No external dependencies
- ✅ Can run from USB drive
- ✅ Single file distribution

**To distribute:**

1. Build production executable
2. Copy `build\bin\esesha.exe`
3. Distribute single file

**Database location:** Created automatically at `%APPDATA%\esesha\connections.db` on first run.

---

## Troubleshooting

### "wails: command not found"

```bash
# Ensure Go bin is in PATH
go env GOPATH
# Add %GOPATH%\bin to PATH

# Reinstall Wails
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### "blank page" or "frontend build failed"

```bash
cd frontend
npm install
cd ..
wails dev
```

If still failing, clear cache:

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
cd ..
wails build
```

### "cannot find package"

```bash
go mod tidy
go mod download
wails build
```

---

## See Also

- **[Development Guide](docs/DEVELOPMENT.md)** — Complete development setup and workflow
- **[User Guide](docs/USER-GUIDE.md)** — Using the built application
- **[API Reference](docs/API.md)** — Backend method documentation

---

**Last Updated:** 2026-08-06
