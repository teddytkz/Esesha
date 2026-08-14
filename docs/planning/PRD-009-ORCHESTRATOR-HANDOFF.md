# PRD-009 Orchestrator Handoff

**PRD:** prd-009-pure-go-ppk-parser.md  
**Type:** Refactoring  
**Status:** Ready for implementation  
**Created:** 2026-08-14  
**Estimated Duration:** 3-4 hours

---

## Quick Context

**User request:** "saya tidak install putty, bisa engga kalo tanpa install putty"  
**Translation:** "I don't have PuTTY installed, can we do it without installing PuTTY?"

**Solution:** Replace `puttygen.exe` external process with pure Go PPK parser library.

**Impact:**
- ✅ Zero breaking changes (API preserved)
- ✅ Zero UI changes (frontend untouched)
- ✅ Removes PuTTY installation requirement
- ✅ Improves security (no passphrase in command line)
- ✅ Faster conversion (< 500ms vs 1-2s)

---

## Implementation Strategy

### Phase Structure

```
Phase 1: Core Conversion (Sequential)    → 1.5 hours
Phase 2: Testing (5 parallel tasks)      → 1 hour
Phase 3: Build + Docs (2 parallel tracks)→ 30 minutes
Phase 4: Review + Security (parallel)    → 30 minutes
```

**Total:** 3.5 hours

---

## Phase 1: Core Conversion (Backend Developer)

**Dependencies:** None  
**Parallelization:** ❌ Sequential only (core refactor)  
**Duration:** 1.5 hours

### Tasks

#### Task 1.1: Add dependency
```powershell
go get github.com/edutko/putty-go
```
**Files:** `go.mod`, `go.sum`

#### Task 1.2: Replace puttygen.exe logic
**File:** `internal/converter/ppk.go`  
**Action:** Replace `exec.Command("puttygen.exe")` with `ppk.LoadKeypair()`  
**Lines to change:** ~40 lines (remove puttygen execution logic)  
**Reference:** `poc/ppk-pure-go/main.go` lines 60-70

**Before:**
```go
cmd := exec.Command(puttygenPath, args...)
output, err := cmd.CombinedOutput()
```

**After:**
```go
var passphraseBytes []byte
if passphrase != "" {
    passphraseBytes = []byte(passphrase)
} else {
    passphraseBytes = ppk.NoPassphrase
}

keyPair, err := ppk.LoadKeypair(ppkPath, passphraseBytes)
if err != nil {
    return translatePPKError(err)
}
```

#### Task 1.3: Implement marshalPrivateKeyToPEM helper
**File:** `internal/converter/ppk.go`  
**Action:** Add new function to convert private key to PEM format  
**Lines to add:** ~30 lines (new function)  
**Reference:** `poc/ppk-pure-go/main.go` lines 100-120

**Function signature:**
```go
func marshalPrivateKeyToPEM(privateKey interface{}) ([]byte, error)
```

**Must handle:**
- RSA keys → `x509.MarshalPKCS1PrivateKey()` → "RSA PRIVATE KEY"
- ECDSA keys → `x509.MarshalECPrivateKey()` → "EC PRIVATE KEY"
- Ed25519 keys → `x509.MarshalPKCS8PrivateKey()` → "PRIVATE KEY"

#### Task 1.4: Remove puttygen.exe validation
**File:** `internal/converter/ppk.go`  
**Action:** Delete `exec.LookPath("puttygen.exe")` check  
**Lines to remove:** ~5 lines

#### Task 1.5: Update error messages
**File:** `internal/converter/ppk.go`  
**Action:** Remove "install PuTTY from https://www.putty.org/" references  
**Lines to change:** ~10 lines

**Agent instructions:**
- Keep the same function signature: `func ConvertPPKToPEM(ppkPath, pemPath, passphrase string) error`
- Preserve PPK header validation (`PuTTY-User-Key-File-2` / `PuTTY-User-Key-File-3`)
- Keep file permission setting (`os.Chmod(pemPath, 0600)`)
- Import required packages:
  - `github.com/edutko/putty-go/ppk`
  - `crypto/x509`
  - `encoding/pem`
- Remove imports:
  - `os/exec` (no longer needed)
  - `runtime` (no longer needed)

---

## Phase 2: Testing (Backend Developer)

**Dependencies:** Phase 1 complete  
**Parallelization:** ✅ All 5 tasks can run in parallel  
**Duration:** 1 hour

### Task 2.1: Test encrypted RSA PPK
**File:** `internal/converter/ppk_test.go`  
**Function:** `TestConvertPPKToPEM_EncryptedRSA`  
**Test scenario:**
- Create/use encrypted RSA PPK file
- Convert with correct passphrase
- Verify PEM output is valid RSA key
- Check file permissions (0600)

### Task 2.2: Test unencrypted ECDSA PPK
**File:** `internal/converter/ppk_test.go`  
**Function:** `TestConvertPPKToPEM_UnencryptedECDSA`  
**Test scenario:**
- Use unencrypted ECDSA PPK (P-256/P-384/P-521)
- Convert with empty passphrase
- Verify PEM output is valid ECDSA key

### Task 2.3: Test Ed25519 key
**File:** `internal/converter/ppk_test.go`  
**Function:** `TestConvertPPKToPEM_Ed25519`  
**Test scenario:**
- Use Ed25519 PPK file
- Convert successfully
- Verify PEM output format

### Task 2.4: Test wrong passphrase
**File:** `internal/converter/ppk_test.go`  
**Function:** `TestConvertPPKToPEM_WrongPassphrase`  
**Test scenario:**
- Use encrypted PPK
- Try conversion with wrong passphrase
- Verify error message contains "Incorrect passphrase"

### Task 2.5: Test PPK v3 format
**File:** `internal/converter/ppk_test.go`  
**Function:** `TestConvertPPKToPEM_PPKv3`  
**Test scenario:**
- Use PPK v3 format file (Argon2 KDF)
- Convert successfully
- Verify output identical to PPK v2

**Agent instructions:**
- Use `t.TempDir()` for test files
- Existing tests (`TestConvertPPKToPEM_InvalidFile`, `TestConvertPPKToPEM_FileNotFound`) should still pass
- If real PPK test files don't exist, create minimal valid ones programmatically

---

## Phase 3: Build Verification & Documentation

**Dependencies:** Phase 2 complete  
**Parallelization:** ✅ Two independent tracks  
**Duration:** 30 minutes

### Track A: Build Verification (Backend Developer)

#### Task 3.1: Run converter tests
```powershell
go test ./internal/converter/ -v
```
**Expected:** All tests pass (2 existing + 5 new = 7 tests)

#### Task 3.2: Build all packages
```powershell
go build ./...
```
**Expected:** Exit code 0, no compilation errors

#### Task 3.3: Build Wails application
```powershell
wails build
```
**Expected:** `build\bin\esesha.exe` created successfully

### Track B: Documentation (Documentation Agent)

#### Task 3.4: Update user guide
**File:** `docs/guides/ppk-converter.md`

**Changes:**
1. Remove section "Requirements"
   - Delete: "PuTTY must be installed"
   - Delete: "puttygen.exe must be in PATH"
   - Delete: Link to https://www.putty.org/

2. Update "How It Works" section
   - Change from: "Uses puttygen.exe to convert"
   - Change to: "Uses built-in PPK parser to convert"

3. Add benefits section
   - "No external dependencies required"
   - "Faster conversion (< 500ms)"
   - "Secure in-memory passphrase handling"

#### Task 3.5: Verify changelog entry
**File:** `docs/planning/changelog.md`  
**Action:** Confirm PRD-009 entry exists under `[Unreleased] → Changed`  
**Status:** Already added ✅

---

## Phase 4: Review & Security Check

**Dependencies:** Phase 3 complete  
**Parallelization:** ✅ Parallel review  
**Duration:** 30 minutes

### Track A: Functional Review (Debugger/Reviewer)

#### Task 4.1: Verify acceptance criteria
**Checklist:**
- [ ] API signature unchanged (`ConvertPPKToPEM(ppkPath, pemPath, passphrase string) error`)
- [ ] PPK v2 format supported
- [ ] PPK v3 format supported
- [ ] Encrypted keys work with passphrase
- [ ] Unencrypted keys work
- [ ] RSA keys convert successfully
- [ ] ECDSA keys convert successfully
- [ ] Ed25519 keys convert successfully
- [ ] Invalid PPK → clear error message
- [ ] Wrong passphrase → clear error message
- [ ] All unit tests pass

#### Task 4.2: Manual test - encrypted RSA
**Action:**
1. Find or create encrypted RSA PPK file
2. Open PPK Converter dialog in app
3. Select PPK file
4. Enter passphrase
5. Convert to PEM
6. Verify PEM file created successfully

**Expected:** Success message, PEM file created with 0600 permissions

#### Task 4.3: Manual test - wrong passphrase
**Action:**
1. Use encrypted PPK file
2. Enter incorrect passphrase
3. Attempt conversion

**Expected:** Error message "Incorrect passphrase or corrupted PPK file"

#### Task 4.4: Performance check
**Action:**
1. Time multiple conversions
2. Measure average duration

**Expected:** < 500ms per conversion (vs 1-2s with puttygen.exe)

### Track B: Security Review (Security Agent)

#### Task 4.5: Passphrase handling audit
**Check:**
- [ ] Passphrase converted to `[]byte` immediately
- [ ] No passphrase logging in code
- [ ] No `fmt.Printf` or `log.Printf` with passphrase
- [ ] Passphrase not stored in struct fields
- [ ] Error messages don't echo passphrase back

#### Task 4.6: File permissions
**Check:**
- [ ] Output PEM created with `0600` (owner read/write only)
- [ ] No world-readable or group-readable permissions

#### Task 4.7: Memory safety
**Check:**
- [ ] No buffer overflows in PEM marshaling
- [ ] Proper error handling (no panics)
- [ ] Temporary data cleaned up

---

## File Checklist

### Files to Modify
- [x] `go.mod` — Add `github.com/edutko/putty-go`
- [x] `go.sum` — Auto-generated
- [ ] `internal/converter/ppk.go` — Replace puttygen.exe logic
- [ ] `internal/converter/ppk_test.go` — Add 5 new tests
- [ ] `docs/guides/ppk-converter.md` — Remove PuTTY requirement
- [x] `docs/planning/changelog.md` — PRD-009 entry (already added)

### Files Created
- [x] `docs/planning/prd-009-pure-go-ppk-parser.md` — Full PRD
- [x] `docs/planning/PRD-009-IMPLEMENTATION-SUMMARY.md` — Implementation guide
- [x] `docs/planning/PRD-009-ORCHESTRATOR-HANDOFF.md` — This file

### Reference Files
- `poc/ppk-pure-go/main.go` — Working implementation example
- `docs/research/ppk-to-pem-alternatives.md` — Library evaluation
- `docs/research/RESEARCH-SUMMARY.md` — Executive summary

---

## Acceptance Criteria (Final Checklist)

### API & Compatibility
- [ ] `ConvertPPKToPEM` signature unchanged
- [ ] PPK v2 format works (encrypted/unencrypted)
- [ ] PPK v3 format works (encrypted/unencrypted)
- [ ] RSA keys convert successfully
- [ ] ECDSA keys convert successfully
- [ ] Ed25519 keys convert successfully

### Error Handling
- [ ] Invalid PPK format → clear error
- [ ] Wrong passphrase → clear error
- [ ] Missing passphrase (encrypted key) → clear error
- [ ] File not found → clear error

### Security
- [ ] Passphrase not in process list
- [ ] PEM output has 0600 permissions
- [ ] No passphrase logging/leakage

### Testing
- [ ] All existing tests pass
- [ ] 5 new comprehensive tests added
- [ ] `go test ./internal/converter/` passes
- [ ] `go build ./...` successful
- [ ] `wails build` successful

### Performance
- [ ] Conversion time < 500ms

### Documentation
- [ ] `docs/guides/ppk-converter.md` updated
- [ ] `docs/planning/changelog.md` has PRD-009 entry

---

## Success Criteria

When all phases complete:

1. **No external dependencies** — PuTTY not required
2. **Zero breaking changes** — API signature preserved
3. **Zero UI changes** — Frontend untouched
4. **Better security** — Passphrase in-memory only
5. **Faster conversion** — < 500ms vs 1-2s
6. **All tests pass** — 7/7 unit tests green
7. **Build succeeds** — `wails build` creates `esesha.exe`
8. **Documentation updated** — No PuTTY mentioned

---

## Rollback Plan

If critical issues found:

```powershell
# Revert code changes
git checkout HEAD~1 -- internal/converter/ppk.go
git checkout HEAD~1 -- internal/converter/ppk_test.go
git checkout HEAD~1 -- go.mod go.sum

# Clean up
go mod tidy

# Rebuild
wails build
```

**Time to rollback:** ~5 minutes  
**Data impact:** None (conversion is stateless)

---

## Risk Assessment

**Overall Risk:** LOW

| Risk | Mitigation |
|------|------------|
| Library unmaintained (3 years) | PPK format stable since 2021, can fork if needed |
| 0 GitHub stars | Code quality validated, 70+ tests in library |
| Breaking existing conversions | Comprehensive tests, PoC validated, API preserved |
| Ed448 not supported | Extremely rare, Ed25519/RSA/ECDSA cover 99.9% |

---

## Ready for Orchestrator

✅ All planning documents created  
✅ Phases defined with clear dependencies  
✅ Agent assignments specified  
✅ Parallelization opportunities identified  
✅ Acceptance criteria defined  
✅ Rollback plan documented  
✅ Research complete and validated  

**Next action:** Orchestrator assigns Backend Developer to Phase 1, Task 1.1

---

**End of Handoff Document**
