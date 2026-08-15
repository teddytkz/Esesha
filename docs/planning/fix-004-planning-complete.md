# ✅ Fix-004 Planning Complete

**Fix:** Context Menu Top/Left Edge Handling (Fix-003 Refinement)  
**Status:** PLANNED — Ready for Implementation  
**Planner:** Planner Agent  
**Date:** 2026-08-15  
**Time:** 03:58 UTC

---

## Documents Created

1. **Fix Plan:** `docs/planning/fix-004-context-menu-edge-refinement.md`
   - Full bug analysis with root cause
   - Detailed fix strategy (flip-back logic)
   - Code changes specification
   - Testing scenarios for all 4 corners
   - Acceptance criteria (12 total)
   - Risk assessment and rollback plan

2. **Implementation Summary:** `docs/planning/fix-004-implementation-summary.md`
   - Quick reference for Orchestrator
   - Task breakdown with time estimates
   - Agent assignments (Frontend Developer → Debugger/Reviewer → Documentation)
   - Acceptance criteria checklist
   - Testing matrix (10 tests)
   - Documentation update requirements

3. **Changelog Updated:** `docs/planning/changelog.md`
   - Added Fix-004 entry under `### Fixed`
   - Updated Fix-003 entry with refinement note
   - Proper cross-referencing

4. **Fix-003 Doc Updated:** `docs/planning/fix-003-context-menu-positioning.md`
   - Added refinement note at top
   - Links to Fix-004 documentation

---

## Planning Summary

### What Was Analyzed

**Input:** Debugger/Reviewer bug report for incomplete Fix-003 implementation
- ✅ Bottom edge handling — WORKING
- ✅ Right edge handling — WORKING
- ❌ Top edge handling — INCOMPLETE (clamps to 8px instead of flipping below)
- ❌ Left edge handling — INCOMPLETE (clamps to 8px instead of flipping right)

**Root Cause Identified:**
- Fix-003 implemented single-direction flipping (right→left, bottom→above)
- Did not consider that flipped position could overflow opposite edge
- Clamping logic treats negative positions as edge-of-viewport, disconnecting menu from cursor

**Solution Designed:**
- Add flip-back checks after each flip operation
- If flipped X position < padding → flip back right of cursor
- If flipped Y position < padding → flip back below cursor
- Minimal change: 4 lines of code (2 per component)

---

## Decision Made: Fix-004 (New Fix Number)

**Why not amend Fix-003?**
- Fix-003 already implemented and partially working
- Fix-004 is a refinement/enhancement, not a correction of a broken implementation
- Separate fix numbers provide clear audit trail
- Easier to track: Fix-003 solved reported bug, Fix-004 completes corner handling

**Fix numbering:**
- Fix-003: Bottom/right edge handling (original reported bug)
- Fix-004: Top/left edge handling (refinement from code review)

---

## Implementation Roadmap for Orchestrator

### Phase 1: Code Changes (Frontend Developer)

**Files to modify:**
1. `frontend/src/components/Terminal.tsx`
   - Locate `adjustContextMenuPosition()` function
   - Add 2 lines: left edge flip-back + top edge flip-back

2. `frontend/src/components/FileExplorer.tsx`
   - Locate `adjustContextMenuPosition()` function
   - Add identical 2 lines

**Effort:** 15 minutes (copy-paste pattern)

**Parallelizable:** No need (same developer, quick task)

### Phase 2: Testing (Debugger/Reviewer)

**Test scenarios:**
- All 4 corners in Terminal (top-left, top-right, bottom-left, bottom-right)
- All 4 corners in FileExplorer
- Center positioning (regression check)
- Multiple window sizes (1024×768, 1920×1080, 2560×1440)

**Effort:** 15 minutes

**Acceptance:** All 12 criteria must pass

### Phase 3: Documentation (Documentation Agent)

**Updates required:**
1. Changelog — add Fix-004 entry ✅ (already done by Planner)
2. Fix-003 doc — add refinement note ✅ (already done by Planner)
3. Component docs — no changes needed (internal refinement)

**Effort:** 5 minutes (verification only)

**Total Estimated Time:** ~40 minutes

---

## Key Information for Orchestrator

### Agent Routing

**Primary Agent:** Frontend Developer
- Responsible for code changes in both components
- Must ensure identical logic in Terminal and FileExplorer
- Self-test before submitting to Debugger/Reviewer

**Secondary Agent:** Debugger/Reviewer
- Verify all 12 acceptance criteria
- Test at multiple window sizes
- Check for regressions in Fix-003 behavior
- Approve or request changes

**Tertiary Agent:** Documentation (optional)
- Verify changelog and Fix-003 doc updated (already done by Planner)
- No additional docs needed

### Acceptance Criteria (12 total)

**Must all pass:**
1. Terminal top-left corner — menu at/near cursor (no edge clamp)
2. Terminal top-right corner — menu flips left, stays at/below cursor
3. Terminal bottom-left corner — menu flips above, stays at/right of cursor
4. Terminal bottom-right corner — menu flips both left and above
5. Terminal center — menu at cursor (no adjustment)
6. Menu NEVER clamped to 8px from top edge
7. Menu NEVER clamped to 8px from left edge
8. FileExplorer 4-corner test — all correct
9. FileExplorer center — unchanged
10. All Fix-003 behavior preserved
11. No visual flicker or position jump
12. Existing functionality intact

### Risk Assessment

**Very Low Risk:**
- 4 lines of code
- Isolated positioning logic
- No state mutations
- Easy rollback (delete 4 lines)
- No performance impact

**Production Readiness:**
- After Fix-003: ⚠️ Works but has corner case UX issues
- After Fix-004: ✅ Production-ready (all edges covered)

---

## Files Modified by Planner

1. ✅ Created `fix-004-context-menu-edge-refinement.md` (fix plan)
2. ✅ Created `fix-004-implementation-summary.md` (orchestrator guide)
3. ✅ Updated `changelog.md` (added Fix-004 entry, updated Fix-003 note)
4. ✅ Updated `fix-003-context-menu-positioning.md` (added refinement note)
5. ✅ Created `fix-004-planning-complete.md` (this file)

---

## Next Steps

**Orchestrator Actions:**
1. Read `fix-004-implementation-summary.md` for task breakdown
2. Assign to Frontend Developer with both files (Terminal.tsx, FileExplorer.tsx)
3. After implementation, route to Debugger/Reviewer with test matrix
4. After approval, mark Fix-004 as complete
5. Update Fix-003 status to "Enhanced by Fix-004"

**Frontend Developer Actions:**
1. Read `fix-004-context-menu-edge-refinement.md` (full context)
2. Locate `adjustContextMenuPosition()` in both components
3. Add 4 lines total (2 per component) as specified
4. Self-test all 4 corners + center
5. Submit for review

**Debugger/Reviewer Actions:**
1. Review code changes (verify identical logic)
2. Execute test matrix (10 manual tests)
3. Verify all 12 acceptance criteria
4. Approve or request changes

---

## Success Criteria

**Planning Phase (This Document):**
- ✅ Bug analyzed and root cause identified
- ✅ Fix strategy designed and documented
- ✅ Effort estimated (XS, ~40 minutes)
- ✅ Risk assessed (Very Low)
- ✅ Implementation plan created with clear tasks
- ✅ Acceptance criteria defined (12 total)
- ✅ Testing strategy specified
- ✅ Documentation updated (changelog, Fix-003 doc)
- ✅ All required files created

**Implementation Phase (Next):**
- ⏳ Code changes applied to both components
- ⏳ All 12 acceptance criteria pass
- ⏳ Debugger/Reviewer approval
- ⏳ No regressions detected
- ⏳ Production deployment

---

## Planning Checklist ✅

- [x] Every task has a specific agent assigned
- [x] Every task lists exact file paths
- [x] No two parallel tasks modify the same file
- [x] Acceptance criteria are testable (not vague)
- [x] Codebase context from existing Fix-003 referenced
- [x] Review phase (Debugger/Reviewer) included
- [x] Documentation phase included
- [x] Rollback strategy defined
- [x] Version number assigned (Fix-004)
- [x] All required files saved to `docs/planning/`
- [x] Changelog updated
- [x] Related documents cross-referenced

---

## Planner Agent Sign-Off

**Status:** ✅ PLANNING COMPLETE — Ready for Orchestrator handoff

**Confidence:** High
- Minimal code change (4 lines)
- Clear implementation path
- Low risk, easy rollback
- Comprehensive testing plan
- All documentation prepared

**Estimated Success Rate:** 95%
- 5% risk from: edge case testing might reveal additional scenarios

**Recommendation:** Proceed to implementation immediately

---

**Planner Agent**  
2026-08-15 03:58 UTC
