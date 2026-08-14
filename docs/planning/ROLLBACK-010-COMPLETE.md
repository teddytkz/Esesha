# Rollback Plan Complete: PRD-010 Removal

**Created:** 2026-08-14  
**Status:** ✅ READY FOR EXECUTION  
**Risk Level:** LOW  
**Estimated Effort:** 5.25 hours  

---

## Summary

Complete rollback plan created for removing the Embedded SSH Keys feature (PRD-010) from Esesha. User wants to keep only password and file path authentication methods.

---

## Documents Created

### 1. Full Rollback Plan (23 pages)
**File:** `docs/planning/rollback-010-remove-embedded-keys.md`

**Contents:**
- Complete overview and rationale
- Detailed breakdown of what was implemented in PRD-010
- 6-phase rollback strategy with file-by-file instructions
- 3 database migration options (recommended: Option A - Leave Column)
- Comprehensive risk analysis and mitigation strategies
- 15-test verification plan
- Rollback impact analysis
- Success criteria
- Estimated effort breakdown

### 2. Execution Checklist (printable)
**File:** `docs/planning/ROLLBACK-010-EXECUTION-CHECKLIST.md`

**Contents:**
- Pre-rollback safety checklist
- Phase-by-phase execution steps with checkboxes
- Test verification checklist (15 tests)
- Post-rollback tasks
- Issue tracking section
- Sign-off area for executor and reviewer
- Quick reference commands

### 3. Implementation Summary (quick reference)
**File:** `docs/planning/ROLLBACK-010-IMPLEMENTATION-SUMMARY.md`

**Contents:**
- Quick reference for all agents
- Files to delete (13 files)
- Files to modify (9 files)
- Files to archive (4 files)
- Database strategy (Option A)
- Critical test checklist
- Agent routing
- Success criteria
- Quick commands

### 4. Orchestrator Handoff
**File:** `docs/planning/ROLLBACK-010-ORCHESTRATOR-HANDOFF.md`

**Contents:**
- Task routing for Orchestrator
- Phase-by-phase agent assignments
- Detailed Phase 1 instructions for Backend Developer
- Prerequisites and blocking conditions
- Execution flow diagram
- Success criteria
- Next steps

### 5. Changelog Updated
**File:** `docs/planning/changelog.md`

**Changes:**
- Added rollback plan entry to "Planned" section
- Marked PRD-010 as "SUPERSEDED (marked for rollback)"
- Links to all rollback documentation

---

## Rollback Strategy Overview

### What Gets Removed

**Backend (5 files):**
- Entire `internal/keys/` package

**Build Infrastructure (4 files):**
- `scripts/build-keys.ps1`
- `scripts/embedgen/main.go`
- `scripts/embedgen/` directory
- `build-keys.json.example`

**Documentation (4 files):**
- `docs/user-guide/embedded-keys.md`
- `docs/build/embedded-keys-build.md`
- `docs/security/embedded-keys-security.md`
- `docs/api/embedded-keys-api.md`

**Total deletions:** 13 files

### What Gets Modified

**Backend (5 files):**
- `internal/models/connection.go` — Remove `EmbeddedKeyID` field
- `app.go` — Remove 3 methods, update 2 methods
- `internal/ssh/client.go` — Remove embedded key logic
- `internal/ssh/manager.go` — Remove embedded key logic
- `internal/db/crypto.go` — (no changes needed, exported wrappers remain)

**Build & Config (2 files):**
- `build.bat` — Remove key embedding step
- `.gitignore` — Remove embedded key entries

**Frontend (1 file):**
- `frontend/src/components/App.tsx` — Remove embedded key UI (45 lines across 11 locations)

**Documentation (1 file):**
- `docs/planning/changelog.md` — Add rollback entry

**Total modifications:** 9 files

### What Gets Archived

**PRD-010 Documents (4 files):**
- Move to `docs/planning/archive/`:
  - `prd-010-embedded-ssh-keys.md`
  - `PRD-010-CHECKLIST.md`
  - `PRD-010-IMPLEMENTATION-SUMMARY.md`
  - `PRD-010-ORCHESTRATOR-HANDOFF.md`

---

## Database Strategy: Option A (Recommended)

**Decision:** Leave `EmbeddedKeyID` column in database

**Why:**
- Zero risk of breaking existing databases
- No migration code needed
- Fully reversible
- Graceful fallback for existing connections

**Impact:**
- Column remains in database but unused
- Backend ignores the field
- Existing connections with `embeddedKeyID` fallback to password auth

---

## Execution Phases

| Phase | Agent | Effort | Status |
|-------|-------|--------|--------|
| **Phase 1: Backend Cleanup** | Backend Developer | 1.5 hours | Ready |
| **Phase 2: Build Infrastructure** | Backend Developer | 30 minutes | Blocked by Phase 1 |
| **Phase 3: Frontend Cleanup** | Frontend Developer | 1 hour | Blocked by Phase 1 |
| **Phase 4: Documentation** | Documentation | 45 minutes | Blocked by 1-3 |
| **Phase 5: Database** | N/A | 0 minutes | N/A (Option A) |
| **Phase 6: Testing** | Debugger/Reviewer | 1.5 hours | Blocked by all |

**Total:** 5.25 hours

---

## Critical Tests (15 total)

✅ Build Tests (2)
✅ Code Search Tests (3)
✅ Runtime Tests (2)
✅ Password Auth Tests (3)
✅ File Key Auth Tests (4)
✅ UI Tests (1)

All tests must pass for rollback to be considered successful.

---

## Risk Assessment

**Overall Risk:** LOW

**Mitigations in place:**
- Isolated feature (single package)
- Comprehensive test plan
- Zero-risk database strategy
- Automated code search for missed references
- Phase-by-phase verification

---

## What Stays

✅ Password authentication (100%)
✅ File-based key authentication (100%)
✅ Edit connection password fix (PRD-009)
✅ PPK to PEM converter (PRD-008)
✅ All other features
✅ Database integrity

---

## What Breaks

❌ Existing connections with `embeddedKeyID` set
- Will fallback to password auth
- User must reconfigure to use password or file key

❌ Custom build scripts expecting `build-keys.json`
- User must update custom automation

---

## Expected Improvements

✅ Build time: ~5-10 seconds faster
✅ Security: H1, H2, H3 risks eliminated
✅ Complexity: Simpler codebase
✅ User experience: Clearer authentication options

---

## Success Criteria

Rollback is complete when:

1. All 15 verification tests pass
2. No `embeddedKey`/`EmbeddedKeyID`/`ListEmbeddedKeys` references in code
3. `wails build` succeeds
4. App launches with existing database
5. Password authentication works
6. File-based key authentication works
7. UI shows only 2 auth options
8. No TypeScript/Go errors
9. Documentation updated
10. PRD-010 archived

---

## Next Steps

### For User (Required Before Execution):

1. **Review the rollback plan:**
   - Read: `docs/planning/rollback-010-remove-embedded-keys.md`
   - Review: `docs/planning/ROLLBACK-010-IMPLEMENTATION-SUMMARY.md`

2. **Confirm understanding:**
   - Existing connections with embedded keys will need reconfiguration
   - Only password + file path authentication will remain
   - Rollback is fully reversible if needed

3. **Approve execution:**
   - Once approved, Orchestrator will route to Backend Developer

### For Orchestrator (After User Approval):

1. **Pre-execution safety:**
   - Create Git commit: "PRE-ROLLBACK: Embedded keys feature checkpoint"
   - Backup database: `build\bin\esesha.bin` → `backup\esesha-rollback-{date}.bin`
   - Verify git status clean

2. **Route to Backend Developer:**
   - Task: Execute Phase 1 (Backend Cleanup)
   - Estimated: 1.5 hours
   - Document: `docs/planning/ROLLBACK-010-ORCHESTRATOR-HANDOFF.md`

3. **Sequential execution:**
   - Phase 1 → Phase 2 (Backend Developer)
   - Phase 3 (Frontend Developer)
   - Phase 4 (Documentation)
   - Phase 6 (Debugger/Reviewer)

---

## Quick Commands for Execution

```powershell
# Pre-rollback safety
git status
git commit -am "PRE-ROLLBACK: Embedded keys feature checkpoint"
copy build\bin\esesha.bin build\bin\backup\esesha-rollback-20260814.bin

# Build tests
go build
wails build

# Code search (verify zero matches)
grep -ri "embeddedkey" --include="*.go" --include="*.tsx" .
grep -r "EmbeddedKeyID" --include="*.go" .
grep -r "ListEmbeddedKeys" --include="*.go" --include="*.tsx" .

# Frontend
cd frontend && npm run build && cd ..
wails generate module

# Post-rollback
git add -A
git commit -m "ROLLBACK: Remove embedded SSH keys feature (PRD-010)"
```

---

## Rollback of Rollback (If Needed)

If you need to restore the embedded keys feature:

```powershell
git revert HEAD
# Restore internal/keys/ from archive
wails generate module
wails build
```

---

## Documentation Structure

```
docs/planning/
├── rollback-010-remove-embedded-keys.md       (23 pages - full plan)
├── ROLLBACK-010-EXECUTION-CHECKLIST.md        (printable checklist)
├── ROLLBACK-010-IMPLEMENTATION-SUMMARY.md     (4 pages - quick ref)
├── ROLLBACK-010-ORCHESTRATOR-HANDOFF.md       (orchestrator routing)
├── changelog.md                                (updated with rollback entry)
└── archive/                                    (to be created)
    ├── prd-010-embedded-ssh-keys.md
    ├── PRD-010-CHECKLIST.md
    ├── PRD-010-IMPLEMENTATION-SUMMARY.md
    └── PRD-010-ORCHESTRATOR-HANDOFF.md
```

---

## Key Points for User

🔵 **Rollback is ready** — All planning documents created

🔵 **Low risk** — Isolated feature with comprehensive test plan

🔵 **Reversible** — Can restore feature with single `git revert`

🔵 **Database safe** — Option A (leave column) has zero risk

🔵 **Features preserved** — Password + file key authentication unchanged

🟡 **User action required** — Reconfigure connections that used embedded keys

🟢 **Improvements** — Faster builds, simpler code, better security

---

## Planner Sign-off

✅ **Rollback plan:** Complete (23 pages)  
✅ **Execution checklist:** Complete (printable)  
✅ **Implementation summary:** Complete (4 pages)  
✅ **Orchestrator handoff:** Complete  
✅ **Changelog:** Updated  
✅ **Risk assessment:** LOW  
✅ **Success criteria:** Defined (10 criteria)  
✅ **Test plan:** Comprehensive (15 tests)  
✅ **Agent routing:** Clear  

**Status:** READY FOR EXECUTION (pending user confirmation)

**Estimated effort:** 5.25 hours

**Next step:** User approval → Orchestrator → Backend Developer (Phase 1)

---

**END OF ROLLBACK PLAN SUMMARY**
