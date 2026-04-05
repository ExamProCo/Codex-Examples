# Testing Guidelines

Automated tests are not set up yet, so contributors should combine static checks with manual play-throughs.

- Run `bash -n tic_tac_toe.sh` on every change.
- Manually verify valid moves, rejected duplicate moves, win detection, draw detection, and replay prompts.
- If you add automated coverage, prefer `bats` and place files in `tests/` with names like `tic_tac_toe.bats`.
