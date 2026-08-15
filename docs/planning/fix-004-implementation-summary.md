# Fix-004: Context Menu Top/Left Edge Handling — Implementation Summary

**Status:** PLANNED 📋
**Severity:** Low
**Created:** 2026-08-15
**Related Fix:** Fix-003 (Context Menu Positioning Bug)
**Related PRD:** PRD-016 (Terminal Copy/Paste Functionality)

---

## Quick Reference

- **Fix Plan:** `docs/planning/fix-004-context-menu-edge-refinement.md`
- **Issue:** Menu clamped to 8px from top/left edges instead of flipping to opposite direction
- **Solution:** Add flip-back logic (4 lines of code)
- **Components Affected:** Terminal, FileExplorer
- **Effort Estimate:** XS (~40 minutes total)
- **Risk Level:** Very Low

---

## Implementation Summary (Fix-004 Only)

### Scope

**Task Type:** Bug fix refinement (Low severity)

**Files to Modify:**
- `frontend/src/components/Terminal.tsx` — Add 2 lines to `adjustContextMenuPosition()`
- `frontend/src/components/FileExplorer.tsx` — Add 2 lines to `adjustContextMenuPosition()`

**Agent Assignment:** Frontend Developer

**Parallelizable:** Yes — Terminal and FileExplorer can be modified simultaneously by same developer (copy-paste pattern)

---

## Code Changes Required

### Terminal.tsx — adjustContextMenuPosition()

**Location:** Inside `adjustContextMenuPosition()` helper function

**Change 1: Add left edge flip-back (after right edge flip):**
```typescript
// Check right edge overflow
if (x + menuWidth + padding > viewportWidth) {
  x = cursorX - menuWidth;
}

// NEW: Check if flipped position violates left edge
if (x < padding) {
  x = cursorX; // Flip back to right of cursor
}
```

**Change 2: Add top edge flip-back (after bottom edge flip):**
```typescript
// Check bottom edge overflow
if (y + menuHeight + padding > viewportHeight) {
  y = cursorY - menuHeight;
}

// NEW: Check if flipped position violates top edge
if (y < padding) {
  y = cursorY; // Flip back below cursor
}
```

### FileExplorer.tsx — adjustContextMenuPosition()

**Identical changes as Terminal.tsx** (same function, same logic)

---

## Implementation Tasks

| Phase | Task | Files | Agent | Depends On | Effort |
|-------|------|-------|-------|------------|--------|
| 1 | Add left edge flip-back check | `Terminal.tsx` | Frontend Developer | - | 5 min |
| 1 | Add top edge flip-back check | `Terminal.tsx` | Frontend Developer | - | 5 min |
| 1 | Add left edge flip-back check | `FileExplorer.tsx` | Frontend Developer | - | 5 min |
| 1 | Add top edge flip-back check | `FileExplorer.tsx` | Frontend Developer | - | 5 min |
| 2 | Test all 4 corners + center | Both files | Debugger/Reviewer | Phase 1 | 15 min |
| 3 | Update changelog | `docs/planning/changelog.md` | Documentation | Phase 2 | 5 min |
| 3 | Add note to Fix-003 doc | `fix-003-context-menu-positioning.md` | Documentation | Phase 2 | 5 min |

**Total Estimated Time:** ~40 minutes

---

## Acceptance Criteria Summary

**Must Pass (12 criteria):**

### Terminal Component (7 criteria)
1. ✅ Top-left corner (50, 50) — menu at cursor or slightly offset (no clamp to edge)
2. ✅ Top-right corner (1870, 50) — menu flips left, stays at/below cursor
3. ✅ Bottom-left corner (50, 1030) — menu flips above, stays at/right of cursor
4. ✅ Bottom-right corner (1870, 1030) — menu flips both left and above
5. ✅ Center (960, 540) — menu at cursor (no adjustment)
6. ✅ Menu NEVER clamped to 8px from top edge (unless menu > viewport)
7. ✅ Menu NEVER clamped to 8px from left edge (unless menu > viewport)

### FileExplorer Component (2 criteria)
8. ✅ Same 4-corner test as Terminal — all correct
9. ✅ Center positioning unchanged

### Regression Prevention (3 criteria)
10. ✅ All Fix-003 behavior preserved (bottom/right edge handling)
11. ✅ No visual flicker or position jump
12. ✅ Existing functionality intact (Copy/Paste, keyboard nav, etc.)

---

## Testing Strategy

### Manual Testing Script

**Test Matrix (5 positions × 2 components = 10 tests):**

| # | Component | Position | Cursor (x, y) | Expected Menu Position | Pass/Fail |
|---|-----------|----------|---------------|------------------------|-----------|
| 1 | Terminal | Top-left | (50, 50) | (~50, ~50) | ☐ |
| 2 | Terminal | Top-right | (1870, 50) | (~1670, ~50) | ☐ |
| 3 | Terminal | Bottom-left | (50, 1030) | (~50, ~880) | ☐ |
| 4 | Terminal | Bottom-right | (1870, 1030) | (~1670, ~880) | ☐ |
| 5 | Terminal | Center | (960, 540) | (960, 540) | ☐ |
| 6 | FileExplorer | Top-left | (50, 50) | (~50, ~50) | ☐ |
| 7 | FileExplorer | Top-right | (1870, 50) | (~1670, ~50) | ☐ |
| 8 | FileExplorer | Bottom-left | (50, 1030) | (~50, ~880) | ☐ |
| 9 | FileExplorer | Bottom-right | (1870, 1030) | (~1670, ~880) | ☐ |
| 10 | FileExplorer | Center | (960, 540) | (960, 540) | ☐ |

**Assumptions:** Viewport 1920×1080, menu ~200×150

### Window Size Tests

Repeat core tests at:
- 1024×768 (small)
- 1920×1080 (standard)
- 2560×1440 (large)

**Focus:** Ensure no clipping at any size

---

## Technical Approach

### Algorithm Logic

**Current (Fix-003):**
```
1. Check right edge → flip left if overflow
2. Check bottom edge → flip above if overflow
3. Clamp to viewport (Math.max/Math.min)
```

**Problem:** Step 3 clamps negative positions to 8px, disconnecting menu from cursor

**Fix-004 Enhancement:**
```
1. Check right edge → flip left if overflow
2. ✨ NEW: If flipped left position < padding → flip back right
3. Check bottom edge → flip above if overflow
4. ✨ NEW: If flipped above position < padding → flip back below
5. Final clamp (only for menu > viewport extreme case)
```

**Key Insight:** Flip-back prevents negative positions BEFORE final clamp

---

## Risk Assessment

**Very Low Risk:**
- Minimal code change (4 lines total)
- Isolated to positioning logic
- No state mutations or data changes
- Easy rollback (remove 4 lines)
- No performance impact (2 simple comparisons)

**No Risk:**
- No backend changes
- No API changes
- No breaking changes
- No data loss scenarios

---

## Rollback Plan

**If issues occur:**

1. **Immediate:** Remove the 4 added lines; revert to Fix-003 state
2. **Partial:** Keep one axis fix, revert the other (if only X or Y has issues)
3. **User workaround:** "Avoid extreme corner regions" (low impact)

**Rollback complexity:** Trivial (delete 4 lines)

---

## Documentation Updates

### 1. Changelog Entry

**File:** `docs/planning/changelog.md`

**Add under `### Fixed` section:**
```markdown
- [2026-08-15] **Fix-004: Context Menu Top/Left Edge Handling** — Refined Fix-003 positioning
  - **Severity:** Low
  - **Issue:** Menu clamped to 8px from top/left edges instead of flipping to opposite direction
  - **Solution:** Add flip-back logic (if flipped position goes negative, flip to opposite side)
  - **Files Modified:** `frontend/src/components/Terminal.tsx`, `frontend/src/components/FileExplorer.tsx`
  - **Impact:** Context menu now handles all 4 corners correctly; never disconnected from cursor
  - **Effort:** XS (4 lines of code)
  - **Related:** Fix-003 (Context Menu Positioning Bug)
  - **See:** `docs/planning/fix-004-context-menu-edge-refinement.md`
```

### 2. Update Fix-003 Doc

**File:** `docs/planning/fix-003-context-menu-positioning.md`

**Add at top (after title, before Overview):**
```markdown
> **Refinement Note:** This fix was enhanced by Fix-004 on 2026-08-15 to add top/left edge flip-back logic.  
> See: `docs/planning/fix-004-context-menu-edge-refinement.md`
```

### 3. Component Docs

**No updates needed** — Fix-004 is internal refinement; user-facing behavior already documented in Fix-003

---

## Success Metrics

**Definition of Done:**
- ✅ All 12 acceptance criteria pass
- ✅ No regressions in existing positioning behavior
- ✅ Manual corner testing confirms menu always near cursor
- ✅ Debugger/Reviewer approves implementation
- ✅ Changelog and Fix-003 doc updated
- ✅ No console errors or warnings

**Implementation Time Estimate:**
- Code changes: 15 minutes
- Testing: 15 minutes  
- Documentation: 10 minutes
- **Total: ~40 minutes**

---

## Comparison: Fix-003 vs Fix-004

| Aspect | Fix-003 | Fix-004 |
|--------|---------|---------|
| **Bottom edge** | ✅ Flips above | ✅ Flips above |
| **Right edge** | ✅ Flips left | ✅ Flips left |
| **Top edge** | ❌ Clamps to 8px | ✅ Flips below |
| **Left edge** | ❌ Clamps to 8px | ✅ Flips right |
| **Corner handling** | ❌ Incomplete | ✅ Complete |
| **Production ready** | ⚠️ With caveat | ✅ Yes |

---

## Implementation Guidance for Frontend Developer

### Step-by-Step Instructions

1. **Open `frontend/src/components/Terminal.tsx`**
2. **Locate `adjustContextMenuPosition()` function** (created in Fix-003)
3. **After the right edge flip check**, add:
   ```typescript
   if (x < padding) {
     x = cursorX;
   }
   ```
4. **After the bottom edge flip check**, add:
   ```typescript
   if (y < padding) {
     y = cursorY;
   }
   ```
5. **Repeat steps 1-4 for `frontend/src/components/FileExplorer.tsx`**
6. **Test manually** (right-click at all 4 corners + center in both components)
7. **Verify no console errors**
8. **Submit for review**

### Quick Self-Test

**Before submitting, verify:**
- [ ] Code compiles without errors
- [ ] Right-click at (50, 50) — menu appears at cursor (not at edge)
- [ ] Right-click at center — menu still appears at cursor (regression check)
- [ ] Both Terminal and FileExplorer have identical changes
- [ ] No debug console.log statements left in code

---

## Notes for Debugger/Reviewer

### Review Checklist

**Code Review:**
- [ ] Both components have identical flip-back logic
- [ ] Logic order correct: flip primary direction → check flip-back → final clamp
- [ ] No typos or copy-paste errors
- [ ] Comments added to explain flip-back checks

**Functional Review:**
- [ ] Test all 4 corners in Terminal
- [ ] Test all 4 corners in FileExplorer
- [ ] Test center positioning (regression)
- [ ] Test at 1024×768 window size
- [ ] Test at 2560×1440 window size

**Documentation Review:**
- [ ] Changelog entry added
- [ ] Fix-003 doc updated with refinement note
- [ ] Fix-004 plan marked as complete

### Expected Verdict

**If all tests pass:** ✅ APPROVED — Fix-004 complete, production-ready

**If tests fail:** ❌ CHANGES REQUIRED — document specific failures and return to Frontend Developer

---

## Production Readiness

**After Fix-003:** ⚠️ Can deploy, but has corner case UX issues

**After Fix-004:** ✅ **PRODUCTION-READY** — all edge cases covered, comprehensive corner handling

**Deployment Impact:**
- No breaking changes
- No user-visible regressions
- Improved UX in corner scenarios
- Low risk, high confidence

---

## Version History

| Version | Date | Summary |
|---------|------|---------|
| v1.0.0 | 2026-08-15 | Initial implementation summary created |

---

## Related Documents

- **Fix Plan:** `docs/planning/fix-004-context-menu-edge-refinement.md`
- **Related Fix:** `docs/planning/fix-003-context-menu-positioning.md`
- **Related PRD:** `docs/planning/prd-016-terminal-copy-paste.md`
- **Changelog:** `docs/planning/changelog.md`
- **Component Docs:** `docs/components/terminal.md`, `docs/components/file-explorer.md`
