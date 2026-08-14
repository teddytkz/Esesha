# Fix-011B Orchestrator Handoff

**Date:** 2026-08-14  
**Planner:** Planner Agent  
**Status:** Ready for Implementation

---

## Task Summary

**Fix two validation bugs found during Fix-011 code review** — missing PEM validation and empty content check.

---

## Implementation Phases

### Phase 1: Backend Validation Fixes

**Agent:** Backend Developer  
**Parallelizable:** No (both changes in closely related code)  
**Estimated Time:** 1.5 hours

| Task | Files                        | Description                                                    |
|------|------------------------------|----------------------------------------------------------------|
| 1.1  | `app.go`                     | Add `ssh.ParsePrivateKey()` validation after reading file content (line 268-282) |
| 1.2  | `internal/ssh/client.go`     | Add empty content check after decryption (line 75-82)         |
| 1.3  | Test suite                   | Run `go test ./internal/ssh ./internal/db` to verify no regressions |

---

## Agent Assignment

**Backend Developer:**
1. Read `docs/planning/fix-011b-validation-bugs.md` (full implementation guide)
2. Read `docs/planning/FIX-011B-IMPLEMENTATION-SUMMARY.md` (quick reference)
3. Implement Task 1.1: Add PEM validation in `app.go`
4. Implement Task 1.2: Add empty content check in `internal/ssh/client.go`
5. Run test suite and verify all tests pass
6. Report completion with test results

---

## Dependencies

**None** — this is a self-contained bug fix.

---

## Acceptance Criteria Checklist

- [ ] Bug #1 fixed: Non-SSH files rejected with clear error message
- [ ] Bug #1 verified: Valid SSH keys accepted without error
- [ ] Bug #2 fixed: Empty decrypted content returns specific error
- [ ] Bug #2 verified: Valid decrypted content works normally
- [ ] All tests pass: `go test ./internal/ssh ./internal/db`
- [ ] Error messages are user-friendly and actionable

---

## Next Steps After Completion

**After Fix-011B is complete:**
1. Continue with Fix-011 Phase 4-6 (Export/Import changes)
2. Final integration testing of complete Fix-011
3. Mark Fix-011 as complete

---

## Files Reference

- **Full Plan:** `docs/planning/fix-011b-validation-bugs.md`
- **Quick Reference:** `docs/planning/FIX-011B-IMPLEMENTATION-SUMMARY.md`
- **Changelog Entry:** `docs/planning/changelog.md` (already updated)
- **Parent Task:** `docs/planning/fix-011-pem-content-storage.md`
