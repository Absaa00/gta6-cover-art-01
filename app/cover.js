/* Vice Cover Studio — turns a photo into a multi-panel sunset poster.
   Everything runs locally: photos are read with FileReader and never leave
   the machine. The cover is drawn on a canvas, so the PNG export is exactly
   what the live preview shows. System fonts only; no game artwork or logos. */
'use strict';

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const pctx = preview.getContext('2d');

/* ---- photo library: built-in samples plus anything the user drops in ---- */
const library = [
  { id: 'sample-boulevard', label: 'Boulevard (sample)', url: 'samples/boulevard.jpg', img: null, ready: false },
  { id: 'sample-pier', label: 'Pier (sample)', url: 'samples/pier.jpg', img: null, ready: false },
];
let uploadCount = 0;

function loadLibraryPhoto(entry) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { entry.img = img; entry.ready = true; resolve(); };
    img.onerror = () => resolve();
    img.src = entry.url;
  });
}

/* ---- state ---- */
const state = {
  layout: 'sunset-strip',
  grade: 'vice-sunset',
  size: '1080x1080',
  title: 'NEON SUNSET',
  subtitle: 'a boulevard story',
  titleScale: 1,
  activePanel: 0,
  panels: [
    { photoId: 'sample-boulevard', zoom: 1, panX: 0, panY: 0 },
    { photoId: 'sample-pier', zoom: 1, panX: 0, panY: 0 },
    { photoId: 'sample-boulevard', zoom: 1.15, panX: 0, panY: 0 },
    { photoId: 'sample-pier', zoom: 1.1, panX: 0, panY: 0 },
  ],
};

/* ---- layouts: panel rectangles as fractions of the cover ---- */
const LAYOUTS = {
  'sunset-strip': {
    hint: 'One big hero shot on top, two smaller panels below.',
    rects: [
      { x: 0, y: 0, w: 1, h: 0.62 },
      { x: 0, y: 0.62, w: 0.5, h: 0.38 },
      { x: 0.5, y: 0.62, w: 0.5, h: 0.38 },
    ],
  },
  'neon-grid': {
    hint: 'Four equal panels — one photo repeated, or four different ones.',
    rects: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  'boulevard-trio': {
    hint: 'Three tall strips side by side, like a triptych poster.',
    rects: [
      { x: 0, y: 0, w: 1 / 3, h: 1 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
  },
};

/* ---- colour grades ---- */
const GRADES = {
  'vice-sunset': {
    top: '#ff9a3d', bottom: '#ff2e88', wash: 0.30,
    band: ['rgba(20,4,16,0.92)', 'rgba(20,4,16,0)'],
    sun: true, sunColor: '#ffd166', vignette: 0.28,
  },
  'neon-nights': {
    top: '#ff2ec4', bottom: '#00e5ff', wash: 0.34,
    band: ['rgba(8,2,24,0.94)', 'rgba(8,2,24,0)'],
    sun: false, sunColor: '#ff2ec4', vignette: 0.34,
  },
  'palm-noir': {
    top: '#0affc2', bottom: '#062a33', wash: 0.26,
    band: ['rgba(2,12,12,0.94)', 'rgba(2,12,12,0)'],
    sun: false, sunColor: '#0affc2', vignette: 0.45,
  },
};

const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

function panelCount() { return LAYOUTS[state.layout].rects.length; }
function photoById(id) { return library.find((p) => p.id === id) || library[0]; }

/* ---- the cover renderer: same code draws preview and exports ---- */
function drawCover(ctx, W, H) {
  const grade = GRADES[state.grade];
  const gutter = Math.max(4, Math.round(W * 0.006));
  ctx.fillStyle = '#0b0708';
  ctx.fillRect(0, 0, W, H);

  const rects = LAYOUTS[state.layout].rects;
  rects.forEach((r, i) => {
    const rx = r.x * W + gutter / 2, ry = r.y * H + gutter / 2;
    const rw = r.w * W - gutter, rh = r.h * H - gutter;
    const panel = state.panels[i];
    const photo = photoById(panel.photoId);
    ctx.save();
    ctx.beginPath();
    ctx.rect(rx, ry, rw, rh);
    ctx.clip();
    if (photo.ready && photo.img) {
      const base = Math.max(rw / photo.img.naturalWidth, rh / photo.img.naturalHeight);
      const scale = base * panel.zoom;
      const dw = photo.img.naturalWidth * scale;
      const dh = photo.img.naturalHeight * scale;
      const dx = rx + (rw - dw) / 2 + panel.panX * rw;
      const dy = ry + (rh - dh) / 2 + panel.panY * rh;
      ctx.drawImage(photo.img, dx, dy, dw, dh);
    } else {
      const g = ctx.createLinearGradient(rx, ry, rx, ry + rh);
      g.addColorStop(0, '#3a2430');
      g.addColorStop(1, '#120d12');
      ctx.fillStyle = g;
      ctx.fillRect(rx, ry, rw, rh);
    }
    // colour grade wash over the photo
    const wash = ctx.createLinearGradient(rx, ry, rx, ry + rh);
    wash.addColorStop(0, grade.top);
    wash.addColorStop(1, grade.bottom);
    ctx.globalAlpha = grade.wash;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = wash;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
    // crisp white frame around each panel
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(2, Math.round(W * 0.002));
    ctx.strokeRect(rx, ry, rw, rh);
  });

  // glowing sun disc for the sunset grade
  if (grade.sun) {
    const cx = W * 0.82, cy = H * 0.12, rad = W * 0.075;
    const glow = ctx.createRadialGradient(cx, cy, rad * 0.2, cx, cy, rad * 1.6);
    glow.addColorStop(0, 'rgba(255,209,102,0.85)');
    glow.addColorStop(0.5, 'rgba(255,122,61,0.35)');
    glow.addColorStop(1, 'rgba(255,46,136,0)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, rad * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    const disc = ctx.createRadialGradient(cx - rad * 0.3, cy - rad * 0.3, rad * 0.1, cx, cy, rad);
    disc.addColorStop(0, '#ffe066');
    disc.addColorStop(1, '#ff7a3d');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // vignette
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, `rgba(0,0,0,${grade.vignette})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // lettering band
  const bandH = H * 0.24;
  const band = ctx.createLinearGradient(0, H - bandH, 0, H);
  band.addColorStop(0, grade.band[1]);
  band.addColorStop(1, grade.band[0]);
  ctx.fillStyle = band;
  ctx.fillRect(0, H - bandH, W, bandH);

  const pad = W * 0.045;
  const title = (state.title || 'UNTITLED').toUpperCase();
  // subtitle pill metrics first, so the title can sit high enough that
  // the pill never runs off the bottom edge (wide covers are short).
  const sub = state.subtitle || '';
  const subSize = Math.round(W * 0.028);
  const pillH = sub.trim() ? subSize * 2.1 : 0;
  const pillGap = H * 0.018;
  let titleY = H - H * 0.085;
  if (sub.trim()) {
    const overflow = (titleY + pillGap + pillH) - (H - gutter);
    if (overflow > 0) titleY -= overflow;
  }
  let size = W * 0.105 * state.titleScale;
  const font = (px) => `italic 900 ${px}px "Arial Black", "Segoe UI", Arial, sans-serif`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  try { ctx.letterSpacing = `${Math.round(size * 0.02)}px`; } catch (e) { /* older canvas */ }
  ctx.font = font(size);
  while (ctx.measureText(title).width > W - pad * 2 && size > W * 0.03) {
    size *= 0.92;
    ctx.font = font(size);
  }
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = Math.round(W * 0.012);
  ctx.shadowOffsetY = Math.round(W * 0.004);
  ctx.lineWidth = Math.max(3, Math.round(size * 0.09));
  ctx.strokeStyle = '#14060f';
  ctx.lineJoin = 'round';
  ctx.strokeText(title, pad, titleY);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(title, pad, titleY);
  ctx.restore();

  // subtitle pill
  if (sub.trim()) {
    ctx.font = `700 ${subSize}px "Segoe UI", Arial, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.14)}px`; } catch (e) { /* older canvas */ }
    const tw = ctx.measureText(sub).width;
    const pillW = tw + subSize * 1.6;
    const pillX = pad, pillY = titleY + pillGap;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.fillStyle = '#1c0a14';
    ctx.textBaseline = 'middle';
    ctx.fillText(sub, pillX + subSize * 0.8, pillY + pillH / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  }

  // thin outer frame
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(2, Math.round(W * 0.002));
  ctx.strokeRect(gutter / 2, gutter / 2, W - gutter, H - gutter);
}

function redrawPreview() {
  const [W, H] = SIZES[state.size];
  const longSide = 900;
  const scale = longSide / Math.max(W, H);
  preview.width = Math.round(W * scale);
  preview.height = Math.round(H * scale);
  drawCover(pctx, preview.width, preview.height);
  $('sizeLabel').textContent = `${W} × ${H}`;
}

/* ---- export ---- */
function exportPNG(sizeKey, download = true) {
  return new Promise((resolve, reject) => {
    const [W, H] = SIZES[sizeKey];
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    drawCover(off.getContext('2d'), W, H);
    off.toBlob((blob) => {
      if (!blob) { reject(new Error('PNG encode failed')); return; }
      if (download) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `vice-cover-${sizeKey}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      }
      $('statusLine').textContent = `Saved vice-cover-${sizeKey}.png (${W}×${H}).`;
      resolve(blob);
    }, 'image/png');
  });
}

/* ---- UI wiring ---- */
function segWire(segId, attr, apply) {
  $(segId).addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    $(segId).querySelectorAll('button').forEach((b) => b.classList.remove('on'));
    btn.classList.add('on');
    apply(btn.dataset[attr]);
  });
}

segWire('layoutSeg', 'layout', (v) => {
  state.layout = v;
  state.activePanel = 0;
  $('layoutHint').textContent = LAYOUTS[v].hint;
  buildPanelTabs();
  syncPanelControls();
  redrawPreview();
});
segWire('gradeSeg', 'grade', (v) => { state.grade = v; redrawPreview(); });

function buildPanelTabs() {
  const tabs = $('panelTabs');
  tabs.innerHTML = '';
  for (let i = 0; i < panelCount(); i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `Panel ${i + 1}`;
    if (i === state.activePanel) b.classList.add('on');
    b.addEventListener('click', () => {
      state.activePanel = i;
      buildPanelTabs();
      syncPanelControls();
    });
    tabs.appendChild(b);
  }
}

function buildLibraryThumbs() {
  const lib = $('library');
  lib.innerHTML = '';
  library.forEach((entry) => {
    const img = document.createElement('img');
    img.src = entry.url;
    img.alt = entry.label;
    img.title = entry.label;
    img.addEventListener('click', () => {
      state.panels[state.activePanel].photoId = entry.id;
      syncPanelControls();
      redrawPreview();
    });
    lib.appendChild(img);
  });
  markSelectedThumb();
}

function markSelectedThumb() {
  const current = state.panels[state.activePanel].photoId;
  document.querySelectorAll('#library img').forEach((img, i) => {
    img.classList.toggle('sel', library[i] && library[i].id === current);
  });
}

function syncPanelControls() {
  const panel = state.panels[state.activePanel];
  const sel = $('panelPhoto');
  sel.innerHTML = '';
  library.forEach((entry) => {
    const opt = document.createElement('option');
    opt.value = entry.id;
    opt.textContent = entry.label;
    sel.appendChild(opt);
  });
  sel.value = panel.photoId;
  $('zoomRange').value = panel.zoom;
  $('panXRange').value = panel.panX;
  $('panYRange').value = panel.panY;
  $('zoomOut').textContent = `${panel.zoom.toFixed(2)}×`;
  $('panXOut').textContent = Number(panel.panX).toFixed(2);
  $('panYOut').textContent = Number(panel.panY).toFixed(2);
  markSelectedThumb();
}

$('panelPhoto').addEventListener('change', (e) => {
  state.panels[state.activePanel].photoId = e.target.value;
  syncPanelControls();
  redrawPreview();
});

function bindCrop(inputId, outId, key, fmt) {
  $(inputId).addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    state.panels[state.activePanel][key] = v;
    $(outId).textContent = fmt(v);
    redrawPreview();
  });
}
bindCrop('zoomRange', 'zoomOut', 'zoom', (v) => `${v.toFixed(2)}×`);
bindCrop('panXRange', 'panXOut', 'panX', (v) => v.toFixed(2));
bindCrop('panYRange', 'panYOut', 'panY', (v) => v.toFixed(2));

$('resetCropBtn').addEventListener('click', () => {
  const p = state.panels[state.activePanel];
  p.zoom = 1; p.panX = 0; p.panY = 0;
  syncPanelControls();
  redrawPreview();
});

$('titleInput').addEventListener('input', (e) => { state.title = e.target.value; redrawPreview(); });
$('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; redrawPreview(); });
$('titleSizeRange').addEventListener('input', (e) => {
  state.titleScale = parseInt(e.target.value, 10) / 100;
  $('titleSizeOut').textContent = `${e.target.value}%`;
  redrawPreview();
});

document.querySelectorAll('.export').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.size = btn.dataset.size;
    redrawPreview();
    exportPNG(state.size).catch(() => {
      $('statusLine').textContent = 'Export failed — try again.';
    });
  });
});

$('shuffleBtn').addEventListener('click', () => {
  const layouts = Object.keys(LAYOUTS);
  const grades = Object.keys(GRADES);
  state.layout = layouts[Math.floor(Math.random() * layouts.length)];
  state.grade = grades[Math.floor(Math.random() * grades.length)];
  document.querySelectorAll('#layoutSeg button').forEach((b) => b.classList.toggle('on', b.dataset.layout === state.layout));
  document.querySelectorAll('#gradeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.grade === state.grade));
  $('layoutHint').textContent = LAYOUTS[state.layout].hint;
  state.activePanel = 0;
  buildPanelTabs();
  syncPanelControls();
  redrawPreview();
});

/* ---- uploads: file picker + drag and drop, local only ---- */
function addUpload(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => {
    uploadCount += 1;
    const entry = {
      id: `upload-${uploadCount}`,
      label: file.name.length > 24 ? file.name.slice(0, 24) + '…' : file.name,
      url: String(reader.result),
      img: null, ready: false,
    };
    library.push(entry);
    loadLibraryPhoto(entry).then(() => {
      state.panels[state.activePanel].photoId = entry.id;
      buildLibraryThumbs();
      syncPanelControls();
      redrawPreview();
      $('statusLine').textContent = `Loaded ${entry.label} — kept on this machine only.`;
    });
  };
  reader.readAsDataURL(file);
}

$('fileInput').addEventListener('change', (e) => {
  [...e.target.files].forEach(addUpload);
  e.target.value = '';
});

const dropZone = $('dropZone');
['dragover', 'dragenter'].forEach((ev) => dropZone.addEventListener(ev, (e) => {
  e.preventDefault();
  dropZone.classList.add('drag');
}));
['dragleave', 'drop'].forEach((ev) => dropZone.addEventListener(ev, (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag');
}));
dropZone.addEventListener('drop', (e) => {
  [...(e.dataTransfer.files || [])].forEach(addUpload);
});
dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('fileInput').click(); }
});

/* ---- automation hooks used by the screenshot script (not by the UI) ---- */
window.viceCover = {
  state,
  setSize(sizeKey) { state.size = sizeKey; redrawPreview(); },
  setLayout(v) { state.layout = v; state.activePanel = 0; buildPanelTabs(); syncPanelControls(); redrawPreview(); },
  setGrade(v) { state.grade = v; redrawPreview(); },
  setTitle(t) { state.title = t; $('titleInput').value = t; redrawPreview(); },
  setSubtitle(t) { state.subtitle = t; $('subtitleInput').value = t; redrawPreview(); },
  setPanelPhoto(i, photoId) { state.panels[i].photoId = photoId; redrawPreview(); },
  exportPNG: (sizeKey) => exportPNG(sizeKey, false),
};

/* ---- boot ---- */
Promise.all(library.map(loadLibraryPhoto)).then(() => {
  buildLibraryThumbs();
  buildPanelTabs();
  syncPanelControls();
  redrawPreview();
  $('statusLine').textContent = 'Ready. Pick a sample photo below to start.';
});
