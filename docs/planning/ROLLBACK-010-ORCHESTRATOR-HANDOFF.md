# Orchestrator Handoff: PRD-010 Rollback Execution

**Date:** 2026-08-14  
**Planner Agent:** Complete  
**Next Agent:** Backend Developer (Phase 1)  

---

## Task

Execute complete removal of the Embedded SSH Keys feature (PRD-010) from the Esesha codebase per user request.

---

## User Request

> "Remove embedded key feature completely. Keep only password and file path authentication methods."

**Rationale:**
- User only needs password + file path authentication
- Embedded keys have security concerns (H1, H2, H3 from security audit)
- Simplifies the codebase
- Reduces complexity for users

---

## Planning Complete

✅ **Rollback Plan Created:** `docs/planning/rollback-010-remove-embedded-keys.md` (comprehensive 23-page plan)  
✅ **Execution Checklist Created:** `docs/planning/ROLLBACK-010-EXECUTION-CHECKLIST.md` (printable checklist with sign-off)  
✅ **Implementation Summary Created:** `docs/planning/ROLLBACK-010-IMPLEMENTATION-SUMMARY.md` (quick reference)  
✅ **Changelog Updated:** Rollback marked as PLANNED  

---

## Rollback Scope Summary

### Files to Delete (13 total)
- `internal/keys/` (5 files)
- `scripts/build-keys.ps1`, `scripts/embedgen/` (3 files)
- `build-keys.json.example`
- 4 documentation files

### Files to Modify (9 total)
- Backend: `app.go`, `internal/models/connection.go`, `internal/ssh/client.go`, `internal/ssh/manager.go`
- Build: `build.bat`, `.gitignore`
- Frontend: `frontend/src/components/App.tsx` (45 lines across 11 locations)
- Docs: `docs/planning/changelog.md`

### Files to Archive (4 total)
- PRD-010 documents → `docs/planning/archive/`

---

## Database Strategy

**Decision:** Option A (Leave Column)

- Do NOT modify database schema
- `EmbeddedKeyID` column remains but unused
- Existing connections with `embeddedKeyID` fallback to password auth gracefully
- Zero risk, no migration code needed
- Fully reversible

---

## Execution Phases

| Phase | Agent | Effort | Parallelizable | Status |
|-------|-------|--------|----------------|--------|
| **Phase 1: Backend Cleanup** | Backend Developer | 1.5 hours | No | READY |
| **Phase 2: Build Infrastructure** | Backend Developer | 30 min | No | Blocked by Phase 1 |
| **Phase 3: Frontend Cleanup** | Frontend Developer | 1 hour | No | Blocked by Phase 1 |
| **Phase 4: Documentation** | Documentation | 45 min | Yes (after 1-3) | Blocked by Phase 1-3 |
| **Phase 5: Database** | N/A | 0 min | N/A | N/A (Option A) |
| **Phase 6: Testing** | Debugger/Reviewer | 1.5 hours | No | Blocked by all |

**Total Effort:** 5.25 hours

---

## Phase 1 Details (Backend Developer)

**Tasks:**
1. Delete `internal/keys/` directory (5 files)
2. Remove `EmbeddedKeyID` field from `internal/models/connection.go`
3. Remove embedded key methods and parameters from `app.go`:
   - Delete `ListEmbeddedKeys()` method
   - Delete `validateKeyConfig()` function
   - Update `CreateConnection()` — remove `embeddedKeyID` parameter
   - Update `UpdateConnection()` — remove `embeddedKeyID` parameter
   - Remove `"esesha/internal/keys"` import
4. Remove embedded key logic from `internal/ssh/client.go`:
   - Update `NewClientWithKeyPassphraseAndHostKey()` — remove `embeddedKeyID` parameter
   - Remove embedded key loading branch
5. Remove embedded key logic from `internal/ssh/manager.go`:
   - Update `ConnectWithPassphrase()` — remove `embeddedKeyID` parameter
   - Remove embedded key loading branch
   - Update `Connect()` call

**Acceptance Criteria:**
- [ ] `internal/keys/` directory deleted
- [ ] `go build` succeeds with no errors
- [ ] No references to `embeddedKeyID` in modified files
- [ ] SSH client/manager fallback to file-based keys only

**Files to modify:**
- `internal/models/connection.go`
- `app.go`
- `internal/ssh/client.go`
- `internal/ssh/manager.go`

**Files to delete:**
- `internal/keys/` (entire directory)

---

## Phase 2 Details (Backend Developer)

**Tasks:**
1. Delete `scripts/build-keys.ps1`
2. Delete `scripts/embedgen/` directory
3. Delete `build-keys.json.example`
4. Remove key embedding section from `build.bat` (lines 16-21)
5. Remove embedded key entries from `.gitignore` (lines 7-9)

**Acceptance Criteria:**
- [ ] `wails build` succeeds
- [ ] No "Embedding SSH keys" message in build output
- [ ] Binary created successfully

**Files to modify:**
- `build.bat`
- `.gitignore`

**Files to delete:**
- `scripts/build-keys.ps1`
- `scripts/embedgen/`
- `build-keys.json.example`

---

## Phase 3 Details (Frontend Developer)

**Tasks:**
1. Modify `frontend/src/components/App.tsx` (11 locations):
   - Remove `ListEmbeddedKeys` import
   - Remove `embeddedKeys` state
   - Remove `embeddedKeyID` from Connection interface
   - Remove `ListEmbeddedKeys()` API call
   - Remove "Key Source" toggles (Add + Edit forms)
   - Remove embedded key dropdown UI
   - Remove embedded key validation
   - Update `CreateConnection`/`UpdateConnection` calls
2. Regenerate Wails bindings: `wails generate module`
3. Test frontend compilation: `cd frontend && npm run build`

**Acceptance Criteria:**
- [ ] Frontend compiles with no TypeScript errors
- [ ] UI shows only "Password" and "Private Key File" options
- [ ] No "Embedded Key" UI elements visible
- [ ] `ListEmbeddedKeys` removed from TypeScript bindings

**Files to modify:**
- `frontend/src/components/App.tsx`

---

## Phase 4 Details (Documentation)

**Tasks:**
1. Delete 4 documentation files
2. Create `docs/planning/archive/` directory
3. Move 4 PRD-010 files to archive
4. Update `docs/README.md` (remove 4 embedded key links)
5. Update `README.md` (remove embedded keys from feature list)
6. Update `docs/planning/changelog.md` (add rollback entry, mark PRD-010 as ROLLED BACK)

**Acceptance Criteria:**
- [ ] All embedded key documentation removed or archived
- [ ] Index files updated
- [ ] Changelog reflects rollback

**Files to delete:**
- `docs/user-guide/embedded-keys.md`
- `docs/build/embedded-keys-build.md`
- `docs/security/embedded-keys-security.md`
- `docs/api/embedded-keys-api.md`

**Files to archive:**
- `docs/planning/prd-010-*.md` (4 files)

**Files to modify:**
- `docs/README.md`
- `README.md`
- `docs/planning/changelog.md`

---

## Phase 6 Details (Debugger/Reviewer)

**Critical Tests (15 total):**

✅ **Build Tests (2)**
- `go build` succeeds
- `wails build` succeeds

✅ **Code Search Tests (3)**
- Zero matches for `embeddedkey`
- Zero matches for `EmbeddedKeyID`
- Zero matches for `ListEmbeddedKeys`

✅ **Runtime Tests (2)**
- App launches with existing database
- Existing connections display correctly

✅ **Password Auth Tests (3)**
- Create connection with password
- Edit connection password (PRD-009 fix preserved)
- Connect via SSH with password

✅ **File Key Auth Tests (4)**
- Create connection with private key file
- Edit connection key file path
- Connect with unencrypted key
- Connect with passphrase-protected key

✅ **UI Tests (1)**
- Only "Password" and "Private Key File" options visible

**Acceptance Criteria:**
- [ ] All 15 tests pass
- [ ] No regressions in existing features
- [ ] Password + file key authentication work correctly

---

## Risk Assessment

**Overall Risk:** LOW

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Missed code references | MEDIUM | HIGH | Automated search in Phase 6 |
| TypeScript binding errors | LOW | HIGH | Re-run `wails generate module` |
| Database compatibility | VERY LOW | CRITICAL | Option A (leave column) eliminates risk |
| Regression in password auth | LOW | CRITICAL | Verify PRD-009 fix preserved |
| Build failures | LOW | HIGH | Test after each phase |

---

## Success Criteria

Rollback is successful when:

1. ✅ All 15 verification tests pass
2. ✅ No references to `embeddedKey`/`EmbeddedKeyID`/`ListEmbeddedKeys` in codebase
3. ✅ `wails build` succeeds
4. ✅ App launches with existing database
5. ✅ Password authentication works
6. ✅ File-based key authentication works
7. ✅ UI shows only 2 auth options
8. ✅ No TypeScript/Go compilation errors
9. ✅ All documentation updated
10. ✅ PRD-010 archived

---

## Preserved Features

✅ Password authentication  
✅ File-based key authentication  
✅ Edit connection password fix (PRD-009)  
✅ PPK to PEM converter (PRD-008)  
✅ SFTP file browser  
✅ Host key verification  
✅ Multi-session support  
✅ All other features  

---

## User Impact

**Users who never used embedded keys:** Zero impact

**Users who used embedded keys:**
- Existing connections with `embeddedKeyID` will fallback to password auth
- Must reconfigure affected connections to use password or file-based keys
- No data loss (database preserved)

---

## Expected Improvements

✅ **Build time:** ~5-10 seconds faster  
✅ **Security:** H1, H2, H3 risks eliminated  
✅ **Complexity:** Simpler codebase  
✅ **User experience:** Clearer authentication options  

---

## Pre-Execution Requirements

**CRITICAL: User must confirm before Phase 1 execution**

- [ ] User acknowledges that existing connections with embedded keys will need reconfiguration
- [ ] User confirms rollback should proceed
- [ ] Backup created: `build\bin\esesha.bin` → `build\bin\backup\esesha-rollback-{date}.bin`
- [ ] Git commit created: "PRE-ROLLBACK: Embedded keys feature checkpoint"

---

## Documents for Agents

| Document | Purpose | Agent |
|----------|---------|-------|
| `rollback-010-remove-embedded-keys.md` | Full rollback plan (23 pages) | All agents |
| `ROLLBACK-010-EXECUTION-CHECKLIST.md` | Printable checklist with sign-off | Debugger/Reviewer |
| `ROLLBACK-010-IMPLEMENTATION-SUMMARY.md` | Quick reference (4 pages) | All agents |
| This handoff | Orchestrator routing | Orchestrator |

---

## Execution Order

```
START
  ↓
PRE-ROLLBACK SAFETY
  ├─ Git commit
  ├─ Backup database
  └─ User confirmation
  ↓
PHASE 1: Backend Cleanup (Backend Developer)
  ├─ Delete internal/keys/
  ├─ Modify app.go
  ├─ Modify models/connection.go
  ├─ Modify ssh/client.go
  ├─ Modify ssh/manager.go
  └─ Test: go build
  ↓
PHASE 2: Build Infrastructure (Backend Developer)
  ├─ Delete build scripts
  ├─ Modify build.bat
  ├─ Modify .gitignore
  └─ Test: wails build
  ↓
PHASE 3: Frontend Cleanup (Frontend Developer)
  ├─ Modify App.tsx
  ├─ Regenerate bindings
  └─ Test: npm run build
  ↓
PHASE 4: Documentation (Documentation) [Can run in parallel with Phase 6]
  ├─ Delete docs
  ├─ Archive PRD-010
  └─ Update indexes
  ↓
PHASE 6: Testing (Debugger/Reviewer)
  ├─ Run 15 verification tests
  ├─ Fix issues
  └─ Sign off
  ↓
POST-ROLLBACK
  ├─ Git commit
  ├─ Backup binary
  └─ User notification
  ↓
COMPLETE
```

---

## Next Step

**Route to:** Backend Developer

**Task:** Execute Phase 1 (Backend Cleanup)

**Estimated time:** 1.5 hours

**Blocking issues:** None

**Prerequisites:**
- User confirmation obtained
- Database backup created
- Git commit created

**On completion:** Route to Backend Developer for Phase 2, then Frontend Developer for Phase 3

---

**Planner Agent Sign-off:**

Planning complete. All rollback documentation created. Ready for execution.

- Rollback plan: ✅ Complete
- Execution checklist: ✅ Complete
- Implementation summary: ✅ Complete
- Risk assessment: ✅ LOW risk
- Success criteria: ✅ Defined
- Agent routing: ✅ Clear

**Status:** READY FOR EXECUTION (pending user confirmation)

---

**END OF HANDOFF**
