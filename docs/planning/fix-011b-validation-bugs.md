# Fix Plan: Fix-011B Validation Bugs

**Related PRD:** Fix-011 (PEM Content Storage)
**Severity:** High
**Reported by:** Code Review (Fix-011)
**Date:** 2026-08-14

---

## Bug Summary

Two validation gaps discovered during Fix-011 code review (Phases 1-3 implemented):

1. **Missing PEM validation** in file selection — users can select any file type, gets encrypted/stored, fails during connection
2. **Missing empty content check** after decryption — corrupted data produces unclear error messages

Both bugs degrade user experience with cryptic error messages instead of clear validation feedback.

---

## Root Cause Analysis

**Bug #1 Root Cause:**
- `SelectPrivateKeyFile()` in `app.go` reads file content and encrypts immediately
- No validation that content is actually a valid SSH private key
- Invalid content stored in database, error only appears during SSH connection attempt
- User experience: confusing error far from the actual mistake

**Bug #2 Root Cause:**
- `NewClientWithKeyPassphraseAndHostKey()` decrypts content from database
- Assumes decryption always produces valid data
- If database corrupted or encryption key changed, empty/invalid content proceeds to `ssh.ParsePrivateKey()`
- User experience: generic parsing error instead of specific "decryption failed" message

---

## Fix Strategy

### Minimal Fix (Recommended)

**Rationale:** Both fixes are straightforward validation additions; no architectural changes needed.

**Bug #1 Fix:**
- Location: `app.go` line 268-282, `SelectPrivateKeyFile()` function
- Add validation after reading file content, before encrypting
- Use `ssh.ParsePrivateKey(content)` to verify it's a valid SSH key
- Return clear error message if validation fails
- **Risk:** Low — validation is non-invasive, doesn't change data flow
- **Effort:** 0.75 hours

**Bug #2 Fix:**
- Location: `internal/ssh/client.go` line 75-82, `NewClientWithKeyPassphraseAndHostKey()`
- Add check after decryption: `if len(decryptedKey) == 0`
- Return specific error: "decrypted private key is empty (database may be corrupted)"
- **Risk:** Low — early exit prevents downstream parsing errors
- **Effort:** 0.75 hours

**Total Effort:** 1.5 hours

---

## Implementation Tasks

| Task | Agent              | Files                             | Description                                                                 |
|------|--------------------|-----------------------------------|-----------------------------------------------------------------------------|
| 1    | Backend Developer  | `app.go`                          | Add `ssh.ParsePrivateKey()` validation after reading file, before encrypting (line 268-282) |
| 2    | Backend Developer  | `internal/ssh/client.go`          | Add empty content check after decrypting private key (line 75-82)          |
| 3    | Backend Developer  | Both files                        | Run `go test ./internal/ssh` to verify no regressions                      |

---

## Implementation Details

### Task 1: Add PEM Validation in `app.go`

**Location:** Line 268-282 in `SelectPrivateKeyFile()` function

**Current Code:**
```go
content, err := os.ReadFile(filePath)
if err != nil {
    return PrivateKeyFileResult{}, fmt.Errorf("failed to read private key file: %w", err)
}

encryptedContent, err := crypto.Encrypt(content)
```

**Add After Line 266 (after reading content, before encrypting):**
```go
// Validate that the file is actually a valid SSH private key
_, err = ssh.ParsePrivateKey(content)
if err != nil {
    return PrivateKeyFileResult{}, fmt.Errorf("invalid SSH private key format: %w", err)
}
```

**Import Required:** `golang.org/x/crypto/ssh` (already imported)

---

### Task 2: Add Empty Content Check in `internal/ssh/client.go`

**Location:** Line 75-82 in `NewClientWithKeyPassphraseAndHostKey()`

**Current Code:**
```go
decryptedKey, err := crypto.Decrypt(encryptedPrivateKey)
if err != nil {
    return nil, fmt.Errorf("failed to decrypt private key: %w", err)
}
key = decryptedKey
```

**Add After Decryption (before assigning to key):**
```go
decryptedKey, err := crypto.Decrypt(encryptedPrivateKey)
if err != nil {
    return nil, fmt.Errorf("failed to decrypt private key: %w", err)
}
if len(decryptedKey) == 0 {
    return nil, fmt.Errorf("decrypted private key is empty (database may be corrupted or encryption key changed)")
}
key = decryptedKey
```

---

## Acceptance Criteria

- [x] Bug #1: Selecting non-SSH file (txt, jpg, etc.) via `SelectPrivateKeyFile()` returns clear error message
- [x] Bug #1: Valid SSH private key files (RSA, ECDSA, Ed25519) are accepted without error
- [x] Bug #2: Empty decrypted content returns specific error about corruption/encryption key
- [x] Bug #2: Valid decrypted content proceeds to SSH connection normally
- [x] No regressions: All existing SSH tests pass (`go test ./internal/ssh`)
- [x] Error messages are user-friendly and actionable

---

## Regression Risk

**Low Risk:**

1. **Bug #1 Fix:** Validation is added *before* encryption, doesn't affect existing stored data
2. **Bug #2 Fix:** Only adds early validation, doesn't change decryption logic
3. Both fixes follow existing error handling patterns (return error, wrap with context)
4. No changes to data structures, encryption, or core SSH logic

**Potential Edge Cases:**

- Private keys with passphrases: `ssh.ParsePrivateKey()` will fail on encrypted keys, but that's acceptable — user should provide passphrase-protected keys through the normal flow
- Non-standard key formats: If validation is too strict, legitimate keys might be rejected — use `ssh.ParsePrivateKey()` which is the same validation used during connection

**Mitigation:** Run full test suite after changes to catch any unexpected behavior.

---

## Testing Strategy

**Manual Testing:**
1. Bug #1: Try selecting `.txt`, `.jpg`, `.json` files — should get clear error
2. Bug #1: Select valid PEM files (RSA, ECDSA, Ed25519) — should succeed
3. Bug #2: Simulate by manually corrupting `esesha.bin` — should get "empty key" error
4. Bug #2: Normal connection with valid encrypted key — should work

**Automated Testing:**
- Run `go test ./internal/ssh` — verify no regressions
- Run `go test ./internal/db` — verify encryption/decryption still works

---

## Version History

| Version | Date       | Summary        |
|---------|------------|----------------|
| 1.0.0   | 2026-08-14 | Initial plan   |
