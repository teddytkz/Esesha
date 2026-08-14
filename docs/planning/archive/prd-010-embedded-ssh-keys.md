# PRD-010: Embedded SSH Private Keys in Binary

**Version:** v1.0.0  
**Status:** Draft  
**Author:** Planner Agent  
**Created:** 2026-08-14  
**Updated:** 2026-08-14  

---

## Overview

Embed SSH private key content directly into the compiled `esesha.exe` binary instead of reading from external credential files. This eliminates dependency on file system paths for private keys while maintaining security through encryption and obfuscation.

---

## Problem Statement

**Current architecture:**
- Private keys stored as files on user's file system (`~/.ssh/id_rsa`, custom paths, etc.)
- Connection profiles store `PrivateKeyPath` (string) pointing to external files
- Key loading via `ioutil.ReadFile(privateKeyPath)` at connection time
- User responsible for managing key file permissions and locations

**User request:**
- "SSH private key content should be embedded in the binary"
- "No dependency on external credential files for private keys"
- "Private key stored directly in the compiled binary"

**Problems with current approach:**
1. Keys can be accidentally moved/deleted, breaking connections
2. User must manage file permissions manually
3. Keys exposed on file system (risk of misconfiguration)
4. Deployment complexity (exe + multiple key files)
5. No portability (can't share exe with embedded credentials)

---

## Goals

- ✅ Embed SSH private key content directly in `esesha.exe` binary
- ✅ Support multiple embedded keys (different keys for different servers)
- ✅ Maintain security via encryption/obfuscation of embedded keys
- ✅ Preserve backward compatibility with file-based keys
- ✅ Build-time configuration for which keys to embed
- ✅ No runtime dependency on external key files for embedded credentials
- ✅ Support encrypted private keys (passphrase-protected)

---

## Non-Goals

- ❌ Dynamic key injection at runtime (keys baked at compile time only)
- ❌ Removing file-based key support entirely (hybrid model)
- ❌ Cross-platform key embedding (Windows-only for initial implementation)
- ❌ Key rotation without recompilation
- ❌ Embedding public keys (only private keys)
- ❌ SSH agent integration

---

## Feature Specification

### User Stories

**As a system administrator:**
- I want to embed my SSH keys in the executable so I can deploy a single file to multiple machines
- I want different keys for dev/staging/prod servers embedded in one binary
- I want to protect embedded keys so they're not readable in a hex editor

**As a security-conscious user:**
- I want embedded keys encrypted so casual disk access doesn't expose them
- I want to maintain file-based keys for sensitive production servers
- I want passphrase-protected keys to still prompt for passphrase at connection time

**As a developer:**
- I want a simple build-time configuration file to specify which keys to embed
- I want the build process to fail if a configured key file is missing
- I want clear error messages if embedded key decryption fails

### Acceptance Criteria

**Core Functionality:**
- [ ] Connection profile has new optional field `EmbeddedKeyID string` (alternative to `PrivateKeyPath`)
- [ ] If `EmbeddedKeyID` is set, SSH client loads key from embedded store instead of file system
- [ ] If `PrivateKeyPath` is set, SSH client loads from file (backward compatibility)
- [ ] Multiple keys can be embedded with unique IDs (e.g., `"prod-key"`, `"dev-key"`)
- [ ] Embedded keys encrypted with machine-bound key (same SHA256 derivation as storage)
- [ ] Passphrase-protected keys remain encrypted; user prompted at connection time

**Build-Time Configuration:**
- [ ] New file `build-keys.json` in repo root defines keys to embed
- [ ] Format: `[{"id": "prod-key", "path": "/path/to/key.pem", "description": "Production server key"}]`
- [ ] Build script `build.bat` reads `build-keys.json` and generates Go source file
- [ ] Generated file `internal/keys/embedded.go` contains encrypted key data as `var EmbeddedKeys map[string][]byte`
- [ ] Build fails with clear error if key file in `build-keys.json` doesn't exist

**Security:**
- [ ] Embedded keys encrypted with AES-256-GCM (same algorithm as `esesha.bin`)
- [ ] Encryption key derived from machine GUID + exe path (consistent with PRD-007)
- [ ] Encrypted keys stored as base64 strings in Go source (not raw bytes)
- [ ] No plaintext keys visible in `strings esesha.exe` output
- [ ] Build-time key file permissions validated (must be 0600 or stricter)

**User Experience:**
- [ ] Add Connection form shows "Embedded Key" option in auth type (alongside Password, Private Key File)
- [ ] Dropdown populated with embedded key IDs + descriptions from embedded store
- [ ] Connection creation with embedded key stores `EmbeddedKeyID` in profile
- [ ] Passphrase dialog appears if embedded key is encrypted (same UX as file-based)
- [ ] Error message if selected embedded key not found at connection time

**Error Handling:**
- [ ] Build error if `build-keys.json` malformed (invalid JSON)
- [ ] Build error if key file missing or unreadable
- [ ] Build warning if key file permissions > 0600
- [ ] Runtime error (clear message) if `EmbeddedKeyID` references non-existent key
- [ ] Runtime error if embedded key decryption fails (wrong machine, corrupted data)

---

## Technical Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Build Process                         │
│                                                          │
│  build-keys.json ──┬──> PowerShell Script ──┐           │
│  key files on disk─┘     (build-keys.ps1)   │           │
│                                              │           │
│                       ┌──────────────────────▼───────┐   │
│                       │  internal/keys/embedded.go   │   │
│                       │  (generated, .gitignore'd)   │   │
│                       │                              │   │
│                       │  var EmbeddedKeys = map[     │   │
│                       │    string][]byte{            │   │
│                       │      "prod": []byte{base64}, │   │
│                       │      "dev": []byte{base64},  │   │
│                       │  }                           │   │
│                       └──────────────────────────────┘   │
│                                   │                      │
│                                   ▼                      │
│                            wails build ───> esesha.exe   │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    Runtime (Connect)                     │
│                                                          │
│  User selects connection with EmbeddedKeyID="prod"      │
│         │                                                │
│         ▼                                                │
│  internal/keys/store.go: GetEmbeddedKey("prod")         │
│         │                                                │
│         ├─> Lookup in EmbeddedKeys map                  │
│         ├─> Decrypt with machine key (AES-256-GCM)      │
│         ├─> Return []byte (PEM format)                  │
│         │                                                │
│         ▼                                                │
│  internal/ssh/client.go: ParsePrivateKey(keyBytes)      │
│         │                                                │
│         └──> ssh.Dial() ──> Connection established      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Codebase Context

**From Explorer analysis:**
- **Existing private key flow:** `internal/ssh/client.go:70` reads `ioutil.ReadFile(privateKeyPath)` → `ssh.ParsePrivateKey(key)`
- **Machine key derivation:** `internal/db/crypto.go:115` `deriveMachineKey()` already implemented
- **Encryption functions:** `internal/db/crypto.go:25` `encryptData()` / `decryptData()` reusable
- **Connection model:** `internal/models/connection.go:7` has `PrivateKeyPath string` field
- **Frontend auth toggle:** `frontend/src/components/App.tsx:195` radio buttons for Password/Private Key

**Integration points:**
1. Extend `models.Connection` to add `EmbeddedKeyID *string` (nullable, mutually exclusive with `PrivateKeyPath`)
2. Modify `internal/ssh/client.go` to check `EmbeddedKeyID` before `privateKeyPath`
3. Create `internal/keys/` package for embedded key management
4. Extend frontend form to show "Embedded Key" dropdown when keys available

### Data Model

#### Build Configuration (`build-keys.json`)

```json
[
  {
    "id": "production-server",
    "path": "C:/Users/User/.ssh/id_rsa_prod",
    "description": "Production environment key (RSA 4096)"
  },
  {
    "id": "staging-server",
    "path": "C:/Users/User/.ssh/id_ed25519_staging",
    "description": "Staging environment (Ed25519)"
  },
  {
    "id": "dev-jumphost",
    "path": "./keys/dev_key.pem",
    "description": "Development jumphost"
  }
]
```

**Constraints:**
- `id`: alphanumeric + hyphens/underscores only (used as map key)
- `path`: absolute or relative to repo root
- `description`: max 200 chars (shown in UI dropdown)

#### Generated Go Source (`internal/keys/embedded.go`)

```go
// Code generated by build-keys.ps1. DO NOT EDIT.
package keys

// EmbeddedKeyMetadata stores key descriptions for UI display
var EmbeddedKeyMetadata = map[string]string{
    "production-server": "Production environment key (RSA 4096)",
    "staging-server":    "Staging environment (Ed25519)",
    "dev-jumphost":      "Development jumphost",
}

// EmbeddedKeys stores encrypted private key content (AES-256-GCM)
// Encrypted with machine-bound key (SHA256(MachineGUID + exeDir))
// Base64-encoded ciphertext format: ESESHA01 | version | nonce | ciphertext+tag
var EmbeddedKeys = map[string]string{
    "production-server": "RVNFU0hBMDEAAAABAAAAAAAAAAAAAAECAwQFBgcICQoLDA0ODw...",
    "staging-server":    "RVNFU0hBMDEAAAABAAAAAAAAAAAAAAQFBgcICQoLDA0ODxAREh...",
    "dev-jumphost":      "RVNFU0hBMDEAAAABAAAAAAAAAAAAAAcICQoLDA0ODxAREhMUFR...",
}
```

**Security notes:**
- Keys encrypted before embedding (not plaintext in source)
- Base64 encoding makes binary format safe for Go string literals
- Machine-bound key (same as `esesha.bin` encryption) prevents casual extraction
- Original `.pem` files NOT committed to repo (only `build-keys.json` metadata)

#### Connection Model Extension

**Before (existing):**
```go
type Connection struct {
    ID                int    `json:"id"`
    Name              string `json:"name"`
    Host              string `json:"host"`
    Port              int    `json:"port"`
    Username          string `json:"username"`
    EncryptedPassword []byte `json:"encrypted_password"`
    PrivateKeyPath    string `json:"privateKeyPath"`
    CreatedAt         int64  `json:"createdAt"`
    UpdatedAt         int64  `json:"updatedAt"`
}
```

**After (new field):**
```go
type Connection struct {
    ID                int     `json:"id"`
    Name              string  `json:"name"`
    Host              string  `json:"host"`
    Port              int     `json:"port"`
    Username          string  `json:"username"`
    EncryptedPassword []byte  `json:"encrypted_password"`
    PrivateKeyPath    string  `json:"privateKeyPath"`    // Existing: file-based key
    EmbeddedKeyID     *string `json:"embeddedKeyID"`     // NEW: embedded key reference (nullable)
    CreatedAt         int64   `json:"createdAt"`
    UpdatedAt         int64   `json:"updatedAt"`
}
```

**Validation rules:**
- If `EmbeddedKeyID != nil`, then `PrivateKeyPath` must be `""` (mutually exclusive)
- If `PrivateKeyPath != ""`, then `EmbeddedKeyID` must be `nil`
- If both empty: password-only auth

### API Changes

#### New Package: `internal/keys/store.go`

```go
package keys

import (
    "crypto/aes"
    "crypto/cipher"
    "encoding/base64"
    "fmt"
    "esesha/internal/db"
)

// GetEmbeddedKey retrieves and decrypts an embedded private key by ID
func GetEmbeddedKey(keyID string, machineKey []byte) ([]byte, error) {
    encryptedB64, exists := EmbeddedKeys[keyID]
    if !exists {
        return nil, fmt.Errorf("embedded key '%s' not found (available: %v)", 
            keyID, availableKeyIDs())
    }

    ciphertext, err := base64.StdEncoding.DecodeString(encryptedB64)
    if err != nil {
        return nil, fmt.Errorf("invalid embedded key encoding: %w", err)
    }

    // Reuse decryptData from internal/db/crypto.go
    plaintext, err := decryptEmbeddedKey(ciphertext, machineKey)
    if err != nil {
        return nil, fmt.Errorf("failed to decrypt embedded key: %w", err)
    }

    return plaintext, nil
}

// ListEmbeddedKeys returns available key IDs with descriptions
func ListEmbeddedKeys() map[string]string {
    return EmbeddedKeyMetadata
}

func availableKeyIDs() []string {
    ids := make([]string, 0, len(EmbeddedKeys))
    for id := range EmbeddedKeys {
        ids = append(ids, id)
    }
    return ids
}
```

#### Modified: `internal/ssh/client.go`

**Before (lines 69-95):**
```go
func NewClientWithKeyPassphraseAndHostKey(..., privateKeyPath, passphrase string, ...) (*Client, error) {
    key, err := ioutil.ReadFile(privateKeyPath)
    // ... parse key
}
```

**After:**
```go
func NewClientWithKeyPassphraseAndHostKey(..., privateKeyPath, passphrase string, embeddedKeyID *string, machineKey []byte, ...) (*Client, error) {
    var key []byte
    var err error

    if embeddedKeyID != nil && *embeddedKeyID != "" {
        // Load from embedded store
        key, err = keys.GetEmbeddedKey(*embeddedKeyID, machineKey)
        if err != nil {
            return nil, fmt.Errorf("embedded key error: %w", err)
        }
    } else if privateKeyPath != "" {
        // Load from file (existing behavior)
        key, err = ioutil.ReadFile(privateKeyPath)
        if err != nil {
            return nil, fmt.Errorf("read private key failed: %w", err)
        }
    } else {
        return nil, fmt.Errorf("no private key specified (neither embeddedKeyID nor privateKeyPath)")
    }

    // ... rest of parsing logic unchanged
}
```

#### Modified: `app.go`

**New method:**
```go
// ListEmbeddedKeys returns available embedded key IDs with descriptions
func (a *App) ListEmbeddedKeys() map[string]string {
    return keys.ListEmbeddedKeys()
}
```

**Modified method signature:**
```go
func (a *App) CreateConnection(name, host string, port int, username, password, privateKeyPath string, embeddedKeyID *string) (int, error)
```

### UI Changes

**Frontend: `frontend/src/components/App.tsx`**

**Auth type radio buttons (existing: Password, Private Key File):**
```tsx
<div className={styles.authTypeToggle}>
  <label>
    <input 
      type="radio" 
      name="authType" 
      value="password"
      checked={authType === 'password'}
      onChange={() => setAuthType('password')}
    />
    Password
  </label>
  
  <label>
    <input 
      type="radio" 
      name="authType" 
      value="privateKeyFile"
      checked={authType === 'privateKeyFile'}
      onChange={() => setAuthType('privateKeyFile')}
    />
    Private Key File
  </label>

  {/* NEW: Embedded Key option (only shown if keys available) */}
  {embeddedKeysAvailable && (
    <label>
      <input 
        type="radio" 
        name="authType" 
        value="embeddedKey"
        checked={authType === 'embeddedKey'}
        onChange={() => setAuthType('embeddedKey')}
      />
      Embedded Key
    </label>
  )}
</div>

{/* Conditional inputs */}
{authType === 'password' && (
  <input type="password" ... />
)}

{authType === 'privateKeyFile' && (
  <button onClick={selectKeyFile}>Browse...</button>
)}

{authType === 'embeddedKey' && (
  <select value={formData.embeddedKeyID} onChange={handleEmbeddedKeyChange}>
    <option value="">-- Select Embedded Key --</option>
    {Object.entries(embeddedKeys).map(([id, description]) => (
      <option key={id} value={id}>{description}</option>
    ))}
  </select>
)}
```

**Load embedded keys on component mount:**
```tsx
const [embeddedKeys, setEmbeddedKeys] = useState<Record<string, string>>({});

useEffect(() => {
  ListEmbeddedKeys().then(keys => {
    setEmbeddedKeys(keys);
  });
}, []);

const embeddedKeysAvailable = Object.keys(embeddedKeys).length > 0;
```

---

## Implementation Plan

### Phase 1: Build-Time Key Embedding Infrastructure

**Depends on:** Nothing  
**Parallelizable:** No (foundation for all other phases)

| Task | Agent              | Files                                  | Description                                                                                       |
| ---- | ------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1.1  | Backend Developer  | `scripts/build-keys.ps1`               | PowerShell script to read `build-keys.json`, encrypt keys, generate `internal/keys/embedded.go`  |
| 1.2  | Backend Developer  | `build-keys.json.example`              | Example config file with comments (NOT containing real keys, git-tracked)                         |
| 1.3  | Backend Developer  | `.gitignore`                           | Add `/internal/keys/embedded.go`, `/build-keys.json` (exclude generated file + real key config)  |
| 1.4  | Backend Developer  | `build.bat`                            | Integrate `build-keys.ps1` execution before `wails build` (skip if `build-keys.json` missing)    |
| 1.5  | Backend Developer  | `internal/keys/embedded.go.template`   | Template file with package declaration + empty maps (used when no `build-keys.json` exists)      |

**Acceptance:**
- [ ] `build-keys.ps1` reads JSON, validates paths, encrypts keys with machine key derivation
- [ ] Generated `embedded.go` compiles without errors (valid Go syntax)
- [ ] `build.bat` runs `build-keys.ps1` and handles errors gracefully
- [ ] If `build-keys.json` missing, build uses template (empty maps, no embedded keys)
- [ ] Build fails with clear error if key file in JSON doesn't exist

---

### Phase 2: Backend Key Store & Decryption Logic

**Depends on:** Phase 1  
**Parallelizable:** No (needs generated `embedded.go` structure)

| Task | Agent             | Files                           | Description                                                                                  |
| ---- | ----------------- | ------------------------------- | -------------------------------------------------------------------------------------------- |
| 2.1  | Backend Developer | `internal/keys/store.go`        | Implement `GetEmbeddedKey()`, `ListEmbeddedKeys()`, decryption logic                         |
| 2.2  | Backend Developer | `internal/keys/store_test.go`   | Unit tests: missing key, decryption failure, valid key retrieval                             |
| 2.3  | Backend Developer | `internal/db/crypto.go`         | Extract `decryptData()` to shared function (reused by keys package)                          |
| 2.4  | Backend Developer | `internal/models/connection.go` | Add `EmbeddedKeyID *string` field, update JSON tags                                          |
| 2.5  | Backend Developer | `internal/db/store.go`          | Validate `EmbeddedKeyID` and `PrivateKeyPath` mutual exclusivity in `CreateConnection()`    |

**Acceptance:**
- [ ] `GetEmbeddedKey()` retrieves, decodes base64, decrypts with machine key
- [ ] Clear error messages for missing key IDs
- [ ] Unit tests pass (3+ test cases)
- [ ] Connection model serializes/deserializes `EmbeddedKeyID` correctly
- [ ] Validation prevents setting both `EmbeddedKeyID` and `PrivateKeyPath`

---

### Phase 3: SSH Client Integration

**Depends on:** Phase 2  
**Parallelizable:** No (needs Phase 2 data model)

| Task | Agent             | Files                                   | Description                                                                                 |
| ---- | ----------------- | --------------------------------------- | ------------------------------------------------------------------------------------------- |
| 3.1  | Backend Developer | `internal/ssh/client.go`                | Modify `NewClientWithKeyPassphraseAndHostKey()` to accept `embeddedKeyID` parameter        |
| 3.2  | Backend Developer | `internal/ssh/manager.go`               | Update `ConnectWithPassphrase()` to pass `embeddedKeyID` from connection profile           |
| 3.3  | Backend Developer | `app.go`                                | Update `ConnectSSHWithPassphrase()` to retrieve `embeddedKeyID` from connection            |
| 3.4  | Backend Developer | `app.go`                                | Add `ListEmbeddedKeys()` method (binds to frontend)                                         |
| 3.5  | Backend Developer | `app.go`                                | Modify `CreateConnection()` and `UpdateConnection()` to accept `embeddedKeyID` parameter   |

**Acceptance:**
- [ ] SSH client successfully loads key via `GetEmbeddedKey()` if `embeddedKeyID` set
- [ ] Falls back to file-based key if `privateKeyPath` set (backward compatibility)
- [ ] Passphrase dialog appears for encrypted embedded keys
- [ ] Connection established with embedded key (manual test)
- [ ] Error handling tested: missing embedded key ID, decryption failure

---

### Phase 4: Frontend UI Integration

**Depends on:** Phase 3 (needs backend API methods)  
**Parallelizable:** Yes (can develop in parallel with Phase 3 backend testing)

| Task | Agent              | Files                                       | Description                                                                       |
| ---- | ------------------ | ------------------------------------------- | --------------------------------------------------------------------------------- |
| 4.1  | Frontend Developer | `frontend/src/components/App.tsx`           | Add "Embedded Key" radio button in auth type toggle (conditionally shown)        |
| 4.2  | Frontend Developer | `frontend/src/components/App.tsx`           | Add embedded key dropdown (populated from `ListEmbeddedKeys()`)                  |
| 4.3  | Frontend Developer | `frontend/src/components/App.module.css`    | Style embedded key dropdown (Mission Control design)                             |
| 4.4  | Frontend Developer | `frontend/src/types/wails.d.ts`             | Add type definitions for `ListEmbeddedKeys()`, `CreateConnection()` new params   |
| 4.5  | Frontend Developer | `frontend/wailsjs/go/main/App.{js,d.ts}`    | Regenerate Wails bindings (`wails generate module`)                              |

**Acceptance:**
- [ ] "Embedded Key" radio button visible only when embedded keys exist
- [ ] Dropdown shows key IDs with descriptions (from `EmbeddedKeyMetadata`)
- [ ] Selection updates `formData.embeddedKeyID`
- [ ] Auth type toggle clears inactive fields (embedded key vs file path)
- [ ] Create Connection form submits correct `embeddedKeyID` to backend
- [ ] TypeScript compilation passes (0 errors)

---

### Phase 5: Testing & Documentation

**Depends on:** All implementation phases  
**Parallelizable:** Partially (docs can be written while tests run)

| Task | Agent              | Files                                         | Description                                                                   |
| ---- | ------------------ | --------------------------------------------- | ----------------------------------------------------------------------------- |
| 5.1  | Debugger/Reviewer  | `internal/keys/store_test.go`                 | Integration tests: full build → embedded key → connection flow               |
| 5.2  | Debugger/Reviewer  | `scripts/build-keys.ps1`                      | Test edge cases: missing file, invalid JSON, bad permissions                  |
| 5.3  | Debugger/Reviewer  | Manual testing                                | 6 test cases (see below)                                                      |
| 5.4  | Documentation      | `docs/guides/embedded-ssh-keys.md`            | User guide: configuration, build process, security considerations             |
| 5.5  | Documentation      | `README.md`                                   | Update features list + build instructions                                     |
| 5.6  | Documentation      | `docs/planning/changelog.md`                  | Add PRD-010 entry (COMPLETE status)                                           |

**Manual test cases:**
1. Build with `build-keys.json` containing 2 keys → verify both embedded
2. Create connection with embedded key → connect successfully
3. Passphrase-protected embedded key → passphrase dialog appears
4. Missing embedded key ID selected → error message clear
5. Edit connection → switch from file-based to embedded key
6. Backward compatibility → old connections with `privateKeyPath` still work

**Acceptance:**
- [ ] All 6 manual tests pass
- [ ] Unit + integration tests pass (10+ total tests)
- [ ] Documentation complete (user guide + changelog)
- [ ] Build process tested with missing/invalid `build-keys.json`
- [ ] Security review: no plaintext keys in binary (verified with `strings` command)

---

### Phase 6: Review & Security Audit

**Depends on:** Phase 5  
**Parallelizable:** No (final gate)

| Task | Agent             | Description                                                                  |
| ---- | ----------------- | ---------------------------------------------------------------------------- |
| 6.1  | Debugger/Reviewer | Code review: embedded key encryption, machine key derivation                 |
| 6.2  | Security          | Security audit: binary analysis (`strings esesha.exe`), decryption attempts |
| 6.3  | Debugger/Reviewer | Verify acceptance criteria (all checkboxes)                                  |
| 6.4  | Debugger/Reviewer | Performance test: embedded key load time vs file-based                       |

**Acceptance:**
- [ ] No plaintext keys visible in compiled binary
- [ ] Decryption only succeeds with correct machine GUID + exe path
- [ ] Performance comparable to file-based keys (< 10ms overhead)
- [ ] All PRD acceptance criteria met
- [ ] Code review APPROVED

---

## Risks & Mitigations

| Risk                                                  | Impact | Likelihood | Mitigation                                                                                               |
| ----------------------------------------------------- | ------ | ---------- | -------------------------------------------------------------------------------------------------------- |
| **Keys committed to Git by accident**                 | High   | Medium     | `.gitignore` excludes `build-keys.json` + `embedded.go`; provide `.example` file only                   |
| **Machine-bound key too weak for production use**     | High   | High       | Document security trade-offs; recommend file-based keys for high-security servers                        |
| **Build script fails on different Windows versions**  | Medium | Low        | Test PowerShell script on Windows 10/11; use only standard cmdlets                                       |
| **Key decryption fails after moving exe to new path** | High   | Medium     | Machine key includes exe directory in derivation; document that exe must stay in same folder             |
| **Embedded keys visible in process memory dumps**     | High   | Low        | Document that this is inherent risk; recommend password-only auth or file-based keys for sensitive envs |
| **Large embedded keys bloat binary size**             | Low    | Low        | Document size impact (~4KB per RSA key); typical use case: 2-5 keys max                                  |

---

## Rollback Strategy

**If issues discovered post-deployment:**

1. **Phase 1-2 issues (build/store):**
   - Remove `scripts/build-keys.ps1` call from `build.bat`
   - Use template `embedded.go` (empty maps)
   - Build completes without embedded keys

2. **Phase 3-4 issues (SSH integration/UI):**
   - Revert `internal/ssh/client.go` changes
   - Hide "Embedded Key" UI option (feature flag or CSS `display: none`)
   - Existing connections with `EmbeddedKeyID` fall back to error (user edits to file-based)

3. **Data migration (if needed):**
   - SQL: `UPDATE connections SET embeddedKeyID = NULL WHERE embeddedKeyID IS NOT NULL`
   - Users manually re-select private key files in UI

**Rollback time:** ~15 minutes (revert commits + rebuild + restart)  
**Data loss:** None (connection profiles preserved, only `EmbeddedKeyID` field nullified)

---

## Security Considerations

### ✅ Protected Against

1. **Casual binary inspection:**
   - Keys encrypted before embedding (not plaintext strings)
   - Base64 encoding obfuscates binary format
   - `strings esesha.exe` won't reveal PEM headers

2. **Executable file copy to different machine:**
   - Machine-bound key derivation (includes Machine GUID)
   - Keys won't decrypt on different hardware

3. **File system exposure:**
   - No separate `.pem` files deployed alongside exe
   - Single-file deployment model

4. **Accidental key deletion:**
   - Keys embedded in binary, can't be deleted independently

### ⚠️ NOT Protected Against

1. **System admin / root access:**
   - Machine GUID readable from registry (`HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid`)
   - Exe directory path visible in file system
   - Anyone with admin access can derive decryption key

2. **Memory dumps:**
   - Decrypted keys briefly in RAM during connection
   - Process memory dumps could expose keys

3. **Malware / code injection:**
   - Malicious code running as same user can call `GetEmbeddedKey()`
   - No sandboxing of key usage

4. **Binary decompilation:**
   - Determined attacker with reverse engineering skills could extract encryption algorithm
   - Machine-bound key derivation logic visible in binary

5. **Passphrase-protected keys still need passphrase:**
   - Embedding doesn't bypass passphrase protection
   - User must still enter passphrase at connection time

### Security Recommendations

**For users:**
- ❌ DO NOT embed production keys in binaries distributed to untrusted users
- ❌ DO NOT use embedded keys on shared/multi-user systems
- ✅ DO use embedded keys for personal-use automation scripts
- ✅ DO keep `build-keys.json` outside version control
- ✅ DO use file-based keys for highly sensitive servers
- ✅ DO protect source machines where keys are embedded during build

**For developers:**
- Add build warning if key file permissions > 0600
- Log (locally only) which embedded key ID used for connection (audit trail)
- Consider future enhancement: hardware security module (HSM) integration for key decryption

---

## Version History

| Version | Date       | Summary         |
| ------- | ---------- | --------------- |
| v1.0.0  | 2026-08-14 | Initial draft   |

---

## Appendix A: Build Process Flow

```
User runs: .\build.bat

  ├─> Check if build-keys.json exists
  │     ├─ NO  → Copy embedded.go.template to embedded.go (empty maps)
  │     └─ YES → Execute scripts/build-keys.ps1
  │                ├─> Parse build-keys.json
  │                ├─> Validate each key file exists
  │                ├─> Check file permissions (warn if > 0600)
  │                ├─> Read key file content
  │                ├─> Derive machine key (SHA256(GUID + exeDir))
  │                ├─> Encrypt key content (AES-256-GCM)
  │                ├─> Base64 encode ciphertext
  │                └─> Generate internal/keys/embedded.go
  │                      (maps with encrypted key data)
  │
  ├─> Backup esesha.bin (existing behavior)
  │
  ├─> wails build -platform windows/amd64 -ldflags "-s -w"
  │     └─> Compiles Go code (including embedded.go)
  │           └─> Binary contains encrypted keys
  │
  └─> Restore esesha.bin (existing behavior)

Result: build\bin\esesha.exe (with embedded keys)
```

---

## Appendix B: Example `build-keys.json`

```json
[
  {
    "id": "prod-web-server",
    "path": "C:/secure-keys/prod_rsa_4096.pem",
    "description": "Production web server cluster (RSA 4096-bit)"
  },
  {
    "id": "staging-db",
    "path": "./keys/staging_ed25519",
    "description": "Staging database server (Ed25519)"
  },
  {
    "id": "dev-jumphost",
    "path": "%USERPROFILE%/.ssh/id_rsa_dev",
    "description": "Development jumphost (passphrase-protected)"
  }
]
```

**Notes:**
- Paths can be absolute, relative to repo root, or use environment variables
- `id` must be unique (used as map key + shown in UI)
- `description` displayed in frontend dropdown (max 200 chars recommended)
- File must be valid JSON (build fails on parse errors)

---

## Appendix C: Comparison with File-Based Keys

| Aspect                     | File-Based Keys (Current)          | Embedded Keys (PRD-010)                 |
| -------------------------- | ---------------------------------- | --------------------------------------- |
| **Deployment**             | Exe + separate `.pem` files        | Single `.exe` file                      |
| **Portability**            | Must copy all key files            | Self-contained                          |
| **Security (at rest)**     | User manages file permissions      | Encrypted in binary                     |
| **Security (runtime)**     | Decrypted when loaded              | Decrypted when loaded (same risk)       |
| **Key rotation**           | Replace file on disk               | Recompile binary                        |
| **User experience**        | File picker dialog                 | Dropdown selection                      |
| **Risk of loss**           | File can be deleted/moved          | Embedded (can't lose)                   |
| **Multi-server support**   | One file per key (manual mapping)  | Multiple keys in one binary (ID-based)  |
| **Passphrase protection**  | Supported (prompted at connect)    | Supported (same behavior)               |
| **Backward compatibility** | N/A (existing feature)             | Fully compatible (hybrid model)         |
| **Use case**               | General-purpose, high-security     | Automation scripts, personal use        |

---

**END OF PRD-010**
