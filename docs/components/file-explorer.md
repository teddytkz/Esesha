# FileExplorer Component Reference

**Last updated:** 2026-08-15

Architecture and implementation reference for the `FileExplorer` component, focused on the toolbar, the **Add** menu, and the **Create Folder / Create File** dialogs (PRD-014). For end-user instructions, see the [File Manager user guide](../user-guide/file-manager.md).

---

## Table of Contents

1. [Overview](#overview)
2. [Toolbar Buttons](#toolbar-buttons)
3. [Add Button & Creation Dialogs](#add-button--creation-dialogs)
4. [Dropdown Menu System](#dropdown-menu-system)
5. [Dialog State Management](#dialog-state-management)
6. [Validation Logic](#validation-logic)
7. [Error Handling](#error-handling-approach)
8. [Backend API Integration](#backend-api-integration)
9. [Limitations](#limitations)

---

## Overview

`frontend/src/components/FileExplorer.tsx` is a single React component (no external state library) that renders the SFTP file browser: toolbar, breadcrumb, file grid, context menu, toasts, progress bar, and inline dialogs. Styling is scoped via `FileExplorer.module.css` (CSS Modules) using the Mission Control design tokens.

The PRD-014 changes added:

- Icon-only **Upload** and **Refresh** toolbar buttons (text labels removed; `title` tooltips + `aria-label` retained).
- A new **+** (Add) button that opens a dropdown with **Create Folder** / **Create File**.
- Two new dialog kinds (`createFolder`, `createFile`) reusing the existing inline `Dialog` component.
- Two validation helpers and inline error display.

---

## Toolbar Buttons

The toolbar (`styles.toolbar`) holds, in order:

| Button | Icon | Behavior | Notes |
|--------|------|----------|-------|
| Up | `ArrowUp` | Navigate to parent directory | Disabled at `/` |
| Breadcrumb | — | Clickable path crumbs | `root` + per-segment buttons |
| **Add** | `Plus` | Toggle the Add dropdown | `aria-haspopup="menu"`, `aria-expanded`; **disabled while `uploadActive`** |
| Upload | `Upload` | Open the Upload Dialog | Icon-only; cyan accent (`styles.iconButtonUpload`) |
| Refresh | `RefreshCw` | Reload current directory | Icon-only |

Icon-only buttons use `styles.iconButton` (40×40 px) and expose `title` + `aria-label` for accessibility. The Upload button reuses `styles.iconButtonUpload` for the primary cyan fill.

```tsx
<button
  ref={addButtonRef}
  type="button"
  className={styles.iconButton}
  onClick={() => setAddMenuOpen(!addMenuOpen)}
  title="Add"
  aria-label="Create folder or file"
  aria-haspopup="menu"
  aria-expanded={addMenuOpen}
  disabled={uploadActive}
>
  <Plus size={20} aria-hidden="true" />
</button>
```

---

## Add Button & Creation Dialogs

### State Management

```typescript
const [addMenuOpen, setAddMenuOpen] = useState(false);
const addButtonRef = useRef<HTMLButtonElement>(null);
const [dialogError, setDialogError] = useState<string | null>(null);
```

The dialog itself is driven by the existing `DialogState` union, extended with two new kinds:

```typescript
type DialogState =
  | { kind: 'delete'; item: FileInfo }
  | { kind: 'rename'; item: FileInfo }
  | { kind: 'chmod'; item: FileInfo }
  | { kind: 'createFolder'; item?: FileInfo }
  | { kind: 'createFile'; item?: FileInfo }
  | null;
```

Opening a dialog closes the menu first:

```typescript
onClick={() => {
  setAddMenuOpen(false);
  setDialog({ kind: 'createFolder' });
}}
```

### Handlers

```typescript
const handleCreateFolder = async (name: string) => {
  const error = validateFolderName(name);
  if (error) { setDialogError(error); return; }
  setDialogError(null);
  try {
    const newPath = `${currentPath}/${name}`.replace(/\/+/g, '/');
    await window.go.main.App.CreateDirectory(sessionId, newPath);
    showToast(`Folder "${name}" created`, 'success');
    setDialog(null);
    loadDirectory(currentPath);
  } catch (err) {
    setDialogError(`Failed to create folder: ${err}`);
  }
};

const handleCreateFile = async (name: string) => {
  const error = validateFileName(name);
  if (error) { setDialogError(error); return; }
  setDialogError(null);
  try {
    const newPath = `${currentPath}/${name}`.replace(/\/+/g, '/');
    await window.go.main.App.WriteFile(sessionId, newPath, '');
    showToast(`File "${name}" created`, 'success');
    setDialog(null);
    loadDirectory(currentPath);
  } catch (err) {
    setDialogError(`Failed to create file: ${err}`);
  }
};
```

Both build the target path from `currentPath` (the directory currently being viewed) and normalize duplicate slashes with `.replace(/\/+/g, '/')`.

---

## Dropdown Menu System

The menu is a positioned `<div>` (`styles.addMenu`, `role="menu"`) rendered inline when `addMenuOpen` is true. Its position is computed from the Add button's `offsetTop`/`offsetHeight`/`offsetLeft` so it sits just below the button.

```tsx
{addMenuOpen && (
  <div className={styles.addMenu} role="menu"
    style={{
      top: addButtonRef.current ? addButtonRef.current.offsetTop + addButtonRef.current.offsetHeight + 4 : 0,
      left: addButtonRef.current ? addButtonRef.current.offsetLeft : 0,
    }}>
    <button type="button" role="menuitem" onClick={/* createFolder */}>
      <Folder size={16} aria-hidden="true" /> Create Folder
    </button>
    <button type="button" role="menuitem" onClick={/* createFile */}>
      <FileIcon size={16} aria-hidden="true" /> Create File
    </button>
  </div>
)}
```

### Click-outside & ESC detection

A dedicated effect registers listeners only while the menu is open and cleans them up on close:

```typescript
useEffect(() => {
  if (!addMenuOpen) return;
  const handleClickOutside = (e: MouseEvent) => {
    if (addButtonRef.current && !addButtonRef.current.contains(e.target as Node)) {
      const menu = document.querySelector(`.${styles.addMenu}`);
      if (menu && !menu.contains(e.target as Node)) setAddMenuOpen(false);
    }
  };
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setAddMenuOpen(false);
  };
  document.addEventListener('mousedown', handleClickOutside);
  document.addEventListener('keydown', handleKeyDown);
  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
    document.removeEventListener('keydown', handleKeyDown);
  };
}, [addMenuOpen]);
```

The menu uses `mousedown` (not `click`) for outside detection so it closes before a subsequent click is processed.

---

## Dialog State Management

The inline `Dialog` component (defined in the same file) is reused for all five kinds. It receives `kind`, optional `item`, `error`, and callbacks:

```typescript
<Dialog
  key={`${dialog.kind}-${dlgItem?.name ?? ''}`}
  kind={dialog.kind}
  item={dlgItem}
  error={dialogError}
  onErrorClear={() => setDialogError(null)}
  onConfirm={
    dialog.kind === 'createFolder'
      ? (value?: string) => handleCreateFolder(value ?? '')
      : (value?: string) => handleCreateFile(value ?? '')
    /* ...delete/rename/chmod branches... */
  }
  onCancel={closeDialog}
/>
```

Key behaviors:

- **`key` includes `kind` + item name** so React remounts the dialog when switching kinds (fresh input + focus).
- **Error auto-clears on dialog change:** a `useEffect` resets `dialogError` to `null` whenever `dialog` changes.
- **Input focus:** on open, `inputRef` is focused and selected (except for the `delete` kind, which focuses Cancel).
- **Enter submits, Esc cancels:** the input's `onKeyDown` calls `onConfirm(value)` on Enter; a window `keydown` listener calls `onCancel` on Escape.
- **Error clears on edit:** `onChange={() => onErrorClear?.()}` removes the red message as soon as the user types.

---

## Validation Logic

Two pure helpers return an error string or `null`. They run **before** any backend call, so invalid input never reaches the server.

```typescript
const validateFolderName = (name: string): string | null => {
  if (!name.trim()) return 'Folder name cannot be empty';
  if (name.includes('/') || name.includes('\\')) return 'Invalid characters: / \\';
  if (name === '.' || name === '..') return 'Invalid folder name';
  return null;
};

const validateFileName = (name: string): string | null => {
  if (!name.trim()) return 'File name cannot be empty';
  if (name.includes('/') || name.includes('\\')) return 'Invalid characters: / \\';
  return null;
};
```

| Check | Folder | File | Error message |
|-------|:------:|:----:|---------------|
| Empty / whitespace-only | ✓ | ✓ | `… cannot be empty` |
| Contains `/` or `\` | ✓ | ✓ | `Invalid characters: / \` |
| Is `.` or `..` | ✓ | | `Invalid folder name` |

File names allow `.` (e.g. `notes.txt`) — only folder names reject it.

---

## Error Handling Approach

Errors are shown **inline** (red text below the input, `styles.errorText`, `role="alert"`) rather than as toasts, so the user stays in the dialog and can correct the name immediately.

- **Validation errors** (client-side) are set via `setDialogError(error)` and block the backend call.
- **Backend errors** (e.g. name conflict, permission denied) are caught in the `try/catch` and also set via `setDialogError(\`Failed to create …: ${err}\`)`. The dialog stays open.
- **Success** uses a toast (`showToast(..., 'success')`) and closes the dialog, then refreshes the directory.

This "error state vs toast" split keeps recoverable input mistakes in-context while only final outcomes surface as transient toasts.

---

## Backend API Integration

PRD-014 is **frontend-only** — it reuses two existing Wails-bound backend methods:

| Action | Backend call | Notes |
|--------|--------------|-------|
| Create folder | `CreateDirectory(sessionId, newPath)` | Creates the directory at the resolved path |
| Create file | `WriteFile(sessionId, newPath, '')` | Writes an empty file (empty string content) |

Both are awaited; on success the directory is re-listed via `loadDirectory(currentPath)`. No new backend APIs or migrations were introduced.

---

## Limitations

- **Add button disabled during uploads** — `disabled={uploadActive}` prevents creation while a batch upload runs.
- **Single-level only** — names cannot contain `/` or `\`, so nested paths (e.g. `a/b`) are not supported. Create parent folders first, then navigate into them.
- **Name conflicts handled by backend** — there is no pre-check for an existing item; a duplicate name surfaces as a backend error shown inline.
- **Default permissions** — created items use the server's default mode; change them afterward via the context-menu **Change Permissions** action.

---

**Related:** [File Manager user guide](../user-guide/file-manager.md) · [Upload Dialog Component](upload-dialog.md) · [Changelog](../planning/changelog.md)
