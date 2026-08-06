# React Effect Stability Patterns

**Applies to:** `frontend/src/components/Terminal.tsx`, `frontend/src/components/App.tsx`, `frontend/src/components/FileExplorer.tsx`
**Last updated:** 2026-08-06
**Related fix:** Fix-012 (see [changelog](../planning/changelog.md))
**Purpose:** Document the effect-dependency patterns introduced by Fix-012 so future edits don't reintroduce the terminal flicker or file manager navigation bugs.

## Why These Patterns Exist

Two critical bugs were caused by unstable `useEffect` dependency arrays:

1. **Terminal flicker + input failure** — the terminal's setup effect depended on `[connectionId, onConnect, onDisconnect]`. `handleConnect`/`handleDisconnect` were recreated on every `App` render, so the effect re-ran constantly, disposing and recreating the xterm instance on each run (flicker, focus loss, dropped input). `React.StrictMode`'s double-mount in dev amplified the churn.
2. **File manager navigation reset** — the event effect depended on `[sessionId, currentPath]`. `loadDirectory()` calls `setCurrentPath()`, which re-triggered the effect, which called `loadDirectory('/')` — snapping the user back to root on every folder double-click or breadcrumb click.

The patterns below prevent both classes of bug.

## Pattern 1 — Split Mount-Only Setup from Connection Logic (`Terminal.tsx`)

xterm is an imperative, non-React resource. Create it once, never recreate it:

```typescript
// Mount-only: create xterm, addons, and event listeners once
useEffect(() => {
  // ... new XTerm(), addons, terminal.open(), event listeners ...
  return () => { /* dispose xterm, remove listeners */ };
}, []); // NEVER add deps here

// Connection-only: connect when the selected connection changes
useEffect(() => {
  if (!connectionId || !xtermRef.current) return;
  // ... ConnectSSH, write session id to sessionIdRef ...
}, [connectionId]); // ONLY connectionId
```

**Rules:**

- The setup effect has an **empty** dependency array.
- The connection effect depends on **`connectionId` only** — never on callbacks, state, or other props.
- All event listeners (`ssh:output`, `ssh:error`, `ssh:closed`, `resize`) are registered exactly once, in the setup effect.
- All component state that must survive effect re-runs lives in refs (`sessionIdRef`, `isConnected`, `xtermRef`, `fitAddonRef`).

## Pattern 2 — Callback Refs for Unstable Props

When a prop (like an event handler) changes identity frequently but an effect must not re-run on those changes, mirror it into a ref:

```typescript
const onConnectRef = useRef(onConnect);
const onDisconnectRef = useRef(onDisconnect);

// Keep the refs current without re-running xterm setup
useEffect(() => {
  onConnectRef.current = onConnect;
  onDisconnectRef.current = onDisconnect;
}, [onConnect, onDisconnect]);
```

Event handlers inside the mount-only effect call `onConnectRef.current(...)` / `onDisconnectRef.current()` — always the latest version, never triggering re-runs.

## Pattern 3 — `useCallback` for Handlers Passed as Props (`App.tsx`)

Handlers passed down to child components must be memoized; otherwise the child sees a new function identity every render:

```typescript
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

**Note:** these callbacks still change identity when `activeConnection?.name` changes (one render between selecting a connection and the connect completing). Pattern 2's callback refs in `Terminal.tsx` absorb that change — the terminal setup still never re-runs.

## Pattern 4 — Keep Latest State in a Ref, Out of Effect Deps (`FileExplorer.tsx`)

Event handlers that read the *current* path must not re-run the effect when the path changes. Mirror the path into a ref and update both together:

```typescript
const [currentPath, setCurrentPath] = useState('/');
// Keeps event handlers reading the latest path without re-running the effect
const currentPathRef = useRef('/');

const loadDirectory = async (path: string) => {
  // ...
  setItems(result || []);
  setCurrentPath(path);         // drives the UI (breadcrumbs, list re-render)
  currentPathRef.current = path; // drives event handlers
};
```

The effect registering `sftp:progress` / `editor:saved` / `editor:error` listeners depends on **`[sessionId]` only** and loads the initial root directory. `loadDirectory` no longer loops back through the effect, so navigation sticks.

## Pattern 5 — `cancelled` Flag for Async Effects (StrictMode-safe)

The connection effect guards against stale async completions:

```typescript
let cancelled = false;
const connect = async () => {
  const sid = await window.go.main.App.ConnectSSH(connectionId, cols, rows);
  if (cancelled) {
    // Unmounted during connect — dispose our own session, never touch dead xterm
    window.go.main.App.DisconnectSSH(sid);
    return;
  }
  sessionIdRef.current = sid;
  isConnected.current = true;
  xtermRef.current.focus();
  onConnectRef.current(sid);
};
connect();
return () => { cancelled = true; };
```

This makes the effect safe under React 18 StrictMode's double-mount and prevents a stale connect from writing into a disposed xterm instance.

## Troubleshooting

**Symptom: terminal flickers or refuses keyboard input again**

1. Check `Terminal.tsx`: is `onConnect`/`onDisconnect`/any state back in the connection effect's dependency array? It must be `[connectionId]`.
2. Check `App.tsx`: are `handleConnect`/`handleDisconnect` still wrapped in `useCallback`? Plain function declarations recreate them on every render.
3. Check `Terminal.tsx`: are `onConnectRef`/`onDisconnectRef` present, and do the listeners call `onConnectRef.current()`? Direct calls capture stale props.

**Symptom: folder double-click snaps back to root**

1. Check `FileExplorer.tsx`: the event effect must depend on `[sessionId]` only.
2. Check that `currentPathRef.current` is updated inside `loadDirectory` — event handlers must read the ref, not a captured `currentPath`.
3. Check the console for `[FileExplorer] loadDirectory called:` logs (added in Fix-011) to confirm which path is being loaded.

**Verification after any change:**

```bash
cd frontend
npx tsc --noEmit   # must exit 0
npm run build      # must succeed
```

Manual: connect → type in terminal → switch to Files → double-click folders → use breadcrumbs → switch back to Terminal → verify focus and input still work.

## Related

- [Known Issues & Technical Debt](known-issues.md) — includes a High-priority unmount race in `Terminal.tsx`'s connection effect
- [Fix-012 root-cause analysis](../planning/fix-012-terminal-flicker-navigation-root-cause.md)
- [Changelog](../planning/changelog.md)
