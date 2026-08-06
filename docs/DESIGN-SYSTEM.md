# Esesha Design System — "Mission Control"

**Last updated:** 2026-08-06
**Applies to:** `frontend/src/**` (all component styling)
**Introduced in:** PRD-004 Futuristic UI Redesign — see [prd-004-futuristic-ui-redesign.md](planning/prd-004-futuristic-ui-redesign.md)
**Purpose:** The single reference for Esesha's visual identity — colors, typography, spacing, component patterns, and motion. Everything documented here is the *actual* state of the code; if code and this doc disagree, the code wins — update this doc.

## Contents

1. [Overview](#overview)
2. [Design Principles](#design-principles)
3. [Color Palette](#color-palette)
4. [Typography](#typography)
5. [Spacing & Layout](#spacing--layout)
6. [Radius, Shadows & Borders](#radius-shadows--borders)
7. [Motion System](#motion-system)
8. [Component Patterns](#component-patterns)
9. [Global Utilities](#global-utilities)
10. [Rules for Contributors](#rules-for-contributors)

---

## Overview

PRD-004 replaced the VS Code-clone aesthetic (`#1e1e1e` flat surfaces, `#0e639c` blue accent) with a futuristic **"Mission Control"** identity — a deep space-navy base with cyan/violet accents, built for a network operations console. The redesign is **frontend-only** (5 files: `global.css` + 4 component `.tsx`/`.module.css` pairs), preserves the React + CSS Modules architecture, and adds no new dependencies.

The visual language is deliberately **disciplined**: exactly one animated element (the connection status bar) plus loading/entrance micro-animations — everything else stays quiet so the interface reads as instrumentation, not a generic SaaS template.

## Design Principles

1. **Deep space, not hacker green** — near-black + acid-green is the cliché "futuristic" look; Esesha uses space-navy + cyan-teal + violet instead.
2. **One signature animated element** — the connection status bar. Additional motion (skeletons, spinners, toasts) is functional feedback, never decoration.
3. **Technical identity through typography** — monospace everywhere data lives (`user@host:port`, file sizes, permissions, breadcrumbs, status text).
4. **Quiet surfaces, glowing accents** — muted navy surfaces; glow shadows are reserved for active, primary, and danger elements.
5. **Accessibility is part of the design** — every animation has a `prefers-reduced-motion` fallback; every interactive element has a visible focus ring.

## Color Palette

All tokens are defined in `:root` in `frontend/src/styles/global.css`. **Raw hex values are only allowed in `global.css`** — component CSS must use tokens (see [Rules for Contributors](#rules-for-contributors)).

### Backgrounds

| Token | Value | Usage |
| ----- | ----- | ----- |
| `--bg-primary` | `#0a0e1a` | App background — deep space navy |
| `--bg-secondary` | `#0f1524` | Sidebar, toolbars, content headers, scrollbar track |
| `--bg-tertiary` | `#161e33` | Cards, connection items, buttons, inputs, menus, dialogs, toasts |
| `--bg-hover` | `#1b2440` | Hover surfaces (rows, buttons, crumbs) |
| `--bg-active` | `#0e2a3a` | Active connection card / active tab |
| `--bg-overlay` | `rgba(4, 8, 20, 0.72)` | Modal / dialog scrim |
| `--bg-scanline` | `rgba(34, 211, 238, 0.02)` | Scanline accent tint (base alpha; the sidebar texture uses its own gradient alphas) |

### Borders

| Token | Value | Usage |
| ----- | ----- | ----- |
| `--border-default` | `#232c45` | Default borders — also the idle status bar color |
| `--border-subtle` | `#1a2238` | Very quiet dividers (e.g., between skeleton rows) |
| `--border-focus` | `#22d3ee` | Focus rings (`outline: 2px solid var(--border-focus)`) |

### Text

| Token | Value | Usage |
| ----- | ----- | ----- |
| `--text-primary` | `#e2e8f0` | Primary text (~15.6:1 contrast on `--bg-primary`) |
| `--text-secondary` | `#94a3b8` | Secondary text, descriptions (~7.5:1 contrast) |
| `--text-tertiary` | `#64748b` | Muted/technical labels — **non-essential only** (~4.1:1, below AA for normal text; never use for critical info) |

### Accents

| Token | Value | Usage |
| ----- | ----- | ----- |
| `--accent-primary` | `#22d3ee` | Cyan — primary actions, active states, focus, brand gradient start |
| `--accent-hover` | `#67e8f9` | Cyan hover |
| `--accent-active` | `#0ea5b7` | Cyan pressed |
| `--accent-secondary` | `#8b5cf6` | Violet — secondary accents, brand gradient end, progress gradient end |
| `--accent-secondary-hover` | `#a78bfa` | Violet hover |

### Semantic

| Token | Value | Usage |
| ----- | ----- | ----- |
| `--color-success` | `#34d399` | Success — connected state, success toast |
| `--color-warning` | `#fbbf24` | Warning |
| `--color-danger` | `#f87171` | Danger — error state, delete actions, error toast, disconnect |
| `--color-danger-hover` | `#ef4444` | Danger hover (solid fill) |
| `--color-danger-bg` | `#3b1d24` | Danger surface (danger buttons, delete hover) |
| `--color-danger-border` | `#5c2b38` | Danger borders |

### When to use what — quick rules

- **Cyan is the single primary action color.** Add Connection, Upload, dialog confirm. Text on cyan buttons is `#04121a` (dark, ~10.5:1 contrast).
- **Violet is for secondary/ambient accents only** — the brand gradient, the connecting pulse, the progress fill gradient. Never a primary button.
- **Green = connected/success, red = error/danger, amber = warning.** Do not invent new semantic colors.
- **`--text-tertiary` is for metadata and placeholder copy**, never for actionable information.

## Typography

Tokens in `global.css` `:root`.

### Fonts

| Token | Face | Usage |
| ----- | ---- | ----- |
| `--font-display` | **Nunito** (bundled woff2) | Brand wordmark, headings, modal/dialog titles, empty-state headings, connection names |
| `--font-body` | System stack (Segoe UI / Roboto) | Default UI text (buttons, tabs, file names) |
| `--font-mono` | **Consolas / Cascadia Mono / Courier New** | All technical data: `user@host:port`, file size/perms/date, breadcrumbs, status text, form inputs, progress %, brand subtitle |

**Rule:** any text that represents data gets `--font-mono`; any text that represents identity/hierarchy gets `--font-display`; everything else is `--font-body`.

### Size & weight scale

| Token | Value | Typical use |
| ----- | ----- | ----------- |
| `--font-size-xs` | 11px | Brand subtitle, mono metadata, status text |
| `--font-size-sm` | 12px | Buttons, secondary text |
| `--font-size-base` | 13px | Default body, tabs |
| `--font-size-md` | 14px | Connection names, file names |
| `--font-size-lg` | 16px | Modal/dialog titles, empty-state headings |
| `--font-size-xl` | 18px | Placeholder heading |
| `--font-size-2xl` | 22px | Brand wordmark |

Weights: `--font-weight-normal` 400 · `--font-weight-medium` 500 · `--font-weight-semibold` 600 · `--font-weight-bold` 700.
Line heights: `--line-height-tight` 1.2 (headings) · `--line-height-normal` 1.5 (body) · `--line-height-relaxed` 1.6 (long copy).

## Spacing & Layout

An **8px grid**: `--spacing-xs` 4 · `--spacing-sm` 8 · `--spacing-md` 12 · `--spacing-lg` 16 · `--spacing-xl` 24 · `--spacing-2xl` 32.

Common rhythms:

- Card padding: 10–12px; modal/dialog padding: 20px; toolbar padding: 10px 12px.
- Button padding: 6–8px vertical, 12–16px horizontal; icon-to-label gap: 6px.
- Between list items: 8px; between form groups: 15px.
- Component gap (flex/grid `gap`): 8–10px.

The file list uses a fixed grid for column alignment across header and rows (see [File List](#file-list)) — keep the column template in sync in all three places that define it (`.listHeader`, `.skeletonRow`, `.fileItem`).

## Radius, Shadows & Borders

### Radii

| Token | Value | Usage |
| ----- | ----- | ----- |
| `--radius-xs` | 4px | Small chips, icon cells |
| `--radius-sm` | 6px | Inputs, small controls, crumbs |
| `--radius-md` | 8px | Cards, buttons, rows, toasts, context menu |
| `--radius-lg` | 12px | Modals, dialogs, terminal container |

### Shadows & glows

| Token | Value | Usage |
| ----- | ----- | ----- |
| `--shadow-sm` | `0 1px 3px rgba(2, 6, 18, 0.5)` | Resting cards |
| `--shadow-md` | `0 4px 12px rgba(2, 6, 18, 0.55)` | Hover elevation |
| `--shadow-lg` | `0 12px 32px rgba(2, 6, 18, 0.6)` | Modals, menus, toasts |
| `--glow-cyan` | `0 0 12px rgba(34, 211, 238, 0.35)` | Active card, primary hover, focus inputs |
| `--glow-cyan-strong` | `0 0 20px rgba(34, 211, 238, 0.5)` | Connected status bar, active terminal wrapper |
| `--glow-violet` | `0 0 12px rgba(139, 92, 246, 0.35)` | Violet accents |
| `--glow-danger` | `0 0 12px rgba(248, 113, 113, 0.4)` | Error status bar, danger hover |

**Glow rule:** glow is a *state signal* — active, primary hover, connected, error. Never apply glow to idle/resting elements.

## Motion System

### Transitions

| Token | Value | Usage |
| ----- | ----- | ----- |
| `--transition-fast` | 100ms ease-in-out | Hover/pressed micro-interactions |
| `--transition-normal` | 150ms ease-in-out | Default state changes |
| `--transition-slow` | 200ms ease-in-out | Larger motion (card hover lift) |
| `--transition-glow` | 300ms ease-in-out | Status bar color/glow changes |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful entrance — card hover lift, toast slide-in |

### Keyframes

| Animation | Duration / easing | Element | File |
| --------- | ----------------- | ------- | ---- |
| `status-pulse` | 1.8s linear infinite | Connecting status bar gradient sweep | `App.module.css` |
| `shimmer` | 1.4s ease-in-out infinite | `.skeleton` loading cells | `global.css` |
| `spin` | 0.8s linear infinite | Refresh icon, editing spinner | `App.module.css`, `FileExplorer.module.css` |
| `menuIn` | 0.12s ease | Context menu entrance | `FileExplorer.module.css` |
| `slideIn` | 0.3s `--ease-spring` | Toast entrance | `FileExplorer.module.css` |

### Reduced motion (`prefers-reduced-motion: reduce`)

Three layers, all implemented:

1. **Global override** (`global.css`): all `animation-duration` → 0.01ms, `animation-iteration-count` → 1, `transition-duration` → 0.01ms.
2. **Skeleton static fallback** (`global.css`): `.skeleton { animation: none; background: var(--bg-tertiary); }`.
3. **Status bar static fallback** (`App.module.css`): `.statusConnecting` drops the pulse and renders a static cyan→violet gradient.

**Rule:** any new keyframe that carries meaning (not just polish) needs a static visual fallback *inside its component*, because the global override only kills the animation — it doesn't tell the element what static state to render.

## Component Patterns

### Buttons

Four variants, all `<button type="button">`:

| Variant | Classes | Look |
| ------- | ------- | ---- |
| Primary (cyan) | `btnAdd`, `btnUpload`, `dialogBtnPrimary` | `--accent-primary` bg, `#04121a` text, glow on hover |
| Secondary | `btn`, `btnRefresh`, `dialogBtn` | `--bg-tertiary` bg, `--border-default` border |
| Danger | `btnRetry`, `dialogBtnDanger` | `--color-danger-bg` bg, `--color-danger` text/border |
| Ghost text | `btnClose` (Disconnect) | Transparent, `--color-danger` text |

All buttons share: `--radius-md`, `:focus-visible` outline (2px `--border-focus`, offset 2px), `:active` translateY(1px), `:disabled` opacity 0.45 + `not-allowed` cursor, inline-flex with 6px icon gap.

**Segmented toggle** (`authToggle`): pill container (`--bg-primary` + border) with transparent segment buttons; active segment gets hover bg. Used for Password/Key auth selection.

### Connection Cards (sidebar)

- Container: `--bg-tertiary`, `--radius-md`, `--shadow-sm`; hover: `--bg-hover`, border `#2e3a5e`, translateY(-1px) with `--ease-spring`.
- **Active card:** `--bg-active`, cyan border, **3px cyan left-border indicator**, `--glow-cyan`.
- Contents: 8px status dot (slate = idle) + `connName` (`--font-display`, semibold) + `connDetails` (`--font-mono`, `user@host:port`).
- Cards are `<button>`s, disabled while a connection is active.

### Status Bar (signature element)

A 3px strip (`--status-bar-height`) at the top of the main content area. Four states, driven by derived state in `App.tsx` (`statusState`):

| State | Class | Visual |
| ----- | ----- | ------ |
| Idle (no connection) | `statusIdle` | Static `#232c45` |
| Connecting | `statusConnecting` | Animated cyan→violet gradient pulse (`status-pulse`), `--glow-cyan` |
| Connected | `statusConnected` | Static cyan + `--glow-cyan-strong` |
| Error | `statusError` | Static `--color-danger` + `--glow-danger` |

**Known limitation:** the `error` state is currently unreachable — `sessionId` and `activeConnection` are always set/cleared together, so the derivation `!activeConnection && sessionId` never fires. A failed connect leaves the bar pulsing `connecting` indefinitely. Tracked in [known-issues.md](guides/known-issues.md) (deferred, non-blocking).

### Modal & Dialogs

**Add-connection modal** (`App.tsx`): overlay (`--bg-overlay` + `backdrop-filter: blur(3px)`) → content card (500px, `--radius-lg`, `--shadow-lg`) with a 1px cyan→violet gradient accent line at the top. `role="dialog"`, `aria-modal="true"`, `aria-labelledby`. Escape or overlay click closes; content click `stopPropagation`.

**File dialogs** (delete / rename / chmod — `Dialog` component inside `FileExplorer.tsx`): same overlay pattern, 380px card.

- Escape closes (window keydown listener); Enter in the input confirms (rename/chmod).
- **Focus management:** delete → focus the Cancel button (safe default); rename/chmod → focus + select the input.
- `key` prop (`${kind}-${item.name}`) forces a fresh mount per item.
- Delete shows a danger icon (`AlertTriangle` in `--color-danger`) and a danger confirm button.
- Chmod input shows an octal hint (`755` example) and parses with `parseInt(modeStr, 8)`.
- **No native `confirm()`/`prompt()`/`alert()` anywhere** — PRD-004 removed the last of them.

### Empty States

| Location | Icon | Heading | Extra |
| -------- | ---- | ------- | ----- |
| Connection list | `ServerOff` (40px) | "No connections" | "Add your first SSH connection to get started." + Add Connection CTA |
| File list | `FolderOpen` (40px) | "Empty directory" | "No files or folders here. Upload something or navigate elsewhere." |
| Main area (no connection) | `Server` (48px) | "Awaiting connection" | Mono subtitle "Ready · select a host from the sidebar" |

Pattern: icon (slate, subtle cyan drop-shadow) → `--font-display` semibold heading → `--text-secondary` body → optional CTA button.

### Loading Skeletons

Two-layer system (see [Fix-013](planning/changelog.md) for the bug this prevents):

- **Global shimmer cell** — `.skeleton` in `global.css`: gradient (`--bg-tertiary` → `--bg-hover` → `--bg-tertiary`), `shimmer` keyframe, `--radius-sm`. **Referenced as the literal string `"skeleton"`** in JSX — never `styles.skeleton` (CSS Modules lookup returns `undefined` → invisible cells; this was Fix-013).
- **Module layout classes** — `.skeletonCard`/`.skeletonLine`/`.skelDot`/`.skelTitle`/`.skelDetail` (`App.module.css`) and `.skeletonRow`/`.skelCell`/`.skelIcon`/`.skelName`/`.skelSize`/`.skelPerms`/`.skelModified` (`FileExplorer.module.css`) define shape/size only.

Pattern: App shows 3 skeleton cards; FileExplorer shows a header row + 6 skeleton rows matching the file-grid template. Loading regions get `aria-busy="true"` + `aria-label`. Skeletons render **only on first load**; refreshes spin the refresh icon instead.

### Toast

Fixed top-right, 4s auto-dismiss (timer reset on new toast), `role="status"`, `slideIn` entrance. Three variants (`toastSuccess` / `toastError` / `toastInfo`) — same `--bg-tertiary` surface, colored border + text + subtle glow matching the variant's semantic color. Icons: `CheckCircle2` / `AlertTriangle` / `Info`.

### Context Menu

Fixed at cursor position (`position: fixed`, `left/top` from mouse event), `--bg-tertiary` + `--shadow-lg` + `menuIn` animation, z-index 1000. Items are full-width transparent buttons; the Delete item gets `.danger` (red text, `--color-danger-bg` hover). Closes on any window click.

### Upload Progress Bar

Absolute bottom strip (28px) over the file list: track `--bg-secondary`, fill is a cyan→violet gradient with `--glow-cyan`, percentage text in `--font-mono`. Width driven inline from the `sftp:progress` event.

### File List & Rows

- **Column template (shared):** `32px 1fr 90px 110px 170px` (icon, name, size, perms, modified) — defined identically in `.listHeader`, `.skeletonRow`, and `.fileItem`; keep in sync.
- Sticky header: `--bg-secondary`, uppercase mono 11px labels with letter-spacing.
- Rows: rounded hover bg + **inset 3px cyan left accent** (`box-shadow: inset 3px 0 0 var(--accent-primary)`); directories are semibold; size/perms/modified in `--font-mono`.
- Icons: folder `#22d3ee` (== `--accent-primary`), file `#64748b` (== `--text-tertiary`).
- **Keyboard:** rows are `role="row"`, `tabIndex={0}`, Enter = open/edit, Delete = delete (opens the dialog).

### Terminal Container

`Terminal.module.css`: `--bg-primary` + `--border-default` + `--radius-lg`, 12px padding. The active wrapper (`terminalWrapperActive` in `App.module.css`) adds a translucent cyan border + `--glow-cyan`. The xterm theme object in `Terminal.tsx` mirrors the palette (`background: #0a0e1a`, `foreground: #e2e8f0`, cursor/selection cyan, ANSI colors mapped to semantic tokens).

### Scanline Texture

Sidebar-only decorative layer via `.sidebar::before` (pointer-events none): a horizontal grid line + a 4px repeating scanline, both at 1.5–2.5% cyan alpha. Subtle by design — should never be legible as a pattern.

## Global Utilities

Defined in `global.css`:

- `.skeleton` — shimmer loading cell (see [Loading Skeletons](#loading-skeletons)).
- `@font-face` Nunito (bundled woff2 — do not add fonts).
- Custom scrollbar (10px, `--bg-secondary` track, `#232c45` thumb, `#2e3a5e` hover) — Windows Chromium only.
- Reduced-motion global override.
- `html, body` reset: 0 margin, `overflow: hidden` (desktop-only app, no page scroll).

## Rules for Contributors

1. **Raw hex only in `global.css`.** Component CSS uses tokens. Documented exceptions: `#2e3a5e` (hover border), `#04121a` (text on cyan), icon colors in `FileItem.tsx` (`#22d3ee`, `#64748b`).
2. **No new CSS frameworks** (no Tailwind, shadcn, styled-components) — CSS Modules + tokens only.
3. **No new icon libraries** — lucide-react only; decorative icons get `aria-hidden="true"`.
4. **No new fonts** — reuse the bundled Nunito.
5. **No native browser dialogs** (`confirm`/`prompt`/`alert`) — use the Dialog pattern.
6. **Every keyframe pairs with a reduced-motion fallback** (global override + static state for meaning-bearing animations).
7. **Every interactive element has a `:focus-visible` outline** (2px `--border-focus`).
8. **Keep the file-list column template in sync** across `.listHeader`, `.skeletonRow`, `.fileItem`.
9. **Glow is a state signal** — never apply to idle elements.
10. **Never touch the `Terminal.tsx` mount-only effect** — see [react-effect-stability.md](guides/react-effect-stability.md); PRD-004 changed only the xterm theme object.

## Related

- [UI Development Guide](guides/ui-development.md) — how to build new UI with this system
- [PRD-004: Futuristic UI Redesign](planning/prd-004-futuristic-ui-redesign.md) — the originating spec
- [Changelog — PRD-004 & Fix-013](planning/changelog.md) — implementation history
- [Known Issues](guides/known-issues.md) — including the deferred status-bar `error` state
