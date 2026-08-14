# PRD-010: Embedded SSH Keys - Planning Checklist

**Version:** v1.0.0  
**Date:** 2026-08-14  
**Status:** Planning Complete → Ready for Implementation  

---

## Pre-Implementation Verification

### Planning Documents
- [x] Full PRD created (`prd-010-embedded-ssh-keys.md`)
- [x] Implementation summary created (`PRD-010-IMPLEMENTATION-SUMMARY.md`)
- [x] Orchestrator handoff created (`PRD-010-ORCHESTRATOR-HANDOFF.md`)
- [x] Changelog updated (`changelog.md` - PRD-010 entry added)
- [x] Planning checklist created (this file)

### Architecture Review
- [x] Data model changes defined (`Connection.EmbeddedKeyID *string`)
- [x] API changes documented (new methods, updated signatures)
- [x] Encryption algorithm specified (AES-256-GCM, machine-bound key)
- [x] Build process integration designed (PowerShell script)
- [x] Frontend UI changes specified (auth type toggle, dropdown)

### Task Breakdown
- [x] All phases defined (6 phases total)
- [x] All tasks assigned to agents (5 agent types)
- [x] File assignments complete (8 new, 8+ modified)
- [x] Dependencies mapped (critical path identified)
- [x] Parallelization opportunities identified (Phase 4 with Phase 3)

### Security Review
- [x] Threat model documented (protected vs. NOT protected)
- [x] Security considerations detailed (machine-bound key trade-offs)
- [x] Security recommendations provided (personal use only)
- [x] Security audit plan defined (Phase 6, task 6.2)
- [x] Rollback strategy documented (15 min rollback time)

### Risk Assessment
- [x] 6 risks identified with mitigations
- [x] Rollback triggers defined
- [x] Backward compatibility strategy confirmed
- [x] Data migration plan (none needed - new field nullable)

---

## Phase 1: Build Infrastructure (4-6 hours)

### Task 1.1: PowerShell Build Script
- [ ] Create `scripts/build-keys.ps1`
- [ ] Parse `build-keys.json` (JSON array)
- [ ] Validate key file existence
- [ ] Check file permissions (warn if > 0600)
- [ ] Read Machine GUID from registry
- [ ] Derive machine key: `SHA256(GUID + "|" + exeDir)`
- [ ] Encrypt each key with AES-256-GCM
- [ ] Base64 encode ciphertext
- [ ] Generate `internal/keys/embedded.go` with Go syntax
- [ ] Handle errors gracefully (exit codes)
- [ ] Test script on Windows 10/11

### Task 1.2: Example Configuration File
- [ ] Create `build-keys.json.example`
- [ ] Document JSON schema (id, path, description)
- [ ] Provide 2-3 sample entries
- [ ] Include inline comments/documentation
- [ ] Show path variations (absolute, relative, env var)
- [ ] Git-track this file (NO real keys)

### Task 1.3: Git Exclusions
- [ ] Add `/internal/keys/embedded.go` to `.gitignore`
- [ ] Add `/build-keys.json` to `.gitignore`
- [ ] Verify exclusions work (test git status)
- [ ] Document why these files excluded

### Task 1.4: Build Process Integration
- [ ] Modify `build.bat`
- [ ] Add conditional check for `build-keys.json`
- [ ] Call `build-keys.ps1` if config exists
- [ ] Use template if config missing
- [ ] Handle build script failures
- [ ] Test both paths (with/without config)

### Task 1.5: Empty Template
- [ ] Create `internal/keys/embedded.go.template`
- [ ] Package declaration: `package keys`
- [ ] Empty `EmbeddedKeyMetadata` map
- [ ] Empty `EmbeddedKeys` map
- [ ] Ensure valid Go syntax
- [ ] Git-track this file

### Phase 1 Acceptance
- [ ] Build succeeds with `build-keys.json` (generates embedded.go)
- [ ] Build succeeds without `build-keys.json` (uses template)
- [ ] Generated `embedded.go` compiles (no syntax errors)
- [ ] Build fails if key file missing (clear error)
- [ ] `.gitignore` excludes sensitive files

---

## Phase 2: Backend Key Store (4-5 hours)

### Task 2.1: Key Retrieval Logic
- [ ] Create `internal/keys/store.go`
- [ ] Implement `GetEmbeddedKey(keyID, machineKey) ([]byte, error)`
- [ ] Lookup in `EmbeddedKeys` map
- [ ] Base64 decode encrypted string
- [ ] Decrypt with `decryptData()` (from crypto package)
- [ ] Return PEM bytes
- [ ] Implement `ListEmbeddedKeys() map[string]string`
- [ ] Helper: `availableKeyIDs() []string`
- [ ] Clear error messages

### Task 2.2: Unit Tests
- [ ] Create `internal/keys/store_test.go`
- [ ] Test: Valid key retrieval (mock data)
- [ ] Test: Missing key ID (error lists available)
- [ ] Test: Decryption failure (wrong key)
- [ ] Test: Empty store (ListEmbeddedKeys returns empty map)
- [ ] All tests pass

### Task 2.3: Crypto Refactoring
- [ ] Export `decryptData()` in `internal/db/crypto.go`
- [ ] Export `encryptData()` if needed
- [ ] Verify no breaking changes to existing callers
- [ ] Update import paths in `keys` package

### Task 2.4: Data Model Extension
- [ ] Add `EmbeddedKeyID *string` to `internal/models/connection.go`
- [ ] JSON tag: `json:"embeddedKeyID,omitempty"`
- [ ] Nullable pointer (optional field)
- [ ] Test serialization/deserialization

### Task 2.5: Validation Logic
- [ ] Modify `internal/db/store.go`
- [ ] Add validation in `CreateConnection()`:
  - Reject if both `embeddedKeyID` and `privateKeyPath` set
  - Allow both empty (password-only auth)
- [ ] Add validation in `UpdateConnection()` (same rules)
- [ ] Clear error messages
- [ ] Test edge cases

### Phase 2 Acceptance
- [ ] `GetEmbeddedKey()` decrypts keys correctly
- [ ] Missing key ID returns helpful error (lists available)
- [ ] Unit tests pass (3+ test cases)
- [ ] `Connection` model handles nullable field correctly
- [ ] Validation prevents mutual setting of both auth methods

---

## Phase 3: SSH Integration (3-4 hours)

### Task 3.1: SSH Client Modification
- [ ] Modify `internal/ssh/client.go`
- [ ] Update `NewClientWithKeyPassphraseAndHostKey()` signature
- [ ] Add parameters: `embeddedKeyID *string`, `machineKey []byte`
- [ ] Implement key loading logic:
  - Check `embeddedKeyID` first → call `GetEmbeddedKey()`
  - Else check `privateKeyPath` → `ioutil.ReadFile()`
  - Else error (no key specified)
- [ ] Parse key (existing logic unchanged)
- [ ] Error handling for both paths

### Task 3.2: Manager Integration
- [ ] Modify `internal/ssh/manager.go`
- [ ] Update `ConnectWithPassphrase()` to pass `embeddedKeyID`
- [ ] Derive machine key before client creation
- [ ] Pass machine key to client constructor

### Task 3.3: App Backend - Connection Flow
- [ ] Modify `app.go` - `ConnectSSHWithPassphrase()`
- [ ] Load connection by ID
- [ ] Extract `conn.EmbeddedKeyID`
- [ ] Pass to SSH manager

### Task 3.4: App Backend - List Keys
- [ ] Add method: `ListEmbeddedKeys() map[string]string`
- [ ] Call `keys.ListEmbeddedKeys()`
- [ ] Wails binding (exported method)

### Task 3.5: App Backend - CRUD Updates
- [ ] Modify `CreateConnection()` signature (add `embeddedKeyID` param)
- [ ] Modify `UpdateConnection()` signature (add `embeddedKeyID` param)
- [ ] Pass through to store methods
- [ ] Update Wails bindings

### Phase 3 Acceptance
- [ ] SSH client loads embedded key successfully
- [ ] Falls back to file-based key (backward compat verified)
- [ ] Passphrase dialog appears for encrypted embedded keys
- [ ] Connection established with embedded key (manual test)
- [ ] Error messages clear (missing ID, decryption failure)

---

## Phase 4: Frontend UI (3-4 hours)

### Task 4.1: Auth Type Toggle
- [ ] Modify `frontend/src/components/App.tsx`
- [ ] Add state: `embeddedKeys` (Record<string, string>)
- [ ] Load keys on mount: `ListEmbeddedKeys()`
- [ ] Add third radio button: "Embedded Key"
- [ ] Conditionally show (only if keys available)
- [ ] Update `authType` state management

### Task 4.2: Embedded Key Dropdown
- [ ] Add dropdown in conditional render
- [ ] Populate with `embeddedKeys` (id → description)
- [ ] Update `formData.embeddedKeyID` on change
- [ ] Default option: "-- Select Key --"
- [ ] Clear field when switching auth types

### Task 4.3: Styling
- [ ] Add styles to `App.module.css`
- [ ] Style `.embeddedKeySelect` (dropdown)
- [ ] Mission Control design (cyan accent, glass effect)
- [ ] Hover/focus states
- [ ] Responsive sizing

### Task 4.4: Type Definitions
- [ ] Modify `frontend/src/types/wails.d.ts`
- [ ] Add `ListEmbeddedKeys()` signature
- [ ] Update `CreateConnection()` signature (new param)
- [ ] Update `UpdateConnection()` signature (new param)
- [ ] Use `string | null` for `embeddedKeyID`

### Task 4.5: Wails Bindings
- [ ] Run `wails generate module`
- [ ] Verify `frontend/wailsjs/go/main/App.js` updated
- [ ] Verify `frontend/wailsjs/go/main/App.d.ts` updated
- [ ] Check TypeScript compilation (no errors)

### Phase 4 Acceptance
- [ ] "Embedded Key" radio visible only when keys exist
- [ ] Dropdown shows descriptions (not just IDs)
- [ ] Selection updates form state correctly
- [ ] Auth type toggle clears inactive fields
- [ ] Create/Edit submits correct `embeddedKeyID`
- [ ] TypeScript compiles without errors

---

## Phase 5: Testing & Documentation (4-5 hours)

### Task 5.1: Integration Tests
- [ ] Create test `build-keys.json` (2 dummy keys)
- [ ] Run full build process
- [ ] Verify `embedded.go` generated correctly
- [ ] Create connection with embedded key (UI)
- [ ] Connect and establish session
- [ ] Test passphrase-protected embedded key
- [ ] All tests pass

### Task 5.2: Build Script Edge Cases
- [ ] Test: Missing key file → build error
- [ ] Test: Invalid JSON → clear error message
- [ ] Test: Bad file permissions → warning shown
- [ ] Test: Empty array → template used
- [ ] Test: No config file → template used
- [ ] All edge cases handled gracefully

### Task 5.3: Manual Testing
- [ ] Build with 2 keys → both in dropdown
- [ ] Create connection with embedded key → connects
- [ ] Passphrase key → dialog appears
- [ ] Missing key ID → error clear
- [ ] Edit connection → switch file to embedded
- [ ] Backward compat → old file-based connections work

### Task 5.4: User Guide
- [ ] Create `docs/guides/embedded-ssh-keys.md`
- [ ] Section: Overview (what, why, when)
- [ ] Section: Configuration (`build-keys.json` format)
- [ ] Section: Build process (step-by-step)
- [ ] Section: Security considerations
- [ ] Section: Troubleshooting (common errors)
- [ ] Section: FAQ (embedded vs file-based)
- [ ] 1000+ words, clear examples

### Task 5.5: README Updates
- [ ] Update features list (mention embedded keys)
- [ ] Update build instructions (reference example config)
- [ ] Update security section (machine-bound trade-offs)
- [ ] Link to user guide

### Task 5.6: Changelog Update
- [ ] Update `docs/planning/changelog.md`
- [ ] Mark PRD-010 as COMPLETE
- [ ] Include summary (scope, files, security notes)
- [ ] Cross-reference user guide

### Phase 5 Acceptance
- [ ] All 6 manual tests pass
- [ ] Integration test passes (full flow)
- [ ] Build script edge cases handled
- [ ] User guide complete (5+ sections)
- [ ] README updated
- [ ] Changelog marked COMPLETE

---

## Phase 6: Review & Security Audit (2-3 hours)

### Task 6.1: Code Review
- [ ] Review encryption implementation
- [ ] Verify no plaintext keys in source
- [ ] Check error handling (all paths covered)
- [ ] Validate mutual exclusivity logic
- [ ] Review PowerShell script (injection vulnerabilities)
- [ ] Code review APPROVED

### Task 6.2: Security Audit
- [ ] Run `strings esesha.exe | grep -i "BEGIN RSA"` → no matches
- [ ] Hex dump: Check for PEM headers → encrypted
- [ ] Test decryption on different machine → fails
- [ ] Test with wrong exe path → fails
- [ ] Memory dump analysis (keys in RAM check)
- [ ] Security audit APPROVED

### Task 6.3: Acceptance Criteria Verification
- [ ] Go through full PRD acceptance criteria (20+ items)
- [ ] Check each checkbox in PRD
- [ ] Note any deviations
- [ ] All criteria met

### Task 6.4: Performance Test
- [ ] Measure embedded key load time
- [ ] Measure file-based key load time
- [ ] Compare (target: < 10ms overhead)
- [ ] Profile if needed
- [ ] Performance acceptable

### Phase 6 Acceptance
- [ ] No plaintext keys in binary (verified)
- [ ] Decryption fails on different machine (verified)
- [ ] Performance overhead < 10ms
- [ ] All PRD acceptance criteria met
- [ ] Code review APPROVED
- [ ] Security audit APPROVED

---

## Final Sign-Off

### Implementation Complete
- [ ] All 6 phases implemented
- [ ] All tasks completed (30+ tasks)
- [ ] All phase acceptance criteria met
- [ ] No regression in existing features

### Quality Gates
- [ ] Unit tests pass (10+ tests)
- [ ] Integration tests pass
- [ ] Manual tests pass (6 test cases)
- [ ] Code review APPROVED
- [ ] Security audit APPROVED
- [ ] Performance acceptable

### Documentation Complete
- [ ] Full PRD (`prd-010-embedded-ssh-keys.md`)
- [ ] Implementation summary (`PRD-010-IMPLEMENTATION-SUMMARY.md`)
- [ ] Orchestrator handoff (`PRD-010-ORCHESTRATOR-HANDOFF.md`)
- [ ] Planning checklist (this file) - all checked
- [ ] User guide (`docs/guides/embedded-ssh-keys.md`)
- [ ] README updated
- [ ] Changelog updated (COMPLETE status)

### Rollback Plan Verified
- [ ] Rollback strategy documented
- [ ] Rollback tested (dry run)
- [ ] Rollback time confirmed (< 15 min)
- [ ] No data loss confirmed

### Ready for Production
- [ ] Build succeeds with embedded keys
- [ ] Build succeeds without embedded keys
- [ ] Backward compatibility verified
- [ ] Security recommendations documented
- [ ] All stakeholders approved

---

## Post-Implementation Tasks

### After PRD-010 Complete
- [ ] Update repository memory (`/memories/repo/esesha-project-state.md`)
- [ ] Archive planning documents (keep in `docs/planning/`)
- [ ] Monitor for user feedback (first 2 weeks)
- [ ] Address any discovered issues (bug loop)

### Future Enhancements (Out of Scope)
- [ ] Hardware Security Module (HSM) integration
- [ ] SSH agent support (Pageant, ssh-agent)
- [ ] Key rotation without recompilation
- [ ] Cross-platform support (macOS, Linux)
- [ ] Runtime key injection (dynamic)

---

**Status:** Planning Complete ✅  
**Next Action:** Hand off to Orchestrator for agent assignment  
**Estimated Total Effort:** 20-27 hours (3-4 days single developer)  

---

**END OF CHECKLIST**
