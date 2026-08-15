# Fix Plan: Context Menu Positioning Bug

**Related PRD:** PRD-016 (Terminal Copy/Paste Functionality)
**Severity:** Medium
**Reported by:** User (post-implementation feedback)
**Date:** 2026-08-15

> **Refinement Note:** This fix was enhanced by Fix-004 on 2026-08-15 to add top/left edge flip-back logic.  
> See: `docs/planning/fix-004-context-menu-edge-refinement.md`

---

## Bug Summary

**Issue:** Context menu "Paste" button tenggelam (clipped/hidden) when user right-clicks near the bottom edge of the terminal window.

**User Description (Indonesian):** "jika klik kanan nya agak di bawah di terminal maka tombol paste nya tenggelam"

**Translation:** When right-clicking near the bottom of the terminal, the Paste button gets hidden/clipped.

**Symptom:** Context menu renders at the exact cursor position without checking viewport boundaries. When the cursor is near the bottom or right edge, the menu extends beyond the visible area, causing buttons (especially "Paste" which is second in the menu) to be clipped or completely hidden.

---

## Root Cause Analysis

### Current Implementation

**Terminal.tsx (lines ~307):**
```typescript
<div
  ref={contextMenuRef}
  className={styles.contextMenu}
  role="menu"
  tabIndex={-1}
  onKeyDown={handleMenuKeyDown}
  style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
>
```

**FileExplorer.tsx (lines ~635):**
```typescript
<div className={styles.contextMenu} style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}>
```

**Problem:**
1. Both components use `position: fixed` with direct cursor coordinates (`clientX`, `clientY`)
2. No boundary detection — menu always renders at cursor position
3. No viewport overflow checking
4. Menu dimensions not measured before positioning

**Why This Happened:**
- PRD-016 implementation followed the existing FileExplorer pattern exactly
- FileExplorer has the same bug but was not reported yet
- Standard "quick implementation" approach without defensive positioning logic

---

## Similar Patterns Analysis

**FileExplorer Context Menu:**
- Same positioning logic: `{ left: contextMenu.x, top: contextMenu.y }`
- Same vulnerability: will clip near edges
- Menu has 5 buttons (Edit, Download, Rename, Change Permissions, Delete)
- Likely affects users who right-click near bottom/right edges but not reported yet

**Recommendation:** Fix both components simultaneously to prevent duplicate work.

---

## Fix Strategy

### Option A: Viewport Boundary Detection (Recommended)

**Approach:** Calculate menu dimensions and viewport boundaries, then adjust position to keep entire menu visible.

**Algorithm:**
1. Measure menu element dimensions after render (using `ref.current.getBoundingClientRect()`)
2. Compare menu bottom edge with `window.innerHeight`
3. Compare menu right edge with `window.innerWidth`
4. If menu overflows bottom: flip above cursor (`top = cursorY - menuHeight`)
5. If menu overflows right: flip left of cursor (`left = cursorX - menuWidth`)
6. Ensure flipped position doesn't create negative coordinates (clamp to viewport)

**Risk:** Low — standard pattern used by most context menu libraries
**Effort:** S (2-3 hours for both components)

### Option B: CSS-Only Solution

**Approach:** Use CSS transforms and viewport units to constrain menu position.

**Limitations:**
- Cannot measure menu dimensions dynamically
- Requires fixed menu dimensions
- Less reliable across different content lengths

**Risk:** Medium — menu might still clip with longer button labels or localization
**Effort:** XS (1 hour) but less robust

---

## Recommended Solution: Option A

**Rationale:**
- Robust across all viewport sizes and menu dimensions
- Handles dynamic content (future localization, icon changes)
- Industry-standard approach
- Low implementation risk

---

## Implementation Tasks

| Task | Agent | Files | Description |
|------|-------|-------|-------------|
| 1.1 | Frontend Developer | `frontend/src/components/Terminal.tsx` | Add `adjustContextMenuPosition()` helper function; measure menu dimensions; calculate adjusted position; apply before setState |
| 1.2 | Frontend Developer | `frontend/src/components/FileExplorer.tsx` | Add same `adjustContextMenuPosition()` helper; integrate into `handleContextMenu()` |
| 1.3 | Frontend Developer | `frontend/src/components/Terminal.tsx` | Add `useLayoutEffect` to adjust position after menu renders (handle dynamic content) |
| 1.4 | Frontend Developer | `frontend/src/components/FileExplorer.tsx` | Add same `useLayoutEffect` for post-render adjustment |
| 1.5 | Debugger/Reviewer | Both files | Verify menu never clips at edges; test all four viewport corners; test different window sizes |

---

## Technical Design

### Positioning Algorithm

```typescript
/**
 * Adjust context menu position to prevent viewport overflow
 * @param cursorX - Mouse event clientX
 * @param cursorY - Mouse event clientY
 * @param menuWidth - Context menu element width
 * @param menuHeight - Context menu element height
 * @returns Adjusted { x, y } coordinates
 */
function adjustContextMenuPosition(
  cursorX: number,
  cursorY: number,
  menuWidth: number,
  menuHeight: number
): { x: number; y: number } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const padding = 8; // Minimum distance from viewport edge

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

### Integration Pattern

**Step 1: Initial Position (synchronous)**
```typescript
const handleContextMenu = useCallback((e: React.MouseEvent) => {
  e.preventDefault();
  setHasSelection(!!term && term.hasSelection());
  
  // Set initial position at cursor (will be adjusted after render)
  setContextMenu({ x: e.clientX, y: e.clientY });
}, []);
```

**Step 2: Post-Render Adjustment (useLayoutEffect)**
```typescript
useLayoutEffect(() => {
  if (!contextMenu || !contextMenuRef.current) return;
  
  const rect = contextMenuRef.current.getBoundingClientRect();
  const adjusted = adjustContextMenuPosition(
    contextMenu.x,
    contextMenu.y,
    rect.width,
    rect.height
  );
  
  // Only update if position changed (prevent infinite loop)
  if (adjusted.x !== contextMenu.x || adjusted.y !== contextMenu.y) {
    setContextMenu(adjusted);
  }
}, [contextMenu]);
```

**Why useLayoutEffect?**
- Runs synchronously after DOM mutations, before browser paint
- Prevents visible "jump" from initial to adjusted position
- Menu appears in correct position on first render

---

## Acceptance Criteria

- [ ] Context menu never clips when right-clicking near bottom edge of terminal
- [ ] Context menu never clips when right-clicking near right edge of terminal
- [ ] Context menu flips above cursor when insufficient space below
- [ ] Context menu flips left of cursor when insufficient space on right
- [ ] Menu maintains minimum 8px padding from all viewport edges
- [ ] No visual "jump" or flicker when menu adjusts position
- [ ] FileExplorer context menu has identical positioning behavior
- [ ] Behavior works across different window sizes (tested at 1024x768, 1920x1080, 2560x1440)
- [ ] Behavior works when terminal/FileExplorer is in split view (reduced viewport height)
- [ ] All existing context menu functionality preserved (Copy/Paste, keyboard nav, focus management)

---

## Regression Risk

**Low Risk Areas:**
- Context menu content (buttons, icons, text)
- Keyboard navigation (arrow keys, Enter, Esc)
- Copy/Paste functionality

**Medium Risk Areas:**
- Menu rendering performance (additional measurement/calculation on every right-click)
- Edge case: extremely small viewport (< menu dimensions) — need clamping logic

**Mitigation:**
- Use `useLayoutEffect` to prevent visual artifacts
- Add minimum viewport size guard (if viewport < menu size, position at top-left with scroll)
- Test on various window sizes before approval

---

## Testing Checklist

### Terminal Component

- [ ] Right-click near bottom edge (< 100px from bottom) — menu flips above cursor
- [ ] Right-click near right edge (< 200px from right) — menu flips left of cursor
- [ ] Right-click near bottom-right corner — menu flips both above and left
- [ ] Right-click in center of viewport — menu appears at cursor (no adjustment)
- [ ] Test with terminal in split view (reduced height)
- [ ] Test at 1024x768 window size
- [ ] Test at 1920x1080 window size
- [ ] Test at 2560x1440 window size
- [ ] Verify "Paste" button always visible and clickable
- [ ] Verify no visible flicker or position jump

### FileExplorer Component

- [ ] Right-click on file near bottom edge — menu flips above cursor
- [ ] Right-click on file near right edge — menu flips left of cursor
- [ ] Right-click on file near bottom-right corner — menu flips both directions
- [ ] Right-click in center of file list — menu appears at cursor
- [ ] Test with FileExplorer in split view
- [ ] Test at different window sizes
- [ ] Verify all 5 menu buttons always visible
- [ ] Verify no position jump

### Cross-Component Consistency

- [ ] Both components use identical positioning algorithm
- [ ] Both components have same `padding` constant (8px)
- [ ] Both components handle edge cases identically
- [ ] Code is factored for potential reuse (future: extract to shared utility?)

---

## Rollback Strategy

**If positioning logic causes issues:**

1. **Immediate rollback:** Remove `adjustContextMenuPosition()` and `useLayoutEffect`; revert to original `{ x: cursorX, y: cursorY }` positioning
2. **Partial rollback:** Keep Terminal fix, revert FileExplorer (or vice versa) if only one component has issues
3. **User workaround:** Document known issue: "Avoid right-clicking near window edges; menu may be clipped"

**Rollback risk:** Very low — changes are isolated to positioning logic; no data/state mutations

---

## Implementation Guidance for Frontend Developer

### Code Structure

1. **Create helper function** at top of component (before component definition):
   ```typescript
   function adjustContextMenuPosition(...): { x: number; y: number } {
     // Algorithm from Technical Design section
   }
   ```

2. **Add useLayoutEffect** inside component (after existing useEffect hooks):
   ```typescript
   useLayoutEffect(() => {
     // Post-render adjustment logic
   }, [contextMenu]);
   ```

3. **No changes needed** to:
   - `handleContextMenu` callback
   - Context menu JSX structure
   - CSS styles
   - Keyboard navigation logic

### Testing During Development

1. Add temporary button in toolbar: "Show menu at (10, 10)" for testing without clicking
2. Add console.log in `adjustContextMenuPosition` to verify calculations:
   ```typescript
   console.log('[adjustContextMenuPosition]', {
     cursor: { x: cursorX, y: cursorY },
     menu: { width: menuWidth, height: menuHeight },
     viewport: { width: viewportWidth, height: viewportHeight },
     adjusted: { x, y }
   });
   ```
3. Remove debug code before submitting for review

---

## Documentation Updates

**Files to update after implementation:**

1. `docs/components/terminal.md` — Add note about context menu viewport-aware positioning
2. `docs/components/file-explorer.md` — Add note about context menu positioning behavior
3. `docs/planning/changelog.md` — Add entry under `### Fixed` section

**Example changelog entry:**
```markdown
- [2026-08-15] **Fix-003: Context Menu Positioning Bug** — Fixed context menu clipping near viewport edges
  - **Severity:** Medium
  - **Issue:** Context menu "Paste" button hidden when right-clicking near bottom/right edges
  - **Solution:** Viewport boundary detection with automatic position adjustment (flip above/left when needed)
  - **Files Modified:** `frontend/src/components/Terminal.tsx`, `frontend/src/components/FileExplorer.tsx`
  - **Impact:** Menu always fully visible; no edge-clipping in either Terminal or FileExplorer
  - **See:** `docs/planning/fix-003-context-menu-positioning.md`
```

---

## Version History

| Version | Date       | Summary                          |
|---------|------------|----------------------------------|
| v1.0.0  | 2026-08-15 | Initial fix plan created         |

---

## Planner Checklist

- [x] Every task has a specific agent assigned
- [x] Every task lists exact file paths
- [x] No two parallel tasks modify the same file
- [x] Acceptance criteria are testable (not vague)
- [x] Codebase context from current files is referenced
- [x] Review phase (Debugger/Reviewer) is included
- [x] Documentation phase is included
- [x] Security review NOT required (UI-only change)
- [x] Rollback strategy defined
- [x] Version number assigned
