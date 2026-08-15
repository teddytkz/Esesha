# Fix-003 Planning Complete ✅

**Status:** READY FOR IMPLEMENTATION
**Created:** 2026-08-15
**Plan Type:** Bug Fix (Medium Severity)

---

## Documents Created

1. **Fix Plan:** `docs/planning/fix-003-context-menu-positioning.md` (full technical design, 350+ lines)
2. **Implementation Summary:** `docs/planning/fix-003-implementation-summary.md` (orchestrator guide)
3. **Changelog Entry:** Added to `docs/planning/changelog.md` under `### Fixed`

---

## Quick Summary

**Bug:** Context menu "Paste" button clipped when right-clicking near viewport edges
**Affects:** Terminal component (PRD-016) + FileExplorer component
**Solution:** Viewport boundary detection with automatic position adjustment
**Effort:** 2-3 hours (both components)
**Risk:** Low
**Agent:** Frontend Developer

---

## Implementation Checklist

- [ ] Phase 1: Add `adjustContextMenuPosition()` helper to Terminal.tsx
- [ ] Phase 2: Add `useLayoutEffect` to Terminal.tsx
- [ ] Phase 3: Add `adjustContextMenuPosition()` helper to FileExplorer.tsx
- [ ] Phase 4: Add `useLayoutEffect` to FileExplorer.tsx
- [ ] Phase 5: Test both components at viewport edges (Debugger/Reviewer)
- [ ] Phase 6: Update component documentation (Documentation agent)
- [ ] Phase 7: Finalize changelog entry (Documentation agent)

---

## Key Technical Details

### Algorithm
```typescript
function adjustContextMenuPosition(
  cursorX: number,
  cursorY: number,
  menuWidth: number,
  menuHeight: number
): { x: number; y: number }
```

**Logic:**
1. Measure menu dimensions after render
2. Compare menu edges with viewport boundaries
3. Flip above cursor if bottom edge overflows
4. Flip left of cursor if right edge overflows
5. Clamp to viewport with 8px padding

### Integration Pattern

**Step 1:** Initial position at cursor (synchronous)
```typescript
const handleContextMenu = (e: React.MouseEvent) => {
  setContextMenu({ x: e.clientX, y: e.clientY });
};
```

**Step 2:** Post-render adjustment (useLayoutEffect)
```typescript
useLayoutEffect(() => {
  if (!contextMenu || !contextMenuRef.current) return;
  const rect = contextMenuRef.current.getBoundingClientRect();
  const adjusted = adjustContextMenuPosition(
    contextMenu.x, contextMenu.y, rect.width, rect.height
  );
  if (adjusted.x !== contextMenu.x || adjusted.y !== contextMenu.y) {
    setContextMenu(adjusted);
  }
}, [contextMenu]);
```

---

## Acceptance Criteria (10 total)

### Terminal Component (4 criteria)
- [ ] Menu never clips at bottom edge
- [ ] Menu never clips at right edge  
- [ ] Menu flips above cursor when insufficient space below
- [ ] Menu flips left of cursor when insufficient space on right

### FileExplorer Component (4 criteria)
- [ ] Menu never clips at bottom edge
- [ ] Menu never clips at right edge
- [ ] Menu flips above cursor when insufficient space below
- [ ] Menu flips left of cursor when insufficient space on right

### Cross-Component (2 criteria)
- [ ] No visual flicker or position jump in either component
- [ ] Both components use identical positioning algorithm

---

## Testing Matrix

| Component | Location | Window Size | Expected Behavior |
|-----------|----------|-------------|-------------------|
| Terminal | Bottom edge | 1920x1080 | Flip above cursor |
| Terminal | Right edge | 1920x1080 | Flip left of cursor |
| Terminal | Bottom-right corner | 1920x1080 | Flip above & left |
| Terminal | Center | 1920x1080 | No adjustment |
| Terminal | Bottom edge | 1024x768 | Flip above cursor |
| Terminal | Split view | Any | Flip when needed |
| FileExplorer | Bottom edge | 1920x1080 | Flip above cursor |
| FileExplorer | Right edge | 1920x1080 | Flip left of cursor |
| FileExplorer | Bottom-right corner | 1920x1080 | Flip above & left |
| FileExplorer | Center | 1920x1080 | No adjustment |

---

## Files to Modify

### Implementation Files
- `frontend/src/components/Terminal.tsx` (~30 lines added: helper function + useLayoutEffect)
- `frontend/src/components/FileExplorer.tsx` (~30 lines added: identical helper + useLayoutEffect)

### Documentation Files (Post-Implementation)
- `docs/components/terminal.md` (add positioning note)
- `docs/components/file-explorer.md` (add positioning note)
- `docs/planning/changelog.md` (already updated with PLANNED status)

---

## Agent Routing

1. **Frontend Developer** → Implement positioning algorithm in both components
2. **Debugger/Reviewer** → Test all viewport edge scenarios
3. **Documentation** → Update component docs + finalize changelog entry

---

## Risk Assessment

**Low Risk:**
- Isolated positioning logic only
- No changes to menu content/functionality
- No state mutations or backend changes
- Standard pattern (industry-proven approach)
- Easy rollback (< 5 min)

**Mitigation:**
- Use `useLayoutEffect` to prevent visual flicker
- Add viewport clamping for extremely small windows
- Test at multiple window sizes before approval

---

## Rollback Strategy

**If issues occur:**
1. Remove `adjustContextMenuPosition()` helper function
2. Remove `useLayoutEffect` hook
3. Revert to original positioning: `{ x: cursorX, y: cursorY }`
4. Time to rollback: < 5 minutes
5. Impact: Menu returns to original behavior (may clip at edges)

---

## Success Metrics

- ✅ All 10 acceptance criteria pass
- ✅ 0 visual flicker or position jump
- ✅ Both components behave identically
- ✅ Works at 1024x768, 1920x1080, 2560x1440
- ✅ Works in split view (reduced viewport)
- ✅ Build passes: `wails build`
- ✅ Code review approved

---

## Next Actions for Orchestrator

### Immediate
1. **Assign to:** Frontend Developer
2. **Priority:** Medium (not blocking, but affects UX)
3. **Dependencies:** None (ready to start)
4. **Estimated Time:** 2-3 hours

### After Implementation
1. **Route to:** Debugger/Reviewer for edge testing
2. **After Review:** Route to Documentation for docs update

### Completion Criteria
- [ ] Implementation complete
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Changelog status changed from PLANNED to COMPLETE
- [ ] Build succeeds

---

## Related Context

**User Report (Indonesian):**
> "jika klik kanan nya agak di bawah di terminal maka tombol paste nya tenggelam"

**Translation:** "When right-clicking near the bottom of the terminal, the Paste button gets hidden/clipped"

**Original Feature:** PRD-016 (Terminal Copy/Paste) — completed 2026-08-15
**Bug Found:** Post-implementation user feedback
**Also Affects:** FileExplorer component (same positioning pattern, not yet reported)

---

## Planning Checklist ✅

- [x] Bug thoroughly analyzed
- [x] Root cause identified
- [x] Solution designed with algorithm
- [x] Files to modify specified
- [x] Acceptance criteria defined (testable)
- [x] Risk assessment completed
- [x] Rollback strategy documented
- [x] Testing strategy specified
- [x] Agent assignments clear
- [x] Documentation plan included
- [x] Changelog updated
- [x] Implementation summary created
- [x] Version number assigned (v1.0.0)

---

**Planning Complete:** 2026-08-15 03:50 UTC
**Ready for Implementation:** YES ✅
**Orchestrator Action Required:** Assign to Frontend Developer
