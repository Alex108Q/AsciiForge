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
  charset: document.querySelector("#charset"),
  colorModes: document.querySelectorAll("input[name='colorMode']"),
  videoTools: document.querySelector("#videoTools"),
  playPause: document.querySelector("#playPause"),
  restart: document.querySelector("#restart"),
  exportImage: document.querySelector("#exportImage"),
  exportVideo: document.querySelector("#exportVideo"),
  status: document.querySelector("#status"),
};

const charsets = {
  dense: "@%#*+=-:. ",
  blocks: "█▓▒░ ",
  minimal: "#+. ",
  binary: "10 ",
};

const ctx = elements.canvas.getContext("2d");
const sampleCtx = elements.sampleCanvas.getContext("2d", { willReadFrequently: true });

let mediaType = null;
let sourceReady = false;
let animationId = null;
let exportInProgress = false;

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

function updateControlLabels() {
  elements.resolutionValue.textContent = `${elements.resolution.value} cols`;
  elements.fontSizeValue.textContent = `${elements.fontSize.value} px`;
  elements.fpsValue.textContent = `${elements.fps.value} fps`;
}

function setUiForMedia(type, fileName) {
  mediaType = type;
  sourceReady = true;
  elements.dropZone.classList.add("is-hidden");
  elements.fileBadge.textContent = fileName;
  elements.videoTools.hidden = type !== "video";
  elements.exportImage.disabled = false;
  elements.exportVideo.disabled = type !== "video";
  elements.playPause.textContent = "Play";
  setStatus(type === "video" ? "Video loaded. Preview a frame or export ASCII video." : "Image loaded. Adjust settings and export.");
}

function clearObjectUrls() {
  if (elements.image.src.startsWith("blob:")) URL.revokeObjectURL(elements.image.src);
  if (elements.video.src.startsWith("blob:")) URL.revokeObjectURL(elements.video.src);
}

function handleFile(file) {
  if (!file) return;
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    setStatus("Please choose an image or video file.", true);
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
      setStatus("Image export failed.", true);
      return;
    }
    downloadBlob(blob, "ascii-image.png");
    setStatus("ASCII image exported as PNG.");
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
    setStatus("This browser cannot export recorded canvas video.", true);
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
    setStatus(`Exporting frame ${Math.min(frame + 1, frameCount + 1)} of ${frameCount + 1}...`);
    await wait(1000 / settings.fps);
  }

  recorder.stop();
  await finished;
  downloadBlob(new Blob(chunks, { type: "video/webm" }), "ascii-video.webm");
  exportInProgress = false;
  elements.exportVideo.disabled = false;
  elements.exportImage.disabled = false;
  setStatus("ASCII video exported as WebM.");
}

elements.fileInput.addEventListener("change", (event) => handleFile(event.target.files[0]));

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
    elements.playPause.textContent = "Pause";
    loopPreview();
  } else {
    elements.video.pause();
    elements.playPause.textContent = "Play";
  }
});

elements.restart.addEventListener("click", async () => {
  if (mediaType !== "video") return;
  elements.video.pause();
  elements.playPause.textContent = "Play";
  await seekVideo(0);
  renderAscii(elements.video);
});

elements.exportImage.addEventListener("click", exportImage);
elements.exportVideo.addEventListener("click", exportVideo);

updateControlLabels();
drawBackground(getSettings());
