export function saveTools(tools) {
  return chrome.storage.local.set({ tools });
}

export function loadTools() {
  return chrome.storage.local
    .get(["tools"])
    .then((result) => result.tools || []);
}

export function clearTools() {
  return chrome.storage.local.remove(["tools"]);
}

// Add new helper function to get unique categories
export function getCategories() {
  return loadTools().then((tools) => {
    const categories = new Set();
    tools.forEach((tool) => {
      if (tool.categories) {
        tool.categories.forEach((cat) => categories.add(cat));
      }
    });
    return Array.from(categories);
  });
}
