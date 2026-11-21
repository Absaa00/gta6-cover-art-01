// Vice City Cover Lab — screenshot scenes (?shot=cover | cover2 | editor).
// cover: full-frame exported cover 1080x1350, Sunset, Strip, Boulevard Dusk, "Sunset Heist".
// cover2: full-frame exported cover 1920x1080, Neon Nights, Hero+Duo, Pier Neon, "Neon Tide".
// editor (default): the editor UI with a photo loaded, honouring ?layout= ?grade= ?sample= ?caption=.
import { makeSampleScene, renderCover } from './cover.js';

const params = new URLSearchParams(location.search);
const shot = params.get('shot') || 'editor';

function sceneCanvas(scene) {
  return makeSampleScene(scene, 1080, 1080);
}

function coverState({ layout, grade, scene, title, subtitle, captionStyle, captionPos }) {
  const img = sceneCanvas(scene);
  const panels = [0, 1, 2, 3].map(() => ({ img, zoom: 1, x: 0, y: 0, label: scene }));
  return { layout, grade, title, subtitle, captionStyle, captionPos, panels };
}

if (shot === 'cover' || shot === 'cover2') {
  // Full-frame cover: hide the editor chrome, size the canvas to the export size.
  document.querySelector('.topbar').style.display = 'none';
  document.querySelector('.panel').style.display = 'none';
  document.querySelector('.foot').style.display = 'none';
  document.querySelector('.stage-hint').style.display = 'none';
  document.querySelector('.workspace').style.display = 'block';
  document.querySelector('.workspace').style.padding = '0';
  document.querySelector('.stage-wrap').style.position = 'static';
  const stage = document.getElementById('stage');
  stage.style.maxWidth = 'none';
  stage.style.border = '0';
  stage.style.borderRadius = '0';
  stage.style.boxShadow = 'none';
  const isCover2 = shot === 'cover2';
  const w = isCover2 ? 1920 : 1080;
  const h = isCover2 ? 1080 : 1350;
  stage.width = w;
  stage.height = h;
  const state = coverState({
    layout: isCover2 ? 'hero' : 'strip',
    grade: isCover2 ? 'neon' : 'sunset',
    scene: isCover2 ? 'pier' : 'boulevard',
    title: isCover2 ? 'Neon Tide' : 'Sunset Heist',
    subtitle: isCover2 ? 'Vice City · After Dark' : 'Vice City · Summer 2026',
    captionStyle: isCover2 ? 'neon' : 'block',
    captionPos: isCover2 ? 'bottom' : 'top',
  });
  renderCover(stage.getContext('2d'), w, h, state);
  document.title = isCover2 ? 'Neon Tide — Vice City Cover Lab' : 'Sunset Heist — Vice City Cover Lab';
} else {
  // Editor scene: load main.js, then apply query params on top of it.
  const script = document.createElement('script');
  script.type = 'module';
  script.src = 'src/main.js';
  document.body.appendChild(script);
  script.addEventListener('load', () => {
    const layout = params.get('layout');
    const grade = params.get('grade');
    const sample = params.get('sample');
    const caption = params.get('caption');
    if (layout) document.querySelector(`#layoutRow [data-layout="${layout}"]`)?.click();
    if (grade) document.querySelector(`#gradeRow [data-grade="${grade}"]`)?.click();
    if (sample === 'pier') document.getElementById('samplePierBtn')?.click();
    if (sample === 'boulevard') document.getElementById('sampleBoulevardBtn')?.click();
    if (caption) {
      const titleInput = document.getElementById('titleInput');
      titleInput.value = caption;
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
}
