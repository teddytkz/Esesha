# Learner Agent Handoff: PPK to PEM Conversion Research

**Date:** 2026-08-14  
**Research Task:** Find Go library alternatives to `puttygen.exe` for PPK to PEM conversion  
**Status:** ✅ COMPLETE  
**Recommendation:** CLEAR GO DECISION  

---

## Executive Summary

**Objective:** Eliminate the requirement for users to have PuTTY installed by replacing `puttygen.exe` with a pure Go implementation.

**Result:** Found viable solution - `github.com/edutko/putty-go` is the **only** pure Go library that supports PPK format parsing and meets all requirements.

**Recommendation:** Implement using `edutko/putty-go` (estimated effort: 3-4 hours)

---

## What Was Researched

### Libraries Evaluated

1. **github.com/edutko/putty-go** ✅ WINNER
   - Full PPK v2 and v3 support
   - Handles encrypted and unencrypted keys
   - Supports all key types (RSA, ECDSA, Ed25519)
   - 70+ test cases with real PPK files
   - Apache-2.0 license

2. **github.com/ScaleFT/sshkeys** ❌ REJECTED
   - Does NOT support PPK format
   - Only supports OpenSSH PROTOCOL.key format
   - Not applicable to this use case

3. **github.com/mikesmitty/edkey** ❌ REJECTED
   - Only marshals Ed25519 keys
   - Does NOT parse PPK files
   - Very narrow scope, not applicable

### Alternative Approaches Evaluated

- **Bundle puttygen.exe:** ❌ Violates user requirement (external dependency)
- **Manual PPK implementation:** ❌ Unnecessary (40-60 hours, reinventing wheel)
- **CGo with OpenSSL/libssh:** ❌ Neither has PPK support, adds complexity

---

## Key Findings

### ✅ Validation Completed

1. **PPK Format Support:** Library handles both PPK v2 (PBKDF2-SHA1) and PPK v3 (Argon2i/id) formats
2. **Encryption:** Successfully decrypts AES-256-CBC encrypted keys with passphrase
3. **Error Handling:** Clear error messages for wrong passphrase, invalid format
4. **Key Types:** Supports RSA, DSA, ECDSA (P-256/384/521), Ed25519 (Ed448 with limitations)
5. **API Simplicity:** Single function call: `ppk.LoadKeypair(path, passphrase)`
6. **Zero Dependencies:** Pure Go, no CGo, no external binaries required

### 🔒 Security Improvements

**Current (puttygen.exe):**
- Passphrase visible in process command line
- Requires external binary in PATH
- Process spawning overhead

**New (pure Go):**
- Passphrase handled in-memory only
- No external dependencies
- Cryptographic MAC verification included
- Faster execution

### ⚠️ Known Limitations

1. **Low GitHub adoption (0 stars):** Acceptable - code quality is high, library is well-tested
2. **Not actively maintained (3 years old):** Acceptable - PPK format is stable since 2021
3. **Ed448 limitation:** Cannot convert to Go crypto types (rare key type, not a concern)

---

## Deliverables

### 1. Technology Evaluation Report
**Location:** `docs/research/ppk-to-pem-alternatives.md`

Comprehensive analysis including:
- Evaluation criteria matrix
- Library comparison table
- Alternative approaches assessment
- Risk analysis and mitigation strategies
- Complete code examples (before/after)
- Implementation guidance

### 2. Proof of Concept
**Location:** `poc/ppk-pure-go/`

Contains:
- `main.go` - Demonstration code showing API usage
- `results.md` - Detailed findings and validation results
- `README.md` - How to run the PoC

**PoC validates:**
- PPK v2/v3 loading
- Encrypted key decryption
- Wrong passphrase detection
- PEM marshaling approach

### 3. Implementation Roadmap
**Location:** Included in research report

**Effort estimate:** 3-4 hours total
- Add dependency: 5 minutes
- Refactor `ppk.go`: 1-2 hours
- Implement PEM marshaling: 1-2 hours
- Update tests: 1 hour
- Documentation: 30 minutes

---

## Recommendation for Planner

### Clear Decision: PROCEED WITH IMPLEMENTATION

**Library to use:** `github.com/edutko/putty-go`

**Why this is ready for implementation:**
1. Only viable pure Go solution (no other options exist)
2. Meets all functional requirements
3. Security improvement over current approach
4. Low integration effort (3-4 hours)
5. No breaking changes to existing API
6. Comprehensive test coverage in library

### Implementation Steps (for PRD)

1. **Add Dependency**
   ```bash
   go get github.com/edutko/putty-go@latest
   ```

2. **Refactor `internal/converter/ppk.go`**
   - Replace `exec.Command` logic with `ppk.LoadKeypair()`
   - Add type switching for RSA/ECDSA/Ed25519 keys
   - Implement PEM marshaling for each key type
   - Update error handling to translate library errors

3. **Update Tests**
   - Add unit tests with sample PPK files (v2 and v3)
   - Test encrypted and unencrypted keys
   - Test wrong passphrase handling
   - Validate PEM output format

4. **Update Documentation**
   - Remove PuTTY installation requirement
   - Update system requirements
   - Document new error messages

5. **Validation**
   - Test with real-world PPK files from users
   - Verify all key types work (RSA, ECDSA, Ed25519)
   - Confirm error messages are user-friendly

### API Signature (unchanged)
```go
func ConvertPPKToPEM(ppkPath, pemPath, passphrase string) error
```

No breaking changes - drop-in replacement.

### Risk Mitigation

**Risk:** Library unmaintained  
**Mitigation:** Vendor dependency, add comprehensive tests, Apache-2.0 allows forking

**Risk:** Limited community vetting  
**Mitigation:** Code review before integration, extensive testing with real PPK files

**Risk:** Future PPK format changes  
**Mitigation:** Unlikely (format stable since 2021), can fork and update if needed

---

## For Orchestrator

**Research Status:** ✅ COMPLETE  
**Decision Clarity:** ✅ CLEAR RECOMMENDATION  
**Implementation Ready:** ✅ YES  

**Next Agent:** Planner  
**Planner Task:** Create PRD for implementing pure Go PPK conversion using `edutko/putty-go`

**Context to Pass:**
- Research report: `docs/research/ppk-to-pem-alternatives.md`
- PoC location: `poc/ppk-pure-go/`
- Current implementation: `internal/converter/ppk.go` (lines 1-90)
- Estimated effort: 3-4 hours (Small task)
- Priority: Medium-High (quality-of-life improvement, removes external dependency)

**User Benefit:**
- No PuTTY installation required
- Better security (passphrase not in command line)
- Faster conversion (no process spawning)
- More reliable (no PATH dependencies)

---

## References

- **Library Repository:** https://github.com/edutko/putty-go
- **PPK Format Specification:** https://the.earth.li/~sgtatham/putty/0.78/htmldoc/AppendixC.html#ppk
- **License:** Apache-2.0 (permissive, commercial-friendly)
- **Test Coverage:** 70+ test cases in library
- **Last Updated:** 2021 (format is stable)

---

**Learner Agent:** Research complete. Ready for Planner to create implementation PRD.
