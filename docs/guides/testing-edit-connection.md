# Testing Guide: Edit Connection Feature

**Last updated:** 2026-08-07

Manual test cases for the kebab menu and Edit Connection feature.

---

## Test Environment Setup

**Prerequisites:**
- Built executable: `build\bin\esesha.exe`
- At least 2 saved connections (different auth types)
- Test SSH server accessible (optional for full end-to-end)

**Test data:**
```
Connection 1: "Test Server" (password auth)
- Host: 192.168.1.10
- Port: 22
- Username: testuser
- Password: test123

Connection 2: "Key Server" (private key auth)
- Host: 10.0.0.5
- Port: 2222
- Username: developer
- Private Key: C:\Users\user\.ssh\id_rsa
```

---

## Test Cases

### TC-001: Kebab Menu Visibility

**Objective:** Verify kebab menu button appears on hover

**Steps:**
1. Launch application
2. Hover mouse over first connection item
3. Move mouse away from connection item
4. Hover over second connection item

**Expected:**
- Kebab button (⋮) appears on right side when hovering
- Kebab button disappears when mouse leaves connection item
- Only one kebab button visible at a time (not all connections)
- Button has cyan tint on hover

**Status:** ☐ Pass ☐ Fail

---

### TC-002: Dropdown Menu Open/Close

**Objective:** Verify dropdown menu opens and closes correctly

**Steps:**
1. Hover over connection item
2. Click kebab button
3. Verify dropdown appears
4. Click kebab button again
5. Verify dropdown closes
6. Click kebab button on different connection
7. Click anywhere outside dropdown

**Expected:**
- Dropdown opens below kebab button
- Dropdown has glass morphism effect (blurred background, cyan border)
- "Edit Connection" option visible with edit icon
- Clicking kebab button toggles dropdown (open ↔ close)
- Opening another connection's menu closes the first
- Clicking outside dropdown closes it
- Clicking inside dropdown does not close it

**Status:** ☐ Pass ☐ Fail

---

### TC-003: Edit Modal Pre-fill (Password Auth)

**Objective:** Verify edit modal opens with correct pre-filled data for password auth connection

**Steps:**
1. Click kebab menu on password auth connection
2. Click "Edit Connection"
3. Verify all fields in modal

**Expected:**
- Modal title: "Edit SSH Connection"
- Connection Name field: pre-filled with "Test Server"
- Host field: "192.168.1.10"
- Port field: "22"
- Username field: "testuser"
- Auth toggle: "Password" selected (cyan background)
- Password field: **empty** (placeholder: "Leave empty to keep current password")
- Private Key Path field: hidden
- Modal has cyan accent bar at top
- Close button (X) visible in top-right

**Status:** ☐ Pass ☐ Fail

---

### TC-004: Edit Modal Pre-fill (Private Key Auth)

**Objective:** Verify edit modal opens with correct pre-filled data for private key auth connection

**Steps:**
1. Click kebab menu on private key auth connection
2. Click "Edit Connection"
3. Verify all fields in modal

**Expected:**
- Connection Name: "Key Server"
- Host: "10.0.0.5"
- Port: "2222"
- Username: "developer"
- Auth toggle: "Private Key" selected (cyan background)
- Password field: hidden
- Private Key Path field: "C:\Users\user\.ssh\id_rsa"
- Browse button (folder icon) visible next to private key field

**Status:** ☐ Pass ☐ Fail

---

### TC-005: Field Editing

**Objective:** Verify all fields are editable

**Steps:**
1. Open edit modal for any connection
2. Modify Connection Name: "Updated Name"
3. Modify Host: "192.168.1.20"
4. Modify Port: "2222"
5. Modify Username: "newuser"
6. Enter new password: "newpass123"

**Expected:**
- All fields accept input
- Text fields update as you type
- Port field accepts only numbers
- No validation errors during editing

**Status:** ☐ Pass ☐ Fail

---

### TC-006: Auth Type Toggle (Password → Private Key)

**Objective:** Verify switching from password to private key auth clears password field

**Steps:**
1. Open edit modal for password auth connection
2. Enter new password: "test123"
3. Click "Private Key" auth toggle button
4. Verify password field is hidden
5. Verify private key path field appears (empty)
6. Click "Password" toggle again

**Expected:**
- Password field hides when switching to private key
- Private key field appears with browse button
- Switching back to password shows empty password field (previously entered value was cleared)
- Auth toggle buttons have visual feedback (cyan background on active)

**Status:** ☐ Pass ☐ Fail

---

### TC-007: Auth Type Toggle (Private Key → Password)

**Objective:** Verify switching from private key to password auth clears private key field

**Steps:**
1. Open edit modal for private key auth connection (has pre-filled path)
2. Click "Password" auth toggle button
3. Verify private key field is hidden
4. Verify password field appears (empty with placeholder)
5. Click "Private Key" toggle again

**Expected:**
- Private key field hides when switching to password
- Password field appears
- Switching back to private key shows empty private key field (previously filled path was cleared)

**Status:** ☐ Pass ☐ Fail

---

### TC-008: Save Without Password Change

**Objective:** Verify leaving password empty keeps current password

**Steps:**
1. Open edit modal for password auth connection
2. Modify only the Connection Name: "Renamed Server"
3. Leave password field empty (do not enter anything)
4. Click "Save Changes"
5. Close application and relaunch
6. Try to connect to the renamed connection

**Expected:**
- No validation error when password is empty
- Connection saves successfully
- Status text updates: "Updated Renamed Server"
- Modal closes
- Connection list shows "Renamed Server"
- After relaunch, connection still works with old password (password was preserved)

**Status:** ☐ Pass ☐ Fail

---

### TC-009: Save With New Password

**Objective:** Verify entering new password updates it

**Steps:**
1. Open edit modal for password auth connection
2. Enter new password: "newpassword456"
3. Click "Save Changes"
4. Try to connect with old password (should fail)
5. Try to connect with new password (should succeed)

**Expected:**
- Connection saves successfully
- Old password no longer works
- New password works for SSH connection

**Status:** ☐ Pass ☐ Fail

---

### TC-010: Validation Errors

**Objective:** Verify required field validation

**Steps:**
1. Open edit modal
2. Clear Connection Name field
3. Click "Save Changes"
4. Verify error message
5. Fill Connection Name
6. Clear Host field
7. Click "Save Changes"
8. Verify error message
9. Fill Host
10. Clear Username field
11. Click "Save Changes"

**Expected:**
- Error message displays: "Name, Host, and Username are required"
- Error message styled with red background (Mission Control error state)
- Modal remains open
- No backend API call made

**Status:** ☐ Pass ☐ Fail

---

### TC-011: Modal Close Actions

**Objective:** Verify all ways to close modal work correctly

**Steps:**
1. Open edit modal
2. Click "Cancel" button → verify modal closes
3. Open edit modal again
4. Click X button in top-right → verify modal closes
5. Open edit modal again
6. Press Escape key → verify modal closes
7. Open edit modal again
8. Click on overlay (dark area outside modal) → verify modal closes

**Expected:**
- All four methods close the modal
- No validation errors on cancel
- No API call on cancel
- Connection list unchanged after cancel
- Form state resets (opening modal again shows original data)

**Status:** ☐ Pass ☐ Fail

---

### TC-012: Event Propagation

**Objective:** Verify clicking kebab button doesn't select connection

**Steps:**
1. Click on connection item text (not kebab button)
2. Verify connection opens (terminal tab appears)
3. Close the session tab
4. Click kebab button on same connection
5. Verify dropdown opens
6. Verify connection does NOT open (no new session tab)

**Expected:**
- Clicking connection text opens connection (normal behavior)
- Clicking kebab button only opens dropdown menu
- No new session tab created when clicking kebab button

**Status:** ☐ Pass ☐ Fail

---

### TC-013: Multiple Connections Edit

**Objective:** Verify editing one connection doesn't affect others

**Steps:**
1. Note current connection list (names, hosts, usernames)
2. Edit first connection, change name to "Updated 1"
3. Save
4. Edit second connection, change name to "Updated 2"
5. Save
6. Verify connection list

**Expected:**
- First connection name: "Updated 1", other fields unchanged
- Second connection name: "Updated 2", other fields unchanged
- All other connections unchanged
- No data corruption or field mixing between connections

**Status:** ☐ Pass ☐ Fail

---

### TC-014: Keyboard Navigation

**Objective:** Verify keyboard accessibility

**Steps:**
1. Use Tab key to navigate to connection item
2. Tab to kebab button
3. Press Enter to open dropdown
4. Tab to "Edit Connection" menu item
5. Press Enter to open modal
6. Tab through all form fields
7. Press Escape to close modal
8. Repeat, use Shift+Tab to navigate backwards

**Expected:**
- All interactive elements receive focus with visible outline (cyan border)
- Tab order logical: kebab button → dropdown item → modal fields → buttons
- Enter key activates buttons
- Escape key closes dropdown/modal
- Focus trap: Tab within modal (doesn't escape to background)
- No focus on decorative icons (aria-hidden)

**Status:** ☐ Pass ☐ Fail

---

### TC-015: File Picker Integration

**Objective:** Verify private key file picker works

**Steps:**
1. Open edit modal
2. Switch to "Private Key" auth
3. Click browse button (folder icon)
4. Select a private key file from file picker dialog
5. Verify file path appears in text field
6. Click browse button again
7. Click "Cancel" in file picker dialog

**Expected:**
- Native Windows file picker opens
- File filters: "Private Keys (*.pem, *.key)", "All Files (*)"
- Selecting file populates text field with full path
- Canceling file picker leaves field unchanged
- File path text field still editable (can type path manually)

**Status:** ☐ Pass ☐ Fail

---

### TC-016: Reduced Motion

**Objective:** Verify feature works with OS reduced motion setting

**Steps:**
1. Enable Windows reduced motion: Settings → Accessibility → Visual effects → Animation effects OFF
2. Launch application
3. Perform all interactions (hover kebab, open dropdown, open modal)

**Expected:**
- Kebab button still appears on hover (no fade transition)
- Dropdown opens/closes without animation
- Modal opens/closes without animation
- All functionality works identically
- No jarring visual jumps (static states still look intentional)

**Status:** ☐ Pass ☐ Fail

---

## Regression Tests

### RT-001: Add Connection Still Works

**Steps:**
1. Click "Add" button in sidebar header
2. Fill out Add Connection form
3. Save
4. Verify new connection appears in list

**Expected:**
- Add Connection modal still functions correctly
- No interference from Edit Connection feature

**Status:** ☐ Pass ☐ Fail

---

### RT-002: Connection Selection Unchanged

**Steps:**
1. Click on connection item (not kebab button)
2. Verify terminal opens
3. Verify connection succeeds

**Expected:**
- Connection selection behavior unchanged
- Terminal still receives focus after connection
- No performance regression

**Status:** ☐ Pass ☐ Fail

---

## Edge Cases

### EC-001: Editing While Connected

**Steps:**
1. Connect to a server (terminal open)
2. Edit that connection's details
3. Save changes
4. Verify existing session still works

**Expected:**
- Active session unaffected by edit
- New connection details saved
- Next connection uses new details

**Status:** ☐ Pass ☐ Fail

---

### EC-002: Special Characters in Fields

**Steps:**
1. Open edit modal
2. Enter special characters in name: `Test & "Server" <1>`
3. Enter IPv6 address in host: `2001:db8::1`
4. Save

**Expected:**
- Special characters saved correctly
- No encoding issues
- Connection list displays correctly

**Status:** ☐ Pass ☐ Fail

---

### EC-003: Long Field Values

**Steps:**
1. Enter very long connection name (200 chars)
2. Enter very long username (100 chars)
3. Enter very long host (100 chars)
4. Save

**Expected:**
- Fields accept long values
- Connection item text truncates with ellipsis in sidebar
- Full values visible in edit modal
- No layout breakage

**Status:** ☐ Pass ☐ Fail

---

## Performance Tests

### PT-001: Many Connections

**Steps:**
1. Create 50 connections
2. Scroll through connection list
3. Open kebab menu on connection near bottom
4. Edit and save

**Expected:**
- No lag when scrolling
- Kebab button appears instantly on hover
- Dropdown opens without delay
- Save operation completes within 500ms

**Status:** ☐ Pass ☐ Fail

---

## Test Summary Template

```
Test Date: 2026-08-07
Tester: [Name]
Build: esesha.exe [version/commit hash]
OS: Windows [version]

Total Cases: 19 core + 4 regression + 3 edge + 1 performance = 27
Passed: __/27
Failed: __/27
Blocked: __/27

Critical Issues:
- [Issue description]

Non-Critical Issues:
- [Issue description]

Notes:
- [Additional observations]
```
