# PPK to PEM Converter (PPK Formatter)

**Last updated:** 2026-08-14

Convert PuTTY private keys (`.ppk`) into OpenSSH PEM keys (`.pem`) directly from esesha, using **Tools → PPK Formatter**.

---

## Contents

- [Why convert PPK to PEM?](#why-convert-ppk-to-pem)
- [Requirements](#requirements)
- [Step-by-step: converting a key](#step-by-step-converting-a-key)
- [Using the converted key in esesha](#using-the-converted-key-in-esesha)
- [Troubleshooting](#troubleshooting)
- [Security notes](#security-notes)
- [FAQ](#faq)
- [For developers](#for-developers)

---

## Why convert PPK to PEM?

`.ppk` (PuTTY Private Key) is a **PuTTY-specific** container format. It is not understood by OpenSSH, `ssh`, `scp`, Ansible, Git, cloud CLIs — or by esesha, which uses the Go `golang.org/x/crypto/ssh` library.

`.pem` (OpenSSH/PEM-encoded private key) is the standard format those tools expect.

| Format | Used by | Works in esesha |
| ------ | ------- | --------------- |
| `.ppk` | PuTTY, Pageant, PSCP, WinSCP (PuTTY mode) | ❌ No |
| `.pem` | OpenSSH, esesha, most CLIs and CI systems | ✅ Yes |

**Typical reason to use this tool:** you are migrating from PuTTY to esesha and your only copy of the key is a `.ppk` file.

---

## Requirements

- **Cross-platform** — the converter runs on **Windows, macOS, and Linux**.
- **No external dependencies required** — esesha converts PPK files with a built-in pure-Go parser. **PuTTY is not needed** and nothing has to be installed or added to `PATH`.

> **Why no external tool?** The conversion is done entirely in-process by the `github.com/edutko/putty-go` library — the same reference-quality PPK parsing PuTTY uses, with no child process, no `PATH` lookup, and no PuTTY installation. This means it works everywhere esesha runs and keeps your passphrase in memory only.

---

## Step-by-step: converting a key

1. **Open the tool.** In the menu bar, click **Tools → PPK Formatter**.
   The **PPK to PEM Converter** dialog opens, showing a 3-step indicator (1 · 2 · 3) that fills in as you complete each step.

2. **Step 1 — select the source PPK file.** Click **Select PPK File** and pick your `.ppk` file.
   The chosen path appears next to the button (hover it to see the full path if it's truncated).

3. **Step 2 — enter the passphrase.** If your PPK is passphrase-protected, type it into the **Passphrase** field.
   Leave it **blank** if the key is unencrypted. The field is masked and never shown in plain text.

4. **Step 3 — choose where to save the PEM.** Click **Select Output**.
   A save dialog opens, pre-filled with a suggested filename derived from your PPK (`my-server.ppk` → `my-server.pem`) in the same folder. Adjust the location or name if you like, then confirm.

5. **Convert.** Click **Convert**. The button shows a spinner and reads *Converting…* while it works.
   - On success: a green **"Successfully converted PPK to PEM"** banner appears and the dialog closes automatically after 2 seconds.
   - On failure: a red banner explains what went wrong — fix it and click **Convert** again.

**Cancel at any time** with the **Cancel** button, the **✕** in the header, pressing **Escape**, or clicking outside the dialog.

### Keyboard usage

| Key | Action |
| --- | ------ |
| `Tab` / `Shift+Tab` | Move between controls (focus stays inside the dialog) |
| `Enter` / `Space` | Activate the focused button |
| `Escape` | Close the dialog |

The **Convert** button stays disabled until both a source PPK **and** a destination PEM have been chosen.

---

## Using the converted key in esesha

1. Click **[+] New Connection** (or edit an existing one).
2. Set **Authentication** to **Private Key**.
3. Browse to the `.pem` file you just created.
4. Save and connect. If the original PPK had a passphrase, the converted PEM keeps it — you'll be prompted on connect.

---

## Troubleshooting

### Error: `Incorrect passphrase or corrupted key file`

- Re-type the passphrase carefully — check **Caps Lock** and your keyboard layout.
- The passphrase is the one you set **in PuTTYgen when the key was created**, not your server login password.
- If you're certain the passphrase is right, the `.ppk` may be damaged. Test it by loading the file in PuTTYgen directly (**Load** → enter passphrase). If PuTTYgen also rejects it, the file is corrupted and must be regenerated on the server side.

### Error: `Invalid PPK file format: not a valid PuTTY key file`

The selected file isn't a PuTTY private key. esesha checks that the file starts with `PuTTY-User-Key-File-2` or `PuTTY-User-Key-File-3`.

- Make sure you selected the **private** key (`.ppk`), not a public key (`.pub`), an already-converted `.pem`, or a certificate.
- Check the first line of the file:

```powershell
Get-Content .\my-server.ppk -TotalCount 1
```

Expected output resembles `PuTTY-User-Key-File-3: ssh-ed25519`.

### Error: `PPK file is encrypted, passphrase required`

The key is passphrase-protected but the passphrase field was left blank. Fill in **Step 2** and convert again.

### Error: `PPK file not found`

The file was moved, renamed, or deleted after you selected it (or it lives on a disconnected network drive). Re-select the file.

### Error: `failed to set file permissions`

The PEM was written, but esesha could not restrict its permissions. This usually means the destination is on a filesystem that doesn't support permission changes (some network shares, FAT32 USB drives).

**Treat the output as unprotected:** move it to a local folder under your user profile and delete the copy on the share.

### Nothing happens when I click Convert

The **Convert** button is disabled until **both** Step 1 (source PPK) and Step 3 (destination PEM) are set. Check that a path is shown next to each of those buttons.

---

## Security notes

**Your private key is sensitive.** Treat the converted `.pem` with the same care as the original `.ppk`.

- **File permissions** — esesha sets the output PEM to mode `0600` (owner read/write only) immediately after conversion. If that fails, you get an explicit error rather than a silently world-readable key.
- **Passphrase handling** — the passphrase is held in memory only for the duration of the conversion and never written to disk, logged, or included in error messages. Because conversion runs entirely in-process (no child process), the passphrase is never exposed on the command line or in the process list.
- **The passphrase is preserved** — a passphrase-protected PPK produces a passphrase-protected PEM. The converter does not strip encryption from your key.
- **Choose the destination carefully** — avoid synced or shared folders (OneDrive, Dropbox, network shares, `C:\Users\Public`). A good default is alongside your other keys, e.g. `%USERPROFILE%\.ssh\`.
- **Keep or delete the original?** Keep the `.ppk` only if you still use PuTTY. Otherwise delete it so there are fewer copies of your key to protect.

---

## FAQ

**Which PPK versions are supported?**
PPK v2 and PPK v3 (PuTTY 0.75+), encrypted or unencrypted.

**Which key algorithms work?**
RSA, ECDSA (P-256/P-384/P-521), and Ed25519 — parsed by the built-in pure-Go library.

**Does it work on Linux or macOS?**
Yes — the converter is cross-platform (Windows, macOS, Linux). No PuTTY required.

**Is my original `.ppk` file modified?**
No. The source file is opened read-only; the conversion writes a brand-new PEM file.

**Can I convert PEM back to PPK?**
Not in esesha. Use PuTTYgen: **Load** the PEM, then **Save private key** as `.ppk`.

**Can I convert several keys at once?**
Not yet — the dialog handles one key per run. For bulk work on the command line, use PuTTY's `puttygen` CLI if you have it installed.

**Why does the dialog close by itself after a successful conversion?**
It auto-closes 2 seconds after success so you can go straight back to your connections. Nothing is lost — the PEM is already written to the path you chose.

**Do I need PuTTY for anything in esesha?**
No. PuTTY is **not required** for any feature — the PPK converter is fully native, and all SSH and SFTP functionality is native too.

---

## For developers

**Backend** — `internal/converter/ppk.go`

```go
func ConvertPPKToPEM(ppkPath, pemPath, passphrase string) error
```

Flow: `ppk.LoadKeypair(ppkPath, []byte(passphrase))` (handles v2/v3, encrypted/unencrypted, all key types) → `keyPair.Private()` → marshal to PEM (`RSA PRIVATE KEY` / `EC PRIVATE KEY` / `PRIVATE KEY`) → `os.WriteFile(pemPath, pemBytes, 0600)`.

No `os/exec`, no `puttygen.exe`, no `runtime.GOOS` guard — the conversion is fully in-process and cross-platform. Errors are mapped to friendly messages (`MAC`/`decrypt`/`incorrect password` → *Incorrect passphrase or corrupted key file*; `unsupported`/`invalid` → *Invalid PPK file format*; not-exist → *PPK file not found*).

**Wails binding** — `app.go`

```go
func (a *App) ConvertPPKToPEM(ppkPath, pemPath, passphrase string) error
```

**Frontend** — `frontend/src/components/PPKConverterDialog.tsx`, styled by `PPKConverterDialog.module.css` following the [design system](../DESIGN-SYSTEM.md). Mounted from `App.tsx` via the `showPPKConverter` state, toggled by the **Tools → PPK Formatter** menu item. The source picker reuses the backend `SelectPrivateKeyFile()`; the destination picker uses the Wails runtime `SaveFileDialog`.

**Tests** — `internal/converter/ppk_test.go` (9 tests, all run on any platform):

```powershell
go test ./internal/converter/
```

Coverage: invalid format, file not found, unencrypted RSA, encrypted RSA, unencrypted ECDSA, Ed25519, wrong passphrase, PPK v3, PPK v2. Real-key conversion is verified by fixtures under `internal/converter/testdata/` — no PuTTY installation needed.

---

**See also:** [Documentation index](../README.md) · [PRD-008](../planning/prd-008-ppk-to-pem-converter.md) · [Changelog](../planning/changelog.md)
