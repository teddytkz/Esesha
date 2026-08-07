# Changelog

All notable changes to the esesha project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- [2026-08-07] **Kebab menu (three-dot menu) with "Edit Connection" feature** — IMPLEMENTED ✅
  - **User request (Indonesian):** "tambahin titik 3 di sebelah list connection untuk masing masing connection, kalau di klik muncul dialog untuk edit koneksi"
  - **Translation:** Add three dots next to each connection in the connection list. When clicked, show a dialog to edit the connection.
  - **Feature scope:** Kebab menu button (⋮) on each connection item in sidebar (visible on hover), dropdown menu with "Edit Connection" option, edit modal pre-filled with connection data, password field optional (empty = keep current password), auth type toggle (password ↔ private key) with inactive field clearing, form validation, backend `UpdateConnection()` API integration, connection list auto-refresh after save
  - **Components:** Kebab menu button (MoreVertical icon, absolute positioned right), glass morphism dropdown (click-outside handler, ref pattern), Edit Connection modal (duplicates Add Connection modal structure)
  - **State management:** `openMenuId` (tracks which menu is open), `editingConnection` (connection being edited), `isEditModalOpen`, `editFormData`, `editAuthType`, `editFormError`
  - **Event handling:** `e.stopPropagation()` on kebab button (prevents connection selection), click-outside listener with ref-based latest-value pattern (avoids listener recreation), auth toggle clears inactive field
  - **Styling:** Mission Control design system (cyan accents `var(--accent-primary)`, glass morphism `backdrop-filter: blur(12px)`, CSS Modules, reduced-motion support)
  - **Accessibility:** ARIA labels (`aria-label="Connection options"`), keyboard support (Tab, Enter, Escape), `:focus-visible` outlines, modal semantics (`role="dialog"`, `aria-modal="true"`)
  - **Files modified:** `frontend/src/components/App.tsx` (+150 lines), `frontend/src/components/App.module.css` (+80 lines)
  - **Backend API:** `UpdateConnection(id, name, host, port, username, password, privateKeyPath)` — empty password preserves current encrypted value
  - **Review status:** APPROVED (all 5 implementation fixes verified)
  - **Documentation:** User guide + developer reference at `docs/guides/edit-connection-feature.md`, API reference at `docs/api/connection-management.md`
  - **See:** `docs/planning/implementation-001-edit-connection-kebab-menu.md` (implementation plan)

### Changed
- [2026-08-07] Changed folder navigation from double-click to single-click in SFTP file manager (`frontend/src/components/FileExplorer.tsx`, `frontend/src/components/FileItem.tsx`)
  - **User request (Indonesian):** "buat masuk ke folder di file manager" (single-click to enter folders)
  - **Behavior:** Single-click folder → navigate into folder; single-click file → select/highlight only (no action); double-click file → edit file (unchanged)
  - **Rationale:** Standard file manager UX pattern (Windows Explorer, macOS Finder)
  - **Drag-drop compatibility:** Single-click does NOT trigger on drag operations

### Added
- [2026-08-07] **PRD-005: Drag-and-Drop File Move** — Add drag-and-drop for moving files/folders between directories in the SFTP file manager (In Progress - Bug Fixes)
  - **User request (Indonesian):** "tambahin drag and drop ini juga, tapi ini untuk pindah ke folder lain masih double click" (add drag-and-drop for moving files; navigation remains double-click)
  - **Scope:** Drag files/folders → drop on folder items (moves into folder) or empty space (moves to current directory); visual feedback (dragging opacity, drop target cyan highlight); distinguish local drag (OS files → upload, existing) from remote drag (app items → move, new); toast notifications; auto-refresh after move
  - **Backend unchanged:** Uses existing `RenamePath(sessionId, oldPath, newPath)` — already supports cross-directory moves
  - **Files to modify:** `frontend/src/components/FileItem.tsx` (draggable + drop handlers), `frontend/src/components/FileItem.module.css` (drag/drop styles), `frontend/src/components/FileExplorer.tsx` (state + remote drop logic), `frontend/src/components/FileExplorer.module.css` (background drop styling)
  - **Constraints:** Pure CSS Modules; Mission Control design system (cyan accents); double-click navigation unchanged; single-item drag only (no multi-select); no drag-to-reorder within same folder
  - **Status:** Initial implementation complete, 5 critical bugs found in review (Fix-015)
  - **See:** `docs/planning/prd-005-drag-drop-file-move.md`, `docs/planning/fix-015-drag-drop-critical-bugs.md`

### Fixed
- [2026-08-07] **Fix-016: Connection List Loading Failure Due to Timestamp Format Mismatch** — Critical data migration bug (Planned)
  - **Severity:** Critical — app cannot load existing connections, frontend stuck in loading state
  - **Root cause:** Changed `models.Connection` timestamps from `time.Time` to `int64` Unix format; existing `connections.json` has ISO string timestamps (`"2026-08-06T19:48:19.8529913+07:00"`); `json.Unmarshal` fails on type mismatch (string → int64)
  - **Impact:** User's 2 saved connections (including production server `43.157.235.7:50171`) are inaccessible
  - **Fix Strategy:** Automatic data migration in `internal/db/store.go:load()` — detect legacy format on unmarshal failure → convert `time.Time` → `int64` Unix timestamps → re-save in new format → create `.pre-migration` backup
  - **Edge cases:** Null/zero/invalid timestamps fallback to current time; already-migrated files skip migration
  - **Files to modify:** `internal/db/store.go` (add legacy format detection, conversion logic, backup creation)
  - **Constraints:** No user intervention required (transparent one-time migration); preserve all connection data; backward compatible during migration read only
  - **Acceptance:** Existing connections load successfully; timestamps converted to Unix int64; backup file created; no crashes on invalid formats
  - **See:** `docs/planning/fix-016-timestamp-migration.md`

- [2026-08-07] **Fix-015: Drag-Drop Critical Bugs (PRD-005)** — 5 critical bugs blocking drag-drop feature from working (Planned)
  - **Severity:** Critical — feature completely non-functional without these fixes
  - **Bugs identified:**
    1. Missing `onDragEnter` handler — drop target highlight never activates
    2. Missing `onDragLeave` handler — drop target highlight never clears (multiple folders stay highlighted)
    3. Missing `onDragEnd` handler — dragged item stuck at 50% opacity after cancel/Escape
    4. Drop on file (non-folder) triggers invalid move operation instead of no-op
    5. Self-drop prevention compares names instead of full paths (fails with nested same-name folders)
  - **Additional warnings (deferred):**
    6. Background drop not implemented (design clarification needed)
    7. No guard against moving folder into its own subdirectory (backend error instead of frontend prevention)
  - **Fix Strategy:** Option A — Fix critical bugs (1-5) first; address warnings (6-7) after user clarification
  - **Files to modify:** `frontend/src/components/FileItem.tsx` (add onDragEnter/Leave/End handlers), `frontend/src/components/FileExplorer.tsx` (add handler methods, fix validation logic)
  - **Impact:** Drop target highlighting works, cancel/escape clears state, invalid drops prevented
  - **Regression Risk:** Medium — new event handlers may affect existing drag behavior; thorough testing of nested folders required
  - **See:** `docs/planning/fix-015-drag-drop-critical-bugs.md`

- [2026-08-06] **Fix-014: Three user-requested improvements (Indonesian user feedback)** — data persistence on rebuild, standard tab buttons, full-bleed terminal layout
  - **User requests (as reported):** ① "connection.json jangan di hapus kalau rebuild ulang" (don't delete connection.json on rebuild) ② "button Terminal dan Files buat standart jangan ada biru dibawahnya" (standard tab buttons, no blue underline) ③ "layout terminal buat full" (full terminal layout)
  - **⚠️ Correction to initial analysis:** Connections are stored in **`connections.json` (JSON), NOT SQLite** — `internal/db/store.go:40` computes `filePath := filepath.Join(filepath.Dir(os.Executable()), "connections.json")` (repo memory note "SQLite / AppData\Roaming\esesha\connections.db" is **STALE** — the SQLite migration was reverted; storage is a JSON file with atomic tmp-file + rename writes, DPAPI-encrypted passwords)
  - **Fix-014.1 — `connections.json` deleted on rebuild (REAL, user-confirmed):**
    - **Root cause:** `build.bat:5` runs `if exist build\bin rmdir /s /q build\bin`, deleting the **entire** `build\bin` folder — which is where the running app writes `connections.json` (same dir as `esesha.exe`, per `internal/db/store.go:40`). The `wails build -clean` flag on line 7 is a second deletion vector. Every rebuild wipes saved connections + host keys. Confirmed: `build/bin/connections.json` currently holds the user's real server (id 1, `43.157.235.7:50171`)
    - **Fix strategy (user request ④ resolved the open question):** user explicitly wants the file to **stay next to the exe** ("tetep 1 folder dengan file exe") → **NO AppData migration.** Instead: `build.bat` backs up `build\bin\connections.json` → `build\connections.json.bak` before `rmdir`, restores it after `wails build`, and drops the redundant `-clean` flag. `internal/db/store.go` is **unchanged**
    - **Files to modify:** `build.bat` only (backup/restore blocks + remove `-clean`)
    - **Script/Build task.** Manual test: add a connection → run `build.bat` → launch new exe → connection still listed
    - **Acceptance:** `connections.json` survives `build.bat` rebuild and remains in `build\bin\` next to `esesha.exe`; build succeeds with no `connections.json` present
  - **Fix-014.2 — Blue underline under active Terminal/Files tab (REAL):**
    - **Root cause:** `frontend/src/components/App.module.css:417` `.tab.active { ... box-shadow: inset 0 -2px 0 var(--accent-primary); }` — an inset bottom border in cyan (`--accent-primary`), the "biru dibawahnya"
    - **Fix:** Remove the `box-shadow: inset 0 -2px 0 var(--accent-primary);` line. Active tab keeps the existing `background: var(--bg-active)` + `color: var(--accent-primary)` so the active state stays visible but becomes a standard flat tab (no underline). Optionally strengthen with a `border-bottom: 2px solid transparent` / active `var(--border-default)` for a neutral indicator — **default is simply delete the line** unless user wants a subtle neutral indicator
    - **Files to modify:** `frontend/src/components/App.module.css` (line ~417, one property removed)
    - **Frontend-Developer task.** Acceptance: active tab shows background highlight + accent text only; no underline; inactive tabs unchanged; hover/focus states unchanged
  - **Fix-014.3 — Full terminal layout (REAL):**
    - **Root cause:** Double nesting creates the padded, boxed look. `App.tsx:240` wraps `<Terminal/>` in `styles.terminalWrapper` (border-radius + optional `terminalWrapperActive` cyan border/glow), and `Terminal.tsx:182` renders `styles.terminalContainer` (12px padding + 1px border + radius + bg) around the xterm host. Net effect: terminal floats inside a rounded, padded, bordered card with visible gaps instead of filling the content area
    - **Fix (choose A or B):**
      - **Option A (minimal, recommended):** In `Terminal.module.css` `.terminalContainer` → remove `padding: 12px`, `border: 1px solid ...`, `border-radius: ...`, `background` (let wrapper own the frame); keep `flex: 1; min-height: 0; overflow: hidden; position: relative;`. Keep `.terminal { padding: 8px }` (xterm needs small inset). Keeps the active-connection glow frame from `terminalWrapperActive`
      - **Option B (full-bleed):** Additionally strip `border-radius` from `.terminalWrapper` in `App.module.css` and the `terminalWrapperActive` border/glow so the xterm canvas touches all four edges of the content area
      - **Recommended: Option A** — removes user-visible gaps/padding while preserving the connection-state glow ring (a PRD-004 signature element)
    - **Files to modify:** `frontend/src/components/Terminal.module.css` (`.terminalContainer` block), optionally `frontend/src/components/App.module.css` (`.terminalWrapper` / `.terminalWrapperActive`) if Option B
    - **Frontend-Developer task.** Acceptance: terminal fills the content area edge-to-edge within the (optional) glow frame; no 12px padding gap; xterm still renders at correct size on connect/resize
  - **User clarification needed (Fix-014.1):** ~~Whether the goal is (a) just "don't wipe my data on rebuild" → AppData move + build.bat backup is sufficient, or (b) also "keep `connections.json` right next to the exe" → then only the `build.bat` backup/restore approach applies (AppData move skipped). Default recommended: **(a)** standard, robust, matches "jangan dihapus kalau rebuild"~~ → **RESOLVED by user request ④:** keep file next to exe → Option (b): `build.bat` backup/restore only, no AppData move. See `docs/planning/fix-014-user-requested-improvements.md`
  - **Regression Risk:** Medium for Fix-014.1 (storage path change — mitigated by legacy-migration + backup/restore in build.bat); Low for Fix-014.2 and Fix-014.3 (pure CSS)
  - **Validation:** `go build ./...` + `tsc --noEmit` / `npm run build`, then full `build.bat` run; verify exe launches, existing connection auto-migrates, tab shows no underline, terminal is full-width

- [2026-08-06] **Fix-013: Invisible Loading Skeletons (PRD-004 AC #6)** — High-severity visual bug found in PRD-004 implementation review — **IMPLEMENTED ✅**
  - **Symptom:** Loading skeletons render invisible — blank area instead of 3 shimmering connection cards / 6 shimmering file rows
  - **Root Cause:** `.skeleton` is a **global** class defined in `frontend/src/styles/global.css`, but `App.tsx` and `FileExplorer.tsx` reference it via CSS Modules (`styles.skeleton`). At runtime the lookup resolves to `undefined` (Vite's `Record<string,string>` module typing hides the error from `tsc`), so skeleton cells get no background/shimmer and are invisible
  - **Fix:** Replace `styles.skeleton` with the literal string `"skeleton"` in both components (global class — no module hashing). Module-scoped skeleton classes (`skeletonCard`, `skeletonLine`, `skelDot`, `skeletonRow`, `skelCell`, etc.) are defined in the respective `.module.css` files and are left unchanged
  - **Files Modified:** `frontend/src/components/App.tsx` (3 occurrences, lines 172–175), `frontend/src/components/FileExplorer.tsx` (10 occurrences, lines 351–363)
  - **Verification (2026-08-06):** `tsc` exit 0 + `vite build` success (6.45s). Built CSS contains `.skeleton{...}` shimmer gradient + `shimmer` animation and the reduced-motion static fallback `.skeleton{animation:none;background:var(--bg-tertiary)}`. No `styles.skeleton` references remain (only module-scoped `skeletonCard`/`skeletonLine`/`skeletonRow` remain as `styles.*`)
  - **Secondary items:** Status-bar `error` state unreachable in `App.tsx:84` â€” **deferred** (non-blocking; needs logic review, tracked in `docs/guides/known-issues.md`). Changelog PRD-004 status corrected from "(Planned)" to "(Implemented)" below
  - **Validation:** Rebuild with `build.bat`; launch with no saved connections â†’ 3 shimmering cards; open a slow directory â†’ 6 shimmering rows; with OS reduced-motion enabled â†’ shimmer disabled, static background remains
  - **See also:** [Design System â€” Loading Skeletons](../design-system.md#loading-skeletons) and [UI Development Guide â€” the "skeleton" gotcha](../guides/ui-development.md#global-vs-module-classes--the-skeleton-gotcha-fix-013)
  - **Regression Risk:** Low — class-name-only change, no logic touched

- [2026-08-06] **Fix-012: Terminal Flicker & Input Failure + File Manager Navigation (root cause)** — Critical fixes for terminal stability and folder navigation
  - **Terminal Flicker:** Split `Terminal.tsx` setup effect (mount-only, empty deps) from connection effect (deps `[connectionId]` only); `onConnect`/`onDisconnect` moved to refs; wrapped App handlers in `useCallback`. Eliminates dispose/recreate loop, focus loss, and input failure caused by unstable effect deps
  - **File Manager Navigation:** Removed `currentPath` from the `FileExplorer.tsx` event-effect dependency array — folder double-click no longer snaps back to `/`
  - **StrictMode compatible:** `cancelled` guard prevents stale connects from writing into disposed xterm and cleans up orphaned SSH sessions
  - **Files Modified:** `frontend/src/components/Terminal.tsx`, `frontend/src/components/App.tsx`, `frontend/src/components/FileExplorer.tsx`
  - **Impact:** Terminal stable, input works, folder navigation sticks
  - **Known issue (High):** Unmount race in `Terminal.tsx` connection effect — cleanup sets `cancelled = true` but does not await the in-flight `connect()` promise; a slow connect plus an unmount (tab switch/disconnect) can let a stale connect overwrite a re-mounted session's `sessionIdRef`. Tracked in `docs/guides/known-issues.md`
  - **See:** `docs/planning/fix-012-terminal-flicker-navigation-root-cause.md`

- [2026-08-06] **Fix-011: Terminal Flickering & File Manager Navigation** — Critical bug fixes for terminal stability and folder navigation (interim — see Fix-012 for root-cause resolution)
  - **Terminal Flicker:** Changed `isConnected` from useState to useRef to eliminate re-render loop causing continuous blinking
  - **File Manager Navigation:** Added error handling and debug logging to `navigateTo` and `loadDirectory` functions to diagnose silent failures
  - **Files Modified:** `frontend/src/components/Terminal.tsx`, `frontend/src/components/FileExplorer.tsx`
  - **Impact:** Terminal now stable during operation, file navigation errors now visible
  - **See:** `docs/planning/fix-011-terminal-flicker-filemanager-navigation.md`

### Added
- [2026-08-06] **PRD-004: Futuristic UI Redesign** (Implemented)
  - **Scope:** Major visual overhaul — transform VS Code-clone aesthetic into a distinctive "Mission Control" futuristic design
  - **Design direction:** Deep space-navy base (`#0a0e1a`), cyan-teal primary accent (`#22d3ee`), violet secondary accent (`#8b5cf6`); deliberately avoids the cliché near-black + acid-green hacker look
  - **Signature element:** Animated connection status bar (gradient strip reflecting idle/connecting/connected/error state)
  - **Visual system:** New color palette, Nunito display font (already bundled, now used), monospace data columns, 8px→12px radii, glow shadows, scanline sidebar texture
  - **Component changes:** Sidebar + brand header, connection cards with status dots, empty states, loading skeletons, styled in-app dialogs (replacing native `confirm`/`prompt`), xterm theme colors, toast/progress restyle
  - **Constraints:** Frontend-only (no Go changes), React + CSS Modules preserved, lucide-react only, bundle <50MB, `prefers-reduced-motion` respected
  - **Files:** `frontend/src/styles/global.css`, `frontend/src/components/{App,Terminal,FileExplorer,FileItem}.{tsx,module.css}`
  - **3 Phases:** Tokens → Component redesign (parallelizable) → Review & docs
  - **See:** `docs/planning/prd-004-futuristic-ui-redesign.md`

- [2026-08-06] **PRD-003: UI Improvements and Menu System** (Planned)
  - **Scope:** Major feature addition - native menu, icon library, component refactoring, visual polish
  - **Goals:** Replace emoji with lucide-react SVG icons, add Wails v2 native menu (File/Help), runtime desktop shortcut creation, refactor FileExplorer (<200 lines), improve visual design
  - **New Features:**
    - Application menu: File → Create Desktop Shortcut, File → Exit (Ctrl+Q), Help → About
    - Windows .lnk shortcut creation via go-ole COM interface
    - Professional SVG icons from lucide-react (folder, file, edit, upload, download, trash)
    - ARIA labels for accessibility
  - **Component Refactoring:**
    - Split FileExplorer.tsx (400 lines) into 4 components: FileExplorer, FileContextMenu, FileUploadZone, FileList
    - Each component <200 lines for maintainability
  - **Visual Improvements:**
    - Better spacing (8px/16px/24px grid), hover shadows, smooth transitions (200ms)
    - Typography updates (15px body, 500 weight headings)
    - Table header for file list, zebra striping
  - **Bundle constraint:** <15 MB target (current 12.39 MB, lucide-react adds ~0.3 MB)
  - **Dependencies:** lucide-react@^0.468.0
  - **5 Implementation Phases:** Icons → Menu → Refactor → Polish → Testing
  - **See:** `docs/planning/prd-003-ui-improvements-menu-system.md`

### Changed
- [2026-08-06] **Project Restructure**: Flatten nested folder structure - move `esesha\esesha\*` to root, consolidate two docs folders into single `docs\` hierarchy (see `fix-008-project-restructure.md`)

- [2026-08-06] **PRD-002: Svelte to React + TypeScript Migration** (Planned)
  - **Scope:** Complete frontend rewrite from Svelte 4 to React 18 + TypeScript 5
  - **Components:** App, Terminal, FileExplorer, FileItem (1,246 lines total)
  - **Goals:** Full type safety, improved IDE tooling, ecosystem alignment
  - **Bundle constraint:** Maintain .exe ≤ 50MB (currently ~21MB)
  - **Zero functionality changes:** All SSH/SFTP features preserved
  - **Migration strategy:** Bottom-up (FileItem → Terminal → FileExplorer → App)
  - **New dependencies:** react@^18.3.0, typescript@^5.6.0, @vitejs/plugin-react@^4.3.0
  - **Removed dependencies:** svelte@4.2.19, @sveltejs/vite-plugin-svelte@3.0.0
  - **Type definitions:** Full Wails bindings, Go method signatures, runtime events
  - **Styling:** CSS Modules (equivalent to Svelte scoped styles)
  - **State management:** React useState only (no Redux/Zustand)
  - **Testing:** Manual checklist covering all 13 Wails methods and 6 runtime events
  - **See:** `docs/planning/prd-002-svelte-to-react-migration.md`

### Fixed
- [2026-08-06] **Fix-010: PRD-003 Final Accessibility Fixes** — Added `type="button"` to 5 context menu buttons in `FileExplorer.tsx` (lines 341, 347, 348, 349, 351); changed breadcrumb key from index to path part name (line 274) — resolves final 2 accessibility violations from PRD-003 re-validation

### Removed
- [2026-08-06] **Documentation Cleanup** — Removed all legacy documentation files to reduce project bloat; preserved only `docs/planning/changelog.md` as single source of truth for project history
  - **Deleted directories:**
    - `docs/api/` (1 file: wails-integration.md)
    - `docs/planning/` (31 files: all PRDs, fix plans, phase reports, design specs except changelog.md)
  - **Deleted root-level docs:**
    - API.md, DATABASE.md, DESIGN-SYSTEM.md, developer-guide-react.md, DEVELOPMENT.md
    - migration-svelte-to-react.md, phase5-documentation-completion.md, README.md
    - RESTRUCTURE-NOTES.md, SECURITY.md, testing-guide.md, USER-GUIDE.md
  - **Preserved:** `docs/planning/changelog.md`
  - **Final structure:** `docs/planning/changelog.md` only
- [2026-08-06] **Fix-009: PRD-003 Accessibility & Form Violations** (Planned)
  - **Severity:** Critical (26 WCAG 2.1 violations found in code review)
  - **Bug #1 (Critical):** 15 buttons missing `type="button"` — risk of unintended form submission
    - App.tsx (9 buttons): Add, Refresh, Tabs ×2, Disconnect, Modal close, Cancel, Save
    - FileExplorer.tsx (3 buttons): Up, Upload, Refresh
  - **Bug #2 (Critical):** 6 non-interactive elements with click handlers (keyboard inaccessible)
    - App.tsx: modal overlay/content `<div>` with onClick — add ARIA dialog roles
    - FileExplorer.tsx: breadcrumb `<span>` elements — convert to `<button>` elements
  - **Bug #3 (Critical):** 9 form labels without `htmlFor` association (screen reader inaccessible)
    - App.tsx modal form: Connection Name, Host, Port, Username, Auth radio ×2, Password, Private Key Path
  - **Bug #4 (Critical):** 2 color contrast failures (WCAG 2.1 AA 4.5:1)
    - FileExplorer.module.css: `#858585` (2.8:1 FAIL) → `#a0a0a0` (4.51:1 PASS)
    - App.module.css: `#89d185` (verify, adjust to `#6fcd6a` if needed)
  - **Files to modify:**
    - `frontend/src/components/App.tsx` (21 fixes)
    - `frontend/src/components/FileExplorer.tsx` (6 fixes)
    - `frontend/src/components/FileExplorer.module.css` (1 color change)
    - `frontend/src/components/App.module.css` (1 color change, verify first)
  - **Agent:** Frontend Developer
  - **Effort:** Small (50 minutes total)
  - **Regression risk:** Low — purely additive changes (ARIA attrs, button types, label associations)
  - **Testing:** Manual keyboard nav + WebAIM contrast check + screen reader verification
  - **See:** `docs/planning/fix-009-prd003-accessibility-violations.md`

- [2026-08-06] **Fix-007: Phase 4 Critical Bugs** ✅ COMPLETE
  - **Status:** Validated and approved by Debugger/Reviewer agent
  - **Bug #1 (Critical):** Terminal session ID type mismatch — FIXED
    - Changed 3 event handlers (`handleOutput`, `handleError`, `handleDisconnected`) to use `sessionIdRef.current` (string)
    - Updated type signatures from `sessionId: number` to `sessionId: string`
    - SSH terminal now correctly receives and displays all output
  - **Bug #2:** Context menu rendering — VERIFIED (FALSE POSITIVE)
    - Context menu rendering exists at lines 334-345 in FileExplorer.tsx
    - CSS styling complete and correct (FileExplorer.module.css lines 127-157)
    - No changes required
  - **Bug #3 (Warning):** Event listener leak — FIXED
    - Removed `isConnected` from useEffect dependency array (line 138)
    - Prevents duplicate event listener registration on connection switch
  - **Files modified:**
    - `esesha/frontend/src/components/Terminal.tsx` (4 lines changed)
  - **Build verification:** TypeScript 0 errors, Wails build success, esesha.exe 12.39 MB
  - **Manual testing required:** 6 test cases (see validation report)
  - **See:** `docs/planning/fix-007-validation-report.md`

- [2026-08-06] **Fix-006: Windows MessageDialog Button Handling**
  - **Bug:** Host key dialogs always reject connections on Windows (clicks ignored)
  - **Root Cause:** `MessageDialog` with custom buttons returns `"Ok"` on Windows, code checks `selection == "Accept"`
    - Windows ignores custom `Buttons` array, returns system values: "Ok", "Cancel", "Yes", "No"
    - Mac/Linux return exact button label text from `Buttons` array
    - Comparison fails on Windows → all connections rejected regardless of user click
  - **Fix:** Switch to `QuestionDialog` with Yes/No buttons (cross-platform compatible)
    - Change `onNewHost` dialog: `InfoDialog` → `QuestionDialog`, buttons `["Yes", "No"]`, check `selection == "Yes"`
    - Change `onKeyMoved` dialog: keep `WarningDialog`, buttons `["Yes", "No"]`, check `selection == "Yes"`
    - Update message text to fit Yes/No response pattern
  - **Files to modify:**
    - `esesha/app.go` lines 48-75 (both host key callbacks)
  - **Agent:** Backend Developer
  - **Effort:** XS (6 line changes total)
  - **Severity:** Critical (blocks all SSH connections on Windows)
  - **Testing:** Verify positive button accepts connection, negative button rejects (Windows required)
  - **See:** `docs/planning/fix-006-windows-messagedialog-button-handling.md`

- [2026-08-06] **Fix-005: Host Key Verification Missing User Interaction** ✅
  - **Bug:** SSH connections fail with "unknown host key" error for all new hosts
  - **Root Cause:** Host key verification callbacks never configured in `app.go`
    - Infrastructure exists (`hostkey.go`, store methods) but no user dialogs wired
    - `hostKeyHandler.SetCallbacks()` never called during startup
  - **Fix:** Added Wails MessageDialog callbacks for host key decisions
    - New host: "Unknown Host Key" InfoDialog with fingerprint, Accept/Reject buttons
    - Changed key: "WARNING: Host Key Changed" WarningDialog with old/new fingerprints
    - Wired callbacks via new `Manager.SetHostKeyCallbacks()` method
  - **Implementation:**
    - `esesha/app.go` — added onNewHost/onKeyMoved callbacks in `startup()` (33 lines)
    - `esesha/internal/ssh/manager.go` — added `SetHostKeyCallbacks()` public method (8 lines)
  - **Status:** ✅ Implemented, build succeeds (20.8s), manual testing pending
  - **Agent:** Backend Developer
  - **Severity:** High (blocks all new SSH connections)
  - **See:** `docs/planning/fix-005-implementation-summary.md` for details

- [2026-08-06] **Production Build Blank Page Issue**
  - **Bug:** Running `esesha.exe` shows blank blue page, no UI renders
  - **Root Cause:** Wails runtime bindings (`wailsjs/`) not bundled by Vite
    - Frontend imports from `../wailsjs/go/main/App.js` (outside `src/`)
    - Vite build ignores files outside `frontend/src/`
    - Production runtime: `window.go` undefined → JS error → blank page
    - Dev mode works (Wails injects runtime differently)
  - **Fix:** Configure Vite to resolve and bundle `wailsjs/` directory
    - Modify `frontend/vite.config.js`: add alias `@wailsjs` → `../wailsjs`
    - Update import in `frontend/src/App.svelte`: use `@wailsjs/go/main/App.js`
    - Verify Wails generates bindings before `npm run build` (already in `wails.json`)
  - **Files to modify:**
    - `frontend/vite.config.js` — add resolve.alias for wailsjs
    - `frontend/src/App.svelte` — update import path to use alias
  - **Agent:** Frontend Developer
  - **Effort:** S (two-line config + one import change)
  - **Testing:**
    - Run `wails build` → produces `esesha.exe`
    - Launch `esesha.exe` → UI renders, connections list loads
    - Verify no console errors about missing `window.go`

- [2026-08-06] **CRITICAL FIXES - Release Blockers**
  
  **Priority 1: Security (implement first)**
  - Fix-001: Host key verification bypass (`internal/ssh/client.go`, `internal/ssh/manager.go`)
    - Replace `InsecureIgnoreHostKey()` with proper known_hosts verification
    - Agent: Backend Developer | Effort: M | Risk: High - auth changes
  
  - Fix-002: Encrypted private key support (`internal/crypto/dpapi.go`, `internal/ssh/client.go`)
    - Add passphrase prompt for encrypted keys
    - Agent: Backend Developer | Effort: S | Risk: Low - additive only
  
  - Fix-003: SFTP path traversal validation (`internal/sftp/operations.go`)
    - Add filepath.Clean() and boundary checks on all remote paths
    - Agent: Backend Developer | Effort: S | Risk: Low - validation layer
  
  - Fix-004: Temp file race condition (`internal/editor/editor.go`)
    - Use os.CreateTemp() with 0600 permissions instead of predictable names
    - Agent: Backend Developer | Effort: S | Risk: Low - stdlib replacement

### Changed
- [2026-08-06] **Migrate SQLite to JSON File Storage**
  - **Change:** Replace SQLite database with JSON file for credential storage
  - **Location:** Move from `%APPDATA%\esesha\connections.db` to `connections.json` in executable directory
  - **Rationale:** User-requested portable storage, simpler format, no SQLite dependency
  - **Files to modify:**
    - `internal/db/store.go` — Rewrite: JSON I/O, executable dir path, in-memory struct, file locking
    - `internal/db/connections.go` — Adapt CRUD to slice operations + JSON persistence
    - `go.mod` — Remove modernc.org/sqlite dependency
  - **Agent:** Backend Developer
  - **Effort:** S (2-3 hours)
  - **Risk:** Low - API unchanged, no migration needed (dev phase)
  - **Details:** See `docs/planning/fix-004-sqlite-to-json-storage.md`
  
  **Priority 2: Resource Leaks (implement second)**
  - Fix-005: KeepAlive goroutine leak (`internal/ssh/session.go`)
    - Add context cancellation to KeepAlive loop, cancel on disconnect
    - Agent: Backend Developer | Effort: S | Risk: Low - lifecycle fix
  
  - Fix-006: Editor cleanup on shutdown (`internal/editor/editor.go`, `internal/editor/watcher.go`)
    - Add Close() methods, call from app shutdown hook
    - Agent: Backend Developer | Effort: S | Risk: Low - cleanup addition
  
  **Priority 3: Concurrency & Integration (implement third)**
  - Fix-007: Watcher mutex blocking I/O (`internal/editor/watcher.go`)
    - Move file read outside mutex lock
    - Agent: Backend Developer | Effort: S | Risk: Medium - concurrency change
  
  - Fix-008: Event name mismatch (`frontend/src/lib/Terminal.svelte`, `internal/ssh/session.go`)
    - Align event names: use `ssh:output` consistently in backend + frontend
    - Agent: Frontend Developer + Backend Developer | Effort: S | Risk: Low - rename only
  
  **Acceptance Criteria:**
  - [ ] All security issues resolved (no InsecureIgnoreHostKey, encrypted keys supported, path validation)
  - [ ] No goroutine/file leaks after 10 connect/disconnect cycles
  - [ ] Terminal output displays correctly
  - [ ] Manual security review passed

### Added
- [2026-08-06] PRD-001: SSH/SFTP Desktop Manager - Initial product requirements document
  - SSH connection manager with secure credential storage
  - Integrated SFTP file browser
  - Windows desktop application built with Go + Wails v2
  - Target: Single executable under 50MB with zero dependencies

## [1.0.0] - TBD

### Planned Features
- SSH connection management (save, connect, terminal)
- SFTP file operations (browse, upload, download, delete, rename, chmod)
- Windows DPAPI-encrypted credential storage
- Native Windows executable with Wails v2 + Svelte frontend
- Host key verification and secure authentication
