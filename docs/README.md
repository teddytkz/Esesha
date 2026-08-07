# Esesha Documentation

**Last updated:** 2026-08-07

Documentation index for **Esesha** — an SSH/SFTP desktop manager for Windows (Go + Wails v2, React 18 + TypeScript frontend).

## Project Overview

| Doc | Description |
| --- | --- |
| [Project README](../../README.md) | Product overview, features, usage, build instructions |
| [BUILD.md](../../BUILD.md) | Build and packaging instructions |

## UI / Design System

| Doc | Description |
| --- | --- |
| [Design System](design-system.md) | "Mission Control" visual identity (PRD-004): color palette, typography, spacing, motion, component patterns. **Read before styling anything** |
| [UI Development Guide](guides/ui-development.md) | How to build new UI with the design system: CSS Modules + tokens, the global-class gotcha, accessibility requirements |

## Feature Guides

| Doc | Description |
| --- | --- |
| [Edit Connection Feature](guides/edit-connection-feature.md) | How to edit connections via kebab menu — user guide, developer reference, code patterns |
| [Testing: Edit Connection](guides/testing-edit-connection.md) | Manual test cases for kebab menu and Edit Connection feature — 27 test cases covering functionality, accessibility, edge cases, and regressions |

## API Reference

| Doc | Description |
| --- | --- |
| [Connection Management API](api/connection-management.md) | Backend API for connection CRUD — `ListConnections`, `CreateConnection`, `UpdateConnection`, `DeleteConnection`, password preservation behavior |

## Planning & History

| Doc | Description |
| --- | --- |
| [Changelog](planning/changelog.md) | Complete project history — fixes, features, and changes (Keep a Changelog format) |
| [PRD-004: Futuristic UI Redesign](planning/prd-004-futuristic-ui-redesign.md) | The redesign spec — "Mission Control" design direction, palette, acceptance criteria (implemented, 2026-08-06) |
| [Implementation-001: Edit Connection Kebab Menu](planning/implementation-001-edit-connection-kebab-menu.md) | Implementation plan for kebab menu + edit connection feature (implemented, 2026-08-07) |
| [Fix-012 root-cause analysis](planning/fix-012-terminal-flicker-navigation-root-cause.md) | Root cause of terminal flicker/input failure and file manager navigation (current fix) |
| [Fix-011 interim fix](planning/fix-011-terminal-flicker-filemanager-navigation.md) | Interim fix that preceded Fix-012 |

## Developer Guides

| Doc | Description |
| --- | --- |
| [React Effect Stability Patterns](guides/react-effect-stability.md) | Effect-dependency patterns introduced by Fix-012: split effects, callback refs, `useCallback`, ref-based latest-value reads. **Read before modifying `Terminal.tsx` or `FileExplorer.tsx`** |
| [Known Issues & Technical Debt](guides/known-issues.md) | Open issues, including the High-priority unmount race in `Terminal.tsx`'s connection effect and the deferred status-bar `error` state (PRD-004) |

## Documentation Gaps

- The root `README.md` previously linked to `docs/USER-GUIDE.md`, `docs/DATABASE.md`, `docs/SECURITY.md`, and `docs/DEVELOPMENT.md`. These were deleted in the 2026-08-06 documentation cleanup and have not been recreated — the links have been updated to point at this index instead. Recreate those guides when the project reaches a stable v1.0.0.
