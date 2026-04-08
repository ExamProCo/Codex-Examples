#!/usr/bin/env python3
"""Manage task records in project-management-data.json."""

import argparse
import json
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
import sys


VALID_TASK_FIELDS = {
    "id",
    "projectId",
    "milestoneId",
    "title",
    "description",
    "status",
    "priority",
    "assigneeId",
    "reporterId",
    "createdAt",
    "dueDate",
    "estimateHours",
    "tags",
}

REQUIRED_ADD_FIELDS = {
    "projectId",
    "title",
    "description",
    "status",
    "priority",
    "assigneeId",
    "reporterId",
}

DONE_STATUSES = {"done"}


def parse_args():
    parser = argparse.ArgumentParser(
        description="Find, add, update, or delete tasks in project-management-data.json."
    )
    parser.add_argument(
        "--file",
        default=str(default_data_path()),
        help="Path to the JSON data file. Defaults to the repo-root project-management-data.json.",
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    find_parser = subparsers.add_parser("find", help="Find matching tasks.")
    find_parser.add_argument("--id")
    find_parser.add_argument("--project-id")
    find_parser.add_argument("--milestone-id")
    find_parser.add_argument("--assignee-id")
    find_parser.add_argument("--reporter-id")
    find_parser.add_argument("--status")
    find_parser.add_argument("--priority")
    find_parser.add_argument("--tag")
    find_parser.add_argument("--text")
    find_parser.add_argument("--limit", type=int)

    add_parser = subparsers.add_parser("add", help="Add a task.")
    add_parser.add_argument(
        "--set",
        action="append",
        default=[],
        metavar="FIELD=VALUE",
        help="Set a task field. Repeat as needed. Values may be JSON literals.",
    )

    update_parser = subparsers.add_parser("update", help="Update a task.")
    update_parser.add_argument("--id", required=True)
    update_parser.add_argument(
        "--set",
        action="append",
        default=[],
        metavar="FIELD=VALUE",
        help="Set a task field. Repeat as needed. Values may be JSON literals.",
    )

    delete_parser = subparsers.add_parser("delete", help="Delete a task by ID.")
    delete_parser.add_argument("--id", required=True)

    return parser.parse_args()


def default_data_path():
    return (Path(__file__).resolve().parents[4] / "project-management-data.json").resolve()


def load_data(path):
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def write_data(path, data):
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)
        handle.write("\n")


def parse_field_assignments(assignments):
    parsed = {}
    for item in assignments:
        if "=" not in item:
            raise SystemExit(f"Invalid --set value '{item}'. Use FIELD=VALUE.")
        key, raw_value = item.split("=", 1)
        if key not in VALID_TASK_FIELDS - {"id"}:
            raise SystemExit(f"Unsupported task field '{key}'.")
        parsed[key] = parse_value(raw_value)
    return parsed


def parse_value(raw_value):
    text = raw_value.strip()
    if text == "":
        return ""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return raw_value


def next_task_id(tasks):
    highest = 0
    for task in tasks:
        task_id = task.get("id", "")
        if task_id.startswith("tsk-"):
            suffix = task_id[4:]
            if suffix.isdigit():
                highest = max(highest, int(suffix))
    return f"tsk-{highest + 1:03d}"


def refresh_stats(data):
    tasks = data.get("tasks", [])
    stats = deepcopy(data.get("stats", {}))
    today = datetime.now(timezone.utc).date().isoformat()

    tasks_by_status = {}
    overdue = 0
    completed = 0

    for task in tasks:
        status = task.get("status")
        if status:
            tasks_by_status[status] = tasks_by_status.get(status, 0) + 1
        if status in DONE_STATUSES:
            completed += 1
        due_date = task.get("dueDate")
        if due_date and due_date < today and status not in DONE_STATUSES:
            overdue += 1

    stats["totalTasks"] = len(tasks)
    stats["tasksByStatus"] = dict(sorted(tasks_by_status.items()))
    stats["completedTasks"] = completed
    stats["overdueTasks"] = overdue
    data["stats"] = stats


def validate_task_references(task, data):
    project_ids = {item["id"] for item in data.get("projects", [])}
    milestone_ids = {item["id"] for item in data.get("milestones", [])}
    user_ids = {item["id"] for item in data.get("users", [])}

    project_id = task.get("projectId")
    if project_id and project_id not in project_ids:
        raise SystemExit(f"Unknown projectId '{project_id}'.")

    milestone_id = task.get("milestoneId")
    if milestone_id is not None and milestone_id not in milestone_ids:
        raise SystemExit(f"Unknown milestoneId '{milestone_id}'.")

    for field in ("assigneeId", "reporterId"):
        value = task.get(field)
        if value and value not in user_ids:
            raise SystemExit(f"Unknown {field} '{value}'.")


def normalize_task(task):
    if "tags" in task and task["tags"] is None:
        task["tags"] = []
    if "tags" in task and not isinstance(task["tags"], list):
        raise SystemExit("Field 'tags' must be an array.")
    if "estimateHours" in task and task["estimateHours"] is not None:
        if not isinstance(task["estimateHours"], (int, float)):
            raise SystemExit("Field 'estimateHours' must be numeric.")


def handle_find(args, data):
    tasks = data.get("tasks", [])
    text_query = args.text.lower() if args.text else None

    def matches(task):
        if args.id and task.get("id") != args.id:
            return False
        if args.project_id and task.get("projectId") != args.project_id:
            return False
        if args.milestone_id and task.get("milestoneId") != args.milestone_id:
            return False
        if args.assignee_id and task.get("assigneeId") != args.assignee_id:
            return False
        if args.reporter_id and task.get("reporterId") != args.reporter_id:
            return False
        if args.status and task.get("status") != args.status:
            return False
        if args.priority and task.get("priority") != args.priority:
            return False
        if args.tag and args.tag not in task.get("tags", []):
            return False
        if text_query:
            haystack = " ".join(
                str(task.get(field, "")) for field in ("id", "title", "description", "status", "priority")
            ).lower()
            if text_query not in haystack:
                return False
        return True

    matches_list = [task for task in tasks if matches(task)]
    if args.limit is not None:
        matches_list = matches_list[: args.limit]
    print(json.dumps(matches_list, indent=2))


def handle_add(args, data, path):
    updates = parse_field_assignments(args.set)
    missing = sorted(REQUIRED_ADD_FIELDS - updates.keys())
    if missing:
        raise SystemExit(f"Missing required fields for add: {', '.join(missing)}.")

    task = {
        "id": next_task_id(data.get("tasks", [])),
        "createdAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        **updates,
    }
    if "tags" not in task:
        task["tags"] = []

    normalize_task(task)
    validate_task_references(task, data)

    data.setdefault("tasks", []).append(task)
    refresh_stats(data)
    write_data(path, data)
    print(json.dumps(task, indent=2))


def find_task_index(tasks, task_id):
    for index, task in enumerate(tasks):
        if task.get("id") == task_id:
            return index
    raise SystemExit(f"Task '{task_id}' not found.")


def handle_update(args, data, path):
    updates = parse_field_assignments(args.set)
    if not updates:
        raise SystemExit("Provide at least one --set field=value pair.")

    tasks = data.get("tasks", [])
    index = find_task_index(tasks, args.id)
    task = deepcopy(tasks[index])
    task.update(updates)
    task["id"] = args.id

    normalize_task(task)
    validate_task_references(task, data)

    tasks[index] = task
    refresh_stats(data)
    write_data(path, data)
    print(json.dumps(task, indent=2))


def handle_delete(args, data, path):
    tasks = data.get("tasks", [])
    index = find_task_index(tasks, args.id)
    removed = tasks.pop(index)
    refresh_stats(data)
    write_data(path, data)
    print(json.dumps(removed, indent=2))


def main():
    args = parse_args()
    path = Path(args.file).resolve()
    data = load_data(path)

    if args.command == "find":
        handle_find(args, data)
        return
    if args.command == "add":
        handle_add(args, data, path)
        return
    if args.command == "update":
        handle_update(args, data, path)
        return
    if args.command == "delete":
        handle_delete(args, data, path)
        return

    raise SystemExit(f"Unsupported command '{args.command}'.")


if __name__ == "__main__":
    try:
        main()
    except BrokenPipeError:
        sys.exit(1)
