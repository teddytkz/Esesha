# Fix-011B Execution Checklist

**Agent:** Backend Developer  
**Date:** 2026-08-14  
**Status:** Ready for Execution

---

## Pre-Implementation

- [ ] Read `docs/planning/fix-011b-validation-bugs.md` (full plan)
- [ ] Read `docs/planning/FIX-011B-IMPLEMENTATION-SUMMARY.md` (quick reference)
- [ ] Verify current working directory: `d:\1.Project\esesha`
- [ ] Ensure Go environment is ready

---

## Task 1: Add PEM Validation in `app.go`

### Steps
- [ ] Open `d:\1.Project\esesha\app.go`
- [ ] Navigate to line 268-282 (`SelectPrivateKeyFile()` function)
- [ ] Add validation after reading file content (after line 266):
  ```go
  // Validate that the file is actually a valid SSH private key
  _, err = ssh.ParsePrivateKey(content)
  if err != nil {
      return PrivateKeyFileResult{}, fmt.Errorf("invalid SSH private key format: %w", err)
  }
  ```
- [ ] Verify `golang.org/x/crypto/ssh` is imported (already present)
- [ ] Save file

### Verification
- [ ] Code compiles without errors
- [ ] Validation happens before encryption
- [ ] Error message is clear and actionable

---

## Task 2: Add Empty Content Check in `internal/ssh/client.go`

### Steps
- [ ] Open `d:\1.Project\esesha\internal\ssh\client.go`
- [ ] Navigate to line 75-82 (`NewClientWithKeyPassphraseAndHostKey()` function)
- [ ] Add empty content check after decryption (after line 79):
  ```go
  if len(decryptedKey) == 0 {
      return nil, fmt.Errorf("decrypted private key is empty (database may be corrupted or encryption key changed)")
  }
  ```
- [ ] Save file

### Verification
- [ ] Code compiles without errors
- [ ] Check happens before assigning to `key` variable
- [ ] Error message explains possible root causes

---

## Task 3: Run Tests

### Commands
- [ ] Run SSH tests: `go test -v ./internal/ssh`
- [ ] Run DB tests: `go test -v ./internal/db`
- [ ] Verify all tests pass with no regressions

### Expected Results
- [ ] All existing tests pass
- [ ] No new test failures introduced
- [ ] Build succeeds: `go build`

---

## Manual Verification (Optional but Recommended)

### Bug #1 Verification
- [ ] Launch app
- [ ] Try to select a `.txt` file as private key
- [ ] Verify clear error message appears
- [ ] Select valid `.pem` file
- [ ] Verify it's accepted without error

### Bug #2 Verification
- [ ] Valid encrypted key in database works normally
- [ ] Error handling graceful if decryption fails

---

## Post-Implementation

- [ ] All tests passing
- [ ] No compilation errors
- [ ] Error messages tested and verified
- [ ] Report completion to Orchestrator

---

## Rollback (if needed)

If issues arise:
1. Revert changes to `app.go` (remove validation block)
2. Revert changes to `internal/ssh/client.go` (remove empty check)
3. Run tests to verify rollback successful
4. Report issues to Planner for revised approach

---

## Completion Report Template

```
Fix-011B Implementation Complete

✅ Task 1: PEM validation added in app.go (line 268-282)
✅ Task 2: Empty content check added in internal/ssh/client.go (line 75-82)
✅ Task 3: All tests passing (go test ./internal/ssh ./internal/db)

Test Results:
- internal/ssh tests: [PASS/FAIL] ([X] tests)
- internal/db tests: [PASS/FAIL] ([X] tests)

Manual Verification:
- Non-SSH file rejection: [TESTED/NOT TESTED]
- Valid SSH key acceptance: [TESTED/NOT TESTED]
- Error messages clear: [YES/NO]

Ready for: Fix-011 Phase 4-6 (Export/Import changes)
```

---

**Next Steps:** After completion, proceed to Fix-011 Phase 4-6 per `docs/planning/fix-011-pem-content-storage.md`
