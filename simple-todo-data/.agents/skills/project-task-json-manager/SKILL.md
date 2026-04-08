---
name: project-task-json-manager
description: Manage task records inside `project-management-data.json`. Use when Codex needs to add a task, update a task, find tasks by filters or text, or delete a task from this project's mock project-management dataset. Trigger this skill for requests about task CRUD operations, task lookups, status changes, due-date edits, reassignment, or maintaining task-related stats in `project-management-data.json`.
---

# Project Task Json Manager

## Overview

Use this skill to make deterministic task changes in the local `project-management-data.json` file. Always use the bundled `scripts/manage_tasks.py` for all task reads and writes so task IDs, references, and `stats` stay consistent. Never edit `tasks[]` or task-related `stats` manually.

## Quick Start

Run the helper by resolving it from the skill directory:

```bash
python3 .agents/skills/project-task-json-manager/scripts/manage_tasks.py find --status todo
python3 .agents/skills/project-task-json-manager/scripts/manage_tasks.py add \
  --set projectId=prj-001 \
  --set title="Draft onboarding checklist" \
  --set description="Create a concise beta user onboarding checklist." \
  --set status=todo \
  --set priority=medium \
  --set assigneeId=usr-001 \
  --set reporterId=usr-001 \
  --set dueDate=2026-04-20 \
  --set estimateHours=3 \
  --set tags='["documentation","onboarding"]'
python3 .agents/skills/project-task-json-manager/scripts/manage_tasks.py update --id tsk-003 --set status=review
python3 .agents/skills/project-task-json-manager/scripts/manage_tasks.py delete --id tsk-018
```

## Workflow

1. Confirm the target file is the repo-root `project-management-data.json`, unless the user explicitly points elsewhere.
2. Resolve the helper path as `.agents/skills/project-task-json-manager/scripts/manage_tasks.py` relative to the repo root. If working from another directory, use the absolute path to the same script.
3. Use `find` first when the user refers to a task loosely by title, assignee, tag, or status.
4. Use `find`, `add`, `update`, and `delete` only through `manage_tasks.py`.
5. If the script is missing, fails unexpectedly, or cannot perform the requested task, stop and report the blocker. Do not fall back to manual JSON edits.
6. After any mutating operation, validate the file with `jq empty project-management-data.json`.
7. Summarize the specific task changes made, including task IDs.

## Commands

### Find tasks

Use `find` to inspect tasks without mutating the file.

```bash
python3 .agents/skills/project-task-json-manager/scripts/manage_tasks.py find --text billing
python3 .agents/skills/project-task-json-manager/scripts/manage_tasks.py find --project-id prj-001 --status in-progress
python3 .agents/skills/project-task-json-manager/scripts/manage_tasks.py find --assignee-id usr-002 --tag frontend
```

Supported filters:
- `--id`
- `--project-id`
- `--milestone-id`
- `--assignee-id`
- `--reporter-id`
- `--status`
- `--priority`
- `--tag`
- `--text`
- `--limit`

### Add tasks

Use `add` with repeated `--set field=value`. Do not create tasks by editing JSON directly.

Required fields:
- `projectId`
- `title`
- `description`
- `status`
- `priority`
- `assigneeId`
- `reporterId`

Behavior:
- Generate the next `tsk-###` ID automatically.
- Set `createdAt` automatically when not provided.
- Accept JSON literals for arrays and numbers, so `tags='["api","backend"]'` and `estimateHours=8` work.
- Validate cross-references to `projects`, `users`, and `milestones`.
- Recompute `stats.totalTasks`, `stats.tasksByStatus`, `stats.completedTasks`, and `stats.overdueTasks`.

### Update tasks

Use `update --id ... --set field=value` to change one task. Do not modify task objects directly in the JSON file.

```bash
python3 .agents/skills/project-task-json-manager/scripts/manage_tasks.py update \
  --id tsk-004 \
  --set status=done \
  --set dueDate=2026-04-09 \
  --set tags='["backend","api","billing"]'
```

Rules:
- Only update fields that belong to the task schema documented in `references/task-schema.md`.
- Use JSON literals for arrays, booleans, numbers, or `null`.
- Re-run `find --id ...` if you need to confirm the current shape before updating.

### Delete tasks

Use `delete --id ...` to remove one task by exact ID. Do not remove task entries manually from JSON.

```bash
python3 .agents/skills/project-task-json-manager/scripts/manage_tasks.py delete --id tsk-018
```

Behavior:
- Remove only the matching task.
- Recompute the task-related `stats` fields after deletion.
- Do not delete comments or activity automatically; handle those separately only if the user asks.

## Notes

- Read `references/task-schema.md` when you need the exact task fields or valid reference behavior.
- Keep the file path default unless the user requests a different JSON file.
- Treat direct JSON editing as a bug in skill execution, not an acceptable fallback.
- Do not change unrelated top-level sections unless task CRUD requires a `stats` refresh.
