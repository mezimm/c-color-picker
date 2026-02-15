(() => {
  if (document.querySelector(".__c-color-picker-countdown")) return;

  const el = document.createElement("div");
  el.className = "__c-color-picker-countdown";
  document.body.appendChild(el);

  let remaining = 5;
  el.textContent = `Picking in ${remaining}…`;

  const interval = setInterval(() => {
    remaining--;
    if (remaining > 0) {
      el.textContent = `Picking in ${remaining}…`;
    } else {
      clearInterval(interval);
      el.remove();
      chrome.runtime.sendMessage({ type: "activate-eyedropper" });
    }
  }, 1000);
})();
