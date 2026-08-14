# Esesha Documentation

**Last updated:** 2026-08-14

Index of all project documentation. Start here.

---

## Guides

| Guide | What it covers |
| ----- | -------------- |
| [PPK to PEM Converter](guides/ppk-converter.md) | Converting PuTTY `.ppk` keys to OpenSSH `.pem` via **Tools → PPK Formatter** — pure-Go, no PuTTY needed, cross-platform |

## Design

| Document | What it covers |
| -------- | -------------- |
| [Design System](DESIGN-SYSTEM.md) | "Mission Control" UI reference — palette, typography, spacing, motion, component patterns, contributor rules |

## Planning

| Document | What it covers |
| -------- | -------------- |
| [Changelog](planning/changelog.md) | Complete project history — every feature, fix, and superseded decision |
| [PRD-007: Machine-Bound Keyless Encryption](planning/prd-007-machine-bound-keyless-encryption.md) | Storage key derived from machine GUID + exe path (no key file) |
| [PRD-008: PPK to PEM Converter](planning/prd-008-ppk-to-pem-converter.md) | Tools menu + PPK Formatter feature specification |
| [PRD-008 Checklist](planning/PRD-008-CHECKLIST.md) | Task-level implementation checklist |
| [PRD-008 Implementation Summary](planning/PRD-008-IMPLEMENTATION-SUMMARY.md) | Quick reference for the PPK converter build |
| [PRD-009 Implementation Complete](planning/PRD-009-IMPLEMENTATION-COMPLETE.md) | Pure-Go PPK parser — removed puttygen.exe dependency |

---

## Conventions

- All documentation lives under `docs/`. Nothing outside it.
- Guides go in `docs/guides/`, PRDs and the changelog in `docs/planning/`.
- Every document carries a **Last updated** date.
- Diagrams use Mermaid — no external images.
- New docs get linked from this index.

## Known documentation gaps

Earlier guides (binary storage encryption, security considerations, UI development, React effect patterns, known issues) and the API/database reference sections were removed in a cleanup and have not been recreated. The root [`README.md`](../README.md) previously linked to them. Recreate them here when the corresponding areas are next touched.
