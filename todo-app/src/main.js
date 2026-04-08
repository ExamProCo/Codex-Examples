import { TodoApp } from "./todo-app.js";

const mountNode = document.getElementById("app");
const mithril = globalThis.m;

if (!mountNode) {
  throw new Error("Unable to find the #app mount node.");
}

if (!mithril) {
  throw new Error("Mithril failed to load.");
}

mithril.mount(mountNode, TodoApp);
