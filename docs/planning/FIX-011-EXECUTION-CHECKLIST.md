# Fix-011 Execution Checklist

**Fix:** Store Private Key Content (Not Path)  
**Date:** 2026-08-14  
**Status:** ⏳ PLANNED

---

## Pre-Implementation

- [ ] Read full fix plan: `docs/planning/fix-011-pem-content-storage.md`
- [ ] Review implementation summary: `docs/planning/FIX-011-IMPLEMENTATION-SUMMARY.md`
- [ ] Review orchestrator handoff: `docs/planning/FIX-011-ORCHESTRATOR-HANDOFF.md`
- [ ] Backup current `esesha.bin` (contains existing connections)
- [ ] Create git branch: `fix/011-pem-content-storage`

---

## Phase 1: Backend Data Model & Encryption (1-2 hours)

### Task 1.1: Add PrivateKeyContent field
- [ ] Open `internal/models/connection.go`
- [ ] Add `PrivateKeyContent []byte \`json:"privateKeyContent"\`` after `PrivateKeyPath`
- [ ] Add comment: `// Deprecated, kept for compatibility` on `PrivateKeyPath` line
- [ ] Save file
- [ ] Run: `go build ./internal/models`
- [ ] Verify: exit code 0

### Task 1.2: Verify db/store.go
- [ ] Open `internal/db/store.go`
- [ ] Verify JSON marshaling handles new `[]byte` field (read-only check)
- [ ] Run: `go build ./internal/db`
- [ ] Verify: exit code 0

### Task 1.3: Verify db/crypto.go
- [ ] Open `internal/db/crypto.go`
- [ ] Verify `crypto.Encrypt()` / `crypto.Decrypt()` exist and work with byte slices
- [ ] Run: `go test ./internal/db -run TestEncryptDecrypt`
- [ ] Verify: test passes

**Phase 1 Complete:** All tasks ✅

---

## Phase 2: SSH Client Layer (2-3 hours)

### Task 2.1: Update ssh/client.go
- [ ] Open `internal/ssh/client.go`
- [ ] Update `NewClientWithKeyPassphraseAndHostKey` signature (line ~71)
  - [ ] Add parameter: `privateKeyContent []byte`
- [ ] Update key reading logic (line ~74-82)
  - [ ] Add: `if privateKeyContent != nil && len(privateKeyContent) > 0 { key = privateKeyContent }`
  - [ ] Add: `else if privateKeyPath != "" { key, err = ioutil.ReadFile(privateKeyPath) }`
  - [ ] Add: `else { return nil, fmt.Errorf("no private key specified") }`
- [ ] Update `NewClientWithHostKeyCallback` (line ~22)
  - [ ] Pass `nil` for `privateKeyContent` parameter
- [ ] Update `NewClientWithKeyAndPassphrase` (line ~66)
  - [ ] Pass `nil` for `privateKeyContent` parameter
- [ ] Save file
- [ ] Run: `go build ./internal/ssh`
- [ ] Verify: exit code 0

### Task 2.2: Update ssh/manager.go
- [ ] Open `internal/ssh/manager.go`
- [ ] Update `ConnectWithPassphrase` signature (line ~59)
  - [ ] Add parameter: `privateKeyContent []byte`
- [ ] Update client constructor call (line ~72)
  - [ ] Change condition: `if privateKeyPath != "" || (privateKeyContent != nil && len(privateKeyContent) > 0)`
  - [ ] Pass `privateKeyContent` to `NewClientWithKeyPassphraseAndHostKey`
- [ ] Update `Connect` wrapper (line ~54)
  - [ ] Pass `nil` for `privateKeyContent` in call to `ConnectWithPassphrase`
- [ ] Save file
- [ ] Run: `go build ./internal/ssh`
- [ ] Verify: exit code 0

**Phase 2 Complete:** All tasks ✅

---

## Phase 3: Backend API Layer (3-4 hours)

### Task 3.1: Update SelectPrivateKeyFile (MUST COMPLETE FIRST)
- [ ] Open `app.go`
- [ ] Update function signature (line ~240)
  - [ ] Change: `func (a *App) SelectPrivateKeyFile() (string, []byte, error)`
- [ ] Add file reading after selection (line ~249)
  - [ ] Add: `content, err := os.ReadFile(filePath)`
  - [ ] Add: `if err != nil { return "", nil, fmt.Errorf("failed to read key file: %w", err) }`
  - [ ] Change return: `return filePath, content, nil`
- [ ] Handle empty selection: `return "", nil, nil`
- [ ] Save file
- [ ] Run: `go build .`
- [ ] Verify: exit code 0
- [ ] Run: `wails generate module` (regenerate bindings)
- [ ] Verify: no errors

### Task 3.2: Update CreateConnection
- [ ] Open `app.go`
- [ ] Update function signature (line ~126)
  - [ ] Add parameter: `privateKeyContent []byte`
- [ ] Add key content encryption (after password encryption, line ~135)
  - [ ] Add:
    ```go
    var encryptedKeyContent []byte
    if privateKeyContent != nil && len(privateKeyContent) > 0 {
        encrypted, err := crypto.Encrypt(privateKeyContent)
        if err != nil {
            return 0, fmt.Errorf("failed to encrypt private key: %w", err)
        }
        encryptedKeyContent = encrypted
    }
    ```
- [ ] Update `models.Connection` creation
  - [ ] Add: `PrivateKeyContent: encryptedKeyContent`
- [ ] Remove: `PrivateKeyPath: privateKeyPath` (no longer pass path)
- [ ] Save file
- [ ] Run: `go build .`
- [ ] Verify: exit code 0

### Task 3.3: Update UpdateConnection
- [ ] Open `app.go`
- [ ] Update function signature (line ~182)
  - [ ] Add parameter: `privateKeyContent []byte`
- [ ] Add key content encryption (after password encryption, line ~197)
  - [ ] Add:
    ```go
    if privateKeyContent != nil && len(privateKeyContent) > 0 {
        encrypted, err := crypto.Encrypt(privateKeyContent)
        if err != nil {
            return fmt.Errorf("failed to encrypt private key: %w", err)
        }
        conn.PrivateKeyContent = encrypted
    }
    ```
- [ ] Remove: `conn.PrivateKeyPath = privateKeyPath` (no longer update path)
- [ ] Save file
- [ ] Run: `go build .`
- [ ] Verify: exit code 0

### Task 3.4: Update ConnectSSHWithPassphrase
- [ ] Open `app.go`
- [ ] Add key content decryption (after password decryption, line ~289)
  - [ ] Add:
    ```go
    var privateKeyContent []byte
    if len(conn.PrivateKeyContent) > 0 {
        decrypted, err := crypto.Decrypt(conn.PrivateKeyContent)
        if err != nil {
            return "", fmt.Errorf("failed to decrypt private key: %w", err)
        }
        privateKeyContent = decrypted
    }
    ```
- [ ] Update `sshManager.ConnectWithPassphrase` call (line ~296)
  - [ ] Add parameter: `privateKeyContent`
- [ ] Save file
- [ ] Run: `go build .`
- [ ] Verify: exit code 0

### Task 3.5: Update ConvertPPKToPEM
- [ ] Open `app.go`
- [ ] Update function signature (line ~262)
  - [ ] Change: `func (a *App) ConvertPPKToPEM(ppkPath, pemPath, passphrase string) ([]byte, error)`
- [ ] Add PEM content reading (after conversion, line ~264)
  - [ ] Add:
    ```go
    content, err := os.ReadFile(pemPath)
    if err != nil {
        return nil, fmt.Errorf("failed to read converted PEM file: %w", err)
    }
    return content, nil
    ```
- [ ] Save file
- [ ] Run: `go build .`
- [ ] Verify: exit code 0

**Phase 3 Complete:** All tasks ✅

---

## Phase 4: Frontend Integration (2-3 hours)

### Task 4.1: Update wails.d.ts types
- [ ] Open `frontend/src/types/wails.d.ts`
- [ ] Update `SelectPrivateKeyFile` return type:
  - [ ] Change: `Promise<{path: string, content: string}>`
- [ ] Update `CreateConnection` signature:
  - [ ] Add parameter: `privateKeyContent: string`
- [ ] Update `UpdateConnection` signature:
  - [ ] Add parameter: `privateKeyContent: string`
- [ ] Update `ConvertPPKToPEM` return type:
  - [ ] Change: `Promise<string>` (returns base64 content)
- [ ] Save file
- [ ] Run: `tsc --noEmit`
- [ ] Verify: exit code 0

### Task 4.2: Update App.tsx API handling
- [ ] Open `frontend/src/components/App.tsx`
- [ ] Update `NewConnection` interface (line ~12)
  - [ ] Add: `privateKeyContent: string`
- [ ] Update initial state (line ~44, ~60)
  - [ ] Add: `privateKeyContent: ''`
- [ ] Update `selectPrivateKey` handler (line ~559)
  - [ ] Change: `const {path, content} = await SelectPrivateKeyFile()`
  - [ ] Update: `setNewConn({ ...newConn, privateKeyPath: path, privateKeyContent: content })`
- [ ] Update connection creation (line ~582)
  - [ ] Change: `const keyContent = authMethod === 'key' ? newConn.privateKeyContent : ''`
  - [ ] Pass `keyContent` to `CreateConnection`
- [ ] Update edit form state (line ~56)
  - [ ] Add: `privateKeyContent: ''`
- [ ] Update `selectEditPrivateKey` handler (line ~236)
  - [ ] Change: `const {path, content} = await SelectPrivateKeyFile()`
  - [ ] Update: `setEditFormData({...editFormData, privateKeyPath: path, privateKeyContent: content})`
- [ ] Save file
- [ ] Run: `tsc --noEmit`
- [ ] Verify: exit code 0

### Task 4.3: Update App.tsx UI display
- [ ] Open `frontend/src/components/App.tsx`
- [ ] Add imports (top of file):
  - [ ] Add: `import { Lock, FileKey } from 'lucide-react'`
- [ ] Update connection list display (line ~155)
  - [ ] Replace key path display with conditional:
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
- [ ] Open `frontend/src/components/App.module.css`
- [ ] Add styles (at end of file):
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
- [ ] Save files
- [ ] Run: `npm run build`
- [ ] Verify: build succeeds

### Task 4.4: Update PPKConverterDialog.tsx (Optional)
- [ ] Open `frontend/src/components/PPKConverterDialog.tsx`
- [ ] Check if "Add to connections" feature exists
- [ ] If yes, store `content` from `ConvertPPKToPEM` return value
- [ ] If no, skip this task (defer to future)
- [ ] Save file (if modified)

**Phase 4 Complete:** All tasks ✅

---

## Phase 5: Export/Import Enhancement (1-2 hours)

### Task 5.1: Update ExportJSON
- [ ] Open `internal/db/store.go`
- [ ] Add import: `"encoding/base64"` (top of file)
- [ ] Update `exportConnection` struct (line ~43)
  - [ ] Add field: `PrivateKeyContent string \`json:"privateKeyContent"\``
- [ ] Update export loop (line ~246)
  - [ ] Add key content decryption:
    ```go
    if len(conn.PrivateKeyContent) > 0 {
        decrypted, err := crypto.Decrypt(conn.PrivateKeyContent)
        if err != nil {
            log.Printf("Warning: failed to decrypt private key for connection %s: %v", conn.Name, err)
        } else {
            ec.PrivateKeyContent = base64.StdEncoding.EncodeToString(decrypted)
        }
    }
    ```
- [ ] Save file
- [ ] Run: `go build ./internal/db`
- [ ] Verify: exit code 0

### Task 5.2: Update ImportJSON
- [ ] Open `internal/db/store.go`
- [ ] Update import loop (line ~295)
  - [ ] Add key content encryption:
    ```go
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
    ```
- [ ] Save file
- [ ] Run: `go build ./internal/db`
- [ ] Verify: exit code 0

**Phase 5 Complete:** All tasks ✅

---

## Phase 6: Testing & Verification (2-3 hours)

### Task 6.1: Build verification
- [ ] Run: `go build .`
- [ ] Verify: exit code 0
- [ ] Run: `go test ./...`
- [ ] Verify: all tests pass
- [ ] Run: `npm run build`
- [ ] Verify: build succeeds
- [ ] Run: `tsc --noEmit`
- [ ] Verify: exit code 0
- [ ] Run: `wails build`
- [ ] Verify: `esesha.exe` created successfully

### Task 6.2: Test backward compatibility
- [ ] Copy existing `esesha.bin` with old connections
- [ ] Launch new build
- [ ] Open connection with `PrivateKeyPath` only
- [ ] Click "Connect"
- [ ] Verify: successful SSH authentication
- [ ] Check: `PrivateKeyContent` is empty/null in database

### Task 6.3: Test new connections
- [ ] Launch application
- [ ] Click "New Connection"
- [ ] Select "Private Key" auth method
- [ ] Click "Select Key File"
- [ ] Choose a PEM file
- [ ] Fill in connection details
- [ ] Click "Create"
- [ ] Verify: connection created
- [ ] Check UI: displays "🔐 Private key stored securely" (not path)
- [ ] Click "Connect"
- [ ] Verify: successful SSH authentication
- [ ] Check database: `PrivateKeyContent` has encrypted bytes

### Task 6.4: Test export/import
- [ ] Create connection with private key
- [ ] Click "File" → "Backup Connections..."
- [ ] Save backup JSON
- [ ] Open backup in text editor
- [ ] Verify: `"privateKeyContent": "base64string..."`
- [ ] Delete connection from application
- [ ] Click "File" → "Import Connections..."
- [ ] Select backup file
- [ ] Verify: connection restored
- [ ] Click "Connect"
- [ ] Verify: successful SSH authentication

### Task 6.5: Test PPK converter
- [ ] Click "Tools" → "PPK Formatter"
- [ ] Select PPK file
- [ ] Enter passphrase (if needed)
- [ ] Select output PEM path
- [ ] Click "Convert"
- [ ] Verify: PEM file created
- [ ] If auto-add exists: verify connection created with content
- [ ] If not: manually create connection with converted key
- [ ] Click "Connect"
- [ ] Verify: successful SSH authentication

### Task 6.6: Security review
- [ ] Open `esesha.bin` in hex editor
- [ ] Verify: `PrivateKeyContent` is encrypted (binary, not readable PEM)
- [ ] Launch app with debug logging
- [ ] Connect with private key
- [ ] Check logs: no plaintext PEM content logged
- [ ] Trigger error (wrong passphrase, invalid key)
- [ ] Check error message: no key material leaked
- [ ] Export backup JSON
- [ ] Check: key content is base64 (not binary)
- [ ] Import backup
- [ ] Check: key content re-encrypted properly

### Task 6.7: Acceptance criteria verification
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

**Phase 6 Complete:** All tests pass ✅

---

## Post-Implementation

### Documentation updates
- [ ] Update `docs/planning/changelog.md`
  - [ ] Move Fix-011 from "Planned" to "Fixed"
  - [ ] Mark as "COMPLETE ✅"
  - [ ] Add implementation date
- [ ] Create `docs/guides/private-key-storage.md`
  - [ ] Explain new content storage model
  - [ ] Document backward compatibility
  - [ ] Add FAQ section
- [ ] Update `docs/api/connection-management.md`
  - [ ] Document new `PrivateKeyContent` field
  - [ ] Document API signature changes
- [ ] Update `docs/database/schema.md`
  - [ ] Add `privateKeyContent` field specification
- [ ] Update `docs/guides/ppk-converter.md`
  - [ ] Mention keys stored securely, not as paths
- [ ] Update repository memory
  - [ ] Add Fix-011 completion entry to `/memories/repo/esesha-project-state.md`

### Cleanup
- [ ] Run: `go mod tidy`
- [ ] Run: `git status` (review all changes)
- [ ] Run: `git add .`
- [ ] Run: `git commit -m "Fix-011: Store private key content (not path)"`
- [ ] Run: `git push origin fix/011-pem-content-storage`
- [ ] Create pull request (if using PR workflow)

### Deployment
- [ ] Test on clean machine (no existing `esesha.bin`)
- [ ] Test with existing `esesha.bin` (backward compatibility)
- [ ] Create release notes
- [ ] Tag version (if applicable)
- [ ] Deploy to production

---

## Rollback Plan (If Issues Arise)

- [ ] Stop application
- [ ] Restore backup `esesha.bin`
- [ ] Checkout previous git commit: `git checkout main`
- [ ] Rebuild: `wails build`
- [ ] Launch old version
- [ ] Verify: old connections still work
- [ ] Report issue for investigation

---

## Completion Sign-Off

**Implementation completed by:** _________________  
**Date:** _________________  
**Verified by:** _________________  
**Date:** _________________  

**All acceptance criteria met:** ☐ Yes ☐ No  
**Backward compatibility verified:** ☐ Yes ☐ No  
**Security review passed:** ☐ Yes ☐ No  
**Documentation updated:** ☐ Yes ☐ No  

**Status:** ☐ COMPLETE ✅

---

## Version History

| Version | Date       | Summary                |
| ------- | ---------- | ---------------------- |
| 1.0.0   | 2026-08-14 | Initial checklist      |
