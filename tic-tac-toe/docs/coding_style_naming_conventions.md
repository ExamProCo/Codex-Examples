# Coding Style & Naming Conventions

Follow the style already used in `tic_tac_toe.sh`:

- Use 2-space indentation inside functions.
- Prefer lowercase `snake_case` for function and local variable names such as `print_board` and `current_player`.
- Keep functions small and single-purpose.
- Quote variable expansions unless unquoted use is required.
- Use `local` for function-scoped variables and `printf` instead of `echo` for formatted output.

Preserve the current ANSI color constant pattern (`RED`, `BLUE`, `RESET`) for terminal styling.
