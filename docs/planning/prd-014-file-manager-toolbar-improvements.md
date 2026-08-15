# PRD-014: File Manager Toolbar Improvements

**Version:** v1.0.0
**Status:** Draft
**Author:** Planner Agent
**Created:** 2026-08-15
**Updated:** 2026-08-15

---

## Overview

Streamline the File Manager toolbar with icon-only buttons and add a new "Add" menu for creating folders and files. This enhances visual consistency (icon-only style matches modern file managers), reduces toolbar clutter, and provides quick access to common file creation operations.

## Problem Statement

**Current state:**
- Upload and Refresh buttons have both icon + text label → toolbar feels busy
- No quick way to create folders or files → users must use alternative methods or lack this functionality entirely
- Toolbar design inconsistent with modern minimalist file manager UX

**User pain points:**
- Toolbar takes up horizontal space unnecessarily
- Missing common operations (Create Folder, Create File) that exist in most file managers
- Text labels reduce visual clarity when icons are already self-explanatory

## Goals

- **Icon-only buttons:** Remove text labels from Upload and Refresh buttons (tooltips for accessibility)
- **Add menu:** New "+" button with dropdown menu for "Create Folder" and "Create File"
- **Maintain consistency:** Match existing Mission Control design system
- **Preserve behavior:** Upload and Refresh functionality unchanged
- **Accessibility:** Tooltips, ARIA labels, keyboard navigation

## Non-Goals

- Bulk folder/file creation
- Template-based file creation
- Folder/file creation with custom permissions (use default permissions, then Chmod if needed)
- Redesigning the entire toolbar layout
- Adding other file operations beyond Create Folder/File

---

## Feature Specification

### User Stories

- As a user, I want icon-only toolbar buttons so the interface is cleaner and less cluttered
- As a user, I want tooltips on icon-only buttons so I know what each button does
- As a user, I want a quick way to create folders without using context menus
- As a user, I want a quick way to create empty files for editing
- As a user, I want the Add dropdown to close when I click outside or press ESC
- As a user, I want clear validation feedback if I try to create a folder/file with an invalid name

### Acceptance Criteria

**Phase 1: Icon-Only Buttons**
- [ ] Upload button displays only Upload icon (no "Upload" text)
- [ ] Refresh button displays only Refresh icon (no "Refresh" text)
- [ ] Upload button has `title="Upload"` tooltip
- [ ] Refresh button has `title="Refresh"` tooltip
- [ ] Upload button has `aria-label="Upload files"`
- [ ] Refresh button has `aria-label="Refresh directory"`
- [ ] Icon-only buttons maintain same hover/focus/active states
- [ ] Icon-only buttons maintain same click behavior

**Phase 2: Add Button**
- [ ] Add button displays Plus icon (lucide-react `Plus`)
- [ ] Add button positioned at start of toolbar (before Upload button)
- [ ] Add button has `title="Add"` tooltip
- [ ] Add button has `aria-label="Create folder or file"`
- [ ] Add button opens dropdown menu on click
- [ ] Dropdown menu closes on outside click
- [ ] Dropdown menu closes on ESC key
- [ ] Dropdown menu closes after selecting an option

**Phase 3: Dropdown Menu**
- [ ] Dropdown contains "Create Folder" option with Folder icon
- [ ] Dropdown contains "Create File" option with File icon
- [ ] Dropdown positioned below Add button, left-aligned
- [ ] Dropdown uses Mission Control palette (same as context menu)
- [ ] Dropdown items have hover states
- [ ] Dropdown is keyboard-accessible (Tab, Arrow keys, Enter)

**Phase 4: Create Folder**
- [ ] Click "Create Folder" → opens inline dialog with input field
- [ ] Dialog pre-fills with "New Folder" or empty (user choice during implementation)
- [ ] Input validates on submit: no empty, no `/` or `\`, no `.` or `..`
- [ ] Valid name → calls `CreateDirectory(sessionId, currentPath + "/" + folderName)`
- [ ] Success → shows toast "Folder created: {folderName}", refreshes directory
- [ ] Error → shows toast with error message, does not close dialog
- [ ] Dialog has Cancel button (closes without action)
- [ ] Dialog has Create button (validates and creates)
- [ ] ESC key closes dialog
- [ ] Enter key in input field submits (same as Create button)
- [ ] Focus moves to input field when dialog opens

**Phase 5: Create File**
- [ ] Click "Create File" → opens inline dialog with input field
- [ ] Dialog pre-fills with "New File" or empty (user choice during implementation)
- [ ] Input validates on submit: no empty, no `/` or `\`
- [ ] Valid name → calls `WriteFile(sessionId, currentPath + "/" + fileName, "")`
- [ ] Success → shows toast "File created: {fileName}", refreshes directory
- [ ] Error → shows toast with error message, does not close dialog
- [ ] Dialog has Cancel button (closes without action)
- [ ] Dialog has Create button (validates and creates)
- [ ] ESC key closes dialog
- [ ] Enter key in input field submits (same as Create button)
- [ ] Focus moves to input field when dialog opens
- [ ] Optionally: after creation, opens file in FileEditor (implementation decision)

**Phase 6: Edge Cases**
- [ ] Folder/file already exists → backend returns error, shows toast "Already exists: {name}"
- [ ] Invalid characters in name → shows validation error in dialog (not toast)
- [ ] Network error during creation → shows toast with error message
- [ ] Dialog state resets when closed (input value cleared)
- [ ] Dropdown menu does not open during active uploads (disabled state)

**Phase 7: Build & Accessibility**
- [ ] TypeScript compilation passes (`npx tsc --noEmit`)
- [ ] Wails build succeeds (`wails build`)
- [ ] All interactive elements keyboard-accessible (Tab, Enter, ESC)
- [ ] All buttons have ARIA labels or titles
- [ ] Focus order logical (Add → Upload → Refresh)

---

## Technical Design

### Architecture Overview

**Component:** FileExplorer.tsx (existing component, ~750 lines)

**Changes:**
1. Remove text labels from Upload and Refresh buttons (CSS + JSX changes)
2. Add new state: `addMenuOpen: boolean` (dropdown open/closed)
3. Add new state: `createDialog: { kind: 'folder' | 'file' } | null` (which creation dialog is open)
4. Add dropdown menu component (inline or extracted, implementation decision)
5. Add creation dialog logic (reuse existing inline dialog pattern from Delete/Rename/Chmod)
6. Add validation helpers for folder/file names
7. Add backend calls: `CreateDirectory()`, `WriteFile()`

### Codebase Context

**Existing patterns to reuse:**
- Inline dialog pattern: `Dialog` component already handles Delete/Rename/Chmod with input validation
- Context menu pattern: Dropdown menu can reuse same styling and behavior (click outside, ESC key)
- Toast system: `showToast(message, type)` already exists for success/error feedback
- Backend API calls: `CreateDirectory` and `WriteFile` already available in `frontend/wailsjs/go/main/App.d.ts`

**Design system:**
- Colors: Mission Control palette from `docs/DESIGN-SYSTEM.md`
- Icons: lucide-react (`Plus`, `FolderPlus`, `FilePlus`, or `Folder`, `File`)
- Transitions: `--transition-fast` (150ms)
- Borders: `--border-default`, `--border-focus`
- Backgrounds: `--bg-tertiary` (buttons, dialogs), `--bg-hover` (hover states)
- Accent: `--accent-primary` (cyan) for primary action (Create button)

### Data Model

No database changes required. Uses existing backend APIs.

**Backend APIs:**
```typescript
// Already exists in frontend/wailsjs/go/main/App.d.ts
CreateDirectory(sessionId: string, remotePath: string): Promise<void>;
WriteFile(sessionId: string, remotePath: string, content: string): Promise<void>;
```

**Component state additions:**
```typescript
const [addMenuOpen, setAddMenuOpen] = useState(false);
const [createDialog, setCreateDialog] = useState<{ kind: 'folder' | 'file' } | null>(null);
```

### UI Changes

**Before:**
```
[↑ Up] [root / path / to / folder ▸▸▸] [📤 Upload] [🔄 Refresh]
```

**After:**
```
[➕] [↑ Up] [root / path / to / folder ▸▸▸] [📤] [🔄]
      ↓ (on click)
      [📁 Create Folder]
      [📄 Create File]
```

**Dropdown menu positioning:**
- Below Add button, left edge aligned with button left edge
- `position: absolute`, positioned relative to toolbar
- Or use `position: fixed` with computed coordinates (like context menu)

**Creation dialog:**
- Reuse existing `Dialog` component structure
- Overlay + centered dialog box
- Input field with validation
- Cancel + Create buttons
- ESC to close

---

## Implementation Plan

### Phase 1: Icon-Only Buttons (Frontend Developer)

**Depends on:** Nothing
**Parallelizable:** Yes

| Task | Agent               | Files                                                          | Description                                                                 |
| ---- | ------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1.1  | Frontend Developer  | `frontend/src/components/FileExplorer.tsx`                     | Remove "Upload" and "Refresh" text from button JSX; add `title` attributes |
| 1.2  | Frontend Developer  | `frontend/src/components/FileExplorer.tsx`                     | Update `aria-label` attributes for accessibility                            |
| 1.3  | Frontend Developer  | `frontend/src/components/FileExplorer.module.css`              | Adjust `.btn` padding for icon-only (square or near-square)                |
| 1.4  | Frontend Developer  | `frontend/src/components/FileExplorer.module.css`              | Ensure `.btnUpload` maintains cyan background with icon-only size           |

**Sub-Agent Guidance:**
- Task 1.1-1.4 can be done in a single edit pass (parallel conceptually, but edit same files)

**Acceptance:**
- Upload and Refresh buttons display only icons
- Tooltips appear on hover (`title` attribute)
- ARIA labels present for screen readers
- Button sizing consistent (icon-only buttons not too small)

---

### Phase 2: Add Button + Dropdown State (Frontend Developer)

**Depends on:** Phase 1
**Parallelizable:** No (builds on Phase 1)

| Task | Agent              | Files                                              | Description                                                           |
| ---- | ------------------ | -------------------------------------------------- | --------------------------------------------------------------------- |
| 2.1  | Frontend Developer | `frontend/src/components/FileExplorer.tsx`         | Add `addMenuOpen` state, Add button JSX with Plus icon               |
| 2.2  | Frontend Developer | `frontend/src/components/FileExplorer.tsx`         | Add dropdown menu JSX (conditional render based on `addMenuOpen`)     |
| 2.3  | Frontend Developer | `frontend/src/components/FileExplorer.tsx`         | Add click handler to toggle `addMenuOpen`                             |
| 2.4  | Frontend Developer | `frontend/src/components/FileExplorer.tsx`         | Add `useEffect` for click-outside detection (close dropdown)          |
| 2.5  | Frontend Developer | `frontend/src/components/FileExplorer.tsx`         | Add ESC key handler (close dropdown)                                  |
| 2.6  | Frontend Developer | `frontend/src/components/FileExplorer.module.css`  | Add `.addMenu` styles (positioning, background, border, shadow)       |
| 2.7  | Frontend Developer | `frontend/src/components/FileExplorer.module.css`  | Add `.addMenuItem` styles (hover states, icon spacing)                |

**Sub-Agent Guidance:**
- Task 2.1-2.7 sequential (state → JSX → handlers → styles)

**Acceptance:**
- Add button positioned at start of toolbar
- Dropdown opens below Add button on click
- Dropdown closes on outside click
- Dropdown closes on ESC key
- Dropdown contains "Create Folder" and "Create File" menu items
- Menu items have hover states

---

### Phase 3: Create Folder Dialog + Logic (Frontend Developer)

**Depends on:** Phase 2
**Parallelizable:** No (builds on Phase 2)

| Task | Agent              | Files                                              | Description                                                               |
| ---- | ------------------ | -------------------------------------------------- | ------------------------------------------------------------------------- |
| 3.1  | Frontend Developer | `frontend/src/components/FileExplorer.tsx`         | Add `createDialog` state (`{ kind: 'folder' | 'file' } | null`)          |
| 3.2  | Frontend Developer | `frontend/src/components/FileExplorer.tsx`         | Add click handler for "Create Folder" menu item (opens dialog)            |
| 3.3  | Frontend Developer | `frontend/src/components/FileExplorer.tsx`         | Extend existing `Dialog` component to handle `kind: 'createFolder'`       |
| 3.4  | Frontend Developer | `frontend/src/components/FileExplorer.tsx`         | Add validation logic for folder name (no empty, no `/`, `\`, `.`, `..`)   |
| 3.5  | Frontend Developer | `frontend/src/components/FileExplorer.tsx`         | Add `confirmCreateFolder(name)` function with `CreateDirectory()` call    |
| 3.6  | Frontend Developer | `frontend/src/components/FileExplorer.tsx`         | Add success toast + `loadDirectory()` refresh after creation              |
| 3.7  | Frontend Developer | `frontend/src/components/FileExplorer.tsx`         | Add error handling with toast on failure (don't close dialog)             |

**Sub-Agent Guidance:**
- Task 3.1-3.7 sequential (state → handler → dialog extension → validation → backend call → feedback)

**Acceptance:**
- "Create Folder" menu item opens creation dialog
- Dialog has input field with validation
- Valid input → calls `CreateDirectory`, shows success toast, refreshes directory
- Invalid input → shows validation error (inline or toast)
- Backend error → shows error toast, keeps dialog open
- ESC closes dialog
- Enter submits

---

### Phase 4: Create File Dialog + Logic (Frontend Developer)

**Depends on:** Phase 3
**Parallelizable:** No (sequential with Phase 3, similar implementation)

| Task | Agent              | Files                                              | Description                                                               |
| ---- | ------------------ | -------------------------------------------------- | ------------------------------------------------------------------------- |
| 4.1  | Frontend Developer | `frontend/src/components/FileExplorer.tsx`         | Add click handler for "Create File" menu item (opens dialog)              |
| 4.2  | Frontend Developer | `frontend/src/components/FileExplorer.tsx`         | Extend `Dialog` component to handle `kind: 'createFile'`                  |
| 4.3  | Frontend Developer | `frontend/src/components/FileExplorer.tsx`         | Add validation logic for file name (no empty, no `/`, `\`)                |
| 4.4  | Frontend Developer | `frontend/src/components/FileExplorer.tsx`         | Add `confirmCreateFile(name)` function with `WriteFile()` call (empty)    |
| 4.5  | Frontend Developer | `frontend/src/components/FileExplorer.tsx`         | Add success toast + `loadDirectory()` refresh after creation              |
| 4.6  | Frontend Developer | `frontend/src/components/FileExplorer.tsx`         | Add error handling with toast on failure (don't close dialog)             |
| 4.7  | Frontend Developer | `frontend/src/components/FileExplorer.tsx`         | Optional: Add `setEditingPath(remotePath)` after creation to open editor  |

**Sub-Agent Guidance:**
- Task 4.1-4.7 sequential
- Task 4.7 is optional — decide during implementation based on UX consideration

**Acceptance:**
- "Create File" menu item opens creation dialog
- Dialog has input field with validation
- Valid input → calls `WriteFile` with empty content, shows success toast, refreshes directory
- Invalid input → shows validation error
- Backend error → shows error toast, keeps dialog open
- Optionally: file opens in FileEditor after creation

---

### Phase 5: UI Polish & Edge Cases (Frontend Developer)

**Depends on:** Phase 4
**Parallelizable:** No (polish phase)

| Task | Agent              | Files                                              | Description                                                               |
| ---- | ------------------ | -------------------------------------------------- | ------------------------------------------------------------------------- |
| 5.1  | Frontend Developer | `frontend/src/components/FileExplorer.tsx`         | Handle "already exists" error with clear toast message                    |
| 5.2  | Frontend Developer | `frontend/src/components/FileExplorer.tsx`         | Add disabled state for Add button during active uploads                   |
| 5.3  | Frontend Developer | `frontend/src/components/FileExplorer.tsx`         | Reset dialog input when closed (clear previous value)                     |
| 5.4  | Frontend Developer | `frontend/src/components/FileExplorer.tsx`         | Ensure dropdown closes after menu item click                              |
| 5.5  | Frontend Developer | `frontend/src/components/FileExplorer.module.css`  | Fine-tune dropdown positioning (ensure it doesn't overflow viewport)      |
| 5.6  | Frontend Developer | `frontend/src/components/FileExplorer.module.css`  | Add animation for dropdown open/close (reuse `@keyframes menuIn`)         |

**Sub-Agent Guidance:**
- Task 5.1-5.6 can be done in parallel (independent edge case fixes)

**Acceptance:**
- All edge cases handled gracefully
- Dropdown closes after selecting menu item
- Add button disabled during uploads
- Dialog state resets on close

---

### Phase 6: Testing & Validation (Frontend Developer)

**Depends on:** Phase 5
**Parallelizable:** No (validation phase)

| Task | Agent              | Files                                              | Description                                                               |
| ---- | ------------------ | -------------------------------------------------- | ------------------------------------------------------------------------- |
| 6.1  | Frontend Developer | Terminal                                           | Run `npx tsc --noEmit` to check TypeScript errors                         |
| 6.2  | Frontend Developer | Terminal                                           | Run `wails build` to verify production build                              |
| 6.3  | Frontend Developer | Manual testing                                     | Test all acceptance criteria (icon-only buttons, Add menu, dialogs)       |
| 6.4  | Frontend Developer | Manual testing                                     | Test keyboard navigation (Tab, Enter, ESC)                                |
| 6.5  | Frontend Developer | Manual testing                                     | Test edge cases (invalid names, already exists, network errors)           |

**Sub-Agent Guidance:**
- Task 6.1-6.5 sequential (build first, then manual testing)

**Acceptance:**
- TypeScript compilation passes
- Wails build succeeds
- All acceptance criteria verified
- Keyboard navigation works
- Edge cases handled

---

### Phase 7: Review & Documentation (Debugger/Reviewer + Documentation Agent)

**Depends on:** Phase 6
**Parallelizable:** No (final review phase)

| Task | Agent              | Description                                                                     |
| ---- | ------------------ | ------------------------------------------------------------------------------- |
| 7.1  | Debugger/Reviewer  | Verify all 41 acceptance criteria (Phases 1-7)                                  |
| 7.2  | Debugger/Reviewer  | Check keyboard accessibility (Tab order, ARIA labels, focus management)         |
| 7.3  | Debugger/Reviewer  | Check design system compliance (colors, spacing, transitions)                   |
| 7.4  | Debugger/Reviewer  | Verify no regressions in existing FileExplorer functionality                    |
| 7.5  | Documentation      | Update `docs/user-guide/file-manager.md` with Add menu usage                    |
| 7.6  | Documentation      | Update `docs/components/upload-dialog.md` or create new section for Add menu   |
| 7.7  | Documentation      | Update `docs/planning/changelog.md` with PRD-014 entry                          |

**Acceptance:**
- All functionality works as specified
- No regressions
- Documentation complete

---

## Risks & Mitigations

| Risk                                    | Impact | Likelihood | Mitigation                                                                 |
| --------------------------------------- | ------ | ---------- | -------------------------------------------------------------------------- |
| Dropdown positioning off-screen         | Low    | Medium     | Use viewport boundary detection; fallback to `position: fixed` with calc   |
| Name validation too strict              | Low    | Medium     | Allow most characters except `/` and `\`; rely on backend error handling   |
| Icon-only buttons lose discoverability  | Low    | Low        | Tooltips (`title` attribute) provide label on hover                        |
| Dialog state conflicts with existing    | Medium | Low        | Extend existing `DialogState` union type; ensure kind is unique            |
| Backend `CreateDirectory` already exists error | Low | High  | Handle error gracefully with toast; suggest rename or cancel               |

---

## Rollback Strategy

**Effort:** < 5 minutes

**Steps:**
1. Revert changes to `FileExplorer.tsx` (restore text labels, remove Add button/dropdown/dialogs)
2. Revert changes to `FileExplorer.module.css` (remove new dropdown/dialog styles)
3. Run `wails build` to verify rollback
4. Test Upload and Refresh buttons work as before

**Risk:** Very low — changes are isolated to FileExplorer component, no backend changes, no database schema changes.

---

## Version History

| Version | Date       | Summary         |
| ------- | ---------- | --------------- |
| v1.0.0  | 2026-08-15 | Initial draft   |
