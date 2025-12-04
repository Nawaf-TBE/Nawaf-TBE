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

  const controls = document.createElement("div");
  controls.className = "controls";

  const filterSelect = document.createElement("select");
  filterSelect.id = "filter";
  [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
  ].forEach(({ value, label }) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    filterSelect.appendChild(option);
  });

  const sortSelect = document.createElement("select");
  sortSelect.id = "sort";
  [
    { value: "recent", label: "Recent activity" },
    { value: "oldest", label: "Oldest first" },
  ].forEach(({ value, label }) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    sortSelect.appendChild(option);
  });

  controls.append(filterSelect, sortSelect);

  const counts = document.createElement("div");
  counts.id = "counts";
  counts.setAttribute("aria-live", "polite");

  const list = document.createElement("ul");
  list.id = "task-list";
  list.setAttribute("aria-live", "polite");

  form.append(input, submit);
  main.append(form, status, controls, counts, list);

  return { form, input, status, controls, filterSelect, sortSelect, counts, list };
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
  const { form, input, status, counts, list, filterSelect, sortSelect } = createLayout();

  let cachedItems = [];
  const viewState = {
    filter: filterSelect.value,
    sort: sortSelect.value,
  };

  const sorters = {
    recent: (a, b) => {
      const aTime = a.updatedAt ?? a.createdAt ?? 0;
      const bTime = b.updatedAt ?? b.createdAt ?? 0;
      return bTime - aTime || b.id - a.id;
    },
    oldest: (a, b) => {
      const aTime = a.updatedAt ?? a.createdAt ?? 0;
      const bTime = b.updatedAt ?? b.createdAt ?? 0;
      return aTime - bTime || a.id - b.id;
    },
  };

  const applyView = (items) => {
    const filtered = items.filter((item) => {
      if (viewState.filter === "completed") return item.completed;
      if (viewState.filter === "active") return !item.completed;
      return true;
    });
    const sorter = sorters[viewState.sort] || sorters.recent;
    return filtered.slice().sort(sorter);
  };

  const render = (items) => {
    const viewItems = applyView(items);
    renderItems(list, viewItems, {
      onToggle: handleToggle,
      onRemove: handleRemove,
    });
    renderCounts(counts, viewItems);
  };

  const refresh = async () => {
    setStatus(status, "Loading tasks…");
    try {
      const items = await fetchItems();
      cachedItems = items;
      render(items);
      setStatus(status, "");
      return items;
    } catch (err) {
      setStatus(status, err?.message || "Failed to load tasks.", "error");
      return [];
    }
  };

  const runItemAction = (action, successMessage) => {
    const { error } = action();
    if (error) {
      setStatus(status, error, "error");
      return false;
    }
    setStatus(status, successMessage);
    refresh();
    return true;
  };

  const handleToggle = (id) => {
    runItemAction(() => toggleItem(id), "Task updated.");
  };

  const handleRemove = (id) => {
    runItemAction(() => removeItem(id), "Task removed.");
  };

  filterSelect.addEventListener("change", () => {
    viewState.filter = filterSelect.value;
    render(cachedItems);
  });

  sortSelect.addEventListener("change", () => {
    viewState.sort = sortSelect.value;
    render(cachedItems);
  });

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
