/* Leonida Nights — GTA-style cover maker.
   One canvas, one render function: the preview and the PNG export draw the
   exact same cover. Photos are read on the user's own machine and never
   uploaded. No network requests, no external libraries. */
'use strict';

const PANEL_NAMES = ['Hero', 'Side top', 'Side bottom', 'Bottom strip'];
const SAMPLE_PHOTOS = [
  { src: 'samples/sunset-skyline.jpg', name: 'Sunset skyline' },
  { src: 'samples/neon-street.jpg', name: 'Neon street' },
  { src: 'samples/palms-beach.jpg', name: 'Palms beach' },
];
const EXPORT_SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

const state = {
  photos: [], // { img, name }
  panels: [
    { photo: null, zoom: 1, ox: 0, oy: 0 },
    { photo: null, zoom: 1, ox: 0, oy: 0 },
    { photo: null, zoom: 1, ox: 0, oy: 0 },
    { photo: null, zoom: 1, ox: 0, oy: 0 },
  ],
  selected: 0,
  title: 'LEONIDA NIGHTS',
  subtitle: 'Vice City · Summer 2026',
  grade: 'sunset',
  titleStyle: 'outline',
  size: '1080x1080',
};

const stage = document.getElementById('stage');
const sctx = stage.getContext('2d');
let lastLayout = null; // panel rects of the last preview render, in canvas px

/* ---------------------------------------------------------- layout */

function coverLayout(W, H) {
  const pad = Math.round(W * 0.022);
  const gap = Math.round(W * 0.016);
  const stripH = Math.round(H * 0.27);
  const contentW = W - pad * 2;
  const topH = H - stripH - pad * 2 - gap;
  const heroW = Math.round(contentW * 0.6);
  const rightW = contentW - heroW - gap;
  const sideH = Math.round((topH - gap) / 2);
  return [
    { x: pad, y: pad, w: heroW, h: topH }, // hero
    { x: pad + heroW + gap, y: pad, w: rightW, h: sideH }, // side top
    { x: pad + heroW + gap, y: pad + sideH + gap, w: rightW, h: sideH }, // side bottom
    { x: pad, y: pad + topH + gap, w: contentW, h: stripH }, // bottom strip
  ];
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------------------------------------------------------- drawing */

function drawPhotoCover(ctx, img, rect, panel) {
  const r = Math.max(4, Math.min(rect.w, rect.h) * 0.03);
  ctx.save();
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, r);
  ctx.clip();
  if (!img) {
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    g.addColorStop(0, '#3d1a6e');
    g.addColorStop(0.55, '#c22a7a');
    g.addColorStop(1, '#ff7e3d');
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `700 ${Math.round(rect.h * 0.09)}px "Cover Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
  } else {
    const zoom = panel.zoom || 1;
    const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
    const dw = img.naturalWidth * base;
    const dh = img.naturalHeight * base;
    const dx = rect.x + (rect.w - dw) / 2 + (panel.ox || 0) * rect.w;
    const dy = rect.y + (rect.h - dh) / 2 + (panel.oy || 0) * rect.h;
    ctx.drawImage(img, dx, dy, dw, dh);
  }
  ctx.restore();
  // thin inner edge so panels read as separate poster tiles
  ctx.save();
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, r);
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = Math.max(1, rect.w * 0.002);
  ctx.stroke();
  ctx.restore();
}

function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, 6 * s);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 10 * s, y - 55 * s, x + 22 * s, y - 96 * s);
  ctx.stroke();
  const tx = x + 22 * s;
  const ty = y - 96 * s;
  ctx.lineWidth = Math.max(1.5, 3.5 * s);
  for (let a = -160; a <= 20; a += 22) {
    const rad = (a * Math.PI) / 180;
    const ex = tx + Math.cos(rad) * 62 * s;
    const ey = ty + Math.sin(rad) * 26 * s - 8 * s;
    const mx = tx + Math.cos(rad) * 34 * s;
    const my = ty + Math.sin(rad) * 6 * s - 26 * s;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(tx, ty, 5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHalftone(ctx, x, y, w, h, color) {
  const step = Math.max(7, w * 0.016);
  ctx.save();
  ctx.fillStyle = color;
  for (let row = 0; row * step < h; row++) {
    for (let col = 0; col * step < w; col++) {
      const r = Math.max(0.6, (step * 0.32 * (1 - row * step / h)) | 0);
      ctx.beginPath();
      ctx.arc(x + col * step + step / 2, y + row * step + step / 2, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function applyGrade(ctx, W, H, grade) {
  ctx.save();
  if (grade === 'sunset') {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, 'rgba(123,47,247,0.30)');
    g.addColorStop(0.45, 'rgba(255,46,149,0.22)');
    g.addColorStop(0.75, 'rgba(255,126,61,0.20)');
    g.addColorStop(1, 'rgba(255,196,107,0.28)');
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(255,120,40,0.10)';
    ctx.fillRect(0, 0, W, H);
  } else if (grade === 'neon') {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(12,8,48,0.30)';
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, 'rgba(255,46,149,0.30)');
    g.addColorStop(1, 'rgba(0,229,255,0.28)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else if (grade === 'noir') {
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(255,255,255,0.14)');
    g.addColorStop(1, 'rgba(0,0,0,0.30)');
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else if (grade === 'pastel') {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, 'rgba(255,179,217,0.35)');
    g.addColorStop(0.55, 'rgba(255,214,165,0.28)');
    g.addColorStop(1, 'rgba(123,227,216,0.32)');
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

function applyVignette(ctx, W, H, strength) {
  const g = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.42,
    W / 2, H / 2, Math.max(W, H) * 0.75
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function fitTitleFont(ctx, text, maxWidth, startSize, weight) {
  let size = startSize;
  ctx.font = `${weight} ${size}px "Cover Sans", "Liberation Sans", sans-serif`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size = Math.floor(size * 0.94);
    ctx.font = `${weight} ${size}px "Cover Sans", "Liberation Sans", sans-serif`;
  }
  return size;
}

function drawCaptionBand(ctx, strip, W) {
  const bandH = strip.h * 0.66;
  const bandY = strip.y + strip.h - bandH;
  // sunset band rising out of the strip photo
  const g = ctx.createLinearGradient(0, bandY, 0, strip.y + strip.h);
  g.addColorStop(0, 'rgba(43,16,85,0)');
  g.addColorStop(0.35, 'rgba(123,47,247,0.72)');
  g.addColorStop(0.65, 'rgba(255,46,149,0.82)');
  g.addColorStop(1, 'rgba(255,126,61,0.92)');
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(strip.x, bandY, strip.w, bandH);
  ctx.restore();
  // halftone dots along the top of the band
  drawHalftone(ctx, strip.x + strip.w * 0.02, bandY - strip.h * 0.06,
    strip.w * 0.96, strip.h * 0.09, 'rgba(255,196,107,0.55)');
  // palm silhouettes at both ends of the band
  const ps = strip.h / 120;
  drawPalm(ctx, strip.x + strip.w * 0.015, strip.y + strip.h - 4, ps * 0.9, 'rgba(16,6,32,0.9)');
  drawPalm(ctx, strip.x + strip.w * 0.985 - 30 * ps, strip.y + strip.h - 4, ps * 0.75, 'rgba(16,6,32,0.9)');
  // gold rule above the title
  const ruleY = bandY + bandH * 0.16;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,196,107,0.9)';
  ctx.lineWidth = Math.max(2, W * 0.003);
  ctx.beginPath();
  ctx.moveTo(strip.x + strip.w * 0.1, ruleY);
  ctx.lineTo(strip.x + strip.w * 0.9, ruleY);
  ctx.stroke();
  ctx.restore();
  // title + subtitle
  const title = (state.title || 'LEONIDA NIGHTS').toUpperCase();
  const cx = strip.x + strip.w / 2;
  const titleSize = fitTitleFont(ctx, title, strip.w * 0.82, Math.round(strip.h * 0.34), 700);
  const titleY = ruleY + titleSize * 1.05;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (state.titleStyle === 'gradient') {
    const tg = ctx.createLinearGradient(strip.x + strip.w * 0.09, 0, strip.x + strip.w * 0.91, 0);
    tg.addColorStop(0, '#ffc46b');
    tg.addColorStop(0.4, '#ff7e3d');
    tg.addColorStop(0.75, '#ff2e95');
    tg.addColorStop(1, '#c77dff');
    ctx.fillStyle = tg;
    ctx.fillText(title, cx, titleY);
  } else if (state.titleStyle === 'glow') {
    ctx.shadowColor = '#ff2e95';
    ctx.shadowBlur = titleSize * 0.4;
    ctx.fillStyle = '#fff7e0';
    ctx.fillText(title, cx, titleY);
    ctx.shadowColor = '#ffc46b';
    ctx.shadowBlur = titleSize * 0.15;
    ctx.fillText(title, cx, titleY);
  } else { // outline
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, titleSize * 0.14);
    ctx.strokeStyle = '#1a0b2e';
    ctx.strokeText(title, cx, titleY);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, cx, titleY);
  }
  ctx.restore();
  if (state.subtitle) {
    const subSize = Math.max(10, Math.round(strip.h * 0.085));
    ctx.save();
    ctx.font = `400 ${subSize}px "Cover Sans", "Liberation Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,247,224,0.95)';
    ctx.fillText(state.subtitle, cx, titleY + subSize * 1.9);
    ctx.restore();
  }
}

/* The one render function: preview and export share it. */
function renderCover(ctx, W, H, opts) {
  const preview = !!(opts && opts.preview);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0d0518';
  ctx.fillRect(0, 0, W, H);
  const rects = coverLayout(W, H);
  rects.forEach((rect, i) => {
    const panel = state.panels[i];
    const img = panel.photo === null ? null : state.photos[panel.photo].img;
    drawPhotoCover(ctx, img, rect, panel);
  });
  applyGrade(ctx, W, H, state.grade);
  applyVignette(ctx, W, H, state.grade === 'noir' ? 0.42 : 0.26);
  drawCaptionBand(ctx, rects[3], W);
  // outer frame
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = Math.max(1, W * 0.0015);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
  ctx.restore();
  if (preview) {
    const r = rects[state.selected];
    ctx.save();
    ctx.setLineDash([10, 7]);
    ctx.strokeStyle = '#ffc46b';
    ctx.lineWidth = 3;
    ctx.strokeRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6);
    ctx.restore();
  }
  return rects;
}

function renderPreview() {
  lastLayout = renderCover(sctx, stage.width, stage.height, { preview: true });
}

/* ---------------------------------------------------------- export */

function exportCover() {
  const [W, H] = EXPORT_SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = W;
  off.height = H;
  renderCover(off.getContext('2d'), W, H, { preview: false });
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leonida-nights-${state.size}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      resolve({ width: W, height: H, bytes: blob.size });
    }, 'image/png');
  });
}

/* Automation hook for the maker's own screenshots (no UI effect). */
window.leonidaExportDataUrl = function (size) {
  const [W, H] = EXPORT_SIZES[size || state.size];
  const off = document.createElement('canvas');
  off.width = W;
  off.height = H;
  renderCover(off.getContext('2d'), W, H, { preview: false });
  return off.toDataURL('image/png');
};
window.leonidaReady = function () {
  return state.photos.length >= 3 && state.photos.every((p) => p.img.complete);
};

/* ---------------------------------------------------------- photos */

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load ' + src));
    img.src = src;
  });
}

async function loadSamples() {
  for (const s of SAMPLE_PHOTOS) {
    try {
      const img = await loadImage(s.src);
      state.photos.push({ img, name: s.name });
    } catch (e) { /* a missing sample never blocks the app */ }
  }
  if (state.photos.length >= 3) {
    // starter arrangement: one photo fills the hero and the strip, the
    // other two take the side panels — the app works before any upload.
    state.panels[0].photo = 0;
    state.panels[1].photo = 1;
    state.panels[2].photo = 2;
    state.panels[3].photo = 0;
  }
  refreshLibrary();
  refreshPanelControls();
  renderPreview();
}

function addUserPhotos(files) {
  const images = Array.from(files).filter((f) => f.type.startsWith('image/'));
  if (!images.length) return;
  let loaded = 0;
  images.forEach((file) => {
    const url = URL.createObjectURL(file);
    loadImage(url).then((img) => {
      const idx = state.photos.length;
      state.photos.push({ img, name: file.name.replace(/\.[^.]+$/, '') });
      if (state.panels[state.selected].photo === null) state.panels[state.selected].photo = idx;
      loaded++;
      if (loaded === images.length) {
        refreshLibrary();
        refreshPanelControls();
        renderPreview();
        setStatus(`${images.length} photo${images.length > 1 ? 's' : ''} added.`);
      }
    }).catch(() => URL.revokeObjectURL(url));
  });
}

/* ---------------------------------------------------------- UI */

const libraryEl = document.getElementById('library');
const panelPhotoEl = document.getElementById('panelPhoto');
const zoomEl = document.getElementById('zoomRange');
const statusEl = document.getElementById('status');

function setStatus(msg) {
  statusEl.textContent = msg;
  if (msg) setTimeout(() => { if (statusEl.textContent === msg) statusEl.textContent = ''; }, 6000);
}

function refreshLibrary() {
  libraryEl.innerHTML = '';
  state.photos.forEach((p, i) => {
    const thumb = document.createElement('img');
    thumb.src = p.img.src;
    thumb.alt = p.name;
    thumb.title = p.name + ' — click to put it in the selected panel';
    thumb.addEventListener('click', () => {
      state.panels[state.selected].photo = i;
      refreshLibrary();
      refreshPanelControls();
      renderPreview();
    });
    if (state.panels[state.selected].photo === i) thumb.classList.add('selected');
    libraryEl.appendChild(thumb);
  });
}

function refreshPanelControls() {
  const tabs = document.getElementById('panelTabs');
  tabs.innerHTML = '';
  PANEL_NAMES.forEach((name, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = name;
    b.setAttribute('role', 'tab');
    if (i === state.selected) b.classList.add('active');
    b.addEventListener('click', () => selectPanel(i));
    tabs.appendChild(b);
  });
  panelPhotoEl.innerHTML = '<option value="">— empty —</option>';
  state.photos.forEach((p, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = p.name;
    panelPhotoEl.appendChild(o);
  });
  const panel = state.panels[state.selected];
  panelPhotoEl.value = panel.photo === null ? '' : String(panel.photo);
  zoomEl.value = String(panel.zoom || 1);
}

function selectPanel(i) {
  state.selected = i;
  refreshLibrary();
  refreshPanelControls();
  renderPreview();
}

function pointToCanvas(ev) {
  const r = stage.getBoundingClientRect();
  return {
    x: (ev.clientX - r.left) * (stage.width / r.width),
    y: (ev.clientY - r.top) * (stage.height / r.height),
  };
}

function hitPanel(x, y) {
  if (!lastLayout) return -1;
  for (let i = 0; i < lastLayout.length; i++) {
    const r = lastLayout[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

let drag = null;

stage.addEventListener('pointerdown', (ev) => {
  const p = pointToCanvas(ev);
  const i = hitPanel(p.x, p.y);
  if (i < 0) return;
  selectPanel(i);
  drag = { x: p.x, y: p.y, ox: state.panels[i].ox, oy: state.panels[i].oy };
  stage.setPointerCapture(ev.pointerId);
});

stage.addEventListener('pointermove', (ev) => {
  if (!drag) return;
  const p = pointToCanvas(ev);
  const panel = state.panels[state.selected];
  const rect = lastLayout[state.selected];
  panel.ox = drag.ox + (p.x - drag.x) / rect.w;
  panel.oy = drag.oy + (p.y - drag.y) / rect.h;
  panel.ox = Math.max(-1, Math.min(1, panel.ox));
  panel.oy = Math.max(-1, Math.min(1, panel.oy));
  renderPreview();
});

stage.addEventListener('pointerup', () => { drag = null; });
stage.addEventListener('pointercancel', () => { drag = null; });

stage.addEventListener('wheel', (ev) => {
  ev.preventDefault();
  const p = pointToCanvas(ev);
  const i = hitPanel(p.x, p.y);
  if (i < 0) return;
  selectPanel(i);
  const panel = state.panels[i];
  panel.zoom = Math.max(1, Math.min(3, panel.zoom * (ev.deltaY < 0 ? 1.08 : 0.93)));
  zoomEl.value = String(panel.zoom);
  renderPreview();
}, { passive: false });

document.getElementById('fileInput').addEventListener('change', (ev) => {
  addUserPhotos(ev.target.files);
  ev.target.value = '';
});

const dropZone = document.getElementById('dropZone');
dropZone.addEventListener('dragover', (ev) => { ev.preventDefault(); dropZone.classList.add('over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'));
dropZone.addEventListener('drop', (ev) => {
  ev.preventDefault();
  dropZone.classList.remove('over');
  addUserPhotos(ev.dataTransfer.files);
});

panelPhotoEl.addEventListener('change', () => {
  state.panels[state.selected].photo = panelPhotoEl.value === '' ? null : Number(panelPhotoEl.value);
  refreshLibrary();
  renderPreview();
});

zoomEl.addEventListener('input', () => {
  state.panels[state.selected].zoom = Number(zoomEl.value);
  renderPreview();
});

document.getElementById('fitBtn').addEventListener('click', () => {
  const panel = state.panels[state.selected];
  panel.zoom = 1; panel.ox = 0; panel.oy = 0;
  zoomEl.value = '1';
  renderPreview();
});

document.getElementById('fillAllBtn').addEventListener('click', () => {
  const photo = state.panels[state.selected].photo;
  state.panels.forEach((p) => { p.photo = photo; });
  refreshLibrary();
  renderPreview();
});

document.getElementById('titleInput').addEventListener('input', (ev) => {
  state.title = ev.target.value;
  renderPreview();
});

document.getElementById('subtitleInput').addEventListener('input', (ev) => {
  state.subtitle = ev.target.value;
  renderPreview();
});

document.getElementById('titleStyles').addEventListener('click', (ev) => {
  const b = ev.target.closest('button[data-style]');
  if (!b) return;
  state.titleStyle = b.dataset.style;
  document.querySelectorAll('#titleStyles button').forEach((x) => x.classList.toggle('active', x === b));
  renderPreview();
});

document.getElementById('grades').addEventListener('click', (ev) => {
  const b = ev.target.closest('button[data-grade]');
  if (!b) return;
  state.grade = b.dataset.grade;
  document.querySelectorAll('#grades button').forEach((x) => x.classList.toggle('active', x === b));
  renderPreview();
});

document.getElementById('sizes').addEventListener('click', (ev) => {
  const b = ev.target.closest('button[data-size]');
  if (!b) return;
  state.size = b.dataset.size;
  document.querySelectorAll('#sizes button').forEach((x) => x.classList.toggle('active', x === b));
  const [W, H] = EXPORT_SIZES[state.size];
  const scale = 900 / Math.max(W, H);
  stage.width = Math.round(W * scale);
  stage.height = Math.round(H * scale);
  renderPreview();
});

async function doExport() {
  setStatus('Exporting…');
  const info = await exportCover();
  setStatus(`Exported ${info.width} × ${info.height} PNG (${Math.round(info.bytes / 1024)} KB).`);
}
document.getElementById('exportBtn').addEventListener('click', doExport);
document.getElementById('exportBtn2').addEventListener('click', doExport);

/* ---------------------------------------------------------- boot */

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => renderPreview());
}
loadSamples();
