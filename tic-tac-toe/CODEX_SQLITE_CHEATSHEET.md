# Codex `.codex` SQLite Cheatsheet

This cheatsheet focuses on the local Codex data under `/home/andrew/.codex`.

## Databases

- State DB: `/home/andrew/.codex/state_5.sqlite`
- Logs DB: `/home/andrew/.codex/logs_1.sqlite`

## Open sqlite3

```bash
sqlite3 /home/andrew/.codex/state_5.sqlite
sqlite3 /home/andrew/.codex/logs_1.sqlite
```

Helpful interactive settings:

```sql
.headers on
.mode column
.timer on
```

Or run one-off queries directly:

```bash
sqlite3 -header -column /home/andrew/.codex/state_5.sqlite "SELECT * FROM threads LIMIT 5;"
```

## Inspect tables

List tables:

```bash
sqlite3 /home/andrew/.codex/state_5.sqlite '.tables'
sqlite3 /home/andrew/.codex/logs_1.sqlite '.tables'
```

Show schema for one table:

```bash
sqlite3 /home/andrew/.codex/state_5.sqlite '.schema threads'
sqlite3 /home/andrew/.codex/state_5.sqlite '.schema logs'
sqlite3 /home/andrew/.codex/logs_1.sqlite '.schema logs'
```

Show the full schema:

```bash
sqlite3 /home/andrew/.codex/state_5.sqlite '.schema'
```

## Useful thread queries

List recent threads:

```bash
sqlite3 -header -column /home/andrew/.codex/state_5.sqlite \
  "SELECT id, model, cwd, updated_at, tokens_used FROM threads ORDER BY updated_at DESC LIMIT 20;"
```

Look up the current thread from `$CODEX_THREAD_ID`:

```bash
sqlite3 -header -column /home/andrew/.codex/state_5.sqlite \
  "SELECT id, model, reasoning_effort, cwd, tokens_used, updated_at FROM threads WHERE id = '$CODEX_THREAD_ID';"
```

Find the most expensive threads by cumulative token usage:

```bash
sqlite3 -header -column /home/andrew/.codex/state_5.sqlite \
  "SELECT id, model, tokens_used, updated_at FROM threads ORDER BY tokens_used DESC LIMIT 20;"
```

Count archived vs active threads:

```bash
sqlite3 -header -column /home/andrew/.codex/state_5.sqlite \
  "SELECT archived, COUNT(*) AS count FROM threads GROUP BY archived;"
```

## Explore logs

Recent logs from the state DB:

```bash
sqlite3 -header -column /home/andrew/.codex/state_5.sqlite \
  "SELECT ts, level, target, thread_id, substr(message, 1, 120) AS message FROM logs ORDER BY ts DESC LIMIT 30;"
```

Recent logs from the logs DB:

```bash
sqlite3 -header -column /home/andrew/.codex/logs_1.sqlite \
  "SELECT ts, level, target, thread_id, estimated_bytes FROM logs ORDER BY ts DESC LIMIT 30;"
```

Filter logs for one thread:

```bash
sqlite3 -header -column /home/andrew/.codex/state_5.sqlite \
  "SELECT ts, level, target, substr(message, 1, 160) AS message FROM logs WHERE thread_id = '$CODEX_THREAD_ID' ORDER BY ts DESC LIMIT 50;"
```

Search logs for token-related text:

```bash
sqlite3 -header -column /home/andrew/.codex/state_5.sqlite \
  "SELECT ts, level, target, substr(message, 1, 160) AS message FROM logs WHERE message LIKE '%token%' ORDER BY ts DESC LIMIT 50;"
```

## Quick statusline-friendly lookups

Current thread token usage:

```bash
sqlite3 /home/andrew/.codex/state_5.sqlite \
  "SELECT tokens_used FROM threads WHERE id = '$CODEX_THREAD_ID';"
```

Current thread model:

```bash
sqlite3 /home/andrew/.codex/state_5.sqlite \
  "SELECT model FROM threads WHERE id = '$CODEX_THREAD_ID';"
```

Compact single-line status output:

```bash
sqlite3 -noheader /home/andrew/.codex/state_5.sqlite \
  "SELECT 'thread=' || id || ' model=' || ifnull(model, '') || ' tokens=' || tokens_used FROM threads WHERE id = '$CODEX_THREAD_ID';"
```

## Data discovery tips

Count rows in each major table:

```bash
sqlite3 -header -column /home/andrew/.codex/state_5.sqlite \
  "SELECT 'threads' AS table_name, COUNT(*) AS rows FROM threads
   UNION ALL
   SELECT 'logs', COUNT(*) FROM logs
   UNION ALL
   SELECT 'jobs', COUNT(*) FROM jobs;"
```

Peek at table contents safely:

```bash
sqlite3 -header -column /home/andrew/.codex/state_5.sqlite "SELECT * FROM threads LIMIT 3;"
sqlite3 -header -column /home/andrew/.codex/state_5.sqlite "SELECT * FROM jobs LIMIT 3;"
```

## Notes

- `tokens_used` appears to be cumulative per thread, not a guaranteed live "remaining context" meter.
- The model context window is not stored in SQLite. In this environment it appears in `/home/andrew/.codex/models_cache.json`.
- Use `-header -column` for human-readable output and `-noheader` for shell/statusline usage.
