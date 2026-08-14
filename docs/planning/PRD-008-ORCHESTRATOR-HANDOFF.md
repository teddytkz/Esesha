# PRD-008: Orchestrator Handoff — PPK to PEM Converter Tool

**Date:** 2026-08-14  
**Status:** 🔵 READY FOR IMPLEMENTATION  
**Planner:** Complete ✅  
**Next:** Route to Orchestrator for agent assignment

---

## Executive Summary

**What:** Add Tools menu with PPK Formatter feature to convert PuTTY .ppk keys to OpenSSH .pem format  
**Why:** Eliminate external tool dependency (PuTTYgen) for Windows/PuTTY users  
**Scope:** Major feature (new menu + dialog + backend converter + tests)  
**Effort:** 12-16 hours across 6 phases  
**Risk:** Low (well-defined scope, proven library, isolated feature)

---

## Implementation Strategy

### Parallelization Opportunities

**Wave 1 (Parallel):**
- Phase 1: Backend Developer → Library + converter package
- Phase 3: Frontend Developer → Dialog component

**Wave 2 (Sequential):**
- Phase 2: Backend Developer → API integration (depends on Phase 1)
- Phase 4: Frontend Developer → Menu integration (depends on Phase 3)

**Wave 3 (Sequential):**
- Phase 5: Backend Developer → Bindings + testing (depends on Phase 2 + 4)

**Wave 4 (Final):**
- Phase 6: Debugger/Reviewer → Review + documentation (depends on all)

**Total agents needed:** 2-3 (Backend Developer, Frontend Developer, Debugger/Reviewer)

---

## Agent Routing Instructions

### 🔷 Wave 1: Start Immediately (Parallel)

**Agent:** Backend Developer  
**Task:** Phase 1 (Library Research & Backend Foundation)  
**Files:** `go.mod`, `internal/converter/ppk.go`, `internal/converter/ppk_test.go`  
**Instructions:**
1. Add dependency: `go get github.com/ScaleFT/sshkeys`
2. Create `internal/converter/ppk.go` with `ParsePPK(data []byte, passphrase string) (interface{}, error)`
3. Write unit tests for unencrypted PPK, encrypted PPK, invalid format, wrong passphrase
4. Run `go test ./internal/converter` → all tests must pass
5. Context: Full details in `docs/planning/prd-008-ppk-to-pem-converter.md` Phase 1
6. Checklist: Track progress in `docs/planning/PRD-008-CHECKLIST.md` Phase 1

**Agent:** Frontend Developer  
**Task:** Phase 3 (Frontend Dialog Component)  
**Files:** `frontend/src/components/PPKConverterDialog.tsx`, `PPKConverterDialog.module.css`, `frontend/src/types/wails.d.ts`  
**Instructions:**
1. Create dialog component with multi-step flow (select source → passphrase → select dest → convert)
2. Use Mission Control design system (glass morphism, cyan accents, `var(--accent-primary)`)
3. File pickers: `runtime.OpenFileDialog` (source .ppk) and `runtime.SaveFileDialog` (dest .pem)
4. State: step, ppkPath, pemPath, passphrase, isEncrypted, converting, error, success
5. Keyboard support: Tab, Enter, Escape
6. Context: Full details in `docs/planning/prd-008-ppk-to-pem-converter.md` Phase 3
7. Checklist: Track progress in `docs/planning/PRD-008-CHECKLIST.md` Phase 3
8. **Note:** Backend method `ConvertPPKToPEM` will be implemented in Phase 2 — for now, component can be built with placeholder/mock

---

### 🔷 Wave 2: After Wave 1 Complete (Sequential)

**Depends on:** Phase 1 complete ✅

**Agent:** Backend Developer  
**Task:** Phase 2 (Backend API Integration)  
**Files:** `app.go`, `internal/converter/pem.go`  
**Instructions:**
1. Add method to `app.go`: `func (a *App) ConvertPPKToPEM(ppkPath, pemPath, passphrase string) error`
2. Implementation: read PPK → call `converter.ParsePPK` → convert to PEM → write with mode 0600
3. Create `internal/converter/pem.go` with `ToPEM(key interface{}) ([]byte, error)` helper
4. Error handling: file not found, invalid format, wrong passphrase, unsupported key type
5. Run `go build ./...` → no errors
6. Context: Full details in `docs/planning/prd-008-ppk-to-pem-converter.md` Phase 2
7. Checklist: Track progress in `docs/planning/PRD-008-CHECKLIST.md` Phase 2

**Depends on:** Phase 3 complete ✅

**Agent:** Frontend Developer  
**Task:** Phase 4 (Menu Integration)  
**Files:** `frontend/src/components/App.tsx`, `frontend/src/components/App.module.css` (verify only)  
**Instructions:**
1. Add "Tools" menu to menu bar (after File, before Help)
2. Update `openMenu` type: `'' | 'file' | 'tools' | 'help'`
3. Add "PPK Formatter" menu item with `Wrench` icon (lucide-react)
4. Add state: `showPPKConverter: boolean`, handler: `handlePPKFormatter()`
5. Render `<PPKConverterDialog>` when `showPPKConverter` is true
6. Verify existing `.menuItem`, `.menuDropdown`, `.dropdownItem` styles work (no new CSS needed)
7. Run `npm run build` → no errors
8. Context: Full details in `docs/planning/prd-008-ppk-to-pem-converter.md` Phase 4
9. Checklist: Track progress in `docs/planning/PRD-008-CHECKLIST.md` Phase 4

---

### 🔷 Wave 3: After Wave 2 Complete (Sequential)

**Depends on:** Phase 2 + Phase 4 complete ✅

**Agent:** Backend Developer  
**Task:** Phase 5 (Wails Binding & Testing)  
**Files:** `frontend/wailsjs/*` (auto-generated), `internal/converter/integration_test.go`  
**Instructions:**
1. Run `wails generate module` to regenerate bindings
2. Verify `frontend/wailsjs/go/main/App.js` exports `ConvertPPKToPEM`
3. Run `tsc --noEmit` → 0 errors
4. Write integration tests in `integration_test.go` (full conversion flow, test fixtures)
5. Run `go test ./internal/converter` → all pass
6. Manual testing: 6 test cases (see Phase 5.3 in PRD)
7. Context: Full details in `docs/planning/prd-008-ppk-to-pem-converter.md` Phase 5
8. Checklist: Track progress in `docs/planning/PRD-008-CHECKLIST.md` Phase 5

---

### 🔷 Wave 4: After Wave 3 Complete (Final Review)

**Depends on:** All implementation phases complete ✅

**Agent:** Debugger/Reviewer  
**Task:** Phase 6 (Review & Documentation)  
**Files:** `docs/planning/changelog.md`, `README.md`, all implementation files (review)  
**Instructions:**
1. Verify all 13 acceptance criteria met (see PRD-008 Feature Specification)
2. Security review: passphrase handling, file permissions (mode 0600), no leaks
3. Run full manual test suite (6 test cases)
4. Update `changelog.md`: move PRD-008 from "Planned" to "Added", mark COMPLETE ✅
5. Update `README.md`: add PPK converter to features
6. Check for regressions in existing features
7. Context: Full details in `docs/planning/prd-008-ppk-to-pem-converter.md` Phase 6
8. Checklist: Track progress in `docs/planning/PRD-008-CHECKLIST.md` Phase 6

---

## File Manifest (Quick Reference)

### New Files (8)
```
internal/converter/
  ppk.go              # PPK parser (Phase 1)
  ppk_test.go         # Unit tests (Phase 1)
  pem.go              # PEM helper (Phase 2)
  integration_test.go # Integration tests (Phase 5)
  testdata/           # Test fixtures (Phase 5)

frontend/src/components/
  PPKConverterDialog.tsx        # Dialog UI (Phase 3)
  PPKConverterDialog.module.css # Styles (Phase 3)
```

### Modified Files (5)
```
go.mod                          # Add dependency (Phase 1)
go.sum                          # Checksums (Phase 1)
app.go                          # Add ConvertPPKToPEM method (Phase 2)
frontend/src/components/App.tsx # Add menu + dialog (Phase 4)
frontend/src/types/wails.d.ts   # Add type signature (Phase 3)
```

### Auto-Generated (2)
```
frontend/wailsjs/go/main/App.js   # Binding (Phase 5)
frontend/wailsjs/go/main/App.d.ts # Types (Phase 5)
```

---

## Acceptance Criteria (13 Items)

Must verify ALL before marking complete:

1. ✅ "Tools" menu appears in menu bar (between File and Help)
2. ✅ "PPK Formatter" menu item appears under Tools
3. ✅ Clicking opens modal dialog
4. ✅ Dialog has source .ppk file selection
5. ✅ Dialog has destination .pem file selection
6. ✅ Dialog prompts for passphrase if PPK is encrypted
7. ✅ Conversion succeeds for unencrypted PPK files
8. ✅ Conversion succeeds for encrypted PPK with correct passphrase
9. ✅ Error shown for invalid PPK files
10. ✅ Error shown for wrong passphrase
11. ✅ Success message shown after conversion
12. ✅ Dialog follows Mission Control design system
13. ✅ Dialog is keyboard accessible (Tab, Enter, Escape)

---

## Risk Mitigation Reminders

1. **Library compatibility**: Test PPKv3 format in Phase 1 unit tests
2. **File permissions**: Explicitly set mode 0600 in Phase 2 when writing .pem
3. **Passphrase errors**: Clear error message "Incorrect passphrase or corrupted key file" in Phase 2
4. **File validation**: Check PPK magic header `PuTTY-User-Key-File-` before parsing in Phase 2

---

## Context Documents

- **Full PRD:** `docs/planning/prd-008-ppk-to-pem-converter.md` (11 pages, complete technical spec)
- **Implementation Summary:** `docs/planning/PRD-008-IMPLEMENTATION-SUMMARY.md` (quick reference)
- **Checklist:** `docs/planning/PRD-008-CHECKLIST.md` (94 tasks, track progress)
- **Changelog:** `docs/planning/changelog.md` (PRD-008 entry line 11)
- **Design System:** `docs/DESIGN-SYSTEM.md` (Mission Control reference)
- **Existing Menu Pattern:** `frontend/src/components/App.tsx` lines 597-670
- **Existing Dialog Pattern:** `frontend/src/components/App.tsx` lines 1257-1288

---

## Orchestrator: Next Actions

1. **Create sub-agents for Wave 1:**
   - Sub-agent A: Backend Developer → Phase 1
   - Sub-agent B: Frontend Developer → Phase 3
   - Both can run in parallel

2. **Monitor Wave 1 completion:**
   - When both Phase 1 and Phase 3 complete → trigger Wave 2

3. **Create sub-agents for Wave 2:**
   - Sub-agent A: Backend Developer → Phase 2 (depends on Phase 1)
   - Sub-agent B: Frontend Developer → Phase 4 (depends on Phase 3)
   - Both can run in parallel

4. **Monitor Wave 2 completion:**
   - When both Phase 2 and Phase 4 complete → trigger Wave 3

5. **Create sub-agent for Wave 3:**
   - Sub-agent A: Backend Developer → Phase 5 (depends on Phase 2 + Phase 4)

6. **Monitor Wave 3 completion:**
   - When Phase 5 complete → trigger Wave 4

7. **Create sub-agent for Wave 4:**
   - Sub-agent: Debugger/Reviewer → Phase 6 (final review)

8. **Final verification:**
   - All 13 acceptance criteria met
   - All 94 checklist items complete
   - No regressions
   - Mark PRD-008 COMPLETE ✅

---

## Estimated Timeline

- **Wave 1:** 4-6 hours (parallel)
- **Wave 2:** 3-4 hours (parallel)
- **Wave 3:** 3-4 hours (sequential)
- **Wave 4:** 2-3 hours (review)
- **Total:** 12-17 hours

---

## Success Criteria

✅ All phases complete  
✅ All tests passing (unit + integration)  
✅ All acceptance criteria met  
✅ Security review passed  
✅ Documentation updated  
✅ No regressions in existing features  
✅ User can convert .ppk to .pem without external tools

---

**Status:** 🟢 READY FOR ORCHESTRATOR  
**Planner Sign-Off:** Complete ✅ — All planning documents created, routing instructions clear  
**Next:** Orchestrator → Create sub-agents for Wave 1 (Phase 1 + Phase 3 parallel)
