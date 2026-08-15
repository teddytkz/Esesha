# Fix Plan: Context Menu Top/Left Edge Handling (Fix-003 Refinement)

**Related PRD:** PRD-016 (Terminal Copy/Paste Functionality)
**Related Fix:** Fix-003 (Context Menu Positioning Bug)
**Severity:** Low
**Reported by:** Debugger/Reviewer (post-Fix-003 implementation review)
**Date:** 2026-08-15

---

## Bug Summary

**Issue:** Context menu positioning incomplete for top and left edges after Fix-003 implementation.

**Original Fix-003 Status:**
- ✅ Bottom edge handling — WORKING (menu flips above cursor)
- ✅ Right edge handling — WORKING (menu flips left of cursor)
- ❌ Top edge handling — INCOMPLETE (clamps to 8px instead of flipping below)
- ❌ Left edge handling — INCOMPLETE (clamps to 8px instead of flipping right)

**Symptom:** 
When the menu flips above the cursor (due to bottom edge proximity) but the flipped position goes negative (top edge proximity), it gets clamped to 8px from the top instead of flipping back below the cursor. Same issue occurs for left edge when menu flips left of cursor.

**Impact:** Menu appears disconnected from cursor in corner regions, creating suboptimal UX.

---

## Root Cause Analysis

### Current Implementation (Fix-003)

```typescript
function adjustContextMenuPosition(
  cursorX: number,
  cursorY: number,
  menuWidth: number,
  menuHeight: number
): { x: number; y: number } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const padding = 8;

  let x = cursorX;
  let y = cursorY;

  // Flip for right/bottom edges
  if (x + menuWidth > viewportWidth - padding) {
    x = contextMenu.x - menuWidth; // ❌ Can go negative
  }
  if (y + menuHeight > viewportHeight - padding) {
    y = contextMenu.y - menuHeight; // ❌ Can go negative
  }

  // Only clamps, doesn't flip back
  x = Math.max(padding, x); // ❌ Clamps negative to 8px - wrong!
  y = Math.max(padding, y); // ❌ Clamps negative to 8px - wrong!

  return { x, y };
}
```

### Problem Breakdown

**Scenario 1: Bottom-right corner, near top edge**
1. User right-clicks at `(1900, 1050)` in `1920x1080` viewport
2. Menu dimensions: `200x150`
3. Bottom edge check: `1050 + 150 = 1200 > 1080 - 8` → flip above
4. Calculated `y = 1050 - 150 = 900` ✅ (positive, works correctly)
5. Right edge check: `1900 + 200 = 2100 > 1920 - 8` → flip left
6. Calculated `x = 1900 - 200 = 1700` ✅ (positive, works correctly)

**Scenario 2: Top-left corner (THE BUG)**
1. User right-clicks at `(100, 100)` in `1920x1080` viewport
2. Menu dimensions: `200x150`
3. Bottom edge check: `100 + 150 = 250 < 1072` → no flip needed
4. Right edge check: `100 + 200 = 300 < 1912` → no flip needed
5. BUT if user is near bottom: flip triggers
6. Calculated `y = 100 - 150 = -50` ❌ (negative!)
7. Clamped to `y = 8` ❌ (menu at top edge, disconnected from cursor)
8. **Expected:** Should flip back below cursor: `y = 100` ✅

**Scenario 3: Top-right corner**
1. User right-clicks at `(1900, 100)`
2. Right edge flip: `x = 1900 - 200 = 1700` ✅
3. Bottom edge flip: `y = 100 - 150 = -50` ❌
4. Clamped to `y = 8` ❌
5. **Expected:** Should flip below: `y = 100` ✅

---

## Why This Happened

**Design oversight in Fix-003:**
- Implemented single-direction flipping (right→left, bottom→above)
- Did not consider that flipped position could overflow opposite edge
- Assumed clamping would be sufficient for edge cases
- Did not test corner scenarios (top-left, top-right, bottom-left when menu is large)

**Why not caught during Fix-003 implementation:**
- Focus was on fixing reported bug (bottom edge clipping)
- Testing likely covered center and bottom/right edges only
- Top/left edge scenarios require intentional testing near those edges

---

## Fix Strategy

### Option A: Flip-Back Logic (Recommended)

**Approach:** After initial flip, check if new position goes negative; if so, flip to opposite direction.

**Algorithm:**
```typescript
function adjustContextMenuPosition(
  cursorX: number,
  cursorY: number,
  menuWidth: number,
  menuHeight: number
): { x: number; y: number } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const padding = 8;

  let x = cursorX;
  let y = cursorY;

  // STEP 1: Check right edge, flip left if needed
  if (x + menuWidth > viewportWidth - padding) {
    x = cursorX - menuWidth;
  }

  // STEP 2: Check if flipped position violates left edge
  if (x < padding) {
    x = cursorX; // Flip back to right of cursor
  }

  // STEP 3: Check bottom edge, flip above if needed
  if (y + menuHeight > viewportHeight - padding) {
    y = cursorY - menuHeight;
  }

  // STEP 4: Check if flipped position violates top edge
  if (y < padding) {
    y = cursorY; // Flip back below cursor
  }

  // STEP 5: Final clamp for extreme cases (menu larger than viewport)
  x = Math.min(Math.max(padding, x), viewportWidth - menuWidth - padding);
  y = Math.min(Math.max(padding, y), viewportHeight - menuHeight - padding);

  return { x, y };
}
```

**Risk:** Very Low — 4 additional lines of code, straightforward logic
**Effort:** XS (15-30 minutes for both components + testing)

### Option B: Smart Direction Selection

**Approach:** Calculate available space in all 4 directions, choose best position.

**Pros:** Optimal positioning in all scenarios
**Cons:** More complex logic, harder to reason about, overkill for this issue

**Risk:** Low-Medium (complexity)
**Effort:** S (1-2 hours)

---

## Recommended Solution: Option A

**Rationale:**
- Minimal code change (4 lines)
- Easy to understand and maintain
- Directly addresses the bug
- Low risk of introducing new issues
- Fast to implement and test

---

## Implementation Plan

### Phase 1: Code Changes

**Depends on:** Nothing (Fix-003 already implemented)
**Parallelizable:** No (same files)

| Task | Agent | Files | Description |
|------|-------|-------|-------------|
| 1.1 | Frontend Developer | `frontend/src/components/Terminal.tsx` | Add left edge flip-back check (2 lines) after right edge flip |
| 1.2 | Frontend Developer | `frontend/src/components/Terminal.tsx` | Add top edge flip-back check (2 lines) after bottom edge flip |
| 1.3 | Frontend Developer | `frontend/src/components/FileExplorer.tsx` | Add identical left edge flip-back check |
| 1.4 | Frontend Developer | `frontend/src/components/FileExplorer.tsx` | Add identical top edge flip-back check |

**Sub-Agent Guidance:**
- All tasks are atomic (cannot be split further)
- Tasks 1.1-1.2 should be done together (same function in Terminal)
- Tasks 1.3-1.4 should be done together (same function in FileExplorer)
- Can parallelize: Terminal (1.1+1.2) AND FileExplorer (1.3+1.4) simultaneously IF two developers available

### Phase 2: Testing

**Depends on:** Phase 1

| Task | Agent | Description |
|------|-------|-------------|
| 2.1 | Debugger/Reviewer | Test all 4 corners + center in Terminal |
| 2.2 | Debugger/Reviewer | Test all 4 corners + center in FileExplorer |
| 2.3 | Debugger/Reviewer | Test at multiple window sizes (1024x768, 1920x1080, 2560x1440) |
| 2.4 | Debugger/Reviewer | Verify no regressions in center/edge positioning |

### Phase 3: Documentation

**Depends on:** Phase 2 (only after tests pass)

| Task | Agent | Description |
|------|-------|-------------|
| 3.1 | Documentation | Update `docs/planning/changelog.md` with Fix-004 entry |
| 3.2 | Documentation | Add note to Fix-003 doc that it was refined by Fix-004 |
| 3.3 | Documentation | Update component docs if needed (likely no change) |

---

## Acceptance Criteria

### Must Pass (12 criteria)

**Terminal Component:**
- [ ] Right-click at top-left corner (50, 50) — menu appears at cursor or slightly right/below
- [ ] Right-click at top-right corner (1900, 50) — menu flips left and appears at/below cursor
- [ ] Right-click at bottom-left corner (50, 1050) — menu flips above and appears at/right of cursor
- [ ] Right-click at bottom-right corner (1900, 1050) — menu flips above and left
- [ ] Right-click at center (960, 540) — menu appears at cursor (no adjustment)
- [ ] Menu NEVER gets clamped to 8px from top edge (unless menu > viewport height)
- [ ] Menu NEVER gets clamped to 8px from left edge (unless menu > viewport width)

**FileExplorer Component:**
- [ ] Same 4-corner test as Terminal — all corners handled correctly
- [ ] Center positioning unchanged

**Regression Prevention:**
- [ ] All Fix-003 acceptance criteria still pass (bottom/right edge handling)
- [ ] No visual flicker or position jump
- [ ] Existing functionality preserved (Copy/Paste, keyboard nav, etc.)

---

## Testing Scenarios

### Corner Test Matrix

| Location | Cursor Position | Expected Menu Position | Notes |
|----------|----------------|------------------------|-------|
| **Top-left** | (50, 50) | (50, 50) or slightly offset | May flip right/below if menu > 50px from edge |
| **Top-right** | (1870, 50) | (~1670, 50) | Flips left of cursor; stays at/below cursor Y |
| **Bottom-left** | (50, 1030) | (50, ~880) | Flips above cursor; stays at/right of cursor X |
| **Bottom-right** | (1870, 1030) | (~1670, ~880) | Flips both left and above |
| **Center** | (960, 540) | (960, 540) | No adjustment needed |

**Assumptions:** 
- Viewport: 1920x1080
- Menu size: ~200x150 (typical for both components)
- Padding: 8px

### Window Size Tests

Test at each size with all 4 corners + center:

1. **Small (1024x768):**
   - More aggressive flipping due to limited space
   - Verify no clipping at any corner

2. **Standard (1920x1080):**
   - Primary test scenario
   - Should handle all corners gracefully

3. **Large (2560x1440):**
   - Less flipping needed (more space)
   - Verify logic doesn't break with larger viewport

### Extreme Edge Case

**Menu larger than viewport (rare):**
- Viewport: 800x600
- Menu: 250x200 (after adding more options in future)
- Expected: Final clamp ensures menu fits; may scroll

---

## Code Changes Detail

### Terminal.tsx — adjustContextMenuPosition()

**Current code (Fix-003):**
```typescript
function adjustContextMenuPosition(
  cursorX: number,
  cursorY: number,
  menuWidth: number,
  menuHeight: number
): { x: number; y: number } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const padding = 8;

  let x = cursorX;
  let y = cursorY;

  // Check right edge overflow
  if (x + menuWidth + padding > viewportWidth) {
    x = cursorX - menuWidth; // Flip to left of cursor
  }

  // Check bottom edge overflow
  if (y + menuHeight + padding > viewportHeight) {
    y = cursorY - menuHeight; // Flip above cursor
  }

  // Clamp to viewport (prevent negative coordinates)
  x = Math.max(padding, Math.min(x, viewportWidth - menuWidth - padding));
  y = Math.max(padding, Math.min(y, viewportHeight - menuHeight - padding));

  return { x, y };
}
```

**New code (Fix-004):**
```typescript
function adjustContextMenuPosition(
  cursorX: number,
  cursorY: number,
  menuWidth: number,
  menuHeight: number
): { x: number; y: number } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const padding = 8;

  let x = cursorX;
  let y = cursorY;

  // Check right edge overflow
  if (x + menuWidth + padding > viewportWidth) {
    x = cursorX - menuWidth; // Flip to left of cursor
  }

  // NEW: Check if flipped position violates left edge
  if (x < padding) {
    x = cursorX; // Flip back to right of cursor
  }

  // Check bottom edge overflow
  if (y + menuHeight + padding > viewportHeight) {
    y = cursorY - menuHeight; // Flip above cursor
  }

  // NEW: Check if flipped position violates top edge
  if (y < padding) {
    y = cursorY; // Flip back below cursor
  }

  // Final clamp for extreme cases (menu larger than viewport)
  x = Math.max(padding, Math.min(x, viewportWidth - menuWidth - padding));
  y = Math.max(padding, Math.min(y, viewportHeight - menuHeight - padding));

  return { x, y };
}
```

**Changes:**
- Line ~X: Add left edge flip-back check
- Line ~Y: Add top edge flip-back check
- Comment update: "Final clamp for extreme cases" (clarifies intent)

**Identical changes apply to FileExplorer.tsx**

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Infinite flip loop (flip left → flip right → flip left...) | High (browser hang) | Very Low | Algorithm checks edges sequentially; flip-back only happens if first flip caused overflow |
| Menu still clips in extreme corner cases | Low (minor UX issue) | Very Low | Final clamp ensures menu always fits; only happens if menu > viewport |
| Regression in center positioning | Medium (breaks existing behavior) | Very Low | Center positioning unaffected (no flips trigger); add regression test |
| Performance impact from additional checks | Low (perceived delay) | Very Low | 2 simple comparisons per right-click; negligible overhead |

---

## Rollback Strategy

**If issues occur:**

1. **Immediate rollback:** 
   - Remove the 4 added lines (2 per component)
   - Revert to Fix-003 implementation
   - Document known issue: "Context menu may clip in top-left corner scenarios"

2. **Partial rollback:**
   - Keep Y-axis fix (top edge), revert X-axis fix (left edge) — or vice versa
   - Only if one axis has issues and the other works

3. **User workaround:**
   - "Avoid right-clicking in extreme corner regions"
   - Low impact (corners are rarely used)

**Rollback risk:** Very low
- Changes are minimal (4 lines total)
- No state mutations or data changes
- Easy to revert to Fix-003 state

---

## Version History

| Version | Date | Summary |
|---------|------|---------|
| v1.0.0 | 2026-08-15 | Initial fix plan for top/left edge refinement |

---

## Notes for Frontend Developer

### Implementation Checklist

- [ ] Read Fix-003 implementation to understand current code
- [ ] Locate `adjustContextMenuPosition()` in Terminal.tsx
- [ ] Add left edge flip-back check after right edge flip
- [ ] Add top edge flip-back check after bottom edge flip
- [ ] Repeat for FileExplorer.tsx
- [ ] Test all 4 corners manually before submitting
- [ ] Verify no regressions in center positioning
- [ ] Remove any debug console.log statements

### Testing During Development

**Quick manual test:**
```typescript
// Add temporary test button in toolbar
<button onClick={() => {
  const testPositions = [
    { x: 50, y: 50, label: 'top-left' },
    { x: 1870, y: 50, label: 'top-right' },
    { x: 50, y: 1030, label: 'bottom-left' },
    { x: 1870, y: 1030, label: 'bottom-right' },
    { x: 960, y: 540, label: 'center' },
  ];
  testPositions.forEach(pos => {
    console.log(`[${pos.label}]`, adjustContextMenuPosition(pos.x, pos.y, 200, 150));
  });
}}>Test Corners</button>
```

**Expected console output:**
```
[top-left] { x: 50, y: 50 }       // No flip needed (sufficient space)
[top-right] { x: 1670, y: 50 }    // Flipped left, stayed below
[bottom-left] { x: 50, y: 880 }   // Flipped above, stayed right
[bottom-right] { x: 1670, y: 880 } // Flipped both left and above
[center] { x: 960, y: 540 }       // No adjustment
```

Remove test button before committing.

---

## Documentation Updates Required

1. **Changelog Entry:**
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

2. **Update Fix-003 Doc:**
Add note at top:
```markdown
> **Note:** This fix was refined by Fix-004 on 2026-08-15 to add top/left edge flip-back logic.
> See: `docs/planning/fix-004-context-menu-edge-refinement.md`
```

3. **Component Docs (Optional):**
- Likely no update needed (already documented in Fix-003)
- If updating, add: "Handles all 4 viewport corners with smart flip-back logic"

---

## Success Metrics

**Definition of Done:**
- ✅ All 12 acceptance criteria pass
- ✅ No regressions in Fix-003 behavior
- ✅ Manual testing confirms menu never disconnected from cursor
- ✅ Debugger/Reviewer approves
- ✅ Changelog updated
- ✅ No console errors or warnings

**Estimated Implementation Time:**
- Code changes: 15 minutes
- Testing: 15 minutes
- Documentation: 10 minutes
- **Total: ~40 minutes**

**Production Readiness:**
- After Fix-004: **YES** — all edge cases covered, production-ready
