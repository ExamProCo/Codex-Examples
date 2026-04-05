  ## Information

We can can determine token usage bassed on session rollout files

└ /home/andrew/.codex/sessions/2026/04/05/rollout-2026-04-05T13-27-01-019d5eaf-03b3-7ab3-ab27-8be11a0fc4ef.jsonl
/home/andrew/.codex/sessions/2026/04/05/rollout-2026-04-05T13-04-06-019d5e9a-08ef-77c0-babf-292a4307d71b.jsonl
/home/andrew/.codex/sessions/2026/04/05/rollout-2026-04-05T13-01-50-019d5e97-f718-7bb0-801c-342bab7d4729.jsonl

  ## Preq

```sh
sudo apt  install ripgrep
```

```sh
./codex_thread_report.sh
./codex_thread_report.sh --latest
./codex_thread_report.sh --json
./codex_thread_report.sh --output json
./codex_thread_report.sh --all --limit 20
./codex_thread_report.sh --cwd /mnt/c/Users/andre/Sites/Codex-Examples/tic-tac-toe
```


Token usage: total=2,991 input=2,985 (+ 9,728 cached) output=6
model_context_window: 12,719/258,400

## Output example

```sh
./codex_thread_report.sh --json --latest | jq .
{
  "mode": "latest",
  "output": "json",
  "limit": 10,
  "threads": [
    {
      "thread_id": "019d5eb6-e5f3-7332-9d4f-519a70754f26",
      "thread_name": null,
      "title": "Can you add a json output mode so we can get the report back as json the default model will be text which will print the current report format as is",
      "model": "gpt-5.4",
      "updated_at_epoch": 1775410700,
      "updated_at": "2026-04-05 13:38:20 EDT",
      "cwd": "/mnt/c/Users/andre/Sites/Codex-Examples/usage-script",
      "rollout_path": "/home/andrew/.codex/sessions/2026/04/05/rollout-2026-04-05T13-35-37-019d5eb6-e5f3-7332-9d4f-519a70754f26.jsonl",
      "token_usage_text": "total=14,179 input=8,505 (+ 175,104 cached) output=5,674",
      "model_context_window_text": "189,283/258,400",
      "token_usage": {
        "status": "ok",
        "total_tokens": 14179,
        "input_tokens": 8505,
        "cached_input_tokens": 175104,
        "output_tokens": 5674
      },
      "model_context_window": {
        "status": "ok",
        "used_tokens": 189283,
        "total_tokens": 258400
      }
    }
  ],
  "count": 1
}
```