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
