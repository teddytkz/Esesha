# Fix Plan: PRD-015 Documentation Completion

**Related PRD:** PRD-015 (Project Cleanup & Optimization)
**Severity:** High (blocks PRD completion)
**Reported by:** Debugger/Reviewer
**Date:** 2026-08-15

---

## Bug Summary

**Backend tasks:** 5/5 completed ✅  
**Documentation tasks:** 1/5 completed ❌ (only archive README done)  
**Overall acceptance criteria:** 6/12 passed (50%)

Documentation Agent left 4 critical tasks incomplete, causing:
- Wrong tech stack documentation (Svelte instead of React)
- Wrong TypeScript type references (Svelte instead of Vite)
- Wrong color palette documented (Mission Control instead of Professional Monochrome)
- Broken archive references

---

## Root Cause Analysis

**Primary cause:** Documentation Agent stopped after completing only the archive README task, despite having 4 more tasks assigned in PRD-015 Phase 3.

**Contributing factors:**
1. Tasks were clearly defined in PRD-015 but not executed
2. No verification step ran to catch incomplete work
3. Color palette mismatch existed before PRD-015 (DESIGN-SYSTEM.md was never updated after the Professional Monochrome palette was implemented in `global.css`)

---

## CRITICAL Issues (Must Fix)

### Issue 1: frontend/README.md — Wrong Tech Stack
**Current state:** 62 lines of Svelte + Vite template documentation  
**Required state:** React + Vite + Wails documentation  
**Impact:** New developers will be completely confused about the project's actual tech stack  
**Root cause:** Template file was never replaced when project switched from Svelte to React

**Fix:**
- Replace entire file with accurate React + Vite + Wails documentation
- Include: tech stack overview, development commands, build process, project structure
- Reference actual files in the codebase (App.tsx, not App.svelte)

### Issue 2: frontend/src/vite-env.d.ts — Wrong Type Reference
**Current state:** Line 1 has `/// <reference types="svelte" />`  
**Required state:** Remove Svelte reference, keep only `/// <reference types="vite/client" />`  
**Impact:** TypeScript may load wrong type definitions; IDE may show incorrect intellisense  
**Root cause:** Template file was not cleaned when migrating from Svelte

**Fix:**
- Delete line 1 (`/// <reference types="svelte" />`)
- Keep line 2 (`/// <reference types="vite/client" />`)

### Issue 3: docs/DESIGN-SYSTEM.md — Wrong Color Palette Documented
**Current state:** Documents "Mission Control" palette with space-navy (#0a0e1a) and cyan (#22d3ee)  
**Actual code:** Uses "Professional Monochrome" palette with slate-900 (#0f172a) and blue-500 (#3b82f6)  
**Impact:** Developers will implement wrong colors when building new features  
**Root cause:** DESIGN-SYSTEM.md was written for an earlier design that was later changed; documentation was never updated to match the actual code

**Fix:**
- Update color palette section to match `frontend/src/styles/global.css`
- Replace all Mission Control hex values with Professional Monochrome values
- Update color usage descriptions to match actual implementation
- Remove references to "Mission Control" identity; replace with "Professional Monochrome"
- Update principle descriptions to reflect cleaner, less theatrical aesthetic

---

## WARNING Issues (Should Fix)

### Issue 4: docs/planning/archive/README.md — Broken References
**Current state:** Archive index table references PRD-002, PRD-006, PRD-010 as if they exist in archive  
**Reality:** These files were removed in an earlier cleanup (not moved to archive)  
**Impact:** Maintainability issue; developers following links will hit 404s  
**Root cause:** Archive README was created with placeholder content that was never verified

**Fix:**
- Update archive README to note that PRD-002, PRD-006, PRD-010 were removed (not archived)
- Add note explaining files were deleted in earlier cleanup because they were superseded/obsolete
- Remove table entries that reference non-existent files
- Keep structure intact for future archives

### Issue 5: PRD Naming Inconsistency
**Current state:** 4 uppercase PRD files in `docs/planning/`
- `PRD-012-IMPLEMENTATION-SUMMARY.md`
- `PRD-013-IMPLEMENTATION-SUMMARY.md`
- `PRD-014-IMPLEMENTATION-SUMMARY.md`
- `PRD-015-CHECKLIST.md`
- `PRD-015-IMPLEMENTATION-SUMMARY.md`
- `PRD-015-INDEX.md`
- `PRD-015-ORCHESTRATOR-GUIDE.md`
- `PRD-015-PLANNING-COMPLETE.md`

**Required state:** Lowercase naming per project convention  
**Impact:** Inconsistent naming makes files harder to discover; breaks alphabetical sorting  
**Root cause:** Files were created with uppercase naming instead of following existing convention

**Fix:**
- Rename all uppercase PRD files to lowercase kebab-case
- Example: `PRD-012-IMPLEMENTATION-SUMMARY.md` → `prd-012-implementation-summary.md`
- Verify no internal links break (search for references to uppercase names)

---

## Fix Strategy

### Option A: Complete All 5 Tasks (Recommended)
- Files affected: 6 files (1 fix + 1 replace + 1 major update + 1 update + 8 renames)
- Risk: Low (all documentation changes, no code impact)
- Effort: Small (15-20 minutes)
- Benefit: Achieves 100% PRD-015 completion

### Option B: Fix Only Critical Issues (1-3)
- Files affected: 3 files (1 fix + 1 replace + 1 major update)
- Risk: Low
- Effort: Small (10 minutes)
- Benefit: Resolves confusion for new developers
- Downside: Leaves naming inconsistency and broken archive references

**Recommended:** Option A — Complete all 5 tasks to fully close PRD-015

---

## Implementation Tasks

| Task | Agent         | Files                              | Description                                       |
| ---- | ------------- | ---------------------------------- | ------------------------------------------------- |
| 1.1  | Documentation | `frontend/src/vite-env.d.ts`       | Remove line 1 (Svelte type reference)            |
| 1.2  | Documentation | `frontend/README.md`               | Replace entire file with React + Vite + Wails docs |
| 1.3  | Documentation | `docs/DESIGN-SYSTEM.md`            | Update color palette to match global.css (Professional Monochrome) |
| 1.4  | Documentation | `docs/planning/archive/README.md`  | Update to note PRD-002/006/010 were deleted, not archived |
| 1.5  | Documentation | 8 files in `docs/planning/`        | Rename uppercase PRD files to lowercase kebab-case |

---

## Detailed Changes Required

### Task 1.1: Fix vite-env.d.ts
**File:** `frontend/src/vite-env.d.ts`  
**Change:** Delete line 1 only

```typescript
// REMOVE THIS LINE:
/// <reference types="svelte" />

// KEEP THIS LINE:
/// <reference types="vite/client" />
```

### Task 1.2: Replace frontend/README.md
**File:** `frontend/README.md`  
**Change:** Replace entire file

**New content template:**
```markdown
# Esesha Frontend

React + TypeScript frontend for Esesha SSH/SFTP client, built with Vite and Wails.

## Tech Stack

- **Framework:** React 18
- **Language:** TypeScript
- **Build tool:** Vite 5
- **Desktop integration:** Wails v2
- **Styling:** CSS Modules + CSS custom properties
- **Design system:** Professional Monochrome palette (see docs/DESIGN-SYSTEM.md)

## Project Structure

```
frontend/
├── src/
│   ├── components/        # React components (*.tsx + *.module.css pairs)
│   │   ├── App.tsx        # Root component
│   │   ├── FileExplorer.tsx
│   │   ├── Terminal.tsx
│   │   └── ...
│   ├── styles/
│   │   └── global.css     # Design tokens, global styles
│   ├── types/             # TypeScript type definitions
│   └── main.tsx           # React entry point
├── wailsjs/               # Generated Wails bindings (do not edit manually)
├── index.html             # HTML entry point
├── vite.config.ts         # Vite configuration
└── package.json
```

## Development

**Install dependencies:**
```bash
cd frontend
npm install
```

**Run dev server (Wails handles this automatically):**
```bash
# From project root
wails dev
```

**Build for production:**
```bash
# From project root
wails build
```

## Architecture

- **Components use CSS Modules** — each component has a paired `.module.css` file
- **Design tokens in global.css** — colors, spacing, typography defined as CSS custom properties
- **Wails bindings in wailsjs/** — generated from Go backend; provides frontend access to Go functions
- **No state management library** — uses React hooks (useState, useEffect) + local state

## Styling Guidelines

- Use design tokens from `src/styles/global.css` (never hardcode colors)
- Follow naming convention: `ComponentName.tsx` + `ComponentName.module.css`
- See `docs/DESIGN-SYSTEM.md` for color palette, typography, spacing

## Wails Integration

Frontend communicates with Go backend via Wails runtime:

```typescript
import { ConnectSSH } from '../wailsjs/go/main/App';

// Call Go backend function
await ConnectSSH(connectionId);
```

Bindings are auto-generated when you run `wails dev` or `wails build`.

## Notes

- Do not edit files in `wailsjs/` — they are auto-generated
- TypeScript references in `vite-env.d.ts` enable Vite type support
- Build output goes to `build/bin/` (configured in wails.json)
```

### Task 1.3: Update DESIGN-SYSTEM.md Color Palette
**File:** `docs/DESIGN-SYSTEM.md`  
**Change:** Replace lines 1-100 (Overview, Principles, Color Palette sections)

**Key changes:**
1. Replace "Mission Control" with "Professional Monochrome" throughout
2. Update color token table to match `global.css`:
   - `--bg-primary`: `#0a0e1a` → `#0f172a` (slate-900)
   - `--bg-secondary`: `#0f1524` → `#1e293b` (slate-800)
   - `--bg-tertiary`: `#161e33` → `#334155` (slate-700)
   - `--bg-hover`: `#1b2440` → `#475569` (slate-600)
   - `--bg-active`: `#0e2a3a` → `#1e40af` (blue-700)
   - `--border-focus`: `#22d3ee` (cyan) → `#3b82f6` (blue-500)
   - `--accent-primary`: `#22d3ee` (cyan) → `#3b82f6` (blue-500)
   - Remove all cyan/violet references; replace with blue-500/blue-400/blue-600
3. Update design principles to remove "deep space" and "Mission Control" language
4. Update usage guidelines to reflect clean professional aesthetic (not futuristic)

### Task 1.4: Fix Archive README
**File:** `docs/planning/archive/README.md`  
**Change:** Update "Current Archives" section

```markdown
## Current Archives

**Note:** PRD-002, PRD-006, and PRD-010 were removed in an earlier cleanup (not moved to this archive) as they were superseded by later PRDs or rolled back completely. Historical references to these PRDs may exist in commit history.

Currently this archive is empty. Future superseded or rolled-back PRDs will be moved here.

## Archival Process

When archiving a PRD:
1. Move the file to `docs/planning/archive/`
2. Update the table above with archive metadata
3. Update any references in active docs to point to archive location
4. Add archive note to changelog
```

### Task 1.5: Rename Uppercase PRD Files
**Files:** 8 files in `docs/planning/`

**Renames:**
1. `PRD-012-IMPLEMENTATION-SUMMARY.md` → `prd-012-implementation-summary.md`
2. `PRD-013-IMPLEMENTATION-SUMMARY.md` → `prd-013-implementation-summary.md`
3. `PRD-014-IMPLEMENTATION-SUMMARY.md` → `prd-014-implementation-summary.md`
4. `PRD-015-CHECKLIST.md` → `prd-015-checklist.md`
5. `PRD-015-IMPLEMENTATION-SUMMARY.md` → `prd-015-implementation-summary.md`
6. `PRD-015-INDEX.md` → `prd-015-index.md`
7. `PRD-015-ORCHESTRATOR-GUIDE.md` → `prd-015-orchestrator-guide.md`
8. `PRD-015-PLANNING-COMPLETE.md` → `prd-015-planning-complete.md`

**Verification:** After renames, search for any references to uppercase filenames in:
- `docs/planning/changelog.md`
- `docs/planning/prd-015-*.md`
- Other documentation files

---

## Acceptance Criteria

- [ ] `frontend/src/vite-env.d.ts` contains only `/// <reference types="vite/client" />`
- [ ] `frontend/README.md` documents React + Vite + Wails (no Svelte references)
- [ ] `docs/DESIGN-SYSTEM.md` color palette matches `global.css` exactly
- [ ] `docs/DESIGN-SYSTEM.md` uses "Professional Monochrome" palette name
- [ ] `docs/planning/archive/README.md` correctly notes PRD-002/006/010 were deleted
- [ ] All PRD files in `docs/planning/` use lowercase kebab-case naming
- [ ] No broken internal links to renamed files
- [ ] Build still succeeds (`wails build`)

---

## Regression Risk

**Low risk** — All changes are documentation-only:
- No code changes
- No configuration changes
- No dependency changes
- Build process unaffected

**Potential issues:**
- If any scripts or tools reference uppercase PRD filenames, they may break (unlikely)
- If external documentation links to specific files, those links may 404 (acceptable)

---

## Verification Steps

After all tasks complete:

1. **Type reference check:**
   ```bash
   grep -r "svelte" frontend/src/
   # Should return no results
   ```

2. **Color palette check:**
   ```bash
   # Verify DESIGN-SYSTEM.md matches global.css
   grep "#0f172a" docs/DESIGN-SYSTEM.md
   grep "#3b82f6" docs/DESIGN-SYSTEM.md
   # Both should return results
   
   grep "#0a0e1a" docs/DESIGN-SYSTEM.md
   grep "#22d3ee" docs/DESIGN-SYSTEM.md
   # Both should return NO results
   ```

3. **Naming consistency check:**
   ```bash
   ls docs/planning/PRD-*.md
   # Should return no results (all should be lowercase)
   ```

4. **Build verification:**
   ```bash
   wails build
   # Should complete successfully
   ```

5. **Manual verification:**
   - Open `frontend/README.md` — should see React, not Svelte
   - Open `docs/DESIGN-SYSTEM.md` — color values should match global.css
   - Open `docs/planning/` — all files should be lowercase

---

## Estimated Effort

- Task 1.1 (vite-env.d.ts): 1 minute
- Task 1.2 (frontend/README.md): 5 minutes
- Task 1.3 (DESIGN-SYSTEM.md): 10 minutes (most complex)
- Task 1.4 (archive/README.md): 2 minutes
- Task 1.5 (file renames): 3 minutes
- Verification: 3 minutes

**Total: ~25 minutes**

---

## Rollback Strategy

All changes are documentation-only and easily reversible:

1. **vite-env.d.ts** — Re-add Svelte line if needed (unlikely)
2. **README.md** — Git revert to previous version
3. **DESIGN-SYSTEM.md** — Git revert to previous version
4. **Renames** — Rename files back to uppercase (or use git mv)

No code rollback needed since no code was modified.
