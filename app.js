// Basic application logic for User Interface demo

const STORAGE_KEY = "demoItems";
const API_STORAGE_KEY = "demoItemsApi";

const now = () => Date.now();
const MIN_LABEL_LENGTH = 3;
const MAX_LABEL_LENGTH = 100;

// Mock data that UI could render (in-memory state)
let demoItems = [
  {
    id: 1,
    label: "First task",
    completed: false,
    createdAt: now(),
    updatedAt: now(),
    dueDate: null,
  },
  {
    id: 2,
    label: "Second task",
    completed: true,
    createdAt: now(),
    updatedAt: now(),
    dueDate: null,
  },
];

const canUseStorage =
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const storageState = {
  enabled: canUseStorage,
  error: canUseStorage ? null : "localStorage unavailable",
};

const apiState = {
  enabled: true,
  error: null,
};

function markStorageError(err) {
  storageState.enabled = false;
  storageState.error = err ? String(err) : "localStorage unavailable";
}

function markApiError(err) {
  apiState.enabled = false;
  apiState.error = err ? String(err) : "API unavailable";
}

// Local persistence helpers (no-op if storage is unavailable)
function loadFromStorage() {
  if (!canUseStorage) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (err) {
    markStorageError(err);
    return null;
  }
}

function saveToStorage(items) {
  if (!canUseStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    // app continues in-memory only
    markStorageError(err);
  }
}

function cloneItems(items = demoItems) {
  return items.map((item) => ({ ...item }));
}

async function loadFromMockApi() {
  try {
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 50));
    if (!canUseStorage) {
      throw new Error("localStorage unavailable");
    }
    const raw = window.localStorage.getItem(API_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (err) {
    markApiError(err);
    return null;
  }
}

async function saveToMockApi(items) {
  try {
    await new Promise((resolve) => setTimeout(resolve, 50));
    if (!canUseStorage) {
      throw new Error("localStorage unavailable");
    }
    window.localStorage.setItem(API_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    markApiError(err);
  }
}

function persistState() {
  saveToStorage(demoItems);
  saveToMockApi(demoItems);
}

const storedItems = loadFromStorage();
if (storedItems) {
  const timestamped = storedItems.map((item) => {
    const createdAt = item.createdAt ?? now();
    const updatedAt = item.updatedAt ?? createdAt;
    const dueDate = item.dueDate ?? null;
    return { ...item, createdAt, updatedAt, dueDate };
  });
  demoItems = timestamped;
}

// Function to fetch items (simulated async behavior)
export async function fetchItems() {
  // simulate network delay
  if (!apiState.error) {
    const apiItems = await loadFromMockApi();
    if (apiItems) {
      demoItems = apiItems;
    }
  }
  return new Promise((resolve) => {
    setTimeout(() => resolve(cloneItems()), 300);
  });
}

// Function to toggle an item in the mock data
export function toggleItem(id) {
  const item = demoItems.find((entry) => entry.id === id);
  if (item) {
    item.completed = !item.completed;
    item.updatedAt = now();
    persistState();
    return { item, error: null };
  }
  console.warn(`toggleItem: no item found for id ${id}`);
  return { item: null, error: `No item found for id ${id}` };
}

// Add a new item to the list
export function addItem(label, dueDate = null) {
  if (!label || typeof label !== "string") {
    return { item: null, error: "Label must be a non-empty string" };
  }
  const trimmedLabel = label.trim();
  if (!trimmedLabel) {
    return { item: null, error: "Label must not be blank" };
  }
  if (trimmedLabel.length < MIN_LABEL_LENGTH) {
    return {
      item: null,
      error: `Label must be at least ${MIN_LABEL_LENGTH} characters`,
    };
  }
  if (trimmedLabel.length > MAX_LABEL_LENGTH) {
    return {
      item: null,
      error: `Label must be under ${MAX_LABEL_LENGTH} characters`,
    };
  }
  const duplicate = demoItems.some(
    (entry) => entry.label.trim().toLowerCase() === trimmedLabel.toLowerCase()
  );
  if (duplicate) {
    return { item: null, error: "A task with this name already exists" };
  }
  const nextId = demoItems.reduce((max, entry) => Math.max(max, entry.id), 0) + 1;
  const timestamp = now();
  const normalizedDueDate = dueDate ? String(dueDate) : null;
  const newItem = {
    id: nextId,
    label: trimmedLabel,
    completed: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    dueDate: normalizedDueDate,
  };
  demoItems.push(newItem);
  persistState();
  return { item: newItem, error: null };
}

// Remove an item by id
export function removeItem(id) {
  const index = demoItems.findIndex((entry) => entry.id === id);
  if (index === -1) {
    console.warn(`removeItem: no item found for id ${id}`);
    return { removed: false, error: `No item found for id ${id}` };
  }
  demoItems.splice(index, 1);
  persistState();
  return { removed: true, error: null };
}

// Mark all items as completed
export function markAllComplete() {
  if (!demoItems.length) {
    return { updated: 0, error: null };
  }
  demoItems.forEach((item) => {
    if (!item.completed) {
      item.completed = true;
      item.updatedAt = now();
    }
  });
  persistState();
  return { updated: demoItems.length, error: null };
}

// Remove all completed items
export function clearCompleted() {
  const before = demoItems.length;
  demoItems = demoItems.filter((item) => !item.completed);
  const removed = before - demoItems.length;
  if (removed) {
    persistState();
  }
  return { removed, error: null };
}

function normalizeImportedItems(items) {
  const sanitized = [];
  items.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const label = typeof item.label === "string" ? item.label.trim() : "";
    if (!label) return;
    const id = Number.isFinite(item.id) ? item.id : index + 1;
    const completed = Boolean(item.completed);
    const createdAt = Number.isFinite(item.createdAt) ? item.createdAt : now();
    const updatedAt = Number.isFinite(item.updatedAt) ? item.updatedAt : createdAt;
    const dueDate = item.dueDate ? String(item.dueDate) : null;
    sanitized.push({
      id,
      label,
      completed,
      createdAt,
      updatedAt,
      dueDate,
    });
  });
  return sanitized;
}

export function importItems(items) {
  if (!Array.isArray(items)) {
    return { imported: 0, error: "Invalid import format" };
  }
  const sanitized = normalizeImportedItems(items);
  if (!sanitized.length) {
    return { imported: 0, error: "No valid tasks found in import" };
  }
  demoItems = sanitized;
  persistState();
  return { imported: sanitized.length, error: null };
}

// Helper to log current state (useful for debugging)
export function logState() {
  console.table(demoItems);
}

export function getStorageStatus() {
  return { ...storageState };
}

export function getApiStatus() {
  return { ...apiState };
}
