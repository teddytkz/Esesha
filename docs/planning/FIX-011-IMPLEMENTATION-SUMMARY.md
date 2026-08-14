# Fix-011 Implementation Summary

**Quick Reference for Orchestrator**

---

## Overview

**Fix ID:** FIX-011  
**Title:** Store Private Key Content (Not Path)  
**Type:** Bug Fix / Architectural Improvement  
**Severity:** Medium  
**Status:** Planned (awaiting implementation)

---

## Problem Statement

Current implementation stores SSH private key **file paths** instead of **key content**:
- Not portable (breaks if file moved/deleted)
- Export/import broken (paths don't exist on other machines)
- Inconsistent with password storage (passwords encrypted and stored, keys are not)

---

## Solution Overview

Add `PrivateKeyContent []byte` field to store encrypted PEM content in database.
Keep `PrivateKeyPath string` for backward compatibility.
Prefer content over path when both exist.

---

## Implementation Phases

### Phase 1: Backend Data Model & Encryption ✅ Parallelizable
- Add `PrivateKeyContent []byte` to `Connection` model
- Verify existing crypto functions work with PEM content
- **Agent:** Backend Developer
- **Files:** `internal/models/connection.go`, `internal/db/crypto.go`
- **Effort:** 1-2 hours

### Phase 2: SSH Client Layer (Read PEM Content)
- Update SSH client to check `PrivateKeyContent` first, fallback to path
- Pass both parameters through manager layer
- **Agent:** Backend Developer
- **Files:** `internal/ssh/client.go`, `internal/ssh/manager.go`
- **Effort:** 2-3 hours
- **Depends on:** Phase 1

### Phase 3: Backend API Layer (Store PEM Content)
- Update `SelectPrivateKeyFile` to return path + content
- Update `CreateConnection` / `UpdateConnection` to encrypt content
- Update `ConnectSSHWithPassphrase` to pass content to SSH manager
- Update `ConvertPPKToPEM` to read and return PEM content
- **Agent:** Backend Developer
- **Files:** `app.go` (5 methods)
- **Effort:** 3-4 hours
- **Depends on:** Phase 2
- **Parallelizable:** Task 3.1 first, then 3.2-3.5 parallel

### Phase 4: Frontend Integration
- Update TypeScript types for new API signatures
- Handle `SelectPrivateKeyFile` returning `{path, content}`
- Display "Private key stored securely" instead of path
- **Agent:** Frontend Developer
- **Files:** `frontend/src/components/App.tsx`, `frontend/src/types/wails.d.ts`, `frontend/src/components/PPKConverterDialog.tsx`
- **Effort:** 2-3 hours
- **Depends on:** Phase 3

### Phase 5: Export/Import Enhancement ✅ Parallelizable
- Update `ExportJSON` to include decrypted key content (base64)
- Update `ImportJSON` to encrypt and store key content
- **Agent:** Backend Developer
- **Files:** `internal/db/store.go`
- **Effort:** 1-2 hours
- **Depends on:** Phase 3

### Phase 6: Testing & Verification (Review Phase)
- Verify all acceptance criteria
- Test backward compatibility (old `PrivateKeyPath` connections)
- Test new connections (key content stored)
- Test export/import (key content preserved)
- Security review (encryption, no plaintext in logs)
- **Agent:** Debugger/Reviewer
- **Effort:** 2-3 hours
- **Depends on:** All phases

---

## Total Estimated Effort

**8-12 hours** (1-2 days single developer)

---

## Key Files Modified

### Backend (Go)
- `internal/models/connection.go` — Add `PrivateKeyContent []byte` field
- `internal/ssh/client.go` — Prefer content over path
- `internal/ssh/manager.go` — Pass content parameter
- `app.go` — Update 5 methods (SelectPrivateKeyFile, CreateConnection, UpdateConnection, ConnectSSHWithPassphrase, ConvertPPKToPEM)
- `internal/db/store.go` — Update ExportJSON/ImportJSON

### Frontend (TypeScript/React)
- `frontend/src/types/wails.d.ts` — Update API signatures
- `frontend/src/components/App.tsx` — Handle new API, display "Key stored securely"
- `frontend/src/components/PPKConverterDialog.tsx` — Optional: store content after conversion

---

## Backward Compatibility

✅ **Fully backward compatible**
- Existing connections with `PrivateKeyPath` continue working
- SSH client checks `PrivateKeyContent` first, falls back to path
- No migration required (opportunistic migration on next connect)

---

## Acceptance Criteria (12 items)

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

## Security Model

- **Encryption:** AES-256-GCM with machine-bound key (same as passwords)
- **Storage:** Double encryption (encrypted content in encrypted `esesha.bin`)
- **Memory:** Decrypted only during connection, same as current password handling
- **Logging:** Never log decrypted key content, only metadata

---

## Rollback Strategy

**Risk: Low** (backward compatibility built-in)

If issues arise:
1. Revert `PrivateKeyContent` field addition
2. Revert API changes in `app.go`
3. Revert SSH client signature changes
4. Old connections with `PrivateKeyPath` unaffected
5. New connections lose key data (must re-select file)

**Recommendation:** Export backup before deployment

---

## Agent Routing

| Phase   | Agent              | Parallelizable | Depends On         |
| ------- | ------------------ | -------------- | ------------------ |
| Phase 1 | Backend Developer  | Yes (all tasks) | Nothing            |
| Phase 2 | Backend Developer  | No             | Phase 1            |
| Phase 3 | Backend Developer  | Partial (see plan) | Phase 2         |
| Phase 4 | Frontend Developer | No             | Phase 3            |
| Phase 5 | Backend Developer  | Yes (2 tasks)  | Phase 3            |
| Phase 6 | Debugger/Reviewer  | No             | All phases         |

---

## Documentation

- **Plan:** `docs/planning/fix-011-pem-content-storage.md` (full fix plan, 500+ lines)
- **Summary:** `docs/planning/FIX-011-IMPLEMENTATION-SUMMARY.md` (this file)
- **Changelog:** Update `docs/planning/changelog.md` when complete

---

## Related PRDs

- **PRD-009:** Pure Go PPK Parser (converter creates PEM files)
- **PRD-007:** Machine-Bound Keyless Encryption (encryption mechanism)
- **ROLLBACK-010:** Removed embedded keys (reverted to password + file-based keys)

---

## Notes for Orchestrator

1. **Start with Phase 1** (low risk, foundation for other phases)
2. **Phase 3 Task 3.1 must complete first** (other tasks depend on new signature)
3. **Phase 5 can run in parallel with Phase 4** (different teams)
4. **Always end with Phase 6** (Debugger/Reviewer verification)
5. **No database migration needed** (JSON field addition only)
6. **Frontend changes are minimal** (type updates + conditional rendering)

---

## Version History

| Version | Date       | Summary                   |
| ------- | ---------- | ------------------------- |
| 1.0.0   | 2026-08-14 | Initial implementation summary |
