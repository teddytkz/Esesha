# Fix-011B Planning Complete

**Date:** 2026-08-14  
**Planner:** Planner Agent  
**Status:** ✅ READY FOR IMPLEMENTATION

---

## Summary

**Fix-011B validation bug fix plan created successfully.**

**Scope:** Two backend validation bugs found during Fix-011 code review
- Bug #1: Missing PEM format validation in file selection
- Bug #2: Missing empty content check after decryption

**Type:** Minor bug fix (changelog entry + focused fix plan)

---

## Documents Created

1. **`fix-011b-validation-bugs.md`** — Full fix plan with technical details
2. **`FIX-011B-IMPLEMENTATION-SUMMARY.md`** — Quick reference for Orchestrator
3. **`FIX-011B-ORCHESTRATOR-HANDOFF.md`** — Routing and phase breakdown
4. **`FIX-011B-EXECUTION-CHECKLIST.md`** — Step-by-step implementation guide
5. **`changelog.md`** — Updated with Fix-011B entry

---

## Key Details

**Effort:** 1.5 hours  
**Agent:** Backend Developer  
**Files to Modify:** 2 (`app.go`, `internal/ssh/client.go`)  
**Parallelizable:** No (sequential implementation recommended)  
**Regression Risk:** Low  
**Testing:** `go test ./internal/ssh ./internal/db`

---

## Implementation Tasks

| Task | File                          | Change                                      |
|------|-------------------------------|---------------------------------------------|
| 1.1  | `app.go` (line 268-282)       | Add `ssh.ParsePrivateKey()` validation      |
| 1.2  | `internal/ssh/client.go` (75-82) | Add empty decrypted content check        |
| 1.3  | Test suite                    | Run tests, verify no regressions            |

---

## Acceptance Criteria

- [ ] Non-SSH files rejected with clear error message at selection time
- [ ] Valid SSH private keys accepted without error
- [ ] Empty decrypted content returns specific corruption/key error
- [ ] All existing SSH and DB tests pass
- [ ] Error messages are user-friendly and actionable

---

## Next Steps

**For Orchestrator:**
1. Route to Backend Developer
2. Monitor implementation via execution checklist
3. After completion, continue with Fix-011 Phase 4-6

**For Backend Developer:**
1. Read `FIX-011B-IMPLEMENTATION-SUMMARY.md`
2. Follow `FIX-011B-EXECUTION-CHECKLIST.md`
3. Implement both validation fixes
4. Run tests and report results

---

## Context

**Parent Task:** Fix-011 (PEM Content Storage)  
**Current State:** Fix-011 Phases 1-3 implemented, code review found 2 bugs  
**This Fix:** Address validation gaps before proceeding to Phase 4-6  
**Impact:** Better UX, prevents invalid data storage, clearer error messages

---

## Planning Checklist

- [x] Appropriate output type chosen (focused fix plan, not full PRD)
- [x] Every task has specific agent assigned (Backend Developer)
- [x] Every task lists exact file paths and line numbers
- [x] Acceptance criteria are testable
- [x] Codebase context referenced (existing error patterns)
- [x] Testing strategy defined
- [x] Rollback strategy included (simple revert)
- [x] All documents created and saved to `docs/planning/`
- [x] Changelog updated

---

**Status:** Planning complete. Ready for Orchestrator handoff.
