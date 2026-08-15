# PRD-015 Planning Complete ✅

**Date:** 2026-08-15
**Planner:** Planner Agent
**Status:** Ready for Implementation

---

## What Was Created

### Core Planning Documents (4 files)

1. **`prd-015-project-cleanup-optimization.md`** (Full PRD)
   - Complete specification with 4 implementation phases
   - All 10 issues documented with acceptance criteria
   - Risk analysis and rollback strategy
   - 267 lines, comprehensive reference

2. **`prd-015-implementation-summary.md`** (Quick Reference)
   - Phase-by-phase task breakdown with agent assignments
   - Checklist format for tracking progress
   - Parallel execution strategy
   - Files modified list

3. **`prd-015-checklist.md`** (Developer Quick Guide)
   - Simple checkbox list grouped by priority
   - Code snippets for critical fixes
   - Color palette reference for design system sync
   - "Do NOT remove" warnings

4. **`prd-015-orchestrator-guide.md`** (Agent Routing)
   - Parallelization strategy with visual diagram
   - File conflict analysis (none found - safe to parallelize)
   - Critical instructions for each agent
   - PowerShell verification commands

### Supporting Infrastructure (2 items)

5. **`docs/planning/archive/`** (Directory created)
   - Archive structure established for superseded PRDs
   - Ready to receive 5 files (PRD-002, 006, 010 + summaries)

6. **`archive/README.md`** (Archive Documentation)
   - Explains purpose of archive
   - Documents supersession relationships
   - Reference guide for historical PRDs

### Changelog Updated

7. **`changelog.md`** (Entry added)
   - PRD-015 entry in "Planned" section
   - All 10 issues summarized
   - Cross-references to planning docs

---

## Issues Addressed (from Explorer Audit)

### Critical (3) 🔴
- ✅ Svelte template in `frontend/README.md` (should be React)
- ✅ Svelte types in `vite-env.d.ts` (should be React only)
- ✅ Design system colors mismatch (docs show space-navy, code has slate grays)

### High Priority (4) 🟡
- ✅ Missing Wails config paths (`frontendDir`, `wailsjsdir`)
- ✅ Build script missing `setlocal enabledelayedexpansion`
- ✅ Gitignore gaps (no `*.bak`, `*.md5`, `build/`, `frontend/dist/`)
- ✅ No archive structure for superseded PRDs

### Medium Priority (3) 🟢
- ✅ Deprecated `EditFile()` API not marked as deprecated
- ✅ PRD naming inconsistency (uppercase vs lowercase)
- ✅ Unclear `package.json.md5` purpose

---

## Implementation Strategy

### Parallelization (Maximum Efficiency)

```
Phase 1 (Critical Docs)     ━━━━━━━━━━┓
Phase 2 (High Priority)     ━━━━━━━━━━╋━━━━━━━━━━> Phase 4 (Review)
Phase 3 (Medium Priority)   ━━━━━━━━━━┛

10 tasks in parallel → Sequential verification
```

**Estimated time:** 2-3 hours (parallel) vs 6-8 hours (sequential)

### Agent Distribution

- **Documentation Agent:** 6 tasks (3 critical, 1 high, 2 medium)
- **Backend Developer:** 5 tasks (3 high, 2 medium)
- **Debugger/Reviewer:** 1 phase (verification after all complete)

**No file conflicts** — all tasks safely parallelizable in Phase 1-3.

---

## Key Design Decisions

### Why Full PRD vs Changelog Entry?

**Decision:** Full PRD (not just changelog)

**Reasoning:**
- Affects 10 files across multiple categories
- Requires coordination between 2 agents (Documentation + Backend Developer)
- Has critical implications (build reliability, documentation trust)
- Needs phased verification strategy
- Establishes new process (archive structure)

This exceeds the "minor task" threshold (cosmetic changes, single-file edits).

### Why Archive Superseded PRDs?

**Problem:** Active planning directory cluttered with obsolete PRDs (002, 006, 010)
**Solution:** Create `archive/` subdirectory with README documenting supersession relationships
**Benefit:** 
- Preserves historical context
- Improves discoverability of current work
- Maintains traceability for architectural decisions

### Why Preserve Deprecated Code?

**Explicitly preserved (not removed):**
- `internal/editor/` package — API compatibility for existing code
- `poc/ppk-pure-go/` — Research artifact documenting pure Go PPK parser exploration
- All lucide-react icons — Verified in use by codebase analysis

**Principle:** Deprecate with documentation, don't break existing APIs without migration path.

---

## Critical Instructions for Implementation

### For Documentation Agent (Task 1.3)

⚠️ **DESIGN-SYSTEM.md color sync is NOT a copy-paste job**

The current docs describe "Mission Control" palette (space-navy `#0a0e1a` + cyan `#22d3ee`).
The actual code uses "Professional Monochrome" (slate grays `#0f172a` + blue `#3b82f6`).

**Source of truth:** `frontend/src/styles/global.css` lines 28-67
**Task:** Rewrite color table to match code exactly (12 background tokens, 3 border, 3 text, 5 accent, 7 semantic)

### For Backend Developer (Task 2.1)

⚠️ **wails.json is production config — validate JSON syntax**

Insert after line 7, maintain 2-space indent:
```json
  "frontendDir": "frontend",
  "wailsjsdir": "frontend/wailsjs",
```

Test with `wails build` in Phase 4 — must succeed without warnings.

### For Backend Developer (Task 3.3)

⚠️ **package.json.md5 investigation required**

Don't assume — verify:
1. Check if Wails v2 auto-generates this file
2. Run `wails dev` and see if file regenerates
3. Decision: gitignore (if auto) or document (if manual)

---

## Success Criteria

### All 12 Acceptance Criteria Must Pass

- [ ] 3 critical fixes verified
- [ ] 4 high priority fixes verified
- [ ] 3 medium priority fixes verified
- [ ] 2 verification tests pass (build + git status)

### Build Verification

```powershell
wails build
# Exit code: 0
# Warnings: 0
# Artifacts: build/bin/esesha.exe created
```

### Git Cleanliness Check

```powershell
wails build
git status
# Should NOT show:
#   - build/ (now in .gitignore)
#   - *.bak (now in .gitignore)
#   - frontend/dist/ (now in .gitignore)
```

---

## Next Steps for Orchestrator

1. **Dispatch Phase 1-3** (parallel):
   - Send 6 tasks to Documentation agent
   - Send 5 tasks to Backend Developer agent
   - Expect completion in ~2 hours

2. **Wait for completion signal** from both agents

3. **Dispatch Phase 4** (sequential):
   - Send verification tasks to Debugger/Reviewer
   - Send final docs update to Documentation agent
   - Expect completion in ~30 minutes

4. **Mark PRD-015 complete** in changelog

---

## Files Created Summary

```
docs/planning/
├── prd-015-project-cleanup-optimization.md     ← Full PRD (267 lines)
├── prd-015-implementation-summary.md           ← Task breakdown (180 lines)
├── prd-015-checklist.md                        ← Quick reference (115 lines)
├── prd-015-orchestrator-guide.md               ← Agent routing (235 lines)
├── changelog.md                                 ← Updated (PRD-015 entry added)
└── archive/
    └── README.md                                ← Archive docs (65 lines)
```

**Total:** 6 new/updated files, 862 lines of planning documentation

---

## Planning Checklist Verification ✅

- [x] Every task has specific agent assigned
- [x] Every task lists exact file paths
- [x] No two parallel tasks modify same file
- [x] Acceptance criteria are testable
- [x] Codebase context from Explorer referenced
- [x] Review phase included (Phase 4)
- [x] Documentation phase included (Phase 4.4-4.5)
- [x] Security review not needed (no auth/data/API changes)
- [x] Rollback strategy defined
- [x] Version number assigned (v1.0.0)
- [x] Changelog updated
- [x] Archive structure created

**Planning Quality:** ✅ All mandatory checks passed

---

**Status:** Ready for Orchestrator dispatch
**Estimated total time:** 2.5-3.5 hours
**Risk level:** Low (no functional changes, all reversible)
**Impact:** High (documentation trust, build reliability, developer experience)
