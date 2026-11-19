// Vice Cover Studio — GTA 6-style multi-panel cover art maker.
// Everything runs offline in the browser: photos are read on the user's own
// machine, the cover is drawn on a <canvas>, and export is a PNG download.
// Lettering is drawn with system fonts; no Rockstar logo, artwork or font.
'use strict';

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const pctx = preview.getContext('2d');

const SAMPLES = { pier: 'samples/pier.jpg', boulevard: 'samples/boulevard.jpg' };
const SIZES = { '1080x1080': [1080, 1080], '1080x1350': [1080, 1350], '1920x1080': [1920, 1080] };

// Panels are rectangles in fractions of the cover (x, y, w, h).
const LAYOUTS = {
  hero: [
    { x: 0, y: 0, w: 0.62, h: 1 },
    { x: 0.62, y: 0, w: 0.38, h: 0.5 },
    { x: 0.62, y: 0.5, w: 0.38, h: 0.5 },
  ],
  grid: [
    { x: 0, y: 0, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0, w: 0.5, h: 0.5 },
    { x: 0, y: 0.5, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
  ],
  strip: [
    { x: 0, y: 0, w: 1 / 3, h: 1 },
    { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
    { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
  ],
};

const GRADES = {
  sunset: { top: '#ffb347', mid: '#ff7a18', bottom: '#ff2e88', glow: '#ffd166' },
  neon: { top: '#22d3ee', mid: '#a855f7', bottom: '#ff2e88', glow: '#67e8f9' },
  dusk: { top: '#7c3aed', mid: '#312e81', bottom: '#0f172a', glow: '#c4b5fd' },
};

const state = {
  photos: [], // { name, img, url }
  pickedPhoto: 0,
  panels: [0, 1, 2, 3].map(() => ({ photo: 0, zoom: 1, ox: 0, oy: 0 })),
  selectedPanel: 0,
  layout: 'hero',
  grade: 'sunset',
  size: '1080x1080',
  title: 'Sunset Heist',
  subtitle: 'A Sunset City story',
  titleScale: 1,
};

const params = new URLSearchParams(location.search);
const shotMode = params.get('shot') === 'cover' ? 'cover' : params.get('shot') === 'editor' ? 'editor' : null;

function panelRects() { return LAYOUTS[state.layout]; }

function drawPhotoInto(ctx, img, rx, ry, rw, rh, panel) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(rw / iw, rh / ih) * panel.zoom;
  const dw = iw * base;
  const dh = ih * base;
  let dx = rx + (rw - dw) / 2;
  let dy = ry + (rh - dh) / 2;
  const maxOx = Math.max(0, (dw - rw) / 2);
  const maxOy = Math.max(0, (dh - rh) / 2);
  dx += Math.max(-maxOx, Math.min(maxOx, panel.ox * rw));
  dy += Math.max(-maxOy, Math.min(maxOy, panel.oy * rh));
  ctx.save();
  ctx.beginPath();
  ctx.rect(rx, ry, rw, rh);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawPlaceholderPanel(ctx, rx, ry, rw, rh, seed) {
  const g = GRADES[state.grade];
  const grad = ctx.createLinearGradient(rx, ry, rx, ry + rh);
  grad.addColorStop(0, g.top);
  grad.addColorStop(0.55, g.mid);
  grad.addColorStop(1, g.bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(rx, ry, rw, rh);
  // Sun disc + skyline blocks, drawn shapes only.
  const sunR = Math.min(rw, rh) * 0.22;
  const sunX = rx + rw * (0.3 + 0.4 * ((seed * 37) % 10) / 10);
  const sunY = ry + rh * 0.42;
  ctx.fillStyle = g.glow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(20, 8, 40, 0.85)';
  const baseY = ry + rh * 0.72;
  for (let i = 0; i < 5; i++) {
    const bw = rw / 5;
    const bh = rh * (0.12 + 0.16 * (((seed + i) * 53) % 10) / 10);
    ctx.fillRect(rx + i * bw + bw * 0.08, baseY + (rh * 0.28 - bh), bw * 0.84, bh);
  }
  ctx.fillRect(rx, baseY + rh * 0.26, rw, rh * 0.02);
}

function applyGrade(ctx, W, H) {
  const g = GRADES[state.grade];
  ctx.save();
  const grad = ctx.createLinearGradient(0, 0, W * 0.25, H);
  grad.addColorStop(0, g.top);
  grad.addColorStop(0.55, g.mid);
  grad.addColorStop(1, g.bottom);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // Vignette.
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(10,4,24,0.38)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

function fitFont(ctx, text, maxWidth, startPx, family, weight) {
  let px = startPx;
  ctx.font = `${weight} ${px}px ${family}`;
  while (px > 12 && ctx.measureText(text).width > maxWidth) {
    px -= 2;
    ctx.font = `${weight} ${px}px ${family}`;
  }
  return px;
}

function drawLettering(ctx, W, H) {
  const g = GRADES[state.grade];
  const title = (state.title || 'Untitled').toUpperCase();
  const subtitle = state.subtitle || '';
  // Bottom scrim so the title reads over any photo.
  const scrimH = H * 0.34;
  const scrim = ctx.createLinearGradient(0, H - scrimH, 0, H);
  scrim.addColorStop(0, 'rgba(10,4,24,0)');
  scrim.addColorStop(1, 'rgba(10,4,24,0.62)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, H - scrimH, W, H);
  // Top-left city tag.
  const tag = 'SUNSET CITY';
  const tagPx = Math.max(14, Math.round(W * 0.02));
  ctx.font = `800 ${tagPx}px "Arial Black", Arial, sans-serif`;
  ctx.textBaseline = 'alphabetic';
  const tagX = W * 0.045;
  const tagY = H * 0.055;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = W * 0.008;
  ctx.shadowOffsetY = 2;
  try { ctx.letterSpacing = `${tagPx * 0.22}px`; } catch { /* older canvas */ }
  ctx.fillText(tag, tagX, tagY);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = g.glow;
  ctx.fillRect(tagX, tagY + tagPx * 0.28, ctx.measureText(tag).width, Math.max(3, W * 0.004));
  try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  // Title: bold poster lettering with outline + neon shadow.
  const family = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
  const maxW = W * 0.91;
  let titlePx = fitFont(ctx, title, maxW, W * 0.105 * state.titleScale, family, 900);
  ctx.font = `900 ${titlePx}px ${family}`;
  try { ctx.letterSpacing = `${titlePx * 0.015}px`; } catch { /* ignore */ }
  const titleX = W * 0.045;
  const titleY = H - H * 0.075 - (subtitle ? H * 0.052 : 0);
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#160a28';
  ctx.lineWidth = Math.max(4, titlePx * 0.085);
  ctx.shadowColor = 'rgba(255,46,136,0.75)';
  ctx.shadowBlur = W * 0.018;
  ctx.shadowOffsetY = titlePx * 0.04;
  ctx.strokeText(title, titleX, titleY);
  const grad = ctx.createLinearGradient(0, titleY - titlePx, 0, titleY);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.7, '#ffe9f4');
  grad.addColorStop(1, g.glow);
  ctx.fillStyle = grad;
  ctx.fillText(title, titleX, titleY);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  // Subtitle on a gradient pill.
  if (subtitle) {
    const subPx = Math.max(13, Math.round(W * 0.024));
    ctx.font = `800 ${subPx}px "Arial Black", Arial, sans-serif`;
    try { ctx.letterSpacing = `${subPx * 0.18}px`; } catch { /* ignore */ }
    const tw = ctx.measureText(subtitle.toUpperCase()).width;
    const padX = subPx * 0.9;
    const pillW = Math.min(tw + padX * 2, W * 0.91);
    const pillH = subPx * 2.1;
    const pillX = W * 0.045;
    const pillY = H - H * 0.055 - pillH + subPx * 0.55;
    const pg = ctx.createLinearGradient(pillX, 0, pillX + pillW, 0);
    pg.addColorStop(0, g.top);
    pg.addColorStop(1, g.bottom);
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(subtitle.toUpperCase(), pillX + padX, pillY + pillH / 2 + subPx * 0.36);
    try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  }
}

function renderCover(ctx, W, H) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  const gut = Math.max(3, Math.round(W * 0.006));
  const rects = panelRects();
  rects.forEach((r, i) => {
    const rx = r.x * W + (r.x > 0 ? gut : 0);
    const ry = r.y * H + (r.y > 0 ? gut : 0);
    const rw = r.w * W - (r.x > 0 ? gut : 0) - (r.x + r.w < 1 ? gut : 0);
    const rh = r.h * H - (r.y > 0 ? gut : 0) - (r.y + r.h < 1 ? gut : 0);
    const panel = state.panels[i];
    const photo = state.photos[panel.photo];
    if (photo) drawPhotoInto(ctx, photo.img, rx, ry, rw, rh, panel);
    else drawPlaceholderPanel(ctx, rx, ry, rw, rh, i + 1);
  });
  applyGrade(ctx, W, H);
  drawLettering(ctx, W, H);
}

function renderPreview() {
  const [W, H] = SIZES[state.size];
  const scale = Math.min(1, 880 / Math.max(W, H));
  const pw = Math.round(W * scale);
  const ph = Math.round(H * scale);
  if (preview.width !== pw || preview.height !== ph) {
    preview.width = pw;
    preview.height = ph;
  }
  renderCover(pctx, pw, ph);
  if (shotMode !== 'cover' && state.photos.length) {
    // Selection outline on the preview only (never on export).
    const rects = panelRects();
    const r = rects[state.selectedPanel];
    if (r) {
      pctx.save();
      pctx.strokeStyle = '#22d3ee';
      pctx.lineWidth = 3;
      pctx.setLineDash([10, 6]);
      pctx.strokeRect(r.x * pw + 2, r.y * ph + 2, r.w * pw - 4, r.h * ph - 4);
      pctx.restore();
    }
  }
  $('sizeLabel').textContent = `${W} × ${H}`;
  $('emptyHint').style.display = state.photos.length ? 'none' : 'flex';
}

function refreshPanelControls() {
  const rects = panelRects();
  const seg = $('panelSeg');
  seg.innerHTML = '';
  rects.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'seg-btn' + (i === state.selectedPanel ? ' active' : '');
    b.textContent = `Panel ${i + 1}`;
    b.addEventListener('click', () => { state.selectedPanel = i; syncControls(); renderPreview(); });
    seg.appendChild(b);
  });
  const sel = $('panelPhotoSelect');
  sel.innerHTML = '';
  state.photos.forEach((p, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = `${i + 1} · ${p.name}`;
    sel.appendChild(o);
  });
  if (!state.photos.length) {
    const o = document.createElement('option');
    o.value = '';
    o.textContent = 'No photo yet';
    sel.appendChild(o);
  }
  sel.value = String(state.panels[state.selectedPanel].photo);
  syncSliders();
}

function syncSliders() {
  const p = state.panels[state.selectedPanel];
  $('zoomRange').value = String(p.zoom);
  $('offXRange').value = String(p.ox);
  $('offYRange').value = String(p.oy);
  $('zoomVal').textContent = `${p.zoom.toFixed(2)}×`;
  $('offXVal').textContent = p.ox.toFixed(2);
  $('offYVal').textContent = p.oy.toFixed(2);
}

function syncControls() {
  document.querySelectorAll('#layoutSeg .seg-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('#gradeSeg .seg-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  });
  document.querySelectorAll('#sizeSeg .seg-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === state.size);
  });
  if (state.selectedPanel >= panelRects().length) state.selectedPanel = 0;
  refreshPanelControls();
}

function refreshTray() {
  const tray = $('photoTray');
  tray.innerHTML = '';
  if (!state.photos.length) {
    const s = document.createElement('span');
    s.className = 'empty';
    s.textContent = 'No photos yet — add one or try a sample.';
    tray.appendChild(s);
    return;
  }
  state.photos.forEach((p, i) => {
    const img = document.createElement('img');
    img.src = p.url;
    img.alt = p.name;
    img.title = p.name;
    img.className = i === state.pickedPhoto ? 'picked' : '';
    img.addEventListener('click', () => {
      state.pickedPhoto = i;
      state.panels[state.selectedPanel].photo = i;
      refreshTray();
      refreshPanelControls();
      renderPreview();
    });
    tray.appendChild(img);
  });
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ name: file.name, img, url });
    img.onerror = () => reject(new Error(`Could not read ${file.name}`));
    img.src = url;
  });
}

function loadSample(name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ name: `${name}.jpg (sample)`, img, url: SAMPLES[name] });
    img.onerror = () => reject(new Error(`Could not load sample ${name}`));
    img.src = SAMPLES[name];
  });
}

async function addFiles(files) {
  let added = 0;
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    try {
      const photo = await loadImageFile(f);
      state.photos.push(photo);
      added++;
    } catch (e) { setStatus(e.message); }
  }
  afterPhotosChanged(added);
}

async function addSamples(names) {
  let added = 0;
  for (const n of names) {
    if (!SAMPLES[n]) continue;
    try {
      const photo = await loadSample(n);
      state.photos.push(photo);
      added++;
    } catch (e) { setStatus(e.message); }
  }
  afterPhotosChanged(added);
}

function afterPhotosChanged(added) {
  if (added > 0) {
    // First photo fills every panel; later photos fill the next empty panel.
    state.panels.forEach((p, i) => {
      if (state.photos.length === added && i < state.photos.length) p.photo = i % state.photos.length;
      else if (p.photo >= state.photos.length) p.photo = state.photos.length - 1;
    });
    if (state.photos.length === added) state.panels.forEach((p, i) => { p.photo = i % state.photos.length; });
    setStatus(`Loaded ${state.photos.length} photo${state.photos.length === 1 ? '' : 's'} — pick a layout, then Export PNG.`, true);
  }
  refreshTray();
  refreshPanelControls();
  renderPreview();
}

function setStatus(msg, ok) {
  const el = $('statusLine');
  el.textContent = msg;
  el.classList.toggle('ok', !!ok);
}

function exportPNG() {
  const [W, H] = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = W;
  off.height = H;
  renderCover(off.getContext('2d'), W, H);
  off.toBlob((blob) => {
    if (!blob) { setStatus('Export failed — canvas could not make a PNG.'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vice-cover-${state.size}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setStatus(`Exported ${W} × ${H} PNG (${(blob.size / 1024).toFixed(0)} KiB).`, true);
  }, 'image/png');
}

function panelAtPoint(clientX, clientY) {
  const rect = preview.getBoundingClientRect();
  const x = (clientX - rect.left) / rect.width;
  const y = (clientY - rect.top) / rect.height;
  const rects = panelRects();
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return { index: i, fx: x, fy: y, rect: r };
  }
  return null;
}

function bindEvents() {
  $('addPhotosBtn').addEventListener('click', () => $('fileInput').click());
  $('fileInput').addEventListener('change', (e) => { addFiles([...e.target.files]); e.target.value = ''; });
  $('samplePierBtn').addEventListener('click', () => addSamples(['pier']));
  $('sampleBlvdBtn').addEventListener('click', () => addSamples(['boulevard']));
  $('exportBtn').addEventListener('click', exportPNG);
  $('exportBtn2').addEventListener('click', exportPNG);

  const dz = $('dropZone');
  dz.addEventListener('click', (e) => { if (e.target === preview || e.target === dz) $('fileInput').click(); });
  ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('dragging'); }));
  ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('dragging'); }));
  dz.addEventListener('drop', (e) => addFiles([...(e.dataTransfer?.files ?? [])]));

  document.querySelectorAll('#layoutSeg .seg-btn').forEach((b) => {
    b.addEventListener('click', () => { state.layout = b.dataset.layout; syncControls(); renderPreview(); });
  });
  document.querySelectorAll('#gradeSeg .seg-btn').forEach((b) => {
    b.addEventListener('click', () => { state.grade = b.dataset.grade; syncControls(); renderPreview(); });
  });
  document.querySelectorAll('#sizeSeg .seg-btn').forEach((b) => {
    b.addEventListener('click', () => { state.size = b.dataset.size; syncControls(); renderPreview(); });
  });
  $('panelPhotoSelect').addEventListener('change', (e) => {
    state.panels[state.selectedPanel].photo = Number(e.target.value) || 0;
    renderPreview();
  });
  $('zoomRange').addEventListener('input', (e) => { state.panels[state.selectedPanel].zoom = Number(e.target.value); syncSliders(); renderPreview(); });
  $('offXRange').addEventListener('input', (e) => { state.panels[state.selectedPanel].ox = Number(e.target.value); syncSliders(); renderPreview(); });
  $('offYRange').addEventListener('input', (e) => { state.panels[state.selectedPanel].oy = Number(e.target.value); syncSliders(); renderPreview(); });
  $('fillAllBtn').addEventListener('click', () => {
    const idx = state.panels[state.selectedPanel].photo;
    state.panels.forEach((p) => { p.photo = idx; });
    refreshPanelControls();
    renderPreview();
    setStatus('Same photo in every panel.', true);
  });
  $('resetCropBtn').addEventListener('click', () => {
    const p = state.panels[state.selectedPanel];
    p.zoom = 1; p.ox = 0; p.oy = 0;
    syncSliders(); renderPreview();
  });
  $('titleInput').addEventListener('input', (e) => { state.title = e.target.value; renderPreview(); });
  $('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; renderPreview(); });
  $('titleSizeRange').addEventListener('input', (e) => {
    state.titleScale = Number(e.target.value) / 100;
    $('titleSizeVal').textContent = `${e.target.value}%`;
    renderPreview();
  });

  // Drag to pan, wheel to zoom, click to select — on the preview canvas.
  let drag = null;
  preview.addEventListener('pointerdown', (e) => {
    const hit = panelAtPoint(e.clientX, e.clientY);
    if (!hit) return;
    state.selectedPanel = hit.index;
    syncControls();
    drag = { x: e.clientX, y: e.clientY, panel: state.panels[hit.index], rect: hit.rect };
    preview.setPointerCapture(e.pointerId);
    renderPreview();
  });
  preview.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const rect = preview.getBoundingClientRect();
    const dxFrac = (e.clientX - drag.x) / rect.width / drag.rect.w;
    const dyFrac = (e.clientY - drag.y) / rect.height / drag.rect.h;
    drag.panel.ox = Math.max(-0.5, Math.min(0.5, drag.panel.ox + dxFrac));
    drag.panel.oy = Math.max(-0.5, Math.min(0.5, drag.panel.oy + dyFrac));
    drag.x = e.clientX;
    drag.y = e.clientY;
    syncSliders();
    renderPreview();
  });
  preview.addEventListener('pointerup', () => { drag = null; });
  preview.addEventListener('wheel', (e) => {
    e.preventDefault();
    const hit = panelAtPoint(e.clientX, e.clientY);
    if (!hit) return;
    state.selectedPanel = hit.index;
    const p = state.panels[hit.index];
    p.zoom = Math.max(1, Math.min(3, p.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
    syncControls();
    renderPreview();
  }, { passive: false });
}

async function initFromQuery() {
  const caption = params.get('caption');
  if (caption) { state.title = caption; $('titleInput').value = caption; }
  const subtitle = params.get('subtitle');
  if (subtitle) { state.subtitle = subtitle; $('subtitleInput').value = subtitle; }
  if (LAYOUTS[params.get('layout')]) state.layout = params.get('layout');
  if (GRADES[params.get('grade')]) state.grade = params.get('grade');
  if (SIZES[params.get('size')]) state.size = params.get('size');
  const ts = params.get('titlesize');
  if (ts && Number(ts) >= 60 && Number(ts) <= 140) {
    state.titleScale = Number(ts) / 100;
    $('titleSizeRange').value = ts;
    $('titleSizeVal').textContent = `${ts}%`;
  }
  const photoParam = params.get('photo');
  if (photoParam) {
    await addSamples(photoParam.split(',').map((s) => s.trim()).filter(Boolean));
  }
  // Params changed the state after the first syncControls() at boot, so
  // re-sync the buttons/sliders to match what is actually rendered.
  syncControls();
  if (shotMode === 'cover') {
    document.body.classList.add('shot-cover');
    // Cover shot: canvas fills the viewport at the export aspect.
    const [W, H] = SIZES[state.size];
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / W, vh / H);
    preview.width = Math.round(W * scale);
    preview.height = Math.round(H * scale);
    renderCover(pctx, preview.width, preview.height);
  } else {
    renderPreview();
  }
  window.__vice = { ready: true };
}

bindEvents();
syncControls();
refreshTray();
initFromQuery();
