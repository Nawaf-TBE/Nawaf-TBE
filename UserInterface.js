// Basic User Interface wired to the data layer
import { fetchItems, addItem, toggleItem, removeItem } from "./app.js";

function createLayout() {
  const main = document.querySelector("main");
  const form = document.createElement("form");
  form.id = "task-form";

  const input = document.createElement("input");
  input.type = "text";
  input.name = "label";
  input.placeholder = "Add a new task";
  input.required = true;
  input.autocomplete = "off";

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "Add Task";

  const status = document.createElement("div");
  status.id = "status";
  status.setAttribute("aria-live", "polite");

  const list = document.createElement("ul");
  list.id = "task-list";
  list.setAttribute("aria-live", "polite");

  form.append(input, submit);
  main.append(form, status, list);

  return { form, input, status, list };
}

function renderItems(listEl, items, onToggle, onRemove) {
  listEl.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("li");
    empty.textContent = "No tasks yet. Add one above!";
    empty.className = "empty";
    listEl.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.dataset.id = String(item.id);

    const label = document.createElement("span");
    label.textContent = item.label;
    label.className = item.completed ? "completed" : "";

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.textContent = item.completed ? "Mark Incomplete" : "Mark Done";
    toggleBtn.addEventListener("click", () => onToggle(item.id));

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => onRemove(item.id));

    const actions = document.createElement("div");
    actions.className = "actions";
    actions.append(toggleBtn, removeBtn);

    li.append(label, actions);
    listEl.appendChild(li);
  });
}

function setStatus(statusEl, message, type = "info") {
  statusEl.textContent = message || "";
  statusEl.className = message ? `status ${type}` : "status";
}

async function initializeUI() {
  const { form, input, status, list } = createLayout();

  async function refresh() {
    setStatus(status, "Loading tasks…");
    try {
      const items = await fetchItems();
      renderItems(list, items, handleToggle, handleRemove);
      setStatus(status, "");
    } catch (err) {
      const message = err?.message || "Failed to load tasks.";
      setStatus(status, message, "error");
    }
  }

  function handleToggle(id) {
    const { error } = toggleItem(id);
    if (error) {
      setStatus(status, error, "error");
      return;
    }
    setStatus(status, "Task updated.");
    refresh();
  }

  function handleRemove(id) {
    const { error } = removeItem(id);
    if (error) {
      setStatus(status, error, "error");
      return;
    }
    setStatus(status, "Task removed.");
    refresh();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const label = input.value;
    const { error } = addItem(label);
    if (error) {
      setStatus(status, error, "error");
      return;
    }
    input.value = "";
    setStatus(status, "Task added.");
    refresh();
  });

  refresh();
}

document.addEventListener("DOMContentLoaded", initializeUI);
