const elements = {
  fileInput: document.querySelector("#fileInput"),
  dropZone: document.querySelector("#dropZone"),
  fileBadge: document.querySelector("#fileBadge"),
  canvas: document.querySelector("#asciiCanvas"),
  sampleCanvas: document.querySelector("#sampleCanvas"),
  image: document.querySelector("#sourceImage"),
  video: document.querySelector("#sourceVideo"),
  resolution: document.querySelector("#resolution"),
  resolutionValue: document.querySelector("#resolutionValue"),
  fontSize: document.querySelector("#fontSize"),
  fontSizeValue: document.querySelector("#fontSizeValue"),
  fps: document.querySelector("#fps"),
  fpsValue: document.querySelector("#fpsValue"),
  language: document.querySelector("#language"),
  charset: document.querySelector("#charset"),
  colorModes: document.querySelectorAll("input[name='colorMode']"),
  videoTools: document.querySelector("#videoTools"),
  playPause: document.querySelector("#playPause"),
  restart: document.querySelector("#restart"),
  exportImage: document.querySelector("#exportImage"),
  exportVideo: document.querySelector("#exportVideo"),
  status: document.querySelector("#status"),
};

const translations = {
  en: {
    appLabel: "ASCII generator",
    previewLabel: "ASCII preview",
    controlsLabel: "Export controls",
    dropTitle: "Drop an image or video",
    dropSubtitle: "or choose a file to begin",
    headline: "ASCII image and video exporter",
    noFile: "No file",
    language: "Language",
    chooseMedia: "Choose media",
    resolution: "Resolution",
    glyphSize: "Glyph size",
    exportFps: "Export FPS",
    color: "Color",
    colorModeColor: "Color",
    colorModeMono: "Mono",
    colorModeInvert: "Invert",
    characters: "Characters",
    charsetDense: "Dense: @%#*+=-:. ",
    charsetBlocks: "Blocks: []{} ",
    charsetMinimal: "Minimal: #+. ",
    charsetBinary: "Binary: 10 ",
    play: "Play",
    pause: "Pause",
    restart: "Restart",
    exportImage: "Export image",
    exportVideo: "Export video",
    ready: "Ready for an image or video.",
    imageLoaded: "Image loaded. Adjust settings and export.",
    videoLoaded: "Video loaded. Preview a frame or export ASCII video.",
    invalidFile: "Please choose an image or video file.",
    imageExportFailed: "Image export failed.",
    imageExported: "ASCII image exported as PNG.",
    recorderUnsupported: "This browser cannot export recorded canvas video.",
    exportingFrame: "Exporting frame {current} of {total}...",
    videoExported: "ASCII video exported as WebM.",
    columnsUnit: "cols",
    pixelsUnit: "px",
    fpsUnit: "fps",
  },
  de: {
    appLabel: "ASCII-Generator",
    previewLabel: "ASCII-Vorschau",
    controlsLabel: "Export-Einstellungen",
    dropTitle: "Bild oder Video hier ablegen",
    dropSubtitle: "oder Datei auswaehlen",
    headline: "ASCII-Bild- und Video-Exporter",
    noFile: "Keine Datei",
    language: "Sprache",
    chooseMedia: "Datei auswaehlen",
    resolution: "Aufloesung",
    glyphSize: "Zeichengroesse",
    exportFps: "Export-FPS",
    color: "Farbe",
    colorModeColor: "Farbe",
    colorModeMono: "Mono",
    colorModeInvert: "Invertiert",
    characters: "Zeichen",
    charsetDense: "Dicht: @%#*+=-:. ",
    charsetBlocks: "Bloecke: []{} ",
    charsetMinimal: "Minimal: #+. ",
    charsetBinary: "Binaer: 10 ",
    play: "Abspielen",
    pause: "Pause",
    restart: "Neu starten",
    exportImage: "Bild exportieren",
    exportVideo: "Video exportieren",
    ready: "Bereit fuer ein Bild oder Video.",
    imageLoaded: "Bild geladen. Einstellungen anpassen und exportieren.",
    videoLoaded: "Video geladen. Vorschau ansehen oder ASCII-Video exportieren.",
    invalidFile: "Bitte ein Bild oder Video auswaehlen.",
    imageExportFailed: "Bildexport fehlgeschlagen.",
    imageExported: "ASCII-Bild als PNG exportiert.",
    recorderUnsupported: "Dieser Browser kann kein Canvas-Video exportieren.",
    exportingFrame: "Exportiere Frame {current} von {total}...",
    videoExported: "ASCII-Video als WebM exportiert.",
    columnsUnit: "Sp.",
    pixelsUnit: "px",
    fpsUnit: "fps",
  },
};

const charsets = {
  dense: "@%#*+=-:. ",
  blocks: "[]{} ",
  minimal: "#+. ",
  binary: "10 ",
};

const ctx = elements.canvas.getContext("2d");
const sampleCtx = elements.sampleCanvas.getContext("2d", { willReadFrequently: true });

let mediaType = null;
let sourceReady = false;
let animationId = null;
let exportInProgress = false;
let activeStatusKey = "ready";
let activeStatusValues = {};
let currentLanguage = localStorage.getItem("asciiforge-language") || navigator.language.slice(0, 2);

if (!translations[currentLanguage]) {
  currentLanguage = "en";
}

function t(key, values = {}) {
  const template = translations[currentLanguage]?.[key] || translations.en[key] || key;
  return Object.entries(values).reduce(
    (message, [name, value]) => message.replaceAll(`{${name}}`, value),
    template
  );
}

function applyLanguage() {
  document.documentElement.lang = currentLanguage;
  elements.language.value = currentLanguage;

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-attr]").forEach((node) => {
    node.dataset.i18nAttr.split(",").forEach((pair) => {
      const [attribute, key] = pair.split(":");
      node.setAttribute(attribute.trim(), t(key.trim()));
    });
  });

  if (!sourceReady) {
    elements.fileBadge.textContent = t("noFile");
  }

  elements.playPause.textContent = elements.video.paused ? t("play") : t("pause");
  updateControlLabels();
  setStatusKey(activeStatusKey, activeStatusValues, elements.status.classList.contains("error"));
}

function getSettings() {
  return {
    columns: Number(elements.resolution.value),
    fontSize: Number(elements.fontSize.value),
    fps: Number(elements.fps.value),
    charset: charsets[elements.charset.value],
    colorMode: document.querySelector("input[name='colorMode']:checked").value,
  };
}

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("error", isError);
}

function setStatusKey(key, values = {}, isError = false) {
  activeStatusKey = key;
  activeStatusValues = values;
  setStatus(t(key, values), isError);
}

function updateControlLabels() {
  elements.resolutionValue.textContent = `${elements.resolution.value} ${t("columnsUnit")}`;
  elements.fontSizeValue.textContent = `${elements.fontSize.value} ${t("pixelsUnit")}`;
  elements.fpsValue.textContent = `${elements.fps.value} ${t("fpsUnit")}`;
}

function setUiForMedia(type, fileName) {
  mediaType = type;
  sourceReady = true;
  elements.dropZone.classList.add("is-hidden");
  elements.fileBadge.textContent = fileName;
  elements.videoTools.hidden = type !== "video";
  elements.exportImage.disabled = false;
  elements.exportVideo.disabled = type !== "video";
  elements.playPause.textContent = t("play");
  setStatusKey(type === "video" ? "videoLoaded" : "imageLoaded");
}

function clearObjectUrls() {
  if (elements.image.src.startsWith("blob:")) URL.revokeObjectURL(elements.image.src);
  if (elements.video.src.startsWith("blob:")) URL.revokeObjectURL(elements.video.src);
}

function handleFile(file) {
  if (!file) return;
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    setStatusKey("invalidFile", {}, true);
    return;
  }

  cancelAnimationFrame(animationId);
  clearObjectUrls();
  const url = URL.createObjectURL(file);

  if (file.type.startsWith("image/")) {
    elements.video.pause();
    elements.image.onload = () => {
      setUiForMedia("image", file.name);
      renderAscii(elements.image);
    };
    elements.image.src = url;
    return;
  }

  elements.video.onloadedmetadata = () => {
    elements.video.currentTime = 0;
  };
  elements.video.onseeked = null;
  elements.video.addEventListener("seeked", function onFirstSeek() {
    elements.video.removeEventListener("seeked", onFirstSeek);
    setUiForMedia("video", file.name);
    renderAscii(elements.video);
  });
  elements.video.src = url;
  elements.video.load();
}

function sourceDimensions(source) {
  return {
    width: source.videoWidth || source.naturalWidth || source.width,
    height: source.videoHeight || source.naturalHeight || source.height,
  };
}

function prepareCanvases(source, settings) {
  const { width, height } = sourceDimensions(source);
  const charAspect = 0.55;
  const rows = Math.max(1, Math.round((settings.columns * height * charAspect) / width));
  const canvasWidth = settings.columns * settings.fontSize * charAspect;
  const canvasHeight = rows * settings.fontSize;

  elements.sampleCanvas.width = settings.columns;
  elements.sampleCanvas.height = rows;
  elements.canvas.width = Math.round(canvasWidth);
  elements.canvas.height = Math.round(canvasHeight);

  sampleCtx.drawImage(source, 0, 0, settings.columns, rows);
  return { rows };
}

function drawBackground(settings) {
  ctx.fillStyle = settings.colorMode === "invert" ? "#f5f5f0" : "#070807";
  ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);
}

function glyphForBrightness(brightness, settings) {
  const index = Math.min(
    settings.charset.length - 1,
    Math.max(0, Math.floor(brightness * settings.charset.length))
  );
  return settings.charset[index];
}

function renderAscii(source) {
  if (!sourceReady && mediaType !== "video") return;

  const settings = getSettings();
  const { rows } = prepareCanvases(source, settings);
  const imageData = sampleCtx.getImageData(0, 0, settings.columns, rows).data;
  const charAspect = 0.55;

  drawBackground(settings);
  ctx.font = `${settings.fontSize}px "Cascadia Mono", Consolas, monospace`;
  ctx.textBaseline = "top";

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < settings.columns; col += 1) {
      const index = (row * settings.columns + col) * 4;
      const red = imageData[index];
      const green = imageData[index + 1];
      const blue = imageData[index + 2];
      const alpha = imageData[index + 3] / 255;
      const brightness = (red * 0.299 + green * 0.587 + blue * 0.114) / 255;
      const glyph = glyphForBrightness(brightness, settings);

      if (settings.colorMode === "color") {
        ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
      } else {
        const tone =
          settings.colorMode === "invert"
            ? Math.round(20 + brightness * 80)
            : Math.round(210 + brightness * 45);
        ctx.fillStyle = `rgb(${tone}, ${tone}, ${tone})`;
      }

      ctx.fillText(glyph, col * settings.fontSize * charAspect, row * settings.fontSize);
    }
  }
}

function loopPreview() {
  if (mediaType === "video" && !elements.video.paused && !exportInProgress) {
    renderAscii(elements.video);
    animationId = requestAnimationFrame(loopPreview);
  }
}

function downloadBlob(blob, name) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function exportImage() {
  if (!sourceReady) return;
  const source = mediaType === "video" ? elements.video : elements.image;
  renderAscii(source);
  elements.canvas.toBlob((blob) => {
    if (!blob) {
      setStatusKey("imageExportFailed", {}, true);
      return;
    }
    downloadBlob(blob, "ascii-image.png");
    setStatusKey("imageExported");
  }, "image/png");
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function seekVideo(time) {
  return new Promise((resolve) => {
    const targetTime = Math.min(time, elements.video.duration || time);
    if (Math.abs(elements.video.currentTime - targetTime) < 0.01) {
      resolve();
      return;
    }

    const done = () => {
      elements.video.removeEventListener("seeked", done);
      resolve();
    };
    elements.video.addEventListener("seeked", done);
    elements.video.currentTime = targetTime;
  });
}

async function exportVideo() {
  if (mediaType !== "video" || exportInProgress) return;
  if (!("MediaRecorder" in window)) {
    setStatusKey("recorderUnsupported", {}, true);
    return;
  }

  exportInProgress = true;
  elements.exportVideo.disabled = true;
  elements.exportImage.disabled = true;
  elements.video.pause();

  const settings = getSettings();
  const stream = elements.canvas.captureStream(settings.fps);
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks = [];

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const finished = new Promise((resolve) => {
    recorder.onstop = resolve;
  });

  recorder.start();
  const duration = elements.video.duration || 0;
  const frameCount = Math.max(1, Math.floor(duration * settings.fps));

  for (let frame = 0; frame <= frameCount; frame += 1) {
    const time = Math.min(duration, frame / settings.fps);
    await seekVideo(time);
    renderAscii(elements.video);
    setStatusKey("exportingFrame", {
      current: Math.min(frame + 1, frameCount + 1),
      total: frameCount + 1,
    });
    await wait(1000 / settings.fps);
  }

  recorder.stop();
  await finished;
  downloadBlob(new Blob(chunks, { type: "video/webm" }), "ascii-video.webm");
  exportInProgress = false;
  elements.exportVideo.disabled = false;
  elements.exportImage.disabled = false;
  setStatusKey("videoExported");
}

elements.fileInput.addEventListener("change", (event) => handleFile(event.target.files[0]));

elements.language.addEventListener("change", () => {
  currentLanguage = elements.language.value;
  localStorage.setItem("asciiforge-language", currentLanguage);
  applyLanguage();
});

document.addEventListener("dragover", (event) => {
  event.preventDefault();
});

document.addEventListener("drop", (event) => {
  event.preventDefault();
  handleFile(event.dataTransfer.files[0]);
});

[elements.resolution, elements.fontSize, elements.fps].forEach((input) => {
  input.addEventListener("input", () => {
    updateControlLabels();
    if (sourceReady) renderAscii(mediaType === "video" ? elements.video : elements.image);
  });
});

[elements.charset, ...elements.colorModes].forEach((control) => {
  control.addEventListener("change", () => {
    if (sourceReady) renderAscii(mediaType === "video" ? elements.video : elements.image);
  });
});

elements.playPause.addEventListener("click", async () => {
  if (mediaType !== "video") return;
  if (elements.video.paused) {
    await elements.video.play();
    elements.playPause.textContent = t("pause");
    loopPreview();
  } else {
    elements.video.pause();
    elements.playPause.textContent = t("play");
  }
});

elements.restart.addEventListener("click", async () => {
  if (mediaType !== "video") return;
  elements.video.pause();
  elements.playPause.textContent = t("play");
  await seekVideo(0);
  renderAscii(elements.video);
});

elements.exportImage.addEventListener("click", exportImage);
elements.exportVideo.addEventListener("click", exportVideo);

applyLanguage();
drawBackground(getSettings());
