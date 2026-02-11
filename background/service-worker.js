chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "activate-eyedropper") {
    handleEyedropper();
  } else if (message.type === "capture-screenshot") {
    handleScreenshot(sendResponse);
    return true; // keep channel open for async response
  }
});

async function handleEyedropper() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: "png",
    });

    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["content/eyedropper.css"],
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/eyedropper.js"],
    });

    chrome.tabs.sendMessage(tab.id, {
      type: "eyedropper-init",
      screenshot: dataUrl,
    });
  } catch (err) {
    console.warn("C Color Picker: cannot activate on this page —", err.message);
  }
}

async function handleScreenshot(sendResponse) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: "png",
    });
    sendResponse({ screenshot: dataUrl });
  } catch (err) {
    sendResponse({ error: err.message });
  }
}
