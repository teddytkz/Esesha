# PRD-013: Upload Dialog — Drag-and-Drop Support + Increased Height

**Version:** v1.0.0  
**Status:** Draft  
**Author:** Planner Agent  
**Created:** 2026-08-15  
**Updated:** 2026-08-15  
**Related:** PRD-012 (Upload Dialog with Multi-Select)

---

## Overview

Menambahkan dukungan drag-and-drop untuk file selection di Upload Dialog, sehingga user bisa drag file dari OS file explorer langsung ke dialog (tanpa harus klik "Add Files" button). Selain itu, tinggi dialog diperbesar supaya lebih banyak file yang visible tanpa scrolling.

## Problem Statement

**Current limitations:**
1. User hanya bisa tambah file via "Add Files" button → tidak bisa drag-drop dari OS explorer
2. Dialog height terbatas → user harus scroll untuk lihat banyak file (khususnya saat batch upload puluhan file)
3. Empty state hanya menampilkan text static → tidak jelas bahwa drag-drop akan disupport

**Who is affected:**
- Users yang terbiasa dengan drag-drop workflow (lebih cepat daripada file picker)
- Users yang upload banyak file sekaligus (butuh height lebih besar untuk overview)
- Users dengan multiple monitors atau large screens (dialog terlalu kecil)

## Goals

- ✅ Drag-and-drop support: user bisa drag file dari OS explorer ke local pane
- ✅ Visual feedback: drop zone highlight saat dragging (cyan border + background tint)
- ✅ Merge behavior: dragged files ditambahkan ke list existing (tidak replace)
- ✅ Preserve "Add Files" button: drag-drop adalah alternative, bukan replacement
- ✅ Increased dialog height: dari `max-height: 88vh` → `90vh` dan local/remote pane height increase
- ✅ Empty state update: tambah drag-drop instruction visual

## Non-Goals

- ❌ Drag-and-drop between local and remote panes (ini untuk upload via button, bukan drag antar pane)
- ❌ Drag file dari remote pane (out of scope)
- ❌ Folder drag-drop (upload entire directory) → belum disupport di PRD-012, out of scope
- ❌ Drag reordering dalam local file list → tidak perlu, karena upload tetap sequential berdasarkan checkbox selection

---

## Feature Specification

### User Stories

1. **As a user**, saya ingin drag file dari Windows Explorer langsung ke Upload Dialog, supaya tidak perlu klik "Add Files" dan browse
2. **As a user**, saya ingin lihat visual feedback (highlight) saat drag file ke atas drop zone, supaya tahu dimana harus drop
3. **As a user**, saya ingin file yang di-drag ditambahkan ke list existing (tidak replace semua), supaya bisa tambah file secara incremental
4. **As a user**, saya ingin dialog lebih tinggi, supaya bisa lihat lebih banyak file tanpa scroll

### Acceptance Criteria

- [ ] User bisa drag **multiple files** dari OS file explorer ke local pane → files muncul di list
- [ ] Drop zone (local pane) menampilkan visual feedback saat `dragenter`: cyan dashed border + background tint (seperti FileExplorer existing)
- [ ] Visual feedback hilang saat `dragleave` atau `drop`
- [ ] Dragged files **merged** dengan existing files (tidak replace) → duplicate handling: allow duplicates (same filename), karena bisa jadi file berbeda dengan nama sama
- [ ] "Add Files" button tetap berfungsi normal (drag-drop tidak disable button)
- [ ] Empty state menampilkan instruction: `"Drag files here or click 'Add Files'"`
- [ ] Dialog height increased: `max-height: 90vh` (was 88vh) dan pane `min-height` increased untuk better visibility
- [ ] Drag-drop tidak berfungsi saat upload sedang berlangsung (`uploading === true`) → show disabled drop zone
- [ ] Drag non-file items (text, images dari browser) → tidak crash, just ignore
- [ ] Drag counter logic untuk nested elements (prevent flickering saat drag over child elements)

---

## Technical Design

### Architecture Overview

**Modified Component:** `UploadDialog.tsx` (add drag-drop handlers)  
**Modified CSS:** `UploadDialog.module.css` (add `.dropZone`, `.dropZoneActive` classes + height adjustments)

**Reusable pattern from FileExplorer:**
- FileExplorer already has drag-drop for upload to remote directory
- Reuse the same HTML5 Drag and Drop API pattern
- Reuse the same visual feedback CSS (`.dragOver` class)

### Drag-and-Drop Implementation

#### HTML5 Drag and Drop Events

**Target element:** Local pane (`.pane` container for local files)

**Events to handle:**
1. `onDragEnter` → increment drag counter, set `dragActive` state
2. `onDragOver` → prevent default (allow drop), keep drag counter
3. `onDragLeave` → decrement drag counter, unset `dragActive` if counter = 0
4. `drop` → extract files from `event.dataTransfer.files`, reset drag counter

**Why drag counter?**  
Prevent flicker when dragging over nested elements (e.g., dragging over file list items inside pane). Each child triggers `dragenter` and `dragleave`, so we count them to determine when we truly leave the drop zone.

#### State Management

```typescript
// Add to UploadDialog.tsx
const [dragActive, setDragActive] = useState(false);
const dragCounterRef = useRef(0);
```

#### Event Handlers

```typescript
const handleDragEnter = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  dragCounterRef.current++;
  if (e.dataTransfer.types.includes('Files')) {
    setDragActive(true);
  }
};

const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  if (e.dataTransfer.types.includes('Files')) {
    e.dataTransfer.dropEffect = 'copy';
  }
};

const handleDragLeave = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  dragCounterRef.current--;
  if (dragCounterRef.current === 0) {
    setDragActive(false);
  }
};

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  dragCounterRef.current = 0;
  setDragActive(false);

  if (uploading) {
    showToast('Cannot add files during upload', 'error');
    return;
  }

  const files = e.dataTransfer.files;
  if (!files || files.length === 0) return;

  // Reuse existing addFiles logic
  addFiles(Array.from(files));
};
```

#### File Addition Logic (Refactor)

Extract file addition logic from `handleFileInput` into reusable `addFiles()`:

```typescript
const addFiles = (files: File[]) => {
  const newLocalFiles: LocalFile[] = files.map((f) => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    file: f,
    selected: true, // auto-select newly added files
    uploadState: 'pending',
    progress: 0,
    speed: '',
  }));

  setLocalFiles((prev) => [...prev, ...newLocalFiles]);
  showToast(`${files.length} file${files.length === 1 ? '' : 's'} added`, 'info');
};

const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;
  addFiles(Array.from(files));
  // Reset input for re-selecting same file
  e.target.value = '';
};
```

### CSS Changes

#### Height Increase

```css
/* UploadDialog.module.css */

.dialog {
  width: min(90vw, 1000px);
  min-width: 800px;
  max-height: 90vh; /* was 88vh */
  /* ... */
}

.fileList {
  flex: 1;
  overflow-y: auto;
  min-height: 320px; /* add minimum height for better visibility */
  /* ... */
}
```

#### Drop Zone Styling

```css
/* Reuse FileExplorer pattern */
.pane.dropZoneActive {
  outline: 2px dashed var(--accent-primary);
  outline-offset: -4px;
  background: rgba(34, 211, 238, 0.04);
}

/* Disabled drop zone (during upload) */
.pane.dropZoneDisabled {
  cursor: not-allowed;
  opacity: 0.6;
}
```

#### Empty State Update

```tsx
// UploadDialog.tsx — Empty state
{localFiles.length === 0 ? (
  <div className={styles.empty}>
    <FolderOpen size={32} strokeWidth={1.5} aria-hidden="true" />
    <p>No files selected</p>
    <span>
      Drag files here or click <strong>"Add Files"</strong>
    </span>
  </div>
) : (
  // ... file list
)}
```

### Duplicate Handling Strategy

**Decision:** Allow duplicates (same filename).

**Rationale:**
- User may want to upload multiple files with the same name from different directories
- Local files are identified by unique `id` (timestamp + random), not filename
- Remote SFTP will overwrite if same filename → that's expected server-side behavior
- User can manually deselect unwanted duplicates via checkbox

**Alternative (not implemented):** Deduplicate by filename → complexity: what if user intentionally wants to re-upload? Would need "replace" vs "skip" UI.

### Integration with Existing Code

**No breaking changes:**
- "Add Files" button logic moved to `addFiles()` helper, but button behavior unchanged
- Upload queue logic unchanged
- Progress tracking unchanged
- Remote pane unchanged

**Preserve behavior:**
- Drag-drop disabled during upload (same as "Add Files" button)
- ESC-to-close works as before
- Checkbox selection unaffected

---

## Implementation Plan

### Phase 1: Drag-and-Drop Logic

**Depends on:** Nothing  
**Parallelizable:** No (single component)

| Task | Agent               | Files                      | Description                                                                                                      |
| ---- | ------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1.1  | Frontend Developer  | `UploadDialog.tsx`         | Add drag-drop state: `dragActive` (boolean), `dragCounterRef` (number counter for nested elements)              |
| 1.2  | Frontend Developer  | `UploadDialog.tsx`         | Refactor file input handler: extract `addFiles(files: File[])` helper from `handleFileInput`, reuse for drop    |
| 1.3  | Frontend Developer  | `UploadDialog.tsx`         | Implement drag-drop handlers: `handleDragEnter`, `handleDragOver`, `handleDragLeave`, `handleDrop`              |
| 1.4  | Frontend Developer  | `UploadDialog.tsx`         | Attach handlers to local pane JSX: `onDragEnter`, `onDragOver`, `onDragLeave`, `onDrop`                         |
| 1.5  | Frontend Developer  | `UploadDialog.tsx`         | Add disabled logic: if `uploading === true`, show toast "Cannot add files during upload" and return from `drop` |

**Sub-Agent Guidance:**
- Task 1.1, 1.2 can be done in parallel (separate state + helper function)
- Task 1.3 depends on 1.1 (needs `dragActive` state) and 1.2 (needs `addFiles()` helper)
- Task 1.4, 1.5 depend on 1.3 (handlers must exist)

### Phase 2: Visual Feedback Styling

**Depends on:** Phase 1 (drag state exists)  
**Parallelizable:** Yes (CSS-only, no logic dependency)

| Task | Agent              | Files                           | Description                                                                                                    |
| ---- | ------------------ | ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 2.1  | Frontend Developer | `UploadDialog.module.css`       | Add `.dropZoneActive` class: cyan dashed outline, background tint (reuse FileExplorer `.dragOver` pattern)     |
| 2.2  | Frontend Developer | `UploadDialog.module.css`       | Add `.dropZoneDisabled` class: `cursor: not-allowed`, opacity 0.6 (for upload-in-progress state)              |
| 2.3  | Frontend Developer | `UploadDialog.tsx`              | Apply CSS class to local pane: `${dragActive ? styles.dropZoneActive : ''}` (conditional class)               |
| 2.4  | Frontend Developer | `UploadDialog.tsx`              | Apply disabled class if uploading: `${uploading ? styles.dropZoneDisabled : ''}` (disable drop zone visually) |

### Phase 3: Height Increase + Empty State Update

**Depends on:** Nothing (independent styling change)  
**Parallelizable:** Yes (can be done in parallel with Phase 1-2)

| Task | Agent              | Files                     | Description                                                                                           |
| ---- | ------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------- |
| 3.1  | Frontend Developer | `UploadDialog.module.css` | Increase `.dialog` max-height: `90vh` (was `88vh`)                                                   |
| 3.2  | Frontend Developer | `UploadDialog.module.css` | Add `.fileList` min-height: `320px` (ensure panes are taller for better file visibility)             |
| 3.3  | Frontend Developer | `UploadDialog.tsx`        | Update empty state text: `"Drag files here or click 'Add Files'"` (was just "Click 'Add Files'...")  |
| 3.4  | Frontend Developer | `UploadDialog.module.css` | Optional: Add styling to `<strong>` in empty state for emphasis (e.g., `color: var(--text-primary)`) |

### Phase 4: Testing & Edge Cases

**Depends on:** All implementation phases  
**Parallelizable:** No (manual testing sequence)

| Task | Agent             | Description                                                                                                                            |
| ---- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1  | Debugger/Reviewer | Test drag single file → verify added to list, auto-selected, "1 file added" toast                                                     |
| 4.2  | Debugger/Reviewer | Test drag multiple files → verify all added, all selected                                                                              |
| 4.3  | Debugger/Reviewer | Test drag duplicate filename → verify both added (no dedupe)                                                                           |
| 4.4  | Debugger/Reviewer | Test drag during upload → verify disabled (toast "Cannot add files during upload"), no files added                                    |
| 4.5  | Debugger/Reviewer | Test drag non-files (e.g., drag text from browser) → verify no crash, ignored gracefully                                              |
| 4.6  | Debugger/Reviewer | Test drag counter logic: drag over file list items (nested elements) → verify highlight doesn't flicker                               |
| 4.7  | Debugger/Reviewer | Test visual feedback: verify cyan border + tint appear on dragenter, disappear on drop/leave                                           |
| 4.8  | Debugger/Reviewer | Test "Add Files" button still works (parallel path)                                                                                    |
| 4.9  | Debugger/Reviewer | Test height increase: verify dialog taller, more files visible, no layout issues                                                       |
| 4.10 | Debugger/Reviewer | Test empty state: verify new instruction text displays correctly, styled properly                                                      |
| 4.11 | Debugger/Reviewer | Verify TypeScript compiles without errors: `npx tsc --noEmit`                                                                          |
| 4.12 | Debugger/Reviewer | Verify Wails build succeeds: `wails build`                                                                                             |
| 4.13 | Debugger/Reviewer | Visual regression check: verify all existing Upload Dialog functionality (checkboxes, upload, cancel, remote pane) still works as-is |

### Phase 5: Documentation (Always Last)

**Depends on:** Phase 4 (testing complete)

| Task | Agent         | Description                                                                                                          |
| ---- | ------------- | -------------------------------------------------------------------------------------------------------------------- |
| 5.1  | Documentation | Update `docs/components/upload-dialog.md`: add drag-drop usage section with screenshots/GIFs                        |
| 5.2  | Documentation | Update `docs/user-guide/file-manager.md`: mention drag-drop as alternative to "Add Files" button                    |
| 5.3  | Documentation | Update `docs/planning/changelog.md`: add PRD-013 entry                                                              |
| 5.4  | Documentation | Create `docs/planning/prd-013-implementation-summary.md` with deliverables, files changed, acceptance criteria pass |

---

## Risks & Mitigations

| Risk                                                         | Impact | Likelihood | Mitigation                                                                                                  |
| ------------------------------------------------------------ | ------ | ---------- | ----------------------------------------------------------------------------------------------------------- |
| Drag counter logic fails → flicker on nested elements        | Medium | Low        | Reuse FileExplorer pattern (proven working); add comprehensive drag tests (4.6)                            |
| Large file drag causes UI freeze (base64 encoding overhead)  | Medium | Medium     | Already a known limitation from PRD-012; no worse with drag-drop (same `addFiles()` path)                  |
| User drags folder instead of files → ignored or crash        | Low    | Medium     | Check `e.dataTransfer.files` contains valid files; if empty or invalid, just return (no crash)             |
| Height increase breaks layout on small screens               | Low    | Low        | `max-height: 90vh` ensures dialog never exceeds viewport; test on 1366x768 (common small laptop)           |
| Drag-drop conflicts with existing FileExplorer drag behavior | Low    | Low        | UploadDialog is isolated component; FileExplorer drag is for remote file move, not local add (no conflict) |

## Rollback Strategy

**Time to rollback:** < 5 minutes

**Steps:**
1. Revert `UploadDialog.tsx` changes (remove drag handlers, restore original `handleFileInput`)
2. Revert `UploadDialog.module.css` changes (restore `max-height: 88vh`, remove `.dropZoneActive` classes)
3. Test original "Add Files" button flow
4. Redeploy with `wails build`

**No database changes:** This is frontend-only (no schema, no API changes)

---

## Version History

| Version | Date       | Summary       |
| ------- | ---------- | ------------- |
| v1.0.0  | 2026-08-15 | Initial draft |

---

## Planning Checklist

- [x] Every task has a specific agent assigned
- [x] Every task lists exact file paths
- [x] No two parallel tasks modify the same file
- [x] Acceptance criteria are testable (not vague)
- [x] Codebase context from Explorer is referenced (FileExplorer drag pattern)
- [x] Review phase (Debugger/Reviewer) is included
- [x] Documentation phase is included
- [x] Security review NOT needed (no auth/data/API changes)
- [x] Rollback strategy defined
- [x] Version number assigned
