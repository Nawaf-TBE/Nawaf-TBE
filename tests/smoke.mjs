import { fetchItems, addItem, toggleItem, removeItem } from "../app.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runDataTests() {
  const initial = await fetchItems();
  const initialLength = initial.length;

  // Ensure fetchItems returns clones (mutating response should not persist)
  const mutatedLabel = "mutated label";
  if (initial[0]) {
    initial[0].label = mutatedLabel;
  }
  const fresh = await fetchItems();
  if (fresh[0]) {
    assert(
      fresh[0].label !== mutatedLabel,
      "fetchItems should return cloned items"
    );
  }

  // Add flow
  const { item: addedItem, error: addError } = addItem("Smoke Test Task");
  assert(!addError, `addItem error: ${addError}`);
  const afterAdd = await fetchItems();
  assert(
    afterAdd.length === initialLength + 1,
    "addItem should increase list length"
  );

  // Toggle flow
  const { error: toggleError } = toggleItem(addedItem.id);
  assert(!toggleError, `toggleItem error: ${toggleError}`);
  const afterToggle = await fetchItems();
  const toggled = afterToggle.find((t) => t.id === addedItem.id);
  assert(toggled && toggled.completed, "toggleItem should flip completion");

  // Remove flow
  const { removed, error: removeError } = removeItem(addedItem.id);
  assert(removed && !removeError, `removeItem error: ${removeError || ""}`);
  const afterRemove = await fetchItems();
  assert(
    afterRemove.length === initialLength,
    "removeItem should restore list length"
  );
}

// Minimal DOM stubs for UI tests
class FakeEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.key = init.key;
    this.metaKey = !!init.metaKey;
    this.ctrlKey = !!init.ctrlKey;
    this.target = init.target || null;
    this.defaultPrevented = false;
    this._stop = false;
  }
  preventDefault() {
    this.defaultPrevented = true;
  }
  stopPropagation() {
    this._stop = true;
  }
}

class FakeEventTarget {
  constructor() {
    this.listeners = {};
  }
  addEventListener(type, handler) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(handler);
  }
  dispatchEvent(event) {
    const handlers = this.listeners[event.type] || [];
    handlers.forEach((h) => h(event));
  }
}

class FakeClassList {
  constructor(element) {
    this.element = element;
    this.classes = new Set();
  }
  add(cls) {
    this.classes.add(cls);
    this.element.className = Array.from(this.classes).join(" ");
  }
  remove(cls) {
    this.classes.delete(cls);
    this.element.className = Array.from(this.classes).join(" ");
  }
  contains(cls) {
    return this.classes.has(cls);
  }
}

class FakeElement extends FakeEventTarget {
  constructor(tagName) {
    super();
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentElement = null;
    this.dataset = {};
    this.className = "";
    this.classList = new FakeClassList(this);
    this.textContent = "";
    this.value = "";
    this.id = "";
    this.type = "";
    this.name = "";
    this.placeholder = "";
    this.required = false;
    this.autocomplete = "";
    this.attributes = {};
  }
  append(...nodes) {
    nodes.forEach((node) => this.appendChild(node));
  }
  appendChild(node) {
    if (!node) return;
    if (node.tagName === "FRAGMENT") {
      node.children.forEach((child) => this.appendChild(child));
      return node;
    }
    node.parentElement = this;
    this.children.push(node);
    return node;
  }
  replaceChildren(...nodes) {
    this.children = [];
    nodes.forEach((node) => {
      if (node && node.tagName === "FRAGMENT") {
        node.children.forEach((child) => this.appendChild(child));
      } else {
        this.appendChild(node);
      }
    });
  }
  setAttribute(name, value) {
    this.attributes[name] = value;
  }
  closest(selector) {
    if (selector === this.tagName.toLowerCase() || selector === this.tagName) {
      return this;
    }
    if (selector.startsWith(".") && this.classList.contains(selector.slice(1))) {
      return this;
    }
    if (selector.startsWith("#") && this.id === selector.slice(1)) {
      return this;
    }
    return this.parentElement ? this.parentElement.closest(selector) : null;
  }
  querySelector(selector) {
    for (const child of this.children) {
      if (
        (selector.startsWith("#") && child.id === selector.slice(1)) ||
        (selector.startsWith(".") && child.classList.contains(selector.slice(1))) ||
        child.tagName.toLowerCase() === selector.toLowerCase()
      ) {
        return child;
      }
      const found = child.querySelector(selector);
      if (found) return found;
    }
    return null;
  }
}

class FakeDocument extends FakeEventTarget {
  constructor() {
    super();
    this.main = new FakeElement("main");
  }
  createElement(tag) {
    return new FakeElement(tag);
  }
  createDocumentFragment() {
    return new FakeElement("fragment");
  }
  querySelector(selector) {
    if (selector === "main") return this.main;
    return null;
  }
}

class FakeStorage {
  constructor() {
    this.data = new Map();
  }
  getItem(key) {
    return this.data.has(key) ? this.data.get(key) : null;
  }
  setItem(key, value) {
    this.data.set(key, String(value));
  }
  removeItem(key) {
    this.data.delete(key);
  }
}

async function runUITests() {
  // stub globals
  global.HTMLElement = FakeElement;
  global.window = {
    localStorage: new FakeStorage(),
  };
  global.document = new FakeDocument();
  global.Event = FakeEvent;

  // Speed up timers used in fetchItems
  global.setTimeout = (fn) => fn();

  // Set persisted prefs before load
  window.localStorage.setItem(
    "taskUIPrefs",
    JSON.stringify({ filter: "completed", sort: "oldest" })
  );

  // Import UI (will register DOMContentLoaded listener)
  await import("../UserInterface.js");

  // Fire DOMContentLoaded to initialize UI
  document.dispatchEvent(new FakeEvent("DOMContentLoaded"));

  const main = document.main;
  const filterSelect = main.querySelector("#filter");
  const sortSelect = main.querySelector("#sort");
  const form = main.querySelector("form");
  const input = form.querySelector("input");
  const list = main.querySelector("ul");

  assert(filterSelect.value === "completed", "Filter should initialize from prefs");
  assert(sortSelect.value === "oldest", "Sort should initialize from prefs");

  // Change prefs and ensure they persist
  filterSelect.value = "active";
  filterSelect.dispatchEvent(new FakeEvent("change", { target: filterSelect }));
  sortSelect.value = "recent";
  sortSelect.dispatchEvent(new FakeEvent("change", { target: sortSelect }));
  const stored = JSON.parse(window.localStorage.getItem("taskUIPrefs"));
  assert(stored.filter === "active", "Filter change should persist");
  assert(stored.sort === "recent", "Sort change should persist");

  // Shortcut add via Cmd/Ctrl+Enter
  input.value = "Keyboard Task";
  form.dispatchEvent(
    new FakeEvent("keydown", { key: "Enter", metaKey: true, target: form })
  );
  const afterShortcutAdd = await fetchItems();
  const added = afterShortcutAdd.find((t) => t.label === "Keyboard Task");
  assert(added, "Cmd/Ctrl+Enter should add a task");

  // Keyboard toggle via Enter on list item
  const li = list.children.find((child) => child.dataset && child.dataset.id);
  const liId = li ? Number(li.dataset.id) : null;
  assert(liId, "List item should exist to toggle");
  list.dispatchEvent(new FakeEvent("keydown", { key: "Enter", target: li }));
  const afterToggle = await fetchItems();
  const toggled = afterToggle.find((t) => t.id === liId);
  assert(toggled && toggled.completed, "Enter on list item should toggle completion");
}

async function run() {
  await runDataTests();
  await runUITests();
  console.log(
    "Smoke test passed: data flows, clone checks, prefs persistence, and keyboard shortcuts succeeded."
  );
}

run().catch((err) => {
  console.error("Smoke test failed:", err.message);
  process.exitCode = 1;
});
