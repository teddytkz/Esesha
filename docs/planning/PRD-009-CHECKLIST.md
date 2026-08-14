# PRD-009 Implementation Checklist

**PRD:** prd-009-pure-go-ppk-parser.md  
**Status:** Ready for implementation  
**Created:** 2026-08-14  
**Estimated Duration:** 3-4 hours

---

## Phase 1: Core Conversion (1.5 hours)

### Task 1.1: Add dependency
- [ ] Run `go get github.com/edutko/putty-go`
- [ ] Verify `go.mod` contains `github.com/edutko/putty-go`
- [ ] Verify `go.sum` updated

### Task 1.2: Replace exec.Command with ppk.LoadKeypair
- [ ] Remove `exec.Command("puttygen.exe")` logic
- [ ] Remove `exec.LookPath("puttygen.exe")` check
- [ ] Add `ppk.LoadKeypair(ppkPath, passphraseBytes)` call
- [ ] Handle passphrase conversion (`[]byte(passphrase)` or `ppk.NoPassphrase`)
- [ ] Add import: `github.com/edutko/putty-go/ppk`
- [ ] Remove import: `os/exec`
- [ ] Remove import: `runtime` (if no longer needed)

### Task 1.3: Implement marshalPrivateKeyToPEM helper
- [ ] Create function `marshalPrivateKeyToPEM(privateKey interface{}) ([]byte, error)`
- [ ] Handle RSA keys: `x509.MarshalPKCS1PrivateKey()` → "RSA PRIVATE KEY"
- [ ] Handle ECDSA keys: `x509.MarshalECPrivateKey()` → "EC PRIVATE KEY"
- [ ] Handle Ed25519 keys: `x509.MarshalPKCS8PrivateKey()` → "PRIVATE KEY"
- [ ] Return proper error for unknown key types
- [ ] Add import: `crypto/x509`
- [ ] Add import: `encoding/pem`

### Task 1.4: Remove puttygen.exe validation
- [ ] Delete Windows platform check (`runtime.GOOS != "windows"`)
- [ ] Delete puttygen.exe PATH lookup
- [ ] Remove error message "puttygen.exe not found in PATH"

### Task 1.5: Update error messages
- [ ] Remove "Please install PuTTY from https://www.putty.org/"
- [ ] Keep PPK format validation errors
- [ ] Keep passphrase validation errors
- [ ] Update error translation for library-specific messages

### Task 1.6: Preserve existing behavior
- [ ] Function signature unchanged: `func ConvertPPKToPEM(ppkPath, pemPath, passphrase string) error`
- [ ] PPK header validation kept (`PuTTY-User-Key-File-2` / `PuTTY-User-Key-File-3`)
- [ ] Encryption detection kept (`Encryption: aes256-cbc` / `aes128-cbc`)
- [ ] File permission setting kept (`os.Chmod(pemPath, 0600)`)
- [ ] File existence check kept

---

## Phase 2: Testing (1 hour)

### Task 2.1: Test encrypted RSA PPK
- [ ] Create test function `TestConvertPPKToPEM_EncryptedRSA`
- [ ] Use or create encrypted RSA PPK file
- [ ] Convert with correct passphrase
- [ ] Verify PEM file created
- [ ] Verify PEM contains valid RSA key
- [ ] Check file permissions (0600)

### Task 2.2: Test unencrypted ECDSA PPK
- [ ] Create test function `TestConvertPPKToPEM_UnencryptedECDSA`
- [ ] Use or create unencrypted ECDSA PPK
- [ ] Convert with empty passphrase
- [ ] Verify PEM file created
- [ ] Verify PEM contains valid ECDSA key

### Task 2.3: Test Ed25519 key
- [ ] Create test function `TestConvertPPKToPEM_Ed25519`
- [ ] Use or create Ed25519 PPK file
- [ ] Convert successfully
- [ ] Verify PEM output format

### Task 2.4: Test wrong passphrase
- [ ] Create test function `TestConvertPPKToPEM_WrongPassphrase`
- [ ] Use encrypted PPK file
- [ ] Try conversion with incorrect passphrase
- [ ] Verify error returned
- [ ] Verify error message mentions "passphrase" or "password"

### Task 2.5: Test PPK v3 format
- [ ] Create test function `TestConvertPPKToPEM_PPKv3`
- [ ] Use or create PPK v3 format file (Argon2 KDF)
- [ ] Convert successfully
- [ ] Verify output identical to PPK v2 conversion

### Task 2.6: Verify existing tests
- [ ] Run `go test ./internal/converter/`
- [ ] Verify `TestConvertPPKToPEM_InvalidFile` still passes
- [ ] Verify `TestConvertPPKToPEM_FileNotFound` still passes

---

## Phase 3: Build Verification & Documentation (30 minutes)

### Track A: Build Verification

#### Task 3.1: Run converter tests
- [ ] Execute: `go test ./internal/converter/ -v`
- [ ] All tests pass (7 total: 2 existing + 5 new)
- [ ] No test failures
- [ ] No panics or crashes

#### Task 3.2: Build all packages
- [ ] Execute: `go build ./...`
- [ ] Exit code 0
- [ ] No compilation errors
- [ ] No import errors

#### Task 3.3: Build Wails application
- [ ] Execute: `wails build`
- [ ] Build completes successfully
- [ ] `build\bin\esesha.exe` created
- [ ] File size reasonable (expect +200KB for library)

### Track B: Documentation

#### Task 3.4: Update user guide
- [ ] Open `docs/guides/ppk-converter.md`
- [ ] Remove "Requirements" section mentioning PuTTY
- [ ] Remove link to https://www.putty.org/
- [ ] Update "How It Works" section (no puttygen.exe mention)
- [ ] Add "No external dependencies required" benefit
- [ ] Add "Faster conversion" benefit
- [ ] Add "Secure passphrase handling" benefit

#### Task 3.5: Verify changelog entry
- [ ] Open `docs/planning/changelog.md`
- [ ] Confirm PRD-009 entry exists under `[Unreleased] → Changed`
- [ ] Entry includes user request translation
- [ ] Entry mentions key benefits
- [ ] Entry lists files modified

---

## Phase 4: Review & Security Check (30 minutes)

### Track A: Functional Review

#### Task 4.1: Verify acceptance criteria
- [ ] API signature unchanged
- [ ] PPK v2 format supported
- [ ] PPK v3 format supported
- [ ] Encrypted keys work with passphrase
- [ ] Unencrypted keys work
- [ ] RSA keys convert successfully
- [ ] ECDSA keys convert successfully
- [ ] Ed25519 keys convert successfully
- [ ] Invalid PPK → clear error message
- [ ] Wrong passphrase → clear error message
- [ ] File not found → clear error message
- [ ] All unit tests pass (7/7)

#### Task 4.2: Manual test - encrypted RSA
- [ ] Launch `esesha.exe`
- [ ] Open Tools → PPK Formatter
- [ ] Select encrypted RSA PPK file
- [ ] Enter passphrase
- [ ] Click Convert
- [ ] Verify success message
- [ ] Verify PEM file created
- [ ] Verify PEM file has 0600 permissions (Windows: owner only)

#### Task 4.3: Manual test - wrong passphrase
- [ ] Open PPK Formatter dialog
- [ ] Select encrypted PPK file
- [ ] Enter incorrect passphrase
- [ ] Click Convert
- [ ] Verify error message displayed
- [ ] Error message mentions "passphrase" or "password"

#### Task 4.4: Manual test - unencrypted key
- [ ] Open PPK Formatter dialog
- [ ] Select unencrypted PPK file
- [ ] Leave passphrase empty
- [ ] Click Convert
- [ ] Verify success

#### Task 4.5: Performance check
- [ ] Time conversion of encrypted RSA key
- [ ] Time conversion of unencrypted key
- [ ] Average time < 500ms
- [ ] Compare to old puttygen.exe timing (was 1-2s)

### Track B: Security Review

#### Task 4.6: Passphrase handling audit
- [ ] Search code for `fmt.Printf` with passphrase variable
- [ ] Search code for `log.Printf` with passphrase variable
- [ ] Verify passphrase converted to `[]byte` immediately
- [ ] Verify passphrase not stored in struct fields
- [ ] Verify error messages don't echo passphrase
- [ ] Verify no debug logging of passphrase

#### Task 4.7: File permissions check
- [ ] Verify `os.Chmod(pemPath, 0600)` called
- [ ] Verify error handling if chmod fails
- [ ] Test on Windows (verify owner-only permissions)

#### Task 4.8: Memory safety check
- [ ] Review PEM marshaling code for buffer overflows
- [ ] Verify all errors handled (no panic paths)
- [ ] Check for nil pointer dereferences
- [ ] Verify type assertions have checks

---

## Final Verification

### Code Quality
- [ ] No compiler warnings
- [ ] No linter errors (if using golangci-lint)
- [ ] Imports organized (stdlib, external, internal)
- [ ] Functions have doc comments
- [ ] Error messages are clear and actionable

### Testing
- [ ] Unit tests: 7/7 passing
- [ ] Build: `go build ./...` successful
- [ ] Wails build: `wails build` successful
- [ ] Manual tests: All passing

### Documentation
- [ ] User guide updated (no PuTTY requirement)
- [ ] Changelog updated (PRD-009 entry)
- [ ] PRD complete with version history
- [ ] Implementation summary available

### Security
- [ ] No passphrase logging
- [ ] File permissions correct (0600)
- [ ] No memory safety issues
- [ ] Error messages safe

---

## Completion Criteria

**PRD-009 is COMPLETE when:**

✅ All Phase 1 tasks complete (core conversion)  
✅ All Phase 2 tasks complete (7 tests passing)  
✅ All Phase 3 tasks complete (build + docs)  
✅ All Phase 4 tasks complete (review + security)  
✅ All acceptance criteria met  
✅ No blocking issues found  

**Then:**
- Update `docs/planning/changelog.md`: Change status from "Approved for implementation" to "COMPLETE ✅"
- Update `docs/planning/prd-009-pure-go-ppk-parser.md`: Change status from "Approved" to "Done"
- Mark this checklist file with completion timestamp

---

## Rollback Trigger Conditions

**Initiate rollback if:**
- Critical bug found in conversion (data corruption)
- Library has severe security vulnerability
- Performance regression > 5x slower
- Breaking API change discovered
- Cannot fix issues within 2 hours

**Do NOT rollback for:**
- Minor error message wording
- Non-critical edge cases
- Documentation updates needed
- Single test failure (fix the test)

---

## Notes / Issues

*Add any implementation notes or issues discovered during implementation here*

---

**Checklist Version:** 1.0.0  
**Created:** 2026-08-14  
**Status:** Ready for use
