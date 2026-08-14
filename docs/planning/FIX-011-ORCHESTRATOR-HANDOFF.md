# Fix-011 Orchestrator Handoff

**Agent Routing Instructions for Fix-011: Store Private Key Content (Not Path)**

---

## Execution Order

```
Phase 1: Backend Data Model & Encryption
  ├─ Task 1.1: Add PrivateKeyContent field (Backend Developer)
  ├─ Task 1.2: Verify db/store.go (Backend Developer)
  └─ Task 1.3: Verify db/crypto.go (Backend Developer)
  [All tasks parallelizable]

Phase 2: SSH Client Layer
  ├─ Task 2.1: Update ssh/client.go (Backend Developer)
  └─ Task 2.2: Update ssh/manager.go (Backend Developer)
  [Sequential: 2.2 depends on 2.1]

Phase 3: Backend API Layer
  ├─ Task 3.1: Update SelectPrivateKeyFile (Backend Developer) ← MUST COMPLETE FIRST
  ├─ Task 3.2: Update CreateConnection (Backend Developer)
  ├─ Task 3.3: Update UpdateConnection (Backend Developer)
  ├─ Task 3.4: Update ConnectSSHWithPassphrase (Backend Developer)
  └─ Task 3.5: Update ConvertPPKToPEM (Backend Developer)
  [Task 3.1 first, then 3.2-3.5 parallelizable]

Phase 4: Frontend Integration
  ├─ Task 4.1: Update wails.d.ts types (Frontend Developer)
  ├─ Task 4.2: Update App.tsx API handling (Frontend Developer)
  ├─ Task 4.3: Update App.tsx UI display (Frontend Developer)
  └─ Task 4.4: Update PPKConverterDialog.tsx (Frontend Developer, optional)
  [Sequential: 4.2-4.4 depend on 4.1]

Phase 5: Export/Import Enhancement
  ├─ Task 5.1: Update ExportJSON (Backend Developer)
  └─ Task 5.2: Update ImportJSON (Backend Developer)
  [Parallelizable: both modify same file, different functions]

Phase 6: Testing & Verification
  ├─ Task 6.1: Verify acceptance criteria (Debugger/Reviewer)
  ├─ Task 6.2: Test backward compatibility (Debugger/Reviewer)
  ├─ Task 6.3: Test new connections (Debugger/Reviewer)
  ├─ Task 6.4: Test export/import (Debugger/Reviewer)
  ├─ Task 6.5: Test PPK converter (Debugger/Reviewer)
  └─ Task 6.6: Security review (Debugger/Reviewer)
  [Sequential testing, comprehensive]
```

---

## Phase 1: Backend Data Model & Encryption

**Agent:** Backend Developer  
**Depends on:** Nothing  
**Parallelizable:** Yes (all tasks)  
**Estimated time:** 1-2 hours

### Task 1.1: Add PrivateKeyContent field

**File:** `internal/models/connection.go`

**Instruction:**
Add `PrivateKeyContent []byte` field to `Connection` struct after `PrivateKeyPath`.
Keep `PrivateKeyPath` for backward compatibility.

**Expected change:**
```go
type Connection struct {
    ID                int    `json:"id"`
    Name              string `json:"name"`
    Host              string `json:"host"`
    Port              int    `json:"port"`
    Username          string `json:"username"`
    EncryptedPassword []byte `json:"encrypted_password"`
    PrivateKeyPath    string `json:"privateKeyPath"`      // Deprecated, kept for compatibility
    PrivateKeyContent []byte `json:"privateKeyContent"`   // NEW: Encrypted PEM content
    CreatedAt         int64  `json:"createdAt"`
    UpdatedAt         int64  `json:"updatedAt"`
}
```

**Verification:**
- `go build ./internal/models` exits 0
- No breaking changes to existing code

---

### Task 1.2: Verify db/store.go

**File:** `internal/db/store.go`

**Instruction:**
READ ONLY — Verify no schema changes needed.
The store already handles `[]byte` fields (like `EncryptedPassword`).
JSON marshaling/unmarshaling automatically handles new field.

**Expected outcome:** No code changes needed

**Verification:**
- `go build ./internal/db` exits 0
- Existing tests pass

---

### Task 1.3: Verify db/crypto.go

**File:** `internal/db/crypto.go`

**Instruction:**
READ ONLY — Verify `crypto.Encrypt()` and `crypto.Decrypt()` can handle PEM content.
These functions already work with passwords (up to 1KB), PEM keys are similar size (2-4KB).

**Expected outcome:** No code changes needed

**Verification:**
- `go test ./internal/db -run TestEncryptDecrypt` passes
- Existing crypto tests cover this use case

---

## Phase 2: SSH Client Layer

**Agent:** Backend Developer  
**Depends on:** Phase 1 complete  
**Parallelizable:** No (Task 2.2 depends on 2.1)  
**Estimated time:** 2-3 hours

### Task 2.1: Update ssh/client.go

**File:** `internal/ssh/client.go`

**Instruction:**
Update `NewClientWithKeyPassphraseAndHostKey` to accept `privateKeyContent []byte` parameter.
Add logic to prefer content over path.

**Expected changes:**

1. Update function signature (line ~71):
```go
func NewClientWithKeyPassphraseAndHostKey(
    host string, port int, username, privateKeyPath string,
    privateKeyContent []byte,  // NEW parameter
    passphrase string,
    hostKeyCallback ssh.HostKeyCallback,
) (*Client, error) {
```

2. Update key reading logic (line ~74-82):
```go
var key []byte
var err error

// Prefer content over path (new connections store content)
if privateKeyContent != nil && len(privateKeyContent) > 0 {
    key = privateKeyContent
} else if privateKeyPath != "" {
    key, err = ioutil.ReadFile(privateKeyPath)  // Backward compatibility
    if err != nil {
        return nil, fmt.Errorf("read private key failed: %w", err)
    }
} else {
    return nil, fmt.Errorf("no private key specified")
}

// Existing parsing logic continues...
```

3. Update other functions that call this:
- `NewClientWithHostKeyCallback` (line ~22): pass `nil` for `privateKeyContent`
- `NewClientWithKeyAndPassphrase` (line ~66): pass `nil` for `privateKeyContent`

**Verification:**
- `go build ./internal/ssh` exits 0
- Signature change compiles without errors

---

### Task 2.2: Update ssh/manager.go

**File:** `internal/ssh/manager.go`

**Instruction:**
Update `ConnectWithPassphrase` to accept and pass `privateKeyContent []byte` parameter.

**Expected changes:**

1. Update function signature (line ~59):
```go
func (m *Manager) ConnectWithPassphrase(
    host string, port int, username, password, privateKeyPath string,
    privateKeyContent []byte,  // NEW parameter
    keyPassphrase string,
    cols, rows int,
) (string, error) {
```

2. Update client constructor call (line ~72):
```go
if privateKeyPath != "" || (privateKeyContent != nil && len(privateKeyContent) > 0) {
    client, err = NewClientWithKeyPassphraseAndHostKey(
        host, port, username, privateKeyPath, privateKeyContent,  // Added privateKeyContent
        keyPassphrase, hostKeyCallback,
    )
} else {
    client, err = NewClientWithHostKeyCallback(
        host, port, username, password, "", hostKeyCallback,
    )
}
```

3. Update `Connect` wrapper (line ~54):
```go
func (m *Manager) Connect(host string, port int, username, password, privateKeyPath string, cols, rows int) (string, error) {
    return m.ConnectWithPassphrase(host, port, username, password, privateKeyPath, nil, "", cols, rows)
}
```

**Verification:**
- `go build ./internal/ssh` exits 0
- Manager compiles with new signature

---

## Phase 3: Backend API Layer

**Agent:** Backend Developer  
**Depends on:** Phase 2 complete  
**Parallelizable:** Task 3.1 must complete first, then 3.2-3.5 parallel  
**Estimated time:** 3-4 hours

### Task 3.1: Update SelectPrivateKeyFile (MUST COMPLETE FIRST)

**File:** `app.go`

**Instruction:**
Change `SelectPrivateKeyFile` to read file content and return both path and content.

**Expected changes:**

1. Update function signature (line ~240):
```go
func (a *App) SelectPrivateKeyFile() (string, []byte, error) {
```

2. Read file content after selection (line ~249):
```go
filePath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
    Title: "Select Private Key File",
    Filters: []runtime.FileFilter{
        {DisplayName: "Private Key Files", Pattern: "*.pem;*.key;*.ppk;id_rsa;id_ecdsa;id_ed25519"},
        {DisplayName: "All Files", Pattern: "*"},
    },
})
if err != nil {
    return "", nil, err
}
if filePath == "" {
    return "", nil, nil  // User cancelled
}

// Read file content
content, err := os.ReadFile(filePath)
if err != nil {
    return "", nil, fmt.Errorf("failed to read key file: %w", err)
}

return filePath, content, nil
```

**Verification:**
- `go build .` exits 0
- Wails binding generation works

---

### Task 3.2: Update CreateConnection

**File:** `app.go`

**Instruction:**
Update `CreateConnection` to accept `privateKeyContent []byte` parameter and encrypt before storing.

**Expected changes:**

1. Update function signature (line ~126):
```go
func (a *App) CreateConnection(name, host string, port int, username, password string, privateKeyContent []byte) (int, error) {
```

2. Encrypt key content if provided (line ~128):
```go
var encryptedPassword []byte
if password != "" {
    encrypted, err := crypto.Encrypt([]byte(password))
    if err != nil {
        return 0, fmt.Errorf("failed to encrypt password: %w", err)
    }
    encryptedPassword = encrypted
}

var encryptedKeyContent []byte
if privateKeyContent != nil && len(privateKeyContent) > 0 {
    encrypted, err := crypto.Encrypt(privateKeyContent)
    if err != nil {
        return 0, fmt.Errorf("failed to encrypt private key: %w", err)
    }
    encryptedKeyContent = encrypted
}

conn := &models.Connection{
    Name:              name,
    Host:              host,
    Port:              port,
    Username:          username,
    EncryptedPassword: encryptedPassword,
    PrivateKeyContent: encryptedKeyContent,  // Store encrypted content
}
```

**Verification:**
- `go build .` exits 0
- Connection creation compiles

---

### Task 3.3: Update UpdateConnection

**File:** `app.go`

**Instruction:**
Update `UpdateConnection` to accept `privateKeyContent []byte` parameter and encrypt before storing.

**Expected changes:**

1. Update function signature (line ~182):
```go
func (a *App) UpdateConnection(id int, name, host string, port int, username, password string, privateKeyContent []byte) error {
```

2. Add key content encryption (after password encryption, line ~197):
```go
if password != "" {
    encrypted, err := crypto.Encrypt([]byte(password))
    if err != nil {
        return fmt.Errorf("failed to encrypt password: %w", err)
    }
    conn.EncryptedPassword = encrypted
}

if privateKeyContent != nil && len(privateKeyContent) > 0 {
    encrypted, err := crypto.Encrypt(privateKeyContent)
    if err != nil {
        return fmt.Errorf("failed to encrypt private key: %w", err)
    }
    conn.PrivateKeyContent = encrypted
}
```

**Verification:**
- `go build .` exits 0
- Connection update compiles

---

### Task 3.4: Update ConnectSSHWithPassphrase

**File:** `app.go`

**Instruction:**
Decrypt `PrivateKeyContent` and pass to SSH manager.

**Expected changes:**

1. Decrypt key content (after password decryption, line ~289):
```go
var password string
if len(conn.EncryptedPassword) > 0 {
    decrypted, err := crypto.Decrypt(conn.EncryptedPassword)
    if err != nil {
        return "", fmt.Errorf("failed to decrypt password: %w", err)
    }
    password = string(decrypted)
}

var privateKeyContent []byte
if len(conn.PrivateKeyContent) > 0 {
    decrypted, err := crypto.Decrypt(conn.PrivateKeyContent)
    if err != nil {
        return "", fmt.Errorf("failed to decrypt private key: %w", err)
    }
    privateKeyContent = decrypted
}
```

2. Pass to SSH manager (line ~296):
```go
sessionID, err := a.sshManager.ConnectWithPassphrase(
    conn.Host,
    conn.Port,
    conn.Username,
    password,
    conn.PrivateKeyPath,      // Backward compatibility
    privateKeyContent,         // NEW: decrypted content
    keyPassphrase,
    cols,
    rows,
)
```

**Verification:**
- `go build .` exits 0
- SSH connection compiles

---

### Task 3.5: Update ConvertPPKToPEM

**File:** `app.go`

**Instruction:**
After PPK→PEM conversion, read PEM file content and return it.

**Expected changes:**

1. Update function signature (line ~262):
```go
func (a *App) ConvertPPKToPEM(ppkPath, pemPath, passphrase string) ([]byte, error) {
```

2. Read PEM content after conversion (line ~264):
```go
err := converter.ConvertPPKToPEM(ppkPath, pemPath, passphrase)
if err != nil {
    return nil, err
}

// Read converted PEM content
content, err := os.ReadFile(pemPath)
if err != nil {
    return nil, fmt.Errorf("failed to read converted PEM file: %w", err)
}

return content, nil
```

**Verification:**
- `go build .` exits 0
- PPK converter compiles

---

## Phase 4: Frontend Integration

**Agent:** Frontend Developer  
**Depends on:** Phase 3 complete  
**Parallelizable:** No (tasks depend on 4.1)  
**Estimated time:** 2-3 hours

### Task 4.1: Update wails.d.ts types

**File:** `frontend/src/types/wails.d.ts`

**Instruction:**
Update TypeScript types for modified Go methods.

**Expected changes:**

```typescript
export function SelectPrivateKeyFile(): Promise<{path: string, content: string}>;

export function CreateConnection(
    name: string,
    host: string,
    port: number,
    username: string,
    password: string,
    privateKeyContent: string  // base64 encoded
): Promise<number>;

export function UpdateConnection(
    id: number,
    name: string,
    host: string,
    port: number,
    username: string,
    password: string,
    privateKeyContent: string  // base64 encoded
): Promise<void>;

export function ConvertPPKToPEM(
    ppkPath: string,
    pemPath: string,
    passphrase: string
): Promise<string>;  // returns base64 encoded PEM content
```

**Verification:**
- `tsc --noEmit` exits 0
- No type errors

---

### Task 4.2: Update App.tsx API handling

**File:** `frontend/src/components/App.tsx`

**Instruction:**
Update `SelectPrivateKeyFile` calls to handle `{path, content}` return structure.

**Expected changes:**

1. Update `selectPrivateKey` handler (line ~559):
```typescript
const selectPrivateKey = async () => {
    try {
        const {path, content} = await SelectPrivateKeyFile();
        if (path) {
            setNewConn({ 
                ...newConn, 
                privateKeyPath: path,
                privateKeyContent: content  // Store content too
            });
        }
    } catch (err) {
        setFormError(`Failed to select key file: ${err}`);
    }
};
```

2. Update connection creation (line ~582):
```typescript
const keyContent = authMethod === 'key' ? newConn.privateKeyContent : '';
await CreateConnection(newConn.name, newConn.host, port, newConn.username, password, keyContent);
```

3. Update connection editing (line ~236):
```typescript
const selectEditPrivateKey = async () => {
    try {
        const {path, content} = await SelectPrivateKeyFile();
        if (path) {
            setEditFormData({
                ...editFormData, 
                privateKeyPath: path,
                privateKeyContent: content
            });
        }
    } catch (err) {
        setEditFormError(`Failed to select key file: ${err}`);
    }
};
```

4. Update state interfaces (line ~12, ~44):
```typescript
interface NewConnection {
    name: string;
    host: string;
    port: number;
    username: string;
    password: string;
    privateKeyPath: string;
    privateKeyContent: string;  // NEW
}
```

**Verification:**
- `tsc --noEmit` exits 0
- `npm run build` succeeds

---

### Task 4.3: Update App.tsx UI display

**File:** `frontend/src/components/App.tsx`

**Instruction:**
Display "Private key stored securely" when connection has `privateKeyContent`.

**Expected changes:**

1. In connection list (line ~155):
```tsx
{conn.privateKeyContent ? (
    <div className={styles.keyStored}>
        <Lock size={14} />
        Private key stored securely
    </div>
) : conn.privateKeyPath ? (
    <div className={styles.keyPath} title={conn.privateKeyPath}>
        <FileKey size={14} />
        {conn.privateKeyPath}
    </div>
) : null}
```

2. Add CSS styles in `App.module.css`:
```css
.keyStored {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--accent-primary);
    opacity: 0.8;
}

.keyPath {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--text-secondary);
    opacity: 0.6;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
```

**Verification:**
- UI displays correctly for both cases
- Icons imported from lucide-react

---

### Task 4.4: Update PPKConverterDialog.tsx (Optional)

**File:** `frontend/src/components/PPKConverterDialog.tsx`

**Instruction:**
OPTIONAL — If "Add to connections" feature exists, store PEM content (not just path).

**Expected changes:**

If there's an "Add connection" button in the converter dialog:
```typescript
const {path, content} = {path: pemPath, content: convertedContent};
// Store both path and content when adding connection
```

**Verification:**
- Feature works if implemented
- Can be deferred (converter currently just creates file)

---

## Phase 5: Export/Import Enhancement

**Agent:** Backend Developer  
**Depends on:** Phase 3 complete  
**Parallelizable:** Yes (both tasks, different functions)  
**Estimated time:** 1-2 hours

### Task 5.1: Update ExportJSON

**File:** `internal/db/store.go`

**Instruction:**
Update `ExportJSON` to decrypt and include `PrivateKeyContent` as base64 string.

**Expected changes:**

1. Update `exportConnection` struct (line ~43):
```go
type exportConnection struct {
    ID                int    `json:"id"`
    Name              string `json:"name"`
    Host              string `json:"host"`
    Port              int    `json:"port"`
    Username          string `json:"username"`
    Password          string `json:"password"`
    PrivateKeyPath    string `json:"privateKeyPath"`
    PrivateKeyContent string `json:"privateKeyContent"`  // NEW: base64 encoded
    CreatedAt         int64  `json:"createdAt"`
    UpdatedAt         int64  `json:"updatedAt"`
}
```

2. Decrypt and export key content (line ~246):
```go
// Decrypt password if exists
if len(conn.EncryptedPassword) > 0 {
    decrypted, err := crypto.Decrypt(conn.EncryptedPassword)
    if err != nil {
        log.Printf("Warning: failed to decrypt password for connection %s: %v", conn.Name, err)
    } else {
        ec.Password = string(decrypted)
    }
}

// Decrypt private key content if exists
if len(conn.PrivateKeyContent) > 0 {
    decrypted, err := crypto.Decrypt(conn.PrivateKeyContent)
    if err != nil {
        log.Printf("Warning: failed to decrypt private key for connection %s: %v", conn.Name, err)
    } else {
        ec.PrivateKeyContent = base64.StdEncoding.EncodeToString(decrypted)
    }
}
```

3. Add import at top:
```go
import (
    "encoding/base64"
    // ... other imports
)
```

**Verification:**
- `go build ./internal/db` exits 0
- Exported JSON includes `privateKeyContent` field

---

### Task 5.2: Update ImportJSON

**File:** `internal/db/store.go`

**Instruction:**
Update `ImportJSON` to encrypt and store `PrivateKeyContent` from backup.

**Expected changes:**

1. Import key content (line ~295):
```go
// Import connections with password encryption
for _, ec := range ed.Connections {
    now := time.Now()
    conn := &models.Connection{
        ID:             s.nextID,
        Name:           ec.Name,
        Host:           ec.Host,
        Port:           ec.Port,
        Username:       ec.Username,
        PrivateKeyPath: ec.PrivateKeyPath,
        CreatedAt:      now.Unix(),
        UpdatedAt:      now.Unix(),
    }

    // Encrypt password if provided
    if ec.Password != "" {
        encrypted, err := crypto.Encrypt([]byte(ec.Password))
        if err != nil {
            log.Printf("Warning: failed to encrypt password for connection %s: %v", ec.Name, err)
        } else {
            conn.EncryptedPassword = encrypted
        }
    }

    // Encrypt private key content if provided
    if ec.PrivateKeyContent != "" {
        decoded, err := base64.StdEncoding.DecodeString(ec.PrivateKeyContent)
        if err != nil {
            log.Printf("Warning: failed to decode private key for connection %s: %v", ec.Name, err)
        } else {
            encrypted, err := crypto.Encrypt(decoded)
            if err != nil {
                log.Printf("Warning: failed to encrypt private key for connection %s: %v", ec.Name, err)
            } else {
                conn.PrivateKeyContent = encrypted
            }
        }
    }

    s.connections = append(s.connections, conn)
    s.nextID++
}
```

**Verification:**
- `go build ./internal/db` exits 0
- Imported connections have encrypted `PrivateKeyContent`

---

## Phase 6: Testing & Verification

**Agent:** Debugger/Reviewer  
**Depends on:** All phases complete  
**Parallelizable:** No (comprehensive testing)  
**Estimated time:** 2-3 hours

### Task 6.1: Verify acceptance criteria

**Instruction:** Check all 12 acceptance criteria from fix plan.

**Verification checklist:**
- [ ] New connections store encrypted key content, not path
- [ ] Existing connections with `PrivateKeyPath` still work
- [ ] SSH connections authenticate using stored key content
- [ ] Frontend displays "Private key stored securely" instead of path
- [ ] `SelectPrivateKeyFile` reads and returns file content + path
- [ ] `CreateConnection` encrypts key content before storing
- [ ] `UpdateConnection` handles key content encryption
- [ ] Export/import preserves key content (not just path)
- [ ] PPK converter stores converted PEM content (optional)
- [ ] No plaintext PEM content in logs or error messages
- [ ] `PrivateKeyContent` encrypted with same mechanism as `EncryptedPassword`
- [ ] Tests verify both code paths (content and path)

---

### Task 6.2: Test backward compatibility

**Instruction:** Test existing connections with `PrivateKeyPath`.

**Test cases:**
1. Open existing `esesha.bin` with old connections
2. Connect using connection with `PrivateKeyPath` only
3. Verify successful SSH authentication
4. Check that `PrivateKeyContent` is empty/null
5. Verify fallback to path reading works

---

### Task 6.3: Test new connections

**Instruction:** Test creating connections with key content storage.

**Test cases:**
1. Create new connection with private key
2. Verify "Private key stored securely" displayed
3. Connect using new connection
4. Verify successful SSH authentication
5. Check `esesha.bin` contains encrypted `PrivateKeyContent`
6. Verify `PrivateKeyPath` is empty or same as selection

---

### Task 6.4: Test export/import

**Instruction:** Test export/import preserves key content.

**Test cases:**
1. Export connections with key content
2. Verify backup JSON has `privateKeyContent` field (base64)
3. Delete connection from database
4. Import backup
5. Verify connection restored with key content
6. Connect using restored connection
7. Verify successful SSH authentication

---

### Task 6.5: Test PPK converter

**Instruction:** Test PPK→PEM converter stores content.

**Test cases:**
1. Convert PPK to PEM using dialog
2. Verify PEM file created
3. If auto-add feature exists, verify connection has key content
4. Connect using converted key
5. Verify successful authentication

---

### Task 6.6: Security review

**Instruction:** Verify encryption and no leakage.

**Security checks:**
- [ ] `PrivateKeyContent` encrypted before storage (inspect `esesha.bin` hex)
- [ ] Decryption only during connection (no persistent plaintext)
- [ ] No plaintext PEM in logs (check debug output)
- [ ] No plaintext PEM in error messages (trigger errors, check output)
- [ ] Export JSON has base64 (not plaintext binary)
- [ ] Same encryption as passwords (verify algorithm usage)

---

## Completion Checklist

- [ ] Phase 1: All 3 tasks completed
- [ ] Phase 2: Both tasks completed, signatures updated
- [ ] Phase 3: All 5 tasks completed, Task 3.1 first
- [ ] Phase 4: All frontend tasks completed
- [ ] Phase 5: Both export/import tasks completed
- [ ] Phase 6: All verification tasks completed, all checks passed
- [ ] `go build .` exits 0
- [ ] `go test ./...` all tests pass
- [ ] `npm run build` exits 0
- [ ] `tsc --noEmit` exits 0
- [ ] `wails build` succeeds
- [ ] Changelog updated with Fix-011 entry
- [ ] Repository memory updated

---

## Post-Implementation

### Update Changelog

Add to `docs/planning/changelog.md`:

```markdown
### Fixed
- [2026-08-14] **Fix-011: Store Private Key Content (Not Path)** — COMPLETE ✅
  - **Problem:** Private keys stored as file paths (not portable, breaks if file deleted)
  - **Solution:** Store encrypted PEM content in database (like passwords)
  - **Changes:** Added `Connection.PrivateKeyContent []byte` field; updated SSH client to prefer content over path
  - **Backward compatibility:** 100% — existing connections with `PrivateKeyPath` continue working
  - **Export/import:** Key content now included in backups (base64 encoded)
  - **UI:** Displays "Private key stored securely" instead of file path
  - **Files modified:** 8 files (models, SSH client/manager, app.go, store, frontend)
  - **See:** `docs/planning/fix-011-pem-content-storage.md`
```

---

## Version History

| Version | Date       | Summary                        |
| ------- | ---------- | ------------------------------ |
| 1.0.0   | 2026-08-14 | Initial orchestrator handoff   |
