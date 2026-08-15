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

**Note:** PRD-002, PRD-006, and PRD-010 were **removed** in an earlier cleanup (not moved to this archive) — they were superseded by later PRDs or rolled back completely. Historical references to these PRDs may exist in commit history. The files listed below under "Archive Structure" no longer exist on disk for the same reason.

Currently this archive is empty. Future superseded or rolled-back PRDs will be moved here.

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
└── README.md (this file)
```

> The PRD-002, PRD-006, and PRD-010 files previously listed here were removed in an earlier cleanup and are not present on disk. This directory currently holds only this index.

---

**Note:** Implementation summaries and rollback docs are kept with their parent PRDs in the archive for complete context.

**Created:** 2026-08-15 as part of PRD-015 (Project Cleanup and Optimization)
