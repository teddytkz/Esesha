# PEM Content Storage — Technical Implementation (Fix-011)

**Last updated:** 2026-08-14

Implementation details for storing SSH private key **content** (not file paths) encrypted in the database. Covers Fix-011 Phases 1–4 plus Fix-011B (validation).

---

## Contents

- [Overview](#overview)
- [Architecture & data flow](#architecture--data-flow)
- [Data model changes](#data-model-changes)
- [Encryption model (DPAPI)](#encryption-model-dpapi)
- [Backend API changes](#backend-api-changes)
- [Frontend changes](#frontend-changes)
- [Export / Import behavior](#export--import-behavior)
- [Validation (Fix-011B)](#validation-fix-011b)
- [Backward compatibility & priority](#backward-compatibility--priority)
- [Testing approach](#testing-approach)
- [Files touched](#files-touched)

---

## Overview

Private key authentication previously stored only `Connection.PrivateKeyPath` and read the file from disk at connect time. Fix-011 adds `Connection.EncryptedPrivateKey []byte`, which holds the **DPAPI-encrypted PEM content**. The key file is read once at selection time, validated, encrypted, and persisted. At connect time the content is decrypted in memory and used directly — no file access required.

---

## Architecture & data flow

```mermaid
graph TD
    A[User picks key file] --> B[SelectPrivateKeyFile]
    B --> C{Validate with ssh.ParsePrivateKey}
    C -- invalid --> X[Error: invalid SSH private key format]
    C -- valid --> D[crypto.Encrypt content via DPAPI]
    D --> E[PrivateKeyFileResult{Path, EncryptedContent}]
    E --> F[CreateConnection / UpdateConnection]
    F --> G[(esesha.bin: EncryptedPrivateKey)]

    H[ConnectSSHWithPassphrase] --> I[sshManager.ConnectWithPassphrase]
    I --> J[NewClientWithKeyPassphraseAndHostKey]
    J --> K{EncryptedPrivateKey present?}
    K -- yes --> L[crypto.Decrypt -> PEM bytes]
    K -- no, path set --> M[Read file from PrivateKeyPath]
    L --> N[ssh.ParsePrivateKey(+passphrase)]
    M --> N
    N --> O[SSH dial]
```

---

## Data model changes

`internal/models/connection.go`:

```go
type Connection struct {
    // ...existing fields...
    EncryptedPassword   []byte `json:"encrypted_password"`
    PrivateKeyPath      string `json:"privateKeyPath"`         // Deprecated: kept for backward compatibility
    EncryptedPrivateKey []byte `json:"encrypted_private_key"`  // New: stores encrypted PEM content
    // ...existing fields...
}
```

- **New:** `EncryptedPrivateKey []byte` — DPAPI-encrypted PEM content.
- **Kept (deprecated):** `PrivateKeyPath string` — retained for legacy connections; no longer written for new connections but still read as a fallback.

---

## Encryption model (DPAPI)

Encryption uses **Windows DPAPI** via `internal/crypto/dpapi.go` (`CryptProtectData` / `CryptUnprotectData`, **CurrentUser scope**).

- Same primitive used for `EncryptedPassword`.
- **Scope:** `CurrentUser` → the blob is decryptable **only by the same Windows user on the same machine**.
- This is a deliberate trade-off: keys are portable *within* a machine/user but **not** across machines or users. This is why export/import preserves the encrypted blob as-is (it cannot be re-encrypted portably).
- The storage file `esesha.bin` itself is additionally wrapped in AES-256-GCM (`internal/db/crypto.go`) with a machine-derived key; DPAPI protects the key *content* inside that file.

> Note: Do not confuse this with the machine-GUID key derivation in `internal/db/crypto.go` (used for the `esesha.bin` envelope). The private-key *content* is protected by DPAPI, not the machine-GUID key.

---

## Backend API changes

All in `app.go`.

### `SelectPrivateKeyFile() (PrivateKeyFileResult, error)`

Opens a file dialog, reads the file, **validates** it is a real SSH private key, encrypts the content with DPAPI, and returns both the path and the encrypted content.

```go
type PrivateKeyFileResult struct {
    Path             string `json:"path"`
    EncryptedContent []byte `json:"encryptedContent"`
}
```

### `CreateConnection(..., privateKeyPath string, encryptedPrivateKey []byte) (int, error)`

Now accepts `encryptedPrivateKey`. Stored directly on the connection.

### `UpdateConnection(id, ..., privateKeyPath string, encryptedPrivateKey []byte) error`

Same — updates `EncryptedPrivateKey` on the connection.

### `ImportConnectionFromBackup(..., privateKeyPath string, encryptedPassword, encryptedPrivateKey []byte) (int, error)`

Used by the backup restore path; preserves the encrypted key blob as-is.

### `ConvertPPKToPEM(ppkPath, pemPath, passphrase string) ([]byte, error)`

Now returns the **DPAPI-encrypted PEM content** (previously `error` only). The `.pem` is still written to `pemPath`, then its bytes are encrypted and returned so the UI can store them without a second file browse.

### `ConnectSSHWithPassphrase(connectionID, keyPassphrase, cols, rows)`

Passes `conn.EncryptedPrivateKey` (and `conn.PrivateKeyPath`) to the SSH manager.

---

## Frontend changes

`frontend/src/components/App.tsx` + `frontend/src/types/wails.d.ts`:

- `Connection` type gains `encrypted_private_key?: number[]` (Go `[]byte` mapped to `number[]`) and a display-only `privateKeyFileName`.
- `selectPrivateKeyFile` / `selectEditPrivateKeyFile` call `SelectPrivateKeyFile()` and store `result.EncryptedContent` into form state.
- The *Private Key* input displays `🔒 Private key stored securely` (or `🔒 <filename>`) when an encrypted key is present, otherwise the legacy file path.
- Helper text: *"Key content is encrypted and stored securely on this machine."*
- Backup import maps `encrypted_private_key` → `ImportConnectionFromBackup(..., encryptedKeyBytes)`.

---

## Export / Import behavior

`internal/db/store.go` — `exportConnection` now includes:

```go
PrivateKeyPath      string `json:"privateKeyPath"`
EncryptedPrivateKey []byte `json:"encrypted_private_key"` // Machine-bound DPAPI; preserved as-is for security
```

- **Export (`ExportJSON`):** passwords are decrypted to plain text in the backup; the `encrypted_private_key` blob is copied **as-is** (it cannot be portably re-encrypted).
- **Import (`ImportJSON`):** the `encrypted_private_key` blob is restored unchanged. It will only decrypt on the **same Windows user/machine** that created it.
- This is intentional: preserving the DPAPI blob keeps keys working on the originating machine while avoiding plaintext key exposure in the backup.

---

## Validation (Fix-011B)

Two bugs fixed after Phases 1–3:

1. **Missing PEM validation in `SelectPrivateKeyFile()`** — non-SSH files could be selected, causing cryptic connect errors. Fixed by calling `ssh.ParsePrivateKey(content)` before encryption (`app.go:269-272`); returns `invalid SSH private key format` on failure.
2. **Missing empty-content check after decryption** — `internal/ssh/client.go:75-82` now checks `len(decryptedKey) == 0` and returns `decrypted private key is empty (possible database corruption)`.

---

## Backward compatibility & priority

`internal/ssh/client.go` — `NewClientWithKeyPassphraseAndHostKey`:

```go
if len(encryptedPrivateKey) > 0 {
    // Priority 1: encrypted content from DB
    decryptedKey, err := crypto.Decrypt(encryptedPrivateKey)
    // ...empty check...
    key = decryptedKey
} else if privateKeyPath != "" {
    // Priority 2: legacy file path
    key, err = ioutil.ReadFile(privateKeyPath)
}
```

- **Priority 1:** `EncryptedPrivateKey` (decrypted in memory).
- **Priority 2:** `PrivateKeyPath` (read from disk) — legacy fallback.
- Existing connections with only a file path work unchanged. No migration step is required; old connections are never forced to adopt the new field.

---

## Testing approach

- **Unit tests** (`internal/converter/ppk_test.go`, `internal/db/store_test.go`) cover PPK→PEM conversion (9 cases: invalid format, missing file, encrypted/unencrypted RSA/ECDSA/Ed25519, wrong passphrase, PPK v2/v3) and DB store round-trips.
- **Validation tests:** `SelectPrivateKeyFile` rejects invalid files; decryption path asserts non-empty content.
- **Build verification:** `go test ./internal/db ./internal/converter ./internal/sftp ./internal/ssh` and `go build ./...` pass; `npx tsc --noEmit` clean in `frontend`.
- **Manual:** create connection with key → delete original key file → connect succeeds (proves content storage); export/import round-trip on same machine preserves connectivity.

---

## Files touched

| File | Change |
| ---- | ------ |
| `internal/models/connection.go` | Added `EncryptedPrivateKey []byte` |
| `internal/ssh/client.go` | Priority logic + empty-decryption check |
| `internal/ssh/manager.go` | Pass encrypted key through |
| `app.go` | `SelectPrivateKeyFile`, `ConvertPPKToPEM` return encrypted content; `Create`/`Update`/`Import` accept it; PEM validation |
| `internal/db/store.go` | `exportConnection` includes `encrypted_private_key`; import preserves blob |
| `frontend/src/components/App.tsx` | Store/display encrypted key, `🔒` UI |
| `frontend/src/types/wails.d.ts` | `PrivateKeyFileResult`, updated signatures |
| `frontend/wailsjs/go/main/App.{js,d.ts}` | Regenerated bindings |
