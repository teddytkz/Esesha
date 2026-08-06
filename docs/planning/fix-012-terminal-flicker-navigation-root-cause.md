# Fix Plan: Terminal Flicker & Input Failure + File Manager Navigation

**Related PRD:** PRD-002 (Svelte→React migration — bugs introduced here)
**Related Fix:** fix-011 (addressed symptoms only; root causes below remain)
**Severity:** Critical
**Reported by:** User
**Date:** 2026-08-06

---

## Bug Summary

**Bug 1: Terminal flicker and input failure**
- Component: `frontend/src/components/Terminal.tsx`, `frontend/src/components/App.tsx`, `frontend/src/main.tsx`
- Symptom: Terminal continuously disposes/recreates the xterm instance → flicker, keyboard focus lost, no input accepted. Amplified by `React.StrictMode` (double-mount in dev).

**Bug 2: File manager cannot navigate folders**
- Component: `frontend/src/components/FileExplorer.tsx`
- Symptom: Double-clicking a folder or clicking a breadcrumb snaps back to `/` — user can never leave root.

---

## Root Cause Analysis

### Bug 1: Terminal flicker — unstable effect dependencies

`Terminal.tsx` line 36 effect depends on `[connectionId, onConnect, onDisconnect]`. The `onConnect`/`onDisconnect` props are `handleConnect`/`handleDisconnect` from `App.tsx` (lines 61, 66) — plain function declarations recreated on **every** App render. Because they're in the dependency array:

1. Any App state change (e.g. `setSessionId`, `setStatusText` in `handleConnect`) recreates the callbacks
2. Effect re-runs → full xterm instance disposed and recreated
3. Reconnect cycle starts again → infinite dispose/recreate loop → flicker
4. Each recreation steals keyboard focus and drops queued input → no input accepted
5. `React.StrictMode` in `main.tsx` mounts/unmounts/mounts on first render, doubling the churn in dev

`fix-011` already changed `isConnected` from `useState` to `useRef` — that removed one re-render source, but the effect still tears down and rebuilds the whole terminal whenever App re-renders, so the flicker persists.

### Bug 2: Navigation broken — `currentPath` in effect dependency array

`FileExplorer.tsx` line 44-88: the effect depends on `[sessionId, currentPath]` and calls `loadDirectory('/')`. `loadDirectory` itself calls `setCurrentPath(path)` (line 111). Sequence on folder double-click:

1. `handleDoubleClick` → `loadDirectory('/sub')` → `setCurrentPath('/sub')`
2. Effect re-runs because `currentPath` changed
3. Effect calls `loadDirectory('/')` → snaps back to root
4. User can never leave root

`fix-011`'s added logging exposed this but didn't fix it.

---

## Fix Strategy

### Option A: Minimal Fix (Recommended)

- **Bug 1:** Split terminal creation (mount-only, empty deps) from connection logic; keep `onConnect`/`onDisconnect` in refs so the effect never re-runs on callback identity changes. App callbacks wrapped in `useCallback`.
- **Bug 2:** Remove `currentPath` from the effect deps; the effect only registers event listeners and loads the initial root directory on `sessionId` change.

**Files:** `frontend/src/components/Terminal.tsx`, `frontend/src/components/App.tsx`, `frontend/src/components/FileExplorer.tsx`
**Risk:** Low — no API/behavior changes, pure effect-dependency corrections
**Effort:** S

### Option B: Thorough Fix

Extract a `useXTerm` hook + a `useSftp`/`useEventListener` hook layer with tests. Larger refactor that overlaps with PRD-003's FileExplorer component split — defer.

**Recommended:** Option A — targeted fixes for the two root causes, no behavior change, easiest to verify and revert.

---

## Implementation Tasks

| Task | Agent   | Files          | Description |
| ---- | ------- | -------------- | ----------- |
| 1.1  | Frontend Developer | `frontend/src/components/Terminal.tsx` | Refactor effect per fix below |
| 1.2  | Frontend Developer | `frontend/src/components/App.tsx` | Wrap `handleConnect`/`handleDisconnect` in `useCallback` |
| 1.3  | Frontend Developer | `frontend/src/components/FileExplorer.tsx` | Refactor effect per fix below |
| 2.1  | Debugger/Reviewer | all three files | Verify acceptance criteria, run manual test checklist, confirm no regressions |
| 2.2  | Documentation | `docs/planning/changelog.md` | Add fix-012 entry (this file) |

**Parallelization note:** Tasks 1.1+1.2 touch `Terminal.tsx`/`App.tsx`; 1.3 touches `FileExplorer.tsx` — no file overlap, runnable in parallel. Task 2.1 requires all of Phase 1.

---

## Detailed Fix Steps

### Task 1.1: `Terminal.tsx` — split setup from connection, stabilize deps

**Step A — Add callback refs** (keep latest props without effect re-runs):

```typescript
const onConnectRef = useRef(onConnect);
const onDisconnectRef = useRef(onDisconnect);
onConnectRef.current = onConnect;
onDisconnectRef.current = onDisconnect;
```

**Step B — Replace line 36 effect** with two effects:

1. **Mount-only effect (empty deps)** — xterm creation, addons, `onData`, resize listener, event listeners, cleanup:

```typescript
useEffect(() => {
  if (!terminalRef.current) return;

  const terminal = new XTerm({ ... });   // unchanged config
  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);
  terminal.loadAddon(new WebLinksAddon());
  terminal.open(terminalRef.current);
  fitAddon.fit();

  xtermRef.current = terminal;
  fitAddonRef.current = fitAddon;

  terminal.onData(data => {
    if (isConnected.current && sessionIdRef.current && window.go?.main?.App?.SendInput) {
      window.go.main.App.SendInput(sessionIdRef.current, data);
    }
  });

  const handleResize = () => { /* unchanged body */ };
  const handleOutput = (data) => { /* unchanged body */ };
  const handleError = (data) => { /* unchanged body */ };
  const handleDisconnected = (data) => {
    if (data.sessionId === sessionIdRef.current) {
      isConnected.current = false;
      if (xtermRef.current) xtermRef.current.writeln('\r\n[Connection closed]');
      onDisconnectRef.current();   // ← ref, not prop
    }
  };

  window.addEventListener('resize', handleResize);
  window.runtime.EventsOn('ssh:output', handleOutput);
  window.runtime.EventsOn('ssh:error', handleError);
  window.runtime.EventsOn('ssh:closed', handleDisconnected);

  return () => {
    window.removeEventListener('resize', handleResize);
    window.runtime.EventsOff('ssh:output');
    window.runtime.EventsOff('ssh:error');
    window.runtime.EventsOff('ssh:closed');
    xtermRef.current?.dispose();
    xtermRef.current = null;
    sessionIdRef.current = null;
    isConnected.current = false;
  };
}, []);   // ← mount only
```

2. **Connection effect (deps `[connectionId]` only)** — auto-connect when the selected connection changes:

```typescript
useEffect(() => {
  if (!connectionId || !xtermRef.current) return;

  let cancelled = false;
  const connect = async () => {
    try {
      const sid = await window.go.main.App.ConnectSSH(
        connectionId, xtermRef.current!.cols, xtermRef.current!.rows
      );
      if (cancelled) {  // cleanup already ran — don't touch disposed xterm
        window.go.main.App.DisconnectSSH(sid);
        return;
      }
      sessionIdRef.current = sid;
      isConnected.current = true;
      xtermRef.current!.focus();
      onConnectRef.current(sid);
    } catch (err) {
      if (!cancelled && xtermRef.current) {
        xtermRef.current.writeln(`\r\nConnection failed: ${err}`);
      }
    }
  };

  connect();
  return () => { cancelled = true; };   // effect-scoped guard
}, [connectionId]);   // ← no onConnect/onDisconnect deps
```

**Step C — `useImperativeHandle`** (`disconnect`, `clear`): bodies unchanged. The `disconnect` method already guards on `isConnected.current`; the effect-level disconnect runs in the `handleDisconnected` event handler (which sets `isConnected.current = false`), so no new `DisconnectSSH` call is needed in cleanup. `DisconnectSSH` on an already-closed session is a no-op on the Go side (idempotent — validated in `ssh/session.go`).

> **StrictMode note:** In dev, mount → cleanup → mount fires once on first render. The empty-dep setup effect handles this correctly (dispose + re-create). The `cancelled` guard prevents a stale async connect from writing into a disposed xterm, and cleans up its own SSH session if cleanup ran first. This satisfies StrictMode without leaking sessions.

### Task 1.2: `App.tsx` — memoize callbacks

```typescript
import React, { useEffect, useState, useRef, useCallback } from 'react';

const handleConnect = useCallback((sid: string) => {
  setSessionId(sid);
  setStatusText(`Connected to ${activeConnection?.name}`);
}, [activeConnection?.name]);

const handleDisconnect = useCallback(() => {
  setStatusText(`Disconnected from ${activeConnection?.name}`);
  setActiveConnection(null);
  setSessionId(null);
}, [activeConnection?.name]);
```

`activeConnection?.name` is stable for the lifetime of a session (set at `selectConnection`, cleared at disconnect), so the callbacks now have stable identities across App renders. Note: `handleDisconnect` in `handleDisconnected` (Terminal) fires during a terminal event — `setActiveConnection(null)` unmounts `Terminal`, whose cleanup runs the mount-effect teardown; `isConnected.current` is already `false` so no double-disconnect.

### Task 1.3: `FileExplorer.tsx` — decouple loading from path changes

Replace the lines 44-88 effect (deps `[sessionId, currentPath]`) with deps `[sessionId]` only:

```typescript
useEffect(() => {
  if (sessionId) {
    loadDirectory('/');   // initial root load only
  }

  const handleProgress = (data) => { /* unchanged — uses setCurrentPath-compatible reload */ };
  const handleEditorSaved = (data) => { /* unchanged */ };
  const handleEditorError = (data) => { /* unchanged */ };

  window.runtime.EventsOn('sftp:progress', handleProgress);
  window.runtime.EventsOn('editor:saved', handleEditorSaved);
  window.runtime.EventsOn('editor:error', handleEditorError);

  return () => {
    window.runtime.EventsOff('sftp:progress');
    window.runtime.EventsOff('editor:saved');
    window.runtime.EventsOff('editor:error');
  };
}, [sessionId]);   // ← no currentPath
```

Key behavioral changes:
- The effect no longer re-runs when `currentPath` changes → no snap-back to `/`.
- Folder double-click: `handleDoubleClick` → `loadDirectory('/sub')` → `setCurrentPath('/sub')` — nothing re-triggers root load. Navigation sticks.
- The event handlers' closures capture `currentPath` **stale** — but this was already the case (they captured whatever `currentPath` was at effect run) and remains a pre-existing minor limitation: an in-flight upload completing after navigation refreshes the pre-navigation directory. That's acceptable for this fix; if it matters, the handler can read the path from a `pathRef` — optional, `ponytail:` defer unless observed.

**StrictMode note:** Effect cleanup (EventsOff) + re-run on the double-mount disposes listeners correctly; no leaked listeners, single `loadDirectory('/')` per real mount.

---

## Acceptance Criteria

- [ ] Terminal does not flicker during normal operation (type, resize, tab switches)
- [ ] Terminal accepts keyboard input immediately after connect and after window resize
- [ ] Connecting to a different connection (or disconnect→reconnect) works without double-session leaks
- [ ] No `xterm disposed`/`null` console errors; no repeated `ConnectSSH` calls in console
- [ ] Dev build with StrictMode: exactly one `ConnectSSH` per mount, no leaked sessions (check Go log)
- [ ] Double-click a folder → navigates in and stays
- [ ] Breadcrumb click → navigates to that folder and stays
- [ ] Up button → navigates up and stays
- [ ] Refresh, upload, download, edit, delete, rename, chmod all still work
- [ ] Upload completion and editor-save refresh the current (not root) directory

---

## Regression Risk

| Area | Risk |
| ---- | ---- |
| Terminal connect flow | Medium — cleanup now runs on unmount only; a race between `connect()` and unmount is guarded by `cancelled`. Verify disconnect→reconnect. |
| FileExplorer event handlers | Low — closure staleness pre-exists; only effect re-run behavior changed. |
| App callbacks | Low — `useCallback` with stable `activeConnection?.name` dep preserves behavior. |
| StrictMode dev | Low — teardown/re-setup is the intended StrictMode check; verify single mount works. |

## Rollback Strategy

Revert the three file changes (git revert of the fix commit). The changes are isolated to frontend components; no backend, schema, or API changes. Rebuilding the frontend (`wails build`) restores the previous behavior.

---

## Version History

| Version | Date | Summary |
| ------- | ---- | ------- |
| v1.0.0 | 2026-08-06 | Initial — root-cause fix for terminal effect loop and file navigation snap-back |
