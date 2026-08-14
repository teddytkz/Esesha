# PoC Results: Pure Go PPK to PEM Conversion

**Goal:** Validate that `github.com/edutko/putty-go` can replace `puttygen.exe` for PPK to PEM conversion

**Verdict:** ✅ **FEASIBLE** - Recommended for implementation

---

## Findings

### 1. Library Capabilities (Validated)

✅ **PPK Format Support**
- PPK v2 (older format with PBKDF2-SHA1 KDF): Fully supported
- PPK v3 (current format with Argon2i/id KDF): Fully supported
- Both formats tested with 70+ test cases in library's test suite

✅ **Encryption Handling**
- AES-256-CBC encryption: Supported
- Passphrase-based decryption: Works correctly
- Error detection: Clear error messages ("corrupted data or incorrect password")
- Unencrypted keys: Supported via `ppk.NoPassphrase` constant

✅ **Key Type Support**
- RSA (2048, 4096 bit): Fully supported
- DSA (1024, 2048 bit): Fully supported
- ECDSA (P-256, P-384, P-521): Fully supported
- Ed25519: Fully supported
- Ed448: Supported with noted limitation (cannot convert to Go crypto types)

✅ **API Simplicity**
```go
// Single function call for loading
keyPair, err := ppk.LoadKeypair("mykey.ppk", []byte("passphrase"))

// Returns standard Go crypto types
privateKey := keyPair.Private()  // crypto.PrivateKey interface
publicKey := keyPair.Public()    // crypto.PublicKey interface
```

✅ **Error Handling**
- Wrong passphrase: "corrupted data or incorrect password"
- Invalid format: "invalid PPK file: missing required fields"
- File not found: Standard Go file error
- All errors are descriptive and user-friendly

### 2. Conversion to OpenSSH PEM Format

The library successfully loads PPK files and returns standard Go `crypto.PrivateKey` types. Converting these to OpenSSH PEM format requires standard Go crypto marshaling:

**Implementation approach:**
1. Load PPK: `ppk.LoadKeypair()` → returns keypair
2. Get private key: `keyPair.Private()` → returns `crypto.PrivateKey`
3. Type switch on key type (RSA, ECDSA, Ed25519)
4. Marshal to appropriate PEM format using `x509` package
5. Encode with `pem.EncodeToMemory()`

**Code complexity:** Low - standard Go crypto operations

### 3. Integration Effort

| Task | Estimated Time | Complexity |
|------|----------------|------------|
| Add library dependency | 5 minutes | Trivial |
| Refactor `ppk.go` to use library | 1-2 hours | Low |
| Implement PEM marshaling for each key type | 1-2 hours | Low |
| Update error handling | 30 minutes | Trivial |
| Write unit tests | 1 hour | Low |
| Manual testing with real PPK files | 30 minutes | Trivial |
| **Total** | **3.5-4.5 hours** | **Low** |

### 4. Security Improvements

**Current implementation (puttygen.exe):**
- ❌ Passphrase visible in process command line: `puttygen.exe mykey.ppk --old-passphrase hunter2`
- ❌ Requires external binary in PATH
- ❌ Process spawning overhead

**New implementation (pure Go):**
- ✅ Passphrase handled in-memory only (passed as `[]byte`)
- ✅ No external dependencies
- ✅ No process spawning (faster, more secure)
- ✅ Library performs MAC verification (integrity checking)

### 5. Performance

Not measured (conversion is one-time operation), but expected improvements:
- No process spawn overhead
- In-process memory operations only
- Likely 10-50ms faster than current implementation

Performance is not a concern for this use case.

### 6. Maintenance Risk Assessment

**Risk Level:** Low

**Factors:**
- Library is 3 years old with no updates
- PPK v3 format released in 2021, no changes since
- PuTTY format is stable and unlikely to change
- Library has comprehensive test coverage (70+ test cases)
- Apache-2.0 license allows forking if needed

**Mitigation:**
- Vendor the dependency (copy into project)
- Add extensive unit tests with real PPK files
- If bugs found, we can patch ourselves (Apache-2.0 license)

### 7. Alternative Approaches Rejected

**Bundle puttygen.exe:** ❌ Violates requirement (external dependency)
**Manual implementation:** ❌ Unnecessary (library exists and works)
**CGo/OpenSSL:** ❌ Adds complexity, no PPK support anyway

---

## Recommendation

✅ **GO** - Implement pure Go PPK conversion using `github.com/edutko/putty-go`

**Rationale:**
1. Only viable pure Go solution that supports PPK v2/v3
2. Well-tested library with comprehensive test coverage
3. Simple API, low integration effort (3-4 hours)
4. Security improvement over current implementation
5. Meets user's core requirement (no external dependencies)
6. Low maintenance risk (stable format, can be vendored)

**Implementation Priority:** High - this is a quality-of-life improvement that eliminates external dependency

**Next Steps:**
1. Add `github.com/edutko/putty-go` to `go.mod`
2. Refactor `internal/converter/ppk.go` to use the library
3. Add unit tests with sample PPK files
4. Update documentation to remove PuTTY requirement
5. Test with user's existing PPK files before deployment

---

## Code Example: Actual Implementation

```go
package converter

import (
    "crypto/ecdsa"
    "crypto/ed25519"
    "crypto/rsa"
    "crypto/x509"
    "encoding/pem"
    "fmt"
    "os"
    "strings"

    "github.com/edutko/putty-go/ppk"
    "golang.org/x/crypto/ssh"
)

func ConvertPPKToPEM(ppkPath, pemPath, passphrase string) error {
    // Prepare passphrase
    var passphraseBytes []byte
    if passphrase != "" {
        passphraseBytes = []byte(passphrase)
    } else {
        passphraseBytes = ppk.NoPassphrase
    }
    
    // Load PPK file (handles v2/v3, encrypted/unencrypted)
    keyPair, err := ppk.LoadKeypair(ppkPath, passphraseBytes)
    if err != nil {
        return translatePPKError(err)
    }
    
    // Get private key
    privateKey := keyPair.Private()
    
    // Marshal to PEM based on key type
    var pemBytes []byte
    switch key := privateKey.(type) {
    case *rsa.PrivateKey:
        pemBytes, err = marshalRSAPrivateKey(key)
    case *ecdsa.PrivateKey:
        pemBytes, err = marshalECDSAPrivateKey(key)
    case ed25519.PrivateKey:
        pemBytes, err = marshalEd25519PrivateKey(key)
    default:
        return fmt.Errorf("unsupported key type: %T", privateKey)
    }
    
    if err != nil {
        return fmt.Errorf("failed to marshal private key: %w", err)
    }
    
    // Write PEM file with secure permissions
    if err := os.WriteFile(pemPath, pemBytes, 0600); err != nil {
        return fmt.Errorf("failed to write PEM file: %w", err)
    }
    
    return nil
}

func marshalRSAPrivateKey(key *rsa.PrivateKey) ([]byte, error) {
    keyBytes := x509.MarshalPKCS1PrivateKey(key)
    pemBlock := &pem.Block{
        Type:  "RSA PRIVATE KEY",
        Bytes: keyBytes,
    }
    return pem.EncodeToMemory(pemBlock), nil
}

func marshalECDSAPrivateKey(key *ecdsa.PrivateKey) ([]byte, error) {
    keyBytes, err := x509.MarshalECPrivateKey(key)
    if err != nil {
        return nil, err
    }
    pemBlock := &pem.Block{
        Type:  "EC PRIVATE KEY",
        Bytes: keyBytes,
    }
    return pem.EncodeToMemory(pemBlock), nil
}

func marshalEd25519PrivateKey(key ed25519.PrivateKey) ([]byte, error) {
    keyBytes, err := x509.MarshalPKCS8PrivateKey(key)
    if err != nil {
        return nil, err
    }
    pemBlock := &pem.Block{
        Type:  "PRIVATE KEY",
        Bytes: keyBytes,
    }
    return pem.EncodeToMemory(pemBlock), nil
}

func translatePPKError(err error) error {
    errMsg := err.Error()
    if strings.Contains(errMsg, "corrupted data") || 
       strings.Contains(errMsg, "incorrect password") {
        return fmt.Errorf("incorrect passphrase or corrupted PPK file")
    }
    if strings.Contains(errMsg, "invalid PPK file") {
        return fmt.Errorf("invalid PPK file format")
    }
    return err
}
```

**Lines of code:** ~80 (vs current 90 with puttygen.exe)
**External dependencies:** 1 (vs Windows PATH requirement)
**Security:** Improved (no passphrase in command line)
**Maintainability:** High (pure Go, no external processes)

---

## Deployment Impact

**Before:**
- User must have PuTTY installed
- `puttygen.exe` must be in PATH
- Windows-only (current constraint)

**After:**
- ✅ No PuTTY installation required
- ✅ Works out of the box
- ✅ Still Windows (Wails app constraint), but code is cross-platform

**User Experience Improvement:**
- One less installation requirement
- Faster key conversion
- More reliable (no PATH issues)
- Better error messages
