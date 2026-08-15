# PRD-015 Implementation Summary — Project Cleanup and Optimization

**Status:** Planned
**Created:** 2026-08-15
**PRD Reference:** `docs/planning/prd-015-project-cleanup-optimization.md`

## Overview

Comprehensive cleanup addressing 10 issues from Explorer audit (89% health score). Non-functional maintenance to fix critical documentation mismatches, missing configurations, and project hygiene issues.

**Scope:** MAJOR maintenance task — affects documentation accuracy, build reliability, and developer experience. No API or behavior changes.

## Implementation Plan Summary

### Phase 1: Critical Documentation Fixes (Parallel)

| Task | Files | Agent | Status |
|------|-------|-------|--------|
| 1.1 | `frontend/README.md` | Documentation | ⏳ Planned |
| 1.2 | `frontend/src/vite-env.d.ts` | Documentation | ⏳ Planned |
| 1.3 | `docs/DESIGN-SYSTEM.md` | Documentation | ⏳ Planned |

**Details:**
- **1.1:** Replace Svelte template content with React + Vite + Wails project overview (include `wails dev`, `wails build` commands)
- **1.2:** Remove `/// <reference types="svelte" />` (line 1), keep only `vite/client` reference
- **1.3:** Sync color palette tables to match `global.css` `:root` actual values (slate grays + blue accents, NOT space-navy + cyan/violet)

### Phase 2: High Priority Configuration & Process (Parallel)

| Task | Files | Agent | Status |
|------|-------|-------|--------|
| 2.1 | `wails.json` | Backend Developer | ⏳ Planned |
| 2.2 | `build.bat` | Backend Developer | ⏳ Planned |
| 2.3 | `.gitignore` | Backend Developer | ⏳ Planned |
| 2.4 | `docs/planning/archive/` | Documentation | ⏳ Planned |

**Details:**
- **2.1:** Add explicit `frontendDir: "frontend"`, `wailsjsdir: "frontend/wailsjs"`, and `windows/amd64` build config after line 7
- **2.2:** Add `setlocal enabledelayedexpansion` as line 2 (after `@echo off`) for variable safety
- **2.3:** Append patterns: `*.bak`, `*.md5`, `build/`, `frontend/dist/` with comment `# Build artifacts and backups`
- **2.4:** Create archive directory, move superseded PRDs (002, 006, 010), create `archive/README.md`

### Phase 3: Medium Priority Maintenance (Parallel)

| Task | Files | Agent | Status |
|------|-------|-------|--------|
| 3.1 | `app.go` | Backend Developer | ⏳ Planned |
| 3.2 | `docs/planning/PRD-01X-*.md` | Documentation | ⏳ Planned |
| 3.3 | `frontend/package.json.md5` | Backend Developer | ⏳ Planned |

**Details:**
- **3.1:** Add deprecation comment above `EditFile()` method (line 612) explaining API compat preservation
- **3.2:** Rename uppercase PRD files to lowercase: `PRD-012-*.md` → `prd-012-*.md`, update changelog cross-references
- **3.3:** Investigate if Wails-generated; if yes, add to `.gitignore`; if manual, document purpose inline

### Phase 4: Review & Documentation (Sequential, after 1-3)

| Task | Agent | Status |
|------|-------|--------|
| 4.1 | Debugger/Reviewer | ⏳ Planned |
| 4.2 | Debugger/Reviewer | ⏳ Planned |
| 4.3 | Debugger/Reviewer | ⏳ Planned |
| 4.4 | Documentation | ⏳ Planned |
| 4.5 | Documentation | ⏳ Planned |

**Details:**
- **4.1:** Verify all 12 acceptance criteria pass
- **4.2:** Run `wails build` and verify success without warnings
- **4.3:** Create test build artifacts, run `git status`, verify no untracked artifacts shown
- **4.4:** Update `docs/planning/changelog.md` with PRD-015 completion entry
- **4.5:** Update this file with completion status

## Files Modified (10 total)

### Critical Fixes (3 files)
1. `frontend/README.md` — Replace Svelte template with React + Wails docs
2. `frontend/src/vite-env.d.ts` — Remove Svelte type reference
3. `docs/DESIGN-SYSTEM.md` — Sync color palette to `global.css` values

### High Priority (4 items)
4. `wails.json` — Add explicit frontend paths and platform config
5. `build.bat` — Add `setlocal enabledelayedexpansion`
6. `.gitignore` — Add build artifact patterns
7. `docs/planning/archive/` — Create archive structure, move superseded PRDs

### Medium Priority (3 items)
8. `app.go` — Add deprecation comment to EditFile()
9. `docs/planning/PRD-*.md` — Rename to lowercase convention
10. `frontend/package.json.md5` — Document or remove

## Acceptance Criteria Checklist

### Critical (Must Pass)
- [ ] `frontend/README.md` contains React + Vite documentation (no Svelte references)
- [ ] `frontend/src/vite-env.d.ts` references only React types (no Svelte types)
- [ ] `docs/DESIGN-SYSTEM.md` color palette matches `frontend/src/styles/global.css` exactly

### High Priority (Must Pass)
- [ ] `wails.json` includes explicit `frontendDir`, `wailsjsdir`, and platform-specific build config
- [ ] `build.bat` uses `setlocal enabledelayedexpansion` for variable safety
- [ ] `.gitignore` includes `*.bak`, `*.md5`, `build/`, `frontend/dist/`
- [ ] `docs/planning/archive/` directory exists with superseded PRDs moved

### Medium Priority (Should Pass)
- [ ] `app.go` EditFile() method has deprecation comment with alternative
- [ ] All PRD filenames use lowercase convention (`prd-NNN-*.md`)
- [ ] `package.json.md5` purpose documented or file removed

### Verification (Must Pass)
- [ ] `wails build` succeeds without warnings
- [ ] No git status shows untracked build artifacts after build

## Intentionally Preserved (Do NOT Remove)

✅ **Verified as intentional by Explorer:**
- `internal/editor/` package — Deprecated but kept for API compatibility
- `poc/ppk-pure-go/` directory — Research artifact from PRD-009
- All scripts: `make-icons.ps1`, `verify-icon.ps1` — Active tools
- All 16 lucide-react icons — Verified in use
- PRD implementation summary pairs — Distinct from full PRDs

## Agent Routing

| Phase | Tasks | Agent(s) | Can Parallelize? |
|-------|-------|----------|------------------|
| 1 | Critical docs | Documentation | ✅ Yes (all 3 tasks) |
| 2 | High priority config | Backend Developer + Documentation | ✅ Yes (all 4 tasks) |
| 3 | Medium maintenance | Backend Developer + Documentation | ✅ Yes (all 3 tasks) |
| 4 | Review & docs | Debugger/Reviewer + Documentation | ❌ No (sequential) |

**Optimization:** Phase 1, 2, and 3 can run in parallel (no file conflicts). Phase 4 must wait for all implementation to complete.

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking wails.json syntax | Validate JSON after edit, test build in Phase 4 |
| Moving PRDs breaks changelog links | Update all changelog references in same commit |
| Renaming PRDs breaks external refs | Search all `.md` files for uppercase PRD refs before rename |
| Removing package.json.md5 breaks Wails | Test `wails dev` after removal; restore if errors |

## Success Metrics

- ✅ All 12 acceptance criteria pass
- ✅ `wails build` exits with code 0
- ✅ `git status` shows no untracked artifacts after build
- ✅ All documentation cross-references resolve
- ✅ No functional regressions (no API/behavior changes)

## Related Documentation

- **Full PRD:** `docs/planning/prd-015-project-cleanup-optimization.md`
- **Changelog entry:** `docs/planning/changelog.md` (2026-08-15)
- **Explorer audit:** Session memory `/memories/session/esesha-comprehensive-report.md`

---

**Next Steps for Orchestrator:**
1. Assign Phase 1 tasks (1.1-1.3) to Documentation agent — parallel execution
2. Assign Phase 2 tasks (2.1-2.3) to Backend Developer, (2.4) to Documentation — parallel execution
3. Assign Phase 3 tasks (3.1, 3.3) to Backend Developer, (3.2) to Documentation — parallel execution
4. Wait for Phase 1-3 completion
5. Assign Phase 4 tasks to Debugger/Reviewer (4.1-4.3) then Documentation (4.4-4.5) — sequential execution
