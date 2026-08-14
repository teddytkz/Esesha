# Rollback Plan: Remove Embedded SSH Keys Feature (PRD-010)

**Version:** v1.0.0  
**Status:** Draft  
**Author:** Planner Agent  
**Created:** 2026-08-14  
**Updated:** 2026-08-14  

---

## Overview

Complete removal of the Embedded SSH Keys feature (PRD-010) from the Esesha codebase. User has requested to keep only password and file path authentication methods, eliminating the embedded key functionality entirely.

**Rationale:**
- User only needs password + file path authentication
- Embedded keys introduce security concerns (H1, H2, H3 from security audit)
- Reduces codebase complexity
- Simplifies user experience

---

## What Was Implemented in PRD-010

### Build Infrastructure
- `scripts/build-keys.ps1` — PowerShell script for encrypting/embedding keys
- `scripts/embedgen/main.go` — Go code generator for embedded keys
- `build-keys.json.example` — Template for build-time key configuration
- `build.bat` integration — calls `build-keys.ps1` before `wails build`

### Backend
- `internal/keys/` package (entire directory):
  - `store.go` — Key retrieval and decryption logic
  - `types.go` — `EmbeddedKeyInfo` type definition
  - `embedded.go` — Generated at build time (encrypted key data)
  - `embedded.go.template` — Template for code generation
  - `store_test.go` — Unit tests
- `internal/models/connection.go` — Added `EmbeddedKeyID *string` field
- `internal/ssh/client.go` — Embedded key loading in `NewClientWithKeyPassphraseAndHostKey`
- `internal/ssh/manager.go` — Embedded key support in `ConnectWithPassphrase`
- `internal/db/crypto.go` — Exported `EncryptData`/`DecryptData` for key encryption
- `app.go` — Added `ListEmbeddedKeys()`, updated `CreateConnection`/`UpdateConnection` with `embeddedKeyID` parameter

### Frontend
- `frontend/src/components/App.tsx`:
  - "Key Source" toggle (Password / Private Key File / Embedded Key)
  - Embedded keys state management
  - `ListEmbeddedKeys` API call
  - Embedded key dropdown in Add/Edit connection forms
  - Validation logic for embedded keys
- `frontend/wailsjs/go/main/App.d.ts` — Generated TypeScript bindings for `ListEmbeddedKeys`

### Documentation
- `docs/user-guide/embedded-keys.md` — User-facing guide
- `docs/build/embedded-keys-build.md` — Build process documentation
- `docs/security/embedded-keys-security.md` — Security audit and threat model
- `docs/api/embedded-keys-api.md` — API reference
- `docs/planning/prd-010-embedded-ssh-keys.md` — Full PRD
- `docs/planning/PRD-010-CHECKLIST.md` — Implementation checklist
- `docs/planning/PRD-010-IMPLEMENTATION-SUMMARY.md` — Summary
- `docs/planning/PRD-010-ORCHESTRATOR-HANDOFF.md` — Orchestrator handoff

### Configuration
- `.gitignore` — Added entries for `internal/keys/embedded.go` and `build-keys.json`
- `README.md` — Added embedded keys to feature list
- `docs/README.md` — Added embedded keys documentation links
- `docs/planning/changelog.md` — PRD-010 entry

---

## Rollback Strategy

### Phase 1: Backend Cleanup (Core Logic Removal)

**Priority:** HIGH — Remove core embedded key logic first to prevent usage

| Task | Action | Files | Risk |
|------|--------|-------|------|
| 1.1 | Delete entire `internal/keys/` package | `internal/keys/` (directory) | Low — isolated package |
| 1.2 | Remove `EmbeddedKeyID` field from Connection model | `internal/models/connection.go` | Medium — existing connections may have this field populated |
| 1.3 | Remove `embeddedKeyID` parameter from `CreateConnection` | `app.go` | Low — frontend will be updated in Phase 2 |
| 1.4 | Remove `embeddedKeyID` parameter from `UpdateConnection` | `app.go` | Low — frontend will be updated in Phase 2 |
| 1.5 | Remove `ListEmbeddedKeys` method entirely | `app.go` | Low — frontend will be updated in Phase 2 |
| 1.6 | Remove `validateKeyConfig` function (checks embeddedKeyID) | `app.go` | Low — only used for embedded key validation |
| 1.7 | Remove embedded key logic from SSH client | `internal/ssh/client.go` | Low — fallback to file-based keys |
| 1.8 | Remove embedded key logic from SSH manager | `internal/ssh/manager.go` | Low — fallback to file-based keys |
| 1.9 | Remove key imports from `app.go` | `app.go` | Low — cleanup only |

**Files to modify in Phase 1:**
- `internal/models/connection.go` — Remove `EmbeddedKeyID *string` field
- `app.go` — Remove `ListEmbeddedKeys()`, remove `embeddedKeyID` param from `CreateConnection`/`UpdateConnection`, remove `validateKeyConfig`, remove `"esesha/internal/keys"` import
- `internal/ssh/client.go` — Remove `embeddedKeyID` parameter from `NewClientWithKeyPassphraseAndHostKey`, remove embedded key loading branch
- `internal/ssh/manager.go` — Remove `embeddedKeyID` parameter from `ConnectWithPassphrase`, remove embedded key loading branch

**Files to delete in Phase 1:**
- `internal/keys/` (entire directory: `store.go`, `types.go`, `embedded.go`, `embedded.go.template`, `store_test.go`)

---

### Phase 2: Build Infrastructure Removal

**Priority:** HIGH — Remove build-time embedding infrastructure

| Task | Action | Files | Risk |
|------|--------|-------|------|
| 2.1 | Delete PowerShell build script | `scripts/build-keys.ps1` | Low — not referenced after build.bat change |
| 2.2 | Delete embedgen code generator | `scripts/embedgen/` (directory) | Low — not referenced after build.bat change |
| 2.3 | Delete build-keys example config | `build-keys.json.example` | Low — documentation artifact |
| 2.4 | Revert `build.bat` to remove key embedding step | `build.bat` | Low — remove 3 lines calling build-keys.ps1 |
| 2.5 | Clean `.gitignore` entries | `.gitignore` | Low — remove 3 lines related to embedded keys |

**Files to delete in Phase 2:**
- `scripts/build-keys.ps1`
- `scripts/embedgen/` (entire directory: `main.go`)
- `build-keys.json.example`

**Files to modify in Phase 2:**
- `build.bat` — Remove lines 16-21 (key embedding step)
- `.gitignore` — Remove lines 7-9 (embedded key entries)

---

### Phase 3: Frontend Cleanup (UI Removal)

**Priority:** MEDIUM — Remove embedded key UI elements

| Task | Action | Files | Risk |
|------|--------|-------|------|
| 3.1 | Remove `ListEmbeddedKeys` import from App.tsx | `frontend/src/components/App.tsx` | Low — method no longer exists backend |
| 3.2 | Remove `embeddedKeys` state | `frontend/src/components/App.tsx` | Low — unused after UI removal |
| 3.3 | Remove `ListEmbeddedKeys()` API call in useEffect | `frontend/src/components/App.tsx` | Low — API no longer exists |
| 3.4 | Remove `embeddedKeyID` from Connection interface | `frontend/src/components/App.tsx` | Low — backend field removed |
| 3.5 | Remove "Key Source" toggle from Add Connection form | `frontend/src/components/App.tsx` | Medium — UI change, test thoroughly |
| 3.6 | Remove "Key Source" toggle from Edit Connection form | `frontend/src/components/App.tsx` | Medium — UI change, test thoroughly |
| 3.7 | Remove `keySource` state (Add form) | `frontend/src/components/App.tsx` | Low — unused after UI removal |
| 3.8 | Remove `editKeySource` state (Edit form) | `frontend/src/components/App.tsx` | Low — unused after UI removal |
| 3.9 | Remove embedded key validation logic | `frontend/src/components/App.tsx` | Low — no longer needed |
| 3.10 | Remove `embeddedKeyID` from `CreateConnection` calls | `frontend/src/components/App.tsx` | Low — backend signature changed |
| 3.11 | Remove `embeddedKeyID` from `UpdateConnection` calls | `frontend/src/components/App.tsx` | Low — backend signature changed |
| 3.12 | Regenerate Wails TypeScript bindings | Run `wails generate` | Low — automated |

**Files to modify in Phase 3:**
- `frontend/src/components/App.tsx` — Remove all embedded key UI, state, and logic (45 lines of changes across 11 locations)

**Expected UI Changes:**
- Add Connection form: Only "Password" and "Private Key File" radio buttons remain
- Edit Connection form: Only "Password" and "Private Key File" radio buttons remain
- No embedded key dropdown
- Simpler authentication UI

---

### Phase 4: Documentation Cleanup

**Priority:** LOW — Clean up documentation artifacts

| Task | Action | Files | Risk |
|------|--------|-------|------|
| 4.1 | Delete embedded keys user guide | `docs/user-guide/embedded-keys.md` | None — doc only |
| 4.2 | Delete embedded keys build guide | `docs/build/embedded-keys-build.md` | None — doc only |
| 4.3 | Delete embedded keys security audit | `docs/security/embedded-keys-security.md` | None — doc only |
| 4.4 | Delete embedded keys API reference | `docs/api/embedded-keys-api.md` | None — doc only |
| 4.5 | Archive PRD-010 documents | Move `docs/planning/prd-010-*` to `docs/planning/archive/` | None — historical record |
| 4.6 | Update `docs/README.md` | Remove embedded keys entries from index | None — doc only |
| 4.7 | Update `README.md` | Remove "Embedded SSH Keys" from feature list | None — doc only |
| 4.8 | Update `docs/planning/changelog.md` | Add rollback entry, mark PRD-010 as ROLLED BACK | None — doc only |

**Files to delete in Phase 4:**
- `docs/user-guide/embedded-keys.md`
- `docs/build/embedded-keys-build.md`
- `docs/security/embedded-keys-security.md`
- `docs/api/embedded-keys-api.md`

**Files to archive in Phase 4:**
- Create `docs/planning/archive/` directory
- Move `docs/planning/prd-010-embedded-ssh-keys.md` → `docs/planning/archive/`
- Move `docs/planning/PRD-010-CHECKLIST.md` → `docs/planning/archive/`
- Move `docs/planning/PRD-010-IMPLEMENTATION-SUMMARY.md` → `docs/planning/archive/`
- Move `docs/planning/PRD-010-ORCHESTRATOR-HANDOFF.md` → `docs/planning/archive/`

**Files to modify in Phase 4:**
- `docs/README.md` — Remove 4 embedded key doc links
- `README.md` — Remove 1 line mentioning embedded keys from feature list
- `docs/planning/changelog.md` — Add rollback entry, mark PRD-010 as ROLLED BACK

---

### Phase 5: Database Migration Strategy

**CRITICAL DECISION REQUIRED: How to handle the `EmbeddedKeyID` column?**

#### Option A: Leave Column in Database (RECOMMENDED)

**Approach:**
- Do NOT modify the database schema
- Leave `EmbeddedKeyID` column in existing connections (will be NULL or have old values)
- Backend ignores this field entirely
- Existing installations continue working without migration

**Pros:**
- Zero risk of breaking existing databases
- No migration code needed
- Rollback is fully reversible (can re-add backend logic later)
- Works with any database state

**Cons:**
- Orphaned column in database (harmless but unused)
- Existing connections with `embeddedKeyID` set will fallback to password auth (expected behavior)

**Implementation:**
- No code changes needed
- Document in changelog that embedded keys are no longer supported

---

#### Option B: NULL the Column (Medium Risk)

**Approach:**
- Add migration code to `internal/db/store.go` to set all `embeddedKeyID` values to NULL
- Keep the column definition in the schema

**Pros:**
- Cleans up orphaned data
- Column still exists for potential future use

**Cons:**
- Requires migration code and testing
- Risk of migration failure on corrupted databases
- Users lose embedded key associations (can't re-enable feature easily)

**Implementation:**
```go
// In store.go load() after decryption:
for _, conn := range data.Connections {
    conn.EmbeddedKeyID = nil
}
```

---

#### Option C: Drop Column (HIGH RISK — NOT RECOMMENDED)

**Approach:**
- Remove `EmbeddedKeyID` from `internal/models/connection.go`
- Trust Go's JSON unmarshaling to ignore unknown fields

**Pros:**
- Fully removes all traces of the feature
- Clean schema

**Cons:**
- **HIGH RISK:** If database contains `embeddedKeyID`, JSON unmarshaling will ignore it (silent data loss)
- Irreversible without backup
- Complex to re-enable feature if needed
- No real benefit over Option A

**Implementation:**
- Same as Option A (just remove from Go struct)
- JSON unmarshaler silently drops unknown fields

---

**RECOMMENDED APPROACH: Option A (Leave Column)**

**Rationale:**
- Zero risk
- No migration code needed
- Existing connections fallback to password auth gracefully
- Fully reversible rollback
- Esesha uses JSON file storage (not SQL), so orphaned fields have zero performance impact

---

### Phase 6: Testing & Verification

**Priority:** CRITICAL — Verify rollback completeness

| Test | Verification | Expected Result | Risk if Failed |
|------|--------------|-----------------|----------------|
| 6.1 | Run `go build` | Build succeeds without errors | HIGH — broken build |
| 6.2 | Run `wails build` | Build succeeds, no key embedding | HIGH — broken build |
| 6.3 | Search codebase for `embeddedKey` (case-insensitive) | Zero matches in `.go` and `.tsx` files | MEDIUM — missed cleanup |
| 6.4 | Search codebase for `EmbeddedKeyID` | Zero matches except in this rollback doc | MEDIUM — missed cleanup |
| 6.5 | Search codebase for `ListEmbeddedKeys` | Zero matches except in this rollback doc | MEDIUM — missed cleanup |
| 6.6 | Launch app with existing database | App starts successfully | HIGH — data corruption |
| 6.7 | View existing connection with old `embeddedKeyID` | Connection displayed, no errors | MEDIUM — database compatibility |
| 6.8 | Create new connection with password auth | Connection saved and works | HIGH — broken auth |
| 6.9 | Create new connection with private key file auth | Connection saved and works | HIGH — broken auth |
| 6.10 | Edit existing connection, change password | Password updated correctly (PRD-009 fix preserved) | MEDIUM — regression |
| 6.11 | Connect via SSH with password | Connection successful, terminal works | HIGH — broken SSH |
| 6.12 | Connect via SSH with private key file | Connection successful, terminal works | HIGH — broken SSH |
| 6.13 | Frontend TypeScript compilation | No TypeScript errors | MEDIUM — type errors |
| 6.14 | Check Add Connection form UI | Only "Password" and "Private Key File" options visible | LOW — UI inconsistency |
| 6.15 | Check Edit Connection form UI | Only "Password" and "Private Key File" options visible | LOW — UI inconsistency |

**Automated Test Commands:**
```bash
# Backend compilation
go build

# Frontend compilation  
cd frontend && npm run build

# Full Wails build
wails build

# Search for leftover references
grep -ri "embeddedkey" --include="*.go" --include="*.tsx" .
grep -r "EmbeddedKeyID" --include="*.go" .
grep -r "ListEmbeddedKeys" --include="*.go" --include="*.tsx" .
```

---

## Rollback Execution Checklist

### Pre-Rollback
- [ ] **Create full backup** of current codebase (`git commit -am "PRE-ROLLBACK: Embedded keys feature"`)
- [ ] **Backup database** (`build/bin/esesha.bin` → `build/bin/backup/esesha-pre-rollback-{date}.bin`)
- [ ] **Document current state** (version, last successful build date)
- [ ] **Confirm with user** that rollback is desired

### Phase 1: Backend Cleanup
- [ ] Delete `internal/keys/` directory
- [ ] Remove `EmbeddedKeyID` field from `internal/models/connection.go`
- [ ] Remove `embeddedKeyID` parameter from `CreateConnection` in `app.go`
- [ ] Remove `embeddedKeyID` parameter from `UpdateConnection` in `app.go`
- [ ] Remove `ListEmbeddedKeys` method from `app.go`
- [ ] Remove `validateKeyConfig` function from `app.go`
- [ ] Remove `"esesha/internal/keys"` import from `app.go`
- [ ] Remove embedded key logic from `internal/ssh/client.go`
- [ ] Remove embedded key logic from `internal/ssh/manager.go`
- [ ] Test: `go build` succeeds

### Phase 2: Build Infrastructure
- [ ] Delete `scripts/build-keys.ps1`
- [ ] Delete `scripts/embedgen/` directory
- [ ] Delete `build-keys.json.example`
- [ ] Remove key embedding lines from `build.bat` (lines 16-21)
- [ ] Remove embedded key entries from `.gitignore` (lines 7-9)
- [ ] Test: `wails build` succeeds without key embedding

### Phase 3: Frontend Cleanup
- [ ] Remove `ListEmbeddedKeys` import from `frontend/src/components/App.tsx`
- [ ] Remove `embeddedKeys` state
- [ ] Remove `ListEmbeddedKeys()` call from useEffect
- [ ] Remove `embeddedKeyID` from Connection interface
- [ ] Remove "Key Source" toggle from Add Connection form
- [ ] Remove "Key Source" toggle from Edit Connection form
- [ ] Remove `keySource` and `editKeySource` state
- [ ] Remove embedded key validation logic
- [ ] Remove `embeddedKeyID` from `CreateConnection`/`UpdateConnection` calls
- [ ] Run `wails generate` to regenerate TypeScript bindings
- [ ] Test: `cd frontend && npm run build` succeeds

### Phase 4: Documentation
- [ ] Delete `docs/user-guide/embedded-keys.md`
- [ ] Delete `docs/build/embedded-keys-build.md`
- [ ] Delete `docs/security/embedded-keys-security.md`
- [ ] Delete `docs/api/embedded-keys-api.md`
- [ ] Create `docs/planning/archive/` directory
- [ ] Move PRD-010 documents to archive
- [ ] Update `docs/README.md` (remove 4 embedded key links)
- [ ] Update `README.md` (remove embedded keys from feature list)
- [ ] Update `docs/planning/changelog.md` (add rollback entry)

### Phase 5: Database Migration
- [ ] **DECISION:** Option A (Leave Column) — NO ACTION NEEDED
- [ ] Document in changelog that embedded keys are no longer supported

### Phase 6: Testing
- [ ] Run all 15 verification tests from Phase 6 checklist
- [ ] Fix any issues found
- [ ] Re-run failed tests until all pass
- [ ] Create test connection with password auth
- [ ] Create test connection with private key file auth
- [ ] Connect via SSH and verify terminal works

### Post-Rollback
- [ ] **Git commit:** `git commit -am "ROLLBACK: Remove embedded SSH keys feature (PRD-010)"`
- [ ] **Create rollback backup:** Copy `build/bin/esesha.exe` to backup folder
- [ ] **Update version number** (if applicable)
- [ ] **Notify user** that rollback is complete
- [ ] **Verify no regressions** in existing features (password auth, file key auth, edit connection)

---

## Rollback Impact Analysis

### What Breaks
- **Existing connections with `embeddedKeyID` set:** Will fallback to password authentication (if password is set) or fail to connect (if only embedded key was configured). Users must re-configure these connections to use password or file-based keys.
- **Build scripts referencing `build-keys.json`:** Will fail if custom build automation expects key embedding. Update custom scripts to remove this step.
- **Documentation links:** External documentation linking to embedded key guides will 404. Redirect to main authentication docs.

### What Survives
- **Password authentication:** 100% preserved
- **File-based key authentication:** 100% preserved
- **Edit connection password fix (PRD-009):** Preserved
- **PPK to PEM converter (PRD-008):** Preserved
- **All other features:** Unaffected
- **Database integrity:** Preserved (orphaned `embeddedKeyID` field harmless)

### User Impact
- **Users who never used embedded keys:** Zero impact
- **Users who used embedded keys:** Must re-configure affected connections to use password or file-based keys
- **Build process:** Slightly faster (no key embedding step)
- **Security:** Reduced attack surface (H1, H2, H3 risks eliminated)

---

## Regression Prevention

After rollback, ensure the following still work:

1. **Password Authentication**
   - Create connection with password only
   - Edit connection and change password
   - Connect via SSH with password
   - Password correctly encrypted in `esesha.bin`

2. **File-Based Key Authentication**
   - Create connection with private key file path
   - Edit connection and change key file path
   - Connect via SSH with unencrypted key file
   - Connect via SSH with passphrase-protected key file
   - Key passphrase prompted at connection time

3. **Other Features**
   - SFTP file browser works
   - PPK to PEM converter works
   - Host key verification works
   - Multi-session support works
   - Desktop shortcut creation works

---

## Rollback Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Existing connections with `embeddedKeyID` fail to load | LOW | MEDIUM | Option A (leave column) allows graceful fallback; document in changelog |
| Missed code references to embedded keys | MEDIUM | HIGH | Automated search for `embeddedKey`, `EmbeddedKeyID`, `ListEmbeddedKeys` in Phase 6 |
| TypeScript binding generation fails | LOW | HIGH | Re-run `wails generate` after backend changes; verify no errors |
| Frontend UI breaks after removal | LOW | MEDIUM | Test Add/Edit connection forms thoroughly; verify radio buttons work |
| Build script fails | LOW | HIGH | Test `wails build` after `build.bat` modification |
| Database corruption | VERY LOW | CRITICAL | Option A (leave column) eliminates this risk entirely |
| Regression in password auth | LOW | CRITICAL | Verify PRD-009 fix (edit connection password) still works |

**Overall Rollback Risk: LOW**

**Reasoning:**
- Embedded keys feature is isolated (single package)
- Backend changes are localized (3 files: app.go, client.go, manager.go)
- Frontend changes are in one file (App.tsx)
- Database strategy (Option A) has zero risk
- Comprehensive test plan in Phase 6

---

## Success Criteria

Rollback is considered successful when:

1. ✅ All 15 verification tests in Phase 6 pass
2. ✅ No references to `embeddedKey` or `EmbeddedKeyID` in codebase (except this doc and archive)
3. ✅ `wails build` completes successfully
4. ✅ App launches with existing database
5. ✅ Password authentication works (create, edit, connect)
6. ✅ File-based key authentication works (create, edit, connect)
7. ✅ Frontend displays only "Password" and "Private Key File" options
8. ✅ No TypeScript compilation errors
9. ✅ No Go compilation errors
10. ✅ All documentation updated

---

## Estimated Effort

| Phase | Effort | Parallelizable |
|-------|--------|----------------|
| Phase 1: Backend Cleanup | 1.5 hours | No — sequential |
| Phase 2: Build Infrastructure | 30 minutes | No — depends on Phase 1 |
| Phase 3: Frontend Cleanup | 1 hour | No — depends on Phase 1 |
| Phase 4: Documentation | 45 minutes | Yes — independent |
| Phase 5: Database Migration | 0 minutes | N/A — Option A requires no code |
| Phase 6: Testing | 1.5 hours | No — sequential |

**Total Effort:** ~5.25 hours (with Option A)

**If Option B (NULL column):** +1 hour (migration code + testing)  
**If Option C (drop column):** +2 hours (migration code + extensive testing + rollback verification)

---

## Version History

| Version | Date | Summary |
|---------|------|---------|
| v1.0.0 | 2026-08-14 | Initial rollback plan — comprehensive removal strategy with 3 database options |

---

## References

- **Original PRD:** `docs/planning/prd-010-embedded-ssh-keys.md`
- **Implementation Summary:** `docs/planning/PRD-010-IMPLEMENTATION-SUMMARY.md`
- **Security Audit:** `docs/security/embedded-keys-security.md` (H1, H2, H3 findings)
- **User Guide:** `docs/user-guide/embedded-keys.md`
- **Build Guide:** `docs/build/embedded-keys-build.md`

---

## Notes for Implementer

**Key Points:**
- Use **Option A (Leave Column)** for database — zero risk, no migration needed
- Search codebase comprehensively for leftover references (Phase 6 tests)
- Regenerate Wails bindings after backend changes (`wails generate`)
- Test both password AND file-based key authentication thoroughly
- Verify PRD-009 fix (edit connection password) still works
- Keep PRD-010 documents in archive (historical record)
- Update changelog with rollback entry

**If Issues Arise:**
- Database corruption → Restore from `esesha-pre-rollback-{date}.bin` backup
- Build failures → Check for missed imports or references
- TypeScript errors → Re-run `wails generate` and check binding regeneration
- Connection failures → Verify password encryption logic unchanged

**Quick Rollback of Rollback (Restore Feature):**
- Revert Git commit: `git revert HEAD`
- Restore `internal/keys/` from archive
- Re-run `wails generate`
- Rebuild: `wails build`

---

**END OF ROLLBACK PLAN**
