# Connection API Reference

**Last updated:** 2026-08-14

Backend (Go/Wails) API for managing SSH connections, with the Fix-011 secure private-key storage changes. All methods are exposed to the frontend via Wails bindings (`frontend/wailsjs/go/main/App.*`).

---

## Contents

- [SelectPrivateKeyFile](#selectprivatekeyfile)
- [ConvertPPKToPEM](#convertppktopem)
- [CreateConnection](#createconnection)
- [UpdateConnection](#updateconnection)
- [ImportConnectionFromBackup](#importconnectionfrombackup)
- [ConnectSSH / ConnectSSHWithPassphrase](#connectssh--connectsshwithpassphrase)
- [Data types](#data-types)
- [Error codes](#error-codes)

---

## SelectPrivateKeyFile

Opens a native file dialog, reads the selected private key, **validates** it is a real SSH key, encrypts the content with Windows DPAPI, and returns both the path and the encrypted content.

```
SelectPrivateKeyFile() -> PrivateKeyFileResult
```

**Returns:** `PrivateKeyFileResult { path: string, encryptedContent: number[] }`

**Errors:**
| Condition | Message |
| --------- | ------- |
| Dialog cancelled / OS error | underlying dialog error |
| File unreadable | `failed to read private key file: ...` |
| Not a valid SSH key | `invalid SSH private key format: ...` |
| DPAPI encrypt fails | `failed to encrypt private key: ...` |

**Example (frontend):**

```ts
const result = await SelectPrivateKeyFile();
// result.EncryptedContent is number[] (Go []byte)
await CreateConnection(name, host, port, user, "", "", result.EncryptedContent);
```

---

## ConvertPPKToPEM

Converts a PuTTY `.ppk` to OpenSSH PEM **and returns the DPAPI-encrypted PEM content** so it can be stored on the connection without a second file browse.

```
ConvertPPKToPEM(ppkPath: string, pemPath: string, passphrase: string) -> number[]
```

**Parameters:**
| Name | Type | Description |
| ---- | ---- | ----------- |
| `ppkPath` | string | Source `.ppk` file |
| `pemPath` | string | Destination `.pem` file (written to disk) |
| `passphrase` | string | Key passphrase (empty if unencrypted) |

**Returns:** `number[]` — DPAPI-encrypted PEM content (Go `[]byte`).

**Errors:** propagates converter errors (invalid PPK, wrong passphrase, write failure) plus `failed to encrypt PEM content: ...`.

> Signature changed in Fix-011: previously returned `error` only; now returns `([]byte, error)`.

---

## CreateConnection

```
CreateConnection(
  name: string,
  host: string,
  port: number,
  username: string,
  password: string,
  privateKeyPath: string,
  encryptedPrivateKey: number[]
) -> number   // new connection ID
```

- `password`: if non-empty, encrypted before storage.
- `privateKeyPath`: legacy file path (optional; kept for backward compatibility).
- `encryptedPrivateKey`: DPAPI-encrypted PEM content (optional; preferred when present).

---

## UpdateConnection

```
UpdateConnection(
  id: number,
  name: string,
  host: string,
  port: number,
  username: string,
  password: string,
  privateKeyPath: string,
  encryptedPrivateKey: number[]
) -> void
```

Updates the connection. `EncryptedPrivateKey` is overwritten with the provided value (pass `[]` to clear). `password` is only re-encrypted when non-empty.

---

## ImportConnectionFromBackup

```
ImportConnectionFromBackup(
  name: string,
  host: string,
  port: number,
  username: string,
  privateKeyPath: string,
  encryptedPassword: number[],
  encryptedPrivateKey: number[]
) -> number
```

Used by backup restore. `encryptedPassword` and `encryptedPrivateKey` are stored **as-is** (already encrypted in the backup; the latter is DPAPI machine-bound).

---

## ConnectSSH / ConnectSSHWithPassphrase

```
ConnectSSH(connectionID: number, cols: number, rows: number) -> string
ConnectSSHWithPassphrase(connectionID: number, keyPassphrase: string, cols: number, rows: number) -> string
```

Resolves the connection, decrypts `EncryptedPassword` (if any), and connects using `EncryptedPrivateKey` first, falling back to `PrivateKeyPath`. `keyPassphrase` unlocks an encrypted PEM. Returns a session ID.

---

## Data types

```ts
// frontend/src/types/wails.d.ts
interface PrivateKeyFileResult {
  path: string;
  encryptedContent: number[];
}

interface Connection {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string;
  encrypted_password?: number[];
  privateKeyPath?: string;          // Deprecated
  encrypted_private_key?: number[];  // DPAPI-encrypted PEM content
  createdAt: number;
  updatedAt: number;
}
```

**Export JSON shape** (`internal/db/store.go`):

```json
{
  "connections": [
    {
      "id": 1,
      "name": "web-01",
      "host": "10.0.0.5",
      "port": 22,
      "username": "ubuntu",
      "password": "plain-text (export only)",
      "privateKeyPath": "",
      "encrypted_private_key": "<<base64/DPAPI blob, preserved as-is>>"
    }
  ],
  "host_keys": []
}
```

---

## Error codes

| Layer | Condition | Message |
| ----- | --------- | ------- |
| Select | invalid file | `invalid SSH private key format: ...` |
| Select | encrypt | `failed to encrypt private key: ...` |
| Connect | decrypt key | `failed to decrypt private key: ...` |
| Connect | empty key | `decrypted private key is empty (possible database corruption)` |
| Connect | parse | `parse private key failed: ...` / `parse encrypted private key failed: ...` |
| Connect | dial | `ssh dial failed: ...` |
| Create/Update | not found | `connection not found` |

See also: [PEM Encryption — Technical](../technical/pem-encryption.md) and [Secure Key Storage (user guide)](../features/secure-key-storage.md).
