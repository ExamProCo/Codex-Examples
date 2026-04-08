const STORAGE_KEY = "northstar-company-tasks";

const FILTERS = Object.freeze({
  all: "all",
  active: "active",
  completed: "completed",
});

const FILTER_VALUES = new Set(Object.values(FILTERS));

function hasStorage() {
  try {
    return typeof globalThis.localStorage?.getItem === "function";
  } catch {
    return false;
  }
}

function clearStoredTodos() {
  if (!hasStorage()) {
    return;
  }

  try {
    globalThis.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures and keep the app usable in memory.
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isValidFilter(filter) {
  return typeof filter === "string" && FILTER_VALUES.has(filter);
}

function normalizeFilter(filter) {
  return isValidFilter(filter) ? filter : FILTERS.all;
}

function isValidTodo(todo) {
  return (
    isPlainObject(todo) &&
    typeof todo.id === "string" &&
    isNonEmptyString(todo.text) &&
    typeof todo.completed === "boolean" &&
    typeof todo.createdAt === "number" &&
    Number.isFinite(todo.createdAt) &&
    (todo.updatedAt === undefined || (typeof todo.updatedAt === "number" && Number.isFinite(todo.updatedAt)))
  );
}

function normalizeTodos(todos) {
  if (!Array.isArray(todos)) {
    return [];
  }

  const normalized = [];
  const seenIds = new Set();

  for (const todo of todos) {
    if (!isValidTodo(todo) || seenIds.has(todo.id)) {
      continue;
    }

    seenIds.add(todo.id);
    normalized.push({
      id: todo.id,
      text: todo.text.trim(),
      completed: todo.completed,
      createdAt: todo.createdAt,
      updatedAt: todo.updatedAt,
    });
  }

  return normalized;
}

function createTodo(text) {
  if (!isNonEmptyString(text)) {
    throw new TypeError("Todo text must be a non-empty string.");
  }

  return {
    id: globalThis.crypto?.randomUUID?.() ?? `todo-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text: text.trim(),
    completed: false,
    createdAt: Date.now(),
  };
}

function saveTodos(todos) {
  const normalized = normalizeTodos(todos);

  if (hasStorage()) {
    try {
      globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // Ignore quota or storage write errors and keep the in-memory state usable.
    }
  }

  return normalized;
}

function loadTodos() {
  if (!hasStorage()) {
    return [];
  }

  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    return saveTodos(JSON.parse(raw));
  } catch {
    clearStoredTodos();
    return [];
  }
}

function addTodo(todos, text) {
  return saveTodos([...normalizeTodos(todos), createTodo(text)]);
}

function updateTodo(todos, id, nextText) {
  if (!isNonEmptyString(nextText)) {
    throw new TypeError("Updated todo text must be a non-empty string.");
  }

  return saveTodos(
    normalizeTodos(todos).map((todo) =>
      todo.id === id
        ? {
            ...todo,
            text: nextText.trim(),
            updatedAt: Date.now(),
          }
        : todo
    )
  );
}

function toggleTodo(todos, id) {
  return saveTodos(
    normalizeTodos(todos).map((todo) =>
      todo.id === id
        ? {
            ...todo,
            completed: !todo.completed,
            updatedAt: Date.now(),
          }
        : todo
    )
  );
}

function deleteTodo(todos, id) {
  return saveTodos(normalizeTodos(todos).filter((todo) => todo.id !== id));
}

function filterTodos(todos, filter) {
  const normalized = normalizeTodos(todos);
  const nextFilter = normalizeFilter(filter);

  if (nextFilter === FILTERS.active) {
    return normalized.filter((todo) => !todo.completed);
  }

  if (nextFilter === FILTERS.completed) {
    return normalized.filter((todo) => todo.completed);
  }

  return normalized;
}

function getRemainingCount(todos) {
  return normalizeTodos(todos).filter((todo) => !todo.completed).length;
}

function formatTimestamp(timestamp) {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
    return "";
  }

  return new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export {
  FILTERS,
  STORAGE_KEY,
  addTodo,
  deleteTodo,
  filterTodos,
  formatTimestamp,
  getRemainingCount,
  loadTodos,
  normalizeFilter,
  normalizeTodos,
  saveTodos,
  isValidTodo,
  toggleTodo,
  updateTodo,
};
