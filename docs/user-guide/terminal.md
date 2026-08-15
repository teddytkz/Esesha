# Terminal: Copy & Paste

**Last updated:** 2026-08-15

How to copy text out of the terminal and paste commands into it — using the mouse, the right-click menu, or the keyboard. Covers shortcuts and accessibility.

> **Scope:** This guide covers copy/paste only. For connecting and basic terminal use, see the [README](../../README.md).

---

## Table of Contents

1. [Copying text](#copying-text)
2. [Pasting text](#pasting-text)
3. [Right-click context menu](#right-click-context-menu)
4. [Keyboard shortcuts](#keyboard-shortcuts)
5. [Accessibility](#accessibility)
6. [Troubleshooting](#troubleshooting)

---

## Copying text

1. **Select** the text in the terminal with the mouse (click-drag).
2. Copy it one of three ways:
   - Press **`Ctrl`+`C`** (or **`Ctrl`+`Shift`+`C`**)
   - Right-click and choose **Copy**
   - On macOS, **`Cmd`+`C`** also works

The selected text goes to your system clipboard — paste it anywhere (another app, a chat, a document).

> **No selection?** `Ctrl`+`C` with nothing selected does **not** copy — it sends the normal terminal interrupt (like `Ctrl`+`C` always does). Select text first.

## Pasting text

1. Place the cursor where you want the text (or just click in the terminal).
2. Paste one of three ways:
   - Press **`Ctrl`+`V`** (or **`Ctrl`+`Shift`+`V`**)
   - Right-click and choose **Paste**
   - On macOS, **`Cmd`+`V`** also works

The clipboard contents are inserted at the cursor, exactly as if you typed them — including newlines and tabs.

> Pasting a multi-line block sends each line to the shell as you'd expect. Watch out for commands that run immediately on Enter.

## Right-click context menu

Right-click anywhere in the terminal to open a small menu:

| Item | Enabled when |
|------|--------------|
| **Copy** | Text is currently selected |
| **Paste** | Always (even with an empty clipboard — it just pastes nothing) |

- **Copy** is greyed out until you select something.
- Choosing either item closes the menu.
- Click anywhere outside the menu, or press **`Esc`**, to close it without doing anything.

> **Always visible:** The menu automatically repositions itself to stay on screen. Right-click near the bottom or right edge and it flips above/left of the cursor; near the top or left edge it flips back. This works at any window size and in split view — no action needed.

## Keyboard shortcuts

| Action | Windows / Linux | macOS | Notes |
|--------|-----------------|-------|-------|
| Copy selection | `Ctrl`+`C` | `Cmd`+`C` | Only copies when text is selected |
| Copy selection (alt) | `Ctrl`+`Shift`+`C` | — | Same as above |
| Paste | `Ctrl`+`V` | `Cmd`+`V` | Inserts clipboard at cursor |
| Paste (alt) | `Ctrl`+`Shift`+`V` | — | Same as above |
| Close context menu | `Esc` | `Esc` | Also closes via outside click |

**Inside the context menu:**

| Key | Action |
|-----|--------|
| `↑` / `↓` | Move between Copy and Paste |
| `Tab` | Cycle through items |
| `Enter` / `Space` | Activate the focused item |
| `Esc` | Close the menu |

## Accessibility

The terminal copy/paste features follow **WCAG 2.1 AA**:

- **Keyboard-only operation** — every action (copy, paste, menu navigation) is reachable without a mouse. See the tables above.
- **Visible focus** — the focused menu item shows a clear focus ring (`2px` outline).
- **Screen reader support** — the menu exposes `role="menu"` and each item `role="menuitem"`, so assistive tech announces them correctly.
- **Reduced motion** — if your OS is set to *Reduce motion* (Windows: Settings → Accessibility → Visual effects → Animation effects), the menu opens instantly with no fade/slide animation.

> **Motion-sensitive users:** You don't need to change anything. The terminal detects your system preference automatically and skips the open animation.

## Troubleshooting

| Symptom | Cause / Fix |
|---------|-------------|
| `Ctrl`+`C` doesn't copy | Nothing is selected. Select text first; with no selection it acts as the terminal interrupt. |
| **Copy** is greyed out | No text selected. Drag to select, then right-click. |
| Paste inserts nothing | Clipboard is empty or holds non-text content. Copy some text first. |
| Menu won't close | Press `Esc` or click outside the terminal area. |

---

**Related:** [Terminal component reference (developers)](../components/terminal.md) · [File Manager guide](file-manager.md)
