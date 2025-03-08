chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "open_tab") {
    chrome.tabs.create({ url: message.url });
  }
});
