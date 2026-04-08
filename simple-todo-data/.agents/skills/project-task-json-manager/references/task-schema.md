# Task Schema

Use this reference when adding or updating entries in `project-management-data.json`.

## Task object

Each task in `tasks[]` uses these fields:

- `id`: string, generated as `tsk-###`
- `projectId`: string, must match an existing `projects[].id`
- `milestoneId`: string or omitted, if present must match an existing `milestones[].id`
- `title`: string
- `description`: string
- `status`: string
- `priority`: string
- `assigneeId`: string, must match an existing `users[].id`
- `reporterId`: string, must match an existing `users[].id`
- `createdAt`: ISO 8601 datetime string
- `dueDate`: `YYYY-MM-DD` string or omitted
- `estimateHours`: number or omitted
- `tags`: array of strings, usually present even if empty

## Current status values

Observed in the current dataset:

- `todo`
- `in-progress`
- `review`
- `done`
- `blocked`

## Current priority values

Observed in the current dataset:

- `low`
- `medium`
- `high`

## Stats maintained by the script

The helper script refreshes these fields under `stats` after add, update, or delete:

- `totalTasks`
- `tasksByStatus`
- `completedTasks`
- `overdueTasks`

Other summary values stay unchanged.
