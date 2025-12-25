// Basic User Interface wired to the data layer
import {
  fetchItems,
  addItem,
  toggleItem,
  removeItem,
  markAllComplete,
  clearCompleted,
  importItems,
  getStorageStatus,
} from "./app.js";

const PREFS_KEY = "taskUIPrefs";
const FILTER_OPTIONS = ["all", "active", "completed"];
const SORT_OPTIONS = ["recent", "oldest", "due"];
const MIN_LABEL_LENGTH = 3;
const MAX_LABEL_LENGTH = 100;
const DUE_SOON_DAYS = 3;

const canUseStorage =
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

function loadPrefs() {
  if (!canUseStorage) return null;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function savePrefs(prefs) {
  if (!canUseStorage) return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage errors; UI will still function with defaults
  }
}

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
  input.setAttribute("aria-label", "Task name");

  const dueDateInput = document.createElement("input");
  dueDateInput.type = "date";
  dueDateInput.id = "due-date";
  dueDateInput.setAttribute("aria-label", "Due date");

  const helper = document.createElement("div");
  helper.id = "input-helper";
  helper.textContent = "3-100 chars, no duplicate names. Optional due date.";

  const counter = document.createElement("div");
  counter.id = "char-counter";
  counter.textContent = "0 / 100";

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "Add Task";
  submit.setAttribute("aria-label", "Add task");

  const status = document.createElement("div");
  status.id = "status";
  status.setAttribute("aria-live", "polite");
  status.setAttribute("role", "status");

  const storageBanner = document.createElement("div");
  storageBanner.id = "storage-banner";
  storageBanner.setAttribute("aria-live", "polite");
  storageBanner.setAttribute("role", "status");

  const controls = document.createElement("div");
  controls.className = "controls";

  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.id = "search";
  searchInput.placeholder = "Search tasks";
  searchInput.setAttribute("aria-label", "Search tasks");

  const filterSelect = document.createElement("select");
  filterSelect.id = "filter";
  filterSelect.setAttribute("aria-label", "Filter tasks");
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
  sortSelect.setAttribute("aria-label", "Sort tasks");
  [
    { value: "recent", label: "Recent activity" },
    { value: "oldest", label: "Oldest first" },
    { value: "due", label: "Due date" },
  ].forEach(({ value, label }) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    sortSelect.appendChild(option);
  });

  const markAllButton = document.createElement("button");
  markAllButton.type = "button";
  markAllButton.id = "mark-all";
  markAllButton.textContent = "Mark All Complete";
  markAllButton.setAttribute("aria-label", "Mark all tasks complete");

  const clearCompletedButton = document.createElement("button");
  clearCompletedButton.type = "button";
  clearCompletedButton.id = "clear-completed";
  clearCompletedButton.textContent = "Clear Completed";
  clearCompletedButton.setAttribute("aria-label", "Clear completed tasks");

  const clearFilters = document.createElement("button");
  clearFilters.type = "button";
  clearFilters.id = "clear-filters";
  clearFilters.textContent = "Clear Filters";
  clearFilters.setAttribute("aria-label", "Clear filters");

  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.id = "export-tasks";
  exportButton.textContent = "Export JSON";
  exportButton.setAttribute("aria-label", "Export tasks as JSON");

  const importLabel = document.createElement("label");
  importLabel.className = "import-label";
  importLabel.textContent = "Import JSON";

  const importInput = document.createElement("input");
  importInput.type = "file";
  importInput.id = "import-tasks";
  importInput.accept = "application/json";
  importInput.setAttribute("aria-label", "Import tasks from JSON");

  importLabel.append(importInput);

  controls.append(
    searchInput,
    filterSelect,
    sortSelect,
    markAllButton,
    clearCompletedButton,
    exportButton,
    importLabel,
    clearFilters
  );

  const counts = document.createElement("div");
  counts.id = "counts";
  counts.setAttribute("aria-live", "polite");

  const list = document.createElement("ul");
  list.id = "task-list";
  list.setAttribute("aria-live", "polite");

  form.append(input, dueDateInput, helper, counter, submit);
  main.append(form, status, storageBanner, controls, counts, list);

  return {
    form,
    input,
    dueDateInput,
    helper,
    counter,
    status,
    storageBanner,
    controls,
    searchInput,
    filterSelect,
    sortSelect,
    markAllButton,
    clearCompletedButton,
    exportButton,
    importInput,
    clearFilters,
    counts,
    list,
  };
}

function createEmptyState() {
  const empty = document.createElement("li");
  empty.className = "empty";

  const visual = document.createElement("img");
  visual.src = "./assets/empty-state.svg";
  visual.alt = "No tasks illustration";
  visual.className = "empty-visual";

  const text = document.createElement("div");
  text.textContent = "No tasks yet. Add one above!";

  empty.append(visual, text);
  return empty;
}

function isDueSoon(dueDate) {
  if (!dueDate) return false;
  const due = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= DUE_SOON_DAYS;
}

function createListItem(item, { onToggle, onRemove }) {
  const li = document.createElement("li");
  li.dataset.id = String(item.id);
  li.tabIndex = 0;
  li.setAttribute("role", "listitem");
  if (isDueSoon(item.dueDate) && !item.completed) {
    li.classList.add("due-soon");
  }
  const dueText = item.dueDate ? `, due ${item.dueDate}` : "";
  li.setAttribute(
    "aria-label",
    `${item.label}, ${item.completed ? "completed" : "active"}${dueText}`
  );

  const label = document.createElement("span");
  label.textContent = item.label;
  label.className = item.completed ? "completed" : "";

  const due = document.createElement("span");
  due.className = "due-date";
  if (item.dueDate) {
    due.textContent = `Due: ${item.dueDate}`;
  } else {
    due.textContent = "No due date";
  }

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.textContent = item.completed ? "Mark Incomplete" : "Mark Done";
  toggleBtn.setAttribute(
    "aria-label",
    `${item.completed ? "Mark incomplete" : "Mark complete"}: ${item.label}`
  );
  toggleBtn.addEventListener("click", () => onToggle(item.id));

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.textContent = "Remove";
  removeBtn.setAttribute("aria-label", `Remove task: ${item.label}`);
  removeBtn.addEventListener("click", () => onRemove(item.id));

  const actions = document.createElement("div");
  actions.className = "actions";
  actions.append(toggleBtn, removeBtn);

  li.append(label, due, actions);
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

function setStorageBanner(bannerEl) {
  const state = getStorageStatus();
  if (!state.enabled) {
    bannerEl.textContent =
      "Local storage is unavailable; changes only persist during this session.";
    bannerEl.classList.add("show");
  } else {
    bannerEl.textContent = "";
    bannerEl.classList.remove("show");
  }
}

async function initializeUI() {
  const {
    form,
    input,
    dueDateInput,
    helper,
    counter,
    status,
    storageBanner,
    counts,
    list,
    searchInput,
    filterSelect,
    sortSelect,
    markAllButton,
    clearCompletedButton,
    exportButton,
    importInput,
    clearFilters,
  } = createLayout();

  const storedPrefs = loadPrefs();
  const normalize = (value, options, fallback) =>
    options.includes(value) ? value : fallback;
  const initialFilter = normalize(
    storedPrefs?.filter,
    FILTER_OPTIONS,
    filterSelect.value
  );
  const initialSort = normalize(storedPrefs?.sort, SORT_OPTIONS, sortSelect.value);

  filterSelect.value = initialFilter;
  sortSelect.value = initialSort;

  let cachedItems = [];
  let refreshScheduled = null;
  const viewState = {
    query: "",
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
    due: (a, b) => {
      const aDue = a.dueDate ? new Date(`${a.dueDate}T00:00:00`).getTime() : Infinity;
      const bDue = b.dueDate ? new Date(`${b.dueDate}T00:00:00`).getTime() : Infinity;
      return aDue - bDue || a.id - b.id;
    },
  };

  const applyView = (items) => {
    const query = viewState.query.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (query && !item.label.toLowerCase().includes(query)) {
        return false;
      }
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
      setStorageBanner(storageBanner);
      return items;
    } catch (err) {
      setStatus(status, err?.message || "Failed to load tasks.", "error");
      setStorageBanner(storageBanner);
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
    scheduleRefresh();
    setStorageBanner(storageBanner);
    return true;
  };

  const handleToggle = (id) => {
    runItemAction(() => toggleItem(id), "Task updated.");
  };

  const handleRemove = (id) => {
    runItemAction(() => removeItem(id), "Task removed.");
  };

  const attemptAdd = () => {
    const label = input.value.trim();
    counter.textContent = `${Math.min(label.length, MAX_LABEL_LENGTH)} / ${MAX_LABEL_LENGTH}`;
    const dueDate = dueDateInput.value ? dueDateInput.value : null;
    if (!label) {
      input.classList.add("invalid");
      setStatus(status, "Please enter a task name.", "error");
      input.focus();
      return;
    }
    if (label.length < MIN_LABEL_LENGTH) {
      input.classList.add("invalid");
      setStatus(
        status,
        `Task name must be at least ${MIN_LABEL_LENGTH} characters.`,
        "error"
      );
      input.focus();
      return;
    }
    if (label.length > MAX_LABEL_LENGTH) {
      input.classList.add("invalid");
      setStatus(
        status,
        `Task name must be under ${MAX_LABEL_LENGTH} characters.`,
        "error"
      );
      input.focus();
      return;
    }
    const duplicate = cachedItems.some(
      (item) => item.label.trim().toLowerCase() === label.toLowerCase()
    );
    if (duplicate) {
      input.classList.add("invalid");
      setStatus(status, "A task with this name already exists.", "error");
      input.focus();
      return;
    }
    input.classList.remove("invalid");

    const added = runItemAction(() => addItem(label, dueDate), "Task added.");
    if (!added) {
      input.classList.add("invalid");
      return;
    }
    input.classList.remove("invalid");
    input.value = "";
    dueDateInput.value = "";
    counter.textContent = `0 / ${MAX_LABEL_LENGTH}`;
  };

  filterSelect.addEventListener("change", () => {
    viewState.filter = filterSelect.value;
    savePrefs(viewState);
    render(cachedItems);
  });

  sortSelect.addEventListener("change", () => {
    viewState.sort = sortSelect.value;
    savePrefs(viewState);
    render(cachedItems);
  });

  searchInput.addEventListener("input", () => {
    viewState.query = searchInput.value;
    render(cachedItems);
  });

  clearFilters.addEventListener("click", () => {
    viewState.query = "";
    viewState.filter = "all";
    searchInput.value = "";
    filterSelect.value = "all";
    savePrefs(viewState);
    render(cachedItems);
  });

  markAllButton.addEventListener("click", () => {
    runItemAction(() => markAllComplete(), "All tasks marked complete.");
  });

  clearCompletedButton.addEventListener("click", () => {
    const { removed, error } = clearCompleted();
    if (error) {
      setStatus(status, error, "error");
      return;
    }
    setStatus(status, removed ? "Completed tasks cleared." : "No completed tasks.");
    scheduleRefresh();
  });

  exportButton.addEventListener("click", async () => {
    const items = await fetchItems();
    const payload = JSON.stringify(items, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tasks.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus(status, "Tasks exported.");
  });

  importInput.addEventListener("change", async () => {
    const file = importInput.files && importInput.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const { imported, error } = importItems(parsed);
      if (error) {
        setStatus(status, error, "error");
      } else {
        setStatus(status, `Imported ${imported} tasks.`);
        scheduleRefresh();
      }
    } catch (err) {
      setStatus(status, err?.message || "Failed to import tasks.", "error");
    } finally {
      importInput.value = "";
    }
  });

  form.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      attemptAdd();
    }
  });

  list.addEventListener("keydown", (event) => {
    const isButton = event.target instanceof HTMLElement && event.target.tagName === "BUTTON";
    if (isButton) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    const li = event.target.closest("li");
    if (!li || !li.dataset.id) return;
    event.preventDefault();
    const id = Number(li.dataset.id);
    handleToggle(id);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    attemptAdd();
  });

  input.addEventListener("input", () => {
    const length = Math.min(input.value.length, MAX_LABEL_LENGTH);
    counter.textContent = `${length} / ${MAX_LABEL_LENGTH}`;
    input.classList.remove("invalid");
    setStatus(status, "", "info");
  });

  const scheduleRefresh = () => {
    if (refreshScheduled) return;
    refreshScheduled = setTimeout(async () => {
      refreshScheduled = null;
      await refresh();
    }, 50);
  };

  refresh();
}

document.addEventListener("DOMContentLoaded", initializeUI);
