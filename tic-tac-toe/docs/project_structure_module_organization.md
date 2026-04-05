# Project Structure & Module Organization

This repository is intentionally small. The main executable is [`tic_tac_toe.sh`](/mnt/c/Users/andre/Sites/Codex-Examples/tic-tac-toe/tic_tac_toe.sh), a self-contained Bash implementation of the game. Supporting reference material lives in [`CODEX_SQLITE_CHEATSHEET.md`](/mnt/c/Users/andre/Sites/Codex-Examples/tic-tac-toe/CODEX_SQLITE_CHEATSHEET.md) and is unrelated to game logic. There is currently no `src/`, `tests/`, or asset directory; if the project grows, keep gameplay code in focused shell functions and add tests under `tests/`.
