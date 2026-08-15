# PRD-015: Project Cleanup and Optimization

**Version:** v1.0.0
**Status:** Draft
**Author:** Planner Agent
**Created:** 2026-08-15
**Updated:** 2026-08-15

---

## Overview

Comprehensive cleanup and optimization based on Explorer's health audit (89% score, 10 issues). This PRD addresses critical documentation mismatches, missing build configurations, and project hygiene issues while preserving intentionally deprecated code and research artifacts.

## Problem Statement

The Explorer audit identified 10 issues across critical, high, and medium priority tiers:
- **3 Critical:** Svelte template artifacts in React project, design system documentation mismatch
- **4 High:** Missing Wails config paths, build script robustness, gitignore gaps, no PRD archive structure
- **3 Medium:** Unmarked deprecated API, naming inconsistency, unclear artifact purpose

These issues impact developer experience, build reliability, and documentation trustworthiness.

## Goals

- Fix all 3 critical documentation/template mismatches
- Address all 4 high-priority configuration and process gaps
- Resolve 3 medium-priority maintenance issues
- Establish archive structure for superseded documentation
- Improve Wails production configuration
- Maintain 100% backward compatibility (no API/behavior changes)

## Non-Goals

- Removing intentionally deprecated `internal/editor` package (API compat preserved)
- Removing `poc/ppk-pure-go` research directory (historical artifact)
- Removing any active scripts or components
- Modifying any application logic or UI behavior

---

## Feature Specification

### User Stories

- As a developer, I want accurate documentation so I can trust the design system reference
- As a contributor, I want proper .gitignore patterns so I don't accidentally commit build artifacts
- As a build engineer, I want robust build scripts so edge cases don't cause silent failures
- As a maintainer, I want archived superseded PRDs so I can trace historical decisions without cluttering active docs

### Acceptance Criteria

**Critical Fixes (Must Pass):**
- [ ] `frontend/README.md` contains React + Vite documentation (no Svelte references)
- [ ] `frontend/src/vite-env.d.ts` references only React types (no Svelte types)
- [ ] `docs/DESIGN-SYSTEM.md` color palette matches `frontend/src/styles/global.css` exactly

**High Priority (Must Pass):**
- [ ] `wails.json` includes explicit `frontendDir`, `wailsjsdir`, and platform-specific build config
- [ ] `build.bat` uses `setlocal enabledelayedexpansion` for variable safety
- [ ] `.gitignore` includes `*.bak`, `*.md5`, `build/`, `frontend/dist/`
- [ ] `docs/planning/archive/` directory exists with superseded PRDs moved

**Medium Priority (Should Pass):**
- [ ] `app.go` EditFile() method has deprecation comment with alternative
- [ ] All PRD filenames use lowercase convention (`prd-NNN-*.md`)
- [ ] `package.json.md5` purpose documented or file removed

**Verification:**
- [ ] `wails build` succeeds without warnings
- [ ] No git status shows untracked build artifacts after build
- [ ] All doc cross-references resolve correctly

---

## Technical Design

### Architecture Overview

This is a **non-functional maintenance task** — no code logic changes, only:
1. Template artifact removal (Critical #1-2)
2. Documentation synchronization (Critical #3)
3. Configuration completeness (High #4-7)
4. Code documentation (Medium #8-10)

### Codebase Context

**From Explorer Report:**
- Project uses Wails v2 (Go backend + React frontend)
- Current palette: Professional Monochrome (slate grays + blue accents) — **NOT** Mission Control (space-navy + cyan/violet)
- Build artifacts: `build/bin/esesha.exe`, `esesha.bin.bak`, `frontend/dist/`, `package.json.md5`
- Active PRDs: 012, 013, 014 (implemented) — Superseded: 002, 006, 010 (need archiving)

**Verified as Intentional (Do NOT Remove):**
- `internal/editor/` package (deprecated but kept for API compatibility)
- `poc/ppk-pure-go/` directory (research artifact from PRD-009)
- All 16 lucide-react icons (verified in use)
- PRD pairs like `PRD-012-IMPLEMENTATION-SUMMARY.md` + `prd-012-upload-dialog.md` (distinct purposes)

### Data Model

N/A — No database changes

### API Changes

N/A — No API changes (EditFile() deprecation comment is non-breaking)

### UI Changes

N/A — No UI changes

---

## Implementation Plan

### Phase 1: Critical Documentation Fixes

**Depends on:** Nothing
**Parallelizable:** Yes — all 3 tasks are independent

| Task | Agent          | Files                                          | Description                                                                 |
| ---- | -------------- | ---------------------------------------------- | --------------------------------------------------------------------------- |
| 1.1  | Documentation  | `frontend/README.md`                           | Replace Svelte template content with React + Vite + Wails project overview |
| 1.2  | Documentation  | `frontend/src/vite-env.d.ts`                   | Remove `/// <reference types="svelte" />`, keep only `vite/client`         |
| 1.3  | Documentation  | `docs/DESIGN-SYSTEM.md`                        | Sync color palette section to match `global.css` actual values             |

**Sub-Agent Guidance:**
- Task 1.1: Include Wails-specific dev commands (`wails dev`, `wails build`), project structure, and link to main README
- Task 1.2: Single-line fix — remove line 1, keep line 2
- Task 1.3: Update color table in "Color Palette > Backgrounds/Borders/Text/Accents" sections — values must match `global.css` `:root` tokens exactly

### Phase 2: High Priority Configuration & Process

**Depends on:** Nothing (parallel with Phase 1)
**Parallelizable:** Yes — all 4 tasks are independent

| Task | Agent             | Files                       | Description                                                                                          |
| ---- | ----------------- | --------------------------- | ---------------------------------------------------------------------------------------------------- |
| 2.1  | Backend Developer | `wails.json`                | Add explicit `frontendDir: "frontend"`, `wailsjsdir: "frontend/wailsjs"`, and `windows/amd64` build |
| 2.2  | Backend Developer | `build.bat`                 | Add `setlocal enabledelayedexpansion` after `@echo off`                                              |
| 2.3  | Backend Developer | `.gitignore`                | Add `*.bak`, `*.md5`, `build/`, `frontend/dist/` patterns                                            |
| 2.4  | Documentation     | `docs/planning/archive/`    | Create archive dir, move superseded PRD-002, PRD-006, PRD-010 files                                  |

**Sub-Agent Guidance:**
- Task 2.1: Add after line 7 in `wails.json` — ensure valid JSON syntax, use 2-space indent
- Task 2.2: Insert `setlocal enabledelayedexpansion` as line 2 in `build.bat` (after `@echo off`)
- Task 2.3: Append to `.gitignore` — add comment `# Build artifacts and backups` before patterns
- Task 2.4: Move these files to archive:
  - `prd-002-binary-storage-and-backup.md` (superseded by PRD-006)
  - `prd-006-true-binary-storage-encryption.md` (superseded by PRD-007)
  - `prd-010-embedded-ssh-keys.md` (rolled back)
  - `PRD-010-IMPLEMENTATION-SUMMARY.md`
  - `ROLLBACK-010-COMPLETE.md`
  - Create `archive/README.md` explaining archive purpose

### Phase 3: Medium Priority Maintenance

**Depends on:** Nothing (parallel with Phase 1-2)
**Parallelizable:** Yes — all 3 tasks are independent

| Task | Agent             | Files                          | Description                                                              |
| ---- | ----------------- | ------------------------------ | ------------------------------------------------------------------------ |
| 3.1  | Backend Developer | `app.go`                       | Add deprecation comment to EditFile() method                             |
| 3.2  | Documentation     | `docs/planning/*.md`           | Rename `PRD-012-*.md` and `PRD-013-*.md` to lowercase `prd-0XX-*.md`    |
| 3.3  | Backend Developer | `frontend/package.json.md5`    | Document purpose in inline comment or remove if generated/not needed     |

**Sub-Agent Guidance:**
- Task 3.1: Add above line 612 in `app.go`:
  ```go
  // Deprecated: EditFile is kept for API compatibility but file editing via terminal
  // is the preferred workflow. The internal/editor package is deprecated.
  ```
- Task 3.2: Rename files:
  - `prd-012-implementation-summary.md` (renamed from `PRD-012-IMPLEMENTATION-SUMMARY.md`)
  - `prd-013-implementation-summary.md` (renamed from `PRD-013-IMPLEMENTATION-SUMMARY.md`)
  - `prd-014-implementation-summary.md` (renamed from `PRD-014-IMPLEMENTATION-SUMMARY.md`)
  - Update all cross-references in `changelog.md`
- Task 3.3: Check if `package.json.md5` is Wails-generated (compare with `wails dev` output) — if auto-generated, add to `.gitignore`; if manual, add comment explaining purpose

### Phase 4: Review & Documentation (Always Last)

**Depends on:** Phase 1, 2, 3 (all implementation phases)

| Task | Agent             | Description                                                                      |
| ---- | ----------------- | -------------------------------------------------------------------------------- |
| 4.1  | Debugger/Reviewer | Verify all 12 acceptance criteria pass                                           |
| 4.2  | Debugger/Reviewer | Run `wails build` and verify success                                             |
| 4.3  | Debugger/Reviewer | Create test build artifacts, run `git status`, verify no untracked artifacts     |
| 4.4  | Documentation     | Update `docs/planning/changelog.md` with PRD-015 entry                           |
| 4.5  | Documentation     | Create `docs/planning/prd-015-implementation-summary.md`                         |

---

## Risks & Mitigations

| Risk                                                     | Impact | Likelihood | Mitigation                                                                             |
| -------------------------------------------------------- | ------ | ---------- | -------------------------------------------------------------------------------------- |
| Breaking wails.json syntax causes build failure          | High   | Low        | Validate JSON syntax after edit; test `wails build` in Phase 4                        |
| Moving PRDs to archive breaks changelog cross-references | Medium | Medium     | Update all changelog links in same commit; verify in Phase 4                           |
| Renaming PRD files breaks external references            | Medium | Low        | Search all `.md` files for uppercase PRD references before rename                      |
| Removing package.json.md5 breaks Wails dev workflow      | Medium | Low        | Test `wails dev` after removal; restore if errors occur                               |
| Design system sync misses actual color values            | Low    | Low        | Use exact copy-paste from `global.css` `:root` section                                 |

## Rollback Strategy

All changes are non-functional (docs, config, comments). Rollback via:
1. `git revert <commit-hash>` for the PRD-015 implementation commit
2. Individual file restoration from git history if partial rollback needed
3. No database migrations or data changes to reverse

**Critical files with backup:**
- `wails.json` — commit before editing
- `.gitignore` — append-only, safe to revert individual lines
- `build.bat` — single-line addition, easy to remove

---

## Version History

| Version | Date       | Summary         |
| ------- | ---------- | --------------- |
| v1.0.0  | 2026-08-15 | Initial draft   |
