# PRD-007: Machine-Bound Keyless Encryption

**Version:** v1.0.0
**Status:** Draft
**Author:** Planner Agent
**Created:** 2026-08-07
**Updated:** 2026-08-07

---

## Overview

Remove the separate `esesha.bin.key` file and implement machine-bound encryption using hardware-derived keys. The application will consist of only two files: `esesha.exe` (executable) and `esesha.bin` (encrypted data).

## Problem Statement

**User Request (Indonesian):** "saya ingin cukup fileexe dan bin tanpa ke registry"
**Translation:** "I want only the exe file and bin file, without registry"

**Current state:**
- Encryption uses AES-256-GCM with 32-byte key
- Key stored in separate `esesha.bin.key` file (DPAPI protected)
- Three files total: `esesha.exe` + `esesha.bin` + `esesha.bin.key`

**User's intent:**
- Only 2 files should exist: executable + data file
- No separate key file
- No registry storage
- Automatic encryption without user interaction

**Core challenge:**
Cannot store key inside `esesha.bin` (chicken-and-egg: need key to decrypt file, but key is in the file being decrypted). Must derive key from machine-bound properties.

## Goals

- Eliminate `esesha.bin.key` file completely
- Derive encryption key deterministically from machine hardware identifiers
- Maintain AES-256-GCM encryption (only key derivation changes)
- Auto-migrate existing installations (decrypt with old key, re-encrypt with machine-derived key)
- Preserve data portability within same machine (can move folder)
- No registry usage (per user requirement)
- No password prompts (automatic operation)

## Non-Goals

- Strong security against determined attackers (machine-bound keys are reversible by anyone with system access)
- Cross-machine portability (data intentionally locked to machine)
- Protection against debugger/memory dump attacks
- Password-based encryption (explicitly avoiding user friction)
- Storing key in executable binary (complex, fragile, antivirus concerns)

---

## Feature Specification

### User Stories

- As a user, I want only `esesha.exe` and `esesha.bin` to exist, so I have fewer files to manage
- As a user, I want the app to work automatically without entering passwords, so the experience is seamless
- As a user, I want to move the app folder anywhere on my machine without breaking encryption, so I have flexibility
- As a developer, I want existing `.key` files to auto-migrate transparently, so users don't lose data

### Acceptance Criteria

- [ ] No `esesha.bin.key` file created on fresh install
- [ ] Existing `.key` files detected and used for one-time migration, then deleted
- [ ] Encryption key derived from machine ID + executable directory path
- [ ] Data remains encrypted with AES-256-GCM (only key derivation method changes)
- [ ] Application works when moved to different folder on same machine
- [ ] Application fails gracefully when `esesha.bin` is copied to different machine
- [ ] All existing tests pass with updated key derivation logic
- [ ] Build produces only `esesha.exe` (no additional files)
- [ ] Migration leaves `.key.migrated` backup for safety

---

## Technical Design

### Architecture Overview

**Current flow:**
1. App starts → `loadOrCreateKey(keyPath)` reads/creates `esesha.bin.key`
2. DPAPI decrypts key file → returns 32-byte key
3. Key used to encrypt/decrypt `esesha.bin` with AES-256-GCM

**New flow:**
1. App starts → `deriveMachineKey(exeDir)` generates key from machine ID + path
2. SHA-256 hash produces deterministic 32-byte key (no file I/O)
3. Key used to encrypt/decrypt `esesha.bin` with AES-256-GCM

**Key derivation algorithm:**
```
machineGUID = readWindowsMachineGUID()  // from registry HKLM\SOFTWARE\Microsoft\Cryptography
exePath = os.Executable()
exeDir = filepath.Dir(exePath)

// Combine inputs with delimiter
input = machineGUID + "|" + exeDir

// Hash to 32 bytes (AES-256 key size)
key = SHA256(input)
```

### Codebase Context

**Existing encryption infrastructure (PRD-006):**
- `internal/db/crypto.go`: `encryptData()`, `decryptData()`, `loadOrCreateKey()`, `saveKey()`
- `internal/db/store.go`: `New()` calls `loadOrCreateKey()`, stores key in `Store.encryptKey`
- `internal/crypto/dpapi.go`: Windows DPAPI wrapper (still used during migration)

**Files to modify:**
- `internal/db/crypto.go`: Replace `loadOrCreateKey()` with `deriveMachineKey()`, add migration helper
- `internal/db/store.go`: Update `New()` to use machine-derived key, add migration check
- `internal/db/crypto_test.go`: Update tests to use machine-derived keys
- `internal/db/store_test.go`: Update integration tests

### Data Model

No database schema changes. Only key derivation mechanism changes.

**Storage format (unchanged):**
```
Offset | Size | Field
-------|------|-------
0      | 8    | Magic: "ESESHA01"
8      | 4    | Version: uint32 big-endian (1)
12     | 12   | Nonce (AES-GCM)
24     | var  | Ciphertext (encrypted JSON)
end-16 | 16   | Auth tag (GCM)
```

### API Changes

**crypto.go changes:**

```go
// REMOVE:
func loadOrCreateKey(keyPath string) ([]byte, error)
func saveKey(keyPath string, key []byte) error

// ADD:
func deriveMachineKey(exeDir string) ([]byte, error)
func getMachineGUID() (string, error)
func migrateFromKeyFile(keyPath, dataPath string, machineKey []byte) error
```

**store.go changes:**

```go
type Store struct {
    mu          sync.RWMutex
    filePath    string
    // REMOVE: keyPath     string  
    encryptKey  []byte
    connections []*models.Connection
    hostKeys    []HostKey
    nextID      int
}

func New() (*Store, error) {
    // REPLACE: key, err := loadOrCreateKey(keyPath)
    // WITH:    key, err := deriveMachineKey(exeDir)
    //          err = migrateFromKeyFile(keyPath, jsonPath, key)
}
```

### UI Changes

None. Migration is transparent to user.

**Migration behavior (user-visible):**
- Existing `.key` files silently migrated on first run
- Console log: "Migrating from key file to machine-bound encryption..."
- Console log: "Migration complete. Old key file renamed to .key.migrated"
- Error dialog if migration fails: "Could not migrate encryption key. Ensure esesha.bin.key is present."

---

## Implementation Plan

### Phase 1: Machine ID Derivation

**Depends on:** Nothing
**Parallelizable:** No (foundation for other phases)

| Task | Agent              | Files                     | Description                                                                 |
| ---- | ------------------ | ------------------------- | --------------------------------------------------------------------------- |
| 1.1  | Backend Developer  | `internal/db/crypto.go`   | Add `getMachineGUID()` function using Windows registry API                  |
| 1.2  | Backend Developer  | `internal/db/crypto.go`   | Add `deriveMachineKey(exeDir)` function (SHA-256 hash of GUID + path)       |
| 1.3  | Backend Developer  | `internal/db/crypto_test.go` | Add unit tests for key derivation (deterministic, 32-byte output)        |

**Sub-Agent Guidance:**
- Task 1.1-1.3 are sequential (1.2 depends on 1.1, 1.3 tests 1.2)
- Use `golang.org/x/sys/windows/registry` for registry access
- Registry path: `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography\MachineGuid`
- Handle registry access errors gracefully (fallback error message)

### Phase 2: Migration Logic

**Depends on:** Phase 1
**Parallelizable:** No

| Task | Agent              | Files                     | Description                                                                 |
| ---- | ------------------ | ------------------------- | --------------------------------------------------------------------------- |
| 2.1  | Backend Developer  | `internal/db/crypto.go`   | Add `migrateFromKeyFile()` function (detect, decrypt with old key, re-encrypt) |
| 2.2  | Backend Developer  | `internal/db/crypto_test.go` | Add migration test (create old .key file, migrate, verify decryption)    |

**Sub-Agent Guidance:**
- Migration flow: detect `.key` file → decrypt `esesha.bin` with file-based key → re-encrypt with machine key → rename `.key` to `.key.migrated`
- Preserve original `.key` as `.key.migrated` (safety backup)
- If migration fails, leave files unchanged and return error

### Phase 3: Store Integration

**Depends on:** Phase 2
**Parallelizable:** No

| Task | Agent              | Files                     | Description                                                                 |
| ---- | ------------------ | ------------------------- | --------------------------------------------------------------------------- |
| 3.1  | Backend Developer  | `internal/db/store.go`    | Remove `keyPath` field from `Store` struct                                  |
| 3.2  | Backend Developer  | `internal/db/store.go`    | Replace `loadOrCreateKey()` call with `deriveMachineKey()` in `New()`       |
| 3.3  | Backend Developer  | `internal/db/store.go`    | Add migration check in `New()` (call `migrateFromKeyFile()` if `.key` exists) |
| 3.4  | Backend Developer  | `internal/db/store_test.go` | Update all tests to use machine-derived keys instead of file-based keys   |

**Sub-Agent Guidance:**
- Tasks 3.1-3.3 modify `store.go` sequentially
- Task 3.4 can start after 3.2 (tests need machine key derivation available)
- Update `New()` signature remains unchanged (no breaking API changes)

### Phase 4: Cleanup

**Depends on:** Phase 3
**Parallelizable:** Yes (independent removals)

| Task | Agent              | Files                     | Description                                                                 |
| ---- | ------------------ | ------------------------- | --------------------------------------------------------------------------- |
| 4.1  | Backend Developer  | `internal/db/crypto.go`   | Remove `loadOrCreateKey()` and `saveKey()` functions                        |
| 4.2  | Backend Developer  | `internal/db/crypto_test.go` | Remove tests for file-based key operations                                |
| 4.3  | Backend Developer  | `build.bat`               | Remove key file backup logic if present (check for `.key` references)       |

**Sub-Agent Guidance:**
- All tasks in Phase 4 are independent (can parallelize)
- Verify no references to `loadOrCreateKey` or `saveKey` remain via `grep`

### Phase 5: Review & Documentation (Always Last)

**Depends on:** Phase 4

| Task | Agent             | Description                                                                 |
| ---- | ----------------- | --------------------------------------------------------------------------- |
| 5.1  | Debugger/Reviewer | Verify all acceptance criteria (no `.key` created, migration works, tests pass) |
| 5.2  | Debugger/Reviewer | Test migration scenario (create old-format data + key, run app, verify)     |
| 5.3  | Debugger/Reviewer | Test fresh install (no existing files, app creates only `esesha.bin`)       |
| 5.4  | Debugger/Reviewer | Test cross-machine failure (copy `esesha.bin` to different PC, verify error) |
| 5.5  | Security          | Security review (assess machine-bound key security implications)             |
| 5.6  | Documentation     | Update `docs/guides/binary-storage-encryption.md` (key derivation section)   |
| 5.7  | Documentation     | Update `docs/database/schema.md` (remove key file references)                |
| 5.8  | Documentation     | Add security trade-offs section (machine-bound vs DPAPI file)                |
| 5.9  | Documentation     | Update `docs/planning/changelog.md` (PRD-007 entry)                          |

---

## Risks & Mitigations

| Risk                                         | Impact | Likelihood | Mitigation                                                                 |
| -------------------------------------------- | ------ | ---------- | -------------------------------------------------------------------------- |
| Migration fails, users lose data             | High   | Medium     | Keep `.key.migrated` backup; provide recovery instructions                 |
| Machine GUID unavailable (VM/custom Windows) | High   | Low        | Graceful error message; fallback to generated GUID (less secure)           |
| Key derivation reversible by malware         | Medium | High       | Document security model clearly; accept trade-off for convenience          |
| Moving folder breaks encryption              | Low    | Low        | Key includes exe directory path, so moving folder changes key (by design)  |
| Registry access fails (permissions)          | Medium | Low        | Catch registry errors, show clear error message with admin instructions    |

## Rollback Strategy

**If migration fails:**
1. App detects `.key.migrated` file exists
2. Rename `.key.migrated` back to `.key`
3. Use old key-file-based encryption (downgrade)
4. Log error: "Machine-bound encryption unavailable, using key file"

**Manual rollback:**
1. User keeps `.key.migrated` backup
2. Rename back to `.key`
3. Delete `esesha.bin` (if corrupted)
4. Restore from `.pre-binary-migration` backup

**Code rollback:**
- Keep `loadOrCreateKey()` and `saveKey()` in git history
- Cherry-pick commit to revert if needed

---

## Security Considerations

### Security Model Comparison

**DPAPI Key File (PRD-006):**
- ✅ Strong protection: tied to Windows user profile
- ✅ Survives folder moves
- ✅ Resistant to casual extraction
- ❌ Requires separate `.key` file
- ❌ User profile reset breaks encryption

**Machine-Bound Derivation (PRD-007):**
- ✅ No separate files (only exe + data)
- ✅ Automatic (no password prompts)
- ✅ Deterministic (no state to lose)
- ❌ Weak against system access (attacker can derive key)
- ❌ Folder move changes key (path-dependent)
- ❌ VM cloning/machine migration breaks encryption

### Threat Model

**Protected against:**
- Casual file browsing (data is encrypted)
- Storage theft without system access
- Accidental disclosure (file is binary, not readable)

**NOT protected against:**
- Malware running on same machine (can derive key)
- Debugger attached to process (key in memory)
- System administrator access (can read registry + path)
- Determined attacker with system access

**Recommendation:**
- Document this as "obfuscation-level security" not "cryptographic security"
- Suitable for: personal use, preventing casual access
- NOT suitable for: shared computers, sensitive credentials, compliance requirements

### Migration Security

**Old key file handling:**
- Rename to `.key.migrated` (not deleted immediately)
- User can manually delete after verifying app works
- Backup remains DPAPI-protected (can't be read on different machine)

---

## Version History

| Version | Date       | Summary        |
| ------- | ---------- | -------------- |
| v1.0.0  | 2026-08-07 | Initial draft  |
