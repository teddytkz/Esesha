# Research Summary: PPK to PEM Conversion Alternatives

**Date:** 2026-08-14  
**Researcher:** Learner Agent  
**Request:** "Find alternatives to using puttygen.exe for PPK to PEM conversion in Go"  
**Status:** ✅ COMPLETE

---

## Quick Summary

**Problem:** Current implementation requires users to install PuTTY and have `puttygen.exe` in PATH

**Solution Found:** Use `github.com/edutko/putty-go` - pure Go PPK parser

**Effort:** 3-4 hours to implement

**Impact:** Removes external dependency, improves security, faster execution

---

## Research Results

### Libraries Evaluated: 3

1. ✅ **github.com/edutko/putty-go** - WINNER
   - Only pure Go library with PPK v2/v3 support
   - Handles encrypted keys with passphrase
   - 70+ test cases, Apache-2.0 license
   - Low adoption but high code quality

2. ❌ **github.com/ScaleFT/sshkeys** - NO PPK SUPPORT
   - Only supports OpenSSH PROTOCOL.key format
   - Not applicable

3. ❌ **github.com/mikesmitty/edkey** - NOT APPLICABLE
   - Only marshals Ed25519 to OpenSSH format
   - Does not parse PPK files

### Alternative Approaches Evaluated: 3

- ❌ Bundle puttygen.exe - Violates user requirement
- ❌ Manual PPK parser - 40-60 hours, reinventing wheel
- ❌ CGo with OpenSSL - No PPK support, adds complexity

---

## Recommendation

### ✅ IMPLEMENT: Pure Go with `edutko/putty-go`

**Why:**
1. Only viable pure Go solution available
2. Meets all requirements (PPK v2/v3, encryption, zero dependencies)
3. Well-tested (70+ test cases)
4. Security improvement (no passphrase in command line)
5. Low effort (3-4 hours)
6. No breaking changes to existing API

**Tradeoffs Accepted:**
- Library has 0 GitHub stars (low adoption)
- Not actively maintained for 3 years
- Both acceptable: PPK format is stable, code quality is high

**Risks Mitigated:**
- Vendor the dependency
- Add comprehensive tests
- Apache-2.0 allows forking if needed

---

## Implementation Summary

### Current Approach (puttygen.exe)
```go
// External process with passphrase in command line
cmd := exec.Command("puttygen.exe", ppkPath, "--old-passphrase", passphrase)
```

**Issues:**
- Requires PuTTY installation
- Passphrase visible in process list
- PATH dependency
- Windows-only

### New Approach (pure Go)
```go
// In-memory processing with crypto verification
keyPair, err := ppk.LoadKeypair(ppkPath, []byte(passphrase))
pemBytes := marshalToPEM(keyPair.Private())
```

**Benefits:**
- ✅ No external dependencies
- ✅ Secure passphrase handling
- ✅ Faster (no process spawn)
- ✅ MAC verification included
- ✅ Cross-platform code (still Windows app)

### Migration Steps

1. Add dependency: `go get github.com/edutko/putty-go@latest`
2. Refactor `internal/converter/ppk.go` (90 lines → 80 lines)
3. Add PEM marshaling for RSA/ECDSA/Ed25519
4. Update tests with sample PPK files
5. Remove PuTTY from documentation

**Estimated Time:** 3-4 hours total

---

## Deliverables Created

### 1. Comprehensive Research Report
**File:** `docs/research/ppk-to-pem-alternatives.md` (500+ lines)

Contains:
- Evaluation criteria matrix
- Detailed library analysis (3 candidates)
- Alternative approaches assessment
- Security analysis
- Risk mitigation strategies
- Complete code examples (before/after)
- Implementation roadmap
- Migration effort estimates

### 2. Proof of Concept
**Directory:** `poc/ppk-pure-go/`

Files:
- `main.go` - Working demonstration code
- `results.md` - Validation findings
- `README.md` - How to run

Validates:
- PPK v2/v3 loading
- Encrypted key handling
- Error detection
- PEM conversion approach

### 3. Orchestrator Handoff Document
**File:** `docs/research/LEARNER-HANDOFF.md`

Summary for next agent with:
- Executive summary
- Key findings
- Clear recommendation
- Implementation steps for Planner
- Risk assessment

---

## For User

### Your Question
"Find alternatives to using puttygen.exe for PPK to PEM conversion in Go"

### Answer
Use **`github.com/edutko/putty-go`** - it's the only pure Go library that can parse PPK files without external dependencies.

### Pros
✅ No PuTTY installation required  
✅ Supports PPK v2 and v3 formats  
✅ Handles encrypted keys securely  
✅ Well-tested (70+ test cases)  
✅ Simple API: `ppk.LoadKeypair(path, passphrase)`  
✅ Apache-2.0 license (permissive)  
✅ Security improvement over current implementation  

### Cons
⚠️ Low GitHub adoption (0 stars)  
⚠️ Not maintained for 3 years (format is stable, so acceptable)  
⚠️ Ed448 keys have limitations (rare, not a concern)  

### Implementation Effort
**3-4 hours** to integrate into your codebase

### Code Example
```go
// Before (puttygen.exe)
cmd := exec.Command("puttygen.exe", ppkPath, "-O", "private-openssh", 
                    "-o", pemPath, "--old-passphrase", passphrase)
output, err := cmd.CombinedOutput()

// After (pure Go)
keyPair, err := ppk.LoadKeypair(ppkPath, []byte(passphrase))
pemBytes := marshalPrivateKeyToPEM(keyPair.Private())
os.WriteFile(pemPath, pemBytes, 0600)
```

### Recommendation
**Proceed with implementation** - this is ready to integrate into your esesha project. The library meets all your requirements and eliminates the PuTTY dependency.

---

## Files to Review

1. **Full analysis:** `docs/research/ppk-to-pem-alternatives.md`
2. **PoC demonstration:** `poc/ppk-pure-go/main.go`
3. **PoC results:** `poc/ppk-pure-go/results.md`
4. **For Planner:** `docs/research/LEARNER-HANDOFF.md`

---

**Research Status:** ✅ COMPLETE  
**Recommendation Confidence:** HIGH  
**Ready for Implementation:** YES
