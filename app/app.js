/* Leonida Nights Cover Maker — vanilla JS, one canvas, offline.
   Preview and PNG export share renderCover(), so what you see is what exports. */
(function () {
  "use strict";

  var canvas = document.getElementById("coverCanvas");
  var ctx = canvas.getContext("2d");
  var PREVIEW_W = 1080, PREVIEW_H = 1350;

  var GRADES = ["sunset", "neon", "noir", "pastel"];
  var TITLE_STYLES = ["outline", "gradient", "glow"];
  var SIZES = { "1080x1080": [1080, 1080], "1080x1350": [1080, 1350], "1920x1080": [1920, 1080] };

  var state = {
    title: "LEONIDA NIGHTS",
    subtitle: "VICE CITY \u00B7 SUMMER 2026",
    grade: "sunset",
    titleStyle: "outline",
    exportSize: "1080x1350",
    selectedPanel: 0,
    photos: [],           // { id, name, img, url }
    panels: [             // hero, left, right — one photo may fill several panels
      { photoId: null, zoom: 1.15, ox: 0, oy: 0 },
      { photoId: null, zoom: 1.15, ox: 0, oy: 0 },
      { photoId: null, zoom: 1.15, ox: 0, oy: 0 },
    ],
  };
  var nextPhotoId = 1;
  var lastRects = null;   // panel rects of the last preview render, in canvas pixels
  var dragging = null;    // { panel, x, y, moved }

  /* ---------- layout ---------- */

  function layoutFor(W, H) {
    var m = Math.round(W * 0.0333), g = Math.round(W * 0.0167);
    var y = Math.round(H * 0.0267);
    var heroH = Math.round(H * 0.444), sideH = Math.round(H * 0.244);
    var bandH = H - y - heroH - g - sideH - g - y;
    var half = Math.round((W - m * 2 - g) / 2);
    return {
      hero: { x: m, y: y, w: W - m * 2, h: heroH },
      left: { x: m, y: y + heroH + g, w: half, h: sideH },
      right: { x: m + half + g, y: y + heroH + g, w: half, h: sideH },
      band: { x: m, y: y + heroH + g + sideH + g, w: W - m * 2, h: bandH },
      margin: m, gap: g,
    };
  }

  /* ---------- photo drawing ---------- */

  function findPhoto(id) {
    for (var i = 0; i < state.photos.length; i++) {
      if (state.photos[i].id === id) return state.photos[i];
    }
    return null;
  }

  // Cover-fit an image into rect, with zoom and a centre offset (ox, oy in panel fractions).
  function drawPhotoCover(c, img, r, zoom, ox, oy) {
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    var scale = Math.max(r.w / iw, r.h / ih) * zoom;
    var dw = iw * scale, dh = ih * scale;
    var dx = r.x + (r.w - dw) / 2 + ox * r.w;
    var dy = r.y + (r.h - dh) / 2 + oy * r.h;
    c.save();
    c.beginPath();
    c.rect(r.x, r.y, r.w, r.h);
    c.clip();
    c.drawImage(img, dx, dy, dw, dh);
    c.restore();
  }

  function drawEmptyPanel(c, r, label) {
    var grad = c.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
    grad.addColorStop(0, "#3a1c5e");
    grad.addColorStop(1, "#1c0b33");
    c.fillStyle = grad;
    c.fillRect(r.x, r.y, r.w, r.h);
    c.strokeStyle = "rgba(255,255,255,0.35)";
    c.lineWidth = Math.max(2, r.w * 0.004);
    c.setLineDash([14, 10]);
    c.strokeRect(r.x + 8, r.y + 8, r.w - 16, r.h - 16);
    c.setLineDash([]);
    c.fillStyle = "rgba(255,255,255,0.75)";
    c.font = "700 " + Math.round(r.h * 0.09) + 'px "Leonida Sans", sans-serif';
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("+ " + label, r.x + r.w / 2, r.y + r.h / 2);
  }

  function framePanel(c, r, selected) {
    c.save();
    c.lineWidth = selected ? Math.max(3, r.w * 0.006) : Math.max(2, r.w * 0.004);
    c.strokeStyle = selected ? "#ffc44d" : "rgba(255,255,255,0.9)";
    c.strokeRect(r.x, r.y, r.w, r.h);
    c.restore();
  }

  /* ---------- sunset art: palms, halftone, band ---------- */

  function drawPalm(c, x, y, s, lean, color) {
    c.save();
    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineCap = "round";
    c.lineWidth = Math.max(3, s * 0.03);
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + lean * s * 0.3, y - s * 0.55, x + lean * s, y - s);
    c.stroke();
    var tx = x + lean * s, ty = y - s;
    for (var k = 0; k < 7; k++) {
      var a = Math.PI * (0.06 + 0.15 * k) + (k % 2 ? 0.25 : -0.12);
      var L = s * (0.42 + 0.07 * ((k * 37) % 3));
      var ex = tx + Math.cos(a) * L, ey = ty - Math.abs(Math.sin(a)) * L * 0.5 + L * 0.28;
      c.lineWidth = Math.max(2, s * 0.02);
      c.beginPath();
      c.moveTo(tx, ty);
      c.quadraticCurveTo(tx + (ex - tx) * 0.5, ty + (ey - ty) * 0.5 - s * 0.06, ex, ey);
      c.stroke();
    }
    c.restore();
  }

  function drawHalftone(c, r, color) {
    var step = Math.max(9, Math.round(r.w * 0.012));
    c.save();
    c.fillStyle = color;
    for (var yy = r.y + step / 2; yy < r.y + r.h; yy += step) {
      for (var xx = r.x + step / 2; xx < r.x + r.w; xx += step) {
        var t = ((xx * 7 + yy * 13) % 10) / 10;
        var rad = Math.max(0.7, step * 0.22 * (0.5 + t));
        c.globalAlpha = 0.10 + 0.16 * t;
        c.beginPath();
        c.arc(xx, yy, rad, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.restore();
  }

  function drawSunsetBand(c, r) {
    var g = c.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
    g.addColorStop(0.0, "#5b1a86");
    g.addColorStop(0.35, "#c22a7e");
    g.addColorStop(0.62, "#ff5a3c");
    g.addColorStop(0.82, "#ff9a3d");
    g.addColorStop(1.0, "#ffc44d");
    c.fillStyle = g;
    c.fillRect(r.x, r.y, r.w, r.h);
    // sun disc low on the band
    var sunR = r.h * 0.42;
    var sg = c.createRadialGradient(r.x + r.w * 0.78, r.y + r.h * 0.62, sunR * 0.1,
      r.x + r.w * 0.78, r.y + r.h * 0.62, sunR);
    sg.addColorStop(0, "rgba(255,244,200,0.95)");
    sg.addColorStop(0.7, "rgba(255,200,110,0.55)");
    sg.addColorStop(1, "rgba(255,160,60,0)");
    c.fillStyle = sg;
    c.fillRect(r.x, r.y, r.w, r.h);
    // palm silhouettes left and right
    drawPalm(c, r.x + r.w * 0.07, r.y + r.h * 0.98, r.h * 0.85, 0.16, "rgba(24,6,40,0.92)");
    drawPalm(c, r.x + r.w * 0.93, r.y + r.h, r.h * 1.0, -0.18, "rgba(24,6,40,0.92)");
    drawPalm(c, r.x + r.w * 0.86, r.y + r.h * 0.97, r.h * 0.55, -0.1, "rgba(24,6,40,0.8)");
    drawHalftone(c, r, "#1c0633");
    // teal shadow strip along the bottom edge
    var tg = c.createLinearGradient(r.x, r.y + r.h * 0.82, r.x, r.y + r.h);
    tg.addColorStop(0, "rgba(10,40,50,0)");
    tg.addColorStop(1, "rgba(8,32,44,0.55)");
    c.fillStyle = tg;
    c.fillRect(r.x, r.y, r.w, r.h);
  }

  /* ---------- title lettering ---------- */

  function drawTitleText(c, r) {
    var title = state.title.toUpperCase();
    // Shrink the title until it fits the band (portrait covers are narrower).
    var titleSize = Math.round(r.h * 0.40);
    var maxW = r.w * 0.94;
    c.font = "700 " + titleSize + 'px "Leonida Sans", sans-serif';
    while (titleSize > 12 && c.measureText(title).width > maxW) {
      titleSize = Math.round(titleSize * 0.94);
      c.font = "700 " + titleSize + 'px "Leonida Sans", sans-serif';
    }
    var subSize = Math.round(r.h * 0.115);
    var cx = r.x + r.w / 2;
    var titleY = r.y + r.h * 0.46;
    var subY = r.y + r.h * 0.78;
    c.save();
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = "700 " + titleSize + 'px "Leonida Sans", sans-serif';
    if (state.titleStyle === "gradient") {
      var gg = c.createLinearGradient(r.x, titleY - titleSize / 2, r.x, titleY + titleSize / 2);
      gg.addColorStop(0, "#ffffff");
      gg.addColorStop(0.55, "#ffe9a8");
      gg.addColorStop(1, "#ff7a3d");
      c.fillStyle = gg;
      c.shadowColor = "rgba(60,0,80,0.55)";
      c.shadowBlur = titleSize * 0.08;
      c.shadowOffsetY = titleSize * 0.04;
      c.fillText(title, cx, titleY);
    } else if (state.titleStyle === "glow") {
      c.shadowColor = "#ff2e88";
      c.shadowBlur = titleSize * 0.35;
      c.fillStyle = "#ffffff";
      c.fillText(title, cx, titleY);
      c.shadowColor = "#2ee6c8";
      c.shadowBlur = titleSize * 0.16;
      c.fillText(title, cx, titleY);
    } else { // outline
      c.lineWidth = Math.max(2, titleSize * 0.10);
      c.strokeStyle = "#1c0633";
      c.lineJoin = "round";
      c.strokeText(title, cx, titleY);
      c.fillStyle = "#ffffff";
      c.fillText(title, cx, titleY);
    }
    c.shadowBlur = 0;
    c.shadowOffsetY = 0;
    c.font = "700 " + subSize + 'px "Leonida Sans", sans-serif';
    c.fillStyle = "rgba(255,255,255,0.92)";
    var sub = state.subtitle.toUpperCase();
    var tw = c.measureText(sub).width;
    var pad = subSize * 0.9;
    c.fillStyle = "rgba(20,4,40,0.55)";
    roundRect(c, cx - tw / 2 - pad, subY - subSize * 0.85, tw + pad * 2, subSize * 1.7, subSize * 0.85);
    c.fill();
    c.fillStyle = "#ffe9a8";
    c.fillText(sub, cx, subY);
    c.restore();
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  /* ---------- colour grades ---------- */

  function applyGrade(c, W, H) {
    c.save();
    if (state.grade === "sunset") {
      var g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "rgba(90,26,134,0.20)");
      g.addColorStop(0.55, "rgba(255,90,60,0.10)");
      g.addColorStop(1, "rgba(255,170,60,0.22)");
      c.globalCompositeOperation = "overlay";
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    } else if (state.grade === "neon") {
      c.globalCompositeOperation = "multiply";
      c.fillStyle = "rgba(24,10,80,0.42)";
      c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = "screen";
      var n1 = c.createRadialGradient(W * 0.15, H * 0.2, 10, W * 0.15, H * 0.2, W * 0.5);
      n1.addColorStop(0, "rgba(255,46,136,0.30)");
      n1.addColorStop(1, "rgba(255,46,136,0)");
      c.fillStyle = n1;
      c.fillRect(0, 0, W, H);
      var n2 = c.createRadialGradient(W * 0.9, H * 0.85, 10, W * 0.9, H * 0.85, W * 0.5);
      n2.addColorStop(0, "rgba(46,230,200,0.26)");
      n2.addColorStop(1, "rgba(46,230,200,0)");
      c.fillStyle = n2;
      c.fillRect(0, 0, W, H);
    } else if (state.grade === "noir") {
      c.globalCompositeOperation = "saturation";
      c.fillStyle = "rgba(128,128,128,0.9)";
      c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = "source-over";
      c.fillStyle = "rgba(8,4,16,0.28)";
      c.fillRect(0, 0, W, H);
      var ng = c.createLinearGradient(0, 0, 0, H);
      ng.addColorStop(0, "rgba(255,255,255,0.06)");
      ng.addColorStop(1, "rgba(0,0,0,0.18)");
      c.fillStyle = ng;
      c.fillRect(0, 0, W, H);
    } else { // pastel
      c.globalCompositeOperation = "soft-light";
      c.fillStyle = "rgba(255,150,200,0.55)";
      c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = "screen";
      var p = c.createLinearGradient(0, 0, W, H);
      p.addColorStop(0, "rgba(120,220,255,0.14)");
      p.addColorStop(1, "rgba(255,220,150,0.16)");
      c.fillStyle = p;
      c.fillRect(0, 0, W, H);
    }
    // vignette + teal shadow corners on every grade
    c.globalCompositeOperation = "source-over";
    var v = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42,
      W / 2, H / 2, Math.max(W, H) * 0.72);
    v.addColorStop(0, "rgba(10,0,25,0)");
    v.addColorStop(1, "rgba(10,0,25,0.42)");
    c.fillStyle = v;
    c.fillRect(0, 0, W, H);
    c.restore();
  }

  /* ---------- the one render function: preview and export share it ---------- */

  function renderCover(c, W, H) {
    c.clearRect(0, 0, W, H);
    c.fillStyle = "#150a24";
    c.fillRect(0, 0, W, H);
    var L = layoutFor(W, H);
    var rects = [L.hero, L.left, L.right];
    var labels = ["HERO", "LEFT", "RIGHT"];
    for (var i = 0; i < 3; i++) {
      var p = state.panels[i];
      var photo = p.photoId ? findPhoto(p.photoId) : null;
      if (photo && photo.img.complete && photo.img.naturalWidth > 0) {
        drawPhotoCover(c, photo.img, rects[i], p.zoom, p.ox, p.oy);
      } else {
        drawEmptyPanel(c, rects[i], labels[i] + " PHOTO");
      }
      framePanel(c, rects[i], state.selectedPanel === i);
    }
    drawSunsetBand(c, L.band);
    drawTitleText(c, L.band);
    applyGrade(c, W, H);
    // outer border
    c.save();
    c.lineWidth = Math.max(4, W * 0.006);
    c.strokeStyle = "rgba(255,255,255,0.85)";
    c.strokeRect(L.margin / 2, L.margin / 2, W - L.margin, H - L.margin);
    c.restore();
    return L;
  }

  function renderPreview() {
    canvas.width = PREVIEW_W;
    canvas.height = PREVIEW_H;
    lastRects = renderCover(ctx, PREVIEW_W, PREVIEW_H);
  }

  /* ---------- photos ---------- */

  function addPhotoFile(file) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      state.photos.push({ id: nextPhotoId++, name: file.name, img: img, url: url });
      renderTray();
      renderPreview();
    };
    img.src = url;
  }

  function loadSample(name, path) {
    var img = new Image();
    img.onload = function () {
      state.photos.push({ id: nextPhotoId++, name: name, img: img, url: path });
      renderTray();
      renderPreview();
    };
    img.src = path;
  }

  function renderTray() {
    var tray = document.getElementById("photoTray");
    tray.innerHTML = "";
    if (state.photos.length === 0) {
      var em = document.createElement("span");
      em.className = "tray-empty";
      em.textContent = "No photos yet — add your own, or use the samples below.";
      tray.appendChild(em);
      return;
    }
    state.photos.forEach(function (ph) {
      var t = document.createElement("img");
      t.src = ph.url;
      t.alt = ph.name;
      t.title = ph.name + " — click to put into the selected panel";
      var used = state.panels.some(function (p) { return p.photoId === ph.id; });
      if (used) t.classList.add("assigned");
      t.addEventListener("click", function () {
        state.panels[state.selectedPanel].photoId = ph.id;
        renderTray();
        renderPreview();
      });
      tray.appendChild(t);
    });
  }

  /* ---------- panel picking, drag, zoom ---------- */

  function panelAt(cx, cy) {
    if (!lastRects) return -1;
    var rects = [lastRects.hero, lastRects.left, lastRects.right];
    for (var i = 0; i < 3; i++) {
      var r = rects[i];
      if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) return i;
    }
    return -1;
  }

  function canvasPoint(ev) {
    var b = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - b.left) * (canvas.width / b.width),
      y: (ev.clientY - b.top) * (canvas.height / b.height),
    };
  }

  function selectPanel(i) {
    state.selectedPanel = i;
    document.querySelectorAll(".panel-tab").forEach(function (btn) {
      btn.classList.toggle("active", Number(btn.dataset.panel) === i);
    });
    var names = ["Hero", "Left", "Right"];
    document.getElementById("panelLabel").textContent = names[i] + " panel selected";
    var slider = document.getElementById("zoomSlider");
    slider.value = state.panels[i].zoom;
    renderPreview();
  }

  canvas.addEventListener("pointerdown", function (ev) {
    var pt = canvasPoint(ev);
    var i = panelAt(pt.x, pt.y);
    if (i < 0) return;
    if (i !== state.selectedPanel) selectPanel(i);
    dragging = { panel: i, x: pt.x, y: pt.y, moved: false };
    canvas.setPointerCapture(ev.pointerId);
  });

  canvas.addEventListener("pointermove", function (ev) {
    if (!dragging) return;
    var pt = canvasPoint(ev);
    var dx = pt.x - dragging.x, dy = pt.y - dragging.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) dragging.moved = true;
    var p = state.panels[dragging.panel];
    var r = [lastRects.hero, lastRects.left, lastRects.right][dragging.panel];
    p.ox = clamp(p.ox + dx / r.w, -0.6, 0.6);
    p.oy = clamp(p.oy + dy / r.h, -0.6, 0.6);
    dragging.x = pt.x;
    dragging.y = pt.y;
    renderPreview();
  });

  canvas.addEventListener("pointerup", function () { dragging = null; });
  canvas.addEventListener("pointercancel", function () { dragging = null; });

  canvas.addEventListener("wheel", function (ev) {
    ev.preventDefault();
    var pt = canvasPoint(ev);
    var i = panelAt(pt.x, pt.y);
    if (i < 0) i = state.selectedPanel;
    var p = state.panels[i];
    p.zoom = clamp(p.zoom * (ev.deltaY < 0 ? 1.08 : 0.92), 1, 3);
    if (i === state.selectedPanel) document.getElementById("zoomSlider").value = p.zoom;
    renderPreview();
  }, { passive: false });

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  /* ---------- export ---------- */

  function exportPng() {
    var size = SIZES[state.exportSize];
    var off = document.createElement("canvas");
    off.width = size[0];
    off.height = size[1];
    var c = off.getContext("2d");
    renderCover(c, size[0], size[1]);
    off.toBlob(function (blob) {
      if (!blob) return;
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "leonida-nights-" + state.exportSize + ".png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    }, "image/png");
  }

  /* ---------- controls ---------- */

  document.getElementById("fileInput").addEventListener("change", function (ev) {
    Array.prototype.forEach.call(ev.target.files, addPhotoFile);
    ev.target.value = "";
  });

  var dropZone = document.getElementById("dropZone");
  ["dragover", "dragenter"].forEach(function (n) {
    dropZone.addEventListener(n, function (ev) { ev.preventDefault(); });
  });
  dropZone.addEventListener("drop", function (ev) {
    ev.preventDefault();
    Array.prototype.forEach.call(ev.dataTransfer.files, function (f) {
      if (f.type.indexOf("image/") === 0) addPhotoFile(f);
    });
  });

  document.getElementById("titleInput").addEventListener("input", function (ev) {
    state.title = ev.target.value || "LEONIDA NIGHTS";
    renderPreview();
  });
  document.getElementById("subtitleInput").addEventListener("input", function (ev) {
    state.subtitle = ev.target.value || "";
    renderPreview();
  });

  document.getElementById("gradeRow").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-grade]");
    if (!b) return;
    state.grade = b.dataset.grade;
    document.querySelectorAll("#gradeRow .chip").forEach(function (x) {
      x.classList.toggle("active", x === b);
    });
    renderPreview();
  });

  document.getElementById("styleRow").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-style]");
    if (!b) return;
    state.titleStyle = b.dataset.style;
    document.querySelectorAll("#styleRow .chip").forEach(function (x) {
      x.classList.toggle("active", x === b);
    });
    renderPreview();
  });

  document.getElementById("sizeRow").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-size]");
    if (!b) return;
    state.exportSize = b.dataset.size;
    document.querySelectorAll("#sizeRow .chip").forEach(function (x) {
      x.classList.toggle("active", x === b);
    });
  });

  document.querySelectorAll(".panel-tab").forEach(function (btn) {
    btn.addEventListener("click", function () { selectPanel(Number(btn.dataset.panel)); });
  });

  document.getElementById("zoomSlider").addEventListener("input", function (ev) {
    state.panels[state.selectedPanel].zoom = Number(ev.target.value);
    renderPreview();
  });

  document.getElementById("fitBtn").addEventListener("click", function () {
    var p = state.panels[state.selectedPanel];
    p.zoom = 1; p.ox = 0; p.oy = 0;
    document.getElementById("zoomSlider").value = 1;
    renderPreview();
  });

  document.getElementById("fillBtn").addEventListener("click", function () {
    var ph = state.photos[0];
    if (!ph) return;
    state.panels.forEach(function (p) { p.photoId = ph.id; });
    renderTray();
    renderPreview();
  });

  document.getElementById("clearBtn").addEventListener("click", function () {
    var p = state.panels[state.selectedPanel];
    p.photoId = null; p.zoom = 1.15; p.ox = 0; p.oy = 0;
    document.getElementById("zoomSlider").value = 1.15;
    renderTray();
    renderPreview();
  });

  document.getElementById("shuffleBtn").addEventListener("click", function () {
    if (state.photos.length === 0) return;
    state.panels.forEach(function (p) {
      p.photoId = state.photos[Math.floor(Math.random() * state.photos.length)].id;
      p.zoom = 1.05 + Math.random() * 0.4;
      p.ox = (Math.random() - 0.5) * 0.2;
      p.oy = (Math.random() - 0.5) * 0.2;
    });
    document.getElementById("zoomSlider").value = state.panels[state.selectedPanel].zoom;
    renderTray();
    renderPreview();
  });

  document.getElementById("exportBtn").addEventListener("click", exportPng);

  /* ---------- cover-only screenshot mode: ?view=cover&size=WxH ---------- */

  var params = new URLSearchParams(window.location.search);
  var coverMode = params.get("view") === "cover";
  if (coverMode) {
    document.body.classList.add("cover-mode");
    var sz = params.get("size") || state.exportSize;
    if (SIZES[sz]) state.exportSize = sz;
    // Render the preview canvas at the export aspect so the shot fills the window.
    PREVIEW_W = SIZES[state.exportSize][0];
    PREVIEW_H = SIZES[state.exportSize][1];
    if (params.get("grade") && GRADES.indexOf(params.get("grade")) >= 0) state.grade = params.get("grade");
    if (params.get("style") && TITLE_STYLES.indexOf(params.get("style")) >= 0) state.titleStyle = params.get("style");
    if (params.get("title")) state.title = params.get("title");
    if (params.get("subtitle")) state.subtitle = params.get("subtitle");
  }

  /* ---------- boot: preload the three drawn sample photos ---------- */

  loadSample("Sunset skyline", "samples/sunset-skyline.jpg");
  loadSample("Neon street", "samples/neon-street.jpg");
  loadSample("Palms beach", "samples/palms-beach.jpg");

  // Default assignment once the samples arrive: pick by name, not load order,
  // so the bright skyline always anchors the large hero panel.
  function photoByName(name) {
    for (var i = 0; i < state.photos.length; i++) {
      if (state.photos[i].name === name) return state.photos[i];
    }
    return null;
  }
  var bootTries = 0;
  var bootTimer = setInterval(function () {
    bootTries++;
    if (state.photos.length >= 3 || bootTries > 40) {
      clearInterval(bootTimer);
      if (state.photos.length >= 3) {
        var heroPhoto = photoByName("Sunset skyline");
        var leftPhoto = photoByName("Neon street");
        var rightPhoto = photoByName("Palms beach");
        if (heroPhoto) state.panels[0].photoId = heroPhoto.id;
        if (leftPhoto) state.panels[1].photoId = leftPhoto.id;
        if (rightPhoto) state.panels[2].photoId = rightPhoto.id;
        renderTray();
      }
      renderPreview();
    }
  }, 100);

  renderPreview();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { renderPreview(); });
  }
})();
