#!/usr/bin/env bash

set -euo pipefail

LIMIT_BYTES=$((23 * 1024))

json_escape() {
  local value=${1:-}
  value=${value//\\/\\\\}
  value=${value//\"/\\\"}
  value=${value//$'\n'/\\n}
  value=${value//$'\r'/\\r}
  value=${value//$'\t'/\\t}
  printf '%s' "$value"
}

usage() {
  cat <<'EOF'
Usage: ./check-agents-size.sh /path/to/folder

Scans:
  - AGENTS.md
  - docs/**/*.md

Outputs a JSON object with file sizes, total size, and whether the total is within 23 KB.
EOF
}

if [[ ${1:-} == "-h" || ${1:-} == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -ne 1 ]]; then
  printf '{"ok":false,"error":"expected exactly one directory argument"}\n'
  exit 1
fi

target_dir=$1

if [[ ! -d "$target_dir" ]]; then
  printf '{"ok":false,"error":"directory not found","target":"%s"}\n' "$(json_escape "$target_dir")"
  exit 1
fi

target_dir=$(cd "$target_dir" && pwd)
agents_file="$target_dir/AGENTS.md"
docs_dir="$target_dir/docs"

declare -a files=()

if [[ -f "$agents_file" ]]; then
  files+=("$agents_file")
fi

if [[ -d "$docs_dir" ]]; then
  while IFS= read -r file; do
    files+=("$file")
  done < <(find "$docs_dir" -type f -name '*.md' | sort)
fi

total_bytes=0

printf '{'
printf '"ok":true,'
printf '"target":"%s",' "$(json_escape "$target_dir")"
printf '"limit_bytes":%d,' "$LIMIT_BYTES"
printf '"limit_kb":%.2f,' "$(awk "BEGIN { printf \"%.2f\", $LIMIT_BYTES / 1024 }")"
printf '"file_count":%d,' "${#files[@]}"
printf '"files":['

for i in "${!files[@]}"; do
  file=${files[$i]}
  size=$(wc -c < "$file")
  total_bytes=$((total_bytes + size))
  relative_path=${file#"$target_dir"/}

  if [[ $i -gt 0 ]]; then
    printf ','
  fi

  printf '{"path":"%s","bytes":%d,"kb":%.2f}' \
    "$(json_escape "$relative_path")" \
    "$size" \
    "$(awk "BEGIN { printf \"%.2f\", $size / 1024 }")"
done

printf '],'
printf '"total_bytes":%d,' "$total_bytes"
printf '"total_kb":%.2f,' "$(awk "BEGIN { printf \"%.2f\", $total_bytes / 1024 }")"

if (( total_bytes <= LIMIT_BYTES )); then
  printf '"within_limit":true,'
else
  printf '"within_limit":false,'
fi

printf '"status":"%s"' "$([[ $total_bytes -le $LIMIT_BYTES ]] && printf 'in_bounds' || printf 'out_of_bounds')"
printf '}\n'
