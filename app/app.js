// Vice Cover Studio — GTA-style multi-panel cover art maker.
// All drawing happens on this machine: photos are read from local files or the
// bundled samples and never uploaded anywhere. No network requests at all.
(function () {
  'use strict';

  var SAMPLES = { boulevard: 'samples/boulevard.jpg', pier: 'samples/pier.jpg' };

  var GRADES = {
    sunset: {
      skyTop: '#2b0a3d', skyMid: '#c62b5e', skyLow: '#ff7a2f',
      sun: '#ffd23e', sunGlow: 'rgba(255, 190, 60, 0.55)',
      ray: 'rgba(255, 210, 62, 0.10)', overlay: 'rgba(255, 110, 40, 0.20)',
      accent: '#ffd23e', title: '#ffffff', banner: 'rgba(20, 6, 32, 0.86)'
    },
    neon: {
      skyTop: '#0b0626', skyMid: '#5b0f8a', skyLow: '#ff2ea6',
      sun: '#2de2ff', sunGlow: 'rgba(45, 226, 255, 0.55)',
      ray: 'rgba(45, 226, 255, 0.10)', overlay: 'rgba(255, 46, 166, 0.22)',
      accent: '#2de2ff', title: '#ffffff', banner: 'rgba(10, 4, 28, 0.86)'
    },
    dusk: {
      skyTop: '#070a1e', skyMid: '#2c1a5e', skyLow: '#7a4fd0',
      sun: '#ffb3c8', sunGlow: 'rgba(255, 179, 200, 0.45)',
      ray: 'rgba(180, 140, 255, 0.10)', overlay: 'rgba(90, 60, 200, 0.22)',
      accent: '#ffb3c8', title: '#ffffff', banner: 'rgba(7, 8, 26, 0.86)'
    }
  };

  // Four panel slots; layouts use the first 3 or all 4.
  function freshPanel(sample) {
    return { sample: sample, uploadUrl: null, image: null, zoom: 1.2, dx: 0, dy: 0 };
  }

  var state = {
    layout: 'hero',
    grade: 'sunset',
    title: 'VICE NIGHTS',
    subtitle: 'A SUNSET STORY IN THREE PANELS',
    titleSize: 104,
    captionPos: 'bottom',
    activePanel: 0,
    panels: [freshPanel('boulevard'), freshPanel('pier'), freshPanel('boulevard'), freshPanel('pier')]
  };

  var canvas = document.getElementById('cover');
  var ctx = canvas.getContext('2d');

  function loadImage(url) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = url;
    });
  }

  function panelImage(panel) {
    if (panel.image) return panel.image;
    return null;
  }

  // Panel rectangles as fractions of the cover [x, y, w, h].
  function layoutRects(layout) {
    var g = 0.012; // gutter fraction
    if (layout === 'grid') {
      var hw = (1 - g) / 2, hh = (1 - g) / 2;
      return [
        [0, 0, hw, hh], [hw + g, 0, hw, hh],
        [0, hh + g, hw, hh], [hw + g, hh + g, hw, hh]
      ];
    }
    if (layout === 'strip') {
      var cw = (1 - 2 * g) / 3;
      return [
        [0, 0, cw, 1], [cw + g, 0, cw, 1], [2 * (cw + g), 0, cw, 1]
      ];
    }
    // hero: big left panel + two stacked on the right
    var big = 0.64, side = 1 - big - g, half = (1 - g) / 2;
    return [
      [0, 0, big, 1],
      [big + g, 0, side, half],
      [big + g, half + g, side, half]
    ];
  }

  function drawProcedural(ctx2, x, y, w, h, seed) {
    // Fallback art if a photo has not loaded yet: layered sunset gradient
    // with a procedural skyline silhouette. Fully deterministic.
    var grad = ctx2.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#3d1157');
    grad.addColorStop(0.55, '#c62b5e');
    grad.addColorStop(1, '#ff8a3d');
    ctx2.fillStyle = grad;
    ctx2.fillRect(x, y, w, h);
    ctx2.fillStyle = '#ffd23e';
    ctx2.beginPath();
    ctx2.arc(x + w * 0.72, y + h * 0.30, Math.min(w, h) * 0.16, 0, Math.PI * 2);
    ctx2.fill();
    // Skyline: deterministic pseudo-random heights from the seed.
    var n = 9, bw = w / n, s = seed * 7919 + 13;
    ctx2.fillStyle = '#1c0a2e';
    for (var i = 0; i < n; i++) {
      s = (s * 1103515245 + 12345) % 2147483648;
      var bh = h * (0.22 + (s % 100) / 100 * 0.30);
      ctx2.fillRect(x + i * bw + 1, y + h - bh, bw - 2, bh);
    }
    // Water shimmer lines.
    ctx2.fillStyle = 'rgba(255, 210, 62, 0.5)';
    for (var j = 0; j < 5; j++) {
      ctx2.fillRect(x + w * 0.08, y + h * (0.78 + j * 0.045), w * (0.5 + j * 0.06), 2);
    }
  }

  function drawPhoto(ctx2, panel, x, y, w, h, seed) {
    var img = panelImage(panel);
    if (!img) { drawProcedural(ctx2, x, y, w, h, seed); return; }
    var scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * panel.zoom;
    var dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
    var dx = x + (w - dw) / 2 + panel.dx * w * 0.3;
    var dy = y + (h - dh) / 2 + panel.dy * h * 0.3;
    ctx2.drawImage(img, dx, dy, dw, dh);
  }

  function drawCover(ctx2, W, H, st) {
    var g = GRADES[st.grade];
    var u = Math.min(W, H) / 900; // unit scale

    // Sky + sun + rays.
    var sky = ctx2.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, g.skyTop);
    sky.addColorStop(0.55, g.skyMid);
    sky.addColorStop(1, g.skyLow);
    ctx2.fillStyle = sky;
    ctx2.fillRect(0, 0, W, H);

    var sunX = W * 0.78, sunY = H * 0.20, sunR = Math.min(W, H) * 0.11;
    var glow = ctx2.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 2.6);
    glow.addColorStop(0, g.sunGlow);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx2.fillStyle = glow;
    ctx2.fillRect(0, 0, W, H);
    ctx2.fillStyle = g.sun;
    ctx2.beginPath();
    ctx2.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx2.fill();

    // Sun rays: 10 wedges fanning from the sun, deterministic angles.
    ctx2.save();
    ctx2.translate(sunX, sunY);
    ctx2.fillStyle = g.ray;
    for (var r = 0; r < 10; r++) {
      var a = (r / 10) * Math.PI * 2 + 0.31;
      ctx2.save();
      ctx2.rotate(a);
      ctx2.beginPath();
      ctx2.moveTo(0, 0);
      ctx2.lineTo(Math.max(W, H) * 1.2, -Math.max(W, H) * 0.05);
      ctx2.lineTo(Math.max(W, H) * 1.2, Math.max(W, H) * 0.05);
      ctx2.closePath();
      ctx2.fill();
      ctx2.restore();
    }
    ctx2.restore();

    // Panels.
    var rects = layoutRects(st.layout);
    var gap = 0.012 * Math.min(W, H);
    for (var i = 0; i < rects.length; i++) {
      var rc = rects[i];
      var px = rc[0] * W, py = rc[1] * H, pw = rc[2] * W, ph = rc[3] * H;
      ctx2.save();
      ctx2.beginPath();
      ctx2.rect(px, py, pw, ph);
      ctx2.clip();
      drawPhoto(ctx2, st.panels[i], px, py, pw, ph, i + 1);
      // Grade tint over the photo.
      ctx2.fillStyle = g.overlay;
      ctx2.fillRect(px, py, pw, ph);
      ctx2.restore();
      // White poster border + thin dark keyline.
      ctx2.lineWidth = Math.max(2, 5 * u);
      ctx2.strokeStyle = '#ffffff';
      ctx2.strokeRect(px, py, pw, ph);
      ctx2.lineWidth = Math.max(1, 1.5 * u);
      ctx2.strokeStyle = 'rgba(20, 6, 32, 0.55)';
      ctx2.strokeRect(px + 3 * u, py + 3 * u, pw - 6 * u, ph - 6 * u);
    }

    // Vignette.
    var vg = ctx2.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(10, 2, 20, 0.38)');
    ctx2.fillStyle = vg;
    ctx2.fillRect(0, 0, W, H);

    // Caption banner.
    var titlePx = st.titleSize * u;
    var subPx = Math.max(14 * u, titlePx * 0.26);
    var bannerH = titlePx * 1.55 + subPx * 1.5;
    var by = st.captionPos === 'top' ? 0 : H - bannerH;
    ctx2.fillStyle = g.banner;
    ctx2.fillRect(0, by, W, bannerH);
    ctx2.fillStyle = g.accent;
    if (st.captionPos === 'top') ctx2.fillRect(0, bannerH, W, 5 * u);
    else ctx2.fillRect(0, by - 5 * u, W, 5 * u);

    var padX = 34 * u;
    ctx2.save();
    ctx2.translate(padX, by + titlePx * 1.02);
    ctx2.transform(1, 0, -0.07, 1, 0, 0); // slight poster slant
    ctx2.font = '900 ' + titlePx + 'px "Arial Black", Arial, sans-serif';
    ctx2.textBaseline = 'alphabetic';
    ctx2.lineJoin = 'round';
    ctx2.lineWidth = Math.max(3, titlePx * 0.09);
    ctx2.strokeStyle = '#14061f';
    ctx2.strokeText(st.title.toUpperCase(), 0, 0);
    ctx2.fillStyle = g.title;
    ctx2.fillText(st.title.toUpperCase(), 0, 0);
    ctx2.restore();

    // Subtitle with manual letter spacing (works in every canvas).
    ctx2.save();
    ctx2.font = '700 ' + subPx + 'px Arial, sans-serif';
    ctx2.fillStyle = g.accent;
    ctx2.textBaseline = 'alphabetic';
    var sub = st.subtitle.toUpperCase();
    var sx = padX, sy = by + titlePx * 1.18 + subPx;
    var spacing = subPx * 0.28;
    for (var c = 0; c < sub.length; c++) {
      ctx2.fillText(sub[c], sx, sy);
      sx += ctx2.measureText(sub[c]).width + spacing;
    }
    ctx2.restore();

    // Accent underline bar under the title.
    ctx2.fillStyle = g.accent;
    ctx2.fillRect(padX, by + titlePx * 1.12, Math.min(W * 0.30, 320 * u), 6 * u);
  }

  function render() {
    drawCover(ctx, canvas.width, canvas.height, state);
  }

  function exportPNG(w, h) {
    var off = document.createElement('canvas');
    off.width = w; off.height = h;
    var octx = off.getContext('2d');
    drawCover(octx, w, h, state);
    return off.toDataURL('image/png');
  }

  function downloadExport() {
    var sel = document.getElementById('export-size').value.split('x');
    var w = parseInt(sel[0], 10), h = parseInt(sel[1], 10);
    var url = exportPNG(w, h);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'vice-cover-' + w + 'x' + h + '.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return url;
  }

  // ---- wiring ----

  function segWire(id, attr, apply) {
    var seg = document.getElementById(id);
    seg.addEventListener('click', function (ev) {
      var btn = ev.target.closest('button');
      if (!btn) return;
      seg.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      apply(btn.getAttribute(attr));
      syncPanelTabs();
      render();
    });
  }

  segWire('layout-seg', 'data-layout', function (v) { state.layout = v; state.activePanel = 0; });
  segWire('grade-seg', 'data-grade', function (v) { state.grade = v; });

  function syncPanelTabs() {
    var seg = document.getElementById('panel-seg');
    var count = layoutRects(state.layout).length;
    seg.innerHTML = '';
    for (var i = 0; i < count; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'Panel ' + (i + 1);
      b.setAttribute('data-panel', String(i));
      if (i === state.activePanel) b.classList.add('active');
      seg.appendChild(b);
    }
    seg.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        state.activePanel = parseInt(b.getAttribute('data-panel'), 10);
        syncPanelTabs();
        syncPanelControls();
      });
    });
  }

  function syncPanelControls() {
    var p = state.panels[state.activePanel];
    document.getElementById('zoom').value = Math.round(p.zoom * 100);
    document.getElementById('shift-x').value = Math.round(p.dx * 100);
    document.getElementById('shift-y').value = Math.round(p.dy * 100);
  }

  function setPanelPhoto(panel, file) {
    var reader = new FileReader();
    reader.onload = function () {
      loadImage(reader.result).then(function (img) {
        panel.image = img;
        panel.uploadUrl = reader.result;
        panel.sample = 'upload';
        render();
      });
    };
    reader.readAsDataURL(file);
  }

  function useSample(name) {
    var p = state.panels[state.activePanel];
    p.sample = name;
    p.uploadUrl = null;
    loadImage(SAMPLES[name]).then(function (img) {
      p.image = img;
      render();
    });
  }

  document.getElementById('sample-a').addEventListener('click', function () { useSample('boulevard'); });
  document.getElementById('sample-b').addEventListener('click', function () { useSample('pier'); });
  document.getElementById('panel-file').addEventListener('change', function (ev) {
    if (ev.target.files && ev.target.files[0]) setPanelPhoto(state.panels[state.activePanel], ev.target.files[0]);
    ev.target.value = '';
  });
  document.getElementById('upload-all').addEventListener('change', function (ev) {
    var files = Array.prototype.slice.call(ev.target.files || []);
    files.slice(0, 4).forEach(function (f, i) { setPanelPhoto(state.panels[i], f); });
    ev.target.value = '';
  });

  document.getElementById('zoom').addEventListener('input', function (ev) {
    state.panels[state.activePanel].zoom = parseInt(ev.target.value, 10) / 100;
    render();
  });
  document.getElementById('shift-x').addEventListener('input', function (ev) {
    state.panels[state.activePanel].dx = parseInt(ev.target.value, 10) / 100;
    render();
  });
  document.getElementById('shift-y').addEventListener('input', function (ev) {
    state.panels[state.activePanel].dy = parseInt(ev.target.value, 10) / 100;
    render();
  });
  document.getElementById('reset-panel').addEventListener('click', function () {
    var p = state.panels[state.activePanel];
    p.zoom = 1.2; p.dx = 0; p.dy = 0;
    syncPanelControls();
    render();
  });

  document.getElementById('title-input').addEventListener('input', function (ev) {
    state.title = ev.target.value || 'UNTITLED';
    render();
  });
  document.getElementById('subtitle-input').addEventListener('input', function (ev) {
    state.subtitle = ev.target.value || '';
    render();
  });
  document.getElementById('title-size').addEventListener('input', function (ev) {
    state.titleSize = parseInt(ev.target.value, 10);
    render();
  });
  document.getElementById('caption-pos').addEventListener('change', function (ev) {
    state.captionPos = ev.target.value;
    render();
  });

  document.getElementById('export-btn').addEventListener('click', downloadExport);
  document.getElementById('export-btn-2').addEventListener('click', downloadExport);

  // Drag a panel photo to reposition it.
  var drag = null;
  function panelAt(clientX, clientY) {
    var r = canvas.getBoundingClientRect();
    var fx = (clientX - r.left) / r.width, fy = (clientY - r.top) / r.height;
    var rects = layoutRects(state.layout);
    for (var i = 0; i < rects.length; i++) {
      var rc = rects[i];
      if (fx >= rc[0] && fx <= rc[0] + rc[2] && fy >= rc[1] && fy <= rc[1] + rc[3]) return i;
    }
    return -1;
  }
  canvas.addEventListener('pointerdown', function (ev) {
    var i = panelAt(ev.clientX, ev.clientY);
    if (i < 0) return;
    state.activePanel = i;
    syncPanelTabs();
    syncPanelControls();
    drag = { i: i, x: ev.clientX, y: ev.clientY, dx: state.panels[i].dx, dy: state.panels[i].dy };
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener('pointermove', function (ev) {
    if (!drag) return;
    var r = canvas.getBoundingClientRect();
    var p = state.panels[drag.i];
    p.dx = Math.max(-1, Math.min(1, drag.dx + (ev.clientX - drag.x) / r.width / 0.3));
    p.dy = Math.max(-1, Math.min(1, drag.dy + (ev.clientY - drag.y) / r.height / 0.3));
    syncPanelControls();
    render();
  });
  canvas.addEventListener('pointerup', function () { drag = null; });

  // Preload the bundled samples, then draw.
  Promise.all([
    loadImage(SAMPLES.boulevard),
    loadImage(SAMPLES.pier)
  ]).then(function (imgs) {
    state.panels[0].image = imgs[0];
    state.panels[1].image = imgs[1];
    state.panels[2].image = imgs[0];
    state.panels[3].image = imgs[1];
    render();
  }).catch(function () { render(); });

  syncPanelTabs();
  syncPanelControls();
  render();

  // Test hook used by the maker's own verification scripts.
  window.__vcs = { state: state, render: render, exportPNG: exportPNG, drawCover: drawCover };
})();
