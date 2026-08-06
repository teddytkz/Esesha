# Fix Plan: Three User-Requested Improvements (connections.json persistence, standard tabs, full terminal layout)

**Related PRD:** PRD-004 (Futuristic UI Redesign — regression surface for items 2 & 3)
**Severity:** High (item 1: user data loss) / Low (items 2 & 3: visual polish)
**Reported by:** User (Indonesian feedback)
**Date:** 2026-08-06

---

## User Requests (as reported)

1. **"untuk connection.json jangan di hapus kalau rebuild ulang"** — don't delete `connections.json` on rebuild
2. **"button Terminal dan Files buat standart jangan ada biru dibawahnya"** — Terminal/Files tab buttons should be standard, remove the blue line underneath
3. **"layout terminal buat full"** — terminal layout should be full/expanded
4. **"file connection.json tetep 1 folder dengan file exe tapi jangan di delete waktu rebuild"** — `connections.json` stays **in the same folder as the exe**, but must not be deleted on rebuild

> **Note:** Request 4 resolves the open question from the changelog draft — the user wants the file to **remain next to the exe** (Option b). **No AppData migration.**

---

## Bug Summary

**Bug 1: `connections.json` deleted on every rebuild (user data loss — HIGH)**

- Component: `build.bat`, `internal/db/store.go`
- Symptom: Running `build.bat` wipes the entire `build\bin` folder, destroying the user's saved SSH connections and host keys.
- Current data: `build/bin/connections.json` holds the user's real server (id 1, `43.157.235.7:50171`).

**Bug 2: Blue underline under active Terminal/Files tab**

- Component: `frontend/src/components/App.module.css`
- Symptom: The active tab has a cyan (blue) inset underline at its bottom edge — the "biru dibawahnya".

**Bug 3: Terminal does not fill the content area**

- Component: `frontend/src/components/Terminal.module.css`, `frontend/src/components/App.module.css`
- Symptom: The terminal floats inside a padded, bordered, rounded card with visible gaps around the xterm canvas instead of filling the content area.

---

## Root Cause Analysis

### Bug 1: `build.bat:5` deletes the data file along with the binary

```bat
REM Clean previous builds
if exist build\bin rmdir /s /q build\bin   ← wipes build\bin (incl. connections.json)
...
wails build -clean ...                     ← -clean flag also wipes build output
```

`internal/db/store.go:36-41` resolves the storage path as `filepath.Join(filepath.Dir(os.Executable()), "connections.json")` — i.e. **same folder as `esesha.exe`** (= `build\bin`). Every rebuild:
1. `rmdir /s /q build\bin` deletes the whole folder
2. `wails build -clean` cleans again
3. New exe launches with no `connections.json` → `load()` falls through to `save()` → empty connection list

The user explicitly wants the file to **stay next to the exe** (request 4), so the fix is to make the build script preserve it, not to relocate storage.

### Bug 2: `.tab.active` inset box-shadow

`frontend/src/components/App.module.css:417`:

```css
.tab.active {
  background: var(--bg-active);
  color: var(--accent-primary);
  box-shadow: inset 0 -2px 0 var(--accent-primary);   ← the "biru dibawahnya"
}
```

`box-shadow: inset 0 -2px 0 var(--accent-primary)` paints a 2px cyan line along the bottom inner edge of the active tab. The active state is already clearly distinguishable via `background: var(--bg-active)` + cyan text, so the underline is redundant decoration.

### Bug 3: Double nesting creates the padded, boxed look

The terminal is wrapped twice:

- `App.tsx:240` — `styles.terminalWrapper` (`App.module.css:462`): `flex: 1; overflow: hidden; border-radius: var(--radius-lg)` + `terminalWrapperActive` (`App.module.css:469`): `border: 1px solid rgba(34,211,238,0.4); box-shadow: var(--glow-cyan)` — the connection-state glow frame (a PRD-004 signature element)
- `Terminal.tsx:182` — `styles.terminalContainer` (`Terminal.module.css:1`): `flex: 1; min-height: 0; padding: 12px; background: var(--bg-primary); border: 1px solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden` around the xterm host

Net effect: 12px padding + 1px border + rounded corners create visible gaps between the xterm canvas and the content area edges.

---

## Fix Strategy

### Option A: Minimal Fix (Recommended)

**Bug 1 — backup/restore in `build.bat`:** Before the cleanup, copy `build\bin\connections.json` to a safe temp location outside `build\bin`; after the build completes, restore it. Also drop the redundant `-clean` flag (our own `rmdir` already cleans; `-clean` just adds a second wipe vector). `internal/db/store.go` is **unchanged** — the file stays next to the exe per user request 4.

**Bug 2 — delete the inset underline:** Remove the `box-shadow: inset 0 -2px 0 var(--accent-primary);` line from `.tab.active`. Active tab keeps `background: var(--bg-active)` + `color: var(--accent-primary)` — standard flat tab.

**Bug 3 — strip inner chrome from `.terminalContainer`:** Remove `padding: 12px`, `border`, `border-radius`, and `background` from `.terminalContainer`; keep `flex: 1; min-height: 0; overflow: hidden; position: relative;`. Keep `.terminal { padding: 8px }` (xterm needs a small inset for its own cursor/scrollbar). The glow frame from `terminalWrapperActive` is preserved.

**Files:**
- `build.bat`
- `frontend/src/components/App.module.css`
- `frontend/src/components/Terminal.module.css`

**Risk:** Low (build script + 2 pure-CSS property removals)
**Effort:** S

### Option B: Thorough Fix

**Bug 1:** Migrate storage to `os.UserConfigDir()/esesha/connections.json` (`%AppData%\esesha\`) with legacy one-time migration — immune to *any* build-dir wiping, not just `build.bat`. **Rejected:** contradicts user request 4 ("tetep 1 folder dengan file exe").

**Bug 3:** Also strip `border-radius` from `.terminalWrapper` and the `terminalWrapperActive` border/glow so the xterm canvas touches all four edges — removes the PRD-004 glow frame entirely. **Not recommended:** kills a signature design element the user hasn't complained about.

**Recommended: Option A** — matches the user's explicit requirements exactly with minimal risk.

---

## Implementation Tasks

| Task | Agent   | Files          | Description |
| ---- | ------- | -------------- | ----------- |
| 1.1  | Backend Developer / Script | `build.bat` | Backup `build\bin\connections.json` → `build\connections.json.bak` before `rmdir`; restore after `wails build`; remove `-clean` flag; keep `wails build -platform windows/amd64 -ldflags "-s -w"` |
| 1.2  | Frontend Developer | `frontend/src/components/App.module.css` | Delete `box-shadow: inset 0 -2px 0 var(--accent-primary);` from `.tab.active` (~line 417) |
| 1.3  | Frontend Developer | `frontend/src/components/Terminal.module.css` | In `.terminalContainer`: remove `padding: 12px`, `border: 1px solid ...`, `border-radius: var(--radius-lg)`, `background: var(--bg-primary)`; keep `flex: 1; min-height: 0; overflow: hidden; position: relative;` |
| 2.1  | Debugger/Reviewer | all | Verify acceptance criteria + no regressions |
| 2.2  | Documentation | `docs/planning/changelog.md` | Finalize Fix-014 entry, link this plan |

**Parallelization note:** Tasks 1.1, 1.2, 1.3 touch three disjoint files → fully parallelizable. Task 2.1 requires all of Phase 1.

---

## build.bat Change Detail (Task 1.1)

```bat
@echo off
echo Building Esesha SSH Manager...
echo.

REM ── Preserve user data (connections.json lives next to the exe) ──
if exist build\bin\connections.json (
    copy /y build\bin\connections.json build\connections.json.bak >nul
    echo Backed up connections.json
)

REM Clean previous builds
if exist build\bin rmdir /s /q build\bin
echo Cleaned previous builds

REM Build for Windows AMD64 (-clean removed: rmdir above already cleans;
REM and -clean is a second deletion vector for connections.json)
echo Building Windows binary...
wails build -platform windows/amd64 -ldflags "-s -w"

if %errorlevel% neq 0 (
    echo Build failed!
    exit /b %errorlevel%
)

REM ── Restore user data ──
if exist build\connections.json.bak (
    copy /y build\connections.json.bak build\bin\connections.json >nul
    del build\connections.json.bak
    echo Restored connections.json
)
...rest unchanged...
```

**Edge cases:**
- No `connections.json` present → backup/restore blocks silently skip (file is created fresh by the app on first run)
- App running during rebuild → `copy` may fail if the file handle is held; `>nul` swallows the error and the build proceeds (user should close the app before rebuilding anyway). Optional hardening: use `xcopy /y` with `if errorlevel 1` message

---

## Acceptance Criteria

- [ ] **Bug 1:** Run `build.bat` → existing connections still present in `build\bin\connections.json` after build; app lists them on launch
- [ ] **Bug 1:** No `connections.json` present → build succeeds, file created fresh on first app run
- [ ] **Bug 2:** Active tab shows `background: var(--bg-active)` + cyan text only — **no** underline; inactive tabs, hover, and focus-visible states unchanged
- [ ] **Bug 3:** Terminal fills the content area edge-to-edge within the cyan glow frame; no 12px padding gap; xterm still renders at correct size on connect and window resize
- [ ] `go build ./...` passes; `tsc --noEmit` / `npm run build` passes

## Regression Risk

| Area | Risk |
| ---- | ---- |
| Build script | Low — backup/restore is additive; build command otherwise unchanged (minus redundant `-clean`) |
| Tab styling | Low — pure CSS property removal, no logic touched |
| Terminal layout | Low — CSS-only; `flex: 1; min-height: 0` preserved so xterm fit-addon sizing still works |
| Storage | None — `internal/db/store.go` untouched; file location unchanged (per user request 4) |

---

## Rollback Strategy

- **Bug 1:** Revert `build.bat` to the previous version (git checkout). Data is preserved by the backup/restore mechanism until then.
- **Bugs 2 & 3:** Re-add the removed CSS lines — single-property reverts.

---

## Version History

| Version | Date | Summary |
| ------- | ---- | ------- |
| v0.1.0 | 2026-08-06 | Initial plan — Option A (build.bat backup/restore + 2 CSS fixes) |
