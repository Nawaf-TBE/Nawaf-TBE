import { fetchItems, addItem, toggleItem, removeItem } from "../app.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
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

  console.log("Smoke test passed: add/toggle/remove and clone checks succeeded.");
}

run().catch((err) => {
  console.error("Smoke test failed:", err.message);
  process.exitCode = 1;
});
