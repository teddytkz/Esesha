# PRD-004: Futuristic UI Redesign

**Version:** 1.0.0
**Status:** Draft
**Author:** Planner Agent
**Created:** 2026-08-06
**Updated:** 2026-08-06

---

## Overview

Redesign the Esesha SSH/SFTP manager from its current VS Code-clone aesthetic into a distinctive, futuristic "mission control" interface. The redesign is **purely visual** — it changes the design token system, component styling, and micro-interactions while preserving all existing SSH/SFTP functionality, the React + CSS Modules architecture, and the Go backend untouched.

## Problem Statement

The current UI is a faithful clone of the VS Code dark theme (`#1e1e1e` flat surfaces, `#0e639c` blue accent). While functional, it reads as generic and templated — indistinguishable from any IDE. The user requested (in Indonesian): *"Redesign UI nya buat lebih futuristik dan bagus yang menarik"* — redesign the UI to be more futuristic and attractive. The app is a professional SSH/SFTP tool; its interface should feel like a capable, modern network operations console rather than a default editor theme.

## Goals

- Deliver a distinctive futuristic visual identity that cannot be mistaken for the VS Code default theme
- Maintain the dark theme (required for a desktop terminal app)
- Keep the bundle size reasonable (<50MB; current exe is 12.39MB)
- Preserve 100% of existing functionality — no SSH/SFTP workflow regressions
- Stay within the existing React + CSS Modules architecture (no new frameworks)
- Use lucide-react for all icons (already installed)
- Improve perceived quality: empty states, loading skeletons, custom dialogs

## Non-Goals

- **No backend Go code changes** — SQLite, DPAPI, SSH, SFTP, editor, watcher all untouched
- No new CSS frameworks (no Tailwind, no shadcn, no styled-components)
- No new icon libraries (lucide-react only)
- No functional changes to connection CRUD, terminal, or file operations
- No xterm.js internals changes (terminal area styling is limited to theme colors)
- No responsive/mobile support (desktop-only Wails app)

---

## Feature Specification

### User Stories

- As a **system administrator**, I want a visually distinctive interface so the tool feels like a professional network console, not a generic editor.
- As a **daily user**, I want clear empty states and loading feedback so I always know what the app is doing.
- As a **developer**, I want the redesign to stay within the existing CSS Modules pattern so it remains maintainable.

### Acceptance Criteria

- [ ] All 4 components (App, Terminal, FileExplorer, FileItem) use the new design tokens — no hardcoded VS Code hex values remain in component CSS
- [ ] The app no longer visually resembles the VS Code dark theme (flat `#1e1e1e`/`#252526` surfaces replaced)
- [ ] `npm run build` (tsc + vite) passes with 0 errors
- [ ] `esesha.exe` builds and stays under 50MB
- [ ] SSH connect/disconnect, terminal input, SFTP browse/upload/download/edit/delete/rename all still work
- [ ] Empty states and loading skeletons render for the connection list and file list
- [ ] Native `confirm`/`prompt` dialogs replaced with styled in-app dialogs for delete/rename
- [ ] Keyboard focus is visible on all interactive elements
- [ ] `prefers-reduced-motion` disables the ambient animations

---

## Technical Design

### Architecture Overview

The redesign is confined to the **frontend** layer. It touches:
- `frontend/src/styles/global.css` — design token system (the single source of truth)
- `frontend/src/components/*.module.css` — per-component styling
- `frontend/src/components/*.tsx` — minimal JSX changes (add empty states, skeletons, dialogs, icons)
- `frontend/src/components/App.tsx` — brand header, connection list polish, custom dialogs

No changes to `internal/`, `wailsjs/`, or any Go code.

### Codebase Context (from Explorer)

- **Styling**: Pure CSS Modules + CSS custom properties in `global.css` `:root`. No Tailwind/shadcn.
- **Design tokens today**: 8px spacing grid; VS Code palette (`#1e1e1e`, `#252526`, `#2d2d30`, `#3e3e42`, `#0e639c`, `#cccccc`); 3 shadow tiers; 3 transition speeds.
- **Components (4)**: `App` (sidebar + modal form), `Terminal` (xterm.js), `FileExplorer` (toolbar/breadcrumb/file grid/context menu/toast/progress), `FileItem` (grid row).
- **Icons**: lucide-react v1.28.0 already installed and used.
- **Fonts**: system stack (Segoe UI/Roboto) + bundled Nunito woff2 (currently unused). xterm uses Consolas.
- **Known gaps**: native `confirm()`/`prompt()` dialogs in `FileExplorer.tsx` (delete/rename), no empty states beyond a plain text line, no loading skeletons.
- **Bundle**: 497 kB JS + 14 kB CSS (gzipped 137 kB + 4 kB); exe 12.39MB.

### Design Direction — "Mission Control"

**Subject grounding.** Esesha is a network operations tool: remote servers, terminals, file systems, data centers. The design language should come from that world — instrumentation, telemetry, command consoles — not from a generic SaaS template.

**Aesthetic risk taken (deliberately):** The common "futuristic" default is near-black + a single acid-green accent. We deliberately **avoid** that cliché. Instead we use a **deep space-navy base** with a **cyan-teal primary accent** and a **violet secondary accent**, plus a subtle **scanline/grid texture** in the sidebar and an **animated connection pulse**. This reads as "mission control / cyberdeck" rather than "hacker green terminal."

**Signature element:** The **connection status bar** — a thin animated gradient bar at the top of the main content area whose color reflects connection state (idle = slate, connecting = cyan pulse, connected = teal glow, error = red). This is the one memorable, animated element; everything else stays disciplined and quiet.

### Visual System

#### Color Palette

| Token | Value | Usage |
| ----- | ----- | ----- |
| `--bg-primary` | `#0a0e1a` | App background (deep space navy) |
| `--bg-secondary` | `#0f1524` | Sidebar, toolbars |
| `--bg-tertiary` | `#161e33` | Cards, list items, inputs |
| `--bg-hover` | `#1b2440` | Hover surfaces |
| `--bg-active` | `#0e2a3a` | Active connection / tab |
| `--border-default` | `#232c45` | Default borders |
| `--border-focus` | `#22d3ee` | Focus rings |
| `--text-primary` | `#e2e8f0` | Primary text |
| `--text-secondary` | `#94a3b8` | Secondary text |
| `--text-tertiary` | `#64748b` | Muted text |
| `--accent-primary` | `#22d3ee` | Cyan — primary actions, active states |
| `--accent-hover` | `#67e8f9` | Cyan hover |
| `--accent-active` | `#0ea5b7` | Cyan pressed |
| `--accent-secondary` | `#8b5cf6` | Violet — secondary accents, brand mark |
| `--color-success` | `#34d399` | Success / connected |
| `--color-warning` | `#fbbf24` | Warning |
| `--color-danger` | `#f87171` | Danger / error |
| `--color-danger-bg` | `#3b1d24` | Danger surface |

#### Typography

| Role | Face | Notes |
| ---- | ---- | ----- |
| Display / brand | **Nunito** (bundled, currently unused) | Headings, sidebar title, modal titles — geometric, friendly-futuristic |
| Body | System stack (Segoe UI / Roboto) | Default UI text |
| Data / technical | **Consolas / monospace** | Connection details (`user@host:port`), file sizes, perms, breadcrumbs — reinforces the technical identity |

Use the already-bundled Nunito woff2 — **no new font downloads** (keeps bundle small). Add a `--font-display` and `--font-mono` token.

#### Spacing, Radius, Shadows, Transitions

- Keep the 8px spacing grid (already good).
- **Radius**: bump from 4px to **8px** for cards/buttons, **12px** for modals, **6px** for inputs — softer, more modern than the flat 4px.
- **Shadows**: deepen with navy-tinted shadows; add a **glow** shadow for accent elements (`0 0 12px rgba(34,211,238,0.35)`).
- **Transitions**: keep 100/150/200ms; add `--transition-glow` for the signature pulse.

#### Signature: Connection Status Bar

A 3px gradient strip at the top of the main content area. States:
- **Idle** (no connection): static slate `#232c45`
- **Connecting**: animated cyan pulse (CSS keyframe, `background-position` shift)
- **Connected**: static teal glow (`#22d3ee` + glow shadow)
- **Error/Disconnected**: red `#f87171`

Driven by existing `statusText`/`activeConnection`/`sessionId` state in `App.tsx` — no new state, just a derived class.

### Data Model

No changes. SQLite schema, Go models, and Wails bindings are untouched.

### API Changes

None. All Wails methods (`ListConnections`, `CreateConnection`, `ListDirectory`, `EditFile`, `DownloadFileToDialog`, `DeletePath`, `RenamePath`, `SendInput`, `ResizeTerminal`, `DisconnectSSH`) remain unchanged.

### UI Changes

#### 1. Design Tokens (`global.css`)
- Replace the entire VS Code palette with the Mission Control palette above.
- Add `--font-display` (Nunito), `--font-mono` (monospace), radius tokens, glow shadow, and the status-bar keyframes.
- Add a subtle **grid/scanline background** utility for the sidebar (CSS `repeating-linear-gradient`, very low opacity).

#### 2. `App.tsx` / `App.module.css` — Sidebar, Header, Modal
- **Sidebar**: navy surface with scanline texture; brand header "Esesha" in Nunito with a violet/cyan gradient wordmark; connection cards get rounded corners, hover lift, and a cyan left-border indicator on the active card.
- **Connection list empty state**: replace the plain `No connections saved` text with an illustrated empty state (icon + heading + "Add your first connection" call-to-action button).
- **Loading skeleton**: while `loading` is true, render 3 shimmering skeleton cards instead of the list.
- **Connection cards**: show a small status dot (slate = idle) and monospace `user@host:port`.
- **Modal**: rounded 12px, navy surface, cyan focus rings, gradient header accent.
- **Status bar**: add the signature animated gradient strip (see Ambient section).

#### 3. `Terminal.tsx` / `Terminal.module.css`
- Update the xterm theme colors to match the new palette (`background: #0a0e1a`, `foreground: #e2e8f0`, plus ANSI colors tuned to the palette).
- Wrap the terminal in a rounded, bordered container with a subtle glow on the active connection.
- **No other xterm changes** — keep the mount-only effect and refs exactly as-is (Fix-012 stability must not regress).

#### 4. `FileExplorer.tsx` / `FileExplorer.module.css`
- **Toolbar**: rounded buttons, cyan primary, monospace breadcrumb with chevron separators.
- **File list**: rounded rows, hover highlight, cyan accent on hover; sticky header with uppercase labels.
- **Empty directory state**: icon + "This folder is empty" message.
- **Loading skeleton**: shimmering rows while `loading`.
- **Replace native `confirm()`/`prompt()`** with styled in-app dialogs for delete and rename (see Dialogs below). This removes the last native-browser UI.
- **Toast**: restyle to a rounded, glowing toast (success/error/info colors).
- **Progress bar**: restyle upload progress with a cyan gradient fill.

#### 5. `FileItem.tsx` / `FileItem.module.css`
- Rounded row cards, hover lift, monospace size/perms/date columns.
- Folder icon cyan, file icon slate; keep lucide icons.

#### 6. New: In-App Dialogs
- Add a small reusable `ConfirmDialog` and `PromptDialog` (either inline in `FileExplorer.tsx` or as a tiny new component) to replace `confirm()`/`prompt()`.
- Styled to match the modal (rounded, navy surface, danger accent for delete).
- **Note**: keep them minimal — this is a visual replacement, not a new dialog system.

### Implementation Plan

#### Phase 1: Design Token Foundation

**Depends on:** Nothing
**Parallelizable:** No — everything else depends on tokens

| Task | Agent   | Files | Description |
| ---- | ------- | ----- | ----------- |
| 1.1  | Frontend | `frontend/src/styles/global.css` | Replace VS Code palette with Mission Control palette; add font/radius/glow tokens; add status-bar keyframes and scanline utility |

**Sub-Agent Guidance:** Task 1.1 is atomic — no split.

#### Phase 2: Component Redesign (parallelizable)

**Depends on:** Phase 1
**Parallelizable:** Yes — each task touches a distinct `.module.css` + `.tsx` pair

| # | Agent   | Files | Description |
| ---- | ---------- | ----- | ----------- |
| 2.1  | Frontend | `frontend/src/components/App.module.css`, `frontend/src/components/App.tsx` | Sidebar redesign, brand header, connection cards, empty state, loading skeleton, status bar strip, modal restyle |
| 2.2  | Frontend | `frontend/src/components/Terminal.module.css`, `frontend/src/components/Terminal.tsx` | xterm theme colors + rounded bordered container (no logic changes) |
| 2.3  | Frontend | `frontend/src/components/FileExplorer.module.css`, `frontend/src/components/FileExplorer.tsx` | Toolbar/breadcrumb/list restyle, empty state, loading skeleton, toast/progress restyle, replace confirm/prompt with dialogs |
| 2.4  | Frontend | `frontend/src/components/FileItem.module.css`, `frontend/src/components/FileItem.tsx` | Row card restyle, monospace data columns, icon colors |

**Sub-Agent Guidance:**
- 2.1 and 2.3 both touch `App.tsx`/`FileExplorer.tsx` — they are **separate files**, safe to parallelize.
- 2.3 is the largest; it can be split: [part A: toolbar + list + empty/skeleton] parallel with [part B: dialogs + toast + progress]. Both parts edit `FileExplorer.tsx`/`.module.css`, so **do not** run A and B in parallel — keep 2.3 atomic or sequential.
- 2.2 must not touch the mount-only effect or refs in `Terminal.tsx` (Fix-012 regression risk).

#### Phase 3: Review & Documentation (Always Last)

**Depends on:** All implementation phases

| # | Agent | Description |
| ---- | ---------- | ----------- |
| 3.1  | Debugger/Reviewer | Verify all acceptance criteria; confirm no VS Code colors remain; check terminal stability (Fix-012) and file navigation |
| 3.2  | Security | Confirm no auth/data/API changes (low risk — visual only) |
| 3.3  | Documentation | Update `docs/planning/changelog.md`; update `docs/README.md` if it references the design system |

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
| ---- | ------ | ---------- | ---------- |
| Terminal regression (xterm theme change breaks Fix-012 stability) | High | Low | Only change the `theme` object colors; never touch the mount-only effect, refs, or deps |
| Hardcoded VS Code colors left in component CSS | Med | Med | Phase 3 grep for `#1e1e1e`, `#252526`, `#2d2d30`, `#3e3e42`, `#0e639c`, `#cccccc` |
| Bundle size growth from new assets | Low | Low | Reuse bundled Nunito; no new fonts/images; only CSS + existing lucide icons |
| Chromium rendering of new CSS (Wails embedded view) | Low | Low | Use only standard CSS (gradients, keyframes, backdrop-filter) supported in the embedded Chromium; avoid exotic features |
| `prefers-reduced-motion` users | Low | Low | Gate all keyframe animations behind `@media (prefers-reduced-motion: no-preference)` |

## Rollback Strategy

The redesign is **purely additive to CSS + minimal JSX**. Rollback = revert the 5 frontend files (`global.css` + 4 component `.module.css`/`.tsx` pairs) to the pre-PRD-004 state. No database, backend, or schema migration is involved, so rollback is instant and safe. Keep a git tag/branch (`pre-prd004`) before starting.

---

## Version History

| Version | Date | Summary |
| ------- | ---- | ------- |
| 1.0.0 | 2026-08-06 | Initial — approved for implementation |