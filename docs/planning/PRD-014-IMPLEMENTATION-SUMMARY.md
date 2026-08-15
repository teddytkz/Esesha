# PRD-014 Implementation Summary

**PRD:** File Manager Toolbar Improvements  
**Version:** v1.0.0  
**Status:** Ready for Implementation  
**Date:** 2026-08-15

---

## Quick Summary

**What:** Streamline FileExplorer toolbar with icon-only buttons (Upload, Refresh) and add new "Add" menu (+) with dropdown for "Create Folder" and "Create File".

**Why:** Reduce toolbar clutter, improve visual consistency, provide quick access to common file creation operations.

**Scope:** MAJOR — UI enhancement with new dropdown menu component and file/folder creation dialogs.

---

## Implementation Overview

### Files to Modify

| File | Changes | Estimated Lines |
|------|---------|----------------|
| `frontend/src/components/FileExplorer.tsx` | Add icon-only button changes, Add button, dropdown menu, create dialogs, validation logic | +~100 lines |
| `frontend/src/components/FileExplorer.module.css` | Icon-only button sizing, dropdown styles, animations | +~80 lines |

**Total:** 2 files, ~180 lines added

### Backend Changes

**None.** This is a frontend-only enhancement. Reuses existing APIs:
- `CreateDirectory(sessionId: string, remotePath: string): Promise<void>`
- `WriteFile(sessionId: string, remotePath: string, content: string): Promise<void>`

---

## Agent Assignments

### Phase 1: Icon-Only Buttons
**Agent:** Frontend Developer  
**Effort:** 30 minutes  
**Files:** `FileExplorer.tsx`, `FileExplorer.module.css`

**Tasks:**
- Remove "Upload" and "Refresh" text from button JSX
- Add `title` attributes for tooltips
- Update `aria-label` for accessibility
- Adjust CSS padding for icon-only buttons

---

### Phase 2: Add Button + Dropdown State
**Agent:** Frontend Developer  
**Effort:** 1.5 hours  
**Files:** `FileExplorer.tsx`, `FileExplorer.module.css`

**Tasks:**
- Add `addMenuOpen` state
- Add Add button JSX with Plus icon
- Add dropdown menu JSX (conditional render)
- Add click handler to toggle dropdown
- Add `useEffect` for click-outside detection
- Add ESC key handler
- Add dropdown styles (positioning, background, hover states)

---

### Phase 3: Create Folder Dialog + Logic
**Agent:** Frontend Developer  
**Effort:** 2 hours  
**Files:** `FileExplorer.tsx`

**Tasks:**
- Add `createDialog` state
- Add click handler for "Create Folder" menu item
- Extend existing `Dialog` component to handle `kind: 'createFolder'`
- Add validation logic (no empty, no `/`, `\`, `.`, `..`)
- Add `confirmCreateFolder(name)` with `CreateDirectory()` call
- Add success toast + directory refresh
- Add error handling with toast

---

### Phase 4: Create File Dialog + Logic
**Agent:** Frontend Developer  
**Effort:** 1.5 hours  
**Files:** `FileExplorer.tsx`

**Tasks:**
- Add click handler for "Create File" menu item
- Extend `Dialog` component to handle `kind: 'createFile'`
- Add validation logic (no empty, no `/`, `\`)
- Add `confirmCreateFile(name)` with `WriteFile()` call (empty content)
- Add success toast + directory refresh
- Add error handling with toast
- Optional: Open file in FileEditor after creation

---

### Phase 5: UI Polish & Edge Cases
**Agent:** Frontend Developer  
**Effort:** 1 hour  
**Files:** `FileExplorer.tsx`, `FileExplorer.module.css`

**Tasks:**
- Handle "already exists" error with clear toast
- Add disabled state for Add button during uploads
- Reset dialog input when closed
- Ensure dropdown closes after menu item click
- Fine-tune dropdown positioning
- Add animation for dropdown open/close

---

### Phase 6: Testing & Validation
**Agent:** Frontend Developer  
**Effort:** 1 hour  
**Files:** Terminal + Manual testing

**Tasks:**
- Run `npx tsc --noEmit`
- Run `wails build`
- Test all acceptance criteria
- Test keyboard navigation
- Test edge cases

---

### Phase 7: Review & Documentation
**Agent:** Debugger/Reviewer + Documentation  
**Effort:** 1.5 hours  
**Files:** Documentation

**Tasks:**
- Verify 41 acceptance criteria
- Check keyboard accessibility
- Check design system compliance
- Verify no regressions
- Update `docs/user-guide/file-manager.md`
- Update component documentation
- Update `docs/planning/changelog.md`

---

## Total Effort Estimate

**Total:** ~9 hours (1-1.5 working days)

**Breakdown:**
- Phase 1: 0.5h
- Phase 2: 1.5h
- Phase 3: 2h
- Phase 4: 1.5h
- Phase 5: 1h
- Phase 6: 1h
- Phase 7: 1.5h

---

## Acceptance Criteria (41 Total)

### Phase 1: Icon-Only Buttons (8 criteria)
- [ ] Upload button displays only icon
- [ ] Refresh button displays only icon
- [ ] Upload button has tooltip
- [ ] Refresh button has tooltip
- [ ] Upload button has `aria-label`
- [ ] Refresh button has `aria-label`
- [ ] Icon-only buttons maintain hover/focus/active states
- [ ] Icon-only buttons maintain click behavior

### Phase 2: Add Button (8 criteria)
- [ ] Add button displays Plus icon
- [ ] Add button positioned at start of toolbar
- [ ] Add button has tooltip
- [ ] Add button has `aria-label`
- [ ] Add button opens dropdown on click
- [ ] Dropdown closes on outside click
- [ ] Dropdown closes on ESC
- [ ] Dropdown closes after selecting option

### Phase 3: Dropdown Menu (6 criteria)
- [ ] Dropdown contains "Create Folder" option
- [ ] Dropdown contains "Create File" option
- [ ] Dropdown positioned below Add button
- [ ] Dropdown uses Mission Control palette
- [ ] Dropdown items have hover states
- [ ] Dropdown keyboard-accessible

### Phase 4: Create Folder (10 criteria)
- [ ] Click "Create Folder" opens dialog
- [ ] Dialog has input field with validation
- [ ] Input validates: no empty, no `/`, `\`, `.`, `..`
- [ ] Valid name calls `CreateDirectory()`
- [ ] Success shows toast + refreshes directory
- [ ] Error shows toast, keeps dialog open
- [ ] Dialog has Cancel button
- [ ] Dialog has Create button
- [ ] ESC closes dialog
- [ ] Enter submits

### Phase 5: Create File (10 criteria)
- [ ] Click "Create File" opens dialog
- [ ] Dialog has input field with validation
- [ ] Input validates: no empty, no `/`, `\`
- [ ] Valid name calls `WriteFile()` with empty content
- [ ] Success shows toast + refreshes directory
- [ ] Error shows toast, keeps dialog open
- [ ] Dialog has Cancel button
- [ ] Dialog has Create button
- [ ] ESC closes dialog
- [ ] Enter submits

### Phase 6: Edge Cases (6 criteria)
- [ ] Already exists → backend error, shows toast
- [ ] Invalid characters → validation error in dialog
- [ ] Network error → error toast
- [ ] Dialog state resets when closed
- [ ] Dropdown does not open during uploads

### Phase 7: Build & Accessibility (3 criteria)
- [ ] TypeScript compilation passes
- [ ] Wails build succeeds
- [ ] Keyboard navigation works (Tab, Enter, ESC)

---

## State Changes

### New State Variables

```typescript
// In FileExplorer component
const [addMenuOpen, setAddMenuOpen] = useState(false);
const [createDialog, setCreateDialog] = useState<{ kind: 'folder' | 'file' } | null>(null);
```

### Extended Types

```typescript
// Extend existing DialogState union type
type DialogState =
  | { kind: 'delete'; item: FileInfo }
  | { kind: 'rename'; item: FileInfo }
  | { kind: 'chmod'; item: FileInfo }
  | { kind: 'createFolder' }  // NEW
  | { kind: 'createFile' }    // NEW
  | null;
```

---

## Key Implementation Details

### Icon-Only Button Changes

**Before:**
```tsx
<button className={`${styles.btn} ${styles.btnUpload}`} onClick={...}>
  <Upload size={16} />
  Upload
</button>
```

**After:**
```tsx
<button 
  className={`${styles.btn} ${styles.btnUpload}`} 
  onClick={...}
  title="Upload"
  aria-label="Upload files"
>
  <Upload size={16} aria-hidden="true" />
</button>
```

### Add Button + Dropdown

```tsx
<button
  className={`${styles.btn} ${styles.btnAdd}`}
  onClick={() => setAddMenuOpen(!addMenuOpen)}
  title="Add"
  aria-label="Create folder or file"
  disabled={uploadActive}
>
  <Plus size={16} aria-hidden="true" />
</button>

{addMenuOpen && (
  <div className={styles.addMenu}>
    <button onClick={() => { setCreateDialog({ kind: 'createFolder' }); setAddMenuOpen(false); }}>
      <Folder size={16} aria-hidden="true" />
      Create Folder
    </button>
    <button onClick={() => { setCreateDialog({ kind: 'createFile' }); setAddMenuOpen(false); }}>
      <File size={16} aria-hidden="true" />
      Create File
    </button>
  </div>
)}
```

### Validation Logic

```typescript
const validateName = (name: string, kind: 'folder' | 'file'): string | null => {
  if (!name.trim()) return 'Name cannot be empty';
  if (name === '.' || name === '..') return 'Invalid name';
  if (name.includes('/') || name.includes('\\')) return 'Name cannot contain / or \\';
  return null; // Valid
};
```

### Create Folder Handler

```typescript
const confirmCreateFolder = async (name: string) => {
  const error = validateName(name, 'folder');
  if (error) {
    showToast(error, 'error');
    return;
  }
  
  setCreateDialog(null);
  try {
    const remotePath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
    await window.go.main.App.CreateDirectory(sessionId, remotePath);
    showToast(`Folder created: ${name}`, 'success');
    loadDirectory(currentPath);
  } catch (err) {
    showToast(`Create folder failed: ${err}`, 'error');
  }
};
```

### Create File Handler

```typescript
const confirmCreateFile = async (name: string) => {
  const error = validateName(name, 'file');
  if (error) {
    showToast(error, 'error');
    return;
  }
  
  setCreateDialog(null);
  try {
    const remotePath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
    await window.go.main.App.WriteFile(sessionId, remotePath, '');
    showToast(`File created: ${name}`, 'success');
    loadDirectory(currentPath);
    
    // Optional: Open in editor
    // setEditingPath(remotePath);
  } catch (err) {
    showToast(`Create file failed: ${err}`, 'error');
  }
};
```

---

## CSS Additions

### Icon-Only Button Sizing

```css
.btn {
  padding: 8px 10px; /* Adjusted for icon-only (was 6px 12px) */
  /* ... existing styles ... */
}

.btnUpload {
  padding: 8px 12px; /* Slightly wider for primary button */
  /* ... existing styles ... */
}
```

### Dropdown Menu Styles

```css
.addMenu {
  position: absolute;
  top: 48px; /* Below toolbar */
  left: 10px; /* Aligned with Add button */
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  min-width: 180px;
  padding: 4px;
  animation: menuIn 0.12s ease;
}

.addMenu button {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  font-size: var(--font-size-base);
  transition: background var(--transition-fast);
}

.addMenu button:hover {
  background: var(--bg-hover);
}
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Dropdown positioning off-screen | Use viewport boundary detection; fallback to `position: fixed` |
| Icon-only buttons lose discoverability | Tooltips (`title` attribute) on hover |
| Dialog state conflicts | Extend existing `DialogState` union type |
| Backend error for existing file/folder | Handle gracefully with toast message |

---

## Rollback Plan

**Effort:** < 5 minutes

**Steps:**
1. Revert `FileExplorer.tsx` (restore text labels, remove Add button/dropdown/dialogs)
2. Revert `FileExplorer.module.css` (remove new styles)
3. Run `wails build`
4. Test Upload and Refresh buttons

**Risk:** Very low (isolated changes, no backend/database changes)

---

## Next Steps for Orchestrator

1. Assign **Frontend Developer** to implement Phases 1-6 sequentially
2. After Phase 6, assign **Debugger/Reviewer** for Phase 7 verification
3. After review passes, assign **Documentation** agent for user guide updates
4. Update changelog with implementation status

---

## Success Criteria

✅ All 41 acceptance criteria pass  
✅ TypeScript compilation successful  
✅ Wails build successful  
✅ No regressions in existing functionality  
✅ Keyboard navigation works  
✅ Design system compliance verified  
✅ Documentation complete  

---

**Plan Status:** ✅ COMPLETE — Ready for implementation  
**Next Agent:** Frontend Developer (Phase 1)
