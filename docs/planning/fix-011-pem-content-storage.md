# Fix Plan: PEM File Content Storage (Not Path)

**Related PRD:** N/A (bug fix / architectural improvement)
**Severity:** Medium
**Reported by:** User
**Date:** 2026-08-14

---

## Bug Summary

**Current behavior:**
- `Connection.PrivateKeyPath` stores file path (string) to external PEM files
- At connection time, `ioutil.ReadFile(privateKeyPath)` reads from filesystem
- Issues: not portable, breaks if file moved/deleted, can't export/import properly

**Expected behavior:**
- PEM file content should be stored encrypted in database (like passwords)
- Connections remain portable and self-contained
- Export/import includes key content, not just path references

---

## Root Cause Analysis

The application currently treats SSH private keys like external resources (file paths), not credentials. This creates several problems:

1. **Portability**: Exported connections contain file paths that don't exist on other machines
2. **Fragility**: Moving/deleting the key file breaks the connection
3. **Inconsistency**: Passwords are encrypted and stored, but keys are not
4. **User experience**: PPK→PEM converter creates a file, then stores only its path

The root cause is treating keys as "external files" rather than "credential content" like passwords.

---

## Fix Strategy

### Option A: Add PrivateKeyContent Field (Recommended)

- Add `PrivateKeyContent []byte` field to `Connection` model
- Keep `PrivateKeyPath` for backward compatibility (mark as deprecated)
- Prefer `PrivateKeyContent` over `PrivateKeyPath` when both exist
- Encrypt `PrivateKeyContent` before storing (like `EncryptedPassword`)
- Migrate existing connections opportunistically (read + store content when connecting)

**Pros:**
- Full backward compatibility (existing connections continue working)
- Graceful migration path (no breaking changes)
- Can display "Key stored securely" in UI without showing path

**Cons:**
- Two fields to maintain (temporary technical debt)
- Slightly larger data model

### Option B: Replace PrivateKeyPath with PrivateKeyContent

- Remove `PrivateKeyPath` field entirely
- Replace with `PrivateKeyContent []byte`
- Require migration script for existing connections

**Pros:**
- Cleaner data model (no deprecated fields)
- Simpler long-term maintenance

**Cons:**
- Breaking change (requires migration)
- Existing connections break until migration runs
- Higher risk of data loss

**Recommended:** Option A — safer, backward-compatible, easier to test

---

## Implementation Tasks

### Phase 1: Backend Data Model & Encryption

| Task | Agent              | Files                              | Description                                                                 |
| ---- | ------------------ | ---------------------------------- | --------------------------------------------------------------------------- |
| 1.1  | Backend Developer  | `internal/models/connection.go`    | Add `PrivateKeyContent []byte` field, keep `PrivateKeyPath` for compatibility |
| 1.2  | Backend Developer  | `internal/db/store.go`             | No schema changes needed (already stores encrypted blob)                    |
| 1.3  | Backend Developer  | `internal/db/crypto.go`            | Verify `Encrypt`/`Decrypt` can handle PEM content (already tested with passwords) |

**Depends on:** Nothing
**Parallelizable:** Yes — all read-only analysis or simple additions

**Sub-Agent Guidance:**
- Task 1.1 is atomic (single field addition)
- Task 1.2 is verification only (no code changes)
- Task 1.3 is verification only (existing functions work)

---

### Phase 2: SSH Client Layer (Read PEM Content)

| Task | Agent              | Files                          | Description                                                                                      |
| ---- | ------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------ |
| 2.1  | Backend Developer  | `internal/ssh/client.go`       | Update `NewClientWithKeyPassphraseAndHostKey` to check `PrivateKeyContent` first, fallback to path |
| 2.2  | Backend Developer  | `internal/ssh/manager.go`      | Pass both `privateKeyPath` and `privateKeyContent` to client constructor                          |

**Depends on:** Phase 1
**Parallelizable:** No — Task 2.2 depends on 2.1 signature

**Sub-Agent Guidance:**
- Task 2.1: Add logic: if `privateKeyContent != nil && len(privateKeyContent) > 0`, use it; else read from path
- Task 2.2: Update `ConnectWithPassphrase` to accept both parameters

---

### Phase 3: Backend API Layer (Store PEM Content)

| Task | Agent              | Files       | Description                                                                                              |
| ---- | ------------------ | ----------- | -------------------------------------------------------------------------------------------------------- |
| 3.1  | Backend Developer  | `app.go`    | Update `SelectPrivateKeyFile` to return both path and content                                            |
| 3.2  | Backend Developer  | `app.go`    | Update `CreateConnection` to encrypt and store `PrivateKeyContent` when provided                         |
| 3.3  | Backend Developer  | `app.go`    | Update `UpdateConnection` to handle `PrivateKeyContent` encryption                                       |
| 3.4  | Backend Developer  | `app.go`    | Update `ConnectSSHWithPassphrase` to pass both path and content to SSH manager                           |
| 3.5  | Backend Developer  | `app.go`    | Update `ConvertPPKToPEM` to read PEM content after conversion, return both path and content              |

**Depends on:** Phase 2
**Parallelizable:** Partially — 3.1 can run first; 3.2-3.5 depend on 3.1

**Sub-Agent Guidance:**
- Task 3.1: Change signature to `SelectPrivateKeyFile() (path string, content []byte, err error)`; read file after user selects
- Task 3.2-3.3: Add `privateKeyContent` parameter, encrypt before storing
- Task 3.4: Decrypt `PrivateKeyContent` if exists, pass to manager
- Task 3.5: After PPK→PEM conversion, read PEM file content, return alongside path

---

### Phase 4: Frontend Integration

| Task | Agent               | Files                                      | Description                                                                              |
| ---- | ------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| 4.1  | Frontend Developer  | `frontend/src/types/wails.d.ts`            | Update `SelectPrivateKeyFile` return type to `{ path: string, content: string }` (base64) |
| 4.2  | Frontend Developer  | `frontend/src/components/App.tsx`          | Handle new `SelectPrivateKeyFile` return structure, pass content to `CreateConnection`   |
| 4.3  | Frontend Developer  | `frontend/src/components/App.tsx`          | Update connection form to show "Key stored securely" instead of path when content exists |
| 4.4  | Frontend Developer  | `frontend/src/components/PPKConverterDialog.tsx` | After conversion, store PEM content (not just path) if "Add to connections" feature exists |

**Depends on:** Phase 3
**Parallelizable:** No — Frontend tasks depend on backend API changes

**Sub-Agent Guidance:**
- Task 4.1: TypeScript type update only
- Task 4.2: Destructure `{path, content}` from `SelectPrivateKeyFile`, pass to backend
- Task 4.3: Conditional rendering: if `connection.privateKeyContent` exists (non-empty), show "🔐 Private key stored" instead of path input
- Task 4.4: Optional enhancement (PPKConverterDialog currently doesn't auto-add connections)

---

### Phase 5: Export/Import Enhancement

| Task | Agent              | Files                   | Description                                                                       |
| ---- | ------------------ | ----------------------- | --------------------------------------------------------------------------------- |
| 5.1  | Backend Developer  | `internal/db/store.go`  | Update `ExportJSON` to decrypt and include `PrivateKeyContent` as base64 string   |
| 5.2  | Backend Developer  | `internal/db/store.go`  | Update `ImportJSON` to encrypt and store `PrivateKeyContent` from backup          |

**Depends on:** Phase 3
**Parallelizable:** Yes — Both tasks modify same file but different functions

**Sub-Agent Guidance:**
- Task 5.1: In `ExportJSON`, decode `PrivateKeyContent` like `EncryptedPassword`, add `privateKeyContent string` to `exportConnection` struct
- Task 5.2: In `ImportJSON`, encrypt `privateKeyContent` from JSON, store in `Connection.PrivateKeyContent`

---

### Phase 6: Testing & Verification (Always Last)

**Depends on:** All implementation phases

| Task | Agent             | Description                                                                                       |
| ---- | ----------------- | ------------------------------------------------------------------------------------------------- |
| 6.1  | Debugger/Reviewer | Verify all acceptance criteria met                                                                |
| 6.2  | Debugger/Reviewer | Test backward compatibility (existing connections with `PrivateKeyPath` still work)               |
| 6.3  | Debugger/Reviewer | Test new connections (key content stored, connections work)                                       |
| 6.4  | Debugger/Reviewer | Test export/import (key content preserved)                                                        |
| 6.5  | Debugger/Reviewer | Test PPK converter flow (converted PEM content stored)                                            |
| 6.6  | Debugger/Reviewer | Security review: ensure `PrivateKeyContent` encrypted before storage, decrypted only for use      |

---

## Acceptance Criteria

- [ ] New connections with private keys store encrypted content, not path
- [ ] Existing connections with `PrivateKeyPath` continue to work (backward compatibility)
- [ ] SSH connections successfully authenticate using stored key content
- [ ] Frontend displays "Private key stored securely" instead of file path
- [ ] `SelectPrivateKeyFile` reads and returns file content alongside path
- [ ] `CreateConnection` encrypts key content before storing
- [ ] `UpdateConnection` handles key content encryption
- [ ] Export/import preserves key content (not just path)
- [ ] PPK converter stores converted PEM content (optional, if auto-add feature exists)
- [ ] No plaintext PEM content in logs or error messages
- [ ] `PrivateKeyContent` encrypted with same mechanism as `EncryptedPassword`
- [ ] Tests verify both `PrivateKeyPath` (legacy) and `PrivateKeyContent` (new) code paths

---

## Data Model Changes

### Before (Current)

```go
type Connection struct {
    ID                int    `json:"id"`
    Name              string `json:"name"`
    Host              string `json:"host"`
    Port              int    `json:"port"`
    Username          string `json:"username"`
    EncryptedPassword []byte `json:"encrypted_password"`
    PrivateKeyPath    string `json:"privateKeyPath"`  // ← External file path
    CreatedAt         int64  `json:"createdAt"`
    UpdatedAt         int64  `json:"updatedAt"`
}
```

### After (Proposed)

```go
type Connection struct {
    ID                int    `json:"id"`
    Name              string `json:"name"`
    Host              string `json:"host"`
    Port              int    `json:"port"`
    Username          string `json:"username"`
    EncryptedPassword []byte `json:"encrypted_password"`
    PrivateKeyPath    string `json:"privateKeyPath"`      // ← Deprecated, kept for compatibility
    PrivateKeyContent []byte `json:"privateKeyContent"`   // ← NEW: Encrypted PEM content
    CreatedAt         int64  `json:"createdAt"`
    UpdatedAt         int64  `json:"updatedAt"`
}
```

**Migration strategy:** No schema migration needed. Old connections have `PrivateKeyPath`, new connections have `PrivateKeyContent`. SSH client checks `PrivateKeyContent` first.

---

## Code Flow Changes

### Current Flow (File-Based)

```
User selects key file
  ↓
Store path string in Connection.PrivateKeyPath
  ↓
On connect: ioutil.ReadFile(privateKeyPath)
  ↓
Parse and use key
```

**Problem:** File must exist at connection time

### New Flow (Content-Based)

```
User selects key file
  ↓
Read file content immediately
  ↓
Encrypt content with crypto.Encrypt()
  ↓
Store encrypted content in Connection.PrivateKeyContent
  ↓
On connect: crypto.Decrypt(privateKeyContent)
  ↓
Parse and use key
```

**Benefit:** Self-contained, portable, secure

---

## Backward Compatibility Strategy

### SSH Client Logic (internal/ssh/client.go)

```go
func NewClientWithKeyPassphraseAndHostKey(
    host string, port int, username string,
    privateKeyPath string,           // ← Keep for compatibility
    privateKeyContent []byte,         // ← NEW parameter
    passphrase string,
    hostKeyCallback ssh.HostKeyCallback,
) (*Client, error) {
    var key []byte
    var err error

    // Prefer content over path
    if privateKeyContent != nil && len(privateKeyContent) > 0 {
        key = privateKeyContent  // Already read from storage
    } else if privateKeyPath != "" {
        key, err = ioutil.ReadFile(privateKeyPath)  // Legacy path
        if err != nil {
            return nil, fmt.Errorf("read private key failed: %w", err)
        }
    } else {
        return nil, fmt.Errorf("no private key specified")
    }

    // Rest of parsing logic unchanged...
}
```

### Frontend Display Logic

```tsx
// In connection list/edit form
{conn.privateKeyContent && conn.privateKeyContent.length > 0 ? (
  <div className={styles.keyStored}>
    <Lock size={14} />
    Private key stored securely
  </div>
) : conn.privateKeyPath ? (
  <div className={styles.keyPath}>
    <FileKey size={14} />
    {conn.privateKeyPath}
  </div>
) : null}
```

---

## Security Considerations

### Encryption

- Use existing `crypto.Encrypt()` / `crypto.Decrypt()` (proven with passwords)
- PEM content encrypted with machine-bound AES-256-GCM key
- Same security properties as `EncryptedPassword`

### Storage

- Encrypted content stored in `esesha.bin` (already encrypted file)
- Double encryption: content encrypted → stored in encrypted file
- No plaintext PEM content on disk

### Memory

- Decrypted PEM content lives in memory only during connection establishment
- No different from current password handling
- SSH library handles key material securely

### Logging

- Never log decrypted `PrivateKeyContent`
- Error messages should not expose key material
- Log only metadata (key type, length, encryption status)

---

## Testing Strategy

### Unit Tests

1. **Encryption/Decryption**
   - Verify PEM content roundtrip through `crypto.Encrypt()` / `crypto.Decrypt()`
   - Test with various key types (RSA, ECDSA, Ed25519)
   - Test with encrypted keys (passphrase required)

2. **SSH Client**
   - Mock connection using `privateKeyContent` parameter
   - Mock connection using `privateKeyPath` parameter (legacy)
   - Verify preference order (content over path)

### Integration Tests

1. **Connection CRUD**
   - Create connection with key content → verify encrypted storage
   - Update connection with new key content → verify re-encryption
   - Delete connection → verify cleanup

2. **SSH Connection**
   - Connect using stored key content → verify successful auth
   - Connect using legacy key path → verify backward compatibility
   - Connect with passphrase-protected key → verify decryption

3. **Export/Import**
   - Export connections with key content → verify base64 in JSON
   - Import connections with key content → verify encryption on restore
   - Import legacy backup (only paths) → verify still works

### Manual Testing

1. **New Connection Workflow**
   - Create connection → select key file → verify "Key stored securely" shown
   - Connect → verify successful authentication
   - Export → verify key content in backup JSON
   - Import → verify connection works on different machine

2. **PPK Converter Workflow**
   - Convert PPK to PEM → verify content stored (not just path)
   - Connect using converted key → verify successful auth

3. **Backward Compatibility**
   - Open existing `esesha.bin` with old connections
   - Verify connections with `PrivateKeyPath` still work
   - Edit old connection → verify can migrate to content storage

---

## Rollback Strategy

If issues arise:

1. **Revert backend changes:**
   - Remove `PrivateKeyContent` field from `Connection` model
   - Revert `app.go` API changes
   - Revert SSH client signature changes

2. **Database state:**
   - Old connections with `PrivateKeyPath` unaffected (field ignored)
   - New connections with `PrivateKeyContent` lose key data (must re-select file)
   - Export backup before fix deployment

3. **Frontend:**
   - Revert to showing `privateKeyPath` only
   - Remove "Key stored securely" UI

**Risk:** Low — backward compatibility built-in; old connections work regardless

---

## Migration Path for Existing Connections

### Option 1: Opportunistic Migration (Recommended)

- When user connects with a `PrivateKeyPath` connection:
  1. Read file from path (current behavior)
  2. After successful connection, encrypt content and update `PrivateKeyContent`
  3. Keep `PrivateKeyPath` as fallback
- No forced migration, happens naturally over time

### Option 2: Bulk Migration Tool

- Add "Migrate Connections" button in settings
- Read all connections with `PrivateKeyPath`
- For each, read file, encrypt, store `PrivateKeyContent`
- Report success/failures

### Option 3: No Migration

- Existing connections continue using `PrivateKeyPath`
- Only new connections use `PrivateKeyContent`
- User can manually edit connections to re-select key (stores content)

**Recommended:** Option 1 — transparent, no user action required

---

## Risks & Mitigations

| Risk                                              | Impact | Likelihood | Mitigation                                                                           |
| ------------------------------------------------- | ------ | ---------- | ------------------------------------------------------------------------------------ |
| Key file read fails during SelectPrivateKeyFile   | Medium | Low        | Show error, let user retry; don't create connection without content                 |
| Encryption fails for large keys (>4KB)            | Medium | Very Low   | Test with various key sizes; crypto layer already handles passwords up to 1KB       |
| Backward compatibility breaks old connections     | High   | Low        | Keep `PrivateKeyPath` field, fallback logic in SSH client                           |
| Export/import loses key content                   | High   | Low        | Test export/import thoroughly; add verification step                                |
| Decryption fails (wrong machine, corrupted data)  | High   | Low        | Same risk as passwords; show clear error, allow re-selection                        |
| PPK converter doesn't store content automatically | Low    | Medium     | Phase 4 Task 4.4 optional; user can manually add connection after conversion        |

---

## Documentation Updates

### User-Facing

- Update `docs/guides/ppk-converter.md`: Mention keys stored securely, not as paths
- Create `docs/guides/private-key-storage.md`: Explain new content storage model
- Update FAQ: "Where are my private keys stored?" → "Encrypted in esesha.bin"

### Developer

- Update `docs/api/connection-management.md`: Document new `PrivateKeyContent` field
- Update `docs/database/schema.md`: Add `privateKeyContent` field specification
- Update `internal/models/connection.go` godoc: Mark `PrivateKeyPath` as deprecated

### Changelog

```markdown
## [Unreleased]

### Changed
- [2026-08-14] **Fix-011: Store Private Key Content (Not Path)** — PLANNED
  - **Problem:** Private keys stored as file paths, not portable, breaks if file deleted
  - **Solution:** Store encrypted PEM content in database (like passwords)
  - **Backward compatibility:** Existing connections with `PrivateKeyPath` continue working
  - **New behavior:** New connections store key content, show "Private key stored securely"
  - **Export/import:** Key content now included in backups (not just path references)
  - **Files modified:** `internal/models/connection.go`, `internal/ssh/client.go`, `internal/ssh/manager.go`, `app.go`, `internal/db/store.go`, `frontend/src/components/App.tsx`, `frontend/src/types/wails.d.ts`
  - **See:** `docs/planning/fix-011-pem-content-storage.md`
```

---

## Implementation Order Summary

```
Phase 1: Backend Data Model & Encryption
  ↓
Phase 2: SSH Client Layer (Read PEM Content)
  ↓
Phase 3: Backend API Layer (Store PEM Content)
  ↓
Phase 4: Frontend Integration
  ↓
Phase 5: Export/Import Enhancement
  ↓
Phase 6: Testing & Verification (Review Phase)
```

**Estimated effort:** 8-12 hours

- Phase 1: 1-2 hours (simple field addition + verification)
- Phase 2: 2-3 hours (SSH client logic + manager integration)
- Phase 3: 3-4 hours (5 app.go method updates + encryption)
- Phase 4: 2-3 hours (frontend type updates + UI changes)
- Phase 5: 1-2 hours (export/import updates)
- Phase 6: 2-3 hours (comprehensive testing + security review)

**Parallelization opportunities:**
- Phase 1 all tasks can run in parallel
- Phase 3: Task 3.1 first, then 3.2-3.5 in parallel
- Phase 5: Tasks 5.1 and 5.2 can run in parallel

---

## Version History

| Version | Date       | Summary         |
| ------- | ---------- | --------------- |
| 1.0.0   | 2026-08-14 | Initial fix plan |
