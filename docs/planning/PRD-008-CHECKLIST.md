# PRD-008: PPK to PEM Converter Tool — Implementation Checklist

**Created:** 2026-08-14  
**Status:** 🔵 PLANNED  
**Full PRD:** `docs/planning/prd-008-ppk-to-pem-converter.md`

This checklist tracks implementation progress for PRD-008. Check off items as they are completed.

---

## Phase 1: Library Research & Backend Foundation ⏳

### Task 1.1: Add Dependency
- [ ] Run `go get github.com/ScaleFT/sshkeys`
- [ ] Verify `go.mod` contains `github.com/ScaleFT/sshkeys` entry
- [ ] Verify `go.sum` updated with checksums
- [ ] Run `go build ./...` to confirm no import errors

### Task 1.2: Create Converter Package
- [ ] Create directory `internal/converter/`
- [ ] Create file `internal/converter/ppk.go`
- [ ] Implement `ParsePPK(data []byte, passphrase string) (interface{}, error)` function
- [ ] Add imports: `github.com/ScaleFT/sshkeys`, `golang.org/x/crypto/ssh`
- [ ] Handle both encrypted and unencrypted PPK files
- [ ] Add error handling for invalid format, wrong passphrase

### Task 1.3: Write Unit Tests
- [ ] Create file `internal/converter/ppk_test.go`
- [ ] Create test fixtures directory `internal/converter/testdata/`
- [ ] Add test PPK files: unencrypted RSA, encrypted RSA, invalid file
- [ ] Test case: unencrypted PPK → successful parse
- [ ] Test case: encrypted PPK with correct passphrase → successful parse
- [ ] Test case: encrypted PPK with wrong passphrase → error
- [ ] Test case: invalid file (not PPK format) → error
- [ ] Test case: corrupted PPK file → error
- [ ] Run `go test ./internal/converter` → all tests pass

---

## Phase 2: Backend API Integration ⏳

### Task 2.1: Add ConvertPPKToPEM Method
- [ ] Open `app.go`
- [ ] Add method signature: `func (a *App) ConvertPPKToPEM(ppkPath, pemPath, passphrase string) error`
- [ ] Read PPK file using `os.ReadFile(ppkPath)`
- [ ] Call `converter.ParsePPK(data, passphrase)` to parse PPK
- [ ] Convert parsed key to PEM format
- [ ] Write PEM to file with mode 0600 (secure permissions)
- [ ] Return nil on success, descriptive error on failure

### Task 2.2: Add Imports and Error Handling
- [ ] Add import: `esesha/internal/converter`
- [ ] Add import: `encoding/pem`
- [ ] Add import: `golang.org/x/crypto/ssh`
- [ ] Implement user-friendly error messages:
  - [ ] "PPK file not found: %s"
  - [ ] "Invalid PPK file format"
  - [ ] "Incorrect passphrase or corrupted key file"
  - [ ] "Unsupported key type: %s"
  - [ ] "Failed to write PEM file: %s"

### Task 2.3: Create PEM Helper
- [ ] Create file `internal/converter/pem.go`
- [ ] Implement `ToPEM(key interface{}) ([]byte, error)` function
- [ ] Support RSA, ECDSA, Ed25519 key types
- [ ] Marshal key using `x509.MarshalPKCS1PrivateKey` (RSA) or `x509.MarshalECPrivateKey` (ECDSA)
- [ ] Encode as PEM block with appropriate type header
- [ ] Return PEM bytes
- [ ] Add unit tests in `pem_test.go`

### Phase 2 Verification
- [ ] Run `go build ./...` → no compilation errors
- [ ] Run `go test ./internal/converter` → all tests pass
- [ ] Manually test `ConvertPPKToPEM` with test files (if needed)

---

## Phase 3: Frontend Dialog Component ⏳

### Task 3.1: Create Dialog Component
- [ ] Create file `frontend/src/components/PPKConverterDialog.tsx`
- [ ] Import React hooks: `useState`, `useRef`, `useEffect`
- [ ] Import Wails runtime: `OpenFileDialog`, `SaveFileDialog`
- [ ] Import Wails binding: `ConvertPPKToPEM`
- [ ] Import lucide-react icons: `FileKey`, `ArrowRight`, `Check`, `X`, `Loader2`
- [ ] Define props interface: `{ onClose: () => void }`
- [ ] Add state:
  - [ ] `step: 1 | 2 | 3` (current step)
  - [ ] `ppkPath: string` (source file path)
  - [ ] `pemPath: string` (destination file path)
  - [ ] `passphrase: string` (for encrypted keys)
  - [ ] `isEncrypted: boolean` (detected from file)
  - [ ] `converting: boolean` (loading state)
  - [ ] `error: string` (error message)
  - [ ] `success: boolean` (conversion succeeded)
- [ ] Implement handlers:
  - [ ] `handleSelectPPK()` → open file dialog, detect encryption
  - [ ] `handleSelectPEM()` → save file dialog
  - [ ] `handleConvert()` → call ConvertPPKToPEM, handle result
  - [ ] `handleClose()` → reset state, call onClose prop
- [ ] Render multi-step UI:
  - [ ] Step 1: Select PPK file button
  - [ ] Step 2 (conditional): Passphrase input (if encrypted)
  - [ ] Step 3: Select output PEM location button
  - [ ] Convert button (enabled when ready)
  - [ ] Progress spinner (during conversion)
  - [ ] Success/error message
- [ ] Keyboard support:
  - [ ] Escape key → close dialog
  - [ ] Enter key → proceed to next step / convert
- [ ] Add ref for focus management

### Task 3.2: Create Component Styles
- [ ] Create file `frontend/src/components/PPKConverterDialog.module.css`
- [ ] Add `.overlay` class (glass morphism backdrop)
- [ ] Add `.dialog` class (centered modal, Mission Control styling)
- [ ] Add `.header` class (title + close button)
- [ ] Add `.content` class (dialog body)
- [ ] Add `.stepIndicator` class (1/2 or 1/3 progress)
- [ ] Add `.fileSection` class (file picker area)
- [ ] Add `.passphraseInput` class (password field)
- [ ] Add `.actions` class (button group)
- [ ] Add `.btnPrimary` class (cyan button)
- [ ] Add `.btnSecondary` class (glass button)
- [ ] Add `.error` class (red text, var(--status-error))
- [ ] Add `.success` class (cyan text, var(--accent-primary))
- [ ] Add `.spinner` class (loading animation)
- [ ] Add reduced-motion fallbacks
- [ ] Verify responsive layout (mobile/tablet/desktop)

### Task 3.3: Add TypeScript Types
- [ ] Open `frontend/src/types/wails.d.ts`
- [ ] Add export: `export function ConvertPPKToPEM(ppkPath: string, pemPath: string, passphrase: string): Promise<void>;`
- [ ] Run `tsc --noEmit` → no type errors

### Phase 3 Verification
- [ ] Run `npm run build` → no compilation errors
- [ ] Visually inspect dialog in browser (placeholder rendering if backend not ready)

---

## Phase 4: Menu Integration ⏳

### Task 4.1: Add Tools Menu
- [ ] Open `frontend/src/components/App.tsx`
- [ ] Update `openMenu` type: `'' | 'file' | 'tools' | 'help'`
- [ ] Find menu bar JSX (around line 597)
- [ ] Add Tools menu button (after File, before Help):
  ```tsx
  <button
    className={`${styles.menuItem} ${openMenu === 'tools' ? styles.menuItemOpen : ''}`}
    onClick={() => toggleMenu('tools')}
    role="menuitem"
    aria-expanded={openMenu === 'tools'}
  >
    Tools
  </button>
  ```
- [ ] Add Tools dropdown:
  ```tsx
  {openMenu === 'tools' && (
    <div className={styles.menuDropdown} role="menu" aria-label="Tools menu">
      {/* Menu items here */}
    </div>
  )}
  ```

### Task 4.2: Add PPK Formatter Menu Item
- [ ] Import `Wrench` icon from lucide-react (or use `Settings` icon)
- [ ] Add menu item inside Tools dropdown:
  ```tsx
  <button type="button" className={styles.dropdownItem} role="menuitem" onClick={handlePPKFormatter}>
    <Wrench className={styles.dropdownIcon} size={16} />
    PPK Formatter
  </button>
  ```
- [ ] Add state: `const [showPPKConverter, setShowPPKConverter] = useState(false);`
- [ ] Add handler:
  ```tsx
  const handlePPKFormatter = () => {
    setShowPPKConverter(true);
    setOpenMenu('');
  };
  ```

### Task 4.3: Render Dialog
- [ ] Import `PPKConverterDialog` component
- [ ] Add conditional render (after About dialog, around line 1288):
  ```tsx
  {showPPKConverter && (
    <PPKConverterDialog onClose={() => setShowPPKConverter(false)} />
  )}
  ```
- [ ] Verify click-outside handler doesn't interfere (should be fine, dialog has own overlay)

### Task 4.4: Verify Existing Styles
- [ ] Check if `.menuItem`, `.menuDropdown`, `.dropdownItem`, `.dropdownIcon` exist in `App.module.css`
- [ ] If missing, add styles (copy from File/Help menu pattern)
- [ ] No new styles needed if existing classes cover Tools menu

### Phase 4 Verification
- [ ] Run `npm run build` → no compilation errors
- [ ] Visually verify "Tools" menu appears in menu bar
- [ ] Click Tools → "PPK Formatter" item appears
- [ ] Click PPK Formatter → dialog opens

---

## Phase 5: Wails Binding & Testing ⏳

### Task 5.1: Regenerate Wails Bindings
- [ ] Run `wails generate module` in terminal
- [ ] Verify output: "Generating bindings..."
- [ ] Check `frontend/wailsjs/go/main/App.js` contains `ConvertPPKToPEM` export
- [ ] Check `frontend/wailsjs/go/main/App.d.ts` contains `ConvertPPKToPEM` type signature

### Task 5.2: TypeScript Verification
- [ ] Run `tsc --noEmit` in `frontend/` directory
- [ ] Verify 0 errors
- [ ] If errors exist, fix type mismatches in PPKConverterDialog.tsx

### Task 5.3: Manual Testing
- [ ] Build app: `wails build`
- [ ] Run `build\bin\esesha.exe`
- [ ] **Test Case 1**: Unencrypted PPK → PEM
  - [ ] Click Tools > PPK Formatter
  - [ ] Select unencrypted .ppk file
  - [ ] Choose output location
  - [ ] Click Convert
  - [ ] Verify success message
  - [ ] Verify .pem file created and readable
- [ ] **Test Case 2**: Encrypted PPK with correct passphrase
  - [ ] Select encrypted .ppk file
  - [ ] Enter correct passphrase
  - [ ] Choose output location
  - [ ] Click Convert
  - [ ] Verify success message
- [ ] **Test Case 3**: Encrypted PPK with wrong passphrase
  - [ ] Select encrypted .ppk file
  - [ ] Enter wrong passphrase
  - [ ] Click Convert
  - [ ] Verify error message: "Incorrect passphrase or corrupted key file"
- [ ] **Test Case 4**: Invalid file (not PPK)
  - [ ] Select a .txt or random binary file
  - [ ] Click Convert
  - [ ] Verify error message: "Invalid PPK file format"
- [ ] **Test Case 5**: Keyboard navigation
  - [ ] Open dialog
  - [ ] Press Tab → focus moves between buttons/inputs
  - [ ] Press Escape → dialog closes
  - [ ] Press Enter on Convert button → starts conversion
- [ ] **Test Case 6**: File picker cancellation
  - [ ] Click "Select PPK File"
  - [ ] Click Cancel in file picker
  - [ ] Verify dialog remains open, no error shown

### Task 5.4: Integration Tests
- [ ] Create file `internal/converter/integration_test.go`
- [ ] Add test fixtures:
  - [ ] `testdata/rsa-unencrypted.ppk`
  - [ ] `testdata/rsa-encrypted.ppk` (with known passphrase)
  - [ ] `testdata/ecdsa-unencrypted.ppk`
  - [ ] `testdata/ed25519-unencrypted.ppk`
- [ ] Test full conversion flow: read PPK → parse → convert → write PEM → verify PEM readable
- [ ] Test PEM file permissions: verify mode is 0600
- [ ] Run `go test ./internal/converter -run Integration` → all pass

### Phase 5 Verification
- [ ] All manual tests pass ✅
- [ ] All automated tests pass ✅
- [ ] No compilation errors ✅
- [ ] No runtime errors ✅

---

## Phase 6: Review & Documentation ⏳

### Task 6.1: Acceptance Criteria Verification
- [ ] AC #1: "Tools" menu visible in menu bar ✅
- [ ] AC #2: "PPK Formatter" item under Tools ✅
- [ ] AC #3: Clicking opens modal dialog ✅
- [ ] AC #4: Source .ppk file selection works ✅
- [ ] AC #5: Destination .pem file selection works ✅
- [ ] AC #6: Passphrase prompt for encrypted files ✅
- [ ] AC #7: Unencrypted conversion succeeds ✅
- [ ] AC #8: Encrypted conversion with passphrase succeeds ✅
- [ ] AC #9: Error shown for invalid files ✅
- [ ] AC #10: Error shown for wrong passphrase ✅
- [ ] AC #11: Success message after conversion ✅
- [ ] AC #12: Mission Control design system followed ✅
- [ ] AC #13: Keyboard accessible (Tab, Enter, Escape) ✅

### Task 6.2: Security Review
- [ ] Verify passphrase not logged to console
- [ ] Verify passphrase not sent to any analytics/telemetry
- [ ] Verify .pem file written with mode 0600 (owner read/write only)
- [ ] Verify no passphrase stored in state after conversion
- [ ] Verify temp files cleaned up (if any created)
- [ ] Verify error messages don't leak sensitive info

### Task 6.3: Update Changelog
- [ ] Open `docs/planning/changelog.md`
- [ ] Move PRD-008 entry from "Planned" to "Added" section
- [ ] Update status to "COMPLETE ✅"
- [ ] Add implementation date: [2026-08-XX]
- [ ] Add file manifest (files created/modified)
- [ ] Add test results summary
- [ ] Add review status

### Task 6.4: Update README
- [ ] Open `README.md`
- [ ] Add "PPK to PEM Converter" to Features section
- [ ] Update supported key formats: "Supports .pem, .key, .ppk (converts to .pem), OpenSSH private keys"
- [ ] Consider adding screenshot (optional)

### Task 6.5: Create User Guide (Optional)
- [ ] Consider creating `docs/guides/ppk-converter.md` if feature needs detailed documentation
- [ ] Include: How to use, supported formats, troubleshooting common errors
- [ ] Add to `docs/README.md` index

### Phase 6 Verification
- [ ] All acceptance criteria met ✅
- [ ] Security review passed ✅
- [ ] Documentation updated ✅
- [ ] No regressions in existing features ✅

---

## Final Sign-Off

- [ ] **Backend Developer**: All backend tasks complete, tests pass
- [ ] **Frontend Developer**: All frontend tasks complete, UI verified
- [ ] **Debugger/Reviewer**: Manual testing complete, no critical bugs
- [ ] **Security Reviewer**: No security issues found
- [ ] **Documentation**: Changelog and README updated
- [ ] **Orchestrator**: PRD-008 marked COMPLETE, ready for production

---

## Notes / Blockers

(Add notes during implementation)

---

**Last Updated:** 2026-08-14  
**Checklist Completion:** 0 / 94 items (0%)
