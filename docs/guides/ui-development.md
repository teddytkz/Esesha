# UI Development Guide — Building with the Mission Control Design System

**Applies to:** `frontend/src/**` (React 18 + TypeScript + CSS Modules)
**Last updated:** 2026-08-06
**Related:** [Design System](../design-system.md) — token reference and component patterns
**Purpose:** How to add or modify UI without breaking the design system introduced by PRD-004. Read the design system doc for *what the tokens are*; read this for *how to use them correctly*.

## The Two-Layer Styling Model

Esesha uses **CSS Modules** for component styles plus **CSS custom properties** in `global.css` for design tokens. No Tailwind, no styled-components, no inline styles for anything visual.

**Layer 1 — Global tokens (`frontend/src/styles/global.css`).** The only place raw hex lives:

```css
:root {
  --accent-primary: #22d3ee;
  --radius-md: 8px;
  --transition-normal: 150ms ease-in-out;
}
```

**Layer 2 — Per-component module CSS (`*.module.css`).** Tokens only, never new hex:

```css
/* MyComponent.module.css */
.saveButton {
  background: var(--accent-primary);
  color: #04121a;                 /* documented exception: text on cyan */
  border-radius: var(--radius-md);
  transition: background var(--transition-normal);
}

.saveButton:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}
```

**Layer 3 — Global utility classes (also in `global.css`).** Currently only `.skeleton`. These are *not* module-scoped — see the gotcha below.

## Global vs. Module Classes — the "skeleton" Gotcha (Fix-013)

`global.css` defines `.skeleton` outside any module. When you reference it, you must use the **literal string** — CSS Modules cannot resolve it:

```tsx
{/* ✅ Correct — literal string for a global utility class */}
<div className={`skeleton ${styles.skelCell}`} />

{/* ✅ Correct — module-scoped class via styles.* */}
<div className={styles.skeletonRow} />

{/* ❌ WRONG — styles.skeleton is undefined (Fix-013 bug) */}
<div className={styles.skeleton} />
```

`styles.skeleton` silently resolves to `undefined` at runtime (Vite's `Record<string, string>` typing hides it from `tsc`), so the element renders **invisible** — no background, no shimmer. This exact bug shipped in PRD-004 and was fixed in Fix-013.

**Rule of thumb:** module classes are always `styles.<name>`; anything defined in `global.css` is a literal string in JSX.

## Adding a New Component — Checklist

- [ ] All colors via `var(--token)` from `global.css` — no new hex (exceptions listed in the design system doc)
- [ ] Radii from `--radius-*`, elevation from `--shadow-*` / `--glow-*`
- [ ] Fonts via `--font-display` (headings/brand), `--font-mono` (data), `--font-body` (default)
- [ ] Spacing on the 8px grid (`--spacing-*`)
- [ ] `:focus-visible` outline on every interactive element: `outline: 2px solid var(--border-focus); outline-offset: 2px;`
- [ ] Icons from `lucide-react` with `aria-hidden="true"` when decorative; `aria-label` on icon-only buttons
- [ ] Interactive elements are real `<button type="button">` (or have `tabIndex={0}` + a keyboard handler, like file rows)
- [ ] Any new keyframe has a static reduced-motion fallback (see below)
- [ ] No native `confirm()`/`prompt()`/`alert()` — use the Dialog pattern from `FileExplorer.tsx`
- [ ] `aria-busy="true"` + `aria-label` on loading regions; `role="dialog"` + `aria-modal` on overlays

## Common Patterns (copy from the existing code)

### Buttons

Primary (cyan) / secondary (bordered) / danger variants are defined in `App.module.css` (`btnAdd`, `btnRefresh`) and `FileExplorer.module.css` (`btn`, `btnUpload`, `btnRetry`). Reuse the class structure rather than inventing a new button look:

```tsx
<button type="button" className={styles.btn} onClick={handleX}>
  <Upload size={16} aria-hidden="true" />
  Upload
</button>
```

### Dialogs

The reusable `Dialog` component lives inside `FileExplorer.tsx` (delete / rename / chmod). If you need a new confirmation dialog, follow its shape:

- Overlay: `--bg-overlay` + `backdrop-filter: blur(3px)`, click-to-cancel, `role="dialog"` `aria-modal="true"` `aria-labelledby`/`aria-describedby`
- Escape closes (window keydown listener)
- Focus on open: Cancel for destructive actions, the input (selected) for inputs
- Card: `--bg-tertiary`, `--radius-lg`, `--shadow-lg`, ~380px

### Skeletons

Shape classes in your `.module.css`, shimmer from the global `.skeleton` (as a **literal string**):

```tsx
<div className={styles.skeletonRow}>
  <div className={`skeleton ${styles.skelCell} ${styles.skelName}`} />
</div>
```

Show skeletons only on first load; subsequent refreshes should spin the refresh icon instead.

### Empty states

Icon (40px, slate, optional cyan drop-shadow) → `--font-display` heading → `--text-secondary` copy → optional CTA.

## Accessibility Requirements

These are enforced by the design system, not optional:

1. **Reduced motion.** The global override in `global.css` kills all animations under `prefers-reduced-motion: reduce`. If your animation carries *meaning* (status, loading, connection state), give the element an explicit static fallback inside your component CSS — see `.statusConnecting` and `.skeleton` for the pattern.
2. **Focus visibility.** Every interactive element gets the `:focus-visible` outline (2px `--border-focus`, offset 2px). Never remove outlines with `outline: none` on interactive elements.
3. **ARIA.** Dialogs: `role="dialog"` + `aria-modal="true"` + labelled/described-by. File rows: `role="row"` + `aria-label`. Errors: `role="alert"`. Loading: `aria-busy`. Decorative icons: `aria-hidden="true"`. Icon-only buttons: `aria-label`.
4. **Keyboard.** All actions reachable by keyboard: file rows (`tabIndex={0}`, Enter opens, Delete deletes), breadcrumbs are buttons, Escape closes dialogs and menus. The right-click context menu is pointer-driven by nature — its actions (Edit, Download, Rename, Permissions, Delete) are also reachable via the row keys where applicable.

## Rules

1. No new CSS frameworks, no new icon libraries, no new fonts.
2. Raw hex only in `global.css` (documented exceptions apply).
3. No native browser dialogs.
4. Every keyframe pairs with a reduced-motion fallback.
5. Every interactive element has a visible focus ring.
6. Never modify the `Terminal.tsx` mount-only effect — theme colors only (see [react-effect-stability.md](react-effect-stability.md)).

## Troubleshooting

**Symptom: skeleton cells render invisible (blank area while loading)**

Check for `styles.skeleton` — it must be the literal string `"skeleton"` (Fix-013).

**Symptom: animations still run with OS reduced-motion enabled**

The global override should handle all animations. If a component sets `animation` with a higher-specificity rule that wins, add a local `@media (prefers-reduced-motion: reduce)` block (see `.statusConnecting` in `App.module.css`).

**Symptom: new color looks "off"**

Verify you used a token, not a hardcoded hex, and that the token fits its semantic role (cyan = primary action, green = success, red = danger). If no existing token fits, add the token to `global.css` `:root` — never inline a one-off color.

## Related

- [Design System](../design-system.md) — token reference
- [React Effect Stability Patterns](react-effect-stability.md) — for `Terminal.tsx` / `FileExplorer.tsx` logic
- [Known Issues](known-issues.md)
