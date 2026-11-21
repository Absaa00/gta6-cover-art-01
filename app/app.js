// Leonida Nights Cover Maker — one render function draws the preview and every export.
// Vanilla JS, no libraries, no network. Photos are read on the user's own machine.
'use strict';

const TITLE_FONT = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
const BODY_FONT = '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

const PANEL_DEFS = [
  { key: 'hero', name: 'Hero panel', rect: [0, 0, 0.64, 0.71] },
  { key: 'sideTop', name: 'Side panel · top', rect: [0.65, 0, 0.35, 0.35] },
  { key: 'sideBot', name: 'Side panel · bottom', rect: [0.65, 0.36, 0.35, 0.35] },
  { key: 'strip', name: 'Bottom strip', rect: [0, 0.72, 1, 0.11] },
];
const CAPTION_TOP = 0.84; // caption band starts at 84% of the height

const GRADES = {
  sunset: {
    band: ['#2b0a4d', '#7b2ff7', '#ff4d8d', '#ff7a2f', '#ffc44d'],
    tint: 'rgba(255, 77, 141, 0.16)', tintMode: 'overlay',
    shadow: 'rgba(20, 8, 60, 0.28)', shadowMode: 'multiply',
    accent: '#ffc44d', titleFrom: '#fff3c4', titleTo: '#ff7a2f',
  },
  neon: {
    band: ['#05001a', '#1b0a4d', '#a4138f', '#ff2fd6', '#0affef'],
    tint: 'rgba(255, 47, 214, 0.20)', tintMode: 'overlay',
    shadow: 'rgba(0, 8, 40, 0.30)', shadowMode: 'multiply',
    accent: '#0affef', titleFrom: '#e6fbff', titleTo: '#ff2fd6',
  },
  noir: {
    band: ['#000000', '#141428', '#3d3d5c', '#8a5a2e', '#ff9a3d'],
    tint: 'rgba(0, 0, 0, 0.22)', tintMode: 'multiply',
    shadow: 'rgba(0, 0, 0, 0.35)', shadowMode: 'multiply',
    accent: '#ff9a3d', titleFrom: '#ffffff', titleTo: '#ff9a3d',
  },
  pastel: {
    band: ['#3d2a5e', '#c86dd7', '#ffb3d9', '#ffd6a5', '#9ff0e0'],
    tint: 'rgba(255, 179, 217, 0.18)', tintMode: 'soft-light',
    shadow: 'rgba(61, 42, 94, 0.22)', shadowMode: 'multiply',
    accent: '#9ff0e0', titleFrom: '#ffffff', titleTo: '#ffb3d9',
  },
};

const SAMPLE_FILES = ['samples/sunset-skyline.jpg', 'samples/palms-beach.jpg', 'samples/neon-street.jpg'];

const state = {
  title: 'LEONIDA',
  subtitle: 'NIGHTS IN VICE CITY',
  grade: 'sunset',
  titleStyle: 'gradient',
  photos: [], // { name, img }
  panels: PANEL_DEFS.map(() => ({ photo: 0, zoom: 1, x: 0.5, y: 0.5 })),
  selected: 0,
};
state.panels[1].photo = 1;
state.panels[2].photo = 2;
state.panels[3].photo = 1;

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');

function panelRects(w, h) {
  return PANEL_DEFS.map((d) => ({
    key: d.key,
    name: d.name,
    x: d.rect[0] * w,
    y: d.rect[1] * h,
    w: d.rect[2] * w,
    h: d.rect[3] * h,
  }));
}

function drawCoverPhoto(c, img, rect, panel) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(rect.w / iw, rect.h / ih) * panel.zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = rect.x + rect.w / 2 - dw * panel.x;
  const dy = rect.y + rect.h / 2 - dh * panel.y;
  c.save();
  c.beginPath();
  c.rect(rect.x, rect.y, rect.w, rect.h);
  c.clip();
  c.drawImage(img, dx, dy, dw, dh);
  c.restore();
}

function gradePhoto(c, rect, grade) {
  c.save();
  c.beginPath();
  c.rect(rect.x, rect.y, rect.w, rect.h);
  c.clip();
  c.globalCompositeOperation = grade.tintMode;
  c.fillStyle = grade.tint;
  c.fillRect(rect.x, rect.y, rect.w, rect.h);
  c.globalCompositeOperation = grade.shadowMode;
  c.fillStyle = grade.shadow;
  c.fillRect(rect.x, rect.y, rect.w, rect.h);
  c.restore();
  // thin gold inner frame
  c.save();
  c.strokeStyle = 'rgba(255, 196, 77, 0.85)';
  c.lineWidth = Math.max(2, rect.w * 0.004);
  c.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
  c.restore();
}

function drawPalm(c, x, y, s, lean) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.rotate(lean);
  c.strokeStyle = '#160a2e';
  c.fillStyle = '#160a2e';
  c.lineWidth = 7;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(6, -55, -4, -105);
  c.stroke();
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * (0.08 + i * 0.14);
    const len = 52 - Math.abs(i - 3) * 7;
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(-4, -105);
    c.quadraticCurveTo(-4 + Math.cos(a) * len * 0.6, -105 + Math.sin(a) * len * 0.6 - 12,
      -4 + Math.cos(a) * len, -105 + Math.sin(a) * len + 16);
    c.stroke();
  }
  c.restore();
}

function drawHalftone(c, x, y, w, h, color) {
  const step = Math.max(9, w * 0.014);
  c.save();
  c.fillStyle = color;
  for (let row = 0; row * step < h; row++) {
    for (let col = 0; col * step < w; col++) {
      const px = x + col * step + (row % 2 ? step / 2 : 0);
      const py = y + row * step;
      const fade = 1 - row * step / h;
      if (fade <= 0) break;
      c.globalAlpha = 0.28 * fade;
      c.beginPath();
      c.arc(px, py, Math.max(1.2, step * 0.16 * fade + 0.6), 0, Math.PI * 2);
      c.fill();
    }
  }
  c.restore();
}

function fitTitleFont(c, text, maxWidth, startSize) {
  let size = startSize;
  c.font = `900 ${size}px ${TITLE_FONT}`;
  while (size > 24 && c.measureText(text).width > maxWidth) {
    size -= 4;
    c.font = `900 ${size}px ${TITLE_FONT}`;
  }
  return size;
}

function drawTitle(c, w, h, grade) {
  const bandY = h * CAPTION_TOP;
  const bandH = h - bandY;
  const grad = c.createLinearGradient(0, bandY, 0, h);
  grade.band.forEach((col, i) => grad.addColorStop(i / (grade.band.length - 1), col));
  c.fillStyle = grad;
  c.fillRect(0, bandY, w, bandH);

  // sunset disc behind the title
  const sunR = bandH * 0.42;
  const sun = c.createRadialGradient(w / 2, bandY + bandH * 0.52, 2, w / 2, bandY + bandH * 0.52, sunR * 1.9);
  sun.addColorStop(0, 'rgba(255, 236, 170, 0.95)');
  sun.addColorStop(0.55, 'rgba(255, 150, 80, 0.55)');
  sun.addColorStop(1, 'rgba(255, 77, 141, 0)');
  c.fillStyle = sun;
  c.beginPath();
  c.arc(w / 2, bandY + bandH * 0.52, sunR * 1.9, 0, Math.PI * 2);
  c.fill();

  // palm silhouettes + halftone dots
  drawPalm(c, w * 0.06, h - 4, bandH / 130, 0.10);
  drawPalm(c, w * 0.94, h - 4, bandH / 150, -0.12);
  drawHalftone(c, w * 0.72, bandY + bandH * 0.08, w * 0.26, bandH * 0.5, '#ffffff');

  // title text
  const title = (state.title || 'LEONIDA').toUpperCase();
  const sub = (state.subtitle || '').toUpperCase();
  const maxW = w * 0.9;
  // Wide exports have a short caption band: cap the title by band height too,
  // so the lettering never clips at the bottom edge.
  const size = Math.min(fitTitleFont(c, title, maxW, Math.round(w * 0.115)), Math.round(bandH * 0.56));
  const cx = w / 2;
  const titleY = bandY + bandH * 0.44;
  c.save();
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `900 ${size}px ${TITLE_FONT}`;
  if (state.titleStyle === 'outline') {
    c.lineWidth = Math.max(3, size * 0.09);
    c.strokeStyle = '#160a2e';
    c.strokeText(title, cx, titleY);
    c.lineWidth = Math.max(1.5, size * 0.03);
    c.strokeStyle = '#ffffff';
    c.strokeText(title, cx, titleY);
    c.fillStyle = 'rgba(255,255,255,0.92)';
    c.fillText(title, cx, titleY);
  } else if (state.titleStyle === 'glow') {
    c.shadowColor = '#ff2fd6';
    c.shadowBlur = size * 0.35;
    c.fillStyle = '#ffffff';
    c.fillText(title, cx, titleY);
    c.shadowBlur = 0;
    c.fillStyle = grade.titleTo;
    c.globalAlpha = 0.35;
    c.fillText(title, cx, titleY + size * 0.04);
    c.globalAlpha = 1;
  } else {
    const tg = c.createLinearGradient(0, titleY - size * 0.5, 0, titleY + size * 0.5);
    tg.addColorStop(0, grade.titleFrom);
    tg.addColorStop(1, grade.titleTo);
    c.shadowColor = 'rgba(22, 10, 46, 0.85)';
    c.shadowBlur = size * 0.08;
    c.shadowOffsetY = size * 0.03;
    c.fillStyle = tg;
    c.fillText(title, cx, titleY);
    c.shadowBlur = 0;
    c.shadowOffsetY = 0;
  }
  c.restore();

  // subtitle, letterspaced
  if (sub) {
    const subSize = Math.max(12, Math.round(w * 0.026));
    c.save();
    c.font = `700 ${subSize}px ${BODY_FONT}`;
    c.fillStyle = 'rgba(255, 255, 255, 0.95)';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const gap = subSize * 0.42;
    const widths = [...sub].map((ch) => c.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + gap * (sub.length - 1);
    let sx = cx - total / 2;
    const sy = bandY + bandH * 0.86;
    [...sub].forEach((ch, i) => {
      c.fillText(ch, sx + widths[i] / 2, sy);
      sx += widths[i] + gap;
    });
    c.restore();
  }

  // thin accent rule above the band
  c.fillStyle = grade.accent;
  c.fillRect(0, bandY - Math.max(2, h * 0.004), w, Math.max(2, h * 0.004));
}

// The one render function: preview and every export share it.
function renderCover(c, w, h) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  c.clearRect(0, 0, w, h);
  c.fillStyle = '#12081f';
  c.fillRect(0, 0, w, h);
  const rects = panelRects(w, h);
  rects.forEach((rect, i) => {
    const panel = state.panels[i];
    const photo = state.photos[panel.photo];
    if (photo && photo.img.complete && photo.img.naturalWidth) {
      drawCoverPhoto(c, photo.img, rect, panel);
    } else {
      // empty panel placeholder: sunset gradient + label
      const g = c.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
      g.addColorStop(0, '#3d1a6e');
      g.addColorStop(1, '#ff7a2f');
      c.fillStyle = g;
      c.fillRect(rect.x, rect.y, rect.w, rect.h);
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.font = `700 ${Math.max(13, Math.round(rect.w * 0.045))}px ${BODY_FONT}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }
    gradePhoto(c, rect, grade);
  });
  drawTitle(c, w, h, grade);
}

function renderPreview() {
  renderCover(ctx, canvas.width, canvas.height);
}

// ---- export ----
function exportCover(w, h, name) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  renderCover(off.getContext('2d'), w, h);
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}

// ---- photos ----
function addPhotoFiles(files) {
  let added = 0;
  [...files].forEach((file) => {
    if (!file.type.startsWith('image/')) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { renderPreview(); };
    img.src = url;
    state.photos.push({ name: file.name, img });
    added++;
  });
  if (added) refreshPhotoSelect();
  renderPreview();
}

function loadSamples() {
  SAMPLE_FILES.forEach((src, i) => {
    const img = new Image();
    img.onload = () => { renderPreview(); };
    img.src = src;
    state.photos[i] = { name: src.split('/').pop(), img };
  });
  refreshPhotoSelect();
}

// ---- editor UI ----
const titleInput = document.getElementById('titleInput');
const subtitleInput = document.getElementById('subtitleInput');
const photoSelect = document.getElementById('photoSelect');
const zoomSlider = document.getElementById('zoomSlider');
const zoomVal = document.getElementById('zoomVal');
const panelName = document.getElementById('panelName');
const panelTabs = document.getElementById('panelTabs');

function refreshPhotoSelect() {
  const cur = state.panels[state.selected].photo;
  photoSelect.innerHTML = '';
  state.photos.forEach((p, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = `${i + 1} · ${p.name}`;
    photoSelect.appendChild(o);
  });
  photoSelect.value = String(Math.min(cur, state.photos.length - 1));
}

function refreshPanelUI() {
  const panel = state.panels[state.selected];
  panelName.textContent = PANEL_DEFS[state.selected].name;
  zoomSlider.value = String(Math.round(panel.zoom * 100));
  zoomVal.textContent = `${Math.round(panel.zoom * 100)}%`;
  refreshPhotoSelect();
  [...panelTabs.children].forEach((b, i) => b.classList.toggle('active', i === state.selected));
}

PANEL_DEFS.forEach((d, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = d.name;
  b.addEventListener('click', () => { state.selected = i; refreshPanelUI(); renderPreview(); });
  panelTabs.appendChild(b);
});

titleInput.addEventListener('input', () => { state.title = titleInput.value; renderPreview(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; renderPreview(); });

document.getElementById('titleStyles').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-style]');
  if (!btn) return;
  state.titleStyle = btn.dataset.style;
  [...e.currentTarget.children].forEach((b) => b.classList.toggle('active', b === btn));
  renderPreview();
});

document.getElementById('grades').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-grade]');
  if (!btn) return;
  state.grade = btn.dataset.grade;
  [...e.currentTarget.children].forEach((b) => b.classList.toggle('active', b === btn));
  renderPreview();
});

photoSelect.addEventListener('change', () => {
  state.panels[state.selected].photo = Number(photoSelect.value);
  renderPreview();
});

zoomSlider.addEventListener('input', () => {
  state.panels[state.selected].zoom = Number(zoomSlider.value) / 100;
  zoomVal.textContent = `${zoomSlider.value}%`;
  renderPreview();
});

document.getElementById('photoInput').addEventListener('change', (e) => {
  addPhotoFiles(e.target.files);
  e.target.value = '';
});

document.getElementById('expSquare').addEventListener('click', () => exportCover(1080, 1080, 'leonida-cover-1080x1080.png'));
document.getElementById('expPortrait').addEventListener('click', () => exportCover(1080, 1350, 'leonida-cover-1080x1350.png'));
document.getElementById('expWide').addEventListener('click', () => exportCover(1920, 1080, 'leonida-cover-1920x1080.png'));

// drag to reposition + scroll to zoom + click to select a panel
let drag = null;
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
}
function pickPanel(fx, fy) {
  const rects = panelRects(1, 1);
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (fx >= r.x && fx <= r.x + r.w && fy >= r.y && fy <= r.y + r.h) return i;
  }
  return -1;
}
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const i = pickPanel(p.x, p.y);
  if (i < 0) return;
  state.selected = i;
  refreshPanelUI();
  canvas.setPointerCapture(e.pointerId);
  drag = { panel: state.panels[i], startX: p.x, startY: p.y, ox: state.panels[i].x, oy: state.panels[i].y };
  renderPreview();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const rects = panelRects(1, 1);
  const r = rects[state.selected];
  const img = state.photos[drag.panel.photo] && state.photos[drag.panel.photo].img;
  if (!img || !img.naturalWidth) return;
  // Move the photo centre opposite the pointer, in panel-fraction units.
  drag.panel.x = Math.min(1, Math.max(0, drag.ox - (p.x - drag.startX) / r.w));
  drag.panel.y = Math.min(1, Math.max(0, drag.oy - (p.y - drag.startY) / r.h));
  renderPreview();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[state.selected];
  panel.zoom = Math.min(3, Math.max(0.5, panel.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  refreshPanelUI();
  renderPreview();
}, { passive: false });

// drag-drop photos anywhere on the page
window.addEventListener('dragover', (e) => { e.preventDefault(); document.body.classList.add('dragging'); });
window.addEventListener('dragleave', () => document.body.classList.remove('dragging'));
window.addEventListener('drop', (e) => {
  e.preventDefault();
  document.body.classList.remove('dragging');
  if (e.dataTransfer && e.dataTransfer.files.length) addPhotoFiles(e.dataTransfer.files);
});

// cover-only view for exported-cover screenshots: ?view=cover&size=1080x1350
const params = new URLSearchParams(location.search);
if (params.get('view') === 'cover') {
  document.body.classList.add('cover-only');
  const size = (params.get('size') || '1080x1350').split('x').map(Number);
  const gradeParam = params.get('grade');
  if (gradeParam && GRADES[gradeParam]) state.grade = gradeParam;
  const titleParam = params.get('title');
  if (titleParam) state.title = titleParam;
  canvas.width = size[0] || 1080;
  canvas.height = size[1] || 1350;
  canvas.style.width = 'auto';
  const fit = () => {
    const s = Math.min(window.innerWidth / canvas.width, window.innerHeight / canvas.height);
    canvas.style.width = `${Math.floor(canvas.width * s)}px`;
    canvas.style.height = `${Math.floor(canvas.height * s)}px`;
  };
  window.addEventListener('resize', fit);
  const boot = () => { fit(); renderPreview(); };
  loadSamples();
  // re-render once samples arrive, then settle
  setTimeout(boot, 600);
  setTimeout(boot, 1600);
} else {
  loadSamples();
}
renderPreview();
