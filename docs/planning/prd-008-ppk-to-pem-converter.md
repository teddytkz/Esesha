# PRD-008: PPK to PEM Converter Tool

**Version:** v1.0.0  
**Status:** Draft  
**Author:** Planner Agent  
**Created:** 2026-08-14  
**Updated:** 2026-08-14

---

## Overview

Add a Tools menu with a PPK Formatter feature that enables users to convert PuTTY Private Key (.ppk) files to OpenSSH PEM format (.pem), eliminating the need for external tools like PuTTYgen.

## Problem Statement

Users who generate SSH keys with PuTTY tools have keys in .ppk format, which esesha cannot currently use. The app only supports OpenSSH formats (.pem, .key, OpenSSH private key files). Users must manually convert .ppk files using external tools before they can use them in esesha, creating friction in the workflow.

**Who is affected:** Users migrating from PuTTY/WinSCP or working in Windows environments where PuTTY is the default SSH key generator.

## Goals

- Enable users to convert .ppk files to .pem format directly within esesha
- Eliminate dependency on external tools (PuTTYgen, ssh-keygen)
- Support both encrypted and unencrypted PPK files
- Provide clear error messages for invalid files or incorrect passphrases
- Maintain the Mission Control design system aesthetic

## Non-Goals

- Converting PEM to PPK (reverse direction) — most SSH tools support PEM natively
- Supporting PPK v1 format (legacy, insecure) — only PPKv2 and PPKv3
- Batch conversion of multiple files — single file at a time is sufficient
- Editing or generating new keys — this is a conversion-only tool

---

## Feature Specification

### User Stories

- As a PuTTY user, I want to convert my .ppk private keys to .pem format, so I can use them in esesha without external tools
- As a user with encrypted PPK files, I want to enter my passphrase during conversion, so my keys are decrypted and converted correctly
- As a user, I want clear error messages when conversion fails, so I understand what went wrong (wrong passphrase, invalid file, unsupported format)

### Acceptance Criteria

- [ ] New "Tools" menu appears in menu bar (between File and Help)
- [ ] "PPK Formatter" menu item appears under Tools menu
- [ ] Clicking "PPK Formatter" opens a modal dialog
- [ ] Dialog has two file selection steps: source .ppk file, destination .pem file
- [ ] Dialog prompts for passphrase if PPK file is encrypted
- [ ] Conversion succeeds for valid unencrypted PPK files
- [ ] Conversion succeeds for valid encrypted PPK files with correct passphrase
- [ ] Error shown for invalid PPK files (corrupted, wrong format)
- [ ] Error shown for wrong passphrase on encrypted PPK files
- [ ] Success message shown after successful conversion
- [ ] Dialog follows Mission Control design system (glass morphism, cyan accents)
- [ ] Dialog is keyboard accessible (Tab, Enter, Escape)

---

## Technical Design

### Architecture Overview

```
User clicks "Tools > PPK Formatter"
  ↓
Frontend opens PPKConverterDialog
  ↓
User selects source .ppk file (runtime.OpenFileDialog)
  ↓
Frontend detects if encrypted (read file header)
  ↓
If encrypted: prompt for passphrase
  ↓
User selects destination .pem file (runtime.SaveFileDialog)
  ↓
Frontend calls ConvertPPKToPEM(ppkPath, pemPath, passphrase)
  ↓
Backend uses github.com/ScaleFT/sshkeys to parse PPK
  ↓
Backend converts to OpenSSH PEM format
  ↓
Backend writes .pem file
  ↓
Frontend shows success/error message
```

### Codebase Context

**Existing patterns to follow:**

1. **Menu system**: `App.tsx` lines 597-670 — custom menu bar with File/Help menus, click-outside close, keyboard support
2. **Modal dialogs**: `App.tsx` lines 1257-1288 (About dialog), 922-1009 (Add Connection), 1011-1145 (Edit Connection) — glass morphism overlay, ref-based focus, Escape key close
3. **File pickers**: `app.go` lines 240-248 (`SelectPrivateKeyFile`), 403-410 (`BackupConnections`) — `runtime.OpenFileDialog` and `runtime.SaveFileDialog` with filters
4. **Error handling**: `App.tsx` throughout — `formError` state, red text display, clear on success
5. **Auth patterns**: `internal/ssh/client.go` lines 33-82 — `ssh.ParsePrivateKey`, `ssh.ParsePrivateKeyWithPassphrase` for encrypted keys

**Current key support:**
- `.pem`, `.key`, `id_rsa`, `id_ecdsa`, `id_ed25519` (OpenSSH formats)
- Encrypted OpenSSH keys supported via `ssh.ParsePrivateKeyWithPassphrase`
- `.ppk` format **NOT** supported (PuTTY proprietary format)

### Data Model

No database changes required. This is a file conversion utility operating on the filesystem.

**File formats:**

**PPK v2 format (PuTTY):**
```
PuTTY-User-Key-File-2: ssh-rsa
Encryption: aes256-cbc (or "none" for unencrypted)
Comment: imported-openssh-key
Public-Lines: 6
<base64 public key data>
Private-Lines: 14
<base64 encrypted/plaintext private key data>
Private-MAC: <hmac-sha1 signature>
```

**PPK v3 format (PuTTY 0.75+):**
```
PuTTY-User-Key-File-3: ssh-rsa
Encryption: aes256-cbc (or "none")
Comment: imported-openssh-key
Public-Lines: 6
<base64 public key data>
Key-Derivation: Argon2id
Argon2-Memory: 8192
Argon2-Passes: 13
Argon2-Parallelism: 1
Argon2-Salt: <hex salt>
Private-Lines: 14
<base64 encrypted/plaintext private key data>
Private-MAC: <hmac-sha256 signature>
```

**OpenSSH PEM format (output):**
```
-----BEGIN RSA PRIVATE KEY-----
<base64 private key data>
-----END RSA PRIVATE KEY-----
```

### API Changes

**New Backend Method (app.go):**

```go
// ConvertPPKToPEM converts a PuTTY private key file (.ppk) to OpenSSH PEM format
func (a *App) ConvertPPKToPEM(ppkPath, pemPath, passphrase string) error
```

**Parameters:**
- `ppkPath` (string): absolute path to source .ppk file
- `pemPath` (string): absolute path to destination .pem file
- `passphrase` (string): passphrase for encrypted PPK (empty string if unencrypted)

**Returns:**
- `error`: nil on success, error message on failure

**Error cases:**
- File not found: `"PPK file not found: %s"`
- Invalid PPK format: `"Invalid PPK file format: not a valid PuTTY key file"`
- Wrong passphrase: `"Incorrect passphrase or corrupted key file"`
- Unsupported key type: `"Unsupported key type: %s (only RSA, ECDSA, Ed25519 supported)"`
- Write failure: `"Failed to write PEM file: %s"`

**New Frontend Export (wailsjs/go/main/App.d.ts):**

```typescript
export function ConvertPPKToPEM(ppkPath: string, pemPath: string, passphrase: string): Promise<void>;
```

### UI Changes

**New Menu Item:**

```tsx
// App.tsx - add to menu bar after File menu, before Help menu
<div className={styles.menuItem}>
  <button
    className={`${styles.menuItem} ${openMenu === 'tools' ? styles.menuItemOpen : ''}`}
    onClick={() => toggleMenu('tools')}
    role="menuitem"
    aria-expanded={openMenu === 'tools'}
  >
    Tools
  </button>
  {openMenu === 'tools' && (
    <div className={styles.menuDropdown} role="menu" aria-label="Tools menu">
      <button type="button" className={styles.dropdownItem} role="menuitem" onClick={handlePPKFormatter}>
        <Wrench className={styles.dropdownIcon} size={16} />
        PPK Formatter
      </button>
    </div>
  )}
</div>
```

**New Dialog Component:**

Create `frontend/src/components/PPKConverterDialog.tsx`:

```tsx
interface PPKConverterDialogProps {
  onClose: () => void;
}

export default function PPKConverterDialog({ onClose }: PPKConverterDialogProps) {
  // State: step (1=select source, 2=passphrase, 3=select dest), ppkPath, pemPath, passphrase, error, success, converting
  // UI: Multi-step form with file pickers, passphrase input, convert button, progress indicator
}
```

**Dialog flow:**

1. **Step 1**: "Select PPK File" button → opens file picker (`.ppk` filter)
2. **Auto-detect encryption**: Read first 3 lines, check `Encryption:` field
3. **Step 2 (if encrypted)**: Show passphrase input field
4. **Step 3**: "Select Output PEM File" button → save file dialog (`.pem` default)
5. **Convert button**: Calls `ConvertPPKToPEM`, shows spinner, displays result

**Design tokens (Mission Control):**
- Background: `var(--bg-surface-2)` with glass morphism
- Border: `var(--accent-primary)` 1px with glow
- Buttons: cyan primary, glass secondary
- Error text: `var(--status-error)` red
- Success text: `var(--accent-primary)` cyan

---

## Implementation Plan

### Phase 1: Library Research & Backend Foundation

**Depends on:** Nothing  
**Parallelizable:** Yes

| Task | Agent              | Files                           | Description                                                                                                   |
| ---- | ------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1.1  | Backend Developer  | `go.mod`, `go.sum`              | Add dependency: `github.com/ScaleFT/sshkeys` (PPK parsing library). Run `go get github.com/ScaleFT/sshkeys`. |
| 1.2  | Backend Developer  | `internal/converter/ppk.go`     | Create new package `converter` with `ParsePPK(data []byte, passphrase string) (interface{}, error)` helper.  |
| 1.3  | Backend Developer  | `internal/converter/ppk_test.go` | Unit tests: unencrypted PPK, encrypted PPK, invalid format, wrong passphrase. Use test fixtures.              |

**Sub-Agent Guidance:**
- Task 1.1 and 1.2 can be parallel: 1.1 fetches library while 1.2 creates package structure
- Task 1.3 depends on 1.1 and 1.2 (needs library and helper function)

**Library choice rationale:**
- `github.com/ScaleFT/sshkeys` supports PPKv2 and PPKv3 formats
- Handles both encrypted and unencrypted keys
- Converts to `crypto.Signer` interface compatible with `golang.org/x/crypto/ssh`
- Active maintenance, used in production tools

**Alternative considered:**
- `golang.org/x/crypto/ssh` — NO PPK support (only OpenSSH formats)
- Manual parsing — Reinventing the wheel, high risk of bugs

### Phase 2: Backend API Integration

**Depends on:** Phase 1

| Task | Agent             | Files                       | Description                                                                                                                                               |
| ---- | ----------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1  | Backend Developer | `app.go`                    | Add `ConvertPPKToPEM(ppkPath, pemPath, passphrase string) error` method. Use `converter.ParsePPK`, convert to PEM using `x/crypto/ssh.MarshalPrivateKey`. |
| 2.2  | Backend Developer | `app.go`                    | Add imports: `esesha/internal/converter`, `encoding/pem`, `golang.org/x/crypto/ssh`. Update error messages with user-friendly text.                       |
| 2.3  | Backend Developer | `internal/converter/pem.go` | Add `ToPEM(key interface{}) ([]byte, error)` helper to convert parsed key to PEM bytes.                                                                   |

**Sub-Agent Guidance:**
- All tasks sequential (2.1 needs 2.3, but 2.3 can be written first as a pure helper)

### Phase 3: Frontend Dialog Component

**Depends on:** Nothing (can parallel with Phase 1-2)  
**Parallelizable:** Yes

| Task               | Agent              | Files                                        | Description                                                                                                                                                  |
| ------------------ | ------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 3.1                | Frontend Developer | `frontend/src/components/PPKConverterDialog.tsx` | Create dialog component: multi-step form (select source, passphrase if needed, select dest), state management, file picker integration, error/success display. |
| 3.2                | Frontend Developer | `frontend/src/components/PPKConverterDialog.module.css` | Mission Control styling: glass morphism, cyan borders, spacing, responsive layout, error/success states, spinner animation.                                   |
| 3.3                | Frontend Developer | `frontend/src/types/wails.d.ts`             | Add `ConvertPPKToPEM` TypeScript signature if not auto-generated.                                                                                            |

**Sub-Agent Guidance:**
- Task 3.1 and 3.2 can be split: one writes JSX structure, one writes styles
- Task 3.3 is atomic (single type signature)

**Component structure:**

```tsx
PPKConverterDialog
├── Modal overlay (glass morphism)
├── Header: "PPK to PEM Converter"
├── Step indicator (1/2 or 1/3 depending on encryption)
├── Step 1: Source file picker
│   └── Button: "Select PPK File" → runtime.OpenFileDialog
├── Step 2 (conditional): Passphrase input
│   └── Input type="password" with show/hide toggle
├── Step 3: Destination file picker
│   └── Button: "Select Output Location" → runtime.SaveFileDialog
├── Action buttons: Convert (primary), Cancel (secondary)
├── Progress indicator (spinner during conversion)
├── Result message (success/error)
└── Close button (X)
```

### Phase 4: Menu Integration

**Depends on:** Phase 3 (dialog component must exist)

| Task               | Agent              | Files                          | Description                                                                                                                                       |
| ------------------ | ------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1                | Frontend Developer | `frontend/src/components/App.tsx` | Add "Tools" menu to menu bar (after File, before Help). Add `openMenu` type: `'' \| 'file' \| 'tools' \| 'help'`.                                 |
| 4.2                | Frontend Developer | `frontend/src/components/App.tsx` | Add "PPK Formatter" menu item under Tools. Import `Wrench` icon from lucide-react. Add `showPPKConverter` state and `handlePPKFormatter` handler. |
| 4.3                | Frontend Developer | `frontend/src/components/App.tsx` | Render `<PPKConverterDialog>` when `showPPKConverter` is true. Pass `onClose` callback to reset state.                                            |
| 4.4                | Frontend Developer | `frontend/src/components/App.module.css` | No new styles needed (reuse existing `.menuItem`, `.menuDropdown`, `.dropdownItem` classes).                                                      |

**Sub-Agent Guidance:**
- Tasks 4.1-4.3 are sequential (each modifies App.tsx in different sections)
- Task 4.4 is validation only (check if existing styles sufficient)

### Phase 5: Wails Binding & Testing

**Depends on:** Phase 2 (backend API), Phase 4 (frontend integration)

| Task | Agent              | Files                                   | Description                                                                                                                   |
| ---- | ------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 5.1  | Backend Developer  | Terminal                                | Run `wails generate module` to regenerate bindings for new `ConvertPPKToPEM` method.                                         |
| 5.2  | Backend Developer  | `frontend/wailsjs/go/main/App.js`       | Verify `ConvertPPKToPEM` export exists. Run `tsc --noEmit` to check TypeScript types.                                        |
| 5.3  | Debugger/Reviewer  | All                                     | Manual test: unencrypted PPK → PEM, encrypted PPK → PEM (correct passphrase), wrong passphrase, invalid file, UI keyboard nav. |
| 5.4  | Backend Developer  | `internal/converter/integration_test.go` | Integration test: full conversion flow with real PPK test fixtures (RSA, ECDSA, Ed25519).                                     |

**Sub-Agent Guidance:**
- Task 5.1-5.2 atomic (binding generation + verification)
- Task 5.3 can start when frontend and backend are both complete
- Task 5.4 can be written anytime after Phase 1 (helper functions exist)

### Phase 6: Review & Documentation (Always Last)

**Depends on:** All implementation phases

| Task | Agent             | Description                                                                                                       |
| ---- | ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| 6.1  | Debugger/Reviewer | Verify all acceptance criteria met, test edge cases (empty file, binary corruption, permission errors).          |
| 6.2  | Security          | Security review: passphrase handling (not logged/leaked), file permissions (PEM written with 0600 mode).         |
| 6.3  | Documentation     | Update `docs/planning/changelog.md` with PRD-008 entry. Add user guide section if needed.                        |
| 6.4  | Documentation     | Update README.md to mention PPK conversion support. Consider adding to "Features" section.                       |

---

## Risks & Mitigations

| Risk                                                        | Impact | Likelihood | Mitigation                                                                                                                 |
| ----------------------------------------------------------- | ------ | ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| `github.com/ScaleFT/sshkeys` doesn't support PPKv3         | High   | Low        | Test with PPKv3 files first. Fallback: use `github.com/drakkan/sftpgo` crypto package (has PPKv3 support).                |
| PPK passphrase incorrect but no clear error from library   | Medium | Medium     | Catch generic parse errors, show user-friendly message: "Incorrect passphrase or corrupted key file".                     |
| PEM file written with wrong permissions (world-readable)   | High   | Medium     | Explicitly set file mode to 0600 (owner read/write only) using `os.OpenFile` with mode parameter.                         |
| Large PPK files (>1MB) cause UI freeze during conversion   | Low    | Low        | Conversion is fast (pure crypto, no network). If needed, add goroutine + progress callback.                               |
| User selects non-PPK file (e.g., .txt) and conversion fails | Low    | High       | Validate file header before conversion: check for `PuTTY-User-Key-File-` magic string. Show error: "Not a valid PPK file". |

## Rollback Strategy

**How to revert:**

1. Remove "Tools" menu from `App.tsx` (revert lines added in Phase 4.1-4.3)
2. Remove `PPKConverterDialog.tsx` and `.module.css` files
3. Remove `ConvertPPKToPEM` method from `app.go`
4. Remove `internal/converter/` package
5. Remove `github.com/ScaleFT/sshkeys` dependency: `go mod tidy`
6. Regenerate Wails bindings: `wails generate module`
7. Rebuild frontend: `npm run build`

**Data impact:** None (no database changes, no user data affected)

**User impact:** Feature removed, no other functionality affected

---

## Version History

| Version | Date       | Summary      |
| ------- | ---------- | ------------ |
| v1.0.0  | 2026-08-14 | Initial draft |
