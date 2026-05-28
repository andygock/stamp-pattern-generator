const APP_CONFIG = {
  defaults: {
    text: "FU",
    padW: 10,
    padH: 10,
    bleed: 1,
    autoFont: true,
    fontSize: 8,
    tracking: 0,
    lineSpacing: 1.0,
    fontChoice: "roboto",
    textAlign: "center",
    flipOutput: true,
  },
  ranges: {
    textMaxLength: 200,
    padMin: 1,
    padMax: 1000,
    bleedMin: 0,
    bleedMax: 100,
    fontSizeMin: 0.5,
    fontSizeMax: 1000,
    trackingMin: -50,
    trackingMax: 50,
    trackingStep: 0.05,
    lineSpacingMin: 0.5,
    lineSpacingMax: 5,
    lineSpacingStep: 0.1,
  },
  fonts: {
    roboto: {
      label: "Roboto Bold",
      url: "https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.2.8/files/roboto-latin-700-normal.woff",
    },
    opensans: {
      label: "Open Sans Bold",
      url: "https://cdn.jsdelivr.net/npm/@fontsource/open-sans@5.2.1/files/open-sans-latin-700-normal.woff",
    },
    sourceSans3: {
      label: "Source Sans 3 Bold",
      url: "https://cdn.jsdelivr.net/npm/@fontsource/source-sans-3@5.2.6/files/source-sans-3-latin-700-normal.woff",
    },
    robotoSlab: {
      label: "Roboto Slab Bold",
      url: "https://cdn.jsdelivr.net/npm/@fontsource/roboto-slab@5.2.8/files/roboto-slab-latin-700-normal.woff",
    },
    merriweather: {
      label: "Merriweather Bold",
      url: "https://cdn.jsdelivr.net/npm/@fontsource/merriweather@5.2.8/files/merriweather-latin-700-normal.woff",
    },
    lobster: {
      label: "Lobster Regular",
      url: "https://cdn.jsdelivr.net/npm/@fontsource/lobster@5.2.8/files/lobster-latin-400-normal.woff",
    },
    berkshireSwash: {
      label: "Berkshire Swash Regular",
      url: "https://cdn.jsdelivr.net/npm/@fontsource/berkshire-swash@5.2.8/files/berkshire-swash-latin-400-normal.woff",
    },
  },
};

const els = {
  text: document.getElementById("stampText"),
  padW: document.getElementById("padW"),
  padH: document.getElementById("padH"),
  bleed: document.getElementById("bleed"),
  autoFont: document.getElementById("autoFont"),
  fontSize: document.getElementById("fontSize"),
  tracking: document.getElementById("tracking"),
  lineSpacing: document.getElementById("lineSpacing"),
  fontChoice: document.getElementById("fontChoice"),
  textAlign: document.getElementById("textAlign"),
  flipOutput: document.getElementById("flipOutput"),
  preview: document.getElementById("preview"),
  status: document.getElementById("status"),
  dims: document.getElementById("dims"),
  download: document.getElementById("downloadBtn"),
  reset: document.getElementById("resetBtn"),
};

function populateFontChoices() {
  els.fontChoice.replaceChildren();

  for (const [value, font] of Object.entries(APP_CONFIG.fonts)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = font.label;
    els.fontChoice.appendChild(option);
  }
}

function applyDefaults() {
  const { defaults, ranges } = APP_CONFIG;

  els.text.value = defaults.text;
  els.text.maxLength = ranges.textMaxLength;

  els.padW.value = String(defaults.padW);
  els.padH.value = String(defaults.padH);
  els.padW.min = String(ranges.padMin);
  els.padH.min = String(ranges.padMin);
  els.padW.max = String(ranges.padMax);
  els.padH.max = String(ranges.padMax);

  els.bleed.value = String(defaults.bleed);
  els.bleed.min = String(ranges.bleedMin);
  els.bleed.max = String(ranges.bleedMax);

  els.autoFont.checked = defaults.autoFont;

  els.fontSize.value = String(defaults.fontSize);
  els.fontSize.min = String(ranges.fontSizeMin);
  els.fontSize.max = String(ranges.fontSizeMax);

  els.tracking.value = String(defaults.tracking);
  els.tracking.min = String(ranges.trackingMin);
  els.tracking.max = String(ranges.trackingMax);
  els.tracking.step = String(ranges.trackingStep);

  els.lineSpacing.value = String(defaults.lineSpacing);
  els.lineSpacing.min = String(ranges.lineSpacingMin);
  els.lineSpacing.max = String(ranges.lineSpacingMax);
  els.lineSpacing.step = String(ranges.lineSpacingStep);

  els.fontChoice.value = defaults.fontChoice;
  els.textAlign.value = defaults.textAlign;
  els.flipOutput.checked = defaults.flipOutput;
  els.fontSize.disabled = defaults.autoFont;
}

const state = {
  font: null,
  fontName: APP_CONFIG.fonts[APP_CONFIG.defaults.fontChoice].label,
  svg: "",
  metrics: null,
  unionMode: "none",
};

const GEOMETRY_CONFIG = {
  clipperScale: 10000,
  curveTolerance: 0.02,
};

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.classList.toggle("error", isError);
}

function clampNumber(value, fallback, min = -Infinity, max = Infinity) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function pathBounds(pathData) {
  const nums = pathData.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) || [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < nums.length - 1; i += 2) {
    const x = nums[i];
    const y = nums[i + 1];

    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function pathDataFromCommands(commands) {
  const path = new opentype.Path();
  path.commands = commands;
  return path.toPathData(4);
}

function getTextGlyphCommands(
  font,
  text,
  fontSize,
  tracking,
  lineSpacing,
  align = "center",
  originX = 0,
  baselineY = 0,
) {
  const scale = fontSize / font.unitsPerEm;
  const lines = text.split(/\r?\n/);
  const lineHeight = fontSize * lineSpacing;
  const glyphCommands = [];

  const lineWidths = lines.map((line) => {
    let w = 0;
    const glyphs = font.stringToGlyphs(line);
    glyphs.forEach((glyph, index) => {
      w += glyph.advanceWidth * scale;
      if (index < glyphs.length - 1) w += tracking;
    });
    return w;
  });

  const maxWidth = Math.max(...lineWidths, 0);

  lines.forEach((line, lineIndex) => {
    let lineX = originX;
    if (align === "center") {
      lineX += (maxWidth - lineWidths[lineIndex]) / 2;
    } else if (align === "right") {
      lineX += maxWidth - lineWidths[lineIndex];
    }

    let x = lineX;
    let y = baselineY + lineIndex * lineHeight;

    const glyphs = font.stringToGlyphs(line);
    glyphs.forEach((glyph, index) => {
      const glyphPath = glyph.getPath(x, y, fontSize);
      if (glyphPath.commands.length) glyphCommands.push(glyphPath.commands);
      x += glyph.advanceWidth * scale;
      if (index < glyphs.length - 1) x += tracking;
    });
  });

  return glyphCommands;
}

function getTextCommands(...args) {
  return getTextGlyphCommands(...args).flat();
}

function getTextPath(...args) {
  return pathDataFromCommands(getTextCommands(...args));
}

function distanceToLine(point, lineStart, lineEnd) {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
  }

  return Math.abs(
    dy * point.x -
      dx * point.y +
      lineEnd.x * lineStart.y -
      lineEnd.y * lineStart.x,
  ) / Math.sqrt(lenSq);
}

function lerpPoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function flattenQuadratic(p0, p1, p2, points, tolerance, depth = 0) {
  if (depth > 12 || distanceToLine(p1, p0, p2) <= tolerance) {
    points.push(p2);
    return;
  }

  const p01 = lerpPoint(p0, p1);
  const p12 = lerpPoint(p1, p2);
  const p012 = lerpPoint(p01, p12);
  flattenQuadratic(p0, p01, p012, points, tolerance, depth + 1);
  flattenQuadratic(p012, p12, p2, points, tolerance, depth + 1);
}

function flattenCubic(p0, p1, p2, p3, points, tolerance, depth = 0) {
  const flatness = Math.max(
    distanceToLine(p1, p0, p3),
    distanceToLine(p2, p0, p3),
  );

  if (depth > 12 || flatness <= tolerance) {
    points.push(p3);
    return;
  }

  const p01 = lerpPoint(p0, p1);
  const p12 = lerpPoint(p1, p2);
  const p23 = lerpPoint(p2, p3);
  const p012 = lerpPoint(p01, p12);
  const p123 = lerpPoint(p12, p23);
  const p0123 = lerpPoint(p012, p123);
  flattenCubic(p0, p01, p012, p0123, points, tolerance, depth + 1);
  flattenCubic(p0123, p123, p23, p3, points, tolerance, depth + 1);
}

function closeEnough(a, b) {
  return Math.abs(a.x - b.x) < 1e-8 && Math.abs(a.y - b.y) < 1e-8;
}

function intPoint(point) {
  const scale = GEOMETRY_CONFIG.clipperScale;
  return {
    X: Math.round(point.x * scale),
    Y: Math.round(point.y * scale),
  };
}

function commandsToClipperPaths(commands) {
  const paths = [];
  let contour = [];
  let current = { x: 0, y: 0 };
  let start = null;

  const finishContour = () => {
    if (contour.length > 2) {
      if (closeEnough(contour[0], contour[contour.length - 1])) contour.pop();
      if (contour.length > 2) paths.push(contour.map(intPoint));
    }
    contour = [];
    start = null;
  };

  commands.forEach((command) => {
    if (command.type === "M") {
      finishContour();
      current = { x: command.x, y: command.y };
      start = current;
      contour.push(current);
      return;
    }

    if (!start) return;

    if (command.type === "L") {
      current = { x: command.x, y: command.y };
      contour.push(current);
    } else if (command.type === "Q") {
      const next = { x: command.x, y: command.y };
      flattenQuadratic(
        current,
        { x: command.x1, y: command.y1 },
        next,
        contour,
        GEOMETRY_CONFIG.curveTolerance,
      );
      current = next;
    } else if (command.type === "C") {
      const next = { x: command.x, y: command.y };
      flattenCubic(
        current,
        { x: command.x1, y: command.y1 },
        { x: command.x2, y: command.y2 },
        next,
        contour,
        GEOMETRY_CONFIG.curveTolerance,
      );
      current = next;
    } else if (command.type === "Z") {
      if (!closeEnough(current, start)) contour.push(start);
      finishContour();
      current = start || current;
    }
  });

  finishContour();
  return paths;
}

function clipperPathsToPathData(paths) {
  const scale = GEOMETRY_CONFIG.clipperScale;
  return paths
    .filter((path) => path.length > 2)
    .map((path) => {
      const [first, ...rest] = path;
      const commands = [
        `M ${(first.X / scale).toFixed(4)} ${(first.Y / scale).toFixed(4)}`,
        ...rest.map(
          (point) =>
            `L ${(point.X / scale).toFixed(4)} ${(point.Y / scale).toFixed(4)}`,
        ),
        "Z",
      ];
      return commands.join(" ");
    })
    .join(" ");
}

function unionTextPath(commands) {
  const paperPath = unionTextPathWithPaper(commands);
  if (paperPath) {
    state.unionMode = "curve";
    return paperPath;
  }

  const flatCommands = Array.isArray(commands[0]) ? commands.flat() : commands;
  if (!window.ClipperLib) {
    state.unionMode = "unavailable";
    return pathDataFromCommands(flatCommands);
  }

  const paths = commandsToClipperPaths(flatCommands);
  if (!paths.length) return "";

  const union = ClipperLib.Clipper.SimplifyPolygons(
    paths,
    ClipperLib.PolyFillType.pftNonZero,
  );
  state.unionMode = "polygon fallback";
  return clipperPathsToPathData(union);
}

function ensurePaperProject() {
  if (!window.paper) return false;
  if (!paper.project) paper.setup(new paper.Size(1, 1));
  paper.project.clear();
  return true;
}

function paperItemToPathData(item) {
  if (item.pathData) return item.pathData;

  const svg = item.exportSVG({ asString: true, precision: 4 });
  const match = svg.match(/\sd="([^"]+)"/);
  return match ? match[1] : "";
}

function unionTextPathWithPaper(commands) {
  try {
    if (!ensurePaperProject()) return "";

    const glyphPaths = Array.isArray(commands[0]) ? commands : [commands];
    const items = glyphPaths
      .map((glyphCommands) => {
        const pathData = pathDataFromCommands(glyphCommands);
        if (!pathData) return null;

        const item = new paper.CompoundPath({
          pathData,
          insert: false,
        });
        item.fillRule = "nonzero";
        return item;
      })
      .filter(Boolean);

    if (!items.length) return "";

    let union = items.shift();
    items.forEach((item) => {
      const next = union.unite(item, { insert: false });
      union.remove();
      item.remove();
      union = next;
    });

    union.fillRule = "nonzero";
    const pathData = paperItemToPathData(union);
    union.remove();
    return pathData;
  } catch (err) {
    console.warn("Curve union failed; falling back to polygon union.", err);
    return "";
  }
}

function fitFontSize(font, text, padW, padH, tracking, lineSpacing, align) {
  const targetW = padW * 0.8;
  const targetH = padH * 0.8;
  let lo = 0.1;
  let hi = Math.max(padW, padH) * 3;

  // Binary search gives the largest size that still fits inside the usable pad area.
  for (let i = 0; i < 34; i++) {
    const mid = (lo + hi) / 2;
    const pathData = getTextPath(font, text, mid, tracking, lineSpacing, align);
    const bounds = pathBounds(pathData);
    const fits = bounds.width <= targetW && bounds.height <= targetH;

    if (fits) lo = mid;
    else hi = mid;
  }

  return lo;
}

function makeSvg() {
  if (!state.font) return;

  const { defaults, ranges } = APP_CONFIG;
  const text = (els.text.value || defaults.text).trim() || defaults.text;
  const padW = clampNumber(
    els.padW.value,
    defaults.padW,
    ranges.padMin,
    ranges.padMax,
  );
  const padH = clampNumber(
    els.padH.value,
    defaults.padH,
    ranges.padMin,
    ranges.padMax,
  );
  const bleed = clampNumber(
    els.bleed.value,
    defaults.bleed,
    ranges.bleedMin,
    ranges.bleedMax,
  );
  const tracking = clampNumber(
    els.tracking.value,
    defaults.tracking,
    ranges.trackingMin,
    ranges.trackingMax,
  );
  const lineSpacing = clampNumber(
    els.lineSpacing.value,
    defaults.lineSpacing,
    ranges.lineSpacingMin,
    ranges.lineSpacingMax,
  );
  const align = els.textAlign.value || defaults.textAlign;
  const flipOutput = els.flipOutput.checked;

  let fontSize = clampNumber(
    els.fontSize.value,
    Math.min(padW, padH) * 0.8,
    0.1,
    ranges.fontSizeMax,
  );

  if (els.autoFont.checked) {
    fontSize = fitFontSize(
      state.font,
      text,
      padW,
      padH,
      tracking,
      lineSpacing,
      align,
    );
    els.fontSize.value = fontSize.toFixed(2);
  }

  const outerW = padW + bleed * 2;
  const outerH = padH + bleed * 2;
  const outerX = 0;
  const outerY = 0;
  const cutX = bleed;
  const cutY = bleed;
  const centreX = outerW / 2;
  const centreY = outerH / 2;
  const rawTextPath = getTextPath(
    state.font,
    text,
    fontSize,
    tracking,
    lineSpacing,
    align,
  );
  const bounds = pathBounds(rawTextPath);
  const textOriginX = centreX - (bounds.minX + bounds.width / 2);
  const textBaselineY = centreY - (bounds.minY + bounds.height / 2);
  const centredGlyphCommands = getTextGlyphCommands(
    state.font,
    text,
    fontSize,
    tracking,
    lineSpacing,
    align,
    textOriginX,
    textBaselineY,
  );
  const centredTextPath = unionTextPath(centredGlyphCommands);

  const outerRectPath = [
    `M ${outerX.toFixed(4)} ${outerY.toFixed(4)}`,
    `H ${(outerX + outerW).toFixed(4)}`,
    `V ${(outerY + outerH).toFixed(4)}`,
    `H ${outerX.toFixed(4)}`,
    "Z",
  ].join(" ");

  const layerTransform = flipOutput
    ? ` transform="translate(${outerW.toFixed(4)} 0) scale(-1 1)"`
    : "";
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${outerW.toFixed(3)}mm" height="${outerH.toFixed(3)}mm" viewBox="0 0 ${outerW.toFixed(4)} ${outerH.toFixed(4)}">\n  <title>Negative stamp pad pattern ${escapeXml(text)}</title>\n  <desc>Black is engraving. Red hairline rectangle is the normal pad cut outline. Text outlines are unioned before subtraction from the black filled pad. Output is ${flipOutput ? "flipped left-right" : "not flipped"}.</desc>\n  <g id="output"${layerTransform}>\n    <g id="engrave-black" fill="#000000" stroke="none" fill-rule="evenodd">\n      <path d="${outerRectPath} ${centredTextPath}"/>\n    </g>\n    <g id="cut-red" fill="none" stroke="#ff0000" stroke-width="0.05" vector-effect="non-scaling-stroke">\n      <rect x="${cutX.toFixed(4)}" y="${cutY.toFixed(4)}" width="${padW.toFixed(4)}" height="${padH.toFixed(4)}"/>\n    </g>\n  </g>\n</svg>`;

  state.svg = svg;
  state.metrics = { text, padW, padH, bleed, outerW, outerH, fontSize };
  els.preview.innerHTML = svg.replace(
    '<?xml version="1.0" encoding="UTF-8"?>',
    "",
  );
  els.download.disabled = false;
  els.dims.textContent = `pad ${padW.toFixed(2)} × ${padH.toFixed(2)} mm, engrave ${outerW.toFixed(2)} × ${outerH.toFixed(2)} mm`;
  setStatus(
    `Font: ${state.fontName}\nText outlined: yes\nOutline union: ${state.unionMode}\nAuto font size: ${els.autoFont.checked ? "yes" : "no"}\nFont size: ${fontSize.toFixed(2)} mm\nFlip output: ${flipOutput ? "yes" : "no"}\nCut stroke: red 0.05 mm`,
  );
}

async function loadFont() {
  try {
    els.download.disabled = true;
    setStatus("Loading font…");
    const choice = els.fontChoice.value;
    const font =
      APP_CONFIG.fonts[choice] ||
      APP_CONFIG.fonts[APP_CONFIG.defaults.fontChoice];
    const url = font.url;
    state.fontName = font.label;
    state.font = await opentype.load(url);
    makeSvg();
  } catch (err) {
    state.font = null;
    els.download.disabled = true;
    setStatus(
      `Could not load font. Check internet/CDN access.\n${err?.message || err}`,
      true,
    );
  }
}

function downloadSvg() {
  if (!state.svg || !state.metrics) return;

  const blob = new Blob([state.svg], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeText =
    state.metrics.text.replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "") ||
    "stamp";

  a.href = url;
  a.download = `stamp-pad-${safeText}-${state.metrics.padW}x${state.metrics.padH}mm.svg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function resetDefaults() {
  applyDefaults();
  loadFont();
}

[
  els.text,
  els.padW,
  els.padH,
  els.bleed,
  els.fontSize,
  els.tracking,
  els.lineSpacing,
].forEach((el) => el.addEventListener("input", makeSvg));

els.autoFont.addEventListener("change", () => {
  els.fontSize.disabled = els.autoFont.checked;
  makeSvg();
});

els.textAlign.addEventListener("change", makeSvg);
els.flipOutput.addEventListener("change", makeSvg);
els.fontChoice.addEventListener("change", loadFont);
els.download.addEventListener("click", downloadSvg);
els.reset.addEventListener("click", resetDefaults);

populateFontChoices();
applyDefaults();
loadFont();
