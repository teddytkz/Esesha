# Edit Connection Feature

**Last updated:** 2026-08-07

How to edit existing SSH connections using the kebab menu in the sidebar.

---

## User Guide

### Editing a Connection

1. **Locate the connection** in the sidebar connection list
2. **Hover over the connection item** — a three-dot menu button (⋮) appears on the right
3. **Click the kebab menu button** — a dropdown opens with "Edit Connection"
4. **Click "Edit Connection"** — the Edit Connection modal opens with pre-filled data
5. **Modify fields** as needed:
   - Connection Name
   - Host / Port
   - Username
   - Authentication type (Password / Private Key toggle)
   - Password (optional — leave blank to keep current password)
   - Private Key Path (with file picker)
6. **Click "Save Changes"** — the connection updates and the list refreshes
7. **Click "Cancel"** or press `Escape` to close without saving

### Authentication Type Switching

When you toggle between Password and Private Key authentication:
- **Switching to Password:** Private Key Path field clears
- **Switching to Private Key:** Password field clears

Only the active authentication field is saved to the backend.

### Password Update Behavior

The password field in the Edit Connection modal is **optional**:
- **Leave empty:** Keep the current saved password (no change)
- **Enter new password:** Update to the new password

This prevents accidental password removal and avoids displaying the decrypted password in the form.

---

## Developer Reference

### Implementation Overview

**Files modified:**
- `frontend/src/components/App.tsx` — kebab menu UI, edit modal, state management
- `frontend/src/components/App.module.css` — kebab button, dropdown, modal styles

**State variables:**
```typescript
const [openMenuId, setOpenMenuId] = useState<number | null>(null);
const [editingConnection, setEditingConnection] = useState<models.Connection | null>(null);
const [isEditModalOpen, setIsEditModalOpen] = useState(false);
const [editFormData, setEditFormData] = useState<NewConnection>({...});
const [editAuthType, setEditAuthType] = useState<'password' | 'key'>('password');
const [editFormError, setEditFormError] = useState('');
```

**Key functions:**
- `handleEditConnection(conn)` — Opens edit modal with pre-filled connection data
- `handleSaveEdit()` — Calls `UpdateConnection()` backend API, refreshes list
- `closeEditModal()` — Resets state, closes modal
- `selectEditPrivateKeyFile()` — File picker for private key path

### Backend API

**Go function:**
```go
UpdateConnection(id int, name, host string, port int, username, password, privateKeyPath string) error
```

**Behavior:**
- Empty `password` → keeps current encrypted password in storage
- Empty `privateKeyPath` → clears private key (password auth)
- Both fields empty → validation error (must have one auth method)

### UI Patterns

#### Kebab Menu Button

**Positioning:** Absolute within `.connectionItem` (positioned on right, vertically centered)
**Visibility:** Hidden by default, appears on hover or focus
**Event handling:** `onClick` has `e.stopPropagation()` to prevent connection selection

```tsx
<button
  type="button"
  className={styles.kebabButton}
  onClick={(e) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === conn.id ? null : conn.id);
  }}
  aria-label="Connection options"
>
  <MoreVertical size={16} />
</button>
```

#### Dropdown Menu

**Positioning:** Absolute, positioned below kebab button (`top: calc(100% + 4px)`)
**Styling:** Glass morphism (`backdrop-filter: blur(12px)`), cyan border + glow
**Close behavior:** Click outside handler using `useEffect` + ref pattern

```typescript
useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (openMenuIdRef.current === null) return;
    const target = e.target as Element;
    if (!target.closest(`.${styles.kebabDropdown}`) && 
        !target.closest(`.${styles.kebabButton}`)) {
      setOpenMenuId(null);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);
```

**Why ref pattern?** The click-outside handler needs the latest `openMenuId` but runs in a closure. Using `openMenuIdRef.current` (synced via a separate effect) avoids recreating the listener on every state change.

#### Edit Modal

**Structure:** Same as Add Connection modal (`.modalOverlay` + `.modalContent`)
**Pre-fill logic:**
```typescript
setEditFormData({
  name: conn.name,
  host: conn.host,
  port: conn.port,
  username: conn.username,
  password: '',  // Empty — only updates if user enters new value
  privateKeyPath: conn.privateKeyPath || ''
});
setEditAuthType(conn.privateKeyPath ? 'key' : 'password');
```

**Auth type toggle:**
```typescript
onClick={() => {
  setEditAuthType('password');
  setEditFormData({...editFormData, privateKeyPath: ''});  // Clear inactive field
}}
```

### Styling with Mission Control Design System

All styles follow the Mission Control design system tokens from `global.css`:

**Kebab button:**
- Background: `transparent` → `var(--bg-tertiary)` on hover
- Color: `var(--text-secondary)` → `var(--accent-primary)` on hover
- Opacity: `0` → `1` on connection item hover or button focus
- Border radius: `var(--radius-sm)`
- Transition: `var(--transition-fast)`

**Dropdown:**
- Background: `rgba(15, 21, 36, 0.85)` + `backdrop-filter: blur(12px)` (glass morphism)
- Border: `1px solid var(--accent-primary)` (cyan)
- Shadow: `var(--shadow-lg)` + cyan glow (`0 0 20px rgba(34, 211, 238, 0.3)`)
- Border radius: `var(--radius-md)`

**Dropdown items:**
- Hover background: `rgba(34, 211, 238, 0.1)` (cyan tint)
- Hover color: `var(--accent-primary)`
- Icon gap: `8px`

### Accessibility

- **Keyboard support:** `Tab` to kebab button, `Enter`/`Space` opens menu, `Escape` closes modal
- **ARIA labels:** `aria-label="Connection options"` on kebab button
- **Focus management:** `:focus-visible` outlines on kebab button and dropdown items
- **Reduced motion:** Kebab button opacity transition respects `prefers-reduced-motion`
- **Modal semantics:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby="edit-modal-title"`

### Testing Checklist

- [ ] Kebab button appears on hover over connection item
- [ ] Only one dropdown open at a time (opening another closes the first)
- [ ] Click outside dropdown closes it
- [ ] Clicking "Edit Connection" opens modal with correct pre-filled data
- [ ] All fields are editable (name, host, port, username, password, private key)
- [ ] Auth type toggle clears inactive field (password ↔ private key)
- [ ] Leaving password empty keeps current password (no error)
- [ ] Entering new password updates it
- [ ] Switching auth type clears the inactive field
- [ ] Validation errors display in modal (missing required fields)
- [ ] "Save Changes" updates connection and refreshes list
- [ ] Status text updates to "Updated {name}" after save
- [ ] Modal closes after successful save
- [ ] "Cancel" button closes modal without saving
- [ ] `Escape` key closes modal without saving
- [ ] Kebab button click doesn't trigger connection selection (event propagation stopped)
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Focus returns to kebab button after closing dropdown

---

## Related Documentation

- [UI Development Guide](ui-development.md) — Mission Control design system patterns
- [Design System](../design-system.md) — Complete token reference
- [Implementation Plan](../planning/implementation-001-edit-connection-kebab-menu.md) — Original implementation spec
- [Changelog](../planning/changelog.md) — Feature added under [Unreleased] → Added
