# File Manager & Upload Dialog

**Last updated:** 2026-08-15

How to browse remote files over SFTP, create folders and files in place, and use the **Upload Dialog** to batch-upload local files with per-file progress, speed, and cancel controls.

---

## Table of Contents

1. [Opening the File Manager](#opening-the-file-manager)
2. [Opening the Upload Dialog](#opening-the-upload-dialog)
3. [Creating Files and Folders](#creating-files-and-folders)
4. [Adding and Selecting Files](#adding-and-selecting-files)
5. [Drag-and-Drop Files](#drag-and-drop-files)
6. [Understanding Progress Indicators](#understanding-progress-indicators)
7. [Canceling Uploads](#canceling-uploads)
8. [Keyboard & Accessibility](#keyboard--accessibility)
9. [Known Limitations](#known-limitations)
10. [Troubleshooting](#troubleshooting)

---

## Opening the File Manager

1. Connect to a server from the connection list.
2. Click the **Files** button in the toolbar.
3. Navigate with **single-click** on folders; **double-click** a file to edit it.
4. Right-click any item for actions: Download, Upload, Edit, Delete, Rename, Permissions.

> **Always visible:** The right-click menu automatically repositions to stay on screen — right-click near an edge and it flips to the opposite side. Works at any window size and in split view; no action needed.

## Opening the Upload Dialog

1. With the File Manager open, click the **Upload** button in the toolbar (top-right).
2. The dialog opens as a split-pane modal:
   - **Left pane** — your local files (the queue).
   - **Right pane** — the current remote directory (read-only preview).

The dialog targets the remote directory you are currently viewing, shown in the header (`to /path`) and the remote pane's path bar.

## Creating Files and Folders

Create folders and empty files directly in the current remote directory — no need to upload or switch tools. New items are created in **whatever directory you are currently viewing**.

### Using the Add Menu

1. Click the **+** button in the toolbar (between the breadcrumb and the Upload button).
2. A dropdown appears with **Create Folder** and **Create File**.
3. Select an option to open the creation dialog.
4. Type a name and press **Enter** or click **Create**.

> The **+** button is disabled (greyed out) while an upload is in progress. Finish or cancel the upload first.

#### Create a folder

1. Open the **+** menu → **Create Folder**.
2. Enter the folder name (e.g. `backups`).
3. Press **Enter** or click **Create**.
4. A success toast (`Folder "backups" created`) appears and the new folder shows in the list.

#### Create a file

1. Open the **+** menu → **Create File**.
2. Enter the file name (e.g. `notes.txt`).
3. Press **Enter** or click **Create**.
4. A success toast (`File "notes.txt" created`) appears and the empty file shows in the list.

### Validation Rules

Names are checked before the request is sent. Invalid input shows a red error message **below the input** and blocks creation.

| Rule | Folder | File | Why |
|------|:------:|:----:|-----|
| Cannot be empty | ✓ | ✓ | A name is required |
| No `/` character | ✓ | ✓ | Path separator — would imply a nested path |
| No `\` character | ✓ | ✓ | Path separator (Windows-style) |
| Cannot be `.` or `..` | ✓ | | Reserved names — would break navigation |
| No nested paths | ✓ | ✓ | Only single-level creation is supported |

If the name passes validation but the server rejects it (e.g. a file/folder with that name already exists), the backend error is shown inline in red as well.

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Enter** | Submit the dialog (create the folder/file) |
| **Esc** | Cancel and close the dialog |
| **Esc** (when Add menu open) | Close the Add menu |
| **Click outside** the Add menu | Close the Add menu |

### Troubleshooting

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| Red error "Folder name cannot be empty" | Submitted with a blank or whitespace-only name | Type a real name |
| Red error "Invalid characters: / \\" | Name contains a slash | Remove `/` or `\`; create one level at a time |
| Red error "Invalid folder name" | Name is `.` or `..` | Use a different name |
| Red error "Failed to create folder/file: …" | Server rejected it (often a name conflict) | Rename or delete the existing item, then retry |
| **+** button is greyed out | An upload is running | Wait for the upload to finish or cancel it |
| Add menu won't open | Focus is trapped / upload active | Ensure no upload is in progress; click the **+** button |

## Adding and Selecting Files

1. Click **Add Files** in the left pane header.
2. Pick one or more files from your OS file picker. Each appears as a row with a checkbox, name, and size.
3. Newly added files are **selected by default**.
4. Toggle individual checkboxes to include/exclude files.
5. Use **Select All** to check or uncheck every file at once. The checkbox shows an **indeterminate** state (a dash) when only some files are selected.

Only selected files are uploaded. The **Upload** button is disabled until at least one selected file is pending.

## Drag-and-Drop Files

You can add files by dragging them from your OS file explorer directly into the **local pane** of the Upload Dialog — no need to use the **Add Files** button.

**How to use it:**

1. Open the Upload Dialog (see above).
2. Drag one or more files from your desktop or file explorer.
3. Drop them anywhere over the **left (local) pane**.

**Visual feedback:** While you drag over the local pane, its border turns **cyan** and the background gets a faint cyan tint, so you can see the drop target is active. The highlight clears the moment you leave the pane or drop the files.

**Behavior:**

- **Auto-selected** — every dropped file is added to the list and checked (selected) automatically, ready to upload.
- **Merges, never replaces** — dropped files are appended to the existing list. You can mix drag-and-drop with the **Add Files** button freely; files already in the list stay put.
- **Duplicates allowed** — dropping the same filename twice adds it twice (each gets a unique ID).
- **Disabled during upload** — if an upload batch is running, dropping files shows an info toast (`Cannot add files during upload`) and the files are ignored. Finish or cancel the current upload first.

**Tips:**

- **Many files at once?** Drag a whole selection from your file explorer — it's faster than picking them one-by-one in the OS file picker.
- **Want to review first?** Use **Add Files** when you'd rather browse and confirm each file before it lands in the queue. Both paths produce the same result; choose whichever fits the moment.
- **Keyboard users** — the **Add Files** button remains fully keyboard-accessible (Tab + Enter). Drag-and-drop is a mouse convenience layered on top; nothing is lost if you don't use it.

## Understanding Progress Indicators

While uploading, each file row shows its own progress:

- **Per-file progress bar** — percentage complete (`45%`) plus live transfer speed (`1.2 MB/s`).
- **Status labels** — `Pending`, `Completed` (green check), `Cancelled`, or `Failed` (with the error message on hover).

At the bottom of the dialog, the **overall progress** bar and text summarize the batch:

```
3 / 10 files (450 MB / 1.2 GB)
```

- `3 / 10 files` — completed count vs. selected count.
- `450 MB / 1.2 GB` — bytes uploaded vs. total selected bytes.

The remote pane **auto-refreshes after each file finishes**, so you see new files appear as they land.

When the batch ends, a **toast** summarizes the result (e.g. `5 files uploaded successfully`, or `4 uploaded, 1 failed, 1 cancelled`). Toasts auto-dismiss after ~4 seconds.

## Canceling Uploads

- **Cancel one file** — click the **✕** on that file's row. If it is currently uploading, the transfer finishes, then the file is marked `Cancelled` and skipped. Pending files are removed from the queue immediately.
- **Cancel All** — the **Cancel All** button (enabled only during an upload) marks every remaining file cancelled. The in-progress file still completes; the rest are skipped.
- **Close during upload** — pressing **ESC** or the **✕** while uploads are active opens a confirmation: **Keep Uploading** or **Cancel & Close** (which cancels the queue and closes).

> **Note:** In-progress transfers cannot be aborted mid-stream — only skipped from the queue. This is a known limitation (see below).

## Keyboard & Accessibility

- **Tab / Shift+Tab** — move between controls.
- **Space** — toggle a focused checkbox.
- **Enter** — activate the focused button (Add Files, Upload, Cancel All, etc.).
- **Esc** — close the dialog (with confirmation if uploads are active).
- The dialog is a proper modal (`role="dialog"`, `aria-modal="true"`) with ARIA labels on every control and `role="status"`/`role="alert"` on progress and error regions, so screen readers announce uploads and failures.

## Known Limitations

- **Sequential uploads** — files upload one at a time, not in parallel. Large batches take longer than a parallel client would.
- **Base64 memory overhead** — files are base64-encoded before transfer, adding ~33% memory usage over the raw file size.
- **No mid-transfer abort** — a file already uploading runs to completion when cancelled; it is only removed from the queue.
- **Large files** — files over ~200 MB may cause memory pressure due to base64 buffering.
- **Desktop only** — the dialog has a minimum width of 800 px and is not optimized for mobile or narrow windows.
- **No folder/directory upload** — only individual files can be selected; directory trees are out of scope.
- **No resume** — if a connection drops, the upload restarts from the beginning.

## Upload Dialog

The **Upload Dialog** (PRD-012) is the batch-upload interface described above. It reuses the existing `UploadFileData` backend call and `sftp:progress` event — no new backend APIs were added.

## Troubleshooting

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| **Remote pane shows "File system API not available"** | Backend binding `ListDirectory` not exposed in this build | Rebuild with `wails build`; ensure `App.ListDirectory` is bound. |
| **Upload fails immediately with a backend error** | Session expired or path invalid | Reconnect to the server; verify the current remote path is writable. |
| **Progress stuck at 0%** | `sftp:progress` events not firing for this session | Check the connection is active; the speed/percentage updates only while bytes transfer. |
| **Out-of-memory / app slowdown on a big file** | Base64 buffer exceeds available RAM | Upload files under ~200 MB, or split large files first. |
| **"Upload" button stays disabled** | No selected file is in `Pending`/`Error` state | Add files and ensure at least one is checked; completed files are not re-uploaded. |
| **Dialog won't close on Esc during upload** | Confirmation prompt is showing | Choose **Keep Uploading** or **Cancel & Close** in the confirmation. |

---

**Related:** [Upload Dialog Component Reference](components/upload-dialog.md) · [FileExplorer Component Reference](components/file-explorer.md) · [Changelog](planning/changelog.md)
