const pickBtn = document.getElementById("pick-color");
const extractBtn = document.getElementById("extract-colors");
const colorsSection = document.getElementById("colors-section");
const colorsGrid = document.getElementById("colors-grid");
const status = document.getElementById("status");

pickBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "activate-eyedropper" });
  window.close();
});

extractBtn.addEventListener("click", async () => {
  extractBtn.disabled = true;
  showStatus("Extracting colors\u2026", true);

  chrome.runtime.sendMessage({ type: "capture-screenshot" }, (response) => {
    if (!response || response.error) {
      showStatus("Failed to capture screenshot");
      extractBtn.disabled = false;
      return;
    }

    processScreenshot(response.screenshot);
  });
});

function processScreenshot(dataUrl) {
  const img = new Image();
  img.onload = () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);

      const colors = extractDominantColors(imageData);
      displayColors(colors);
    } catch {
      showStatus("Processing error");
    }
    extractBtn.disabled = false;
  };
  img.onerror = () => {
    showStatus("Failed to process screenshot");
    extractBtn.disabled = false;
  };
  img.src = dataUrl;
}

function displayColors(colors) {
  colorsGrid.innerHTML = "";

  if (colors.length === 0) {
    showStatus("No colors found");
    return;
  }

  colors.forEach((color) => {
    const item = document.createElement("div");
    item.className = "color-item";
    item.title = `Click to copy ${color.hex}`;

    const swatch = document.createElement("div");
    swatch.className = "color-swatch";
    swatch.style.backgroundColor = color.hex;

    const label = document.createElement("span");
    label.className = "color-hex";
    label.textContent = color.hex;

    item.appendChild(swatch);
    item.appendChild(label);

    item.addEventListener("click", () => copyColor(color.hex));

    colorsGrid.appendChild(item);
  });

  colorsSection.classList.remove("hidden");
  hideStatus();
}

async function copyColor(hex) {
  try {
    await navigator.clipboard.writeText(hex);
    showStatus(`${hex} copied!`);
    setTimeout(hideStatus, 1500);
  } catch {
    showStatus("Copy failed");
    setTimeout(hideStatus, 1500);
  }
}

function showStatus(msg, showSpinner = false) {
  if (showSpinner) {
    const spinner = document.createElement("span");
    spinner.className = "spinner";
    status.textContent = "";
    status.appendChild(spinner);
    status.appendChild(document.createTextNode(msg));
  } else {
    status.textContent = msg;
  }
  status.classList.remove("hidden");
}

function hideStatus() {
  status.classList.add("hidden");
}
