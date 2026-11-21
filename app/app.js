/* Leonida Nights Cover Maker — one canvas renders the whole poster, and the
   same render function powers the live preview and the PNG export. Photos are
   read on the user's own machine and never uploaded anywhere. */
"use strict";

const $ = (sel) => document.querySelector(sel);
const canvas = $("#cover");
const ctx = canvas.getContext("2d");

const PANELS = [
  { id: "hero", name: "Hero", rect: [0, 0, 0.58, 0.62] },
  { id: "sideTop", name: "Side top", rect: [0.58, 0, 0.42, 0.31] },
  { id: "sideBottom", name: "Side bottom", rect: [0.58, 0.31, 0.42, 0.31] },
  { id: "strip", name: "Bottom strip", rect: [0, 0.62, 1.0, 0.38] },
];
const CAPTION_FRAC = 0.16; // caption band height, as a fraction of cover height

const GRADES = {
  sunset: {
    label: "Sunset",
    tint: ["rgba(124, 58, 237, 0.28)", "rgba(255, 46, 136, 0.20)", "rgba(255, 150, 50, 0.30)"],
    band: ["#2a0a4d", "#7b1e6e", "#c2275f"],
    sun: ["#ffe9a3", "#ff9a3d"],
    title: "#fff3d6",
  },
  neon: {
    label: "Neon Night",
    tint: ["rgba(34, 211, 238, 0.22)", "rgba(168, 85, 247, 0.26)", "rgba(255, 46, 136, 0.24)"],
    band: ["#05081f", "#1b1046", "#3d1160"],
    sun: ["#a5f3fc", "#e879f9"],
    title: "#e0f7ff",
  },
  noir: {
    label: "Palm Noir",
    tint: ["rgba(10, 10, 26, 0.42)", "rgba(60, 20, 90, 0.30)", "rgba(255, 122, 61, 0.16)"],
    band: ["#0a0616", "#1c0b33", "#3a1445"],
    sun: ["#ffd9a0", "#ff7a3d"],
    title: "#ffe9c4",
  },
  pastel: {
    label: "Vice Pastel",
    tint: ["rgba(255, 183, 213, 0.24)", "rgba(167, 139, 250, 0.20)", "rgba(253, 224, 130, 0.22)"],
    band: ["#5b3a8e", "#c96aa0", "#f2a65e"],
    sun: ["#fff6d8", "#ffb46b"],
    title: "#fffaf0",
  },
};

const state = {
  photos: [], // {id, name, img, url}
  panels: PANELS.map((p) => ({ id: p.id, photoId: null, zoom: 1, ox: 0, oy: 0 })),
  selected: "hero",
  title: "LEONIDA NIGHTS",
  subtitle: "A Vice City story in four frames",
  grade: "sunset",
  titleStyle: "outline",
  exportSize: "1080x1080",
};

let photoSeq = 0;

function addPhoto(img, name, url) {
  const photo = { id: "p" + ++photoSeq, name, img, url: url || img.src };
  state.photos.push(photo);
  buildTray();
  buildPanelEditors();
  return photo;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadSamples() {
  const defs = [
    ["samples/boulevard.jpg", "Boulevard sunset"],
    ["samples/pier.jpg", "Pier sunset"],
    ["samples/palms.jpg", "Palm dusk"],
  ];
  const loaded = [];
  for (const [src, name] of defs) {
    try {
      loaded.push(addPhoto(await loadImage(src), name, src));
    } catch (e) {
      console.warn("sample failed to load:", src);
    }
  }
  if (loaded.length >= 3) {
    state.panels[0].photoId = loaded[0].id; // hero
    state.panels[1].photoId = loaded[1].id; // side top
    state.panels[2].photoId = loaded[2].id; // side bottom
    state.panels[3].photoId = loaded[0].id; // strip, same photo, different crop
    state.panels[3].zoom = 1.5;
    state.panels[3].oy = -60;
    // Assignments happened after the per-photo UI rebuilds, so rebuild once
    // more so the panel photo pickers show the loaded photos.
    buildTray();
    buildPanelEditors();
  }
}

/* ---------- cover rendering ---------- */

function panelRect(p, W, H) {
  const contentH = H * (1 - CAPTION_FRAC);
  const gap = Math.max(3, Math.round(W * 0.005));
  const x = p.rect[0] * W + gap / 2;
  const y = p.rect[1] * contentH + gap / 2;
  const w = p.rect[2] * W - gap;
  const h = p.rect[3] * contentH - gap;
  return [x, y, w, h];
}

function drawPhotoCover(c, img, x, y, w, h, zoom, ox, oy) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(w / iw, h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  c.drawImage(img, x + (w - dw) / 2 + ox, y + (h - dh) / 2 + oy, dw, dh);
}

function drawPalm(c, x, y, s, color) {
  c.strokeStyle = color;
  c.lineCap = "round";
  c.lineWidth = Math.max(2, s * 0.045);
  c.beginPath();
  c.moveTo(x, y);
  c.quadraticCurveTo(x + s * 0.08, y - s * 0.55, x - s * 0.06, y - s);
  c.stroke();
  const tx = x - s * 0.06;
  const ty = y - s;
  c.lineWidth = Math.max(2, s * 0.028);
  for (let a = -155; a <= 155; a += 44) {
    const rad = (a * Math.PI) / 180;
    const mx = tx + Math.cos(rad) * s * 0.34;
    const my = ty + Math.sin(rad) * s * 0.12 - s * 0.05;
    const ex = tx + Math.cos(rad) * s * 0.62;
    const ey = ty + Math.sin(rad) * s * 0.34 + s * 0.18;
    c.beginPath();
    c.moveTo(tx, ty);
    c.quadraticCurveTo(mx, my, ex, ey);
    c.stroke();
  }
}

function drawHalftone(c, x, y, w, h, color) {
  const step = Math.max(10, w / 34);
  for (let gy = y; gy < y + h; gy += step) {
    for (let gx = x; gx < x + w; gx += step) {
      const t = (gx - x) / w;
      const r = step * 0.16 * (0.4 + t);
      c.fillStyle = color;
      c.globalAlpha = 0.16 + 0.14 * t;
      c.beginPath();
      c.arc(gx, gy, r, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.globalAlpha = 1;
}

function renderCover(c, W, H) {
  const grade = GRADES[state.grade];
  c.save();
  c.fillStyle = "#12081f";
  c.fillRect(0, 0, W, H);

  // panels
  for (let i = 0; i < PANELS.length; i++) {
    const p = PANELS[i];
    const st = state.panels[i];
    const [x, y, w, h] = panelRect(p, W, H);
    c.save();
    c.beginPath();
    c.rect(x, y, w, h);
    c.clip();
    const photo = state.photos.find((ph) => ph.id === st.photoId);
    if (photo) {
      drawPhotoCover(c, photo.img, x, y, w, h, st.zoom, st.ox, st.oy);
    } else {
      const g = c.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, "#3d1560");
      g.addColorStop(1, "#12081f");
      c.fillStyle = g;
      c.fillRect(x, y, w, h);
    }
    // sunset grade wash over the photo
    const wash = c.createLinearGradient(x, y, x + w * 0.4, y + h);
    wash.addColorStop(0, grade.tint[0]);
    wash.addColorStop(0.55, grade.tint[1]);
    wash.addColorStop(1, grade.tint[2]);
    c.globalCompositeOperation = "overlay";
    c.fillStyle = wash;
    c.fillRect(x, y, w, h);
    c.globalCompositeOperation = "source-over";
    // panel frame
    c.strokeStyle = "rgba(255,255,255,0.38)";
    c.lineWidth = Math.max(2, W * 0.002);
    c.strokeRect(x, y, w, h);
    c.restore();
  }

  // caption band
  const capY = H * (1 - CAPTION_FRAC);
  const capH = H * CAPTION_FRAC;
  const band = c.createLinearGradient(0, capY, 0, H);
  band.addColorStop(0, grade.band[0]);
  band.addColorStop(0.55, grade.band[1]);
  band.addColorStop(1, grade.band[2]);
  c.fillStyle = band;
  c.fillRect(0, capY, W, capH);
  c.fillStyle = "rgba(255,255,255,0.5)";
  c.fillRect(0, capY, W, Math.max(2, H * 0.003));

  // sun disc, low on the right of the band
  const sunR = capH * 0.85;
  const sunX = W * 0.88;
  const sunY = capY + capH * 0.62;
  const glow = c.createRadialGradient(sunX, sunY, sunR * 0.1, sunX, sunY, sunR * 2.1);
  glow.addColorStop(0, grade.sun[1]);
  glow.addColorStop(1, "rgba(255,122,61,0)");
  c.globalAlpha = 0.55;
  c.fillStyle = glow;
  c.fillRect(sunX - sunR * 2.2, sunY - sunR * 2.2, sunR * 4.4, sunR * 4.4);
  c.globalAlpha = 1;
  const disc = c.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
  disc.addColorStop(0, grade.sun[0]);
  disc.addColorStop(1, grade.sun[1]);
  c.fillStyle = disc;
  c.beginPath();
  c.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  c.fill();
  // retro slices through the sun
  c.fillStyle = grade.band[1];
  for (let k = 0; k < 3; k++) {
    const yy = sunY + sunR * (0.1 + 0.28 * k);
    c.fillRect(sunX - sunR, yy, sunR * 2, Math.max(2, capH * 0.03));
  }

  // palm silhouettes at the band edges + halftone dots
  drawPalm(c, W * 0.035, H - 4, capH * 1.5, "rgba(10,4,22,0.9)");
  drawPalm(c, W * 0.74, H - 4, capH * 1.1, "rgba(10,4,22,0.75)");
  drawHalftone(c, W * 0.42, capY + capH * 0.08, W * 0.3, capH * 0.84, "#ffffff");

  // caption text
  const titleSize = capH * 0.52;
  const subSize = capH * 0.19;
  const tx = W * 0.045;
  const titleBase = capY + capH * 0.56;
  c.textBaseline = "alphabetic";
  try { c.letterSpacing = Math.max(1, W * 0.002) + "px"; } catch (e) { /* older canvas */ }
  c.font = "700 " + Math.round(titleSize) + 'px "Leonida Sans", "Liberation Sans", Arial, sans-serif';
  const title = (state.title || "LEONIDA NIGHTS").toUpperCase();
  if (state.titleStyle === "gradient") {
    const tg = c.createLinearGradient(tx, titleBase - titleSize, tx + W * 0.5, titleBase);
    tg.addColorStop(0, "#ffe9a3");
    tg.addColorStop(0.5, "#ff7a3d");
    tg.addColorStop(1, "#ff2e88");
    c.fillStyle = tg;
    c.fillText(title, tx, titleBase);
    c.strokeStyle = "rgba(20,5,35,0.85)";
    c.lineWidth = Math.max(2, titleSize * 0.04);
    c.strokeText(title, tx, titleBase);
  } else if (state.titleStyle === "glow") {
    c.shadowColor = "#ff2e88";
    c.shadowBlur = titleSize * 0.35;
    c.fillStyle = grade.title;
    c.fillText(title, tx, titleBase);
    c.shadowBlur = 0;
    c.fillText(title, tx, titleBase);
  } else {
    c.fillStyle = "rgba(18,6,32,0.9)";
    c.fillText(title, tx, titleBase);
    c.strokeStyle = grade.title;
    c.lineWidth = Math.max(2, titleSize * 0.055);
    c.lineJoin = "round";
    c.strokeText(title, tx, titleBase);
    c.fillStyle = grade.title;
    c.fillText(title, tx, titleBase);
  }
  c.font = "400 " + Math.round(subSize) + 'px "Leonida Sans", "Liberation Sans", Arial, sans-serif';
  c.fillStyle = "rgba(255,236,190,0.92)";
  c.fillText(state.subtitle || "", tx, capY + capH * 0.86);
  c.restore();
}

function renderPreview() {
  renderCover(ctx, canvas.width, canvas.height);
}

/* ---------- editor UI ---------- */

function buildTray() {
  const tray = $("#tray");
  tray.innerHTML = "";
  if (!state.photos.length) {
    tray.innerHTML = '<span class="tray-empty">No photos yet — add your own, or use the samples.</span>';
    return;
  }
  for (const ph of state.photos) {
    const img = document.createElement("img");
    img.src = ph.url;
    img.alt = ph.name;
    img.title = ph.name + " — click to put it in the selected panel";
    if (state.panels.some((p) => p.photoId === ph.id)) img.classList.add("assigned");
    img.addEventListener("click", () => {
      const panel = state.panels.find((p) => p.id === state.selected);
      if (panel) {
        panel.photoId = ph.id;
        panel.zoom = 1;
        panel.ox = 0;
        panel.oy = 0;
        buildPanelEditors();
        renderPreview();
      }
    });
    tray.appendChild(img);
  }
}

function buildPanelEditors() {
  const wrap = $("#panelEditors");
  wrap.innerHTML = "";
  $("#selName").textContent = "— " + PANELS.find((p) => p.id === state.selected).name;
  for (let i = 0; i < PANELS.length; i++) {
    const p = PANELS[i];
    const st = state.panels[i];
    const box = document.createElement("div");
    box.className = "panel-editor" + (state.selected === p.id ? " selected" : "");
    box.innerHTML =
      "<h3>" + p.name + "</h3>" +
      '<label>Photo <select data-panel="' + p.id + '"></select></label>' +
      '<label>Zoom <span class="zoom-read">' + st.zoom.toFixed(2) + "×</span>" +
      '<input type="range" min="0.6" max="2.6" step="0.05" value="' + st.zoom +
      '" data-zoom="' + p.id + '"></label>' +
      '<button class="btn" data-center="' + p.id + '">Centre photo</button>';
    const select = box.querySelector("select");
    const none = document.createElement("option");
    none.value = "";
    none.textContent = "(empty)";
    select.appendChild(none);
    for (const ph of state.photos) {
      const opt = document.createElement("option");
      opt.value = ph.id;
      opt.textContent = ph.name;
      if (ph.id === st.photoId) opt.selected = true;
      select.appendChild(opt);
    }
    select.addEventListener("change", () => {
      st.photoId = select.value || null;
      st.zoom = 1;
      st.ox = 0;
      st.oy = 0;
      buildTray();
      buildPanelEditors();
      renderPreview();
    });
    const range = box.querySelector("input[type=range]");
    range.addEventListener("input", () => {
      st.zoom = parseFloat(range.value);
      box.querySelector(".zoom-read").textContent = st.zoom.toFixed(2) + "×";
      renderPreview();
    });
    box.querySelector("[data-center]").addEventListener("click", () => {
      st.ox = 0;
      st.oy = 0;
      st.zoom = 1;
      buildPanelEditors();
      renderPreview();
    });
    box.addEventListener("click", (ev) => {
      if (ev.target.tagName === "SELECT" || ev.target.tagName === "INPUT" || ev.target.tagName === "BUTTON") return;
      state.selected = p.id;
      buildPanelEditors();
      renderPreview();
    });
    wrap.appendChild(box);
  }
}

function bindControls() {
  $("#fileInput").addEventListener("change", (ev) => {
    for (const file of ev.target.files || []) addUpload(file);
    ev.target.value = "";
  });
  const dz = $("#dropZone");
  ["dragenter", "dragover"].forEach((evt) =>
    dz.addEventListener(evt, (ev) => { ev.preventDefault(); dz.classList.add("dragging"); }));
  ["dragleave", "drop"].forEach((evt) =>
    dz.addEventListener(evt, (ev) => { ev.preventDefault(); dz.classList.remove("dragging"); }));
  dz.addEventListener("drop", (ev) => {
    for (const file of ev.dataTransfer.files || []) addUpload(file);
  });
  $("#titleInput").addEventListener("input", (ev) => { state.title = ev.target.value; renderPreview(); });
  $("#subInput").addEventListener("input", (ev) => { state.subtitle = ev.target.value; renderPreview(); });
  document.querySelectorAll('input[name="titleStyle"]').forEach((r) =>
    r.addEventListener("change", () => { state.titleStyle = r.value; renderPreview(); }));
  document.querySelectorAll('input[name="exsize"]').forEach((r) =>
    r.addEventListener("change", () => { state.exportSize = r.value; }));
  document.querySelectorAll(".grade-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      document.querySelectorAll(".grade-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.grade = btn.dataset.grade;
      renderPreview();
    }));

  // canvas: click selects a panel, drag pans its photo, wheel zooms it
  let drag = null;
  function toCanvas(ev) {
    const r = canvas.getBoundingClientRect();
    return [(ev.clientX - r.left) * (canvas.width / r.width),
            (ev.clientY - r.top) * (canvas.height / r.height)];
  }
  function hitPanel(cx, cy) {
    for (let i = PANELS.length - 1; i >= 0; i--) {
      const [x, y, w, h] = panelRect(PANELS[i], canvas.width, canvas.height);
      if (cx >= x && cx <= x + w && cy >= y && cy <= y + h) return PANELS[i].id;
    }
    return null;
  }
  canvas.addEventListener("pointerdown", (ev) => {
    const [cx, cy] = toCanvas(ev);
    const hit = hitPanel(cx, cy);
    if (hit) {
      state.selected = hit;
      buildPanelEditors();
      renderPreview();
      drag = { x: cx, y: cy, panel: state.panels.find((p) => p.id === hit) };
      canvas.setPointerCapture(ev.pointerId);
    }
  });
  canvas.addEventListener("pointermove", (ev) => {
    if (!drag) return;
    const [cx, cy] = toCanvas(ev);
    drag.panel.ox += cx - drag.x;
    drag.panel.oy += cy - drag.y;
    drag.x = cx;
    drag.y = cy;
    renderPreview();
  });
  canvas.addEventListener("pointerup", () => { drag = null; });
  canvas.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    const panel = state.panels.find((p) => p.id === state.selected);
    if (!panel) return;
    panel.zoom = Math.min(3, Math.max(0.6, panel.zoom * Math.exp(-ev.deltaY * 0.0012)));
    buildPanelEditors();
    renderPreview();
  }, { passive: false });

  $("#exportBtn").addEventListener("click", exportPng);
}

function addUpload(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => {
    loadImage(reader.result).then((img) => {
      const ph = addPhoto(img, file.name, reader.result);
      const panel = state.panels.find((p) => p.id === state.selected);
      if (panel) {
        panel.photoId = ph.id;
        panel.zoom = 1;
        panel.ox = 0;
        panel.oy = 0;
      }
      buildPanelEditors();
      renderPreview();
    });
  };
  reader.readAsDataURL(file);
}

function exportPng() {
  const [w, h] = state.exportSize.split("x").map(Number);
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  renderCover(off.getContext("2d"), w, h);
  const status = $("#status");
  status.textContent = "Rendering " + w + "×" + h + "…";
  off.toBlob((blob) => {
    if (!blob) {
      status.textContent = "Export failed — please try again.";
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "leonida-nights-" + w + "x" + h + ".png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = "Exported " + w + "×" + h + " PNG (" + Math.round(blob.size / 1024) + " KB).";
  }, "image/png");
}

/* ---------- boot + screenshot mode ---------- */

function applyParams() {
  const q = new URLSearchParams(location.search);
  if (q.get("title")) { state.title = q.get("title"); $("#titleInput").value = state.title; }
  if (q.get("sub")) { state.subtitle = q.get("sub"); $("#subInput").value = state.subtitle; }
  if (q.get("grade") && GRADES[q.get("grade")]) {
    state.grade = q.get("grade");
    document.querySelectorAll(".grade-btn").forEach((b) =>
      b.classList.toggle("active", b.dataset.grade === state.grade));
  }
  if (q.get("style") && ["outline", "gradient", "glow"].includes(q.get("style"))) {
    state.titleStyle = q.get("style");
    const r = document.querySelector('input[name="titleStyle"][value="' + state.titleStyle + '"]');
    if (r) r.checked = true;
  }
  return q;
}

async function boot() {
  const q = applyParams();
  bindControls();
  buildTray();
  buildPanelEditors();
  await loadSamples();
  if (document.fonts && document.fonts.load) {
    try {
      await document.fonts.load('700 40px "Leonida Sans"');
      await document.fonts.load('400 20px "Leonida Sans"');
    } catch (e) { /* fall back to system fonts */ }
  }
  const shot = q.get("shot");
  if (shot === "cover") {
    const w = parseInt(q.get("w") || "1080", 10);
    const h = parseInt(q.get("h") || "1080", 10);
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    document.body.classList.add("shot-cover");
  }
  renderPreview();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => renderPreview());
  }
}

boot();
