// Basic application logic for User Interface demo

// Mock data that UI could render
const demoItems = [
  { id: 1, label: "First task", completed: false },
  { id: 2, label: "Second task", completed: true },
];

// Function to fetch items (simulated async behavior)
export async function fetchItems() {
  // simulate network delay
  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve(
          demoItems.map((item) => ({
            ...item,
          }))
        ),
      300
    );
  });
}

// Function to toggle an item in the mock data
export function toggleItem(id) {
  const item = demoItems.find((entry) => entry.id === id);
  if (item) {
    item.completed = !item.completed;
  }
  return item;
}

// Helper to log current state (useful for debugging)
export function logState() {
  console.table(demoItems);
}
