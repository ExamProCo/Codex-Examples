 # Retarget the Agent Team to Build a Minimal Mithril Company Todo App

  ## Summary

  Build a small internal todo app for a single company using plain JavaScript, Mithril, and browser
  localStorage, with no build step. Before app work starts, retarget the existing Codex subagents away from
  React/Vite so they all optimize for the same stack, architecture, and product scope.

  The app should be a single shared-company task board in UI and terminology, but v1 persistence remains
  browser-local. That means the product language should read like an internal company tool while the
  implementation stays intentionally minimal and static.

  ## Key Changes

  - Update the existing subagent TOML files so they explicitly target:
      - Mithril with plain HTML + ES modules
      - a minimal internal company todo board
      - localStorage persistence
      - a static frontend-first implementation without a backend
  - Keep the same 4-agent team, but sharpen ownership:
      - product_planner: define minimal internal-tool behavior and acceptance criteria
      - logic_data: own todo state, storage, filters, and company-board data contracts
      - frontend_builder: own Mithril components, view wiring, and minimal styling
      - qa_reviewer: review correctness, UX edge cases, and storage behavior
  - Build the app as a static structure with a minimal file layout:
      - index.html bootstraps Mithril and mounts the app
      - one app entry module for mount/routing setup
      - one shared state/storage module for todos
      - one or two Mithril view modules for the app shell and todo list UI
      - one stylesheet for a restrained internal-tool look
  - Product behavior for v1:
      - create a todo
      - edit todo text
      - mark complete / active
      - delete a todo
      - filter by all / active / completed
      - show remaining item count
      - persist automatically to localStorage
  - Keep the data model minimal:
      - id
      - text
      - completed
      - createdAt
      - optional updatedAt only if it is actually used
  - Keep the UX company-oriented but small:
      - company-branded title/header
      - one shared list terminology such as “Team Tasks” or “Company Tasks”
      - no auth, no roles, no assignments, no due dates, no backend sync

  ## Public Interfaces / Types

  - Subagent interface changes:
      - rewrite existing agent instructions so they reference Mithril and static ES-module architecture
        instead of React/Vite
      - remove references to src/todos.js as an existing source of truth, since that file is not present
  - App module contract:
      - expose pure todo-state helpers from the shared logic module so Mithril views stay thin
      - keep localStorage access behind small load/save helpers rather than inline in components
  - Browser interface:
      - mount a single Mithril application into one root node in index.html
      - no external API surface and no server contract in v1

  ## Test Plan

  - Static structure checks:
      - app loads directly in the browser without bundling
      - Mithril mounts successfully from the ES-module entrypoint
  - Core behavior checks:
      - add, edit, complete, uncomplete, delete
      - filter transitions among all / active / completed
      - remaining count updates correctly
  - Persistence checks:
  - UX checks:
      - blank todo submission is rejected
      - updated TOML instructions no longer mention React/Vite
      - each agent’s ownership matches the Mithril app workflow and avoids overlap

  ## Assumptions

  - “Single company” means one internal task board experience, not multi-tenant support.
  - v1 does not need true multi-user sharing; localStorage is accepted despite being browser-local.
  - Minimal means no backend, no build tooling, no authentication, and no advanced task features unless
    explicitly added later.
  - Mithril may be loaded in the simplest viable way for a static app, as long as the project remains plain
    JavaScript with ES modules.