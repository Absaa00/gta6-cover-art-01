// Fixed scenes for screenshots: ?shot=cover shows the poster alone at the
// requested size, ?shot=editor shows the full editor with a sample loaded.
// `layout`, `grade`, `photo` and `caption` pick the scene; `size=WxH` resizes
// the cover canvas. window.__shotReady is set once the scene has painted.

import { LAYOUT_PANELS } from './cover.js';

/** The panel photos a scene starts from, by layout and chosen sample. */
function scenePanels(layout, photo) {
  const sets = {
    hero: [photo, 'boulevard', 'skyline'],
    grid: [photo, 'boulevard', 'skyline', photo],
    strip: ['boulevard', photo, 'skyline'],
  };
  const chosen = sets[layout] ?? sets.hero;
  return chosen.slice(0, LAYOUT_PANELS[layout]).map((p, i) => ({
    photo: p,
    zoom: p === 'skyline' ? 1 : 1.12,
    ox: 0,
    oy: i === 0 ? -0.1 : 0,
  }));
}

export async function runShot(shot, query, setup) {
  const layout = ['hero', 'grid', 'strip'].includes(query.get('layout')) ? query.get('layout') : 'hero';
  const grade = ['sunset', 'neon', 'dusk'].includes(query.get('grade')) ? query.get('grade') : 'sunset';
  const photo = ['pier', 'boulevard'].includes(query.get('photo')) ? query.get('photo') : 'pier';
  const title = (query.get('caption') || 'Sunset Heist').slice(0, 40);
  const subtitle = (query.get('subtitle') || 'Neon Streets').slice(0, 48);
  let size = null;
  const sizeMatch = /^(\d{3,4})x(\d{3,4})$/.exec(query.get('size') ?? '');
  if (sizeMatch) size = { w: Number(sizeMatch[1]), h: Number(sizeMatch[2]) };

  await setup({
    shot, layout, grade, title, subtitle, size,
    panels: scenePanels(layout, photo),
  });
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
