# Fix-011: Store Private Key Content (Not Path) — Planning Complete

**Status:** ✅ PLANNING COMPLETE — Ready for Implementation  
**Date:** 2026-08-14  
**Type:** Bug Fix / Architectural Improvement  
**Priority:** Medium  
**Estimated Effort:** 8-12 hours (1-2 days)

---

## Planning Artifacts Created

All planning documents have been created and are ready for the Orchestrator:

### Core Planning Documents

1. **`fix-011-pem-content-storage.md`** (500+ lines)
   - Full fix plan with detailed technical specification
   - Root cause analysis
   - Implementation strategy (Option A: backward compatible)
   - 6 implementation phases with task breakdowns
   - Data model changes (before/after)
   - Code flow diagrams
   - Backward compatibility strategy
   - Security considerations
   - Testing strategy (unit, integration, manual)
   - Rollback strategy
   - Risks & mitigations
   - Documentation updates needed

2. **`FIX-011-ORCHESTRATOR-HANDOFF.md`** (600+ lines)
   - Agent routing instructions
   - Execution order with dependencies
   - Detailed task-by-task implementation guide
   - Code snippets for each change
   - Verification steps per task
   - Parallelization opportunities
   - Completion checklist

3. **`FIX-011-IMPLEMENTATION-SUMMARY.md`** (300+ lines)
   - Quick reference for Orchestrator
   - Phase overview with effort estimates
   - Key files modified list
   - Acceptance criteria (12 items)
   - Backward compatibility guarantee
   - Security model summary
   - Agent routing table

4. **`FIX-011-EXECUTION-CHECKLIST.md`** (700+ lines)
   - Step-by-step checklist for each phase
   - Verification steps per task
   - Build verification commands
   - Testing procedures (6 test scenarios)
   - Post-implementation documentation updates
   - Rollback procedures
   - Completion sign-off section

5. **`changelog.md`** (updated)
   - Fix-011 added to "Planned" section
   - Summary of changes
   - Links to all planning documents

---

## Problem Summary

**Current Behavior:**
- `Connection.PrivateKeyPath` stores file path string
- At connection time: `ioutil.ReadFile(privateKeyPath)` reads from filesystem
- Issues: not portable, breaks if file moved/deleted, export/import broken

**New Behavior:**
- `Connection.PrivateKeyContent` stores encrypted PEM content
- At connection time: decrypt content from database
- Benefits: portable, self-contained, export/import works correctly

---

## Solution Architecture

### Data Model Change

```go
// OLD (Current)
type Connection struct {
    PrivateKeyPath string `json:"privateKeyPath"`  // File path only
}

// NEW (After Fix-011)
type Connection struct {
    PrivateKeyPath    string `json:"privateKeyPath"`      // Deprecated, backward compat
    PrivateKeyContent []byte `json:"privateKeyContent"`   // NEW: Encrypted PEM bytes
}
```

### Preference Order

```
SSH Client checks:
1. PrivateKeyContent exists && length > 0? → Use it (new connections)
2. Else: PrivateKeyPath exists? → Read from file (old connections)
3. Else: Error (no key specified)
```

### Encryption Flow

```
User selects key file
  ↓
Read file content immediately (os.ReadFile)
  ↓
Encrypt with crypto.Encrypt() (AES-256-GCM)
  ↓
Store in Connection.PrivateKeyContent
  ↓
Save to esesha.bin (double encryption: content encrypted, file encrypted)
```

### Connection Flow

```
User clicks "Connect"
  ↓
Load Connection from database
  ↓
Check PrivateKeyContent first
  ↓
If exists: crypto.Decrypt(PrivateKeyContent)
  ↓
Else: ioutil.ReadFile(PrivateKeyPath) [backward compat]
  ↓
Parse SSH key
  ↓
Establish connection
```

---

## Implementation Phases

| Phase | Agent              | Effort  | Parallelizable | Dependencies |
| ----- | ------------------ | ------- | -------------- | ------------ |
| 1     | Backend Developer  | 1-2h    | Yes (all 3)    | None         |
| 2     | Backend Developer  | 2-3h    | No             | Phase 1      |
| 3     | Backend Developer  | 3-4h    | Partial        | Phase 2      |
| 4     | Frontend Developer | 2-3h    | No             | Phase 3      |
| 5     | Backend Developer  | 1-2h    | Yes (both)     | Phase 3      |
| 6     | Debugger/Reviewer  | 2-3h    | No             | All phases   |
| **Total** | **8-12h**      |         |                |              |

---

## Key Changes Summary

### Backend (Go)

**Files Modified:** 5
- `internal/models/connection.go` — Add `PrivateKeyContent []byte` field
- `internal/ssh/client.go` — Prefer content over path, add parameter
- `internal/ssh/manager.go` — Pass content parameter through
- `app.go` — Update 5 methods (SelectPrivateKeyFile, CreateConnection, UpdateConnection, ConnectSSHWithPassphrase, ConvertPPKToPEM)
- `internal/db/store.go` — Update ExportJSON/ImportJSON for key content

**Lines Changed:** ~150 lines total
- +100 new lines
- -50 modified lines

### Frontend (TypeScript/React)

**Files Modified:** 3
- `frontend/src/types/wails.d.ts` — Update API signatures
- `frontend/src/components/App.tsx` — Handle new API, display "Key stored securely"
- `frontend/src/components/App.module.css` — Add `.keyStored` and `.keyPath` styles

**Lines Changed:** ~50 lines total
- +40 new lines
- -10 modified lines

---

## Backward Compatibility Guarantee

✅ **100% Backward Compatible**

| Scenario | Old Connection (PrivateKeyPath) | New Connection (PrivateKeyContent) |
| -------- | ------------------------------- | ---------------------------------- |
| Connect | ✅ Reads from file path | ✅ Decrypts from database |
| Export | ✅ Includes path (works) | ✅ Includes content (base64) |
| Import | ✅ Restores path | ✅ Encrypts and stores content |
| Edit | ✅ Can migrate to content | ✅ Updates content |
| Display | Shows file path | Shows "🔐 Private key stored securely" |

**Migration Strategy:** Opportunistic (happens naturally, no forced migration)

---

## Security Properties

| Property | Implementation |
| -------- | -------------- |
| Encryption | AES-256-GCM with machine-bound key |
| Key Derivation | SHA256(MachineGUID + exeDir) |
| Storage | Double encryption (content encrypted → stored in encrypted file) |
| Memory | Decrypted only during connection (same as passwords) |
| Logging | Never log decrypted content (only metadata) |
| Export | Base64 encoded (plaintext in backup JSON) |
| Import | Re-encrypted with target machine's key |

**Same Security Model as Passwords** — uses identical `crypto.Encrypt()` / `crypto.Decrypt()` functions

---

## Acceptance Criteria (12 items)

All criteria defined and testable:

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

---

## Testing Plan

### Unit Tests (Existing)
- `internal/db/crypto_test.go` — Encrypt/decrypt PEM content
- `internal/ssh/client_test.go` — Mock connections with content vs path

### Integration Tests (To Add)
- Create connection with key content → verify encrypted storage
- Connect using stored key content → verify successful auth
- Export/import → verify content preserved

### Manual Tests (6 scenarios)
1. Backward compatibility (old connections)
2. New connection (key content stored)
3. Export/import (content preserved)
4. PPK converter (content stored after conversion)
5. UI display (secure icon vs path)
6. Security audit (no plaintext leaks)

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
| ---- | ------ | ---------- | ---------- |
| Key file read fails | Medium | Low | Show error, retry |
| Backward compat breaks | High | Low | Keep PrivateKeyPath, fallback logic |
| Export/import loses keys | High | Low | Test thoroughly, verify base64 |
| Decryption fails | High | Low | Same as passwords (proven) |
| Large keys (>4KB) fail | Medium | Very Low | Test with various sizes |

**Overall Risk:** Low (backward compatibility built-in, proven encryption)

---

## Rollback Strategy

**Risk Level:** Low

If issues arise:
1. Revert code changes (git checkout)
2. Rebuild application
3. Old connections unaffected (still use PrivateKeyPath)
4. New connections lose key data (must re-select file)
5. Export backup before deployment (standard practice)

**Recovery Time:** < 5 minutes (simple git revert)

---

## Documentation Requirements

### To Create (Post-Implementation)
- `docs/guides/private-key-storage.md` — User guide for new storage model
- `docs/api/connection-management.md` — API documentation updates

### To Update (Post-Implementation)
- `docs/planning/changelog.md` — Move Fix-011 from Planned → Fixed
- `docs/database/schema.md` — Add PrivateKeyContent field spec
- `docs/guides/ppk-converter.md` — Mention secure storage
- `/memories/repo/esesha-project-state.md` — Add Fix-011 completion entry

---

## Related Work

### Supersedes
- N/A (new fix, not replacing anything)

### Depends On
- PRD-007: Machine-Bound Keyless Encryption (provides crypto.Encrypt/Decrypt)
- PRD-009: Pure Go PPK Parser (converter creates PEM files)

### Related
- ROLLBACK-010: Removed embedded keys (reverted to password + file-based keys)

---

## Orchestrator Instructions

### Start Implementation

```bash
# 1. Create branch
git checkout -b fix/011-pem-content-storage

# 2. Read planning docs
cat docs/planning/fix-011-pem-content-storage.md
cat docs/planning/FIX-011-ORCHESTRATOR-HANDOFF.md

# 3. Route to agents (follow handoff doc)
Phase 1 → Backend Developer
Phase 2 → Backend Developer
Phase 3 → Backend Developer (Task 3.1 first!)
Phase 4 → Frontend Developer
Phase 5 → Backend Developer (parallel with Phase 4)
Phase 6 → Debugger/Reviewer

# 4. Verify at each phase
go build .
go test ./...
npm run build
```

### Critical Path

```
Phase 1 → Phase 2 → Phase 3.1 → Phase 3.2-3.5 → Phase 4 & 5 (parallel) → Phase 6
```

**Longest Path:** Phase 1 (1h) → Phase 2 (2h) → Phase 3 (4h) → Phase 4 (2h) → Phase 6 (2h) = **11 hours**

**With Parallelization:** Phase 5 runs parallel with Phase 4, saving 1-2 hours → **9-10 hours**

---

## Completion Criteria

Implementation is complete when:

- [x] All planning documents created
- [ ] All 6 phases implemented
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

## Next Steps

**For Orchestrator:**

1. ✅ Review planning documents (this file + 4 planning docs)
2. Route Phase 1 to Backend Developer
3. Monitor progress through execution checklist
4. Ensure Phase 3 Task 3.1 completes before 3.2-3.5
5. Parallelize Phase 4 and Phase 5 (different agents)
6. Route Phase 6 to Debugger/Reviewer for final verification
7. Update changelog when complete

**For Backend Developer:**

Start with Phase 1 Task 1.1:
- Open `internal/models/connection.go`
- Add `PrivateKeyContent []byte` field
- Follow checklist in `FIX-011-EXECUTION-CHECKLIST.md`

**For Frontend Developer:**

Wait for Phase 3 completion, then:
- Start with Phase 4 Task 4.1
- Update TypeScript types first
- Follow checklist in `FIX-011-EXECUTION-CHECKLIST.md`

---

## Planning Documents Location

All documents in: `d:\1.Project\esesha\docs\planning\`

```
docs/planning/
├── fix-011-pem-content-storage.md           (Full plan, 500+ lines)
├── FIX-011-ORCHESTRATOR-HANDOFF.md          (Routing guide, 600+ lines)
├── FIX-011-IMPLEMENTATION-SUMMARY.md        (Quick reference, 300+ lines)
├── FIX-011-EXECUTION-CHECKLIST.md           (Step-by-step, 700+ lines)
└── changelog.md                              (Updated with Fix-011)
```

**Total Planning Documentation:** 2,100+ lines across 5 files

---

## Sign-Off

**Planning completed by:** Planner Agent  
**Date:** 2026-08-14  
**Status:** ✅ COMPLETE — Ready for Implementation

**Planning Quality Checklist:**
- [x] Problem clearly defined
- [x] Solution architecture documented
- [x] All phases have task breakdowns
- [x] File paths and line numbers specified
- [x] Code snippets provided for each change
- [x] Verification steps defined
- [x] Acceptance criteria testable
- [x] Backward compatibility guaranteed
- [x] Security considerations addressed
- [x] Rollback strategy defined
- [x] Agent routing clear
- [x] Execution checklist comprehensive

**Approval:** Ready for Orchestrator handoff ✅

---

## Version History

| Version | Date       | Summary                      |
| ------- | ---------- | ---------------------------- |
| 1.0.0   | 2026-08-14 | Planning complete, ready for implementation |
