#!/usr/bin/env bash

set -euo pipefail

STATE_DB="${CODEX_STATE_DB:-$HOME/.codex/state_5.sqlite}"
SESSION_INDEX="${CODEX_SESSION_INDEX:-$HOME/.codex/session_index.jsonl}"
MODE="cwd"
TARGET_CWD="$(pwd)"
LIMIT=10
OUTPUT_FORMAT="text"
FIELD_SEP=$'\x1f'

usage() {
  cat <<'EOF'
Usage:
  codex_thread_report.sh [options]

Options:
  --cwd PATH     Report threads for PATH. Default: current directory
  --latest       Report the most recently updated thread in the state DB
  --all          Report recent threads across all directories
  --limit N      Number of rows for --all. Default: 10
  --output MODE  Output format: text or json. Default: text
  --json         Shortcut for --output json
  --help         Show this help

Examples:
  ./codex_thread_report.sh
  ./codex_thread_report.sh --latest
  ./codex_thread_report.sh --all --limit 20
  ./codex_thread_report.sh --output json
  ./codex_thread_report.sh --cwd /mnt/c/Users/andre/Sites/Codex-Examples/tic-tac-toe
EOF
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

sql_escape() {
  printf "%s" "$1" | sed "s/'/''/g"
}

format_epoch() {
  local epoch="$1"
  if [[ -z "$epoch" ]]; then
    printf "n/a"
    return
  fi
  date -d "@$epoch" +"%Y-%m-%d %H:%M:%S %Z"
}

format_number() {
  local value="$1"
  if [[ ! "$value" =~ ^[0-9]+$ ]]; then
    printf "%s" "$value"
    return
  fi

  printf "%s" "$value" | rev | sed 's/.../&,/g; s/,$//' | rev
}

json_escape() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//$'\n'/\\n}"
  value="${value//$'\r'/\\r}"
  value="${value//$'\t'/\\t}"
  printf "%s" "$value"
}

json_string() {
  printf '"%s"' "$(json_escape "$1")"
}

thread_name_for_id() {
  local thread_id="$1"
  if [[ ! -f "$SESSION_INDEX" ]]; then
    printf ""
    return
  fi

  awk -v id="$thread_id" '
    index($0, "\"id\":\"" id "\"") {
      if (match($0, /"thread_name":"([^"]+)"/, m)) {
        print m[1]
        exit
      }
    }
  ' "$SESSION_INDEX"
}

context_window_for_rollout() {
  local rollout="$1"
  if [[ ! -f "$rollout" ]]; then
    printf "missing rollout"
    return
  fi

  local token_line used total
  token_line="$(rg '"type":"token_count"' "$rollout" | tail -n 1 || true)"
  if [[ -z "$token_line" ]]; then
    printf "not found"
    return
  fi

  used="$(printf "%s\n" "$token_line" | sed -nE 's/.*"total_token_usage":\{[^}]*"total_tokens":([0-9]+).*/\1/p')"
  total="$(printf "%s\n" "$token_line" | sed -nE 's/.*"model_context_window":([0-9]+).*/\1/p')"

  if [[ -n "$used" && -n "$total" ]]; then
    printf "%s/%s" "$(format_number "$used")" "$(format_number "$total")"
  elif [[ -n "$total" ]]; then
    printf "%s" "$(format_number "$total")"
  else
    printf "not found"
  fi
}

context_window_data_for_rollout() {
  local rollout="$1"
  if [[ ! -f "$rollout" ]]; then
    printf "missing rollout${FIELD_SEP}${FIELD_SEP}"
    return
  fi

  local token_line used total
  token_line="$(rg '"type":"token_count"' "$rollout" | tail -n 1 || true)"
  if [[ -z "$token_line" ]]; then
    printf "not found${FIELD_SEP}${FIELD_SEP}"
    return
  fi

  used="$(printf "%s\n" "$token_line" | sed -nE 's/.*"total_token_usage":\{[^}]*"total_tokens":([0-9]+).*/\1/p')"
  total="$(printf "%s\n" "$token_line" | sed -nE 's/.*"model_context_window":([0-9]+).*/\1/p')"

  printf "ok${FIELD_SEP}%s${FIELD_SEP}%s" "$used" "$total"
}

token_usage_for_rollout() {
  local rollout="$1"
  if [[ ! -f "$rollout" ]]; then
    printf "missing rollout"
    return
  fi

  local token_line raw_input cached_input output effective_input effective_total
  token_line="$(rg '"type":"token_count"' "$rollout" | tail -n 1 || true)"
  if [[ -z "$token_line" ]]; then
    printf "not found"
    return
  fi

  raw_input="$(printf "%s\n" "$token_line" | sed -nE 's/.*"total_token_usage":\{[^}]*"input_tokens":([0-9]+).*/\1/p')"
  cached_input="$(printf "%s\n" "$token_line" | sed -nE 's/.*"total_token_usage":\{[^}]*"cached_input_tokens":([0-9]+).*/\1/p')"
  output="$(printf "%s\n" "$token_line" | sed -nE 's/.*"total_token_usage":\{[^}]*"output_tokens":([0-9]+).*/\1/p')"

  if [[ -z "$raw_input" || -z "$output" ]]; then
    printf "not found"
    return
  fi

  cached_input="${cached_input:-0}"
  effective_input=$((raw_input - cached_input))
  effective_total=$((effective_input + output))

  printf "total=%s input=%s (+ %s cached) output=%s" \
    "$(format_number "$effective_total")" \
    "$(format_number "$effective_input")" \
    "$(format_number "$cached_input")" \
    "$(format_number "$output")"
}

token_usage_data_for_rollout() {
  local rollout="$1"
  if [[ ! -f "$rollout" ]]; then
    printf "missing rollout${FIELD_SEP}${FIELD_SEP}${FIELD_SEP}${FIELD_SEP}"
    return
  fi

  local token_line raw_input cached_input output effective_input effective_total
  token_line="$(rg '"type":"token_count"' "$rollout" | tail -n 1 || true)"
  if [[ -z "$token_line" ]]; then
    printf "not found${FIELD_SEP}${FIELD_SEP}${FIELD_SEP}${FIELD_SEP}"
    return
  fi

  raw_input="$(printf "%s\n" "$token_line" | sed -nE 's/.*"total_token_usage":\{[^}]*"input_tokens":([0-9]+).*/\1/p')"
  cached_input="$(printf "%s\n" "$token_line" | sed -nE 's/.*"total_token_usage":\{[^}]*"cached_input_tokens":([0-9]+).*/\1/p')"
  output="$(printf "%s\n" "$token_line" | sed -nE 's/.*"total_token_usage":\{[^}]*"output_tokens":([0-9]+).*/\1/p')"

  if [[ -z "$raw_input" || -z "$output" ]]; then
    printf "not found${FIELD_SEP}${FIELD_SEP}${FIELD_SEP}${FIELD_SEP}"
    return
  fi

  cached_input="${cached_input:-0}"
  effective_input=$((raw_input - cached_input))
  effective_total=$((effective_input + output))

  printf "ok${FIELD_SEP}%s${FIELD_SEP}%s${FIELD_SEP}%s${FIELD_SEP}%s" \
    "$effective_total" \
    "$effective_input" \
    "$cached_input" \
    "$output"
}

print_text_report() {
  local data="$1"

  if [[ -z "$data" ]]; then
    echo "No matching Codex threads found."
    return
  fi

  while IFS="$FIELD_SEP" read -r id updated_at cwd title model rollout_path; do
    [[ -z "$id" ]] && continue
    local thread_name context_window token_usage
    thread_name="$(thread_name_for_id "$id")"
    context_window="$(context_window_for_rollout "$rollout_path")"
    token_usage="$(token_usage_for_rollout "$rollout_path")"

    echo "thread_id: $id"
    echo "thread_name: ${thread_name:-n/a}"
    echo "title: $title"
    echo "model: ${model:-n/a}"
    echo "updated_at: $(format_epoch "$updated_at")"
    echo "cwd: $cwd"
    echo "rollout_path: $rollout_path"
    echo "token_usage: $token_usage"
    echo "model_context_window: $context_window"
    echo
  done <<< "$data"
}

print_json_report() {
  local data="$1"
  local first_thread=true

  printf '{'
  printf '"mode":%s,' "$(json_string "$MODE")"
  printf '"output":%s,' "$(json_string "json")"
  if [[ "$LIMIT" =~ ^[0-9]+$ ]]; then
    printf '"limit":%s,' "$LIMIT"
  else
    printf '"limit":%s,' "$(json_string "$LIMIT")"
  fi
  if [[ "$MODE" == "cwd" ]]; then
    printf '"target_cwd":%s,' "$(json_string "$TARGET_CWD")"
  fi
  printf '"threads":['

  while IFS="$FIELD_SEP" read -r id updated_at cwd title model rollout_path; do
    [[ -z "$id" ]] && continue

    local thread_name updated_at_text
    local context_status context_used context_total
    local token_status token_total token_input token_cached token_output
    local context_window_text token_usage_text

    thread_name="$(thread_name_for_id "$id")"
    updated_at_text="$(format_epoch "$updated_at")"
    IFS="$FIELD_SEP" read -r context_status context_used context_total <<< "$(context_window_data_for_rollout "$rollout_path")"
    IFS="$FIELD_SEP" read -r token_status token_total token_input token_cached token_output <<< "$(token_usage_data_for_rollout "$rollout_path")"
    context_window_text="$(context_window_for_rollout "$rollout_path")"
    token_usage_text="$(token_usage_for_rollout "$rollout_path")"

    if [[ "$first_thread" == true ]]; then
      first_thread=false
    else
      printf ','
    fi

    printf '{'
    printf '"thread_id":%s,' "$(json_string "$id")"
    if [[ -n "$thread_name" ]]; then
      printf '"thread_name":%s,' "$(json_string "$thread_name")"
    else
      printf '"thread_name":null,'
    fi
    printf '"title":%s,' "$(json_string "$title")"
    if [[ -n "$model" ]]; then
      printf '"model":%s,' "$(json_string "$model")"
    else
      printf '"model":null,'
    fi
    if [[ -n "$updated_at" ]]; then
      printf '"updated_at_epoch":%s,' "$updated_at"
    else
      printf '"updated_at_epoch":null,'
    fi
    printf '"updated_at":%s,' "$(json_string "$updated_at_text")"
    printf '"cwd":%s,' "$(json_string "$cwd")"
    printf '"rollout_path":%s,' "$(json_string "$rollout_path")"
    printf '"token_usage_text":%s,' "$(json_string "$token_usage_text")"
    printf '"model_context_window_text":%s,' "$(json_string "$context_window_text")"

    printf '"token_usage":'
    case "$token_status" in
      ok)
        printf '{'
        printf '"status":"ok",'
        printf '"total_tokens":%s,' "$token_total"
        printf '"input_tokens":%s,' "$token_input"
        printf '"cached_input_tokens":%s,' "$token_cached"
        printf '"output_tokens":%s' "$token_output"
        printf '}'
        ;;
      *)
        printf '{'
        printf '"status":%s' "$(json_string "$token_status")"
        printf '}'
        ;;
    esac
    printf ','

    printf '"model_context_window":'
    case "$context_status" in
      ok)
        printf '{'
        printf '"status":"ok",'
        if [[ -n "$context_used" ]]; then
          printf '"used_tokens":%s,' "$context_used"
        else
          printf '"used_tokens":null,'
        fi
        if [[ -n "$context_total" ]]; then
          printf '"total_tokens":%s' "$context_total"
        else
          printf '"total_tokens":null'
        fi
        printf '}'
        ;;
      *)
        printf '{'
        printf '"status":%s' "$(json_string "$context_status")"
        printf '}'
        ;;
    esac
    printf '}'
  done <<< "$data"

  printf '],'

  if [[ -z "$data" ]]; then
    printf '"count":0'
  else
    local count
    count="$(printf "%s\n" "$data" | awk 'NF { count++ } END { print count + 0 }')"
    printf '"count":%s' "$count"
  fi

  printf '}\n'
}

print_report() {
  local data="$1"
  case "$OUTPUT_FORMAT" in
    text)
      print_text_report "$data"
      ;;
    json)
      print_json_report "$data"
      ;;
  esac
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --cwd)
      MODE="cwd"
      TARGET_CWD="${2:?missing path for --cwd}"
      shift 2
      ;;
    --latest)
      MODE="latest"
      shift
      ;;
    --all)
      MODE="all"
      shift
      ;;
    --limit)
      LIMIT="${2:?missing value for --limit}"
      shift 2
      ;;
    --output)
      OUTPUT_FORMAT="${2:?missing value for --output}"
      shift 2
      ;;
    --json)
      OUTPUT_FORMAT="json"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

case "$OUTPUT_FORMAT" in
  text|json)
    ;;
  *)
    echo "Invalid output format: $OUTPUT_FORMAT" >&2
    usage >&2
    exit 1
    ;;
esac

require_cmd sqlite3
require_cmd rg
require_cmd awk
require_cmd sed
require_cmd date

if [[ ! -f "$STATE_DB" ]]; then
  echo "Codex state DB not found: $STATE_DB" >&2
  exit 1
fi

case "$MODE" in
  cwd)
    escaped_cwd="$(sql_escape "$TARGET_CWD")"
    QUERY="
      select
        replace(replace(coalesce(id, ''), char(10), ' '), char(13), ' '),
        updated_at,
        replace(replace(coalesce(cwd, ''), char(10), ' '), char(13), ' '),
        replace(replace(coalesce(title, ''), char(10), ' '), char(13), ' '),
        replace(replace(coalesce(model, ''), char(10), ' '), char(13), ' '),
        replace(replace(coalesce(rollout_path, ''), char(10), ' '), char(13), ' ')
      from threads
      where cwd = '$escaped_cwd'
      order by updated_at desc;
    "
    ;;
  latest)
    QUERY="
      select
        replace(replace(coalesce(id, ''), char(10), ' '), char(13), ' '),
        updated_at,
        replace(replace(coalesce(cwd, ''), char(10), ' '), char(13), ' '),
        replace(replace(coalesce(title, ''), char(10), ' '), char(13), ' '),
        replace(replace(coalesce(model, ''), char(10), ' '), char(13), ' '),
        replace(replace(coalesce(rollout_path, ''), char(10), ' '), char(13), ' ')
      from threads
      order by updated_at desc
      limit 1;
    "
    ;;
  all)
    QUERY="
      select
        replace(replace(coalesce(id, ''), char(10), ' '), char(13), ' '),
        updated_at,
        replace(replace(coalesce(cwd, ''), char(10), ' '), char(13), ' '),
        replace(replace(coalesce(title, ''), char(10), ' '), char(13), ' '),
        replace(replace(coalesce(model, ''), char(10), ' '), char(13), ' '),
        replace(replace(coalesce(rollout_path, ''), char(10), ' '), char(13), ' ')
      from threads
      order by updated_at desc
      limit $LIMIT;
    "
    ;;
esac

RESULTS="$(sqlite3 -separator "$FIELD_SEP" "$STATE_DB" "$QUERY")"
print_report "$RESULTS"
