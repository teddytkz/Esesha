# PRD-012: Upload Dialog dengan Multi-Select dan Progress Tracking

**Version:** v1.0.0  
**Status:** Draft  
**Author:** Planner Agent  
**Created:** 2026-08-14  
**Updated:** 2026-08-14  

---

## Overview

Menambahkan dialog upload yang dedicated dengan split-pane layout (local files di kiri, remote files di kanan), multi-select untuk memilih file yang akan di-upload, dan progress tracking per-file dengan speed display. Dialog ini menggantikan file picker sederhana yang ada sekarang.

## Problem Statement

**Current limitations:**
1. Upload menggunakan file picker native → tidak bisa preview file sebelum upload
2. Tidak bisa memilih subset dari file yang dipilih (all-or-nothing)
3. Sequential upload (satu per satu) → lambat untuk banyak file
4. Progress bar hanya menampilkan 1 file yang sedang di-upload → tidak bisa lihat overview semua file
5. Tidak ada konfirmasi visual sebelum upload → langsung upload setelah pilih file

**Who is affected:**
- Users yang perlu upload banyak file sekaligus
- Users yang ingin selective upload (pilih mana yang mau di-upload dari folder)
- Users yang butuh feedback detail saat batch upload

## Goals

- ✅ Dialog dengan split-pane: local (kiri) dan remote (kanan)
- ✅ Multi-select dengan checkbox untuk local files
- ✅ Batch upload dengan progress per-file + overall progress
- ✅ Speed display per file (KB/s, MB/s)
- ✅ Cancel individual uploads
- ✅ UI konsisten dengan design system existing (Mission Control palette, CSS Modules)

## Non-Goals

- ❌ Folder upload (upload seluruh directory tree) → out of scope
- ❌ Resume upload jika koneksi drop → tetap start over
- ❌ Drag-and-drop antara local dan remote pane → gunakan tombol upload
- ❌ Streaming upload tanpa base64 encoding → tetap pakai base64 (agar sesuai dengan existing architecture)

---

## Feature Specification

### User Stories

1. **As a user**, saya ingin membuka upload dialog yang menampilkan file local dan remote side-by-side, supaya bisa compare sebelum upload
2. **As a user**, saya ingin bisa centang file mana saja yang mau di-upload dari list file yang dipilih, supaya tidak perlu upload semua
3. **As a user**, saya ingin lihat progress bar per-file dan overall progress saat batch upload, supaya tahu estimasi waktu selesai
4. **As a user**, saya ingin lihat speed (KB/s, MB/s) per file, supaya bisa monitor kecepatan upload
5. **As a user**, saya ingin bisa cancel individual upload yang sedang berjalan, tanpa cancel semua upload

### Acceptance Criteria

- [ ] Tombol "Upload" di toolbar membuka modal dialog (bukan file picker langsung)
- [ ] Dialog menampilkan split-pane: local files (kiri) dan remote files (kanan)
- [ ] Local pane menampilkan file picker button → user pilih file → file muncul di list dengan checkbox
- [ ] User bisa centang/uncheck file individual atau "Select All"
- [ ] Tombol "Start Upload" hanya enabled jika ada file yang di-centang
- [ ] Saat upload: progress bar per file dengan percentage + speed (KB/s/MB/s)
- [ ] Overall progress bar di bottom menampilkan "3 of 10 files uploaded"
- [ ] Remote pane refresh otomatis setelah setiap file selesai
- [ ] Cancel button per file (stop upload yang sedang berjalan)
- [ ] Dialog bisa di-close dengan ESC atau X button (dengan konfirmasi jika ada upload active)
- [ ] Toast notification: "5 files uploaded successfully" setelah semua selesai
- [ ] Error handling: jika 1 file gagal, lanjutkan upload file berikutnya + tampilkan error di list

---

## Technical Design

### Architecture Overview

**New Component:** `UploadDialog.tsx` (modal overlay, split-pane layout)

```
FileExplorer.tsx (existing)
├── Tombol "Upload" (onClick → setShowUploadDialog(true))
└── <UploadDialog 
      sessionId={sessionId} 
      currentPath={currentPath} 
      onClose={() => setShowUploadDialog(false)} 
      onUploadComplete={() => loadDirectory(currentPath)} 
    />
```

**Component structure:**
```
UploadDialog
├── Modal Overlay (backdrop + ESC handler)
├── Split Pane Container
│   ├── Left Pane: Local Files
│   │   ├── File Picker Button
│   │   ├── Select All Checkbox
│   │   └── File List (checkbox + name + size + progress + cancel)
│   └── Right Pane: Remote Files
│       ├── Current Path Display
│       └── File List (read-only, refresh after upload)
├── Bottom Bar
│   ├── Overall Progress: "3 / 10 files (450 MB / 1.2 GB)"
│   ├── Cancel All Button
│   └── Start Upload Button (primary)
└── Toast System (reuse existing)
```

### Codebase Context

**Existing patterns to follow:**
1. **FileEditor.tsx overlay modal pattern** → reuse untuk UploadDialog
   - Backdrop blur + `position: fixed` + `z-index: 1000`
   - ESC key handler: `useEffect(() => { const handleKey = ... })`
   - Close confirmation jika ada unsaved changes (dalam hal ini: active uploads)

2. **Progress tracking** → sudah ada di FileExplorer:
   - `uploadProgress`, `transferSpeed` state
   - Event listener: `window.runtime.EventsOn('sftp:progress', handleProgress)`
   - Speed formatting: `formatSpeed(bytesPerSec)` → "1.2 MB/s"

3. **Dialog state machine** → extend untuk upload dialog:
   ```typescript
   type UploadDialogState = {
     isOpen: boolean;
     selectedFiles: LocalFile[];  // File[] + selected flag + uploadState
     remoteFiles: FileInfo[];
     uploadQueue: UploadTask[];
   }
   ```

4. **CSS Modules styling** → `UploadDialog.module.css`:
   - Split pane: `display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;`
   - File list: reuse `.fileList` pattern dari FileExplorer
   - Progress bar: reuse existing `.progressBar` dengan minor tweaks

**Existing backend API** (NO changes needed):
- `ListDirectory(sessionId, path)` → untuk refresh remote pane
- `UploadFileData(sessionId, remotePath, base64Data)` → sequential calls dengan delay untuk progress tracking
- Event: `sftp:progress` → per-file progress + speed

### Data Model

**Frontend-only state** (no backend changes):

```typescript
// UploadDialog.tsx state
interface LocalFile {
  file: File;              // Browser File object
  id: string;              // Unique ID (uuid)
  name: string;
  size: number;
  selected: boolean;       // Checkbox state
  uploadState: UploadState;
}

type UploadState = 
  | { status: 'pending' }
  | { status: 'uploading'; progress: number; speed: number }
  | { status: 'completed' }
  | { status: 'error'; message: string }
  | { status: 'cancelled' };

interface UploadTask {
  localFile: LocalFile;
  remotePath: string;
  abortController?: AbortController;  // For future cancel support
}
```

**No database changes** → purely in-memory state dalam dialog lifecycle

### API Changes

**NO backend API changes needed** → reuse existing:

1. `UploadFileData(sessionId, remotePath, base64Data)` → call per file secara sequential
2. `ListDirectory(sessionId, path)` → refresh remote pane setelah setiap upload

**Frontend Wails binding usage:**
```typescript
// Sequential upload with progress tracking
for (const task of uploadQueue) {
  try {
    const base64 = await fileToBase64(task.localFile.file);
    await window.go.main.App.UploadFileData(
      sessionId, 
      task.remotePath, 
      base64
    );
    // Progress tracked via sftp:progress event
  } catch (err) {
    // Mark as error, continue to next file
  }
}
```

### UI Changes

**New component:** `UploadDialog.tsx` + `UploadDialog.module.css`

**Key UI elements:**

1. **Split Pane Layout:**
   ```
   ┌─────────────────────────────────────────────┐
   │  Upload Files to /home/user/documents       │
   ├──────────────────┬──────────────────────────┤
   │ Local Files      │ Remote Files             │
   │ ┌──────────────┐ │ /home/user/documents     │
   │ │ Choose Files │ │ • existing-file.txt      │
   │ └──────────────┘ │ • report.pdf             │
   │ ☑ Select All     │                          │
   │                  │                          │
   │ ☑ file1.txt      │                          │
   │   2.3 MB         │                          │
   │   ▓▓▓▓▓░░░ 60%   │                          │
   │   1.2 MB/s       │                          │
   │                  │                          │
   │ ☑ file2.pdf      │                          │
   │   5.1 MB         │                          │
   │   [Pending]      │                          │
   ├──────────────────┴──────────────────────────┤
   │ Overall: 3 / 10 files (450 MB / 1.2 GB)    │
   │ [Cancel All]              [Start Upload]    │
   └─────────────────────────────────────────────┘
   ```

2. **File List Item** (local pane):
   - Checkbox (enable/disable select)
   - File icon (lucide-react `FileText`)
   - Filename + size
   - Progress bar (hidden jika pending)
   - Speed display (hidden jika pending)
   - Cancel button (icon `X`, hanya visible saat uploading)

3. **Remote Pane:**
   - Read-only file list
   - Auto-refresh setelah setiap upload complete
   - Loading spinner saat refresh

4. **Color palette** (Mission Control theme):
   - Primary button: `#22d3ee` (cyan)
   - Progress bar filled: `#22d3ee`
   - Progress bar background: `#1e293b` (navy)
   - Error state: `#ef4444` (red)
   - Success state: `#10b981` (green)

---

## Implementation Plan

### Phase 1: Component Structure & Layout (No Backend)

**Depends on:** Nothing  
**Parallelizable:** Yes

| Task | Agent | Files | Description |
|------|-------|-------|-------------|
| 1.1 | Frontend Developer | `frontend/src/components/UploadDialog.tsx` | Create base component with modal overlay + split-pane layout + ESC handler + close button |
| 1.2 | Frontend Developer | `frontend/src/components/UploadDialog.module.css` | Style split-pane grid, modal overlay, backdrop blur (reuse FileEditor patterns) |
| 1.3 | Frontend Developer | `frontend/src/components/FileExplorer.tsx` (lines 50-60, 400-450) | Add state `showUploadDialog`, wire up toolbar button, render `<UploadDialog>` conditionally |

**Sub-Agent Guidance:**
- Task 1.1 and 1.2 can be done in parallel
- Task 1.3 depends on 1.1 (needs import statement)

**Acceptance:**
- Upload button opens modal overlay with split-pane skeleton
- ESC and X button close dialog
- Backdrop click closes dialog (with confirmation if uploads active)

---

### Phase 2: Local File Selection & Multi-Select

**Depends on:** Phase 1  
**Parallelizable:** No (sequential with Phase 1)

| Task | Agent | Files | Description |
|------|-------|-------|-------------|
| 2.1 | Frontend Developer | `frontend/src/components/UploadDialog.tsx` | Add file picker button + hidden `<input type="file" multiple>` → populate `selectedFiles` state |
| 2.2 | Frontend Developer | `frontend/src/components/UploadDialog.tsx` | Implement checkbox per file + "Select All" checkbox → toggle `selected` flag in state |
| 2.3 | Frontend Developer | `frontend/src/components/UploadDialog.tsx` | Render file list (name, size, checkbox) dengan `FileText` icon dari lucide-react |
| 2.4 | Frontend Developer | `frontend/src/components/UploadDialog.module.css` | Style file list item (grid layout: checkbox + icon + text + size) |

**Acceptance:**
- User dapat pilih multiple files via file picker
- Files muncul di local pane dengan checkbox
- "Select All" checkbox toggles semua file
- Individual checkbox toggles per file
- Start Upload button enabled hanya jika ada file selected

---

### Phase 3: Remote Files Display & Refresh

**Depends on:** Phase 1  
**Parallelizable:** Yes (dapat dilakukan parallel dengan Phase 2)

| Task | Agent | Files | Description |
|------|-------|-------|-------------|
| 3.1 | Frontend Developer | `frontend/src/components/UploadDialog.tsx` | Call `ListDirectory(sessionId, currentPath)` on mount → populate `remoteFiles` state |
| 3.2 | Frontend Developer | `frontend/src/components/UploadDialog.tsx` | Render remote file list (read-only, name + size, no checkbox) |
| 3.3 | Frontend Developer | `frontend/src/components/UploadDialog.tsx` | Add `refreshRemoteFiles()` function → called after each upload completes |
| 3.4 | Frontend Developer | `frontend/src/components/UploadDialog.module.css` | Style remote pane file list (match local pane layout minus checkbox) |

**Acceptance:**
- Remote pane displays current directory files on dialog open
- Remote pane shows loading spinner during refresh
- Remote pane updates after each file upload completes

---

### Phase 4: Upload Queue & Sequential Upload Logic

**Depends on:** Phase 2, Phase 3  
**Parallelizable:** No (depends on 2 and 3)

| Task | Agent | Files | Description |
|------|-------|-------|-------------|
| 4.1 | Frontend Developer | `frontend/src/components/UploadDialog.tsx` | Implement `startUpload()` function → filter selected files → create upload queue → sequential upload loop |
| 4.2 | Frontend Developer | `frontend/src/components/UploadDialog.tsx` | Convert File to base64 with `fileToBase64()` helper (reuse FileExplorer pattern) |
| 4.3 | Frontend Developer | `frontend/src/components/UploadDialog.tsx` | Call `UploadFileData()` per file → update `uploadState` to 'uploading' → wait for completion |
| 4.4 | Frontend Developer | `frontend/src/components/UploadDialog.tsx` | Error handling: catch upload errors → set `uploadState` to 'error' → continue to next file |
| 4.5 | Frontend Developer | `frontend/src/components/UploadDialog.tsx` | Update `uploadState` to 'completed' after each success → refresh remote pane |

**Sub-Agent Guidance:**
- Tasks 4.1-4.5 are tightly coupled → implement as single atomic change
- Reuse `uploadFiles()` pattern from FileExplorer.tsx (lines 300-320) as reference

**Acceptance:**
- "Start Upload" button triggers sequential upload
- Upload state per file updates correctly (pending → uploading → completed/error)
- Errors don't block subsequent uploads
- Remote pane refreshes after each file completes

---

### Phase 5: Progress Tracking & Speed Display

**Depends on:** Phase 4  
**Parallelizable:** No (depends on Phase 4)

| Task | Agent | Files | Description |
|------|-------|-------|-------------|
| 5.1 | Frontend Developer | `frontend/src/components/UploadDialog.tsx` | Register `sftp:progress` event listener → match event `sessionId` → update active file's progress + speed |
| 5.2 | Frontend Developer | `frontend/src/components/UploadDialog.tsx` | Track current uploading file ID → map progress event to correct file in `selectedFiles` array |
| 5.3 | Frontend Developer | `frontend/src/components/UploadDialog.tsx` | Render progress bar per file (percentage + filled bar) → reuse `formatSpeed()` from FileExplorer |
| 5.4 | Frontend Developer | `frontend/src/components/UploadDialog.module.css` | Style progress bar (`.progressBar` class) + speed label |
| 5.5 | Frontend Developer | `frontend/src/components/UploadDialog.tsx` | Calculate overall progress: `completedFiles / totalSelectedFiles` + total bytes uploaded / total bytes |
| 5.6 | Frontend Developer | `frontend/src/components/UploadDialog.tsx` | Render overall progress bar di bottom bar dengan text "3 / 10 files (450 MB / 1.2 GB)" |

**Sub-Agent Guidance:**
- Task 5.1-5.3 are core logic (atomic implementation)
- Task 5.4 is styling (can be done parallel with 5.5-5.6)
- Task 5.5-5.6 are overall progress UI (atomic pair)

**Acceptance:**
- Progress bar per file shows real-time percentage (0-100%)
- Speed display shows KB/s or MB/s (formatted)
- Overall progress bar shows X / Y files completed
- Overall progress shows total bytes uploaded / total bytes

---

### Phase 6: Cancel Functionality & UI Polish

**Depends on:** Phase 5  
**Parallelizable:** No (depends on Phase 5)

| Task | Agent | Files | Description |
|------|-------|-------|-------------|
| 6.1 | Frontend Developer | `frontend/src/components/UploadDialog.tsx` | Add cancel button per file (visible only when `uploadState === 'uploading'`) |
| 6.2 | Frontend Developer | `frontend/src/components/UploadDialog.tsx` | Implement cancel logic: set flag → skip file in upload loop → mark as 'cancelled' |
| 6.3 | Frontend Developer | `frontend/src/components/UploadDialog.tsx` | Add "Cancel All" button di bottom bar → stops upload loop + marks remaining as 'cancelled' |
| 6.4 | Frontend Developer | `frontend/src/components/UploadDialog.tsx` | Close confirmation dialog: "Uploads in progress. Cancel all and close?" jika ada active uploads |
| 6.5 | Frontend Developer | `frontend/src/components/UploadDialog.tsx` | Toast notifications: "5 files uploaded successfully" (success), "3 files uploaded, 2 failed" (partial), "Upload cancelled" (info) |
| 6.6 | Frontend Developer | `frontend/src/components/UploadDialog.module.css` | Style cancel buttons (small icon button, red hover state) |

**Note:** Backend tidak support cancel API → cancel berarti "skip file di queue" (file yang sedang upload akan tetap selesai)

**Acceptance:**
- Cancel button per file skips that file in queue
- "Cancel All" stops upload loop immediately
- Dialog close meminta konfirmasi jika ada active uploads
- Toast shows summary after all uploads complete
- Cancelled files marked with "Cancelled" badge (gray)

---

### Phase 7: Review & Documentation (Always Last)

**Depends on:** Phase 6  
**Parallelizable:** No (depends on all implementation phases)

| Task | Agent | Description |
|------|-------|-------------|
| 7.1 | Debugger/Reviewer | Test all acceptance criteria: dialog open/close, multi-select, upload flow, progress tracking, cancel, error handling |
| 7.2 | Debugger/Reviewer | Cross-browser testing (Chrome, Firefox, Edge) → test file picker + drag-drop |
| 7.3 | Debugger/Reviewer | Test edge cases: 1 file, 100 files, large files (500MB+), upload errors, network issues |
| 7.4 | Debugger/Reviewer | Accessibility audit: keyboard navigation (Tab, Enter, ESC, Space for checkbox), screen reader labels |
| 7.5 | Frontend Developer | Update `docs/features/file-upload.md` → document upload dialog UI, multi-select, progress tracking |
| 7.6 | Frontend Developer | Update `README.md` → add screenshot of upload dialog (jika perlu) |

**Acceptance:**
- All acceptance criteria pass testing
- No TypeScript errors
- No console errors/warnings
- Keyboard navigation works (focus visible, ESC closes, Enter submits)
- Documentation updated

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Base64 memory overhead untuk large files** → 500MB file = ~666MB memory | High | Medium | Show warning toast if file > 200MB: "Large file detected. Upload may be slow." Document limit in docs. |
| **Sequential upload lambat untuk banyak file** → 100 files one-by-one | Medium | High | Accept as limitation (parallel upload memerlukan backend refactor yang besar). Document as known limitation. |
| **Progress event tidak arrive** → stuck at 0% | Medium | Low | Add timeout (30s no progress → mark as error). Fallback to indeterminate spinner. |
| **Dialog re-render performance** → 1000 files selected | Medium | Low | Virtualize file list dengan `react-window` jika > 50 files (fase optimization, not MVP). |
| **Cancel tidak immediate** → file yang sedang upload tetap selesai | Low | High | Document behavior: "Cancel skips remaining files; current upload completes." Show in UI: "Cancelling..." state. |

---

## Rollback Strategy

**Scenario:** Upload dialog has critical bugs (e.g., progress tracking broken, UI crash)

**Rollback steps:**
1. Revert `FileExplorer.tsx` changes → remove `showUploadDialog` state + `<UploadDialog>` render
2. Keep old upload flow: file picker button → `uploadFiles()` function (existing code)
3. Delete `UploadDialog.tsx` and `UploadDialog.module.css`
4. Re-test existing upload flow
5. Document rollback in changelog

**Time to rollback:** < 10 minutes (3 file changes, no backend changes)

**Data loss risk:** None (no database changes, purely frontend UI)

---

## Version History

| Version | Date       | Summary                                   |
|---------|------------|-------------------------------------------|
| v1.0.0  | 2026-08-14 | Initial PRD - Upload dialog with multi-select |

---

## Implementation Summary

**For Orchestrator routing:**

### Files to Create:
- `frontend/src/components/UploadDialog.tsx` (new component, ~500 lines estimated)
- `frontend/src/components/UploadDialog.module.css` (new stylesheet, ~200 lines)

### Files to Modify:
- `frontend/src/components/FileExplorer.tsx` (add state + dialog trigger + render)

### Backend Changes:
- **NONE** → reuse existing `UploadFileData()` API and `sftp:progress` event

### Agent Assignments:
- **Frontend Developer**: All tasks (Phases 1-6)
- **Debugger/Reviewer**: Phase 7 (testing + docs)

### Estimated Complexity:
- **Lines of code**: ~700 new lines (500 TSX + 200 CSS)
- **Testing effort**: Medium (integration test with real SSH, cross-browser)
- **Documentation**: Low (1 feature doc update, changelog entry)

### Dependencies:
- Existing: `lucide-react` icons, CSS Modules, Wails runtime
- New: None

### Parallel Execution Opportunities:
- Phase 2 and Phase 3 can run in parallel
- Phase 1.1 and 1.2 can run in parallel
- Tasks within phases marked "atomic" should NOT be split

---

## Notes for Implementation

1. **Reuse existing patterns:**
   - Modal overlay → copy from `FileEditor.tsx`
   - Progress bar → copy from `FileExplorer.tsx` (lines 550-570)
   - Toast system → reuse `showToast()` from FileExplorer
   - File list styling → adapt from `FileExplorer.module.css`

2. **State management:**
   - Keep in `UploadDialog` component (no global state)
   - Use `useRef` for current upload tracking (avoid stale closures)
   - Use `useState` for UI state (`selectedFiles`, `remoteFiles`, `uploadQueue`)

3. **Performance considerations:**
   - Debounce remote file refresh (tidak perlu refresh setiap 100ms)
   - Limit file list rendering jika > 100 files (future optimization)
   - Cleanup event listeners on unmount

4. **Accessibility:**
   - All buttons have `aria-label`
   - Checkboxes have `<label>` associations
   - Focus trap dalam modal (Tab cycles within dialog)
   - ESC key closes dialog
   - Progress bars have `role="progressbar"` + `aria-valuenow`

5. **Error messages** (user-friendly):
   - "Failed to upload file1.txt: Permission denied"
   - "Upload cancelled by user"
   - "Connection lost during upload"
