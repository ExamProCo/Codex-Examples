import {
  FILTERS,
  addTodo,
  deleteTodo,
  filterTodos,
  formatTimestamp,
  getRemainingCount,
  loadTodos,
  toggleTodo,
  updateTodo,
} from "./state.js";

const COMPANY_NAME = "Northstar";
const m = globalThis.m;

function createStore() {
  return {
    draft: "",
    message: "",
    editingId: null,
    editingText: "",
    filter: FILTERS.all,
    todos: loadTodos(),
  };
}

function startEditing(store, todo) {
  store.editingId = todo.id;
  store.editingText = todo.text;
  store.message = "";
}

function stopEditing(store) {
  store.editingId = null;
  store.editingText = "";
  store.message = "";
}

function submitNewTodo(event, store) {
  event.preventDefault();

  if (!store.draft.trim()) {
    store.message = "Enter a task before adding it to the board.";
    return;
  }

  store.todos = addTodo(store.todos, store.draft);
  store.draft = "";
  store.message = "";
}

function submitEdit(store, todoId) {
  if (!store.editingText.trim()) {
    store.message = "Task text cannot be empty.";
    return;
  }

  store.todos = updateTodo(store.todos, todoId, store.editingText);
  stopEditing(store);
}

function renderTodo(store, todo) {
  const isEditing = store.editingId === todo.id;
  const timestamp = formatTimestamp(todo.updatedAt ?? todo.createdAt);

  return m(
    "article",
    { class: `todo${todo.completed ? " todo--done" : ""}` },
    [
      m("input.todo__toggle", {
        type: "checkbox",
        checked: todo.completed,
        "aria-label": `Mark ${todo.text} as ${todo.completed ? "active" : "complete"}`,
        onchange: () => {
          store.todos = toggleTodo(store.todos, todo.id);
        },
      }),
      m("div.todo__body", [
        isEditing
          ? m("form", {
              class: "todo__edit-form",
              onsubmit: (event) => {
                event.preventDefault();
                submitEdit(store, todo.id);
              },
            }, [
              m("input.todo__edit-input", {
                value: store.editingText,
                oninput: (event) => {
                  store.editingText = event.target.value;
                  store.message = "";
                },
                onkeydown: (event) => {
                  if (event.key === "Escape") {
                    stopEditing(store);
                  }
                },
                maxlength: 240,
                "aria-label": `Edit task ${todo.text}`,
              }),
            ])
          : m("p.todo__text", todo.text),
        m(
          "p.todo__meta",
          todo.updatedAt ? `Updated ${timestamp}` : `Created ${timestamp}`
        ),
      ]),
      m("div.todo__actions", [
        isEditing
          ? [
              m("button.button.button--primary", {
                type: "button",
                onclick: () => submitEdit(store, todo.id),
              }, "Save"),
              m("button.button.button--ghost", {
                type: "button",
                onclick: () => stopEditing(store),
              }, "Cancel"),
            ]
          : m("button.button.button--ghost", {
              type: "button",
              onclick: () => startEditing(store, todo),
            }, "Edit"),
        m("button.button.button--ghost.button--danger", {
          type: "button",
          onclick: () => {
            if (isEditing) {
              stopEditing(store);
            }

            store.todos = deleteTodo(store.todos, todo.id);
          },
        }, "Delete"),
      ]),
    ]
  );
}

const TodoApp = {
  oninit(vnode) {
    vnode.state.store = createStore();
  },
  view(vnode) {
    const store = vnode.state.store;
    const visibleTodos = filterTodos(store.todos, store.filter);
    const remainingCount = getRemainingCount(store.todos);

    return m("main.shell", [
      m("header.shell__header", [
        m("div", [
          m("p.eyebrow", `${COMPANY_NAME} internal tool`),
          m("h1", "Company Tasks"),
          m(
            "p.shell__subtext",
            "A lightweight shared board for the team's day-to-day work. Keep tasks clear, current, and easy to close."
          ),
        ]),
        m("aside.summary", [
          m("p.summary__label", "Open items"),
          m("p.summary__value", remainingCount),
        ]),
      ]),
      m("p.shell__status", { role: "status", "aria-live": "polite" }, store.message),
      m("form.composer", { onsubmit: (event) => submitNewTodo(event, store) }, [
        m("label.visually-hidden", { for: "new-task-input" }, "Add a team task"),
        m("input", {
          id: "new-task-input",
          placeholder: "Add a task for the team",
          value: store.draft,
          oninput: (event) => {
            store.draft = event.target.value;
            store.message = "";
          },
          maxlength: 240,
          autocomplete: "off",
        }),
        m("button.button.button--primary", { type: "submit" }, "Add task"),
      ]),
      m("section.toolbar", { "aria-label": "Task filters and summary" }, [
        m("div.filters", Object.values(FILTERS).map((filter) =>
          m("button", {
            type: "button",
            class: store.filter === filter ? "is-active" : "",
            "aria-pressed": store.filter === filter ? "true" : "false",
            onclick: () => {
              store.filter = filter;
            },
          }, filter.charAt(0).toUpperCase() + filter.slice(1))
        )),
        m(
          "p.toolbar__count",
          `${remainingCount} ${remainingCount === 1 ? "task" : "tasks"} remaining`
        ),
      ]),
      visibleTodos.length
        ? m("section.todo-list", { "aria-label": "Company task list" }, visibleTodos.map((todo) => renderTodo(store, todo)))
        : m(
            "section.empty-state",
            store.filter === FILTERS.all
              ? "No tasks yet. Add the first task to start the board."
              : "No tasks match this filter right now."
          ),
    ]);
  },
};

export { TodoApp };
