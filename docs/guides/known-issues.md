# Known Issues & Technical Debt

**Last updated:** 2026-08-06

Open issues and deferred work, tracked from code review (Debugger/Reviewer). These are not yet fixed.

## Low — Status-bar `error` state is unreachable (PRD-004)

**Status:** Open — deferred (non-blocking, flagged by Reviewer during PRD-004 review, 2026-08-06)

**Finding:** The status bar derivation in `App.tsx` includes an `error` state:

```typescript
const statusState =
  sessionId && activeConnection ? 'connected'
  : !activeConnection && sessionId ? 'error'   // ← never true
  : activeConnection ? 'connecting'
  : 'idle';
```

`sessionId` and `activeConnection` are always set/cleared together (`handleConnect` sets both, `handleDisconnect`/`closeConnection` clear both), so `!activeConnection && sessionId` can never occur. The `statusError` style exists and is correct.

**User-visible impact:** a failed SSH connect leaves the status bar pulsing `connecting` forever instead of showing the red `error` state.

**Suggested fix:** make `error` derive from an actual failure signal — e.g., track connect failure in state (the `Terminal` `onConnect` callback is only invoked on success; there is currently no error callback wired through), or clear `activeConnection` on connect failure so the bar drops to `idle`. Needs a small logic review; the fix is visual-only, no backend changes.

**See:** [Design System — Status Bar](../design-system.md#status-bar-signature-element)

## High — Unmount race in `Terminal.tsx` connection effect

**Status:** Open (flagged by Debugger/Reviewer during Fix-012 review, 2026-08-06)

**Finding:** The connection effect's cleanup sets `cancelled = true` but does **not** await the in-flight `connect()` promise:

```typescript
connect();
return () => { cancelled = true; }; // does not await the pending connect()
```

Because the async callback is registered synchronously and the state update is synchronous in React 18, the classic "cleanup fires before resolved callback" StrictMode false-positive is suppressed. However, a real race remains:

**Failure scenario (slow SSH connect + tab switch/disconnect):**

1. User selects a connection; the `ConnectSSH` promise is slow (network/handshake).
2. User switches tabs or disconnects → `Terminal` unmounts while the promise is still in flight.
3. Terminal re-mounts → new xterm + new connect starts.
4. The stale connect resolves **after** the re-mount → overwrites `sessionIdRef` of the live terminal.
5. Terminal input now targets a dead/stale session — input goes nowhere with no visible error.

**Suggested fix:** wrap the `connect()` invocation in `.then()`/`.catch()` so cleanup and the resolution are serialized by the microtask queue:

```typescript
connect().then(/* ... */).catch(/* ... */);
```

**Impact:** Low probability (requires a slow connect plus an unmount during connect), but the failure mode is confusing to users.

## Low — `sessionIdRef` not nulled on disconnect

**Status:** Open

`handleDisconnected` sets `isConnected.current = false` but does not null `sessionIdRef.current`. All accessors guard with `isConnected`, so impact is low; the mount-only effect's cleanup does null it on unmount. Suggested hygiene fix: null it in `handleDisconnected` too.

## Info — ESLint a11y/style warnings (pre-existing)

`get_errors` reports ESLint accessibility/style rule warnings in the frontend components. These are pre-existing, unrelated to Fix-012, and are not TypeScript errors. The project has no ESLint gate in its build.

## Related

- [React Effect Stability Patterns](react-effect-stability.md)
- [Design System](../design-system.md)
- [Changelog](../planning/changelog.md)
