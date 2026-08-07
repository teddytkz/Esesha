# Implementation Plan: Edit Connection Kebab Menu

**Type:** Minor Feature Enhancement
**Scope:** Single-component UI addition + API integration
**Status:** Ready for Implementation
**Date:** 2026-08-07

---

## Overview

Add a kebab menu (three-dot button) to each connection item in the sidebar. Clicking the menu shows a dropdown with "Edit Connection" option. Clicking "Edit" opens a modal dialog pre-filled with the connection's current data, allowing the user to modify and save changes via the existing backend API.

---

## Context from Explorer

- **Connection list location:** `App.tsx` lines 271-284 (`.connectionItem` buttons)
- **Backend API available:** `UpdateConnection(id, name, host, port, username, password, privateKeyPath)` in `app.go` line 167
- **Existing modal pattern:** Add Connection modal (lines 395-535) — can be duplicated/adapted
- **Icons available:** lucide-react v1.28.0 (`MoreVertical` for kebab button, `Edit` for menu item)
- **Design system:** Mission Control (cyan `#22d3ee`, glass morphism, CSS Modules)

---

## Implementation Summary

**Scope:** Minor — no PRD created (enhancement to existing connection management)

**Files to modify:**

1. **`frontend/src/components/App.tsx`** — Add kebab menu, dropdown logic, edit modal
   - Add state: `openMenuId` (tracks which connection's menu is open), `editingConnection` (connection being edited), `isEditModalOpen`
   - Add kebab button to each `.connectionItem` (positioned absolute right)
   - Add dropdown menu component (conditional render below kebab button)
   - Add "Edit Connection" modal (duplicate Add Connection modal, pre-fill with `editingConnection` data)
   - Add `handleEditConnection(conn)` — opens edit modal with pre-filled data
   - Add `handleSaveEdit()` — calls `UpdateConnection()`, refreshes connection list, closes modal
   - Add click-outside handler to close dropdown

2. **`frontend/src/components/App.module.css`** — Style kebab button, dropdown menu
   - `.connectionItem` — make `position: relative` to contain kebab button
   - `.kebabButton` — absolute positioned, right side, hover cyan glow
   - `.kebabDropdown` — glass morphism, cyan border, absolute positioned below button
   - `.dropdownItem` — hover state with cyan background

**Agent:** Frontend Developer

**Acceptance Criteria:**
- [ ] Kebab menu button appears on right side of each connection item
- [ ] Clicking kebab button shows dropdown menu (only one dropdown open at a time)
- [ ] Clicking outside dropdown closes it
- [ ] Clicking "Edit" in dropdown opens modal pre-filled with connection data
- [ ] All fields in edit modal are editable (name, host, port, username, password, private key path)
- [ ] Saving edited connection calls `UpdateConnection()` backend API
- [ ] Connection list refreshes after successful edit
- [ ] Modal closes after save
- [ ] Follows Mission Control design system (cyan accents, glass morphism)
- [ ] Kebab button doesn't interfere with connection selection (click on connection name/details still selects connection)

---

## Detailed Task Breakdown

### Task 1: Add Kebab Menu Button & Dropdown UI

**File:** `frontend/src/components/App.tsx`

**Actions:**

1. Import `MoreVertical`, `Edit` from `lucide-react`

2. Add state variables:
   ```typescript
   const [openMenuId, setOpenMenuId] = useState<number | null>(null);
   const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
   const [isEditModalOpen, setIsEditModalOpen] = useState(false);
   ```

3. Modify connection list item structure (lines 271-284):
   - Wrap existing content in a container div
   - Add kebab button:
     ```tsx
     <button
       type="button"
       className={styles.kebabButton}
       onClick={(e) => {
         e.stopPropagation(); // Prevent connection selection
         setOpenMenuId(openMenuId === conn.id ? null : conn.id);
       }}
       aria-label="Connection options"
     >
       <MoreVertical size={16} />
     </button>
     ```
   - Add dropdown menu (conditional):
     ```tsx
     {openMenuId === conn.id && (
       <div className={styles.kebabDropdown}>
         <button
           type="button"
           className={styles.dropdownItem}
           onClick={(e) => {
             e.stopPropagation();
             handleEditConnection(conn);
             setOpenMenuId(null);
           }}
         >
           <Edit size={14} />
           Edit Connection
         </button>
       </div>
     )}
     ```

4. Add click-outside handler:
   ```typescript
   useEffect(() => {
     const handleClickOutside = (e: MouseEvent) => {
       if (openMenuId !== null && !(e.target as Element).closest(`.${styles.kebabDropdown}, .${styles.kebabButton}`)) {
         setOpenMenuId(null);
       }
     };
     document.addEventListener('mousedown', handleClickOutside);
     return () => document.removeEventListener('mousedown', handleClickOutside);
   }, [openMenuId]);
   ```

---

### Task 2: Add Edit Connection Modal

**File:** `frontend/src/components/App.tsx`

**Actions:**

1. Create `handleEditConnection` function:
   ```typescript
   const handleEditConnection = (conn: Connection) => {
     setEditingConnection({
       id: conn.id,
       name: conn.name,
       host: conn.host,
       port: conn.port,
       username: conn.username,
       password: '', // Leave empty, user can update if needed
       privateKeyPath: conn.privateKeyPath || ''
     });
     setIsEditModalOpen(true);
   };
   ```

2. Create `handleSaveEdit` function:
   ```typescript
   const handleSaveEdit = async () => {
     if (!editingConnection) return;
     
     try {
       await UpdateConnection(
         editingConnection.id,
         editingConnection.name,
         editingConnection.host,
         editingConnection.port,
         editingConnection.username,
         editingConnection.password,
         editingConnection.privateKeyPath
       );
       
       // Refresh connection list
       const updated = await ListConnections();
       setConnections(updated);
       
       // Close modal
       setIsEditModalOpen(false);
       setEditingConnection(null);
       
       // Show success toast (if toast system exists, otherwise skip)
     } catch (err) {
       console.error('Failed to update connection:', err);
       // Show error toast
     }
   };
   ```

3. Create `closeEditModal` function:
   ```typescript
   const closeEditModal = () => {
     setIsEditModalOpen(false);
     setEditingConnection(null);
   };
   ```

4. Add Edit Connection modal JSX (duplicate Add Connection modal structure, change title and form logic):
   ```tsx
   {isEditModalOpen && editingConnection && (
     <div className={styles.modalOverlay} onClick={closeEditModal}>
       <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
         <div className={styles.modalAccent} />
         <div className={styles.modalHeader}>
           <h3>Edit SSH Connection</h3>
           <button type="button" className={styles.btnCloseModal} onClick={closeEditModal}>
             <X size={18} />
           </button>
         </div>
         <div className={styles.modalBody}>
           {/* Form fields identical to Add Connection, but bound to editingConnection */}
           <div className={styles.formGroup}>
             <label htmlFor="edit-conn-name">Connection Name</label>
             <input
               id="edit-conn-name"
               type="text"
               value={editingConnection.name}
               onChange={(e) => setEditingConnection({...editingConnection, name: e.target.value})}
             />
           </div>
           {/* ... repeat for host, port, username, password, privateKeyPath ... */}
         </div>
         <div className={styles.modalFooter}>
           <button type="button" className={styles.btnCancel} onClick={closeEditModal}>
             Cancel
           </button>
           <button type="button" className={styles.btnPrimary} onClick={handleSaveEdit}>
             Save Changes
           </button>
         </div>
       </div>
     </div>
   )}
   ```

---

### Task 3: Style Kebab Menu & Dropdown

**File:** `frontend/src/components/App.module.css`

**Actions:**

1. Make `.connectionItem` relative positioned (if not already):
   ```css
   .connectionItem {
     position: relative;
     /* ... existing styles ... */
   }
   ```

2. Add kebab button styles:
   ```css
   .kebabButton {
     position: absolute;
     right: 8px;
     top: 50%;
     transform: translateY(-50%);
     padding: 4px;
     background: transparent;
     border: 1px solid transparent;
     border-radius: var(--radius-sm);
     color: var(--text-secondary);
     cursor: pointer;
     opacity: 0;
     transition: opacity var(--transition-fast), color var(--transition-fast), background var(--transition-fast);
   }

   .connectionItem:hover .kebabButton,
   .kebabButton:focus-visible {
     opacity: 1;
   }

   .kebabButton:hover {
     background: var(--bg-tertiary);
     color: var(--accent-primary);
   }

   .kebabButton:focus-visible {
     outline: 2px solid var(--border-focus);
     outline-offset: 2px;
   }
   ```

3. Add dropdown menu styles:
   ```css
   .kebabDropdown {
     position: absolute;
     top: calc(100% + 4px);
     right: 8px;
     min-width: 160px;
     background: var(--bg-glass);
     backdrop-filter: blur(12px);
     border: 1px solid var(--accent-primary);
     border-radius: var(--radius-md);
     padding: 4px;
     z-index: 1000;
     box-shadow: var(--shadow-lg), var(--glow-cyan);
   }

   .dropdownItem {
     width: 100%;
     padding: 8px 12px;
     background: transparent;
     border: none;
     border-radius: var(--radius-sm);
     color: var(--text-primary);
     font-size: var(--font-size-sm);
     text-align: left;
     cursor: pointer;
     display: flex;
     align-items: center;
     gap: 8px;
     transition: background var(--transition-fast), color var(--transition-fast);
   }

   .dropdownItem:hover {
     background: rgba(34, 211, 238, 0.1);
     color: var(--accent-primary);
   }

   .dropdownItem:focus-visible {
     outline: 2px solid var(--border-focus);
     outline-offset: -2px;
   }
   ```

---

## Edge Cases & Considerations

1. **Click propagation:** Kebab button and dropdown clicks must `stopPropagation()` to prevent triggering connection selection
2. **Dropdown positioning:** Dropdown positioned relative to connection item; may need adjustment if connection item is near bottom of list (consider flipping dropdown above button if space is limited)
3. **Password field:** Leave password empty in edit form; only update on backend if user enters new password (backend handles this — empty password is ignored in `UpdateConnection`)
4. **Close dropdown on blur:** Click outside or Escape key should close dropdown
5. **Single dropdown open:** Opening one kebab menu closes any previously open menu
6. **No multi-select:** Editing is single-connection only (no batch edit)

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Kebab button interferes with connection selection | Medium | Low | Use `stopPropagation()` on button and dropdown clicks |
| Dropdown overflow hidden by sidebar boundaries | Low | Medium | Use `z-index` high enough; consider portal pattern if needed (deferred) |
| Password security: showing existing password in plain text | High | N/A | Don't pre-fill password field; only update if user enters new value |
| State sync issue after edit | Medium | Low | Refresh connection list after successful `UpdateConnection()` call |

---

## Testing Checklist

- [ ] Kebab button appears on hover (or always visible on mobile/touch)
- [ ] Only one dropdown open at a time
- [ ] Clicking outside dropdown closes it
- [ ] Escape key closes dropdown
- [ ] Edit modal opens with correct pre-filled data
- [ ] All fields editable
- [ ] Password field starts empty
- [ ] Save button calls `UpdateConnection()` with correct parameters
- [ ] Connection list refreshes after save
- [ ] Modal closes after save
- [ ] Error handling for failed update
- [ ] No interference with connection selection
- [ ] Dropdown doesn't overflow sidebar boundaries
- [ ] Keyboard navigation works (Tab to kebab button, Enter to open, arrow keys in dropdown)
- [ ] Screen reader announces menu state

---

## Future Enhancements (Out of Scope)

- Delete Connection option in kebab menu (backend API exists, UI not yet implemented)
- Duplicate Connection option
- Test Connection option
- Multi-select for batch edit/delete
- Drag-to-reorder connections

---

## Agent Assignment

**Agent:** Frontend Developer

**Reason:** Single-component UI work, state management, API integration. No backend changes required.

---

## Rollback Strategy

If issues arise:
1. Revert changes to `App.tsx` and `App.module.css`
2. No backend changes to revert
3. No database schema changes
4. No breaking changes to existing functionality

---

## Notes

- This implementation keeps all logic in `App.tsx` to match current project structure
- Future refactoring may extract connection list into separate component
- Dropdown uses absolute positioning; future enhancement could use React Portal for better overflow handling
- Mission Control design system tokens used throughout (cyan accents, glass morphism, consistent spacing/shadows)
