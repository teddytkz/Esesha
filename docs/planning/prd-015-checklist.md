# PRD-015 Quick Reference — Cleanup Checklist

**Created:** 2026-08-15
**Status:** Ready for implementation

## Critical Fixes (Do First) 🔴

- [ ] **frontend/README.md** — Remove ALL Svelte references, write React + Vite + Wails overview
- [ ] **frontend/src/vite-env.d.ts** — Delete line 1 `/// <reference types="svelte" />`
- [ ] **docs/DESIGN-SYSTEM.md** — Fix color table to match `global.css` (slate grays + blue, NOT space-navy + cyan/violet)

## High Priority Config 🟡

- [ ] **wails.json** — Add after line 7:
  ```json
  "frontendDir": "frontend",
  "wailsjsdir": "frontend/wailsjs",
  ```
- [ ] **build.bat** — Insert as line 2: `setlocal enabledelayedexpansion`
- [ ] **.gitignore** — Append:
  ```
  # Build artifacts and backups
  *.bak
  *.md5
  build/
  frontend/dist/
  ```
- [ ] **docs/planning/archive/** — Create directory, move:
  - `prd-002-binary-storage-and-backup.md`
  - `prd-006-true-binary-storage-encryption.md`
  - `prd-010-embedded-ssh-keys.md`
  - `PRD-010-IMPLEMENTATION-SUMMARY.md`
  - `ROLLBACK-010-COMPLETE.md`
  - Create `archive/README.md` explaining purpose

## Medium Priority Polish 🟢

- [ ] **app.go** — Add above line 612 (EditFile method):
  ```go
  // Deprecated: EditFile is kept for API compatibility but file editing via terminal
  // is the preferred workflow. The internal/editor package is deprecated.
  ```
- [ ] **PRD filename consistency** — Rename to lowercase:
  - `PRD-012-IMPLEMENTATION-SUMMARY.md` → `prd-012-implementation-summary.md`
  - `PRD-013-IMPLEMENTATION-SUMMARY.md` → `prd-013-implementation-summary.md`
  - `PRD-014-IMPLEMENTATION-SUMMARY.md` → `prd-014-implementation-summary.md`
  - `PRD-015-IMPLEMENTATION-SUMMARY.md` → `prd-015-implementation-summary.md`
  - Update all changelog cross-references
- [ ] **package.json.md5** — Check if Wails auto-generates it:
  - If yes → add to `.gitignore`
  - If no → add inline comment explaining purpose

## Verification ✅

- [ ] Run `wails build` — must succeed without warnings
- [ ] Run `git status` after build — no untracked artifacts
- [ ] Check all doc cross-references resolve
- [ ] All 12 acceptance criteria pass

## DO NOT REMOVE ⚠️

These are intentionally kept:
- ✅ `internal/editor/` package (API compatibility)
- ✅ `poc/ppk-pure-go/` directory (research artifact)
- ✅ `scripts/*.ps1` (active tools)
- ✅ All 16 lucide-react icons (in use)
- ✅ PRD implementation summaries (distinct from full PRDs)

## Color Palette Fix Reference

**Current WRONG values in DESIGN-SYSTEM.md:**
```
--bg-primary: #0a0e1a (space-navy)
--accent-primary: #22d3ee (cyan)
```

**Correct values from global.css:**
```
--bg-primary: #0f172a (slate 900)
--accent-primary: #3b82f6 (blue 500)
```

See `frontend/src/styles/global.css` lines 28-67 for complete correct palette.

---

**Total files to modify:** 10
**Estimated effort:** 2-3 hours
**Risk level:** Low (no functional changes)
