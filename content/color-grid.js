(() => {
  // Remove existing panel if re-triggered
  const existing = document.getElementById("__c-color-picker-grid");
  if (existing) existing.remove();

  chrome.runtime.onMessage.addListener(function listener(message) {
    if (message.type !== "color-grid-init") return;
    chrome.runtime.onMessage.removeListener(listener);
    buildPanel(message.screenshot);
  });

  function buildPanel(dataUrl) {
    const img = new Image();
    img.onerror = () => {};
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);

        const colors = extractDominantColors(imageData);
        if (colors.length > 0) showPanel(colors);
      } catch {
        // silently fail
      }
    };
    img.src = dataUrl;
  }

  function showPanel(colors) {
    const panel = document.createElement("div");
    panel.id = "__c-color-picker-grid";
    panel.style.cssText = [
      "position:fixed",
      "top:16px",
      "right:16px",
      "z-index:2147483646",
      "background:rgba(28,28,30,0.96)",
      "border-radius:14px",
      "padding:14px",
      "box-shadow:0 8px 32px rgba(0,0,0,0.35)",
      "font-family:-apple-system,system-ui,sans-serif",
      "color:#e0e0e0",
      "width:260px",
      "backdrop-filter:blur(12px)",
      "-webkit-backdrop-filter:blur(12px)",
    ].join(";");

    // Header row
    const header = document.createElement("div");
    header.style.cssText =
      "display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;";

    const title = document.createElement("span");
    title.textContent = "Dominant Colors";
    title.style.cssText = "font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#888;";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "\u00D7";
    closeBtn.style.cssText = [
      "background:none",
      "border:none",
      "color:#888",
      "font-size:20px",
      "cursor:pointer",
      "padding:0 2px",
      "line-height:1",
    ].join(";");
    closeBtn.addEventListener("mouseenter", () => (closeBtn.style.color = "#fff"));
    closeBtn.addEventListener("mouseleave", () => (closeBtn.style.color = "#888"));
    closeBtn.addEventListener("click", () => panel.remove());

    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Color grid
    const grid = document.createElement("div");
    grid.style.cssText = "display:grid;grid-template-columns:repeat(4,1fr);gap:8px;";

    // Toast element
    const toast = document.createElement("div");
    toast.style.cssText = [
      "text-align:center",
      "font-size:12px",
      "font-weight:500",
      "color:#5b7ff5",
      "margin-top:8px",
      "min-height:18px",
    ].join(";");

    let toastTimer = null;

    colors.forEach((color) => {
      const item = document.createElement("div");
      item.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;";
      item.title = `Click to copy ${color.hex}`;

      const swatch = document.createElement("div");
      swatch.style.cssText = [
        `background:${color.hex}`,
        "width:50px",
        "height:50px",
        "border-radius:10px",
        "border:2px solid rgba(255,255,255,0.08)",
        "transition:transform 0.15s,box-shadow 0.15s",
      ].join(";");

      const label = document.createElement("span");
      label.textContent = color.hex;
      label.style.cssText = "font-size:10px;font-weight:500;color:#aaa;font-family:'SF Mono','Fira Code',monospace;";

      item.addEventListener("mouseenter", () => {
        swatch.style.transform = "scale(1.08)";
        swatch.style.boxShadow = "0 0 0 2px #5b7ff5";
      });
      item.addEventListener("mouseleave", () => {
        swatch.style.transform = "";
        swatch.style.boxShadow = "";
      });

      item.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(color.hex);
          toast.textContent = `${color.hex} copied!`;
        } catch {
          toast.textContent = "Copy failed";
        }
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => (toast.textContent = ""), 1500);
      });

      item.appendChild(swatch);
      item.appendChild(label);
      grid.appendChild(item);
    });

    panel.appendChild(grid);
    panel.appendChild(toast);
    document.body.appendChild(panel);
  }
})();
