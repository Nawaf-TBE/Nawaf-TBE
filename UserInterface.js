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

  const counts = document.createElement("div");
  counts.id = "counts";
  counts.setAttribute("aria-live", "polite");

  const list = document.createElement("ul");
  list.id = "task-list";
  list.setAttribute("aria-live", "polite");

  form.append(input, submit);
  main.append(form, status, counts, list);

  return { form, input, status, counts, list };
}

function createEmptyState() {
  const empty = document.createElement("li");
  empty.textContent = "No tasks yet. Add one above!";
  empty.className = "empty";
  return empty;
}

function createListItem(item, { onToggle, onRemove }) {
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
  return li;
}

function renderItems(listEl, items, handlers) {
  const fragment = document.createDocumentFragment();

  if (!items.length) {
    listEl.replaceChildren(createEmptyState());
    return;
  }

  items.forEach((item) => {
    fragment.appendChild(createListItem(item, handlers));
  });

  listEl.replaceChildren(fragment);
}

function renderCounts(countsEl, items) {
  const total = items.length;
  const completed = items.filter((item) => item.completed).length;
  countsEl.textContent = total
    ? `${completed} of ${total} completed`
    : "No tasks yet";
}

function setStatus(statusEl, message, type = "info") {
  statusEl.textContent = message || "";
  statusEl.className = message ? `status ${type}` : "status";
}

async function initializeUI() {
  const { form, input, status, counts, list } = createLayout();

  function runItemAction(action, successMessage) {
    const { error } = action();
    if (error) {
      setStatus(status, error, "error");
      return false;
    }
    setStatus(status, successMessage);
    refresh();
    return true;
  }

  async function refresh() {
    setStatus(status, "Loading tasks…");
    try {
      const items = await fetchItems();
      renderItems(list, items, {
        onToggle: handleToggle,
        onRemove: handleRemove,
      });
      renderCounts(counts, items);
      setStatus(status, "");
    } catch (err) {
      const message = err?.message || "Failed to load tasks.";
      setStatus(status, message, "error");
    }
  }

  function handleToggle(id) {
    runItemAction(() => toggleItem(id), "Task updated.");
  }

  function handleRemove(id) {
    runItemAction(() => removeItem(id), "Task removed.");
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const label = input.value.trim();
    if (!label) {
      input.classList.add("invalid");
      setStatus(status, "Please enter a task name.", "error");
      input.focus();
      return;
    }
    input.classList.remove("invalid");

    const added = runItemAction(() => addItem(label), "Task added.");
    if (!added) {
      input.classList.add("invalid");
      return;
    }
    input.classList.remove("invalid");
    input.value = "";
  });

  refresh();
}

document.addEventListener("DOMContentLoaded", initializeUI);
