// Vice Cover Forge — the cover renderer.
//
// Everything on the poster is drawn here: the photo panels, the procedural
// sunset skyline used when a panel has no photo, the colour grade washes and
// the bold title lettering. No artwork, font or image comes from outside the
// app: photos are the user's own uploads or the kit's bundled samples, the
// lettering uses system sans-serif, and the skyline is generated below from a
// fixed seed, so two renders of the same state are byte-identical.

/** Colour grades: sky stops, sun colour, wash tints and accent for text. */
export const GRADES = {
  sunset: {
    skyTop: '#2b1055', skyMid: '#c94b7c', skyBot: '#ff9a56', sun: '#ffd166',
    washTop: 'rgba(255, 110, 60, 0.10)', washBot: 'rgba(190, 40, 120, 0.22)',
    accent: '#ffb347', band: 'rgba(20, 4, 18, 0.62)',
  },
  neon: {
    skyTop: '#12002e', skyMid: '#7b1fa2', skyBot: '#ff2e88', sun: '#22e6ff',
    washTop: 'rgba(255, 0, 180, 0.14)', washBot: 'rgba(0, 220, 255, 0.16)',
    accent: '#22e6ff', band: 'rgba(10, 2, 26, 0.66)',
  },
  dusk: {
    skyTop: '#0b1035', skyMid: '#3b2d8f', skyBot: '#e0647a', sun: '#f4e3c2',
    washTop: 'rgba(60, 40, 160, 0.16)', washBot: 'rgba(20, 10, 60, 0.24)',
    accent: '#c9b8ff', band: 'rgba(8, 6, 28, 0.66)',
  },
};

/** Layout names the editor offers. */
export const LAYOUTS = ['hero', 'grid', 'strip'];

/** How many panels each layout holds. */
export const LAYOUT_PANELS = { hero: 3, grid: 4, strip: 3 };

/** Small deterministic PRNG so the procedural skyline never changes. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Draws a synthwave cityscape (gradient sky, striped sun, tower silhouettes
 * with lit windows, dark foreground) into `ctx` covering `rect`.
 * `seed` picks the skyline; the same seed always draws the same city.
 */
export function drawSkyline(ctx, rect, gradeName, seed) {
  const g = GRADES[gradeName] ?? GRADES.sunset;
  const { x, y, w, h } = rect;
  const rnd = mulberry32(seed * 7919 + 13);
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, g.skyTop);
  sky.addColorStop(0.55, g.skyMid);
  sky.addColorStop(1, g.skyBot);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);

  // Striped sun low on the horizon.
  const sunR = h * 0.17;
  const sunX = x + w * 0.68;
  const sunY = y + h * 0.52;
  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 2.1);
  glow.addColorStop(0, g.sun);
  glow.addColorStop(1, 'rgba(255, 120, 90, 0)');
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = g.sun;
  ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);
  ctx.fillStyle = g.skyMid;
  let stripeY = sunY + sunR * 0.08;
  let stripeH = h * 0.012;
  while (stripeY < sunY + sunR) {
    ctx.fillRect(sunX - sunR, stripeY, sunR * 2, stripeH);
    stripeY += stripeH + h * 0.035;
    stripeH *= 1.5;
  }
  ctx.restore();

  // Back towers, then front towers with lit windows.
  const horizon = y + h * 0.78;
  for (const layer of [0, 1]) {
    let bx = x - w * 0.02;
    while (bx < x + w) {
      const bw = w * (0.05 + rnd() * (layer === 0 ? 0.07 : 0.05));
      const bh = h * (layer === 0 ? 0.16 + rnd() * 0.16 : 0.26 + rnd() * 0.3);
      ctx.fillStyle = layer === 0 ? '#241239' : '#120818';
      ctx.fillRect(bx, horizon - bh, bw, bh + h);
      if (layer === 1) {
        ctx.fillStyle = 'rgba(255, 214, 130, 0.9)';
        const cols = Math.max(1, Math.floor(bw / (w * 0.02)));
        const rows = Math.max(1, Math.floor(bh / (h * 0.045)));
        for (let c = 0; c < cols; c += 1) {
          for (let r = 0; r < rows; r += 1) {
            if (rnd() < 0.34) {
              ctx.fillRect(bx + w * 0.008 + c * w * 0.02, horizon - bh + h * 0.02 + r * h * 0.045, w * 0.008, h * 0.014);
            }
          }
        }
      }
      bx += bw + w * 0.008;
    }
  }

  // Foreground water with sun reflection streaks.
  const water = ctx.createLinearGradient(0, horizon, 0, y + h);
  water.addColorStop(0, g.skyBot);
  water.addColorStop(1, '#0d0518');
  ctx.fillStyle = water;
  ctx.fillRect(x, horizon, w, y + h - horizon);
  ctx.fillStyle = g.sun;
  for (let i = 0; i < 9; i += 1) {
    const streakW = w * (0.05 + rnd() * 0.16);
    ctx.globalAlpha = 0.5 - i * 0.045;
    ctx.fillRect(sunX - streakW / 2, horizon + h * 0.02 + i * h * 0.022, streakW, h * 0.008);
  }
  ctx.globalAlpha = 1;

  // Two palm silhouettes framing the scene.
  for (const [px, lean] of [[x + w * 0.07, 1], [x + w * 0.94, -1]]) {
    const topY = y + h * (0.58 + rnd() * 0.06);
    ctx.strokeStyle = '#0d0518';
    ctx.lineWidth = Math.max(2, w * 0.008);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px, y + h);
    ctx.quadraticCurveTo(px + lean * w * 0.03, y + h * 0.8, px + lean * w * 0.02, topY);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.5, w * 0.005);
    for (let f = 0; f < 6; f += 1) {
      const ang = Math.PI * (0.08 + f * 0.16);
      const dir = f < 3 ? lean : -lean;
      ctx.beginPath();
      ctx.moveTo(px + lean * w * 0.02, topY);
      ctx.quadraticCurveTo(
        px + lean * w * 0.02 + Math.cos(ang) * w * 0.09 * dir,
        topY - Math.sin(ang) * h * 0.05,
        px + lean * w * 0.02 + Math.cos(ang * 0.7) * w * 0.13 * dir,
        topY + h * 0.02,
      );
      ctx.stroke();
    }
  }
}

/** Panel rectangles for a layout inside a W x H canvas, with gutters. */
export function panelRects(layout, w, h) {
  const g = Math.max(2, Math.round(w * 0.008));
  if (layout === 'grid') {
    const cw = (w - g) / 2;
    const ch = (h - g) / 2;
    return [
      { x: 0, y: 0, w: cw, h: ch },
      { x: cw + g, y: 0, w: cw, h: ch },
      { x: 0, y: ch + g, w: cw, h: ch },
      { x: cw + g, y: ch + g, w: cw, h: ch },
    ];
  }
  if (layout === 'strip') {
    const cw = (w - g * 2) / 3;
    return [0, 1, 2].map((i) => ({ x: i * (cw + g), y: 0, w: cw, h }));
  }
  // hero: one tall panel left, two stacked panels right.
  const bigW = w * 0.62;
  const sideW = w - bigW - g;
  const sideH = (h - g) / 2;
  return [
    { x: 0, y: 0, w: bigW, h },
    { x: bigW + g, y: 0, w: sideW, h: sideH },
    { x: bigW + g, y: sideH + g, w: sideW, h: sideH },
  ];
}

/** Draws one photo cover-fitting `rect`, with zoom and pan offsets (-1..1). */
function drawPhotoCover(ctx, img, rect, zoom, ox, oy) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + ox * rect.w * 0.18;
  const dy = rect.y + (rect.h - dh) / 2 + oy * rect.h * 0.18;
  ctx.drawImage(img, dx, dy, dw, dh);
}

/** Draws the whole cover onto `canvas` from `state` and loaded `photos`. */
export function drawCoverArt(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  ctx.fillStyle = '#12081c';
  ctx.fillRect(0, 0, w, h);

  const rects = panelRects(state.layout, w, h);
  rects.forEach((rect, i) => {
    const panel = state.panels[i] ?? { photo: 'skyline', zoom: 1, ox: 0, oy: 0 };
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    const img = photos[panel.photo];
    if (panel.photo === 'skyline' || !img) {
      drawSkyline(ctx, rect, state.grade, i + 1);
    } else {
      drawPhotoCover(ctx, img, rect, panel.zoom || 1, panel.ox || 0, panel.oy || 0);
    }
    // Gentle shade at the foot of each panel so the title stays readable.
    const shade = ctx.createLinearGradient(0, rect.y + rect.h * 0.55, 0, rect.y + rect.h);
    shade.addColorStop(0, 'rgba(10, 4, 18, 0)');
    shade.addColorStop(1, 'rgba(10, 4, 18, 0.35)');
    ctx.fillStyle = shade;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = Math.max(1.5, w * 0.002);
    ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  });

  // Grade wash over the whole poster.
  const wash = ctx.createLinearGradient(0, 0, w, h);
  wash.addColorStop(0, grade.washTop);
  wash.addColorStop(1, grade.washBot);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);

  // Title block: dark band, bold outlined capitals, accent subtitle.
  const bandH = h * 0.24;
  const band = ctx.createLinearGradient(0, h - bandH, 0, h);
  band.addColorStop(0, 'rgba(12, 4, 18, 0)');
  band.addColorStop(1, grade.band);
  ctx.fillStyle = band;
  ctx.fillRect(0, h - bandH, w, bandH);

  const title = (state.title || '').trim().toUpperCase();
  if (title) {
    let size = h * 0.105;
    const setFont = () => { ctx.font = `900 ${size}px "Arial Black", "Helvetica Neue", Arial, sans-serif`; };
    setFont();
    while (ctx.measureText(title).width > w * 0.92 && size > h * 0.03) {
      size -= 2;
      setFont();
    }
    const tx = w * 0.05;
    const ty = h - h * 0.085;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#14060f';
    ctx.lineWidth = Math.max(3, size * 0.16);
    ctx.strokeText(title, tx, ty);
    const fill = ctx.createLinearGradient(0, ty - size, 0, ty);
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(1, '#ffd9ec');
    ctx.fillStyle = fill;
    ctx.fillText(title, tx, ty);
  }

  const subtitle = (state.subtitle || '').trim().toUpperCase();
  if (subtitle) {
    const size = Math.max(10, h * 0.03);
    ctx.font = `700 ${size}px "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = 'left';
    const sx = w * 0.05;
    const sy = h - h * 0.028;
    ctx.fillStyle = grade.accent;
    ctx.fillRect(sx, sy - size * 0.72, w * 0.045, Math.max(2, size * 0.16));
    ctx.fillStyle = '#ffffff';
    ctx.fillText(subtitle, sx + w * 0.06, sy);
  }

  // Thin outer frame with corner ticks.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = Math.max(2, w * 0.003);
  ctx.strokeRect(w * 0.012, h * 0.012, w * 0.976, h * 0.976);
}

/** Renders the cover at an exact export size and returns the canvas. */
export function renderCover(width, height, state, photos) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCoverArt(canvas, state, photos);
  return canvas;
}
