# PPK to PEM Conversion Research - Index

**Research Completed:** 2026-08-14  
**Learner Agent Status:** ✅ COMPLETE  
**Recommendation:** Clear Go Decision - Implement with `github.com/edutko/putty-go`

---

## 📋 Quick Navigation

### For Users / Decision Makers
**Start here:** [`RESEARCH-SUMMARY.md`](./RESEARCH-SUMMARY.md)
- Executive summary
- Clear recommendation with pros/cons
- Quick implementation overview
- 3-4 hour effort estimate

### For Implementers / Developers
**Start here:** [`ppk-to-pem-alternatives.md`](./ppk-to-pem-alternatives.md)
- Complete technical analysis (500+ lines)
- Library comparison matrix
- Full code examples (before/after)
- Step-by-step implementation guide
- Migration roadmap

### For Project Planner
**Start here:** [`LEARNER-HANDOFF.md`](./LEARNER-HANDOFF.md)
- Orchestrator handoff document
- Research status and decision clarity
- Context for creating PRD
- Risk assessment and mitigation

### Proof of Concept
**Location:** [`../../poc/ppk-pure-go/`](../../poc/ppk-pure-go/)
- Working demonstration code
- Validation results
- API usage examples

---

## 📊 Research Results at a Glance

### Libraries Evaluated: 3
| Library | PPK Support | Verdict |
|---------|-------------|---------|
| `edutko/putty-go` | ✅ v2 & v3 | **WINNER** |
| `ScaleFT/sshkeys` | ❌ No | Rejected |
| `mikesmitty/edkey` | ❌ No | Rejected |

### Alternative Approaches: 3
| Approach | Feasibility | Verdict |
|----------|-------------|---------|
| Bundle puttygen.exe | Possible | ❌ Violates requirement |
| Manual implementation | Possible | ❌ 40-60 hours unnecessary |
| CGo with OpenSSL | Not feasible | ❌ No PPK support |

---

## ✅ Recommendation

### Implement: `github.com/edutko/putty-go`

**Why:**
- Only pure Go library with PPK v2/v3 support
- Meets all requirements
- Well-tested (70+ test cases)
- Security improvement
- Low effort (3-4 hours)

**Key Benefits:**
- ✅ Eliminates PuTTY installation requirement
- ✅ No passphrase in process command line (security)
- ✅ Faster execution (no process spawning)
- ✅ Cross-platform code (currently Windows app)
- ✅ Cryptographic MAC verification included

**Tradeoffs Accepted:**
- ⚠️ Low GitHub adoption (0 stars) - Code quality compensates
- ⚠️ Not maintained for 3 years - Format is stable since 2021

---

## 📁 Deliverables

### 1. Research Documents

| Document | Description | Lines |
|----------|-------------|-------|
| `ppk-to-pem-alternatives.md` | Complete technical evaluation | 500+ |
| `RESEARCH-SUMMARY.md` | Executive summary | 200+ |
| `LEARNER-HANDOFF.md` | Orchestrator handoff | 250+ |
| `INDEX.md` (this file) | Navigation guide | 150+ |

**Total documentation:** ~1,100 lines

### 2. Proof of Concept

**Location:** `poc/ppk-pure-go/`

| File | Purpose |
|------|---------|
| `main.go` | Working demonstration code |
| `results.md` | Validation findings |
| `README.md` | How to run the PoC |

### 3. Code Examples

**Current implementation:** `internal/converter/ppk.go` (90 lines)  
**New implementation:** Provided in research docs (~80 lines)

**API comparison:**
```go
// Before (puttygen.exe)
cmd := exec.Command("puttygen.exe", ppkPath, "--old-passphrase", passphrase)

// After (pure Go)
keyPair, err := ppk.LoadKeypair(ppkPath, []byte(passphrase))
```

---

## 🎯 Implementation Roadmap

### Phase 1: Setup (5 minutes)
- Add `github.com/edutko/putty-go` to go.mod
- Add `golang.org/x/crypto/ssh` if needed

### Phase 2: Refactor (1-2 hours)
- Replace `exec.Command` with `ppk.LoadKeypair()`
- Remove PATH checking logic
- Update error handling

### Phase 3: PEM Marshaling (1-2 hours)
- Add type switching for RSA/ECDSA/Ed25519
- Implement PEM encoding for each type
- Handle edge cases

### Phase 4: Testing (1 hour)
- Unit tests with sample PPK files
- Test encrypted/unencrypted keys
- Test wrong passphrase handling
- Validate PEM output format

### Phase 5: Documentation (30 minutes)
- Update README (remove PuTTY requirement)
- Update installation instructions
- Document new error messages

**Total Effort:** 3-4 hours

---

## 🔍 Technical Details

### PPK Format Support
- **PPK v2:** PBKDF2-SHA1 KDF, HMAC-SHA1 MAC ✅
- **PPK v3:** Argon2i/Argon2id KDF, HMAC-SHA256 MAC ✅
- **Encryption:** AES-256-CBC ✅
- **Key Types:** RSA, DSA, ECDSA (P-256/384/521), Ed25519 ✅

### Library Information
- **Repository:** https://github.com/edutko/putty-go
- **License:** Apache-2.0 (permissive, commercial-friendly)
- **Last Update:** 2021 (format stable, no changes needed)
- **Test Coverage:** 70+ test cases with real PPK files
- **Dependencies:** Pure Go, no CGo

### Current vs New Implementation

| Aspect | Current (puttygen.exe) | New (pure Go) |
|--------|------------------------|---------------|
| External dependency | ✅ Requires PuTTY | ❌ None |
| Passphrase security | ❌ In command line | ✅ In-memory only |
| PATH dependency | ✅ Yes | ❌ No |
| Process spawn | ✅ Yes (slower) | ❌ No (faster) |
| MAC verification | ❓ Unknown | ✅ Yes (built-in) |
| Error messages | ⚠️ Process output | ✅ Descriptive |
| Lines of code | 90 | 80 |

---

## 🚀 Next Steps

### For Orchestrator
1. Review research findings (this index + summary)
2. Confirm recommendation aligns with project goals
3. Hand off to Planner for PRD creation
4. Provide context: research docs + current implementation

### For Planner
1. Read [`LEARNER-HANDOFF.md`](./LEARNER-HANDOFF.md)
2. Review [`ppk-to-pem-alternatives.md`](./ppk-to-pem-alternatives.md) for technical details
3. Create PRD for implementation
4. Estimate: Small task (3-4 hours)
5. Priority: Medium-High (quality-of-life improvement)

### For Developer
1. Read [`ppk-to-pem-alternatives.md`](./ppk-to-pem-alternatives.md) sections:
   - "Code Example: Before vs After"
   - "Implementation Notes for Planner"
2. Review PoC in `poc/ppk-pure-go/`
3. Follow implementation roadmap
4. Test with real PPK files before deploying

---

## ❓ FAQ

**Q: Why not just bundle puttygen.exe?**  
A: User explicitly wants to eliminate external dependencies. Bundling still requires the exe and has licensing implications.

**Q: Is the library maintained?**  
A: Not actively (3 years old), but PPK format is stable since 2021. No changes needed. Library can be vendored.

**Q: What about Ed448 keys?**  
A: Library has limitation with Ed448. This is acceptable as Ed448 is extremely rare. Ed25519 (common) works perfectly.

**Q: Can we trust code with 0 GitHub stars?**  
A: Yes. Code quality is high, test coverage is comprehensive (70+ tests), and library is well-structured. Can be code-reviewed and vendored.

**Q: What if bugs are found?**  
A: Apache-2.0 license allows forking and patching. Library is small (~2000 LOC) and manageable.

**Q: Performance concerns?**  
A: No. Conversion is a one-time operation. Pure Go implementation is likely faster than spawning puttygen.exe.

---

## 📚 References

- **PuTTY PPK Format Specification:** https://the.earth.li/~sgtatham/putty/0.78/htmldoc/AppendixC.html#ppk
- **Library Repository:** https://github.com/edutko/putty-go
- **Current Implementation:** `internal/converter/ppk.go`
- **esesha Project State:** `/memories/repo/esesha-project-state.md`

---

**Research Status:** ✅ COMPLETE  
**Decision Clarity:** ✅ CLEAR RECOMMENDATION  
**Implementation Ready:** ✅ YES  
**Confidence Level:** HIGH  

**Learner Agent:** Research complete. All deliverables created. Ready for next phase.
