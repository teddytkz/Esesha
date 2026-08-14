# Rollback Implementation Summary: PRD-010 Removal

**Feature:** Embedded SSH Keys (PRD-010)  
**Action:** Complete Removal  
**Status:** Ready for Implementation  
**Date:** 2026-08-14  

---

## Quick Reference

**What:** Remove embedded SSH keys feature, keep only password and file path authentication.

**Why:** User request + security concerns (H1, H2, H3 from audit) + reduced complexity.

**Effort:** ~5.25 hours

**Risk:** LOW (isolated feature, comprehensive test plan, zero-risk database strategy)

---

## Files to Delete (13 total)

### Backend (5 files)
```
internal/keys/store.go
internal/keys/types.go
internal/keys/embedded.go
internal/keys/embedded.go.template
internal/keys/store_test.go
```

### Build Infrastructure (3 files + 1 directory)
```
scripts/build-keys.ps1
scripts/embedgen/main.go
scripts/embedgen/ (directory)
build-keys.json.example
```

### Documentation (4 files)
```
docs/user-guide/embedded-keys.md
docs/build/embedded-keys-build.md
docs/security/embedded-keys-security.md
docs/api/embedded-keys-api.md
```

---

## Files to Modify (9 total)

### Backend (5 files)

**`internal/models/connection.go`**
- Remove: `EmbeddedKeyID *string` field

**`app.go`**
- Remove: `"esesha/internal/keys"` import
- Remove: `ListEmbeddedKeys()` method
- Remove: `validateKeyConfig()` function
- Update: `CreateConnection()` — remove `embeddedKeyID` parameter
- Update: `UpdateConnection()` — remove `embeddedKeyID` parameter

**`internal/ssh/client.go`**
- Update: `NewClientWithKeyPassphraseAndHostKey()` — remove `embeddedKeyID` parameter
- Remove: Embedded key loading branch

**`internal/ssh/manager.go`**
- Update: `ConnectWithPassphrase()` — remove `embeddedKeyID` parameter
- Remove: Embedded key loading branch

**`internal/ssh/manager.go` (Connect method)**
- Update: Remove `nil` embeddedKeyID argument from `ConnectWithPassphrase` call

### Build & Config (2 files)

**`build.bat`**
- Remove: Lines 16-21 (key embedding section)

**`.gitignore`**
- Remove: Lines 7-9 (embedded key entries)

### Frontend (1 file)

**`frontend/src/components/App.tsx`** (45 lines of changes across 11 locations)
- Remove: `ListEmbeddedKeys` import
- Remove: `embeddedKeys` state
- Remove: `embeddedKeyID` from Connection interface
- Remove: `ListEmbeddedKeys()` API call
- Remove: "Key Source" toggles (Add + Edit forms)
- Remove: Embedded key dropdown UI
- Remove: Embedded key validation
- Update: `CreateConnection`/`UpdateConnection` calls (remove embeddedKeyID argument)

### Documentation (1 file)

**`docs/planning/changelog.md`**
- Add: Rollback entry to `## [Unreleased]` → `### Removed`
- Update: Mark PRD-010 as "ROLLED BACK ❌"

---

## Files to Archive (4 files)

Create: `docs/planning/archive/` directory

Move these files:
```
prd-010-embedded-ssh-keys.md → archive/
PRD-010-CHECKLIST.md → archive/
PRD-010-IMPLEMENTATION-SUMMARY.md → archive/
PRD-010-ORCHESTRATOR-HANDOFF.md → archive/
```

---

## Database Strategy: Option A (Leave Column)

**Decision:** Do NOT modify the database schema.

**Why:**
- Zero risk of breaking existing databases
- No migration code needed
- Fully reversible
- Existing connections with `embeddedKeyID` fallback gracefully to password auth

**Impact:**
- `EmbeddedKeyID` column remains in database (unused, harmless)
- Backend ignores this field entirely
- JSON unmarshaling handles gracefully

---

## Implementation Phases

### Phase 1: Backend Cleanup (1.5 hours)
1. Delete `internal/keys/` directory
2. Modify `internal/models/connection.go`
3. Modify `app.go` (remove methods, update signatures)
4. Modify `internal/ssh/client.go`
5. Modify `internal/ssh/manager.go`
6. Test: `go build`

### Phase 2: Build Infrastructure (30 minutes)
1. Delete build scripts and embedgen
2. Modify `build.bat`
3. Modify `.gitignore`
4. Test: `wails build`

### Phase 3: Frontend Cleanup (1 hour)
1. Modify `frontend/src/components/App.tsx` (11 locations)
2. Regenerate Wails bindings: `wails generate module`
3. Test: `cd frontend && npm run build`

### Phase 4: Documentation (45 minutes)
1. Delete 4 documentation files
2. Archive 4 PRD-010 files
3. Update `docs/README.md`
4. Update `README.md`
5. Update `docs/planning/changelog.md`

### Phase 5: Database (0 minutes)
- No action needed (Option A)

### Phase 6: Testing (1.5 hours)
- Run 15 verification tests
- Fix any issues
- Verify password + file key authentication

---

## Critical Test Checklist

After rollback, verify these work:

✅ **Build Tests**
- [ ] `go build` succeeds
- [ ] `wails build` succeeds
- [ ] No "Embedding SSH keys" message in build output

✅ **Code Search Tests**
- [ ] Zero matches for `embeddedkey` (case-insensitive)
- [ ] Zero matches for `EmbeddedKeyID`
- [ ] Zero matches for `ListEmbeddedKeys`

✅ **Password Authentication**
- [ ] Create connection with password
- [ ] Edit connection, change password (PRD-009 fix preserved)
- [ ] Connect via SSH with password

✅ **File-Based Key Authentication**
- [ ] Create connection with private key file
- [ ] Edit connection, change key file path
- [ ] Connect with unencrypted key
- [ ] Connect with passphrase-protected key

✅ **UI Verification**
- [ ] Add Connection form: Only "Password" and "Private Key File" options
- [ ] Edit Connection form: Only "Password" and "Private Key File" options
- [ ] No "Embedded Key" dropdown visible

✅ **Feature Preservation**
- [ ] SFTP file browser works
- [ ] PPK to PEM converter works
- [ ] Host key verification works
- [ ] Multi-session support works

---

## Agent Routing

| Phase | Agent | Parallelizable |
|-------|-------|----------------|
| Phase 1 | Backend Developer | No — sequential |
| Phase 2 | Backend Developer | No — depends on Phase 1 |
| Phase 3 | Frontend Developer | No — depends on Phase 1 (bindings) |
| Phase 4 | Documentation | Yes — independent after Phase 1-3 complete |
| Phase 5 | N/A | N/A |
| Phase 6 | Debugger/Reviewer | No — sequential after all phases |

**Recommended execution order:**
1. Phase 1 (Backend) → Phase 2 (Build) → Phase 3 (Frontend) → Phase 6 (Testing)
2. Phase 4 (Documentation) can run in parallel with Phase 6

---

## Success Criteria

Rollback is complete when:

1. All 15 verification tests pass
2. No references to `embeddedKey`/`EmbeddedKeyID`/`ListEmbeddedKeys` in codebase
3. `wails build` succeeds
4. App launches with existing database
5. Password authentication works
6. File-based key authentication works
7. UI shows only 2 auth options (password + file)
8. No TypeScript/Go compilation errors
9. All documentation updated
10. PRD-010 archived

---

## Rollback Risks (All LOW)

| Risk | Mitigation |
|------|------------|
| Missed code references | Automated search in Phase 6 |
| TypeScript binding errors | Re-run `wails generate module` |
| Database compatibility | Option A (leave column) = zero risk |
| Regression in password auth | Verify PRD-009 fix still works |
| Build failures | Test after each phase |

---

## Quick Commands

```powershell
# Build
go build
wails build

# Search for leftovers
grep -ri "embeddedkey" --include="*.go" --include="*.tsx" .
grep -r "EmbeddedKeyID" --include="*.go" .
grep -r "ListEmbeddedKeys" --include="*.go" --include="*.tsx" .

# Frontend
cd frontend && npm run build && cd ..

# Regenerate bindings
wails generate module

# Git
git add -A
git commit -m "ROLLBACK: Remove embedded SSH keys feature (PRD-010)"
```

---

## What Stays

✅ **Password authentication** — 100% preserved  
✅ **File-based key authentication** — 100% preserved  
✅ **Edit connection password fix (PRD-009)** — Preserved  
✅ **PPK to PEM converter (PRD-008)** — Preserved  
✅ **All other features** — Unaffected  
✅ **Database integrity** — Preserved  

---

## What Breaks

❌ **Existing connections with `embeddedKeyID` set:**
- Will fallback to password auth (if password exists)
- User must reconfigure to use password or file key

❌ **Build scripts expecting `build-keys.json`:**
- Will fail if custom automation references key embedding
- User must update custom scripts

❌ **Documentation links:**
- External links to embedded key guides will 404
- Redirect to main authentication docs

---

## Expected Improvements

✅ **Build time:** ~5-10 seconds faster (no key embedding)  
✅ **Security:** H1, H2, H3 risks eliminated  
✅ **Complexity:** Simpler codebase, easier maintenance  
✅ **User experience:** Clearer authentication options  

---

## Rollback of Rollback (If Needed)

To restore embedded keys feature:

1. `git revert HEAD` (revert rollback commit)
2. Restore `internal/keys/` from archive
3. Run `wails generate module`
4. Run `wails build`

---

## Documents

- **Full Rollback Plan:** `docs/planning/rollback-010-remove-embedded-keys.md` (23 pages)
- **Execution Checklist:** `docs/planning/ROLLBACK-010-EXECUTION-CHECKLIST.md` (printable)
- **This Summary:** `docs/planning/ROLLBACK-010-IMPLEMENTATION-SUMMARY.md` (quick reference)

---

**For Orchestrator:**

**Ready to execute:** YES  
**Blocking issues:** NONE  
**Estimated time:** 5.25 hours  
**Risk level:** LOW  
**Requires user confirmation:** YES (before Phase 1)  

**Next step:** Route to Backend Developer for Phase 1 execution.

---

**END OF SUMMARY**
