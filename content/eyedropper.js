(() => {
  if (window.__cColorPickerActive) return;
  window.__cColorPickerActive = true;

  let canvas, ctx, pixelData, imgWidth, imgHeight;
  let dpr = window.devicePixelRatio || 1;

  const GRID_SIZE = 11; // 11x11 pixel grid in the magnifier
  const LENS_RADIUS = 66;
  const CELL_SIZE = (LENS_RADIUS * 2) / GRID_SIZE;
  const HALF_GRID = Math.floor(GRID_SIZE / 2);

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "eyedropper-init") {
      init(message.screenshot);
    }
  });

  function init(dataUrl) {
    const img = new Image();
    img.onerror = () => {
      window.__cColorPickerActive = false;
    };
    img.onload = () => {
      try {
        imgWidth = img.width;
        imgHeight = img.height;

        const offscreen = new OffscreenCanvas(imgWidth, imgHeight);
        const offCtx = offscreen.getContext("2d");
        offCtx.drawImage(img, 0, 0);
        pixelData = offCtx.getImageData(0, 0, imgWidth, imgHeight).data;

        createOverlay();
      } catch {
        window.__cColorPickerActive = false;
      }
    };
    img.src = dataUrl;
  }

  function createOverlay() {
    canvas = document.createElement("canvas");
    canvas.id = "__c-color-picker-canvas";
    canvas.style.cssText =
      "position:fixed;top:0;left:0;z-index:2147483647;width:100vw;height:100vh;";
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    document.body.classList.add("__c-color-picker-active");
    document.body.appendChild(canvas);

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", cleanup);
  }

  function getPixel(px, py) {
    const x = Math.max(0, Math.min(px, imgWidth - 1));
    const y = Math.max(0, Math.min(py, imgHeight - 1));
    const i = (y * imgWidth + x) * 4;
    return { r: pixelData[i], g: pixelData[i + 1], b: pixelData[i + 2] };
  }

  function rgbToHex(r, g, b) {
    return (
      "#" +
      ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()
    );
  }

  function onMouseMove(e) {
    const mx = e.clientX;
    const my = e.clientY;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    ctx.clearRect(0, 0, vw, vh);

    // Dark overlay tint
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(0, 0, vw, vh);

    // Screenshot pixel under cursor
    const sx = Math.round(mx * dpr);
    const sy = Math.round(my * dpr);
    const centerColor = getPixel(sx, sy);
    const hex = rgbToHex(centerColor.r, centerColor.g, centerColor.b);

    // Lens position — clamp so the circle stays in viewport
    const previewHeight = 36;
    const gap = 12;
    let lx = Math.max(LENS_RADIUS + 4, Math.min(mx, vw - LENS_RADIUS - 4));
    let ly = Math.max(LENS_RADIUS + 4, Math.min(my, vh - LENS_RADIUS - 4));

    // Flip preview above the lens when too close to the bottom
    const spaceBelow = vh - (ly + LENS_RADIUS);
    const previewY =
      spaceBelow >= gap + previewHeight + 4
        ? ly + LENS_RADIUS + gap
        : ly - LENS_RADIUS - gap - previewHeight;

    drawMagnifier(lx, ly, sx, sy);
    drawPreview(lx, previewY, hex, centerColor);
  }

  function drawMagnifier(cx, cy, sx, sy) {
    ctx.save();

    // Circular clip
    ctx.beginPath();
    ctx.arc(cx, cy, LENS_RADIUS, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Draw pixel grid
    const startX = cx - LENS_RADIUS;
    const startY = cy - LENS_RADIUS;

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const px = sx + (col - HALF_GRID);
        const py = sy + (row - HALF_GRID);
        const color = getPixel(px, py);

        ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
        ctx.fillRect(
          startX + col * CELL_SIZE,
          startY + row * CELL_SIZE,
          CELL_SIZE,
          CELL_SIZE
        );
      }
    }

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(startX + i * CELL_SIZE, startY);
      ctx.lineTo(startX + i * CELL_SIZE, startY + GRID_SIZE * CELL_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(startX, startY + i * CELL_SIZE);
      ctx.lineTo(startX + GRID_SIZE * CELL_SIZE, startY + i * CELL_SIZE);
      ctx.stroke();
    }

    // Center crosshair
    const centerX = startX + HALF_GRID * CELL_SIZE;
    const centerY = startY + HALF_GRID * CELL_SIZE;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(centerX, centerY, CELL_SIZE, CELL_SIZE);

    ctx.restore();

    // Lens border + shadow
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, LENS_RADIUS, 0, Math.PI * 2);
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 12;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  function drawPreview(cx, y, hex, color) {
    const boxW = 100;
    const boxH = 32;
    const bx = cx - boxW / 2;

    // Rounded rect background
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, bx, y, boxW, boxH, 8);
    ctx.fillStyle = "rgba(30,30,30,0.9)";
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();

    // Color swatch
    const swatchSize = 16;
    const swatchX = bx + 10;
    const swatchY = y + (boxH - swatchSize) / 2;
    ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
    ctx.beginPath();
    roundRect(ctx, swatchX, swatchY, swatchSize, swatchSize, 3);
    ctx.fill();

    // HEX text
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px -apple-system, system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(hex, swatchX + swatchSize + 8, y + boxH / 2);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function onClick(e) {
    const sx = Math.round(e.clientX * dpr);
    const sy = Math.round(e.clientY * dpr);
    const color = getPixel(sx, sy);
    const hex = rgbToHex(color.r, color.g, color.b);

    copyToClipboard(hex);
    showToast(hex, color);
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.cssText = "position:fixed;opacity:0;";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
  }

  function showToast(hex, color) {
    // Remove event listeners immediately
    canvas.removeEventListener("mousemove", onMouseMove);
    canvas.removeEventListener("click", onClick);
    document.removeEventListener("keydown", onKeyDown);

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    ctx.clearRect(0, 0, vw, vh);

    // Toast background
    const toastW = 180;
    const toastH = 48;
    const tx = (vw - toastW) / 2;
    const ty = (vh - toastH) / 2;

    ctx.save();
    ctx.beginPath();
    roundRect(ctx, tx, ty, toastW, toastH, 10);
    ctx.fillStyle = "rgba(30,30,30,0.95)";
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.restore();

    // Swatch
    const swatchSize = 22;
    const swatchX = tx + 14;
    const swatchY = ty + (toastH - swatchSize) / 2;
    ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
    ctx.beginPath();
    roundRect(ctx, swatchX, swatchY, swatchSize, swatchSize, 4);
    ctx.fill();

    // Text
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px -apple-system, system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(`${hex} copied!`, swatchX + swatchSize + 10, ty + toastH / 2);

    setTimeout(cleanup, 800);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cleanup();
    }
  }

  function cleanup() {
    if (canvas) {
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("click", onClick);
    }
    document.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("resize", cleanup);

    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
    document.body.classList.remove("__c-color-picker-active");

    canvas = null;
    ctx = null;
    pixelData = null;
    window.__cColorPickerActive = false;
  }
})();
