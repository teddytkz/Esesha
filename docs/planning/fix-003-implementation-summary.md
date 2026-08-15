# Fix-003: Context Menu Positioning Bug — Implementation Summary

**Status:** PLANNED 📋
**Severity:** Medium
**Created:** 2026-08-15
**Related PRD:** PRD-016 (Terminal Copy/Paste Functionality)

---

## Quick Reference

- **Fix Plan:** `docs/planning/fix-003-context-menu-positioning.md`
- **Issue:** Context menu clipped when right-clicking near viewport edges
- **Solution:** Viewport boundary detection with automatic position adjustment
- **Components Affected:** Terminal, FileExplorer
- **Effort Estimate:** 2-3 hours (both components)
- **Risk Level:** Low

---

## Implementation Summary for Orchestrator

### Scope

**Task Type:** Bug fix (Medium severity)

**Files to Modify:**
- `frontend/src/components/Terminal.tsx` — Add positioning algorithm + `useLayoutEffect`
- `frontend/src/components/FileExplorer.tsx` — Add positioning algorithm + `useLayoutEffect`

**Agent Assignment:** Frontend Developer

**Parallelizable:** No — same developer should implement both to ensure consistency

---

## Implementation Tasks

| Phase | Task | Files | Agent | Depends On |
|-------|------|-------|-------|------------|
| 1 | Create `adjustContextMenuPosition()` helper function | `Terminal.tsx` | Frontend Developer | - |
| 2 | Add `useLayoutEffect` for post-render position adjustment | `Terminal.tsx` | Frontend Developer | Task 1 |
| 3 | Create identical helper function | `FileExplorer.tsx` | Frontend Developer | Task 2 |
| 4 | Add `useLayoutEffect` for post-render adjustment | `FileExplorer.tsx` | Frontend Developer | Task 3 |
| 5 | Test both components at viewport edges | Both files | Debugger/Reviewer | Task 4 |
| 6 | Update component documentation | `docs/components/*.md` | Documentation | Task 5 |
| 7 | Update changelog | `docs/planning/changelog.md` | Documentation | Task 5 |

---

## Acceptance Criteria Summary

**Must Pass (10 criteria):**
1. ✅ Terminal: Menu never clips at bottom edge
2. ✅ Terminal: Menu never clips at right edge
3. ✅ Terminal: Menu flips above cursor when needed
4. ✅ Terminal: Menu flips left of cursor when needed
5. ✅ FileExplorer: Menu never clips at edges
6. ✅ FileExplorer: Menu flips above/left when needed
7. ✅ No visual flicker or position jump
8. ✅ Both components use identical positioning logic
9. ✅ Works at multiple window sizes (1024x768, 1920x1080, 2560x1440)
10. ✅ Works in split view (reduced viewport)

---

## Technical Approach

**Algorithm:** Measure menu dimensions after render → compare with viewport boundaries → flip above/left if overflow → clamp to viewport with 8px padding

**Key Pattern:** `useLayoutEffect` (runs before browser paint) to adjust position synchronously, preventing visual flicker

**No Changes to:**
- Context menu JSX structure
- CSS styles (positioning remains `position: fixed`)
- Keyboard navigation
- Focus management
- Copy/Paste functionality

---

## Testing Strategy

**Test Matrix:**

| Component | Location | Expected Behavior |
|-----------|----------|-------------------|
| Terminal | Bottom edge | Flip above cursor |
| Terminal | Right edge | Flip left of cursor |
| Terminal | Bottom-right corner | Flip both above and left |
| Terminal | Center | No adjustment (at cursor) |
| FileExplorer | Bottom edge | Flip above cursor |
| FileExplorer | Right edge | Flip left of cursor |
| FileExplorer | Bottom-right corner | Flip both directions |
| FileExplorer | Center | No adjustment |

**Window Sizes:**
- 1024x768 (small)
- 1920x1080 (standard)
- 2560x1440 (large)

**Split View:** Test both components in split pane (reduced viewport height/width)

---

## Documentation Updates Required

1. **Component Docs:**
   - `docs/components/terminal.md` — Add note about viewport-aware positioning
   - `docs/components/file-explorer.md` — Add note about positioning behavior

2. **Changelog:**
   - `docs/planning/changelog.md` — Add Fix-003 entry under `### Fixed`

3. **Example Entry:**
   ```markdown
   - [2026-08-15] **Fix-003: Context Menu Positioning Bug** — Fixed clipping near viewport edges
     - Context menu automatically adjusts position to stay within viewport
     - Flips above cursor when insufficient space below
     - Flips left of cursor when insufficient space on right
     - Applies to both Terminal and FileExplorer components
     - No visual flicker (uses `useLayoutEffect`)
   ```

---

## Risk Assessment

**Low Risk:**
- Isolated positioning logic
- No changes to menu content or functionality
- Standard pattern (widely used in context menu libraries)
- Easy rollback (remove helper + `useLayoutEffect`)

**Medium Risk:**
- Edge case: extremely small viewport (< menu dimensions)
- Mitigation: Clamping logic ensures menu always fits

**No Risk:**
- No data mutations
- No backend changes
- No breaking API changes

---

## Rollback Plan

**If issues occur:**

1. **Immediate:** Remove `adjustContextMenuPosition()` and `useLayoutEffect`
2. **Revert to:** Original positioning (`{ x: cursorX, y: cursorY }`)
3. **Time:** < 5 minutes
4. **User Impact:** Menu returns to original behavior (may clip at edges)

---

## Success Metrics

- ✅ 0 reports of menu clipping after deployment
- ✅ All 10 acceptance criteria pass
- ✅ No performance degradation (menu opens instantly)
- ✅ No visual artifacts (no flicker/jump)
- ✅ Code review approved
- ✅ Build passes (`wails build`)

---

## Next Steps for Orchestrator

1. **Assign to:** Frontend Developer
2. **Priority:** Medium (not blocking, but affects UX)
3. **Estimated Time:** 2-3 hours
4. **Dependencies:** None (can start immediately)
5. **After Implementation:** Route to Debugger/Reviewer for testing at viewport edges
6. **After Review:** Route to Documentation agent for changelog + component docs

---

## Related Documents

- **Fix Plan:** `docs/planning/fix-003-context-menu-positioning.md` (full technical design)
- **Related PRD:** `docs/planning/prd-016-terminal-copy-paste.md` (original feature)
- **User Report:** Context menu "Paste" button "tenggelam" (clipped) near bottom edge
- **Affected Components:** `docs/components/terminal.md`, `docs/components/file-explorer.md`
