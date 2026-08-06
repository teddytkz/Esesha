# Fix Plan: Terminal Flickering & File Manager Navigation

**Severity:** Critical
**Reported by:** User
**Date:** 2026-08-06

---

## Bug Summary

**Bug 1: Terminal Flickering/Blinking**
- Component: `Terminal.tsx`
- Symptom: Terminal continuously blinks/flickers during use

**Bug 2: File Manager Navigation Broken**
- Component: `FileExplorer.tsx`
- Symptom: Cannot navigate/change folders

---

## Root Cause Analysis

### Bug 1: Terminal Flickering

**Suspected Root Cause:** Dependency array in `useEffect` includes `isConnected` which changes state, causing re-render loop.

**Evidence from code review:**
- Line 36: `useEffect(() => { ... }, [connectionId, onConnect, onDisconnect]);`
- Line 20: `const [isConnected, setIsConnected] = useState(false);`
- Line 64: `setIsConnected(true)` inside effect → triggers re-render
- Line 99: `setIsConnected(false)` in event handler
- **Problem:** The effect creates event listeners that call `setIsConnected`, but changes to `isConnected` are not in dependency array. This can cause stale closures or missed cleanup. Terminal might be flickering due to rapid connect/disconnect cycles or xterm disposal/recreation.

**Specific Issue:**
The `useEffect` disposes and recreates the entire xterm instance whenever `connectionId` changes, but also uses `isConnected` in event handlers without proper dependency management. This creates inconsistent state.

### Bug 2: File Manager Navigation

**Suspected Root Cause:** `navigateTo` function receives breadcrumb index but uses it incorrectly, or `loadDirectory` is being called but not updating state properly.

**Evidence from code review:**
- Line 257-261: `navigateTo` function slices path parts
- Line 272-277: Breadcrumb buttons call `navigateTo(i)` where `i` is the map index
- Line 101-113: `loadDirectory` async function
- **Problem:** The breadcrumb click handlers pass the correct index, but there may be an issue with:
  1. Path construction logic in `navigateTo`
  2. State updates not triggering re-render
  3. Missing error handling in `loadDirectory`

**Additional finding:** 
- Line 48: `loadDirectory('/')` is called in useEffect when sessionId changes
- No visible errors in the logic, but navigation might fail silently if Go backend call fails

---

## Fix Strategy

### Option A: Minimal Fix (Recommended)

**Bug 1 Fix:**
- Remove `isConnected` state updates that trigger re-renders
- Use ref for connection state instead of useState
- Ensure xterm instance is not recreated unnecessarily

**Bug 2 Fix:**
- Add error logging to `loadDirectory` and `navigateTo`
- Verify path construction logic
- Add console logging to debug navigation flow

**Files:**
- `frontend/src/components/Terminal.tsx`
- `frontend/src/components/FileExplorer.tsx`

**Risk:** Low - focused changes, easy to revert
**Effort:** S (1-2 hours)

### Option B: Thorough Fix

**Bug 1 Fix:**
- Refactor terminal component to separate connection logic from render logic
- Extract xterm setup to custom hook
- Add proper effect cleanup with abort controllers

**Bug 2 Fix:**
- Rewrite navigation logic with explicit state machine
- Add comprehensive error boundaries
- Unit tests for path manipulation

**Risk:** Medium - larger refactor
**Effort:** M (4-6 hours)

**Recommended:** Option A - solve the immediate bugs with minimal changes

---

## Implementation Tasks

| Task | Agent | Files | Description |
|------|-------|-------|-------------|
| 1.1 | Frontend Developer | `frontend/src/components/Terminal.tsx` | Fix terminal flicker: Change `isConnected` from useState to useRef to prevent re-render loop. Update all references (lines 20, 64, 99, 116). |
| 1.2 | Frontend Developer | `frontend/src/components/FileExplorer.tsx` | Fix navigation: Add error boundary to `navigateTo` function. Add console.error to catch silent failures in `loadDirectory`. Verify path construction at line 257-261. |
| 1.3 | Frontend Developer | Both components | Add debug logging (can be removed after verification): console.log in `loadDirectory` before/after API call, console.log in `navigateTo` with computed path. |

---

## Detailed Fix Steps

### Bug 1: Terminal.tsx Changes

**Line 20:** Change from:
```typescript
const [isConnected, setIsConnected] = useState(false);
```
To:
```typescript
const isConnectedRef = useRef(false);
```

**Line 24-26:** Update imperative handle:
```typescript
disconnect: () => {
  if (isConnectedRef.current && sessionIdRef.current && window.go?.main?.App?.DisconnectSSH) {
```

**Line 64:** Change from:
```typescript
setIsConnected(true);
```
To:
```typescript
isConnectedRef.current = true;
```

**Line 69:** Update onData handler:
```typescript
terminal.onData(data => {
  if (isConnectedRef.current && sessionIdRef.current && window.go?.main?.App?.SendInput) {
```

**Line 81:** Update handleResize:
```typescript
if (isConnectedRef.current && sessionIdRef.current && window.go?.main?.App?.ResizeTerminal) {
```

**Line 99:** Update handleDisconnected:
```typescript
isConnectedRef.current = false;
```

### Bug 2: FileExplorer.tsx Changes

**Line 257-261:** Add error handling and logging:
```typescript
const navigateTo = (index: number) => {
  console.log('[FileExplorer] navigateTo called', { index, currentPath, pathParts });
  const parts = currentPath.split('/').filter(p => p);
  const newParts = parts.slice(0, index + 1);
  const newPath = newParts.length === 0 ? '/' : '/' + newParts.join('/');
  console.log('[FileExplorer] navigating to:', newPath);
  loadDirectory(newPath);
};
```

**Line 101-113:** Add error logging:
```typescript
const loadDirectory = async (path: string) => {
  console.log('[FileExplorer] loadDirectory called:', path);
  setLoading(true);
  setErrorMsg('');
  try {
    if (window.go?.main?.App?.ListDirectory) {
      const result = await window.go.main.App.ListDirectory(sessionId, path);
      console.log('[FileExplorer] loaded directory:', { path, itemCount: result?.length || 0 });
      setItems(result || []);
      setCurrentPath(path);
    } else {
      console.error('[FileExplorer] ListDirectory method not available');
      setErrorMsg('File system API not available');
    }
  } catch (err) {
    console.error('[FileExplorer] loadDirectory error:', err);
    setErrorMsg(`Failed to load directory: ${err}`);
  }
  setLoading(false);
};
```

---

## Acceptance Criteria

- [ ] Terminal does not flicker/blink during normal operation
- [ ] Terminal maintains stable connection without visual artifacts
- [ ] Can click on any breadcrumb folder and navigate to it successfully
- [ ] "Up" button works correctly
- [ ] Root "/" navigation works
- [ ] No console errors during navigation
- [ ] File list updates correctly when changing directories
- [ ] All existing terminal features still work (input, resize, disconnect)
- [ ] All existing file explorer features still work (upload, download, context menu)

---

## Testing Checklist

**Terminal Tests:**
1. Open connection → verify no flickering
2. Type commands → verify no flickering
3. Resize window → verify no flickering
4. Leave idle for 30 seconds → verify stable display
5. Close connection → verify clean disconnect

**File Manager Tests:**
1. Click root breadcrumb → should navigate to /
2. Navigate to /home/user/folder → click "user" in breadcrumb → should go to /home/user
3. Click "Up" button repeatedly → should traverse up correctly
4. Click deepest folder in breadcrumb → should navigate there
5. Navigate to empty folder → verify no errors
6. Navigate to folder with many files → verify loads correctly

---

## Regression Risk

**Low Risk:**
- Terminal: Changing from useState to useRef for connection state does not affect render logic, only prevents unnecessary re-renders
- FileExplorer: Adding logging does not change behavior, only adds observability

**Areas to Watch:**
- Terminal disconnect functionality (imperative handle uses isConnected)
- Terminal input handling (uses isConnected in event handler)
- FileExplorer state updates (ensure setCurrentPath still triggers re-render)

---

## Rollback Strategy

If issues arise:
1. Git revert to previous commit
2. Both bugs are isolated to single components
3. No database or backend changes required
4. No dependency changes required

Simple rollback: restore previous versions of Terminal.tsx and FileExplorer.tsx

---

## Notes

- ponytail: Debug console.logs can be removed after verification. Leave them in if helpful for future debugging.
- ponytail: If terminal flickering persists after ref change, investigate xterm disposal/recreation cycle - may need to extract terminal instance to parent component.
- ponytail: If navigation still fails, check Go backend ListDirectory method for errors - may need server-side logging.
