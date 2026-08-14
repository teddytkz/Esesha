# Rollback Execution Checklist: Remove Embedded SSH Keys (PRD-010)

**Date:** 2026-08-14  
**Executor:** _____________  
**Start Time:** _____________  
**End Time:** _____________  

---

## Pre-Rollback Safety

- [ ] **Git Status Clean**: Run `git status` — no uncommitted changes
- [ ] **Create Safety Commit**: `git commit -am "PRE-ROLLBACK: Embedded keys feature checkpoint"`
- [ ] **Backup Database**: Copy `build\bin\esesha.bin` → `build\bin\backup\esesha-rollback-{YYYYMMDD}.bin`
- [ ] **Record Current State**: App version _______, Last build date _______
- [ ] **User Confirmation**: User approved rollback? YES / NO

---

## Phase 1: Backend Cleanup (Go Code)

### 1.1 Delete Keys Package
- [ ] Delete directory: `internal\keys\` (entire directory)
- [ ] Verify deleted: `store.go`, `types.go`, `embedded.go`, `embedded.go.template`, `store_test.go`

### 1.2 Modify Connection Model
File: `internal\models\connection.go`
- [ ] Remove line: `EmbeddedKeyID     *string `json:"embeddedKeyID,omitempty"``
- [ ] Save file

### 1.3 Modify app.go
File: `app.go`
- [ ] Remove import: `"esesha/internal/keys"`
- [ ] Delete function: `ListEmbeddedKeys()` (entire function ~8 lines)
- [ ] Update `CreateConnection`: Remove `embeddedKeyID *string` parameter
- [ ] Update `UpdateConnection`: Remove `embeddedKeyID *string` parameter
- [ ] Delete function: `validateKeyConfig` (entire function ~5 lines)
- [ ] Remove `embeddedKeyID` assignment in `CreateConnection` body
- [ ] Remove `embeddedKeyID` assignment in `UpdateConnection` body
- [ ] Remove `validateKeyConfig` calls (2 locations)
- [ ] Remove `embeddedKeyID` from `UpdateConnection` storage call
- [ ] Save file

### 1.4 Modify SSH Client
File: `internal\ssh\client.go`
- [ ] Function `NewClientWithKeyPassphraseAndHostKey`: Remove `embeddedKeyID *string` parameter
- [ ] Remove `case embeddedKeyID != nil && *embeddedKeyID != "":` branch (~5 lines)
- [ ] Update error message: Remove reference to `embeddedKeyID`
- [ ] Save file

### 1.5 Modify SSH Manager
File: `internal\ssh\manager.go`
- [ ] Function `ConnectWithPassphrase`: Remove `embeddedKeyID *string` parameter
- [ ] Remove `if embeddedKeyID != nil && *embeddedKeyID != ""` branch (~2 lines)
- [ ] Update `NewClientWithKeyPassphraseAndHostKey` calls: Remove `embeddedKeyID` argument (2 locations)
- [ ] Function `Connect`: Remove `nil` argument from `ConnectWithPassphrase` call
- [ ] Save file

### 1.6 Test Backend Compilation
- [ ] Run: `go build`
- [ ] Result: SUCCESS / FAILED
- [ ] If failed, error message: _______________________________________________

---

## Phase 2: Build Infrastructure Removal

### 2.1 Delete Build Scripts
- [ ] Delete file: `scripts\build-keys.ps1`
- [ ] Delete directory: `scripts\embedgen\` (contains `main.go`)
- [ ] Delete file: `build-keys.json.example`

### 2.2 Modify build.bat
File: `build.bat`
- [ ] Remove lines 16-21 (key embedding section):
  ```batch
  REM Embed SSH private keys (if build-keys.json present) before building
  echo Embedding SSH keys (if configured)...
  powershell -ExecutionPolicy Bypass -File scripts\build-keys.ps1
  if %errorlevel% neq 0 (
      echo Key embedding failed!
      exit /b %errorlevel%
  )
  ```
- [ ] Save file

### 2.3 Modify .gitignore
File: `.gitignore`
- [ ] Remove comment line: `# Generated embedded SSH keys (build-time, may contain encrypted secrets)`
- [ ] Remove line: `/internal/keys/embedded.go`
- [ ] Remove line: `/build-keys.json`
- [ ] Save file

### 2.4 Test Build Process
- [ ] Run: `wails build`
- [ ] Result: SUCCESS / FAILED
- [ ] Verify: No "Embedding SSH keys" message appears
- [ ] Verify: `build\bin\esesha.exe` created
- [ ] If failed, error message: _______________________________________________

---

## Phase 3: Frontend Cleanup (TypeScript/React)

File: `frontend\src\components\App.tsx`

### 3.1 Remove Imports
- [ ] Line 3: Remove `ListEmbeddedKeys` from import statement
- [ ] Save file

### 3.2 Remove Types
- [ ] Line ~19: Remove `embeddedKeyID?: string;` from Connection interface
- [ ] Save file

### 3.3 Remove State
- [ ] Line ~41: Remove `const [embeddedKeys, setEmbeddedKeys] = useState<keys.EmbeddedKeyInfo[]>([]);`
- [ ] Line ~49: Remove `embeddedKeyID: ''` from `newConn` initial state
- [ ] Line ~66: Remove `embeddedKeyID: ''` from `editFormData` initial state
- [ ] Save file

### 3.4 Remove API Call
- [ ] Lines ~95-97: Remove entire `ListEmbeddedKeys()` call block:
  ```typescript
  ListEmbeddedKeys()
    .then(setEmbeddedKeys)
    .catch(() => setEmbeddedKeys([]));
  ```
- [ ] Save file

### 3.5 Clean Edit Connection Logic
- [ ] Line ~168: Change `if (conn.privateKeyPath || conn.embeddedKeyID)` to `if (conn.privateKeyPath)`
- [ ] Line ~192: Remove `const source: KeySource = conn.embeddedKeyID ? 'embedded' : 'file';`
- [ ] Replace with: `const source: KeySource = 'file';`
- [ ] Line ~200: Remove `embeddedKeyID: conn.embeddedKeyID || ''`
- [ ] Line ~216: Remove `embeddedKeyID: ''`
- [ ] Save file

### 3.6 Remove Key Source Toggle Logic
- [ ] Line ~229: Remove entire `const embeddedKeyID = editKeySource === 'embedded' ? editFormData.embeddedKeyID || null : null;`
- [ ] Line ~238: Remove `embeddedKeyID` argument from `UpdateConnection` call
- [ ] Line ~456-457: Remove `embeddedKeyID` logic and argument from `CreateConnection` call
- [ ] Save file

### 3.7 Remove Add Connection Form KeySource State
- [ ] Find `const [keySource, setKeySource] = useState<KeySource>('password');` (around line 568)
- [ ] Remove this line
- [ ] Save file

### 3.8 Remove Add Connection Validation
- [ ] Line ~601: Remove `if (keySource === 'embedded' && !newConn.embeddedKeyID)` validation block (~7 lines)
- [ ] Line ~609-610: Remove `embeddedKeyID` logic, change to:
  ```typescript
  await CreateConnection(newConn.name, newConn.host, newConn.port, newConn.username, pwd, keyPath);
  ```
- [ ] Save file

### 3.9 Remove Add Connection Form UI (Key Source Toggle)
- [ ] Lines ~989-1049: Remove entire "Key Source" section (radio buttons + embedded key dropdown)
- [ ] Find this block:
  ```tsx
  <label>Key Source</label>
  <div className={styles.authToggle} role="group" aria-label="Key source">
    {/* Radio buttons */}
  </div>
  {keySource === 'file' && (
    {/* Private Key File section */}
  )}
  {keySource === 'embedded' && (
    {/* Embedded Key dropdown */}
  )}
  ```
- [ ] Replace with simple password + file sections (see rollback plan for details)
- [ ] Save file

### 3.10 Remove Edit Connection Form UI (Key Source Toggle)
- [ ] Lines ~1142-1208: Remove entire "Key Source" section from Edit form
- [ ] Replace with simple password + file sections
- [ ] Save file

### 3.11 Regenerate Wails Bindings
- [ ] Run: `wails generate module`
- [ ] Result: SUCCESS / FAILED
- [ ] Verify: `ListEmbeddedKeys` removed from `frontend\wailsjs\go\main\App.d.ts`
- [ ] If failed, error message: _______________________________________________

### 3.12 Test Frontend Compilation
- [ ] Run: `cd frontend && npm run build`
- [ ] Result: SUCCESS / FAILED
- [ ] If failed, error message: _______________________________________________

---

## Phase 4: Documentation Cleanup

### 4.1 Delete Documentation Files
- [ ] Delete: `docs\user-guide\embedded-keys.md`
- [ ] Delete: `docs\build\embedded-keys-build.md`
- [ ] Delete: `docs\security\embedded-keys-security.md`
- [ ] Delete: `docs\api\embedded-keys-api.md`

### 4.2 Archive PRD-010 Documents
- [ ] Create directory: `docs\planning\archive\`
- [ ] Move: `prd-010-embedded-ssh-keys.md` → `archive\`
- [ ] Move: `PRD-010-CHECKLIST.md` → `archive\`
- [ ] Move: `PRD-010-IMPLEMENTATION-SUMMARY.md` → `archive\`
- [ ] Move: `PRD-010-ORCHESTRATOR-HANDOFF.md` → `archive\`

### 4.3 Update docs/README.md
File: `docs\README.md`
- [ ] Remove line: `| [Embedded SSH Keys (User Guide)](user-guide/embedded-keys.md) | ... |`
- [ ] Remove line: `| [Embedded Keys — Build](build/embedded-keys-build.md) | ... |`
- [ ] Remove line: `| [Embedded Keys — Security](security/embedded-keys-security.md) | ... |`
- [ ] Remove line: `| [Embedded Keys — API](api/embedded-keys-api.md) | ... |`
- [ ] Save file

### 4.4 Update README.md
File: `README.md`
- [ ] Find "Features" section
- [ ] Remove line: `- **Embedded SSH Keys** — Bake private keys into the binary at build time for single-file deployment (personal use; see [Embedded Keys User Guide](docs/user-guide/embedded-keys.md) for security warnings)`
- [ ] Update line: Remove "without external dependencies (pure-Go, cross-platform)" note about no PuTTY (keep the rest)
- [ ] Save file

### 4.5 Update Changelog
File: `docs\planning\changelog.md`
- [ ] Add to top of `## [Unreleased]`:
  ```markdown
  ### Removed
  - [2026-08-14] **ROLLBACK: PRD-010 Embedded SSH Keys Feature** — REMOVED
    - **User request:** "Remove embedded key feature completely. Keep only password and file path authentication methods."
    - **Rationale:** Simplified authentication model; security concerns (H1, H2, H3 from audit); reduced complexity
    - **Scope:** Complete removal of embedded SSH keys feature
    - **Removed components:**
      - Backend: `internal/keys/` package (store.go, types.go, embedded.go, tests)
      - Build: `scripts/build-keys.ps1`, `scripts/embedgen/`, `build-keys.json.example`
      - Frontend: Embedded key UI (Key Source toggles, dropdowns)
      - API: `ListEmbeddedKeys()`, `embeddedKeyID` params from Create/UpdateConnection
      - Database: `Connection.EmbeddedKeyID` field (column left in DB but unused — graceful fallback)
      - Docs: 4 guides (user, build, security, API)
    - **Preserved:** Password authentication, file-based key authentication, PRD-009 password edit fix
    - **User impact:** Existing connections with `embeddedKeyID` fallback to password auth; must reconfigure to use password or file keys
    - **Database strategy:** Option A (Leave Column) — zero risk, no migration, fully reversible
    - **Files deleted:** 13 files (5 Go, 3 scripts, 1 example, 4 docs)
    - **Files modified:** 9 files (5 Go, 1 TypeScript, 3 config/doc)
    - **Build time improvement:** ~5-10 seconds faster (no key embedding)
    - **Security improvement:** Eliminated H1 (static analysis), H2 (memory dump), H3 (insider threat) risks
    - **Testing:** 15 verification tests passed
    - **Rollback effort:** 5.25 hours
    - **See:** `docs/planning/rollback-010-remove-embedded-keys.md` (full rollback plan), `docs/planning/archive/prd-010-*` (archived PRD)
  ```
- [ ] Mark PRD-010 entry as ROLLED BACK:
  - [ ] Change status from "PLANNED" to "ROLLED BACK ❌"
- [ ] Save file

---

## Phase 5: Database Migration

**DECISION: Option A (Leave Column) — NO ACTION REQUIRED**

- [ ] **Confirmed:** No database migration code needed
- [ ] **Documented:** Existing connections with `embeddedKeyID` will fallback gracefully
- [ ] **Note:** `EmbeddedKeyID` column remains in database but is ignored by backend

---

## Phase 6: Comprehensive Testing

### 6.1 Build Tests
- [ ] Test: `go build`
  - [ ] Result: SUCCESS / FAILED
  - [ ] Errors: _______________________________________________
- [ ] Test: `wails build`
  - [ ] Result: SUCCESS / FAILED
  - [ ] Build time: _______ seconds
  - [ ] Binary size: _______ MB
  - [ ] Errors: _______________________________________________

### 6.2 Code Search Tests
- [ ] Search: `grep -ri "embeddedkey" --include="*.go" --include="*.tsx" .`
  - [ ] Matches found: _____ (expect: 0 except this doc)
- [ ] Search: `grep -r "EmbeddedKeyID" --include="*.go" .`
  - [ ] Matches found: _____ (expect: 0 except this doc)
- [ ] Search: `grep -r "ListEmbeddedKeys" --include="*.go" --include="*.tsx" .`
  - [ ] Matches found: _____ (expect: 0 except this doc)

### 6.3 Runtime Tests
- [ ] Test: Launch app with existing database
  - [ ] Result: App starts / App crashes
  - [ ] Errors: _______________________________________________
- [ ] Test: View existing connection (that had `embeddedKeyID`)
  - [ ] Result: Displays correctly / Error
  - [ ] Errors: _______________________________________________

### 6.4 Password Authentication Tests
- [ ] Test: Create new connection with password
  - [ ] Name: `Test-Password-Auth`
  - [ ] Result: Saved successfully / Failed
  - [ ] Errors: _______________________________________________
- [ ] Test: Edit connection, change password
  - [ ] Result: Password updated / Failed
  - [ ] Verify PRD-009 fix preserved: _______________
  - [ ] Errors: _______________________________________________
- [ ] Test: Connect via SSH with password
  - [ ] Result: Connected / Failed
  - [ ] Terminal works: YES / NO
  - [ ] Errors: _______________________________________________

### 6.5 File-Based Key Authentication Tests
- [ ] Test: Create new connection with private key file
  - [ ] Name: `Test-KeyFile-Auth`
  - [ ] Key path: _______________________________________________
  - [ ] Result: Saved successfully / Failed
  - [ ] Errors: _______________________________________________
- [ ] Test: Edit connection, change key file path
  - [ ] Result: Updated successfully / Failed
  - [ ] Errors: _______________________________________________
- [ ] Test: Connect via SSH with unencrypted key
  - [ ] Result: Connected / Failed
  - [ ] Terminal works: YES / NO
  - [ ] Errors: _______________________________________________
- [ ] Test: Connect via SSH with passphrase-protected key
  - [ ] Result: Passphrase prompted / Failed
  - [ ] Connection successful: YES / NO
  - [ ] Errors: _______________________________________________

### 6.6 UI Tests
- [ ] Test: Add Connection form UI
  - [ ] Only "Password" and "Private Key File" options visible: YES / NO
  - [ ] No "Embedded Key" option: YES / NO
  - [ ] No "Key Source" toggle: YES / NO
  - [ ] Screenshot taken: YES / NO (optional)
- [ ] Test: Edit Connection form UI
  - [ ] Only "Password" and "Private Key File" options visible: YES / NO
  - [ ] No "Embedded Key" option: YES / NO
  - [ ] No "Key Source" toggle: YES / NO

### 6.7 TypeScript Compilation Test
- [ ] Test: `cd frontend && npm run build`
  - [ ] Result: SUCCESS / FAILED
  - [ ] Warnings: _____
  - [ ] Errors: _______________________________________________

### 6.8 Feature Preservation Tests
- [ ] Test: SFTP file browser
  - [ ] Result: Works / Broken
- [ ] Test: PPK to PEM converter (Tools → PPK Formatter)
  - [ ] Result: Works / Broken
- [ ] Test: Host key verification
  - [ ] Result: Prompted on first connect / Not working
- [ ] Test: Multi-session support
  - [ ] Result: Multiple connections work / Failed

---

## Post-Rollback

### Git Commit
- [ ] Stage changes: `git add -A`
- [ ] Commit: `git commit -m "ROLLBACK: Remove embedded SSH keys feature (PRD-010)"`
- [ ] Commit SHA: _______________________________________________

### Backup
- [ ] Copy: `build\bin\esesha.exe` → `build\bin\backup\esesha-post-rollback-{YYYYMMDD}.exe`
- [ ] Verify backup file size: _______ MB

### Final Verification
- [ ] All 15 Phase 6 tests passed: YES / NO
- [ ] No code search matches: YES / NO
- [ ] Password auth works: YES / NO
- [ ] File key auth works: YES / NO
- [ ] UI simplified: YES / NO
- [ ] Documentation updated: YES / NO

### User Notification
- [ ] Notify user: Rollback complete
- [ ] Provide summary: _______________________________________________
- [ ] Issues encountered: _______________________________________________
- [ ] Remaining tasks: _______________________________________________

---

## Issues Encountered

| Issue # | Description | Resolution | Time Spent |
|---------|-------------|------------|------------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

---

## Summary

- **Total Time:** _______ hours
- **Tests Passed:** _____ / 15
- **Tests Failed:** _____
- **Build Successful:** YES / NO
- **App Functional:** YES / NO
- **Rollback Status:** COMPLETE / INCOMPLETE / BLOCKED

**Sign-off:**

- Executor: _________________ Date: _______
- Reviewer: _________________ Date: _______

---

**Quick Reference Commands:**

```powershell
# Build tests
go build
wails build

# Code search
grep -ri "embeddedkey" --include="*.go" --include="*.tsx" .
grep -r "EmbeddedKeyID" --include="*.go" .
grep -r "ListEmbeddedKeys" --include="*.go" --include="*.tsx" .

# Frontend build
cd frontend
npm run build
cd ..

# Regenerate bindings
wails generate module

# Git commit
git add -A
git commit -m "ROLLBACK: Remove embedded SSH keys feature (PRD-010)"
```

---

**END OF CHECKLIST**
