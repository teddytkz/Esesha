# Planning Archive

This directory contains superseded or rolled-back PRDs for historical reference.

## Purpose

Archived PRDs are moved here to:
1. Keep active `docs/planning/` directory focused on current/planned work
2. Preserve historical context for architectural decisions
3. Maintain traceability for rolled-back features
4. Document evolution of requirements over time

## Archive Criteria

A PRD is archived when:
- **Superseded** — A newer PRD replaces it with better approach (e.g., PRD-006 superseded by PRD-007)
- **Rolled back** — Feature was implemented then removed (e.g., PRD-010 embedded keys)
- **Obsolete** — Original requirement no longer relevant due to project evolution

## Current Archives

This archive contains completed PRDs and fixes that have been successfully implemented:

### PRD Archives
- **PRD-012**: Upload Dialog - Initial implementation
- **PRD-013**: Upload Dialog Drag & Drop - Enhanced upload functionality
- **PRD-014**: File Manager Toolbar Improvements - UI/UX enhancements
- **PRD-015**: Project Cleanup & Optimization - Codebase maintenance
- **PRD-016**: Terminal Copy/Paste - Terminal interaction improvements

### Fix Archives
- **FIX-001**: Documentation completion
- **FIX-002**: Critical bugs resolution
- **FIX-003**: Context menu positioning fixes
- **FIX-004**: Context menu edge refinement

All archived items have been fully implemented and tested.

## How to Reference Archived PRDs

When referencing archived PRDs in documentation:
- Link to archive location: `docs/planning/archive/prd-NNN-title.md`
- Explain why it was superseded/rolled back
- Point to replacement PRD if applicable

Example:
```markdown
<!-- Previous approach (PRD-006) used DPAPI key files -->
<!-- See: docs/planning/archive/prd-006-true-binary-storage-encryption.md -->
<!-- Current approach (PRD-007) uses machine-bound keyless encryption -->
```

## Archive Structure

```
archive/
├── README.md (this file)
├── PRD Archives
│   ├── prd-012-upload-dialog.md
│   ├── prd-012-implementation-summary.md
│   ├── prd-013-upload-dialog-drag-drop.md
│   ├── prd-013-implementation-summary.md
│   ├── prd-014-file-manager-toolbar-improvements.md
│   ├── prd-014-implementation-summary.md
│   ├── prd-015-index.md
│   ├── prd-015-checklist.md
│   ├── prd-015-orchestrator-guide.md
│   ├── prd-015-planning-complete.md
│   ├── prd-015-project-cleanup-optimization.md
│   ├── prd-015-implementation-summary.md
│   ├── prd-016-terminal-copy-paste.md
│   └── prd-016-implementation-summary.md
└── Fix Archives
    ├── fix-001-prd-015-documentation-completion.md
    ├── fix-001-implementation-summary.md
    ├── fix-002-prd-016-critical-bugs.md
    ├── fix-002-implementation-summary.md
    ├── fix-003-context-menu-positioning.md
    ├── fix-003-planning-complete.md
    ├── fix-003-implementation-summary.md
    ├── fix-004-context-menu-edge-refinement.md
    ├── fix-004-orchestrator-handoff.md
    ├── fix-004-planning-complete.md
    └── fix-004-implementation-summary.md
```

---

**Note:** Implementation summaries and rollback docs are kept with their parent PRDs in the archive for complete context.

**Created:** 2026-08-15 as part of PRD-015 (Project Cleanup and Optimization)
