# Esesha Documentation

**Last updated:** 2026-08-15

Index of all project documentation. Start here.

---

## Guides

| Guide | What it covers |
| ----- | -------------- |
| [PPK to PEM Converter](guides/ppk-converter.md) | Converting PuTTY `.ppk` keys to OpenSSH `.pem` via **Tools → PPK Formatter** — pure-Go, no PuTTY needed, cross-platform |
| [Secure Private Key Storage](features/secure-key-storage.md) | Fix-011 user guide — keys stored encrypted in the DB, `🔒` indicator, machine-bound limitation, backward compatibility |
| [File Manager & Upload Dialog](user-guide/file-manager.md) | Browsing remote files and using the batch Upload Dialog — multi-select, progress, speed, cancel, limitations, troubleshooting |
| [Terminal: Copy & Paste](user-guide/terminal.md) | Copy selected text, paste commands, right-click menu, keyboard shortcuts, and accessibility (PRD-016) |

## Build

| Document | What it covers |
| -------- | -------------- |
| _(none)_ | |

## Security

| Document | What it covers |
| -------- | -------------- |
| [PEM Encryption — Technical](technical/pem-encryption.md) | Fix-011 internals — DPAPI encryption, data model, priority/fallback, export/import, validation, testing |

## API

| Document | What it covers |
| -------- | -------------- |
| [Connection API](api/connection-api.md) | `SelectPrivateKeyFile`, `ConvertPPKToPEM`, `Create`/`Update`/`Import` connection, `ConnectSSH` — with Fix-011 encrypted-key params |

## Design

| Document | What it covers |
| -------- | -------------- |
| [Design System](DESIGN-SYSTEM.md) | "Mission Control" UI reference — palette, typography, spacing, motion, component patterns, contributor rules |
| [UploadDialog Component](components/upload-dialog.md) | PRD-012 reference — props, local state/refs, `sftp:progress` handling, integration, styling, accessibility |
| [FileExplorer Component](components/file-explorer.md) | PRD-014 reference — toolbar buttons, Add menu, Create Folder/File dialogs, validation, error handling |
| [Terminal Component](components/terminal.md) | PRD-016 reference — copy/paste handlers, Wails clipboard API, xterm.js selection, context menu, a11y |

## Planning

| Document | What it covers |
| -------- | -------------- |
| [Changelog](planning/changelog.md) | Complete project history — every feature, fix, and superseded decision |
| [PRD-007: Machine-Bound Keyless Encryption](planning/prd-007-machine-bound-keyless-encryption.md) | Storage key derived from machine GUID + exe path (no key file) |
| [PRD-008: PPK to PEM Converter](planning/prd-008-ppk-to-pem-converter.md) | Tools menu + PPK Formatter feature specification |
| [PRD-008 Checklist](planning/PRD-008-CHECKLIST.md) | Task-level implementation checklist |
| [PRD-008 Implementation Summary](planning/PRD-008-IMPLEMENTATION-SUMMARY.md) | Quick reference for the PPK converter build |
| [PRD-009 Implementation Complete](planning/PRD-009-IMPLEMENTATION-COMPLETE.md) | Pure-Go PPK parser — removed puttygen.exe dependency |

## Archived

| Document | What it covers |
| -------- | -------------- |
| [PRD-010: Embedded SSH Keys (Archived)](planning/archive/prd-010-embedded-ssh-keys.md) | Original PRD, implementation summary, orchestrator handoff, and checklist — **feature removed/rolled back 2026-08-14**, kept for historical reference only |

---

## Conventions

- All documentation lives under `docs/`. Nothing outside it.
- Guides go in `docs/guides/`, PRDs and the changelog in `docs/planning/`.
- Every document carries a **Last updated** date.
- Diagrams use Mermaid — no external images.
- New docs get linked from this index.

## Known documentation gaps

Earlier guides (binary storage encryption, security considerations, UI development, React effect patterns, known issues) and the API/database reference sections were removed in a cleanup and have not been recreated. The root [`README.md`](../README.md) previously linked to them. Recreate them here when the corresponding areas are next touched.
