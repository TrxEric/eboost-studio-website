const MAX_FILE_SIZE = 12 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const state = {
  image: null,
  originalData: null,
  mask: null,
  selectedColor: window.EBOOST_WRAP_COLORS?.[0],
  sample: null,
  mode: "simulated",
  fileName: "",
};

const elements = {
  upload: document.querySelector("#carUpload"),
  chooseImage: document.querySelector("#chooseImage"),
  dropzone: document.querySelector("#dropzone"),
  canvas: document.querySelector("#wrapCanvas"),
  emptyPreview: document.querySelector("#emptyPreview"),
  previewTitle: document.querySelector("#previewTitle"),
  previewHint: document.querySelector("#previewHint"),
  swatchGrid: document.querySelector("#swatchGrid"),
  selectedColorCard: document.querySelector("#selectedColorCard"),
  showOriginal: document.querySelector("#showOriginal"),
  showSimulated: document.querySelector("#showSimulated"),
  resetUpload: document.querySelector("#resetUpload"),
  downloadPreview: document.querySelector("#downloadPreview"),
  aiRefine: document.querySelector("#aiRefine"),
  aiMessage: document.querySelector("#aiMessage"),
  maskRange: document.querySelector("#maskRange"),
  status: document.querySelector("#wrapStatus span"),
  progress: document.querySelector("#progressBar"),
};

const context = elements.canvas.getContext("2d", { willReadFrequently: true });

function setStatus(message, progress = 0) {
  elements.status.textContent = message;
  elements.progress.style.width = `${progress}%`;
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHsl(r, g, b) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;

  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case red:
        hue = (green - blue) / delta + (green < blue ? 6 : 0);
        break;
      case green:
        hue = (blue - red) / delta + 2;
        break;
      default:
        hue = (red - green) / delta + 4;
        break;
    }
    hue /= 6;
  }

  return { h: hue * 360, s: saturation, l: lightness };
}

function getFinishSettings(finish) {
  const settings = {
    gloss: { colorStrength: 1, contrast: 1.18, highlight: 0.3, grain: 0 },
    matte: { colorStrength: 0.98, contrast: 0.86, highlight: 0.05, grain: 0 },
    satin: { colorStrength: 1, contrast: 1, highlight: 0.13, grain: 0 },
    metallic: { colorStrength: 1, contrast: 1.1, highlight: 0.2, grain: 0.045 },
  };

  return settings[finish] || settings.satin;
}

function clamp(value, min = 0, max = 255) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

function averageSample(imageData, x, y) {
  const radius = Math.max(4, Math.round(Math.min(imageData.width, imageData.height) * 0.006));
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let sampleY = y - radius; sampleY <= y + radius; sampleY += 1) {
    for (let sampleX = x - radius; sampleX <= x + radius; sampleX += 1) {
      if (sampleX < 0 || sampleY < 0 || sampleX >= imageData.width || sampleY >= imageData.height) continue;
      const index = (sampleY * imageData.width + sampleX) * 4;
      r += imageData.data[index];
      g += imageData.data[index + 1];
      b += imageData.data[index + 2];
      count += 1;
    }
  }

  return { r: r / count, g: g / count, b: b / count };
}

function createMask(imageData, sample, tolerance) {
  const { width, height, data } = imageData;
  const mask = new Uint8ClampedArray(width * height);
  const sampleHsl = rgbToHsl(sample.r, sample.g, sample.b);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      const index = pixel * 4;
      const color = { r: data[index], g: data[index + 1], b: data[index + 2] };
      const hsl = rgbToHsl(color.r, color.g, color.b);
      const rgbDistance = distance(color, sample);
      const hueDistance = Math.min(Math.abs(hsl.h - sampleHsl.h), 360 - Math.abs(hsl.h - sampleHsl.h));
      const lightnessDistance = Math.abs(hsl.l - sampleHsl.l) * 120;
      const tooDark = hsl.l < 0.055;
      const tooBright = hsl.l > 0.95 && hsl.s < 0.12;
      const mostlyTopBackground = y < height * 0.12;
      const likelyTireOrGlass = hsl.l < 0.16 && hsl.s < 0.22;
      const colorScore = rgbDistance * 0.72 + hueDistance * 0.7 + lightnessDistance;
      const threshold = Number(tolerance) * 2.25;

      if (tooDark || tooBright || mostlyTopBackground || likelyTireOrGlass) {
        mask[pixel] = 0;
        continue;
      }

      const confidence = 1 - colorScore / threshold;
      mask[pixel] = clamp(Math.round(confidence * 255), 0, 255);
    }
  }

  return softenMask(mask, width, height);
}

function softenMask(mask, width, height) {
  const softened = new Uint8ClampedArray(mask.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let total = 0;
      let count = 0;
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const px = x + offsetX;
          const py = y + offsetY;
          if (px < 0 || py < 0 || px >= width || py >= height) continue;
          total += mask[py * width + px];
          count += 1;
        }
      }
      softened[y * width + x] = Math.round(total / count);
    }
  }

  return softened;
}

function mixWrappedPixel(original, target, lightness, maskAlpha, finish, pixelIndex) {
  const settings = getFinishSettings(finish);
  const normalizedLight = Math.pow(lightness, settings.contrast);
  const shadowLift = Math.max(0.2, normalizedLight);
  const highlightBoost = Math.max(0, lightness - 0.72) * settings.highlight;
  const grain = settings.grain ? Math.sin(pixelIndex * 12.9898) * settings.grain : 0;

  // Use the selected film color as the new base paint, then reapply image lightness.
  // Only the softened mask edge blends with the original photo.
  const wrapped = {
    r: clamp(target.r * (0.28 + shadowLift * 1.08) + highlightBoost * 255 + grain * 255),
    g: clamp(target.g * (0.28 + shadowLift * 1.08) + highlightBoost * 255 + grain * 255),
    b: clamp(target.b * (0.28 + shadowLift * 1.08) + highlightBoost * 255 + grain * 255),
  };

  const coverage = Math.pow(maskAlpha / 255, 0.38);
  const alpha = Math.min(1, coverage * settings.colorStrength);
  return {
    r: Math.round(original.r * (1 - alpha) + wrapped.r * alpha),
    g: Math.round(original.g * (1 - alpha) + wrapped.g * alpha),
    b: Math.round(original.b * (1 - alpha) + wrapped.b * alpha),
  };
}

function renderSimulation() {
  if (!state.originalData || !state.selectedColor) return;
  const output = new ImageData(
    new Uint8ClampedArray(state.originalData.data),
    state.originalData.width,
    state.originalData.height
  );
  const target = hexToRgb(state.selectedColor.hex);

  for (let i = 0; i < output.data.length; i += 4) {
    const pixel = i / 4;
    const alpha = state.mask?.[pixel] || 0;
    if (!alpha) continue;

    const original = {
      r: state.originalData.data[i],
      g: state.originalData.data[i + 1],
      b: state.originalData.data[i + 2],
    };
    const lightness = (Math.max(original.r, original.g, original.b) + Math.min(original.r, original.g, original.b)) / 510;
    const mixed = mixWrappedPixel(original, target, lightness, alpha, state.selectedColor.finish, pixel);

    output.data[i] = mixed.r;
    output.data[i + 1] = mixed.g;
    output.data[i + 2] = mixed.b;
  }

  context.putImageData(state.mode === "original" ? state.originalData : output, 0, 0);
}

function renderMaskImage() {
  if (!state.mask || !state.originalData) return "";

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = state.originalData.width;
  maskCanvas.height = state.originalData.height;
  const maskContext = maskCanvas.getContext("2d");
  const maskData = maskContext.createImageData(maskCanvas.width, maskCanvas.height);

  for (let i = 0; i < state.mask.length; i += 1) {
    const value = state.mask[i];
    const index = i * 4;
    // Image edit APIs generally use transparent pixels as editable areas.
    maskData.data[index] = 0;
    maskData.data[index + 1] = 0;
    maskData.data[index + 2] = 0;
    maskData.data[index + 3] = 255 - value;
  }

  maskContext.putImageData(maskData, 0, 0);
  return maskCanvas.toDataURL("image/png");
}

function imageDataToDataUrl(imageData) {
  const imageCanvas = document.createElement("canvas");
  imageCanvas.width = imageData.width;
  imageCanvas.height = imageData.height;
  imageCanvas.getContext("2d").putImageData(imageData, 0, 0);
  return imageCanvas.toDataURL("image/png");
}

function setCanvasSize(image) {
  elements.canvas.width = image.naturalWidth;
  elements.canvas.height = image.naturalHeight;
}

function drawOriginal() {
  context.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
  context.drawImage(state.image, 0, 0);
  state.originalData = context.getImageData(0, 0, elements.canvas.width, elements.canvas.height);
}

function autoSamplePoint(imageData) {
  const x = Math.round(imageData.width * 0.52);
  const y = Math.round(imageData.height * 0.62);
  return averageSample(imageData, x, y);
}

function rebuildMask() {
  if (!state.originalData) return;
  state.mask = createMask(state.originalData, state.sample || autoSamplePoint(state.originalData), elements.maskRange.value);
  renderSimulation();
}

function updateSelectedColor(color) {
  state.selectedColor = color;
  document.querySelectorAll(".swatch-button").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.colorId === color.id);
  });
  elements.selectedColorCard.innerHTML = `
    <span style="background:${color.hex}"></span>
    <div>
      <strong>${color.nameZh}</strong>
      <p>${color.nameEn} / ${color.finish}</p>
    </div>
  `;
  renderSimulation();
}

function renderSwatches() {
  elements.swatchGrid.replaceChildren();
  window.EBOOST_WRAP_COLORS.forEach((color) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "swatch-button";
    button.dataset.colorId = color.id;
    button.innerHTML = `
      <span style="background:${color.hex}"></span>
      <strong>${color.nameZh}</strong>
      <small>${color.nameEn}</small>
    `;
    button.addEventListener("click", () => updateSelectedColor(color));
    elements.swatchGrid.append(button);
  });
  updateSelectedColor(state.selectedColor);
}

function validateFile(file) {
  if (!file) return "請選擇一張車輛照片。";
  if (!ACCEPTED_TYPES.includes(file.type)) return "圖片格式需為 JPG、JPEG、PNG 或 WEBP。";
  if (file.size > MAX_FILE_SIZE) return "圖片檔案過大，請先使用 12MB 以內的照片測試。";
  return "";
}

function loadImage(file) {
  const validationError = validateFile(file);
  if (validationError) {
    setStatus(validationError, 0);
    return;
  }

  setStatus("上傳中...", 20);
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const image = new Image();
    image.addEventListener("load", () => {
      setStatus("圖片處理中...", 56);
      state.image = image;
      state.fileName = file.name;
      setCanvasSize(image);
      drawOriginal();
      state.sample = autoSamplePoint(state.originalData);
      rebuildMask();
      elements.emptyPreview.hidden = true;
      elements.previewTitle.textContent = file.name;
      elements.previewHint.textContent = "點選車身烤漆區域，可重新取樣並調整可變色範圍。";
      elements.downloadPreview.disabled = false;
      elements.aiRefine.disabled = false;
      setStatus("模擬器已就緒", 100);
    });
    image.src = reader.result;
  });
  reader.readAsDataURL(file);
}

function updateMode(mode) {
  state.mode = mode;
  elements.showOriginal.classList.toggle("is-active", mode === "original");
  elements.showSimulated.classList.toggle("is-active", mode === "simulated");
  renderSimulation();
}

function handleCanvasSample(event) {
  if (!state.originalData) return;
  const rect = elements.canvas.getBoundingClientRect();
  const x = Math.round(((event.clientX - rect.left) / rect.width) * elements.canvas.width);
  const y = Math.round(((event.clientY - rect.top) / rect.height) * elements.canvas.height);
  state.sample = averageSample(state.originalData, x, y);
  setStatus("已重新取樣車身區域", 78);
  rebuildMask();
  setStatus("模擬器已就緒", 100);
}

function downloadImage() {
  if (!state.originalData) return;
  state.mode = "simulated";
  renderSimulation();

  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  link.download = `EBoost-Wrap-Preview-${state.selectedColor.nameZh}-${date}.jpg`;
  link.href = elements.canvas.toDataURL("image/jpeg", 0.92);
  link.click();
}

async function refineWithAi() {
  if (!state.originalData || !state.selectedColor) return;

  const endpoint = window.EBOOST_AI_CONFIG?.endpoint;
  if (!endpoint) {
    elements.aiMessage.textContent = "AI 精修尚未啟用：請先部署 Cloudflare Worker 並填入 endpoint。";
    return;
  }

  elements.aiRefine.disabled = true;
  elements.aiRefine.textContent = "AI 精修中...";
  elements.aiMessage.textContent = "正在把照片、遮罩與膜色送往 AI 後端處理。";
  setStatus("AI 精修處理中...", 60);

  const originalImage = imageDataToDataUrl(state.originalData);
  const maskImage = renderMaskImage();

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originalImage,
        maskImage,
        color: state.selectedColor,
        fileName: state.fileName,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI 後端回應錯誤：${response.status}`);
    }

    const result = await response.json();
    if (!result.imageUrl && !result.imageBase64) {
      throw new Error("AI 後端沒有回傳圖片。");
    }

    const image = new Image();
    image.addEventListener("load", () => {
      state.image = image;
      setCanvasSize(image);
      drawOriginal();
      state.mask = null;
      state.mode = "original";
      context.drawImage(image, 0, 0);
      elements.aiMessage.textContent = "AI 精修完成，畫面已更新為精修圖。";
      elements.aiRefine.textContent = "再次 AI 精修";
      elements.aiRefine.disabled = false;
      setStatus("AI 精修完成", 100);
    });
    image.src = result.imageUrl || `data:image/png;base64,${result.imageBase64}`;
  } catch (error) {
    elements.aiMessage.textContent = error.message || "AI 精修失敗，請稍後再試。";
    elements.aiRefine.textContent = "AI 精修目前效果";
    elements.aiRefine.disabled = false;
    setStatus("AI 精修失敗", 0);
  }
}

function resetTool() {
  elements.upload.value = "";
  state.image = null;
  state.originalData = null;
  state.mask = null;
  state.sample = null;
  context.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
  elements.emptyPreview.hidden = false;
  elements.previewTitle.textContent = "尚未選擇照片";
  elements.previewHint.textContent = "上傳後可點選車身烤漆區域，微調模擬遮罩。";
  elements.downloadPreview.disabled = true;
  elements.aiRefine.disabled = true;
  elements.aiRefine.textContent = "AI 精修目前效果";
  elements.aiMessage.textContent = "先上傳照片並選擇膜色後，可進行 AI 精修。";
  setStatus("等待上傳照片", 0);
}

elements.chooseImage.addEventListener("click", () => elements.upload.click());
elements.upload.addEventListener("change", () => loadImage(elements.upload.files[0]));
elements.showOriginal.addEventListener("click", () => updateMode("original"));
elements.showSimulated.addEventListener("click", () => updateMode("simulated"));
elements.resetUpload.addEventListener("click", resetTool);
elements.downloadPreview.addEventListener("click", downloadImage);
elements.aiRefine.addEventListener("click", refineWithAi);
elements.maskRange.addEventListener("input", rebuildMask);
elements.canvas.addEventListener("click", handleCanvasSample);

elements.dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  elements.dropzone.classList.add("is-dragging");
});

elements.dropzone.addEventListener("dragleave", () => {
  elements.dropzone.classList.remove("is-dragging");
});

elements.dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  elements.dropzone.classList.remove("is-dragging");
  loadImage(event.dataTransfer.files[0]);
});

renderSwatches();
