// Vice City Cover Lab — editor UI: uploads, drag-to-pan, zoom, layout/grade/caption, export.
import { GRADES, LAYOUTS, makeSampleScene, renderCover, exportCoverCanvas, EXPORT_SIZES } from './cover.js';

const stage = document.getElementById('stage');
const sctx = stage.getContext('2d');
const panelControlsEl = document.getElementById('panelControls');
const exportStatusEl = document.getElementById('exportStatus');

// Editor state. panels[i] = { img, zoom, x, y, label } ; img is a canvas or Image.
const state = {
  layout: 'strip',
  grade: 'sunset',
  title: 'Sunset Heist',
  subtitle: 'Vice City · Summer 2026',
  captionStyle: 'block',
  captionPos: 'top',
  panels: [],
};

function panelCount() {
  return state.layout === 'quad' ? 4 : 3;
}

function ensurePanels() {
  while (state.panels.length < panelCount()) {
    state.panels.push({ img: null, zoom: 1, x: 0, y: 0, label: `Panel ${state.panels.length + 1}` });
  }
  state.panels.length = panelCount();
}

function draw() {
  ensurePanels();
  renderCover(sctx, stage.width, stage.height, state);
}

function loadSample(scene, label) {
  const canvas = makeSampleScene(scene, 1080, 1080);
  const idx = state.panels.findIndex((p) => !p.img);
  const target = idx === -1 ? 0 : idx;
  state.panels[target] = { img: canvas, zoom: 1, x: 0, y: 0, label: `${label} · ${state.panels[target]?.label || 'Panel'}` };
  buildPanelControls();
  draw();
}

function loadFiles(files) {
  const imgs = [...files].filter((f) => f.type.startsWith('image/')).slice(0, 3);
  if (!imgs.length) return;
  let done = 0;
  imgs.forEach((file) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const idx = state.panels.findIndex((p) => !p.img);
      const target = idx === -1 ? done % panelCount() : idx;
      state.panels[target] = { img, zoom: 1, x: 0, y: 0, label: file.name };
      done++;
      if (done === imgs.length) {
        buildPanelControls();
        draw();
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); done++; };
    img.src = url;
  });
}

function buildPanelControls() {
  ensurePanels();
  panelControlsEl.innerHTML = '';
  state.panels.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'panel-card';
    const head = document.createElement('header');
    const name = document.createElement('span');
    name.textContent = `Panel ${i + 1} — ${p.img ? p.label : 'empty'}`;
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', () => {
      state.panels[i] = { img: null, zoom: 1, x: 0, y: 0, label: `Panel ${i + 1}` };
      buildPanelControls();
      draw();
    });
    head.append(name, clearBtn);
    card.append(head);

    const zoomLabel = document.createElement('label');
    zoomLabel.textContent = `Zoom ${p.zoom.toFixed(2)}×`;
    const zoom = document.createElement('input');
    zoom.type = 'range';
    zoom.min = '1';
    zoom.max = '3';
    zoom.step = '0.05';
    zoom.value = String(p.zoom);
    zoom.addEventListener('input', () => {
      p.zoom = Number(zoom.value);
      zoomLabel.textContent = `Zoom ${p.zoom.toFixed(2)}×`;
      draw();
    });
    zoomLabel.append(zoom);
    card.append(zoomLabel);

    const fitBtn = document.createElement('button');
    fitBtn.type = 'button';
    fitBtn.className = 'fit-toggle';
    fitBtn.textContent = p.fill === false ? 'Fit: whole photo' : 'Fill: crop to panel';
    fitBtn.addEventListener('click', () => {
      p.fill = p.fill === false ? true : false;
      fitBtn.textContent = p.fill === false ? 'Fit: whole photo' : 'Fill: crop to panel';
      draw();
    });
    card.append(fitBtn);

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'fit-toggle';
    resetBtn.textContent = 'Reset position';
    resetBtn.addEventListener('click', () => {
      p.zoom = 1; p.x = 0; p.y = 0;
      zoom.value = '1';
      zoomLabel.textContent = 'Zoom 1.00×';
      draw();
    });
    card.append(resetBtn);
    panelControlsEl.append(card);
  });
}

// Drag to pan the photo under the pointer.
let drag = null;
function stageRectAt(clientX, clientY) {
  const r = stage.getBoundingClientRect();
  const x = ((clientX - r.left) / r.width) * stage.width;
  const y = ((clientY - r.top) / r.height) * stage.height;
  return { x, y, r };
}
stage.addEventListener('pointerdown', (e) => {
  const { x, y } = stageRectAt(e.clientX, e.clientY);
  // find which panel rect contains the point (same math as cover.js layoutRects)
  const rects = panelRectsForStage();
  const idx = rects.findIndex((rc) => x >= rc.x && x <= rc.x + rc.w && y >= rc.y && y <= rc.y + rc.h);
  if (idx === -1 || !state.panels[idx]?.img) return;
  drag = { idx, lastX: x, lastY: y };
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const { x, y } = stageRectAt(e.clientX, e.clientY);
  const p = state.panels[drag.idx];
  const rect = panelRectsForStage()[drag.idx];
  p.x += (x - drag.lastX) / rect.w;
  p.y += (y - drag.lastY) / rect.h;
  p.x = Math.max(-0.6, Math.min(0.6, p.x));
  p.y = Math.max(-0.6, Math.min(0.6, p.y));
  drag.lastX = x;
  drag.lastY = y;
  draw();
});
stage.addEventListener('pointerup', () => { drag = null; });
stage.addEventListener('pointercancel', () => { drag = null; });

// Panel rects on the square preview stage (mirrors cover.js layoutRects).
function panelRectsForStage() {
  const w = stage.width;
  const h = stage.height;
  const gap = Math.round(Math.min(w, h) * 0.012);
  const pad = Math.round(Math.min(w, h) * 0.02);
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  if (state.layout === 'strip') {
    const pw = (iw - gap * 2) / 3;
    return [
      { x: pad, y: pad, w: pw, h: ih },
      { x: pad + pw + gap, y: pad, w: pw, h: ih },
      { x: pad + (pw + gap) * 2, y: pad, w: pw, h: ih },
    ];
  }
  if (state.layout === 'hero') {
    const lw = iw * 0.6;
    const rw = iw - lw - gap;
    const rh = (ih - gap) / 2;
    return [
      { x: pad, y: pad, w: lw, h: ih },
      { x: pad + lw + gap, y: pad, w: rw, h: rh },
      { x: pad + lw + gap, y: pad + rh + gap, w: rw, h: rh },
    ];
  }
  const pw = (iw - gap) / 2;
  const ph = (ih - gap) / 2;
  return [
    { x: pad, y: pad, w: pw, h: ph },
    { x: pad + pw + gap, y: pad, w: pw, h: ph },
    { x: pad, y: pad + ph + gap, w: pw, h: ph },
    { x: pad + pw + gap, y: pad + ph + gap, w: pw, h: ph },
  ];
}

// Drag-drop files onto the stage.
stage.addEventListener('dragover', (e) => { e.preventDefault(); });
stage.addEventListener('drop', (e) => {
  e.preventDefault();
  if (e.dataTransfer?.files?.length) loadFiles(e.dataTransfer.files);
});

// Toolbar wiring.
function wireChipRow(id, key, values) {
  const row = document.getElementById(id);
  row.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      row.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state[key] = btn.dataset[Object.keys(btn.dataset)[0]];
      if (key === 'layout') buildPanelControls();
      draw();
    });
  });
}
wireChipRow('layoutRow', 'layout');
wireChipRow('gradeRow', 'grade');
wireChipRow('captionStyleRow', 'captionStyle');
wireChipRow('captionPosRow', 'captionPos');

document.getElementById('fileInput').addEventListener('change', (e) => {
  loadFiles(e.target.files);
  e.target.value = '';
});
document.getElementById('sampleBoulevardBtn').addEventListener('click', () => loadSample('boulevard', 'Boulevard Dusk'));
document.getElementById('samplePierBtn').addEventListener('click', () => loadSample('pier', 'Pier Neon'));

document.getElementById('titleInput').addEventListener('input', (e) => { state.title = e.target.value; draw(); });
document.getElementById('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; draw(); });

function downloadPNG(w, h) {
  const canvas = exportCoverCanvas(state, w, h);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-city-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    exportStatusEl.textContent = `Exported ${w} × ${h} PNG — check your downloads.`;
  }, 'image/png');
}

document.querySelectorAll('[data-export]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const [w, h] = btn.dataset.export.split('x').map(Number);
    downloadPNG(w, h);
  });
});
document.getElementById('exportAllBtn').addEventListener('click', () => {
  EXPORT_SIZES.forEach((s, i) => setTimeout(() => downloadPNG(s.w, s.h), i * 350));
  exportStatusEl.textContent = 'Exporting all three sizes…';
});

// Initial state: Boulevard Dusk sample in panel 1 so the editor opens with a photo loaded.
ensurePanels();
loadSample('boulevard', 'Boulevard Dusk');
buildPanelControls();
draw();
