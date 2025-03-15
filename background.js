import { openNewTab } from "./modules/core/tabManager.js";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "open_tab") {
    openNewTab(request.url);
  }
});
