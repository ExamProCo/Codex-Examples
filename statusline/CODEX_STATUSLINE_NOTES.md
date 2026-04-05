# Codex Status Line Probe

Date probed: 2026-04-05

## Short answer

For Codex CLI/TUI `0.118.0`, I did **not** find evidence of a documented custom `statusline` script hook that receives a JSON payload over `stdin`.

What the official docs do document is:

- `tui.status_line` is `array<string> | null`
- It is an ordered list of TUI footer status-line item identifiers
- `null` disables the status line

Source:

- OpenAI Codex config reference: https://developers.openai.com/codex/config-reference

Relevant doc text:

```text
tui.status_line = array<string> | null
Ordered list of TUI footer status-line item identifiers. null disables the status line.
```

## What this means

The Codex status line appears to be an **internal renderer of named built-in items**, not a documented "run my script and feed it session JSON" feature.

So the useful question is not "what stdin JSON schema does my statusline script get?", but:

1. What item identifiers are accepted by `tui.status_line`?
2. What internal data sources feed those items?

## Built-in status-line item identifiers I probed

From the installed Codex `0.118.0` binary, these identifiers appear together in the TUI status-line code path:

```text
project
spinner
status
thread
git-branch
task-progress
model-name
model-with-reasoning
current-dir
project-root
context-remaining
context-used
five-hour-limit
weekly-limit
codex-version
context-window-size
used-tokens
total-input-tokens
total-output-tokens
session-id
fast-mode
```

I also found these related strings in the same binary:

```text
Failed to save status line items:
Ignored invalid status line
```

That strongly suggests:

- Codex validates status-line item identifiers
- invalid item names are ignored
- the chosen items are persisted in local config/state

## Local evidence for where the data comes from

The status line appears to be assembled from multiple internal sources, not one single session JSON blob.

### 1. Session metadata and turn context

The rollout JSONL contains structured metadata like:

- `session_meta.payload.id`
- `session_meta.payload.cwd`
- `session_meta.payload.cli_version`
- `session_meta.payload.model_provider`
- `turn_context.payload.model`
- `turn_context.payload.approval_policy`
- `turn_context.payload.sandbox_policy`

Example from this machine:

```json
{
  "type": "turn_context",
  "payload": {
    "turn_id": "019d5ec6-3adb-7ef3-9b29-7d26e44ff80b",
    "cwd": "/mnt/c/Users/andre/Sites/Codex-Examples/statusline",
    "approval_policy": "on-request",
    "sandbox_policy": {
      "type": "workspace-write",
      "writable_roots": ["/home/andrew/.codex/memories"],
      "network_access": false,
      "exclude_tmpdir_env_var": false,
      "exclude_slash_tmp": false
    },
    "model": "gpt-5.4"
  }
}
```

Likely mappings:

- `session-id` -> session/thread id
- `current-dir` -> current `cwd`
- `model-name` -> active model
- `model-with-reasoning` -> active model plus reasoning mode when applicable
- `fast-mode` -> active collaboration/runtime mode

### 2. Persistent thread state from SQLite

Codex also stores thread-level state in `~/.codex/state_5.sqlite`, especially the `threads` table.

Columns relevant to status-line style info:

```json
[
  {"name":"id","type":"TEXT"},
  {"name":"cwd","type":"TEXT"},
  {"name":"sandbox_policy","type":"TEXT"},
  {"name":"approval_mode","type":"TEXT"},
  {"name":"tokens_used","type":"INTEGER"},
  {"name":"git_branch","type":"TEXT"},
  {"name":"cli_version","type":"TEXT"},
  {"name":"model_provider","type":"TEXT"},
  {"name":"model","type":"TEXT"},
  {"name":"reasoning_effort","type":"TEXT"}
]
```

Example current thread row:

```json
[
  {
    "id": "019d5ec5-b22f-7df0-9e04-904b96d6b577",
    "model": "gpt-5.4",
    "model_provider": "openai",
    "cwd": "/mnt/c/Users/andre/Sites/Codex-Examples/statusline",
    "sandbox_policy": "{\"type\":\"workspace-write\",\"writable_roots\":[\"/home/andrew/.codex/memories\"],\"network_access\":false,\"exclude_tmpdir_env_var\":false,\"exclude_slash_tmp\":false}",
    "approval_mode": "on-request",
    "git_branch": "main",
    "cli_version": "0.118.0",
    "tokens_used": 888539
  }
]
```

Likely mappings:

- `git-branch` -> `threads.git_branch`
- `used-tokens` -> `threads.tokens_used`
- `codex-version` -> `threads.cli_version` or runtime version

Important caveat:

- `tokens_used` is cumulative thread usage
- it is **not** necessarily the same thing as the live context window currently in use

### 3. Live token/rate-limit events from the rollout JSONL

The rollout JSONL also contains live `token_count` events.

Example from this machine:

```json
{
  "type": "token_count",
  "info": {
    "total_token_usage": {
      "input_tokens": 1054087,
      "cached_input_tokens": 912768,
      "output_tokens": 7464,
      "reasoning_output_tokens": 2018,
      "total_tokens": 1061551
    },
    "last_token_usage": {
      "input_tokens": 86775,
      "cached_input_tokens": 85888,
      "output_tokens": 248,
      "reasoning_output_tokens": 0,
      "total_tokens": 87023
    },
    "model_context_window": 258400
  },
  "rate_limits": {
    "primary": {
      "used_percent": 18.0,
      "window_minutes": 300
    },
    "secondary": {
      "used_percent": 7.0,
      "window_minutes": 10080
    },
    "plan_type": "plus"
  }
}
```

Likely mappings:

- `context-window-size` -> `info.model_context_window`
- `total-input-tokens` -> `info.total_token_usage.input_tokens`
- `total-output-tokens` -> `info.total_token_usage.output_tokens`
- `five-hour-limit` -> `rate_limits.primary.used_percent`
- `weekly-limit` -> `rate_limits.secondary.used_percent`
- `context-used` / `context-remaining` -> inferred from live token counters plus `model_context_window`

## Best current model of how Codex collects status-line data

Based on the docs, local SQLite state, rollout JSONL, and installed binary strings:

1. `tui.status_line` stores a list of built-in item IDs.
2. Codex validates those IDs internally.
3. At render time, Codex pulls values from:
   - current turn/session context
   - persistent thread metadata in `~/.codex/state_5.sqlite`
   - live token/rate-limit events emitted into the rollout stream
4. The TUI renders the footer directly.

I did **not** find evidence that Codex passes one consolidated status-line JSON document to a user command.

## Practical example

This is the shape the config appears to expect:

```toml
tui.status_line = [
  "model-name",
  "git-branch",
  "context-used",
  "context-window-size",
  "session-id"
]
```

If an identifier is invalid, Codex appears to ignore it.

## How to inspect this yourself

### Official docs

```bash
xdg-open https://developers.openai.com/codex/config-reference
```

### Inspect the current thread row

```bash
sqlite3 -header -json ~/.codex/state_5.sqlite \
  "SELECT id, model, model_provider, cwd, sandbox_policy, approval_mode, git_branch, cli_version, tokens_used
   FROM threads
   ORDER BY updated_at DESC
   LIMIT 1;"
```

### Inspect the current thread schema

```bash
sqlite3 -header -json ~/.codex/state_5.sqlite "PRAGMA table_info(threads);"
```

### Inspect the latest rollout JSONL for `turn_context` and `token_count`

```bash
sqlite3 -noheader ~/.codex/state_5.sqlite \
  "SELECT rollout_path FROM threads ORDER BY updated_at DESC LIMIT 1;"
```

Then:

```bash
sed -n '1,12p' /path/to/rollout.jsonl
tail -n 20 /path/to/rollout.jsonl
rg -n '"type":"(turn_context|token_count|session_meta)"' /path/to/rollout.jsonl
```

### Probe the installed binary for status-line item names

```bash
strings "$(readlink -f "$(which codex)" | sed 's#/bin/codex.js##')"/node_modules/@openai/codex-linux-x64/vendor/x86_64-unknown-linux-musl/codex/codex \
  | rg 'project|spinner|status|thread|git-branch|task-progress|model-name|model-with-reasoning|current-dir|project-root|context-remaining|context-used|five-hour-limit|weekly-limit|codex-version|context-window-size|used-tokens|total-input-tokens|total-output-tokens|session-id|fast-mode'
```

## Bottom line

As of Codex CLI `0.118.0`, the status line looks like a built-in TUI feature backed by internal session/thread/token state. It does **not** look like a documented external JSON-schema-driven hook.

If you want, the next useful step is to create a second Markdown file with a tested `tui.status_line` config matrix showing which of the identifiers above actually render on this machine.
