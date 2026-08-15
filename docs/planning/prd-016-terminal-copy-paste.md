# PRD-016: Terminal Copy/Paste Functionality

**Version:** v1.1.0
**Status:** In Progress (Bug Fix Required - See Fix-002)
**Author:** Planner Agent
**Created:** 2026-08-15
**Updated:** 2026-08-15

---

## Overview

Add standard copy/paste functionality to the terminal component, enabling users to copy terminal output and paste text into the terminal using both context menu (right-click) and keyboard shortcuts (Ctrl+C, Ctrl+V).

## Problem Statement

Users cannot currently copy text from terminal output or paste commands into the terminal, requiring them to manually retype commands and output. This is a standard expectation for any terminal interface and its absence creates friction in the user experience.

## Goals

- Enable users to copy selected terminal text to system clipboard
- Enable users to paste text from system clipboard into terminal
- Support both right-click context menu and keyboard shortcuts
- Maintain consistency with FileExplorer's existing context menu pattern
- Ensure clipboard operations work reliably on Windows

## Non-Goals

- Multi-platform clipboard support (focus on Windows only for now)
- Rich text/formatted content (plain text only)
- Clipboard history or management features
- Auto-copy on selection (optional stretch goal, not in v1.0.0)

---

## Feature Specification

### User Stories

- As a terminal user, I want to copy terminal output text, so that I can save logs, error messages, or command results for documentation or sharing
- As a terminal user, I want to paste commands from clipboard, so that I can quickly execute complex or previously-saved commands without retyping
- As a terminal user, I want to use standard keyboard shortcuts (Ctrl+C for copy, Ctrl+V for paste), so that the terminal behaves like other Windows applications

### Acceptance Criteria

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

## Technical Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│ Terminal Component (React + xterm.js)               │
│                                                      │
│  ┌──────────────────┐         ┌──────────────────┐ │
│  │ Selection Event  │────────>│ Context Menu     │ │
│  │ (xterm.js)       │         │ (Right-click)    │ │
│  └──────────────────┘         └──────────────────┘ │
│           │                            │            │
│           v                            v            │
│  ┌──────────────────────────────────────────────┐  │
│  │ Copy/Paste Handlers                          │  │
│  │ - handleCopy()                                │  │
│  │ - handlePaste()                               │  │
│  │ - handleContextMenu()                         │  │
│  └──────────────────────────────────────────────┘  │
│           │                            │            │
└───────────┼────────────────────────────┼────────────┘
            │                            │
            v                            v
┌───────────────────────────────────────────────────┐
│ Wails Runtime Bridge                              │
│ - GetClipboard() → Promise<string>                │
│ - SetClipboard(text: string) → Promise<void>      │
└───────────────────────────────────────────────────┘
            │                            │
            v                            v
┌───────────────────────────────────────────────────┐
│ Go Backend (app.go)                               │
│                                                    │
│  func (a *App) GetClipboard() string              │
│  func (a *App) SetClipboard(text string) error    │
│                                                    │
│  Uses: github.com/go-ole/go-ole (existing)        │
└───────────────────────────────────────────────────┘
            │
            v
┌───────────────────────────────────────────────────┐
│ Windows Clipboard API (via go-ole)                │
└───────────────────────────────────────────────────┘
```

### Codebase Context

**Existing Patterns to Reuse:**
1. **Context Menu Pattern** (`FileExplorer.tsx` lines 180-250):
   - Right-click event handling
   - Conditional menu items based on selection state
   - Positioning logic
   - Click-outside-to-close behavior

2. **Clipboard Backend** (`backend/app.go`):
   - go-ole already imported and used for secure storage
   - No new dependencies needed

3. **Design System** (`src/styles/design-system.css`):
   - Mission Control theme variables (--color-primary-900, etc.)
   - Existing context menu styles from FileExplorer

4. **xterm.js API** (`Terminal.tsx`):
   - `terminal.getSelection()` - gets selected text
   - `terminal.hasSelection()` - checks if text is selected
   - `terminal.paste(text)` - inserts text at cursor
   - `terminal.on('selection', handler)` - selection change events

### Data Model

No database or state management changes required. All state is ephemeral (clipboard content, selection state).

### API Changes

**New Backend Methods:**

```go
// backend/app.go

// GetClipboard retrieves the current text content from the Windows clipboard
func (a *App) GetClipboard() (string, error) {
    // Implementation using go-ole to access Windows clipboard
    // Returns clipboard text or empty string if clipboard is empty/non-text
}

// SetClipboard sets text content to the Windows clipboard
func (a *App) SetClipboard(text string) error {
    // Implementation using go-ole to write to Windows clipboard
    // Returns error if clipboard operation fails
}
```

**Generated TypeScript Bindings:**

```typescript
// wailsjs/go/main/App.d.ts
export function GetClipboard(): Promise<string>;
export function SetClipboard(text: string): Promise<void>;
```

### UI Changes

**Context Menu (Right-Click):**
- Position: At mouse cursor position
- Options:
  - "Copy" (enabled when text is selected)
  - "Paste" (always enabled)
- Styling: Match FileExplorer context menu
- Behavior: Close on click outside, close on option select

**Keyboard Shortcuts:**
- Ctrl+C: Copy selected text (only when text is selected, otherwise behaves as normal terminal interrupt)
- Ctrl+V: Paste clipboard content

**Visual Feedback:**
- Selected text uses xterm.js default selection highlighting (blue background)
- Context menu hover states use Mission Control hover colors

---

## Implementation Plan

### Phase 1: Backend Clipboard Methods

**Depends on:** Nothing
**Parallelizable:** Yes (independent of frontend)

| Task | Agent              | Files                    | Description                                                                 |
| ---- | ------------------ | ------------------------ | --------------------------------------------------------------------------- |
| 1.1  | Backend Developer  | `backend/app.go`         | Implement GetClipboard() method using go-ole to read Windows clipboard      |
| 1.2  | Backend Developer  | `backend/app.go`         | Implement SetClipboard(text string) method using go-ole to write clipboard  |
| 1.3  | Backend Developer  | `backend/app.go`         | Add error handling for clipboard operations (access denied, format issues)  |

**Implementation Guidance:**
- Use `github.com/go-ole/go-ole` (already in go.mod)
- Reference Windows clipboard COM interface: `IDataObject`
- Handle CF_TEXT and CF_UNICODETEXT formats
- Return empty string (not error) if clipboard is empty or contains non-text
- Ensure proper COM initialization/cleanup

**Sub-Agent Guidance:**
- Task 1.1 and 1.2 can be implemented in parallel if split between two agents
- Task 1.3 should be done after 1.1 and 1.2 are complete

### Phase 2: Frontend Copy/Paste Handlers

**Depends on:** Phase 1 (needs backend methods)
**Parallelizable:** No (single file, sequential logic)

| Task | Agent               | Files                         | Description                                                      |
| ---- | ------------------- | ----------------------------- | ---------------------------------------------------------------- |
| 2.1  | Frontend Developer  | `src/components/Terminal.tsx` | Add handleCopy() function using terminal.getSelection() + SetClipboard |
| 2.2  | Frontend Developer  | `src/components/Terminal.tsx` | Add handlePaste() function using GetClipboard() + terminal.paste()     |
| 2.3  | Frontend Developer  | `src/components/Terminal.tsx` | Add keyboard event handlers for Ctrl+C and Ctrl+V                      |
| 2.4  | Frontend Developer  | `src/components/Terminal.tsx` | Add state management for context menu visibility and position          |

**Implementation Guidance:**
- Copy logic:
  ```typescript
  const handleCopy = async () => {
    if (!terminalRef.current) return;
    const selection = terminalRef.current.getSelection();
    if (selection) {
      await SetClipboard(selection);
    }
  };
  ```
- Paste logic:
  ```typescript
  const handlePaste = async () => {
    if (!terminalRef.current) return;
    const text = await GetClipboard();
    if (text) {
      terminalRef.current.paste(text);
    }
  };
  ```
- Ctrl+C behavior: Only copy if `terminal.hasSelection()` returns true, otherwise let xterm.js handle as interrupt
- Use `onContextMenu` event on terminal container div

**Sub-Agent Guidance:**
- Tasks 2.1-2.4 are atomic and sequential — no split needed

### Phase 3: Context Menu UI

**Depends on:** Phase 2 (needs handlers)
**Parallelizable:** No (single file, depends on handlers)

| Task | Agent               | Files                         | Description                                                      |
| ---- | ------------------- | ----------------------------- | ---------------------------------------------------------------- |
| 3.1  | Frontend Developer  | `src/components/Terminal.tsx` | Add context menu JSX structure with Copy/Paste options           |
| 3.2  | Frontend Developer  | `src/components/Terminal.tsx` | Add click-outside-to-close logic using useEffect + event listener |
| 3.3  | Frontend Developer  | `src/components/Terminal.tsx` | Wire up menu items to handleCopy/handlePaste handlers            |
| 3.4  | Frontend Developer  | `src/components/Terminal.tsx` | Add conditional rendering (disable Copy if no selection)         |

**Implementation Guidance:**
- Context menu structure (reference `FileExplorer.tsx` lines 180-250):
  ```tsx
  {showContextMenu && (
    <div
      className="context-menu"
      style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
    >
      <div
        className={`context-menu-item ${!hasSelection ? 'disabled' : ''}`}
        onClick={hasSelection ? handleCopy : undefined}
      >
        Copy
      </div>
      <div className="context-menu-item" onClick={handlePaste}>
        Paste
      </div>
    </div>
  )}
  ```
- Use React state: `const [showContextMenu, setShowContextMenu] = useState(false)`
- Use React state: `const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 })`
- Use React state: `const [hasSelection, setHasSelection] = useState(false)`
- Update `hasSelection` state on xterm.js `selection` event

**Sub-Agent Guidance:**
- Tasks 3.1-3.4 are atomic and sequential — no split needed

### Phase 4: Styling

**Depends on:** Phase 3 (needs UI structure)
**Parallelizable:** Yes (independent of logic)

| Task | Agent               | Files                                  | Description                                          |
| ---- | ------------------- | -------------------------------------- | ---------------------------------------------------- |
| 4.1  | Frontend Developer  | `src/components/Terminal.module.css`   | Add context menu styles (if not already in design system) |
| 4.2  | Frontend Developer  | `src/styles/design-system.css`         | Verify/add .context-menu, .context-menu-item classes if missing |

**Implementation Guidance:**
- Check if `.context-menu` styles already exist in `design-system.css` (likely from FileExplorer)
- If styles exist, reuse them via className in Terminal.tsx
- If styles don't exist, add to Terminal.module.css:
  ```css
  .contextMenu {
    position: fixed;
    background: var(--color-neutral-800);
    border: 1px solid var(--color-neutral-600);
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    min-width: 120px;
  }

  .contextMenuItem {
    padding: 8px 16px;
    cursor: pointer;
    color: var(--color-neutral-100);
    font-size: 14px;
  }

  .contextMenuItem:hover:not(.disabled) {
    background: var(--color-primary-900);
  }

  .contextMenuItem.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  ```

**Sub-Agent Guidance:**
- Task 4.1 and 4.2 can be done in parallel if styles need to be added in both files

### Phase 5: Wails Bindings Generation

**Depends on:** Phase 1 (backend methods must exist)
**Parallelizable:** No (generated automatically)

| Task | Agent              | Files                          | Description                                    |
| ---- | ------------------ | ------------------------------ | ---------------------------------------------- |
| 5.1  | Backend Developer  | Run `wails dev` or `wails build` | Wails automatically generates TypeScript bindings |
| 5.2  | Backend Developer  | Verify `wailsjs/go/main/App.d.ts` and `App.js` | Confirm GetClipboard/SetClipboard are exported |

**Implementation Guidance:**
- Wails automatically generates bindings when backend methods are added
- Run `wails dev` to regenerate bindings
- Verify generated files:
  - `wailsjs/go/main/App.d.ts` should have `GetClipboard` and `SetClipboard` declarations
  - `wailsjs/go/main/App.js` should have corresponding implementations
- No manual editing of generated files needed

**Sub-Agent Guidance:**
- Atomic task — no split needed

### Phase 6: Review & Documentation (Always Last)

**Depends on:** All implementation phases

| Task | Agent               | Description                                                        |
| ---- | ------------------- | ------------------------------------------------------------------ |
| 6.1  | Debugger/Reviewer   | Verify all acceptance criteria, test copy/paste in live terminal   |
| 6.2  | Debugger/Reviewer   | Test edge cases (empty clipboard, special chars, long text)        |
| 6.3  | Documentation       | Update `docs/user-guide/file-manager.md` with copy/paste usage     |
| 6.4  | Documentation       | Add `docs/api/clipboard-api.md` documenting backend methods        |

---

## Risks & Mitigations

| Risk                                      | Impact | Likelihood | Mitigation                                                                 |
| ----------------------------------------- | ------ | ---------- | -------------------------------------------------------------------------- |
| go-ole clipboard access fails on some Windows versions | High   | Low        | Test on Windows 10 and 11; add graceful fallback error messages            |
| Ctrl+C conflicts with terminal interrupt signal        | High   | Medium     | Only copy when text is selected; otherwise pass through to xterm.js        |
| xterm.js selection API behavior unexpected             | Medium | Low        | Test thoroughly with xterm.js v5+ (current version); check event timing    |
| Context menu positioning issues with scrolling         | Low    | Medium     | Use fixed positioning; calculate offset from viewport, not terminal container |
| Multi-line paste breaks terminal input                 | Medium | Low        | xterm.js handles this natively; verify with test cases                     |

## Rollback Strategy

All changes are additive (no breaking changes to existing code):
1. Remove backend methods `GetClipboard` and `SetClipboard` from `app.go`
2. Remove context menu UI and handlers from `Terminal.tsx`
3. Remove keyboard event listeners
4. Regenerate Wails bindings with `wails dev`
5. No database or state rollback needed (no persistence)

---

## Version History

| Version | Date       | Summary                                                                 |
| ------- | ---------- | ----------------------------------------------------------------------- |
| v1.0.0  | 2026-08-15 | Initial PRD                                                             |
| v1.1.0  | 2026-08-15 | Updated status to "In Progress" - 3 critical bugs found, see Fix-002   |

---

## Implementation Status

**Current Status:** In Progress (Bug Fix Required)
**Progress:** 8/12 original acceptance criteria passed (66%)
**Blocker:** 3 critical bugs found during review

### Bug Report Summary

**Debugger/Reviewer Verdict:** ❌ CHANGES REQUIRED

**Critical Bugs (Must Fix):**
1. **Ctrl+Shift+C broken** - Inverted conditional logic prevents shortcut from working
2. **Missing motion-reduce** - WCAG 2.1 violation (animation accessibility)
3. **No keyboard navigation** - WCAG AA violation (context menu not keyboard-accessible)

**High-Priority Issues:**
4. Context menu width inconsistent with FileExplorer (160px vs 190px)

**Fix Plan:** See `docs/planning/fix-002-prd-016-critical-bugs.md`
**Fix Effort:** ~32 minutes
**Updated Acceptance Criteria:** 16/16 after fixes (includes 4 new accessibility criteria)

---

## Related Documents

- **Fix Plan:** `docs/planning/fix-002-prd-016-critical-bugs.md` - Critical bug fixes
- **Implementation Summary:** `docs/planning/fix-002-implementation-summary.md` - Orchestrator guide
- **User Guide:** `docs/user-guide/file-manager.md` - To be updated after completion
- **API Documentation:** `docs/api/clipboard-api.md` - To be created after completion
