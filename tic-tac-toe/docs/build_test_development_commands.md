# Build, Test, and Development Commands

There is no build step or package manager in this repo.

- `bash tic_tac_toe.sh` runs the game locally.
- `chmod +x tic_tac_toe.sh && ./tic_tac_toe.sh` runs it as an executable.
- `bash -n tic_tac_toe.sh` performs a syntax check before committing.
- `shellcheck tic_tac_toe.sh` is the preferred lint pass if `shellcheck` is installed.

Use Bash when validating changes; the script relies on Bash arrays and `[[ ... ]]`.
