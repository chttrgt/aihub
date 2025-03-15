export function openNewTab(url) {
  return chrome.tabs.create({ url });
}

export function openMultipleTabs(urls) {
  return Promise.all(urls.map((url) => chrome.tabs.create({ url })));
}
