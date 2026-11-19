// Vice Cover Forge — page wiring: uploads, panel editing, grades, export.
//
// The photo a user picks is read with a local object URL and never leaves
// the machine: there is no upload to any server, no fetch, no network at all.

import { GRADES, LAYOUT_PANELS, drawCoverArt, renderCover } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const statusEl = document.getElementById('status');
const panelsEl = document.getElementById('panels');
const fileInput = document.getElementById('photoFile');
const dropzone = document.getElementById('dropzone');

/** Photos the page can draw: samples bundled with the app, uploads, skyline. */
const photos = { pier: null, boulevard: null, skyline: null };
/** Uploaded images, in the order they were picked. */
const uploads = [];
/** Which panel an upload or the panel editor targets. */
let selectedPanel = 0;

/** The poster's current state; panels are padded or trimmed per layout. */
const state = {
  layout: 'hero',
  grade: 'sunset',
  title: 'SUNSET HEIST',
  subtitle: 'NEON STREETS',
  panels: [
    { photo: 'pier', zoom: 1.15, ox: 0, oy: 0 },
    { photo: 'boulevard', zoom: 1, ox: 0, oy: 0 },
    { photo: 'skyline', zoom: 1, ox: 0, oy: 0 },
  ],
};

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function fitPanelsToLayout() {
  const want = LAYOUT_PANELS[state.layout];
  const fallbacks = ['pier', 'boulevard', 'skyline', 'pier'];
  while (state.panels.length < want) {
    const i = state.panels.length;
    state.panels.push({ photo: fallbacks[i % fallbacks.length], zoom: 1, ox: 0, oy: 0 });
  }
  state.panels.length = want;
  if (selectedPanel >= want) selectedPanel = 0;
}

function redraw() {
  fitPanelsToLayout();
  drawCoverArt(canvas, state, photos);
}

/** Photo choices for a panel's select: samples, skyline, then uploads. */
function photoOptions() {
  const opts = [
    ['pier', 'Sample — Pier'],
    ['boulevard', 'Sample — Boulevard'],
    ['skyline', 'Skyline (drawn)'],
  ];
  uploads.forEach((img, i) => opts.push([`upload:${i}`, `Uploaded ${i + 1}`]));
  return opts;
}

/** Rebuilds the per-panel editor cards under the preview. */
function buildPanelEditors() {
  fitPanelsToLayout();
  panelsEl.innerHTML = '';
  state.panels.forEach((panel, i) => {
    const card = document.createElement('fieldset');
    card.className = `panel-card${i === selectedPanel ? ' selected' : ''}`;
    const legend = document.createElement('legend');
    legend.textContent = `Panel ${i + 1}`;
    card.append(legend);

    const pick = document.createElement('select');
    pick.setAttribute('aria-label', `Photo for panel ${i + 1}`);
    for (const [value, label] of photoOptions()) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      if (value === panel.photo) opt.selected = true;
      pick.append(opt);
    }
    pick.addEventListener('change', () => {
      panel.photo = pick.value;
      selectedPanel = i;
      buildPanelEditors();
      redraw();
    });
    card.append(pick);

    for (const [key, label, min, max, step] of [
      ['zoom', 'Zoom', 1, 2.5, 0.05],
      ['ox', 'Pan X', -1, 1, 0.05],
      ['oy', 'Pan Y', -1, 1, 0.05],
    ]) {
      const row = document.createElement('label');
      row.className = 'slider-row';
      row.textContent = label;
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = String(min);
      slider.max = String(max);
      slider.step = String(step);
      slider.value = String(panel[key]);
      slider.setAttribute('aria-label', `${label} for panel ${i + 1}`);
      slider.addEventListener('input', () => {
        panel[key] = Number(slider.value);
        selectedPanel = i;
        redraw();
      });
      row.append(slider);
      card.append(row);
    }

    card.addEventListener('click', () => {
      selectedPanel = i;
      buildPanelEditors();
    });
    panelsEl.append(card);
  });
}

/** Reads picked files, draws them, and assigns the first to the selection. */
async function takeFiles(files) {
  const list = [...files].filter((f) => f.type.startsWith('image/'));
  if (!list.length) {
    statusEl.textContent = 'That file is not an image.';
    return;
  }
  for (const file of list) {
    const img = await loadImage(URL.createObjectURL(file));
    uploads.push(img);
    photos[`upload:${uploads.length - 1}`] = img;
  }
  state.panels[selectedPanel].photo = `upload:${uploads.length - list.length}`;
  statusEl.textContent = `${list.length} photo${list.length > 1 ? 's' : ''} loaded — kept on this machine only.`;
  buildPanelEditors();
  redraw();
}

function setStatus(text) {
  statusEl.textContent = text;
}

/** Renders at an export size and starts a PNG download. */
function exportPng(width, height) {
  const out = renderCover(width, height, state, photos);
  out.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed in this browser.');
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${width}x${height}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
    setStatus(`Saved vice-cover-${width}x${height}.png`);
  }, 'image/png');
}

/** Test hook the screenshot pass uses: render + check the pixels are alive. */
window.__vice = {
  state,
  exportCheck(width, height) {
    const out = renderCover(width, height, state, photos);
    const ctx = out.getContext('2d');
    const data = ctx.getImageData(0, 0, width, height).data;
    let sum = 0;
    let sumSq = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += 401 * 4) {
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      sum += lum;
      sumSq += lum * lum;
      n += 1;
    }
    const mean = sum / n;
    const variance = sumSq / n - mean * mean;
    return {
      width, height,
      dataUrlLength: out.toDataURL('image/png').length,
      nonBlank: variance > 25 && mean > 8 && mean < 247,
    };
  },
};

document.querySelectorAll('[data-layout]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.layout = btn.dataset.layout;
    document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b === btn));
    buildPanelEditors();
    redraw();
  });
});
document.querySelectorAll('[data-grade]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.grade = btn.dataset.grade;
    document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b === btn));
    redraw();
  });
});
document.querySelectorAll('[data-export]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const [w, h] = btn.dataset.export.split('x').map(Number);
    exportPng(w, h);
  });
});
titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
fileInput.addEventListener('change', () => takeFiles(fileInput.files));
dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragging'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragging'));
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragging');
  takeFiles(e.dataTransfer.files);
});

/** Loads the bundled samples, then either runs a shot scene or the editor. */
async function boot() {
  try {
    photos.pier = await loadImage('samples/pier.jpg');
    photos.boulevard = await loadImage('samples/boulevard.jpg');
  } catch {
    setStatus('Samples did not load; Skyline panels still work.');
  }
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (shot) {
    await runShot(shot, query, async (scene) => {
      if (scene.size) {
        canvas.width = scene.size.w;
        canvas.height = scene.size.h;
      }
      if (scene.shot === 'cover') document.body.classList.add('shot-cover');
      state.layout = scene.layout;
      state.grade = scene.grade;
      state.title = scene.title;
      state.subtitle = scene.subtitle;
      state.panels = scene.panels;
      titleInput.value = scene.title;
      subtitleInput.value = scene.subtitle;
      document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === scene.layout));
      document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b.dataset.grade === scene.grade));
      buildPanelEditors();
      redraw();
    });
  } else {
    buildPanelEditors();
    redraw();
  }
}

boot();
