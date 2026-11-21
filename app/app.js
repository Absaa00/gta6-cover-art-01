/* Leonida Nights Cover Maker — one render function drives the live
 * preview and the PNG export. Photos stay on the user's machine:
 * nothing is uploaded anywhere. No Rockstar logo, artwork or font
 * is used; the lettering is Liberation Sans under the OFL. */
'use strict';

const $ = (id) => document.getElementById(id);

const SAMPLES = [
  { name: 'Sunset skyline', src: 'samples/sunset-skyline.jpg' },
  { name: 'Palms beach', src: 'samples/palms-beach.jpg' },
  { name: 'Neon street', src: 'samples/neon-street.jpg' },
];

const GRADES = {
  sunset: {
    label: 'Sunset',
    sky: ['#2e1056', '#7a2070', '#e2486e', '#ff8c42', '#ffc45c'],
    overlay: ['rgba(90,20,120,0.55)', 'rgba(226,72,110,0.35)', 'rgba(255,140,66,0.45)', 'rgba(255,196,92,0.4)'],
    mode: 'soft-light',
    tint: 'rgba(255,120,60,0.10)',
  },
  neon: {
    label: 'Neon Night',
    sky: ['#070418', '#1c0a4e', '#3d1478', '#a4138c', '#ff2d95'],
    overlay: ['rgba(20,10,80,0.6)', 'rgba(164,19,140,0.4)', 'rgba(0,229,255,0.35)', 'rgba(255,45,149,0.35)'],
    mode: 'overlay',
    tint: 'rgba(0,229,255,0.08)',
  },
  noir: {
    label: 'Palm Noir',
    sky: ['#0a0a12', '#17141f', '#2c2438', '#4a3a52', '#8a6a4a'],
    overlay: ['rgba(0,0,0,0.5)', 'rgba(30,20,40,0.35)', 'rgba(255,210,61,0.22)', 'rgba(255,210,61,0.18)'],
    mode: 'soft-light',
    tint: 'rgba(0,0,0,0.12)',
  },
  pastel: {
    label: 'Vice Pastel',
    sky: ['#5b4a8a', '#a06bb0', '#f28bb8', '#ffb3a0', '#ffe3b3'],
    overlay: ['rgba(150,90,190,0.35)', 'rgba(242,139,184,0.3)', 'rgba(255,179,160,0.3)', 'rgba(255,227,179,0.28)'],
    mode: 'soft-light',
    tint: 'rgba(255,255,255,0.06)',
  },
};

const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

/* ---------------------------------------------------------------- state */
const state = {
  photos: [],               // {name, img, url}
  panels: {
    hero:  { photo: 0, zoom: 1.15, ox: 0, oy: 0 },
    side1: { photo: 1, zoom: 1.1, ox: 0, oy: 0 },
    side2: { photo: 2, zoom: 1.1, ox: 0, oy: 0 },
    strip: { photo: 0, zoom: 1.3, ox: 0, oy: -0.08 },
  },
  selectedPanel: 'hero',
  title: 'LEONIDA NIGHTS',
  subtitle: 'VICE CITY · SUMMER 2026',
  grade: 'sunset',
  titleStyle: 'outline',
  size: '1080x1080',
};

/* ------------------------------------------------------------- layout */
/* Panels as fractions of the canvas: hero + 2 side panels + bottom
 * strip, with a full-width sunset caption band across the bottom. */
function layoutFor(W, H) {
  const panel = (x, y, w, h) => ({ x: x * W, y: y * H, w: w * W, h: h * H });
  return {
    hero: panel(0.04, 0.04, 0.59, 0.56),
    side1: panel(0.65, 0.04, 0.31, 0.27),
    side2: panel(0.65, 0.33, 0.31, 0.27),
    strip: panel(0.04, 0.62, 0.92, 0.16),
    caption: { x: 0, y: 0.80 * H, w: W, h: 0.20 * H },
  };
}

/* ------------------------------------------------------------- drawing */
function drawPhotoInPanel(ctx, photo, rect, panel) {
  if (!photo || !photo.img || !photo.img.naturalWidth) {
    ctx.fillStyle = '#241338';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = '#8a76a8';
    ctx.font = `700 ${Math.round(rect.h * 0.09)}px "Leonida Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
    return;
  }
  const img = photo.img;
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * panel.zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + panel.ox * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + panel.oy * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawPalm(ctx, x, y, s, color, lean) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  const topX = x + lean * s;
  const topY = y - 1.1 * s;
  ctx.lineWidth = Math.max(3, s * 0.045);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * s * 0.4, y - s * 0.6, topX, topY);
  ctx.stroke();
  for (let k = 0; k < 7; k++) {
    const a = Math.PI * (0.12 + 0.12 * k);
    const dx = Math.cos(a) * (k < 3 ? -1 : 1) * (0.55 + 0.4 * Math.abs(k - 3) / 3);
    const dy = -Math.sin(a) * 0.5 - 0.12;
    const ex = topX + dx * s;
    const ey = topY + dy * s + s * 0.22;
    const mx = topX + dx * s * 0.45;
    const my = topY + dy * s * 0.3 - s * 0.14;
    ctx.lineWidth = Math.max(2, s * 0.035);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(topX, topY, s * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHalftone(ctx, band, colors) {
  const rows = 7;
  for (let r = 0; r < rows; r++) {
    const y = band.y + band.h * (0.12 + (r / rows) * 0.8);
    const maxR = band.h * 0.055 * (1 - r / rows) + 1;
    const step = maxR * 3.4;
    for (let x = band.x + step / 2; x < band.x + band.w; x += step) {
      ctx.fillStyle = colors[r % colors.length];
      ctx.globalAlpha = 0.28 + 0.4 * (r / rows);
      ctx.beginPath();
      ctx.arc(x, y, maxR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawCaption(ctx, W, H, band, grade, title, subtitle, style) {
  const g = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
  grade.sky.forEach((c, i) => g.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = g;
  ctx.fillRect(band.x, band.y, band.w, band.h);

  // Sunset glow line where the band meets the panels.
  const glow = ctx.createLinearGradient(0, band.y - 2, 0, band.y + band.h * 0.3);
  glow.addColorStop(0, 'rgba(255,196,92,0.9)');
  glow.addColorStop(1, 'rgba(255,196,92,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(band.x, band.y, band.w, band.h * 0.3);

  drawHalftone(ctx, { x: band.x, y: band.y + band.h * 0.55, w: band.w, h: band.h * 0.45 },
    ['#ffd23d', '#ff5e8a', '#ff8c42']);

  // Palm silhouettes rising from the band's top edge.
  const palmColor = 'rgba(24,8,44,0.9)';
  drawPalm(ctx, W * 0.06, band.y + 4, H * 0.075, palmColor, 0.14);
  drawPalm(ctx, W * 0.94, band.y + 4, H * 0.085, palmColor, -0.12);
  drawPalm(ctx, W * 0.885, band.y + 4, H * 0.05, palmColor, -0.2);

  // Title.
  const titleSize = Math.min(W * 0.085, band.h * 0.46);
  ctx.font = `700 ${titleSize}px "Leonida Sans", "Liberation Sans", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  try { ctx.letterSpacing = `${Math.round(titleSize * 0.06)}px`; } catch (e) { /* older canvas */ }
  const tx = W / 2;
  const ty = band.y + band.h * 0.38;
  ctx.save();
  if (style === 'gradient') {
    const tg = ctx.createLinearGradient(0, ty - titleSize * 0.6, 0, ty + titleSize * 0.6);
    tg.addColorStop(0, '#fff6d8');
    tg.addColorStop(0.45, '#ffd23d');
    tg.addColorStop(0.75, '#ff5e8a');
    tg.addColorStop(1, '#c86bff');
    ctx.fillStyle = tg;
    ctx.lineWidth = titleSize * 0.09;
    ctx.strokeStyle = '#1c0b2e';
    ctx.strokeText(title, tx, ty);
    ctx.fillText(title, tx, ty);
  } else if (style === 'glow') {
    ctx.shadowColor = '#ff2d95';
    ctx.shadowBlur = titleSize * 0.55;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, tx, ty);
    ctx.shadowBlur = titleSize * 0.2;
    ctx.shadowColor = '#19d3da';
    ctx.fillText(title, tx, ty);
  } else { // outline
    ctx.lineWidth = titleSize * 0.1;
    ctx.strokeStyle = '#1c0b2e';
    ctx.lineJoin = 'round';
    ctx.strokeText(title, tx, ty);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, tx, ty);
    ctx.lineWidth = titleSize * 0.025;
    ctx.strokeStyle = '#ffd23d';
    ctx.strokeText(title, tx, ty);
  }
  ctx.restore();

  // Subtitle.
  const subSize = Math.max(14, titleSize * 0.24);
  ctx.font = `700 ${subSize}px "Leonida Sans", "Liberation Sans", Arial, sans-serif`;
  try { ctx.letterSpacing = `${Math.round(subSize * 0.35)}px`; } catch (e) { /* older canvas */ }
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText(subtitle, tx, band.y + band.h * 0.78);
  try { ctx.letterSpacing = '0px'; } catch (e) { /* older canvas */ }
}

/* The one render function: preview and export share it. */
function renderCover(ctx, W, H, s) {
  const grade = GRADES[s.grade] || GRADES.sunset;
  const lay = layoutFor(W, H);

  // Deep violet base + teal-shadowed frame.
  ctx.fillStyle = '#150a24';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0d4b52';
  ctx.fillRect(0, 0, W, H * 0.02);

  for (const key of ['hero', 'side1', 'side2', 'strip']) {
    const rect = lay[key];
    const panel = s.panels[key];
    drawPhotoInPanel(ctx, s.photos[panel.photo], rect, panel);
  }

  // Grade wash over the photos.
  ctx.save();
  ctx.globalCompositeOperation = grade.mode;
  const og = ctx.createLinearGradient(0, 0, W, H);
  grade.overlay.forEach((c, i) => og.addColorStop(i / (grade.overlay.length - 1), c));
  ctx.fillStyle = og;
  ctx.fillRect(0, 0, W, H * 0.82);
  ctx.restore();
  ctx.fillStyle = grade.tint;
  ctx.fillRect(0, 0, W, H * 0.82);

  // Vignette.
  const vg = ctx.createRadialGradient(W / 2, H * 0.4, Math.min(W, H) * 0.35,
    W / 2, H * 0.45, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(10,4,24,0.45)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // White poster borders between panels.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(4, W * 0.006);
  for (const key of ['hero', 'side1', 'side2', 'strip']) {
    const r = lay[key];
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  }

  drawCaption(ctx, W, H, lay.caption, grade, s.title, s.subtitle, s.titleStyle);
}

/* -------------------------------------------------------------- photos */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadSamples() {
  for (const sample of SAMPLES) {
    if (state.photos.some((p) => p.src === sample.src)) continue;
    try {
      const img = await loadImage(sample.src);
      state.photos.push({ name: sample.name, img, src: sample.src });
    } catch (e) { /* sample missing: editor still works with uploads */ }
  }
  refreshPhotoUI();
  renderPreview();
}

function addFiles(files) {
  const list = [...files].filter((f) => f.type.startsWith('image/'));
  if (!list.length) return;
  let loaded = 0;
  for (const file of list) {
    const url = URL.createObjectURL(file);
    loadImage(url).then((img) => {
      state.photos.push({ name: file.name.replace(/\.[^.]+$/, ''), img, src: url });
      loaded++;
      if (loaded === list.length) { refreshPhotoUI(); renderPreview(); }
    }).catch(() => URL.revokeObjectURL(url));
  }
}

/* -------------------------------------------------------------- editor */
const canvas = $('coverCanvas');
const ctx = canvas.getContext('2d');

function renderPreview() {
  const [W, H] = SIZES[state.size];
  canvas.width = W;
  canvas.height = H;
  renderCover(ctx, W, H, state);
}

function refreshPhotoUI() {
  const strip = $('photoStrip');
  strip.innerHTML = '';
  if (!state.photos.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'No photos yet — add your own or load the samples.';
    strip.appendChild(p);
  }
  state.photos.forEach((photo, i) => {
    const thumb = document.createElement('img');
    thumb.className = 'thumb';
    thumb.src = photo.src;
    thumb.alt = photo.name;
    thumb.title = photo.name;
    if (state.panels[state.selectedPanel].photo === i) thumb.classList.add('selected');
    thumb.addEventListener('click', () => {
      state.panels[state.selectedPanel].photo = i;
      refreshPhotoUI();
      renderPreview();
    });
    strip.appendChild(thumb);
  });

  const picker = $('photoPicker');
  picker.innerHTML = '';
  const none = document.createElement('option');
  none.value = '-1';
  none.textContent = '— no photo —';
  picker.appendChild(none);
  state.photos.forEach((photo, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${i + 1}. ${photo.name}`;
    picker.appendChild(opt);
  });
  picker.value = String(state.panels[state.selectedPanel].photo ?? -1);
  $('zoomSlider').value = String(state.panels[state.selectedPanel].zoom);
}

function selectPanel(key) {
  state.selectedPanel = key;
  document.querySelectorAll('.panel-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.panel === key);
  });
  refreshPhotoUI();
  renderPreview();
}

function canvasPoint(ev) {
  const r = canvas.getBoundingClientRect();
  const [W, H] = SIZES[state.size];
  return {
    x: (ev.clientX - r.left) * (W / r.width),
    y: (ev.clientY - r.top) * (H / r.height),
    W, H,
  };
}

function hitPanel(x, y, W, H) {
  const lay = layoutFor(W, H);
  for (const key of ['hero', 'side1', 'side2', 'strip']) {
    const rect = lay[key];
    if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) return key;
  }
  return null;
}

let drag = null;
canvas.addEventListener('pointerdown', (ev) => {
  const p = canvasPoint(ev);
  const key = hitPanel(p.x, p.y, p.W, p.H);
  if (!key) return;
  selectPanel(key);
  drag = { x: p.x, y: p.y, panel: state.panels[key], rect: layoutFor(p.W, p.H)[key] };
  canvas.setPointerCapture(ev.pointerId);
});
canvas.addEventListener('pointermove', (ev) => {
  if (!drag) return;
  const p = canvasPoint(ev);
  const panel = drag.panel;
  panel.ox += (p.x - drag.x) / drag.rect.w;
  panel.oy += (p.y - drag.y) / drag.rect.h;
  panel.ox = Math.max(-0.6, Math.min(0.6, panel.ox));
  panel.oy = Math.max(-0.6, Math.min(0.6, panel.oy));
  drag.x = p.x;
  drag.y = p.y;
  renderPreview();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (ev) => {
  ev.preventDefault();
  const panel = state.panels[state.selectedPanel];
  panel.zoom = Math.max(1, Math.min(3, panel.zoom * (ev.deltaY < 0 ? 1.08 : 0.93)));
  $('zoomSlider').value = String(panel.zoom);
  renderPreview();
}, { passive: false });

$('fileInput').addEventListener('change', (ev) => {
  addFiles(ev.target.files);
  ev.target.value = '';
});
$('loadSamplesBtn').addEventListener('click', loadSamples);

const dropZone = $('dropZone');
['dragenter', 'dragover'].forEach((name) => dropZone.addEventListener(name, (ev) => {
  ev.preventDefault();
  dropZone.classList.add('dragging');
}));
['dragleave', 'drop'].forEach((name) => dropZone.addEventListener(name, (ev) => {
  ev.preventDefault();
  dropZone.classList.remove('dragging');
}));
dropZone.addEventListener('drop', (ev) => addFiles(ev.dataTransfer.files));

document.querySelectorAll('.panel-btn').forEach((b) => {
  b.addEventListener('click', () => selectPanel(b.dataset.panel));
});
$('photoPicker').addEventListener('change', (ev) => {
  state.panels[state.selectedPanel].photo = Number(ev.target.value);
  refreshPhotoUI();
  renderPreview();
});
$('zoomSlider').addEventListener('input', (ev) => {
  state.panels[state.selectedPanel].zoom = Number(ev.target.value);
  renderPreview();
});
$('titleInput').addEventListener('input', (ev) => {
  state.title = (ev.target.value || 'LEONIDA').toUpperCase();
  renderPreview();
});
$('subtitleInput').addEventListener('input', (ev) => {
  state.subtitle = (ev.target.value || '').toUpperCase();
  renderPreview();
});

function chipRow(id, key, value) {
  document.querySelectorAll(`#${id} .chip`).forEach((c) => {
    c.classList.toggle('active', c.dataset[key] === value);
  });
}
$('titleStyleRow').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-style]');
  if (!b) return;
  state.titleStyle = b.dataset.style;
  chipRow('titleStyleRow', 'style', state.titleStyle);
  renderPreview();
});
$('gradeRow').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-grade]');
  if (!b) return;
  state.grade = b.dataset.grade;
  chipRow('gradeRow', 'grade', state.grade);
  renderPreview();
});
$('sizeRow').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-size]');
  if (!b) return;
  state.size = b.dataset.size;
  chipRow('sizeRow', 'size', state.size);
  renderPreview();
});

$('exportBtn').addEventListener('click', () => {
  const [W, H] = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = W;
  off.height = H;
  renderCover(off.getContext('2d'), W, H, state);
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `leonida-nights-${state.size}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
});

/* --------------------------------------------------------- cover-only */
/* ?shot=cover&size=1920x1080 renders one exported cover full-screen,
 * for the entry's screenshots: the app's own drawing of its export. */
async function renderCoverOnly(params) {
  document.querySelector('.topbar').hidden = true;
  $('editorView').hidden = true;
  const view = $('coverView');
  view.hidden = false;
  if (params.get('grade') && GRADES[params.get('grade')]) state.grade = params.get('grade');
  if (params.get('style')) state.titleStyle = params.get('style');
  if (params.get('title')) state.title = params.get('title').toUpperCase();
  if (params.get('subtitle')) state.subtitle = params.get('subtitle').toUpperCase();
  const size = params.get('size') || '1920x1080';
  if (SIZES[size]) state.size = size;
  await loadSamples();
  try { await document.fonts.ready; } catch (e) { /* fonts fall back */ }
  const [W, H] = SIZES[state.size];
  const c = $('coverOnlyCanvas');
  c.width = W;
  c.height = H;
  renderCover(c.getContext('2d'), W, H, state);
  window.__coverReady = true;
}

/* ---------------------------------------------------------------- boot */
(async () => {
  const params = new URLSearchParams(location.search);
  if (params.get('shot') === 'cover') {
    await renderCoverOnly(params);
    return;
  }
  await loadSamples();
  try { await document.fonts.ready; } catch (e) { /* fonts fall back */ }
  renderPreview();
  window.__coverReady = true;
})();
