# PRD-016 Implementation Summary

**For:** Orchestrator Agent
**PRD:** prd-016-terminal-copy-paste.md
**Status:** Ready for Implementation
**Created:** 2026-08-15

---

## Quick Reference

- **Type:** Feature Addition
- **Complexity:** Medium
- **Effort:** 2-2.5 hours
- **Files:** 5 files to modify
- **Risk:** LOW
- **Dependencies:** None (all infrastructure exists)

---

## Implementation Phases

### Phase 1: Backend Clipboard Methods
**Agent:** Backend Developer
**Parallelizable:** Yes (independent of frontend)
**Files:**
- `backend/app.go` — Add GetClipboard() and SetClipboard() methods

**Tasks:**
1. Implement GetClipboard() using go-ole for Windows clipboard read
2. Implement SetClipboard(text string) using go-ole for Windows clipboard write
3. Add error handling for clipboard operations

**Acceptance:**
- [ ] GetClipboard() returns clipboard text or empty string
- [ ] SetClipboard() writes text to clipboard successfully
- [ ] Error handling covers access denied and format issues

---

### Phase 2: Frontend Copy/Paste Handlers
**Agent:** Frontend Developer
**Depends on:** Phase 1 (needs backend methods)
**Files:**
- `src/components/Terminal.tsx` — Add copy/paste logic

**Tasks:**
1. Add handleCopy() function (uses terminal.getSelection() + SetClipboard)
2. Add handlePaste() function (uses GetClipboard() + terminal.paste())
3. Add keyboard event handlers for Ctrl+C and Ctrl+V
4. Add state management for context menu visibility and position

**Key Logic:**
- Ctrl+C only copies if text is selected, otherwise lets xterm.js handle interrupt
- Use xterm.js API: getSelection(), hasSelection(), paste()

**Acceptance:**
- [ ] handleCopy() copies selected text to clipboard
- [ ] handlePaste() inserts clipboard text at cursor
- [ ] Ctrl+C works when text is selected
- [ ] Ctrl+V pastes clipboard content
- [ ] Context menu state tracked correctly

---

### Phase 3: Context Menu UI
**Agent:** Frontend Developer
**Depends on:** Phase 2 (needs handlers)
**Files:**
- `src/components/Terminal.tsx` — Add context menu JSX

**Tasks:**
1. Add context menu JSX with Copy/Paste options
2. Add click-outside-to-close logic
3. Wire menu items to handleCopy/handlePaste
4. Add conditional rendering (disable Copy if no selection)

**UI Structure:**
- Right-click shows context menu at cursor position
- Menu items: "Copy" (conditional), "Paste" (always)
- Copy disabled when no text selected

**Acceptance:**
- [ ] Right-click shows context menu at correct position
- [ ] Copy option disabled when no selection
- [ ] Paste option always enabled
- [ ] Menu closes on click outside
- [ ] Menu items trigger correct handlers

---

### Phase 4: Styling
**Agent:** Frontend Developer
**Depends on:** Phase 3 (needs UI structure)
**Parallelizable:** Yes (independent of logic)
**Files:**
- `src/components/Terminal.module.css` — Add context menu styles (if needed)
- `src/styles/design-system.css` — Verify existing styles

**Tasks:**
1. Check if .context-menu styles exist in design-system.css
2. Add to Terminal.module.css if not present
3. Ensure Mission Control theme consistency

**Acceptance:**
- [ ] Context menu styled consistently with FileExplorer
- [ ] Hover states use Mission Control colors
- [ ] Disabled state has reduced opacity

---

### Phase 5: Wails Bindings Generation
**Agent:** Backend Developer
**Depends on:** Phase 1 (backend methods must exist)
**Files:**
- Auto-generated: `wailsjs/go/main/App.d.ts`, `wailsjs/go/main/App.js`

**Tasks:**
1. Run `wails dev` to regenerate bindings
2. Verify GetClipboard/SetClipboard are exported

**Acceptance:**
- [ ] App.d.ts has GetClipboard and SetClipboard declarations
- [ ] App.js has corresponding implementations

---

### Phase 6: Review & Documentation
**Agent:** Debugger/Reviewer, Documentation
**Depends on:** All implementation phases

**Tasks:**
1. Verify all acceptance criteria
2. Test edge cases (empty clipboard, special chars, long text)
3. Update user guide with copy/paste usage
4. Document clipboard API methods

**Files to Update:**
- `docs/user-guide/file-manager.md` — Add copy/paste section
- `docs/api/clipboard-api.md` — New file documenting backend methods

**Acceptance:**
- [ ] All 11 PRD acceptance criteria pass
- [ ] Edge cases tested and handled
- [ ] User documentation updated
- [ ] API documentation complete

---

## Parallelization Strategy

**Parallel Tracks:**
1. **Track A:** Phase 1 (Backend) → Phase 5 (Bindings)
2. **Track B:** Wait for Phase 1 → Phase 2 (Handlers) → Phase 3 (UI) → Phase 4 (Styling)

**Critical Path:** Phase 1 → Phase 2 → Phase 3 → Phase 6 (2-2.5 hours)

---

## Files to Modify

1. **backend/app.go** (~40 lines added)
   - GetClipboard() method
   - SetClipboard() method
   - Error handling

2. **src/components/Terminal.tsx** (~80 lines added)
   - Copy/paste handlers
   - Context menu state
   - Context menu JSX
   - Keyboard event handlers

3. **src/components/Terminal.module.css** (~26 lines added, if needed)
   - Context menu styles
   - Context menu item styles
   - Hover/disabled states

4. **wailsjs/go/main/App.d.ts** (auto-generated)
   - GetClipboard() type definition
   - SetClipboard() type definition

5. **wailsjs/go/main/App.js** (auto-generated)
   - GetClipboard() implementation
   - SetClipboard() implementation

**Total:** ~146 lines of code across 5 files

---

## Acceptance Criteria Checklist

- [ ] User can select text in terminal with mouse
- [ ] Right-clicking on selected text shows context menu with "Copy" option
- [ ] Clicking "Copy" copies selected text to Windows clipboard
- [ ] Ctrl+C copies selected text when text is selected (does not send SIGINT)
- [ ] Right-clicking in terminal shows context menu with "Paste" option
- [ ] Clicking "Paste" inserts clipboard text at cursor position
- [ ] Ctrl+V pastes clipboard text at cursor position
- [ ] Context menu styling matches FileExplorer context menu (Mission Control design)
- [ ] Clipboard operations handle empty clipboard gracefully
- [ ] Clipboard operations handle special characters (newlines, tabs) correctly
- [ ] No new external dependencies required

---

## Risk Assessment

**Overall Risk:** LOW

**Mitigations in Place:**
- All infrastructure exists (xterm.js, go-ole, Wails bindings)
- Proven UI pattern from FileExplorer
- No new dependencies
- Ctrl+C conflict handled via selection check
- Error handling for clipboard failures

---

## Rollback Plan

All changes are additive (no breaking changes):
1. Remove GetClipboard/SetClipboard from app.go
2. Remove context menu UI and handlers from Terminal.tsx
3. Remove keyboard event listeners
4. Regenerate Wails bindings
5. No database or state rollback needed

---

## Next Steps for Orchestrator

1. Assign Backend Developer to Phase 1
2. Once Phase 1 complete, assign Frontend Developer to Phases 2-4
3. Backend Developer handles Phase 5 (bindings generation)
4. Assign Debugger/Reviewer and Documentation to Phase 6
5. Mark PRD-016 as "In Progress" when implementation starts
6. Update changelog when complete
