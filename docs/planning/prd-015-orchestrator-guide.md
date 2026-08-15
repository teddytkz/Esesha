# PRD-015 — Orchestrator Routing Guide

**PRD:** Project Cleanup and Optimization
**Priority:** MAJOR (addresses 10 Explorer audit issues)
**Type:** Non-functional maintenance
**Created:** 2026-08-15

---

## Executive Summary

Comprehensive cleanup addressing Explorer's 10 identified issues:
- **3 Critical:** Svelte template artifacts in React project, design system docs mismatch
- **4 High Priority:** Missing Wails config, build script safety, gitignore gaps, no PRD archive
- **3 Medium Priority:** Unmarked deprecated API, naming inconsistency, unclear artifact

**Impact:** Documentation trustworthiness, build reliability, developer experience
**Risk:** Low (no functional changes, all reversible)

---

## Parallelization Strategy

```
┌─────────────────────────────────────────────────────┐
│ Phase 1, 2, 3 → ALL PARALLEL (no file conflicts)   │
├─────────────────────────────────────────────────────┤
│ Phase 1: Critical docs (3 tasks)                    │
│ Phase 2: High priority config (4 tasks)             │
│ Phase 3: Medium maintenance (3 tasks)               │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Phase 4 → SEQUENTIAL (verification + documentation) │
│   4.1-4.3: Debugger/Reviewer                        │
│   4.4-4.5: Documentation                            │
└─────────────────────────────────────────────────────┘
```

**Optimization:** Run 10 implementation tasks in parallel across 2 agents, then verify sequentially.

---

## Agent Task Assignments

### Documentation Agent (6 tasks)

**Phase 1 — Critical Docs (parallel with Phase 2-3):**
1. `frontend/README.md` — Replace Svelte template with React + Vite + Wails overview
2. `frontend/src/vite-env.d.ts` — Remove Svelte type reference (line 1)
3. `docs/DESIGN-SYSTEM.md` — Sync color palette to match `global.css` actual values

**Phase 2 — Archive Structure (parallel with Phase 1, 3):**
4. `docs/planning/archive/` — Already created; move 5 files: prd-002, prd-006, prd-010, PRD-010-IMPLEMENTATION-SUMMARY, ROLLBACK-010-COMPLETE

**Phase 3 — Naming Consistency (parallel with Phase 1-2):**
5. Rename `PRD-012-*.md`, `PRD-013-*.md`, `PRD-014-*.md`, `PRD-015-*.md` to lowercase
6. Update all cross-references in `changelog.md`

**Phase 4 — Final Docs (after all implementation):**
7. Update `changelog.md` with PRD-015 completion entry
8. Update `prd-015-implementation-summary.md` with completion status

### Backend Developer Agent (4 tasks)

**Phase 2 — Config Fixes (parallel with Phase 1, 3):**
1. `wails.json` — Add `frontendDir`, `wailsjsdir` after line 7
2. `build.bat` — Add `setlocal enabledelayedexpansion` as line 2
3. `.gitignore` — Append `*.bak`, `*.md5`, `build/`, `frontend/dist/`

**Phase 3 — Code Documentation (parallel with Phase 1-2):**
4. `app.go` — Add deprecation comment above EditFile() (line 612)
5. `frontend/package.json.md5` — Investigate if Wails-generated; add to gitignore or document

### Debugger/Reviewer Agent (1 phase)

**Phase 4 — Verification (after all implementation):**
1. Verify all 12 acceptance criteria pass
2. Run `wails build` and verify success
3. Create test build artifacts, run `git status`, verify no untracked artifacts

---

## File Conflict Analysis

✅ **No conflicts — safe to parallelize Phase 1-3:**

| File | Modified By | Phase |
|------|-------------|-------|
| `frontend/README.md` | Documentation | 1 |
| `frontend/src/vite-env.d.ts` | Documentation | 1 |
| `docs/DESIGN-SYSTEM.md` | Documentation | 1 |
| `wails.json` | Backend Developer | 2 |
| `build.bat` | Backend Developer | 2 |
| `.gitignore` | Backend Developer | 2 |
| `docs/planning/archive/*` | Documentation | 2 |
| `app.go` | Backend Developer | 3 |
| `docs/planning/PRD-*.md` | Documentation | 3 |
| `frontend/package.json.md5` | Backend Developer | 3 |

**Changelog conflict:** Only touched in Phase 4 by Documentation agent (after all implementation complete).

---

## Critical Instructions for Agents

### Documentation Agent — Task 1.3 (Color Palette Sync)

**CRITICAL:** The DESIGN-SYSTEM.md currently documents the WRONG palette (space-navy + cyan from an old draft). The ACTUAL palette in `global.css` is slate grays + blue.

**Source of truth:** `frontend/src/styles/global.css` lines 28-67

**Example correction:**
```diff
- `--bg-primary` | `#0a0e1a` | App background — deep space navy
+ `--bg-primary` | `#0f172a` | App background — slate 900

- `--accent-primary` | `#22d3ee` | Cyan — primary actions
+ `--accent-primary` | `#3b82f6` | Blue 500 — primary actions
```

**Verify:** Every color token in DESIGN-SYSTEM.md must match global.css exactly. Copy-paste values, don't retype.

### Backend Developer — Task 2.1 (wails.json)

**Insert after line 7** (`"frontend:dev:serverUrl": "auto",`):

```json
  "frontendDir": "frontend",
  "wailsjsdir": "frontend/wailsjs",
```

**Critical:** Validate JSON syntax after edit. Use 2-space indent to match existing format.

### Backend Developer — Task 3.2 (package.json.md5)

**Investigation steps:**
1. Check if file contains hash: `954e0c485fac5e0822c5733fb66516ca`
2. Run `wails dev` — does it regenerate the file?
3. Check Wails v2 docs for `package.json.md5` purpose

**Decision:**
- If Wails auto-generates → add to `.gitignore`
- If manual integrity check → keep, add comment explaining

### Documentation Agent — Task 2.4 (Archive Move)

**Files to move to archive/ (5 files):**
1. `prd-002-binary-storage-and-backup.md`
2. `prd-006-true-binary-storage-encryption.md`
3. `prd-010-embedded-ssh-keys.md`
4. `PRD-010-IMPLEMENTATION-SUMMARY.md`
5. `ROLLBACK-010-COMPLETE.md`

**After move:** Update any changelog entries that reference these files to point to `archive/` location.

---

## Acceptance Criteria Quick Check

Run this checklist in Phase 4:

```powershell
# Critical fixes
Select-String -Path frontend/README.md -Pattern "Svelte" -Quiet  # Should be False
Select-String -Path frontend/src/vite-env.d.ts -Pattern "svelte" -Quiet  # Should be False
# Compare DESIGN-SYSTEM.md colors vs global.css manually

# High priority
Select-String -Path wails.json -Pattern "frontendDir" -Quiet  # Should be True
Select-String -Path build.bat -Pattern "enabledelayedexpansion" -Quiet  # Should be True
Select-String -Path .gitignore -Pattern "\.bak|\.md5|build/|frontend/dist" -Quiet  # Should be True
Test-Path docs/planning/archive/prd-002*.md  # Should be True

# Medium priority
Select-String -Path app.go -Pattern "Deprecated.*EditFile" -Quiet  # Should be True
Get-ChildItem docs/planning/PRD-*.md  # Should be empty or only PRD-015
# Check package.json.md5 documented or in gitignore

# Verification
wails build  # Should exit 0
git status  # Should show no untracked *.exe, *.bak after build
```

---

## Success Metrics

- ✅ All 12 acceptance criteria pass
- ✅ `wails build` exits code 0, no warnings
- ✅ `git status` clean after build (no untracked artifacts)
- ✅ All doc cross-references resolve
- ✅ Zero functional regressions

---

## References

- **Full PRD:** `docs/planning/prd-015-project-cleanup-optimization.md`
- **Implementation Summary:** `docs/planning/prd-015-implementation-summary.md`
- **Quick Checklist:** `docs/planning/prd-015-checklist.md`
- **Changelog Entry:** `docs/planning/changelog.md` (line 11)
- **Archive README:** `docs/planning/archive/README.md`

---

**Next Action:** Dispatch Phase 1-3 tasks to Documentation + Backend Developer agents in parallel.
