#!/usr/bin/env bash

set -u

declare -a board

RED=$'\033[31m'
BLUE=$'\033[34m'
YELLOW=$'\033[33m'
GREEN=$'\033[32m'
CYAN=$'\033[36m'
BOLD=$'\033[1m'
RESET=$'\033[0m'

init_board() {
  board=("1" "2" "3" "4" "5" "6" "7" "8" "9")
}

color_cell() {
  local value="$1"

  case "$value" in
    X) printf '%s%s%s' "$RED" "$value" "$RESET" ;;
    O) printf '%s%s%s' "$BLUE" "$value" "$RESET" ;;
    *) printf '%s%s%s' "$YELLOW" "$value" "$RESET" ;;
  esac
}

print_board() {
  printf '\n'
  printf ' %b | %b | %b\n' "$(color_cell "${board[0]}")" "$(color_cell "${board[1]}")" "$(color_cell "${board[2]}")"
  printf '%b\n' "${CYAN}---+---+---${RESET}"
  printf ' %b | %b | %b\n' "$(color_cell "${board[3]}")" "$(color_cell "${board[4]}")" "$(color_cell "${board[5]}")"
  printf '%b\n' "${CYAN}---+---+---${RESET}"
  printf ' %b | %b | %b\n' "$(color_cell "${board[6]}")" "$(color_cell "${board[7]}")" "$(color_cell "${board[8]}")"
  printf '\n'
}

is_winner() {
  local symbol="$1"
  local lines=(
    "0 1 2"
    "3 4 5"
    "6 7 8"
    "0 3 6"
    "1 4 7"
    "2 5 8"
    "0 4 8"
    "2 4 6"
  )
  local line
  local a b c

  for line in "${lines[@]}"; do
    read -r a b c <<< "$line"
    if [[ "${board[a]}" == "$symbol" && "${board[b]}" == "$symbol" && "${board[c]}" == "$symbol" ]]; then
      return 0
    fi
  done

  return 1
}

is_draw() {
  local cell
  for cell in "${board[@]}"; do
    if [[ "$cell" != "X" && "$cell" != "O" ]]; then
      return 1
    fi
  done
  return 0
}

take_turn() {
  local player="$1"
  local move
  local index

  while true; do
    if [[ "$player" == "X" ]]; then
      read -r -p "$(printf '%b' "${BOLD}${RED}Player ${player}${RESET}, choose a position ${YELLOW}(1-9)${RESET}: ")" move
    else
      read -r -p "$(printf '%b' "${BOLD}${BLUE}Player ${player}${RESET}, choose a position ${YELLOW}(1-9)${RESET}: ")" move
    fi

    if [[ ! "$move" =~ ^[1-9]$ ]]; then
      printf '%b\n' "${YELLOW}Enter a number from 1 to 9.${RESET}"
      continue
    fi

    index=$((move - 1))
    if [[ "${board[index]}" == "X" || "${board[index]}" == "O" ]]; then
      printf '%b\n' "${YELLOW}That spot is already taken.${RESET}"
      continue
    fi

    board[index]="$player"
    return 0
  done
}

play_game() {
  local current_player="X"

  init_board

  while true; do
    print_board
    take_turn "$current_player"

    if is_winner "$current_player"; then
      print_board
      printf '%b\n' "${GREEN}${BOLD}Player ${current_player} wins!${RESET}"
      return 0
    fi

    if is_draw; then
      print_board
      printf '%b\n' "${GREEN}${BOLD}It's a draw!${RESET}"
      return 0
    fi

    if [[ "$current_player" == "X" ]]; then
      current_player="O"
    else
      current_player="X"
    fi
  done
}

main() {
  local again

  printf '%b\n' "${BOLD}${CYAN}Tic-Tac-Toe${RESET}"

  while true; do
    play_game
    read -r -p "$(printf '%b' "${CYAN}Play again?${RESET} ${YELLOW}(y/n)${RESET}: ")" again
    case "$again" in
      y|Y) ;;
      n|N)
        printf '%b\n' "${CYAN}Goodbye.${RESET}"
        exit 0
        ;;
      *)
        printf '%b\n' "${YELLOW}Invalid choice. Exiting.${RESET}"
        exit 1
        ;;
    esac
  done
}

main "$@"
