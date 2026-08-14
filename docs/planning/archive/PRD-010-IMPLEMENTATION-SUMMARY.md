# PRD-010: Embedded SSH Keys - Implementation Summary

**Quick Reference for Orchestrator**

---

## Overview

Embed SSH private key content directly into the `esesha.exe` binary instead of reading from external files. Keys encrypted at build time, decrypted at runtime using machine-bound key.

---

## Task Breakdown

### Phase 1: Build Infrastructure (5 tasks)
- **Agent:** Backend Developer
- **Files:** `scripts/build-keys.ps1` (NEW), `build-keys.json.example` (NEW), `.gitignore`, `build.bat`, `internal/keys/embedded.go.template` (NEW)
- **Effort:** 4-6 hours
- **Parallelizable:** No (foundation)

### Phase 2: Backend Key Store (5 tasks)
- **Agent:** Backend Developer
- **Files:** `internal/keys/store.go` (NEW), `internal/keys/store_test.go` (NEW), `internal/db/crypto.go`, `internal/models/connection.go`, `internal/db/store.go`
- **Effort:** 4-5 hours
- **Parallelizable:** No (depends on Phase 1)

### Phase 3: SSH Integration (5 tasks)
- **Agent:** Backend Developer
- **Files:** `internal/ssh/client.go`, `internal/ssh/manager.go`, `app.go`
- **Effort:** 3-4 hours
- **Parallelizable:** No (depends on Phase 2)

### Phase 4: Frontend UI (5 tasks)
- **Agent:** Frontend Developer
- **Files:** `frontend/src/components/App.tsx`, `frontend/src/components/App.module.css`, `frontend/src/types/wails.d.ts`, `frontend/wailsjs/go/main/App.{js,d.ts}`
- **Effort:** 3-4 hours
- **Parallelizable:** Yes (can run parallel with Phase 3 backend testing)

### Phase 5: Testing & Documentation (6 tasks)
- **Agents:** Debugger/Reviewer, Documentation
- **Files:** Tests, `docs/guides/embedded-ssh-keys.md` (NEW), `README.md`, `docs/planning/changelog.md`
- **Effort:** 4-5 hours
- **Parallelizable:** Partially (docs while tests run)

### Phase 6: Review & Security Audit (4 tasks)
- **Agents:** Debugger/Reviewer, Security
- **Effort:** 2-3 hours
- **Parallelizable:** No (final gate)

---

## Total Effort Estimate

**20-27 hours** (major feature, spans entire stack)

---

## Key Technical Points

### New Data Model
```go
type Connection struct {
    // ... existing fields ...
    PrivateKeyPath string  `json:"privateKeyPath"`    // Existing
    EmbeddedKeyID  *string `json:"embeddedKeyID"`     // NEW (nullable)
}
```

**Mutual exclusivity:** Either `PrivateKeyPath` OR `EmbeddedKeyID` set, not both.

### Build-Time Configuration
```json
// build-keys.json (NEW, .gitignore'd)
[
  {
    "id": "prod-server",
    "path": "C:/keys/prod.pem",
    "description": "Production server key"
  }
]
```

### Generated Code
```go
// internal/keys/embedded.go (generated, .gitignore'd)
var EmbeddedKeys = map[string]string{
    "prod-server": "RVNFU0hBMDEAAAAB...", // Base64 encrypted key
}

var EmbeddedKeyMetadata = map[string]string{
    "prod-server": "Production server key",
}
```

### Encryption
- **Algorithm:** AES-256-GCM (same as `esesha.bin`)
- **Key derivation:** Machine-bound (`SHA256(MachineGUID + "|" + exeDir)`)
- **Format:** Binary with magic header (`ESESHA01` + version + nonce + ciphertext + tag)
- **Encoding:** Base64 (safe for Go string literals)

---

## Frontend Changes

### New UI Elements
1. **Auth type radio:** Add "Embedded Key" option (conditionally shown)
2. **Dropdown:** Select from available embedded keys (shows descriptions)
3. **Validation:** Prevent selecting both file and embedded key

### API Methods
- `ListEmbeddedKeys()` → `map[string]string` (id → description)
- `CreateConnection(..., embeddedKeyID *string)` (new parameter)
- `UpdateConnection(..., embeddedKeyID *string)` (new parameter)

---

## Security Architecture

### ✅ Protected Against
- Casual binary inspection (`strings` command won't reveal keys)
- File system exposure (no separate `.pem` files)
- Accidental deletion (embedded in binary)
- Cross-machine copying (machine-bound key)

### ⚠️ NOT Protected Against
- System admin access (can derive machine key)
- Memory dumps (keys decrypted in RAM)
- Binary decompilation (skilled attackers)
- Malware running as same user

### Recommendations
- ❌ DO NOT use for production servers in untrusted environments
- ✅ DO use for personal automation scripts
- ✅ DO keep `build-keys.json` out of version control
- ✅ DO use file-based keys for high-security servers

---

## Backward Compatibility

**100% backward compatible:**
- Existing connections with `PrivateKeyPath` continue working
- New field `EmbeddedKeyID` is nullable (optional)
- Build without `build-keys.json` → empty embedded store (no keys)
- Frontend shows "Embedded Key" option only if keys available

---

## Testing Requirements

### Unit Tests (10+ total)
- `GetEmbeddedKey()`: valid key, missing key, decryption failure
- `ListEmbeddedKeys()`: empty store, populated store
- Connection validation: mutual exclusivity, both fields empty
- Build script: missing file, invalid JSON, bad permissions

### Integration Tests
- Full flow: build with keys → create connection → connect → session established
- Passphrase-protected embedded key → dialog appears
- Switch connection from file-based to embedded key

### Manual Tests (6 cases)
1. Build with 2 keys → verify both embedded
2. Connect with embedded key → success
3. Passphrase-protected key → dialog shown
4. Missing key ID → clear error
5. Edit connection → switch auth types
6. Backward compat → old file-based connections work

---

## Critical Files to .gitignore

```gitignore
# Add these lines
/internal/keys/embedded.go
/build-keys.json
```

**Why:** `embedded.go` is generated, `build-keys.json` contains real key paths (security risk if committed).

**Provide instead:** `build-keys.json.example` (git-tracked, no real keys).

---

## Build Process Integration

### Modified `build.bat`
```batch
REM Before wails build:
if exist build-keys.json (
    powershell -ExecutionPolicy Bypass -File scripts\build-keys.ps1
    if %errorlevel% neq 0 exit /b %errorlevel%
) else (
    copy internal\keys\embedded.go.template internal\keys\embedded.go
)

REM Then: wails build ...
```

### New Script: `scripts/build-keys.ps1`
1. Parse `build-keys.json`
2. Validate key files exist
3. Warn if permissions > 0600
4. Encrypt each key with machine-bound key
5. Generate `internal/keys/embedded.go`

---

## Risks & Mitigations

| Risk                          | Mitigation                                              |
| ----------------------------- | ------------------------------------------------------- |
| Keys committed to Git         | `.gitignore` + provide `.example` file only             |
| Weak machine-bound key        | Document security trade-offs, recommend file-based keys |
| Decryption fails after move   | Document exe must stay in same folder                   |
| Build script Windows-only     | Use standard PowerShell cmdlets (Win10/11 compatible)   |
| Binary size bloat             | Document size impact (~4KB per key, max 5 keys typical) |

---

## Rollback Strategy

**Time:** ~15 minutes  
**Data loss:** None (only `EmbeddedKeyID` field nullified)

**Steps:**
1. Revert `build.bat` (remove `build-keys.ps1` call)
2. Use template `embedded.go` (empty maps)
3. Hide "Embedded Key" UI option (CSS or feature flag)
4. Rebuild without embedded keys
5. Users manually switch connections back to file-based keys

---

## Acceptance Criteria Checklist

See full PRD for 20+ detailed acceptance criteria. Key highlights:

- [ ] Connection profile supports `EmbeddedKeyID` field (nullable, mutually exclusive with `PrivateKeyPath`)
- [ ] Multiple keys embeddable with unique IDs
- [ ] Keys encrypted with machine-bound key (AES-256-GCM)
- [ ] Build script generates valid Go source from `build-keys.json`
- [ ] Frontend shows "Embedded Key" dropdown when keys available
- [ ] Passphrase-protected keys still prompt at connection time
- [ ] No plaintext keys in `strings esesha.exe` output
- [ ] Backward compatibility: file-based keys still work
- [ ] Build succeeds with or without `build-keys.json`
- [ ] Clear error messages for missing keys, decryption failures

---

## Documentation Deliverables

1. **User guide:** `docs/guides/embedded-ssh-keys.md`
   - How to configure `build-keys.json`
   - Build process walkthrough
   - Security considerations
   - Troubleshooting

2. **Changelog:** `docs/planning/changelog.md`
   - PRD-010 entry with feature summary

3. **README updates:**
   - Features list: mention embedded keys
   - Build instructions: reference `build-keys.json.example`

---

## Dependencies

**Go packages (existing):**
- `golang.org/x/crypto/ssh` (SSH protocol)
- `crypto/aes`, `crypto/cipher` (AES-256-GCM)
- `crypto/sha256` (key derivation)
- `encoding/base64` (key encoding)

**No new external dependencies.**

---

## Estimated Timeline

| Phase                          | Duration  | Can Start After |
| ------------------------------ | --------- | --------------- |
| Phase 1: Build Infrastructure  | 4-6h      | Immediate       |
| Phase 2: Backend Key Store     | 4-5h      | Phase 1         |
| Phase 3: SSH Integration       | 3-4h      | Phase 2         |
| Phase 4: Frontend UI           | 3-4h      | Phase 3 (or parallel with Phase 3 testing) |
| Phase 5: Testing & Docs        | 4-5h      | Phases 3+4      |
| Phase 6: Review & Security     | 2-3h      | Phase 5         |

**Total:** 20-27 hours (3-4 days for single developer)

---

**END OF SUMMARY**
