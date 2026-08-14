# PRD-009 Implementation Summary for Orchestrator

**PRD:** prd-009-pure-go-ppk-parser.md
**Type:** Refactoring (internal implementation only)
**Status:** Ready for implementation
**Created:** 2026-08-14

---

## Executive Summary

Replace `puttygen.exe` external dependency with pure Go PPK parser library. Zero breaking changes (API signature preserved), no UI modifications. Estimated 3-4 hours total effort.

**Key benefits:**
- ✅ Removes PuTTY installation requirement
- ✅ Improves security (passphrase in-memory only)
- ✅ Faster conversion (< 500ms vs 1-2s)
- ✅ Simpler deployment

---

## Phase Breakdown

### Phase 1: Core Conversion (Backend Developer) — 1.5 hours
**Sequential tasks** (no parallelization possible)

```
Task 1.1: Add dependency
  Command: go get github.com/edutko/putty-go
  Files: go.mod, go.sum
  
Task 1.2: Replace exec.Command with ppk.LoadKeypair
  File: internal/converter/ppk.go
  Lines: ~40 (remove puttygen logic)
  Reference: poc/ppk-pure-go/main.go lines 60-70
  
Task 1.3: Implement marshalPrivateKeyToPEM helper
  File: internal/converter/ppk.go
  Lines: ~30 (new function)
  Handle: RSA (PKCS#1), ECDSA (SEC1), Ed25519 (PKCS#8)
  Reference: poc/ppk-pure-go/main.go lines 100-120
  
Task 1.4: Remove puttygen.exe validation
  File: internal/converter/ppk.go
  Lines: ~5 (delete exec.LookPath logic)
  
Task 1.5: Update error messages
  File: internal/converter/ppk.go
  Lines: ~10 (remove "install PuTTY" text)
```

**Critical constraint:** Tasks 1.2-1.5 must be sequential (core refactor).

---

### Phase 2: Testing (Backend Developer) — 1 hour
**Parallelizable tasks** (can all run simultaneously)

```
Task 2.1: Test encrypted RSA PPK
  File: internal/converter/ppk_test.go
  Lines: ~20 (new test function)
  
Task 2.2: Test unencrypted ECDSA PPK
  File: internal/converter/ppk_test.go
  Lines: ~15 (new test function)
  
Task 2.3: Test Ed25519 key
  File: internal/converter/ppk_test.go
  Lines: ~15 (new test function)
  
Task 2.4: Test wrong passphrase
  File: internal/converter/ppk_test.go
  Lines: ~10 (error case)
  
Task 2.5: Test PPK v3 format
  File: internal/converter/ppk_test.go
  Lines: ~15 (new test function)
```

**Note:** All 5 test tasks are independent and can be implemented in parallel.

---

### Phase 3: Build & Documentation — 30 minutes
**Two parallel tracks:**

**Track A: Build Verification (Backend Developer)**
```
Task 3.1: go test ./internal/converter/
Task 3.2: go build ./...
Task 3.3: wails build
```

**Track B: Documentation (Documentation Agent)**
```
Task 3.4: Update docs/guides/ppk-converter.md
  Change: Remove "Requirements: PuTTY installation" section
  Add: "No external dependencies required"
  
Task 3.5: Update docs/planning/changelog.md
  Entry: Already added (PRD-009 under [Unreleased] → Changed)
```

---

### Phase 4: Review & Security Check — 30 minutes

```
Task 4.1: Verify acceptance criteria (Debugger/Reviewer)
  - API signature unchanged ✓
  - PPK v2/v3 support ✓
  - All key types work ✓
  - Error handling correct ✓
  
Task 4.2: Manual test - encrypted RSA (Debugger/Reviewer)
  Action: Convert real PPK with passphrase
  
Task 4.3: Manual test - wrong passphrase (Debugger/Reviewer)
  Action: Try conversion with incorrect passphrase
  Expected: Clear error message
  
Task 4.4: Performance check (Debugger/Reviewer)
  Action: Time conversion
  Expected: < 500ms
  
Task 4.5: Security review (Security Agent)
  Check: No passphrase logging
  Check: PEM output has 0600 permissions
  Check: No passphrase in memory dumps
```

---

## File Manifest

### Files to Modify (6 files)
```
✏️ go.mod                              — Add github.com/edutko/putty-go
✏️ go.sum                              — Auto-generated
✏️ internal/converter/ppk.go           — Complete rewrite (~120 lines)
✏️ internal/converter/ppk_test.go      — Add 5 comprehensive tests
✏️ docs/guides/ppk-converter.md        — Remove PuTTY requirement
✏️ docs/planning/changelog.md          — PRD-009 entry (already added)
```

### Files Created (1 file)
```
📄 docs/planning/prd-009-pure-go-ppk-parser.md           — This PRD
```

### Files to Reference (3 files)
```
📖 poc/ppk-pure-go/main.go                    — Working PoC implementation
📖 docs/research/ppk-to-pem-alternatives.md   — Library evaluation
📖 docs/research/RESEARCH-SUMMARY.md          — Executive summary
```

---

## Agent Assignment

| Phase | Agent | Parallelization | Duration |
|-------|-------|-----------------|----------|
| Phase 1 | Backend Developer | ❌ Sequential | 1.5h |
| Phase 2 | Backend Developer | ✅ 5 parallel tasks | 1h |
| Phase 3 | Backend Developer + Documentation | ✅ 2 tracks | 30min |
| Phase 4 | Debugger/Reviewer + Security | ✅ Parallel | 30min |

**Total estimated time:** 3.5 hours

---

## Acceptance Criteria Checklist

```
API & Compatibility:
[ ] ConvertPPKToPEM signature unchanged
[ ] PPK v2 format works (encrypted/unencrypted)
[ ] PPK v3 format works (encrypted/unencrypted)
[ ] RSA keys convert successfully
[ ] ECDSA keys convert successfully (P-256/P-384/P-521)
[ ] Ed25519 keys convert successfully

Error Handling:
[ ] Invalid PPK format → clear error
[ ] Wrong passphrase → clear error
[ ] Missing passphrase (encrypted key) → clear error
[ ] File not found → clear error

Security:
[ ] Passphrase not in process list (verified)
[ ] PEM output has 0600 permissions
[ ] No passphrase logging/leakage

Testing:
[ ] All existing tests pass
[ ] 5 new comprehensive tests added
[ ] go test ./internal/converter/ passes
[ ] go build ./... successful
[ ] wails build successful

Performance:
[ ] Conversion time < 500ms (manual timing)

Documentation:
[ ] docs/guides/ppk-converter.md updated (no PuTTY requirement)
[ ] docs/planning/changelog.md has PRD-009 entry
```

---

## Rollback Plan

If critical issues found:

1. **Revert code:**
   ```powershell
   git checkout HEAD~1 -- internal/converter/ppk.go
   git checkout HEAD~1 -- go.mod go.sum
   go mod tidy
   ```

2. **Rebuild:**
   ```powershell
   wails build
   ```

3. **Impact:** PuTTY installation requirement returns
4. **Time:** ~5 minutes
5. **Data loss:** None (conversion is stateless)

---

## Dependencies & Risks

### New Dependency
```
github.com/edutko/putty-go v0.0.0 (Apache-2.0)
├── golang.org/x/crypto (already in project)
└── Pure Go (no CGo, no external binaries)
```

### Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Library unmaintained | Low | Medium | Vendor dependency, can fork (Apache-2.0) |
| 0 GitHub stars | Low | Low | Code review validates quality |
| Breaking existing PPK conversion | Low | High | Comprehensive tests, PoC validated |
| Ed448 not supported | Very Low | Low | Ed448 extremely rare, Ed25519 works |

**Overall risk assessment:** **LOW** — Research validated, PoC tested, library well-tested (70+ tests)

---

## Success Metrics

1. **Zero API changes** — Signature preserved exactly
2. **Zero UI changes** — Frontend untouched
3. **Zero breaking changes** — Existing PPK files convert identically
4. **Faster conversion** — < 500ms (vs 1-2s with puttygen.exe)
5. **Better security** — Passphrase in-memory only
6. **Simpler deployment** — No PuTTY installation instructions

---

## Next Steps for Orchestrator

1. Assign **Backend Developer** to Phase 1 (sequential core refactor)
2. After Phase 1 complete → **Backend Developer** Phase 2 (5 parallel test tasks)
3. After Phase 2 complete → Fork:
   - **Backend Developer** → Phase 3 (build verification)
   - **Documentation** → Phase 3 (doc updates)
4. After Phase 3 complete → Fork:
   - **Debugger/Reviewer** → Phase 4 (functional review)
   - **Security** → Phase 4 (security review)
5. After Phase 4 complete → Mark PRD-009 COMPLETE ✅

---

## Reference Links

- **PRD:** `docs/planning/prd-009-pure-go-ppk-parser.md`
- **Research:** `docs/research/ppk-to-pem-alternatives.md`
- **PoC:** `poc/ppk-pure-go/main.go`
- **Library:** https://github.com/edutko/putty-go
- **Original feature:** PRD-008 (PPK Converter Tool)
