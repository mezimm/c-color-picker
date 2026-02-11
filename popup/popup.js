document.getElementById("pick-color").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "activate-eyedropper" });
  window.close();
});

document.getElementById("extract-colors").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "extract-colors" });
  window.close();
});
