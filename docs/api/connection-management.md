# Connection Management API

**Last updated:** 2026-08-07

Backend API reference for SSH connection CRUD operations exposed to the frontend via Wails bindings.

---

## Overview

Connection management functions are implemented in `app.go` and bound to the frontend via Wails. All functions are methods on the `App` struct and accessible via `@wailsjs/go/main/App` in TypeScript.

**Storage:** Connections are stored in `connections.json` next to the executable, managed by `internal/db/store.go`. Passwords are encrypted using Windows DPAPI (CurrentUser scope).

---

## API Methods

### ListConnections

**Description:** Retrieve all saved SSH connections from storage.

**Go Signature:**
```go
func (a *App) ListConnections() ([]models.Connection, error)
```

**TypeScript Import:**
```typescript
import { ListConnections } from '@wailsjs/go/main/App';
```

**Usage:**
```typescript
const connections = await ListConnections();
```

**Returns:**
```typescript
models.Connection[]
```

**Connection Model:**
```typescript
interface Connection {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;          // Empty string (not returned)
  privateKeyPath: string;    // Empty if password auth
}
```

**Error Responses:**
| Scenario | Error Message |
|----------|---------------|
| Storage read failure | `"failed to read storage: {error}"` |
| JSON decode failure | `"failed to decode connections: {error}"` |

---

### CreateConnection

**Description:** Create a new SSH connection and save to storage.

**Go Signature:**
```go
func (a *App) CreateConnection(name, host string, port int, username, password, privateKeyPath string) error
```

**TypeScript Import:**
```typescript
import { CreateConnection } from '@wailsjs/go/main/App';
```

**Usage:**
```typescript
// Password authentication
await CreateConnection('My Server', '192.168.1.10', 22, 'root', 'mypassword', '');

// Private key authentication
await CreateConnection('My Server', '192.168.1.10', 22, 'root', '', 'C:\\Users\\user\\.ssh\\id_rsa');
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Connection display name |
| `host` | string | Yes | SSH server hostname or IP |
| `port` | number | Yes | SSH server port (typically 22) |
| `username` | string | Yes | SSH username |
| `password` | string | Conditional | Password for auth (required if no private key) |
| `privateKeyPath` | string | Conditional | Path to private key file (required if no password) |

**Validation:**
- At least one of `password` or `privateKeyPath` must be non-empty
- `port` must be a valid port number (1-65535)

**Error Responses:**
| Scenario | Error Message |
|----------|---------------|
| Both auth fields empty | `"either password or privateKeyPath must be provided"` |
| Storage write failure | `"failed to save connection: {error}"` |

---

### UpdateConnection

**Description:** Update an existing SSH connection. **Password field is optional** — if empty, the current password is preserved.

**Go Signature:**
```go
func (a *App) UpdateConnection(id int, name, host string, port int, username, password, privateKeyPath string) error
```

**TypeScript Import:**
```typescript
import { UpdateConnection } from '@wailsjs/go/main/App';
```

**Usage:**
```typescript
// Update connection, keep current password
await UpdateConnection(1, 'Updated Name', '192.168.1.20', 22, 'admin', '', '');

// Update connection, change password
await UpdateConnection(1, 'My Server', '192.168.1.10', 22, 'root', 'newpassword', '');

// Switch to private key authentication
await UpdateConnection(1, 'My Server', '192.168.1.10', 22, 'root', '', 'C:\\Users\\user\\.ssh\\id_rsa');
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Connection ID to update |
| `name` | string | Yes | Connection display name |
| `host` | string | Yes | SSH server hostname or IP |
| `port` | number | Yes | SSH server port |
| `username` | string | Yes | SSH username |
| `password` | string | Optional | New password (empty = keep current) |
| `privateKeyPath` | string | Optional | Path to private key (empty = password auth) |

**Behavior:**
- **Empty `password`:** Current encrypted password is preserved in storage
- **Non-empty `password`:** Password is updated and re-encrypted
- **Non-empty `privateKeyPath`:** Switches to private key auth (password cleared)
- **Both empty:** Uses current password if it exists, otherwise error

**Validation:**
- Connection with `id` must exist
- After update, connection must have at least one valid auth method

**Error Responses:**
| Scenario | Error Message |
|----------|---------------|
| Connection not found | `"connection not found"` |
| No auth method after update | `"either password or privateKeyPath must be provided"` |
| Storage write failure | `"failed to update connection: {error}"` |

---

### DeleteConnection

**Description:** Delete an SSH connection from storage.

**Go Signature:**
```go
func (a *App) DeleteConnection(id int) error
```

**TypeScript Import:**
```typescript
import { DeleteConnection } from '@wailsjs/go/main/App';
```

**Usage:**
```typescript
await DeleteConnection(1);
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Connection ID to delete |

**Error Responses:**
| Scenario | Error Message |
|----------|---------------|
| Connection not found | `"connection not found"` |
| Storage write failure | `"failed to delete connection: {error}"` |

---

### SelectPrivateKeyFile

**Description:** Open a native file picker dialog to select an SSH private key file. Filters for common private key extensions.

**Go Signature:**
```go
func (a *App) SelectPrivateKeyFile() (string, error)
```

**TypeScript Import:**
```typescript
import { SelectPrivateKeyFile } from '@wailsjs/go/main/App';
```

**Usage:**
```typescript
const filePath = await SelectPrivateKeyFile();
if (filePath) {
  setFormData({...formData, privateKeyPath: filePath});
}
```

**Returns:**
- **Success:** Absolute file path as string (e.g., `"C:\\Users\\user\\.ssh\\id_rsa"`)
- **Cancel:** Empty string `""`

**File Filters:**
- Private Keys: `*.pem`, `*.key`, `*` (all files)
- Default extension: None (user can select any file)

**Error Responses:**
| Scenario | Error Message |
|----------|---------------|
| Dialog error | `"failed to open file picker: {error}"` |

---

## Data Model

### Connection

**Storage format** (`connections.json`):
```json
{
  "connections": [
    {
      "id": 1,
      "name": "Production Server",
      "host": "192.168.1.10",
      "port": 22,
      "username": "root",
      "password": "AQAAANCMnd8BFdERjHoAwE/Cl+s...",  // DPAPI encrypted
      "privateKeyPath": ""
    },
    {
      "id": 2,
      "name": "Dev Server",
      "host": "10.0.0.5",
      "port": 2222,
      "username": "developer",
      "password": "",
      "privateKeyPath": "C:\\Users\\user\\.ssh\\id_rsa"
    }
  ]
}
```

**TypeScript model** (`@wailsjs/go/models`):
```typescript
export namespace models {
  export class Connection {
    id: number;
    name: string;
    host: string;
    port: number;
    username: string;
    password: string;
    privateKeyPath: string;

    static createFrom(source: any = {}) {
      return new Connection(source);
    }

    constructor(source: any = {}) {
      if ('string' === typeof source) source = JSON.parse(source);
      this.id = source["id"];
      this.name = source["name"];
      this.host = source["host"];
      this.port = source["port"];
      this.username = source["username"];
      this.password = source["password"];
      this.privateKeyPath = source["privateKeyPath"];
    }
  }
}
```

---

## Security Notes

### Password Encryption

- **Algorithm:** Windows DPAPI (Data Protection API) with CurrentUser scope
- **Key derivation:** Automatic via Windows — tied to user's login credentials
- **Storage:** Encrypted bytes are base64-encoded in `connections.json`
- **Decryption:** Automatic when calling `UpdateConnection` with empty password (backend retrieves and preserves encrypted value)

### Private Key Handling

- **Storage:** Only the file path is stored, not the key contents
- **Passphrase prompt:** If private key is encrypted, the user is prompted for passphrase at connection time (not stored)
- **File permissions:** Frontend does not validate private key file permissions (user responsibility)

---

## Common Patterns

### Connection List Refresh

After any mutation operation (create/update/delete), refresh the connection list:

```typescript
const loadConnections = async () => {
  try {
    const result = await ListConnections();
    setConnections(result || []);
  } catch (err) {
    console.error('Failed to load connections:', err);
  }
};

// After create
await CreateConnection(...);
await loadConnections();

// After update
await UpdateConnection(...);
await loadConnections();

// After delete
await DeleteConnection(id);
await loadConnections();
```

### Edit Connection with Password Preservation

Leave the password field empty to keep the current password:

```typescript
const handleSaveEdit = async () => {
  await UpdateConnection(
    conn.id,
    editFormData.name,
    editFormData.host,
    editFormData.port,
    editFormData.username,
    editFormData.password,  // Empty string = keep current password
    editFormData.privateKeyPath
  );
  await loadConnections();
};
```

### Auth Type Switching

Clear the inactive field when switching authentication types:

```typescript
// Switch to password auth
setAuthType('password');
setFormData({...formData, privateKeyPath: ''});

// Switch to private key auth
setAuthType('key');
setFormData({...formData, password: ''});
```

---

## Related Documentation

- [Edit Connection Feature Guide](../guides/edit-connection-feature.md) — User guide and frontend implementation
- [Wails Integration](wails-integration.md) — Complete Wails API reference
