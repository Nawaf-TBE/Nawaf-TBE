// Basic application logic for User Interface demo

const STORAGE_KEY = "demoItems";

const now = () => Date.now();

// Mock data that UI could render (in-memory state)
let demoItems = [
  { id: 1, label: "First task", completed: false, createdAt: now(), updatedAt: now() },
  { id: 2, label: "Second task", completed: true, createdAt: now(), updatedAt: now() },
];

const canUseStorage =
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

// Local persistence helpers (no-op if storage is unavailable)
function loadFromStorage() {
  if (!canUseStorage) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveToStorage(items) {
  if (!canUseStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors; app will continue in-memory only
  }
}

function cloneItems(items = demoItems) {
  return items.map((item) => ({ ...item }));
}

function persistState() {
  saveToStorage(demoItems);
}

const storedItems = loadFromStorage();
if (storedItems) {
  const timestamped = storedItems.map((item) => {
    const createdAt = item.createdAt ?? now();
    const updatedAt = item.updatedAt ?? createdAt;
    return { ...item, createdAt, updatedAt };
  });
  demoItems = timestamped;
}

// Function to fetch items (simulated async behavior)
export async function fetchItems() {
  // simulate network delay
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
export function addItem(label) {
  if (!label || typeof label !== "string") {
    return { item: null, error: "Label must be a non-empty string" };
  }
  const trimmedLabel = label.trim();
  if (!trimmedLabel) {
    return { item: null, error: "Label must not be blank" };
  }
  const nextId = demoItems.reduce((max, entry) => Math.max(max, entry.id), 0) + 1;
  const timestamp = now();
  const newItem = {
    id: nextId,
    label: trimmedLabel,
    completed: false,
    createdAt: timestamp,
    updatedAt: timestamp,
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

// Helper to log current state (useful for debugging)
export function logState() {
  console.table(demoItems);
}
