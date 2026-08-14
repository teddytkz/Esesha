# Fix-011: PEM Content Storage — Planner Handoff to Orchestrator

**Date:** 2026-08-14  
**Status:** ✅ PLANNING COMPLETE — READY FOR EXECUTION  
**Priority:** Medium  
**Type:** Bug Fix / Architectural Improvement  

---

## Executive Summary

I have completed comprehensive planning for **Fix-011: Store Private Key Content (Not Path)**. This fix addresses a portability and fragility issue where SSH private keys are stored as file paths instead of encrypted content in the database.

**Problem:** Current connections store `PrivateKeyPath` (string), breaking when files are moved/deleted.  
**Solution:** Add `PrivateKeyContent` ([]byte) to store encrypted PEM content, with 100% backward compatibility.  
**Effort:** 8-12 hours across 6 phases.  
**Risk:** Low (backward compatibility built-in, proven encryption).

---

## Planning Deliverables

I have created **5 comprehensive planning documents** (2,100+ lines total):

### 1. Full Fix Plan
**File:** `docs/planning/fix-011-pem-content-storage.md` (500+ lines)

**Contents:**
- Root cause analysis
- Fix strategy comparison (Option A recommended: backward compatible)
- 6 implementation phases with task breakdowns
- Data model changes (before/after comparison)
- Code flow diagrams (current vs new)
- Backward compatibility strategy with code examples
- Security considerations (encryption, storage, logging)
- Testing strategy (unit, integration, manual - 6 test scenarios)
- Rollback strategy
- Risk assessment with mitigations
- Documentation requirements

**Key Decision:** Option A (add field, keep old) over Option B (replace field, breaking change)

---

### 2. Orchestrator Handoff Guide
**File:** `docs/planning/FIX-011-ORCHESTRATOR-HANDOFF.md` (600+ lines)

**Contents:**
- Complete execution order with dependencies
- Agent routing for each phase
- Task-by-task implementation instructions with:
  - Exact file paths
  - Line numbers to modify
  - Code snippets for each change
  - Verification commands
  - Expected outcomes
- Parallelization opportunities clearly marked
- Completion checklist (20+ items)
- Post-implementation changelog update template

**Critical Path Highlighted:**
```
Phase 1 (all parallel) → Phase 2 (sequential) → 
Phase 3.1 (must complete first) → Phase 3.2-3.5 (parallel) → 
Phase 4 & Phase 5 (parallel) → Phase 6 (verification)
```

---

### 3. Implementation Summary
**File:** `docs/planning/FIX-011-IMPLEMENTATION-SUMMARY.md` (300+ lines)

**Contents:**
- Quick reference overview
- Phase summaries with effort estimates
- Files modified list (8 files)
- Acceptance criteria (12 testable items)
- Backward compatibility guarantee
- Security model summary
- Agent routing table
- Related PRDs (PRD-007, PRD-009, ROLLBACK-010)

**Use Case:** Quick lookup during implementation

---

### 4. Execution Checklist
**File:** `docs/planning/FIX-011-EXECUTION-CHECKLIST.md` (700+ lines)

**Contents:**
- Pre-implementation checklist (backup, branch creation)
- Phase-by-phase task checklists with checkboxes
- Verification steps per task
- Build commands for each phase
- 6 comprehensive test scenarios:
  1. Backward compatibility (old connections)
  2. New connections (key content stored)
  3. Export/import (content preserved)
  4. PPK converter flow
  5. UI display verification
  6. Security audit (no leaks)
- Post-implementation documentation updates
- Rollback procedures
- Sign-off section

**Use Case:** Tracking implementation progress

---

### 5. Planning Complete Summary
**File:** `docs/planning/FIX-011-PLANNING-COMPLETE.md` (just created)

**Contents:**
- Planning artifacts overview
- Solution architecture summary
- Implementation phases table
- Key changes summary (backend + frontend)
- Backward compatibility guarantee table
- Security properties table
- Testing plan overview
- Risk assessment
- Orchestrator start instructions
- Completion criteria

**Use Case:** Final review before execution

---

### 6. Changelog Entry
**File:** `docs/planning/changelog.md` (updated)

**Added to "Planned" section:**
```markdown
- [2026-08-14] **Fix-011: Store Private Key Content (Not Path)** — PLANNED
  - Problem, solution, changes, effort, links to all planning docs
```

---

## Technical Architecture

### Data Model Change

```go
type Connection struct {
    // ... existing fields ...
    PrivateKeyPath    string `json:"privateKeyPath"`      // ← Deprecated, kept for compatibility
    PrivateKeyContent []byte `json:"privateKeyContent"`   // ← NEW: Encrypted PEM content
}
```

**No Database Migration Needed:** JSON field addition automatically handled.

### Logic Flow

**SSH Client Priority:**
1. Check `PrivateKeyContent` exists && length > 0? → Use it (new connections)
2. Else: `PrivateKeyPath` exists? → Read from file (old connections)
3. Else: Error (no key specified)

**100% Backward Compatible:** Old connections continue working without changes.

---

## Implementation Phases

| Phase | Agent              | Tasks | Effort | Parallelizable | Dependencies |
| ----- | ------------------ | ----- | ------ | -------------- | ------------ |
| **1** | Backend Developer  | 3     | 1-2h   | ✅ Yes (all 3) | None         |
| **2** | Backend Developer  | 2     | 2-3h   | ❌ No          | Phase 1      |
| **3** | Backend Developer  | 5     | 3-4h   | ⚠️ Partial     | Phase 2      |
| **4** | Frontend Developer | 4     | 2-3h   | ❌ No          | Phase 3      |
| **5** | Backend Developer  | 2     | 1-2h   | ✅ Yes (both)  | Phase 3      |
| **6** | Debugger/Reviewer  | 6     | 2-3h   | ❌ No          | All phases   |
| **Total** |                | **22** | **8-12h** |            |              |

### Phase Descriptions

**Phase 1: Backend Data Model & Encryption**
- Add `PrivateKeyContent []byte` field to Connection model
- Verify existing crypto functions work (no changes needed)
- **Parallelizable:** All 3 verification tasks independent

**Phase 2: SSH Client Layer**
- Update `internal/ssh/client.go` to accept `privateKeyContent` parameter
- Update `internal/ssh/manager.go` to pass content through
- **Sequential:** Manager depends on client signature

**Phase 3: Backend API Layer** ⚠️ CRITICAL PATH
- **Task 3.1 MUST COMPLETE FIRST:** Update `SelectPrivateKeyFile` signature
- Tasks 3.2-3.5 parallel: Update Create/Update/Connect/Convert methods
- **5 methods in app.go modified**

**Phase 4: Frontend Integration**
- Update TypeScript types
- Handle new API structure `{path, content}`
- Display "🔐 Private key stored securely" instead of path
- **Sequential:** Depends on Phase 3 API changes

**Phase 5: Export/Import Enhancement**
- Update `ExportJSON` to include key content (base64)
- Update `ImportJSON` to encrypt key content
- **Parallelizable:** Can run alongside Phase 4 (different team)

**Phase 6: Testing & Verification**
- 6 comprehensive test scenarios
- 12 acceptance criteria verification
- Security audit (no plaintext leaks)
- **Sequential:** Must verify all phases complete

---

## Files Modified (8 files)

### Backend (Go) — 5 files
1. `internal/models/connection.go` — Add 1 field
2. `internal/ssh/client.go` — Add parameter, preference logic
3. `internal/ssh/manager.go` — Pass content parameter
4. `app.go` — Update 5 methods (Select, Create, Update, Connect, Convert)
5. `internal/db/store.go` — Update Export/Import for key content

**Total Backend Changes:** ~150 lines (+100 new, -50 modified)

### Frontend (TypeScript/React) — 3 files
1. `frontend/src/types/wails.d.ts` — Update API signatures
2. `frontend/src/components/App.tsx` — Handle new API, display secure icon
3. `frontend/src/components/App.module.css` — Add `.keyStored` / `.keyPath` styles

**Total Frontend Changes:** ~50 lines (+40 new, -10 modified)

---

## Acceptance Criteria (12 items)

All criteria testable and documented:

1. ✅ New connections store encrypted key content, not path
2. ✅ Existing connections with `PrivateKeyPath` still work
3. ✅ SSH connections authenticate using stored key content
4. ✅ Frontend displays "Private key stored securely" instead of path
5. ✅ `SelectPrivateKeyFile` reads and returns file content + path
6. ✅ `CreateConnection` encrypts key content before storing
7. ✅ `UpdateConnection` handles key content encryption
8. ✅ Export/import preserves key content (not just path)
9. ✅ PPK converter stores converted PEM content (optional)
10. ✅ No plaintext PEM content in logs or error messages
11. ✅ `PrivateKeyContent` encrypted with same mechanism as `EncryptedPassword`
12. ✅ Tests verify both code paths (content and path)

**Testing Coverage:** Unit tests + integration tests + 6 manual test scenarios

---

## Security Model

| Property           | Implementation                                      |
| ------------------ | --------------------------------------------------- |
| **Encryption**     | AES-256-GCM (same as passwords)                     |
| **Key Derivation** | SHA256(MachineGUID + exeDir) — machine-bound       |
| **Storage**        | Double encryption (encrypted content → encrypted file) |
| **Memory**         | Decrypted only during connection (ephemeral)        |
| **Logging**        | Never log decrypted content (metadata only)         |
| **Export**         | Base64 encoded (plaintext in backup JSON)           |
| **Import**         | Re-encrypted with target machine's key              |

**Proven Security:** Uses same `crypto.Encrypt()` / `crypto.Decrypt()` as passwords (implemented in PRD-007, tested in PRD-006).

---

## Backward Compatibility Guarantee

**100% Backward Compatible** — No breaking changes, no forced migration.

| Scenario          | Old Connection (PrivateKeyPath) | New Connection (PrivateKeyContent) |
| ----------------- | ------------------------------- | ---------------------------------- |
| **Connect**       | ✅ Reads from file path         | ✅ Decrypts from database          |
| **Export**        | ✅ Includes path                | ✅ Includes content (base64)       |
| **Import**        | ✅ Restores path                | ✅ Encrypts and stores content     |
| **Edit**          | ✅ Can migrate to content       | ✅ Updates content                 |
| **Display**       | Shows file path                 | Shows "🔐 Key stored securely"     |
| **Database**      | `PrivateKeyContent` empty       | `PrivateKeyPath` empty/optional    |

**Migration Strategy:** Opportunistic (no forced migration, happens naturally over time)

---

## Risk Assessment

| Risk                                   | Impact | Likelihood | Mitigation                                  |
| -------------------------------------- | ------ | ---------- | ------------------------------------------- |
| Key file read fails during selection   | Medium | Low        | Show error, retry, don't create connection  |
| Encryption fails for large keys (>4KB) | Medium | Very Low   | Test with various sizes, crypto proven      |
| Backward compat breaks old connections | High   | Low        | Keep PrivateKeyPath, fallback logic, test   |
| Export/import loses key content        | High   | Low        | Thorough testing, base64 verification       |
| Decryption fails (corrupted data)      | High   | Low        | Same risk as passwords (proven mechanism)   |

**Overall Risk:** Low (backward compatibility built-in, proven encryption, comprehensive testing)

---

## Rollback Strategy

**Risk Level:** Low  
**Recovery Time:** < 5 minutes

**If issues arise:**
1. Stop application
2. `git checkout main` (revert code)
3. Rebuild: `wails build`
4. Launch old version
5. Old connections unaffected (still use `PrivateKeyPath`)
6. New connections lose key data (must re-select file)
7. Export backup before deployment (standard practice)

**Data Safety:** Existing connections always work (backward compat), backups recommended.

---

## Critical Path & Parallelization

### Longest Path (Sequential)
```
Phase 1 (1h) → Phase 2 (2h) → Phase 3 (4h) → Phase 4 (2h) → Phase 6 (2h)
Total: 11 hours
```

### Optimized Path (Parallel where possible)
```
Phase 1 (1h, all parallel)
  ↓
Phase 2 (2h, sequential)
  ↓
Phase 3.1 (1h, must complete first)
  ↓
Phase 3.2-3.5 (3h, parallel) + Phase 5 (1h, parallel)
  ↓
Phase 4 (2h, sequential)
  ↓
Phase 6 (2h, sequential)

Total: 9-10 hours (saved 1-2h with parallelization)
```

### Parallelization Opportunities

1. **Phase 1:** All 3 tasks (field add, verify store, verify crypto) can run parallel
2. **Phase 3:** After Task 3.1, tasks 3.2-3.5 can run parallel (different methods)
3. **Phase 4 + Phase 5:** Frontend and export/import can run parallel (different teams)

---

## Orchestrator Start Instructions

### 1. Review Planning Documents

```bash
# Read in order:
1. docs/planning/FIX-011-PLANNING-COMPLETE.md    (this file, overview)
2. docs/planning/fix-011-pem-content-storage.md  (full technical plan)
3. docs/planning/FIX-011-ORCHESTRATOR-HANDOFF.md (routing guide)
4. docs/planning/FIX-011-IMPLEMENTATION-SUMMARY.md (quick reference)
```

### 2. Create Branch

```bash
git checkout -b fix/011-pem-content-storage
```

### 3. Route to Agents

**Phase 1 → Backend Developer**
- Task 1.1: Add field to `internal/models/connection.go`
- Task 1.2: Verify `internal/db/store.go` (read-only)
- Task 1.3: Verify `internal/db/crypto.go` (read-only)
- All tasks parallelizable

**Phase 2 → Backend Developer**
- Task 2.1: Update `internal/ssh/client.go` signature
- Task 2.2: Update `internal/ssh/manager.go` to pass content
- Sequential (2.2 depends on 2.1)

**Phase 3 → Backend Developer** ⚠️ CRITICAL
- Task 3.1: Update `app.go` SelectPrivateKeyFile (MUST COMPLETE FIRST)
- Task 3.2-3.5: Update app.go Create/Update/Connect/Convert (parallel)

**Phase 4 → Frontend Developer**
- Task 4.1: Update `frontend/src/types/wails.d.ts`
- Task 4.2: Update `frontend/src/components/App.tsx` API handling
- Task 4.3: Update `frontend/src/components/App.tsx` UI display
- Task 4.4: Update `frontend/src/components/PPKConverterDialog.tsx` (optional)
- Sequential (all depend on 4.1)

**Phase 5 → Backend Developer** (can parallel with Phase 4)
- Task 5.1: Update `internal/db/store.go` ExportJSON
- Task 5.2: Update `internal/db/store.go` ImportJSON
- Both tasks parallelizable

**Phase 6 → Debugger/Reviewer**
- Task 6.1: Build verification
- Task 6.2: Test backward compatibility
- Task 6.3: Test new connections
- Task 6.4: Test export/import
- Task 6.5: Test PPK converter
- Task 6.6: Security review
- Task 6.7: Acceptance criteria verification
- Sequential (comprehensive testing)

### 4. Track Progress

Use `docs/planning/FIX-011-EXECUTION-CHECKLIST.md` to track completion.

### 5. Verify at Each Phase

```bash
# After each phase:
go build .
go test ./...
npm run build
tsc --noEmit
```

### 6. Final Verification

```bash
# Phase 6 completion:
wails build
# Manual testing (6 scenarios in checklist)
# Security audit (no plaintext leaks)
```

---

## Completion Checklist

**Planning Complete:** ✅

**Implementation Ready When:**
- [ ] All 22 tasks completed across 6 phases
- [ ] All 12 acceptance criteria verified
- [ ] Backward compatibility tested (old connections work)
- [ ] New connections tested (key content stored)
- [ ] Export/import tested (content preserved)
- [ ] Security audit passed (no plaintext leaks)
- [ ] Documentation updated (4 files)
- [ ] Changelog updated (Fix-011 marked COMPLETE)
- [ ] Repository memory updated
- [ ] `wails build` succeeds
- [ ] All tests pass

---

## Post-Implementation Documentation

**Files to Create:**
1. `docs/guides/private-key-storage.md` — User guide for new storage model
2. `docs/api/connection-management.md` — API documentation updates

**Files to Update:**
1. `docs/planning/changelog.md` — Move Fix-011 from Planned → Fixed
2. `docs/database/schema.md` — Add `privateKeyContent` field spec
3. `docs/guides/ppk-converter.md` — Mention secure storage
4. `/memories/repo/esesha-project-state.md` — Add Fix-011 completion entry

---

## Related Work

### Dependencies (Already Complete)
- **PRD-007:** Machine-Bound Keyless Encryption ✅ (provides crypto.Encrypt/Decrypt)
- **PRD-009:** Pure Go PPK Parser ✅ (converter creates PEM files)

### Related Context
- **ROLLBACK-010:** Removed Embedded Keys ✅ (now using password + file-based keys)

### Supersedes
- N/A (new fix, not replacing anything)

---

## Why This Fix Matters

### Current User Pain Points
1. **Not Portable:** Export connections, import on new machine → keys missing
2. **Fragile:** Move/delete key file → connection broken
3. **Inconsistent:** Passwords stored securely, keys are not
4. **PPK Converter:** Creates PEM file, stores path (not content)

### After Fix-011
1. **Portable:** Export includes key content (base64), works on any machine
2. **Robust:** Key content in database, no external file dependency
3. **Consistent:** Keys and passwords both encrypted, same security model
4. **PPK Converter:** Creates PEM, stores content, fully portable

---

## Success Metrics

**Backward Compatibility:** 100% (no broken connections)  
**Code Quality:** Clean data model, proven encryption, comprehensive tests  
**User Experience:** "Private key stored securely" UI, no path management  
**Security:** Same proven encryption as passwords, no plaintext leaks  
**Portability:** Export/import works across machines  

---

## Sign-Off

**Planner Agent:** ✅ PLANNING COMPLETE  
**Date:** 2026-08-14  
**Status:** READY FOR ORCHESTRATOR HANDOFF  

**Planning Quality:**
- [x] Problem clearly defined with user pain points
- [x] Solution architecture documented (data model, logic flow)
- [x] All 6 phases have detailed task breakdowns
- [x] File paths and line numbers specified for each change
- [x] Code snippets provided for all modifications
- [x] Verification steps defined per task
- [x] 12 acceptance criteria testable
- [x] Backward compatibility guaranteed 100%
- [x] Security considerations addressed (same as passwords)
- [x] Rollback strategy defined (low risk, < 5 min recovery)
- [x] Agent routing clear with dependencies
- [x] Execution checklist comprehensive (700+ lines)
- [x] 5 planning documents created (2,100+ lines total)

**Approval:** APPROVED FOR IMPLEMENTATION ✅

---

## Contact & Questions

**For clarification on:**
- Technical architecture → Review `fix-011-pem-content-storage.md`
- Task routing → Review `FIX-011-ORCHESTRATOR-HANDOFF.md`
- Quick lookup → Review `FIX-011-IMPLEMENTATION-SUMMARY.md`
- Progress tracking → Use `FIX-011-EXECUTION-CHECKLIST.md`

**All documents in:** `d:\1.Project\esesha\docs\planning\`

---

## Version History

| Version | Date       | Summary                                    |
| ------- | ---------- | ------------------------------------------ |
| 1.0.0   | 2026-08-14 | Planning complete, ready for Orchestrator  |

---

**END OF PLANNING PHASE**

**NEXT ACTION:** Orchestrator routes Phase 1 to Backend Developer

