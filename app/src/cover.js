// Vice City Cover Lab — render engine (pure canvas, no network, no Math.random).
// Layouts: strip (3 vertical panels), hero (big left + 2 stacked right), quad (2x2).
// Grades: sunset / neon / palm. Captions: block / neon / gold, top or bottom.

export const GRADES = {
  sunset: {
    label: 'Sunset',
    skyTop: '#2b1055', skyMid: '#ff5e62', skyLow: '#ffb347',
    tint: 'rgba(255, 94, 98, 0.14)', vignette: 'rgba(43, 16, 85, 0.34)',
    caption: '#ffffff', accent: '#ffb347',
  },
  neon: {
    label: 'Neon Nights',
    skyTop: '#0b0620', skyMid: '#c026d3', skyLow: '#2ee6ff',
    tint: 'rgba(192, 38, 211, 0.16)', vignette: 'rgba(11, 6, 32, 0.38)',
    caption: '#ff2e88', accent: '#2ee6ff',
  },
  palm: {
    label: 'Palm Dusk',
    skyTop: '#1b1035', skyMid: '#7c3aed', skyLow: '#14b8a6',
    tint: 'rgba(124, 58, 237, 0.15)', vignette: 'rgba(27, 16, 53, 0.36)',
    caption: '#f5f3ff', accent: '#14b8a6',
  },
};

export const LAYOUTS = ['strip', 'hero', 'quad'];
export const CAPTION_STYLES = ['block', 'neon', 'gold'];

// Fixed-seed pseudo-random: deterministic, no Math.random in the render path.
function seeded(i, salt) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function skyGradient(ctx, w, h, grade) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, grade.skyTop);
  g.addColorStop(0.55, grade.skyMid);
  g.addColorStop(1, grade.skyLow);
  return g;
}

function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(10, -40, 26, -72);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (-Math.PI / 6) - (i * Math.PI / 7.5);
    const len = 42 - Math.abs(i - 2.5) * 6;
    ctx.beginPath();
    ctx.moveTo(26, -72);
    ctx.quadraticCurveTo(
      26 + Math.cos(a) * len * 0.6, -72 + Math.sin(a) * len * 0.6 - 8,
      26 + Math.cos(a) * len, -72 + Math.sin(a) * len + 10,
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawSkyline(ctx, w, h, color, baseY, seedSalt) {
  ctx.fillStyle = color;
  let x = 0;
  let i = 0;
  while (x < w) {
    const bw = w * (0.06 + seeded(i, seedSalt) * 0.09);
    const bh = h * (0.10 + seeded(i + 40, seedSalt) * 0.22);
    ctx.fillRect(x, baseY - bh, bw, bh);
    if (seeded(i + 80, seedSalt) > 0.6) {
      ctx.fillRect(x + bw * 0.3, baseY - bh - h * 0.05, bw * 0.4, h * 0.05);
    }
    x += bw + w * 0.012;
    i++;
  }
}

function drawSun(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Procedural sample scene, drawn onto an offscreen canvas and returned as a canvas.
// scene: 'boulevard' | 'pier'
export function makeSampleScene(scene, w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  if (scene === 'boulevard') {
    const grade = GRADES.sunset;
    ctx.fillStyle = skyGradient(ctx, w, h, grade);
    ctx.fillRect(0, 0, w, h);
    drawSun(ctx, w * 0.5, h * 0.42, w * 0.13, '#ffe08a');
    // skyline
    drawSkyline(ctx, w, h, '#3a1c5e', h * 0.72, 3);
    drawSkyline(ctx, w, h, '#241040', h * 0.78, 7);
    // boulevard road with perspective
    ctx.fillStyle = '#1c0b33';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w * 0.38, h * 0.78);
    ctx.lineTo(w * 0.62, h * 0.78);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    // lane dashes
    ctx.fillStyle = '#ffd166';
    for (let i = 0; i < 5; i++) {
      const t = i / 5;
      const y = h * (0.80 + t * 0.18);
      const ww = w * (0.006 + t * 0.02);
      ctx.fillRect(w * 0.5 - ww / 2, y, ww, h * 0.02);
    }
    // palms lining the boulevard
    drawPalm(ctx, w * 0.10, h * 0.82, w * 0.0011, '#160a26');
    drawPalm(ctx, w * 0.88, h * 0.80, w * 0.0012, '#160a26');
    drawPalm(ctx, w * 0.30, h * 0.74, w * 0.0008, '#2a1248');
    drawPalm(ctx, w * 0.70, h * 0.74, w * 0.0008, '#2a1248');
    // warm haze
    ctx.fillStyle = 'rgba(255, 179, 71, 0.12)';
    ctx.fillRect(0, h * 0.55, w, h * 0.45);
  } else {
    // pier — night, neon
    const grade = GRADES.neon;
    ctx.fillStyle = skyGradient(ctx, w, h, grade);
    ctx.fillRect(0, 0, w, h);
    // stars (fixed positions)
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 26; i++) {
      const sx = seeded(i, 11) * w;
      const sy = seeded(i, 23) * h * 0.4;
      const sr = 1 + seeded(i, 37) * 2;
      ctx.globalAlpha = 0.4 + seeded(i, 51) * 0.6;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // ferris wheel silhouette with neon bulbs
    const cx = w * 0.72;
    const cy = h * 0.34;
    const r = w * 0.17;
    ctx.strokeStyle = '#1a0b2e';
    ctx.lineWidth = w * 0.012;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();
    const bulbs = ['#ff2e88', '#2ee6ff', '#ffb347', '#a855f7'];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.fillStyle = bulbs[i % bulbs.length];
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, w * 0.012, 0, Math.PI * 2);
      ctx.fill();
    }
    // sea with neon reflections
    ctx.fillStyle = '#0a0618';
    ctx.fillRect(0, h * 0.62, w, h * 0.38);
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = bulbs[i % bulbs.length];
      ctx.globalAlpha = 0.35;
      const ry = h * (0.66 + i * 0.032);
      const rw = w * (0.05 + seeded(i, 61) * 0.12);
      ctx.fillRect(cx - rw / 2 + (seeded(i, 71) - 0.5) * w * 0.1, ry, rw, h * 0.008);
    }
    ctx.globalAlpha = 1;
    // pier planks
    ctx.fillStyle = '#160d2b';
    ctx.fillRect(0, h * 0.78, w, h * 0.22);
    ctx.strokeStyle = '#2a1748';
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const x = (i / 9) * w;
      ctx.beginPath();
      ctx.moveTo(x, h * 0.78);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    drawPalm(ctx, w * 0.08, h * 0.80, w * 0.0011, '#0d0618');
  }
  return c;
}

// Panel rectangles for a layout inside a cover of size w x h.
// gap is the gutter between panels, in px at the cover's own scale.
export function layoutRects(layout, w, h) {
  const gap = Math.round(Math.min(w, h) * 0.012);
  const pad = Math.round(Math.min(w, h) * 0.02);
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  if (layout === 'strip') {
    const pw = (iw - gap * 2) / 3;
    return [
      { x: pad, y: pad, w: pw, h: ih },
      { x: pad + pw + gap, y: pad, w: pw, h: ih },
      { x: pad + (pw + gap) * 2, y: pad, w: pw, h: ih },
    ];
  }
  if (layout === 'hero') {
    const lw = iw * 0.6;
    const rw = iw - lw - gap;
    const rh = (ih - gap) / 2;
    return [
      { x: pad, y: pad, w: lw, h: ih },
      { x: pad + lw + gap, y: pad, w: rw, h: rh },
      { x: pad + lw + gap, y: pad + rh + gap, w: rw, h: rh },
    ];
  }
  // quad
  const pw = (iw - gap) / 2;
  const ph = (ih - gap) / 2;
  return [
    { x: pad, y: pad, w: pw, h: ph },
    { x: pad + pw + gap, y: pad, w: pw, h: ph },
    { x: pad, y: pad + ph + gap, w: pw, h: ph },
    { x: pad + pw + gap, y: pad + ph + gap, w: pw, h: ph },
  ];
}

function drawPhotoInto(ctx, img, rect, pan) {
  // pan: { zoom (>=1), x, y, fill } — offset in fractions of the rect.
  // fill (default): cover the panel, cropping the overflow. fit: show the whole photo.
  const iw = img.width;
  const ih = img.height;
  const base = pan.fill === false
    ? Math.min(rect.w / iw, rect.h / ih)
    : Math.max(rect.w / iw, rect.h / ih);
  const scale = base * (pan.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = rect.x + (rect.w - dw) / 2 + (pan.x || 0) * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + (pan.y || 0) * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawCaption(ctx, w, h, state) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  const title = (state.title || '').trim();
  const subtitle = (state.subtitle || '').trim();
  if (!title && !subtitle) return;

  const scale = Math.min(w, h) / 1080;
  const top = state.captionPos === 'top';
  const titleSize = Math.round(92 * scale);
  const subSize = Math.round(34 * scale);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const cx = w / 2;
  const bandH = Math.round((title ? titleSize * 1.15 : 0) + (subtitle ? subSize * 1.4 : 0) + 28 * scale);
  const bandY = top ? Math.round(h * 0.035) : Math.round(h - h * 0.035 - bandH);

  if (state.captionStyle === 'block') {
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.fillRect(w * 0.06, bandY, w * 0.88, bandH);
    ctx.fillStyle = '#14082a';
  } else if (state.captionStyle === 'neon') {
    ctx.fillStyle = 'rgba(16,4,32,0.72)';
    ctx.fillRect(w * 0.06, bandY, w * 0.88, bandH);
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = 26 * scale;
    ctx.fillStyle = '#ff2e88';
  } else {
    // gold
    ctx.fillStyle = 'rgba(20,8,42,0.78)';
    ctx.fillRect(w * 0.06, bandY, w * 0.88, bandH);
    const g = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
    g.addColorStop(0, '#ffe08a');
    g.addColorStop(1, '#ff8c42');
    ctx.fillStyle = g;
  }

  let ty = bandY + bandH / 2;
  if (title && subtitle) ty = bandY + bandH * 0.38;
  if (title) {
    ctx.font = `900 ${titleSize}px Impact, "Arial Narrow", sans-serif`;
    ctx.fillText(title.toUpperCase(), cx, ty, w * 0.84);
  }
  if (subtitle) {
    const sy = title ? bandY + bandH * 0.76 : bandY + bandH / 2;
    ctx.font = `700 ${subSize}px "Arial Narrow", Impact, sans-serif`;
    ctx.fillStyle = state.captionStyle === 'block' ? '#5b2a86' : grade.accent;
    ctx.fillText(subtitle, cx, sy, w * 0.84);
  }
  ctx.restore();
}

// Render the whole cover onto ctx at size w x h.
// state: { layout, grade, title, subtitle, captionStyle, captionPos, panels: [{img, zoom, x, y, fill}] }
export function renderCover(ctx, w, h, state) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = skyGradient(ctx, w, h, grade);
  ctx.fillRect(0, 0, w, h);

  const rects = layoutRects(state.layout, w, h);
  const panels = state.panels || [];
  rects.forEach((rect, i) => {
    const p = panels[i];
    if (p && p.img) {
      drawPhotoInto(ctx, p.img, rect, { zoom: p.zoom || 1, x: p.x || 0, y: p.y || 0, fill: p.fill !== false });
    } else {
      // empty panel: dark placeholder with a thin neon frame
      ctx.fillStyle = 'rgba(10,4,24,0.55)';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = Math.max(1, Math.min(w, h) * 0.002);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }
    // panel frame
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.004);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });

  // grade wash + vignette
  ctx.fillStyle = grade.tint;
  ctx.fillRect(0, 0, w, h);
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, grade.vignette);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  drawCaption(ctx, w, h, state);
}

// Render at full export size and return the canvas.
export function exportCoverCanvas(state, w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  renderCover(c.getContext('2d'), w, h, state);
  return c;
}

export const EXPORT_SIZES = [
  { label: '1080 × 1080', w: 1080, h: 1080 },
  { label: '1080 × 1350', w: 1080, h: 1350 },
  { label: '1920 × 1080', w: 1920, h: 1080 },
];
