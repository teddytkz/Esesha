# PRD-009: Pure Go PPK Parser (Remove puttygen.exe Dependency)

**Version:** v1.0.0
**Status:** Approved
**Author:** Planner Agent
**Created:** 2026-08-14
**Updated:** 2026-08-14

---

## Overview

Replace external `puttygen.exe` dependency with pure Go PPK parser using `github.com/edutko/putty-go` library. This eliminates the requirement for users to install PuTTY, improves security by removing passphrase from command line, and provides faster conversion through in-memory processing.

**Type:** Refactoring (no API changes, no UI changes)

## Problem Statement

Current implementation requires:
1. Users to install PuTTY separately
2. `puttygen.exe` to be in system PATH
3. Passphrase passed via command line (visible in process list)
4. Process spawn overhead for conversion
5. Windows-only external dependency

**User feedback (Indonesian):** "saya tidak install putty, bisa engga kalo tanpa install putty"
**Translation:** "I don't have PuTTY installed, can we do it without installing PuTTY?"

## Goals

- Remove external PuTTY/puttygen.exe dependency
- Maintain identical API signature (`ConvertPPKToPEM`)
- Improve security (passphrase handling)
- Reduce conversion latency
- Simplify deployment (no installation instructions)

## Non-Goals

- Changing the PPK Converter UI/UX
- Supporting additional key formats beyond PPK
- Cross-platform support (still Windows-only app)
- Performance optimization beyond removing process overhead

---

## Feature Specification

### User Stories

- As a user, I want to convert PPK files without installing PuTTY, so that I have fewer dependencies
- As a user, I want secure passphrase handling, so that my credentials are not exposed in process lists
- As a developer, I want faster PPK conversion, so that the UI remains responsive

### Acceptance Criteria

- [ ] `ConvertPPKToPEM` function signature unchanged
- [ ] PPK v2 format supported (encrypted and unencrypted)
- [ ] PPK v3 format supported (encrypted and unencrypted)
- [ ] All key types supported: RSA, ECDSA (P-256/P-384/P-521), Ed25519
- [ ] Passphrase validation works (incorrect passphrase → clear error)
- [ ] Invalid PPK format detected and rejected
- [ ] Output PEM file has 0600 permissions (owner-only)
- [ ] Existing unit tests pass without modification
- [ ] New comprehensive tests added (encrypted keys, multiple key types)
- [ ] No puttygen.exe dependency validation removed
- [ ] Conversion time < 500ms (vs ~1-2s with puttygen.exe)
- [ ] Documentation updated (no PuTTY installation required)

---

## Technical Design

### Architecture Overview

**Current flow:**
```
User → Frontend → App.ConvertPPKToPEM() → exec.Command("puttygen.exe") → PEM file
```

**New flow:**
```
User → Frontend → App.ConvertPPKToPEM() → ppk.LoadKeypair() → marshalPrivateKey() → PEM file
```

### Codebase Context

From research documents:
- Working PoC exists at `poc/ppk-pure-go/main.go`
- Current implementation: `internal/converter/ppk.go` (90 lines)
- Tests: `internal/converter/ppk_test.go` (2 basic tests)
- Library evaluated: `github.com/edutko/putty-go` (70+ test cases, Apache-2.0)

### Data Model

No database changes required.

### API Changes

**Public API:** No changes
```go
// Signature remains identical
func ConvertPPKToPEM(ppkPath, pemPath, passphrase string) error
```

**Internal implementation:** Complete rewrite
```go
// New approach uses library
keyPair, err := ppk.LoadKeypair(ppkPath, passphraseBytes)
pemBytes := marshalPrivateKeyToPEM(keyPair.Private())
os.WriteFile(pemPath, pemBytes, 0600)
```

### UI Changes

None. PPK Converter dialog unchanged.

---

## Implementation Plan

### Phase 1: Dependency & Core Conversion

**Depends on:** Nothing
**Parallelizable:** No (sequential tasks)

| Task | Agent | Files | Description |
|------|-------|-------|-------------|
| 1.1 | Backend Developer | `go.mod`, `go.sum` | Add `github.com/edutko/putty-go` dependency via `go get` |
| 1.2 | Backend Developer | `internal/converter/ppk.go` | Replace exec.Command implementation with ppk.LoadKeypair |
| 1.3 | Backend Developer | `internal/converter/ppk.go` | Implement `marshalPrivateKeyToPEM()` helper (RSA, ECDSA, Ed25519) |
| 1.4 | Backend Developer | `internal/converter/ppk.go` | Remove puttygen.exe PATH validation logic |
| 1.5 | Backend Developer | `internal/converter/ppk.go` | Update error messages (remove "install PuTTY" references) |

**Sub-Agent Guidance:**
- Task 1.1: Single atomic operation (`go get github.com/edutko/putty-go`)
- Tasks 1.2-1.5: Must be done sequentially (core refactor)
- Preserve original function signature exactly
- Reference PoC at `poc/ppk-pure-go/main.go` for implementation patterns

### Phase 2: Comprehensive Testing

**Depends on:** Phase 1

| Task | Agent | Files | Description |
|------|-------|-------|-------------|
| 2.1 | Backend Developer | `internal/converter/ppk_test.go` | Add test for encrypted RSA PPK with passphrase |
| 2.2 | Backend Developer | `internal/converter/ppk_test.go` | Add test for unencrypted ECDSA PPK |
| 2.3 | Backend Developer | `internal/converter/ppk_test.go` | Add test for Ed25519 key conversion |
| 2.4 | Backend Developer | `internal/converter/ppk_test.go` | Add test for wrong passphrase (expect error) |
| 2.5 | Backend Developer | `internal/converter/ppk_test.go` | Add test for PPK v3 format |

**Sub-Agent Guidance:**
- Tasks 2.1-2.5 can be parallelized (independent test cases)
- Use test PPK files from research if available
- Each test should verify PEM output format (valid SSH key)

### Phase 3: Build Verification & Documentation

**Depends on:** Phase 2

| Task | Agent | Files | Description |
|------|-------|-------|-------------|
| 3.1 | Backend Developer | N/A | Run `go test ./internal/converter/` (all tests pass) |
| 3.2 | Backend Developer | N/A | Run `go build ./...` (verify no compile errors) |
| 3.3 | Backend Developer | N/A | Run `wails build` (verify frontend bindings work) |
| 3.4 | Documentation | `docs/guides/ppk-converter.md` | Remove PuTTY installation requirement section |
| 3.5 | Documentation | `docs/planning/changelog.md` | Add PRD-009 entry under [Unreleased] → Changed |

**Sub-Agent Guidance:**
- Task 3.1-3.3: Sequential build verification pipeline
- Task 3.4-3.5: Can be done in parallel with build verification

### Phase 4: Review & Integration Test (Always Last)

**Depends on:** Phase 3

| Task | Agent | Description |
|------|-------|-------------|
| 4.1 | Debugger/Reviewer | Verify all acceptance criteria met |
| 4.2 | Debugger/Reviewer | Test PPK conversion with encrypted RSA key (manual) |
| 4.3 | Debugger/Reviewer | Test PPK conversion with unencrypted key (manual) |
| 4.4 | Debugger/Reviewer | Verify error handling (invalid PPK, wrong passphrase) |
| 4.5 | Debugger/Reviewer | Check conversion performance (< 500ms target) |
| 4.6 | Security | Review passphrase handling (no logging, no leakage) |
| 4.7 | Security | Verify PEM output permissions (0600) |

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Library unmaintained (3 years old) | Medium | Low | Vendor dependency, comprehensive tests, can fork if needed |
| Library has 0 GitHub stars | Low | Low | Code review confirms quality, Apache-2.0 allows forking |
| Ed448 keys not fully supported | Low | Very Low | Ed448 extremely rare, Ed25519/RSA/ECDSA cover 99.9% of use cases |
| Breaking existing PPK conversions | High | Low | Maintain API signature, comprehensive testing, PoC validated |
| Regression in encrypted key handling | High | Low | Add specific tests for encrypted keys with passphrase |

## Rollback Strategy

If critical issues found post-deployment:
1. Revert `internal/converter/ppk.go` to git commit before refactor
2. Revert `go.mod` dependency changes
3. Run `go mod tidy` to clean up
4. Rebuild with `wails build`
5. User impact: PuTTY installation requirement returns

Rollback time: ~5 minutes
Data impact: None (conversion is stateless)

---

## Implementation Summary for Orchestrator

### Scope
**Type:** Refactoring (internal implementation change)
**Breaking changes:** None (API signature preserved)
**Estimated effort:** 3-4 hours

### Files to Modify
- `go.mod` — Add `github.com/edutko/putty-go` dependency
- `go.sum` — Auto-generated on `go get`
- `internal/converter/ppk.go` — Complete rewrite (keep signature)
- `internal/converter/ppk_test.go` — Add 5 comprehensive tests
- `docs/guides/ppk-converter.md` — Remove PuTTY requirement
- `docs/planning/changelog.md` — Add PRD-009 entry

### Agent Routing
- **Phase 1 (Core):** Backend Developer (atomic, no parallelization)
- **Phase 2 (Tests):** Backend Developer (5 parallel test tasks)
- **Phase 3 (Build/Docs):** Backend Developer + Documentation (parallel)
- **Phase 4 (Review):** Debugger/Reviewer + Security

### Parallelization Opportunities
- Phase 2: All test tasks can run in parallel
- Phase 3: Documentation tasks parallel with build tasks

### Critical Path
Phase 1 → Phase 2 → Phase 3 → Phase 4 (sequential phases)

### Acceptance Verification
1. Run `go test ./internal/converter/` → all tests pass
2. Manual test: Convert encrypted PPK → success
3. Manual test: Convert with wrong passphrase → clear error
4. Check `docs/guides/ppk-converter.md` → no PuTTY mention
5. Verify binary size change (expect +200KB for library)

---

## Version History

| Version | Date | Summary |
|---------|------|---------|
| v1.0.0 | 2026-08-14 | Initial PRD - approved for implementation |

---

## References

- Research: `docs/research/ppk-to-pem-alternatives.md`
- Research summary: `docs/research/RESEARCH-SUMMARY.md`
- Proof of concept: `poc/ppk-pure-go/main.go`
- Library: https://github.com/edutko/putty-go (Apache-2.0)
- Original implementation: PRD-008 (PPK Converter feature)
