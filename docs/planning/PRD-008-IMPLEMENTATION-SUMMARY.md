# PRD-008: PPK to PEM Converter Tool — Implementation Summary

**Status:** 🔵 PLANNED (awaiting implementation)  
**Created:** 2026-08-14  
**Full PRD:** `docs/planning/prd-008-ppk-to-pem-converter.md`

---

## Quick Reference

**What:** Add Tools menu with PPK Formatter to convert PuTTY .ppk keys to OpenSSH .pem format  
**Why:** Eliminate external tool dependency for users migrating from PuTTY/WinSCP  
**Scope:** Major feature — new menu system + converter tool + dialog component  
**Estimated effort:** 12-16 hours across 6 phases

---

## Implementation Phases

### Phase 1: Library Research & Backend Foundation ⏳
**Status:** Not started  
**Parallelizable:** Yes (parallel with Phase 3)

- [ ] Task 1.1: Add `github.com/ScaleFT/sshkeys` dependency
- [ ] Task 1.2: Create `internal/converter/ppk.go` with PPK parser helper
- [ ] Task 1.3: Write unit tests for PPK parsing

**Files:**
- `go.mod`, `go.sum`
- `internal/converter/ppk.go` (NEW)
- `internal/converter/ppk_test.go` (NEW)

---

### Phase 2: Backend API Integration ⏳
**Status:** Not started  
**Depends on:** Phase 1

- [ ] Task 2.1: Add `ConvertPPKToPEM` method to `app.go`
- [ ] Task 2.2: Add required imports and error handling
- [ ] Task 2.3: Create `internal/converter/pem.go` helper

**Files:**
- `app.go` (MODIFY: add new method)
- `internal/converter/pem.go` (NEW)

**API signature:**
```go
func (a *App) ConvertPPKToPEM(ppkPath, pemPath, passphrase string) error
```

---

### Phase 3: Frontend Dialog Component ⏳
**Status:** Not started  
**Parallelizable:** Yes (parallel with Phase 1-2)

- [ ] Task 3.1: Create `PPKConverterDialog.tsx` component
- [ ] Task 3.2: Create `PPKConverterDialog.module.css` with Mission Control styling
- [ ] Task 3.3: Add TypeScript types to `wails.d.ts`

**Files:**
- `frontend/src/components/PPKConverterDialog.tsx` (NEW)
- `frontend/src/components/PPKConverterDialog.module.css` (NEW)
- `frontend/src/types/wails.d.ts` (MODIFY)

**Component features:**
- Multi-step flow: select source → passphrase (if encrypted) → select destination → convert
- File pickers using `runtime.OpenFileDialog` and `runtime.SaveFileDialog`
- Error/success messaging
- Mission Control design (glass morphism, cyan accents)
- Keyboard accessible (Tab, Enter, Escape)

---

### Phase 4: Menu Integration ⏳
**Status:** Not started  
**Depends on:** Phase 3

- [ ] Task 4.1: Add "Tools" menu to menu bar
- [ ] Task 4.2: Add "PPK Formatter" menu item with Wrench icon
- [ ] Task 4.3: Render dialog and wire up state/handlers
- [ ] Task 4.4: Verify existing styles are sufficient (no new CSS needed)

**Files:**
- `frontend/src/components/App.tsx` (MODIFY: add menu + dialog)
- `frontend/src/components/App.module.css` (VERIFY only, likely no changes)

**State changes:**
- `openMenu` type: `'' | 'file' | 'tools' | 'help'` (add 'tools')
- New state: `showPPKConverter: boolean`
- New handler: `handlePPKFormatter()`

---

### Phase 5: Wails Binding & Testing ⏳
**Status:** Not started  
**Depends on:** Phase 2 + Phase 4

- [ ] Task 5.1: Run `wails generate module` to regenerate bindings
- [ ] Task 5.2: Verify TypeScript exports and run `tsc --noEmit`
- [ ] Task 5.3: Manual testing (6 test cases)
- [ ] Task 5.4: Integration tests with real PPK fixtures

**Test cases:**
1. Unencrypted PPK (RSA) → PEM ✅
2. Encrypted PPK (RSA) with correct passphrase → PEM ✅
3. Encrypted PPK with wrong passphrase → Error message ✅
4. Invalid file (not PPK format) → Error message ✅
5. Keyboard navigation (Tab, Enter, Escape) ✅
6. File picker cancellation (user clicks Cancel) ✅

**Files:**
- `frontend/wailsjs/go/main/App.js` (VERIFY: auto-generated)
- `internal/converter/integration_test.go` (NEW)

---

### Phase 6: Review & Documentation ⏳
**Status:** Not started  
**Depends on:** All implementation phases

- [ ] Task 6.1: Verify all acceptance criteria (11 items)
- [ ] Task 6.2: Security review (passphrase handling, file permissions)
- [ ] Task 6.3: Update `docs/planning/changelog.md`
- [ ] Task 6.4: Update `README.md` features section

---

## Agent Assignment

| Phase   | Primary Agent      | Can Split?                                           |
| ------- | ------------------ | ---------------------------------------------------- |
| Phase 1 | Backend Developer  | Yes (1.1 + 1.2 parallel, 1.3 sequential)             |
| Phase 2 | Backend Developer  | Atomic (single agent, sequential tasks)              |
| Phase 3 | Frontend Developer | Yes (3.1 TSX + 3.2 CSS parallel, 3.3 atomic)         |
| Phase 4 | Frontend Developer | Atomic (single file, sequential edits)               |
| Phase 5 | Backend Developer  | Partial (5.1-5.2 atomic, 5.3-5.4 can parallel)       |
| Phase 6 | Debugger/Reviewer  | No (review requires holistic understanding)          |

---

## File Manifest

### New Files (8)
```
internal/
  converter/
    ppk.go              # PPK parser using ScaleFT/sshkeys
    ppk_test.go         # Unit tests for PPK parsing
    pem.go              # PEM conversion helper
    integration_test.go # End-to-end conversion tests

frontend/src/components/
  PPKConverterDialog.tsx        # Converter UI component
  PPKConverterDialog.module.css # Mission Control styling
```

### Modified Files (5)
```
go.mod                          # Add github.com/ScaleFT/sshkeys
go.sum                          # Dependency checksums
app.go                          # Add ConvertPPKToPEM method
frontend/src/components/App.tsx # Add Tools menu + dialog rendering
frontend/src/types/wails.d.ts  # Add ConvertPPKToPEM type signature
```

### Auto-Generated (2)
```
frontend/wailsjs/go/main/App.js   # Wails binding (auto-updated)
frontend/wailsjs/go/main/App.d.ts # TypeScript declarations (auto-updated)
```

---

## Acceptance Criteria Checklist

- [ ] 1. "Tools" menu appears in menu bar (between File and Help)
- [ ] 2. "PPK Formatter" menu item appears under Tools menu
- [ ] 3. Clicking opens modal dialog
- [ ] 4. Dialog has source .ppk file selection
- [ ] 5. Dialog has destination .pem file selection
- [ ] 6. Dialog prompts for passphrase if PPK is encrypted
- [ ] 7. Conversion succeeds for unencrypted PPK files
- [ ] 8. Conversion succeeds for encrypted PPK with correct passphrase
- [ ] 9. Error shown for invalid PPK files
- [ ] 10. Error shown for wrong passphrase
- [ ] 11. Success message shown after conversion
- [ ] 12. Dialog follows Mission Control design system
- [ ] 13. Dialog is keyboard accessible

---

## Risks to Watch

1. **Library compatibility**: Test PPKv3 format early (Task 1.3)
2. **File permissions**: Verify .pem written with mode 0600 (Task 6.2)
3. **Passphrase errors**: Ensure clear error messages (Task 5.3, case #3)
4. **File validation**: Check PPK magic header before parsing (Task 2.1)

---

## Next Steps for Orchestrator

1. Route **Phase 1** to Backend Developer (can start immediately)
2. Route **Phase 3** to Frontend Developer (parallel with Phase 1)
3. After Phase 1+2 complete: Route **Phase 4** to Frontend Developer
4. After Phase 2+4 complete: Route **Phase 5** to Backend Developer
5. After all phases: Route **Phase 6** to Debugger/Reviewer

---

## Related Documents

- Full PRD: `docs/planning/prd-008-ppk-to-pem-converter.md`
- Changelog entry: `docs/planning/changelog.md` (line 11)
- Design system: `docs/DESIGN-SYSTEM.md` (Mission Control reference)
- Existing menu pattern: `frontend/src/components/App.tsx` lines 597-670
- Existing dialog pattern: `frontend/src/components/App.tsx` lines 1257-1288
