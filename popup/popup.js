document.getElementById("pick-color").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "activate-eyedropper" });
  window.close();
});

document.getElementById("extract-colors").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "extract-colors" });
  window.close();
});
