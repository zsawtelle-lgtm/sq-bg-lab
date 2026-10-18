/*!
 * sq-bg-lab v1.0.0 — section background effects for Squarespace 7.1, with a live tuning panel.
 * SWTL Design · github.com/zsawtelle-lgtm/sq-bg-lab
 *
 * Visitors: renders the backgrounds set in window.sqBgLab.sections.
 * Lab:      add ?bglab to any page URL. A panel opens in the corner. Pick a section,
 *           pick an effect, tune it live, then "Copy config" and paste into Code Injection.
 */
(function () {
  'use strict';
  if (window.__sqBgLabLoaded) return;
  window.__sqBgLabLoaded = true;

  var VERSION = '1.0.0';
  var CDN = 'https://cdn.jsdelivr.net/gh/zsawtelle-lgtm/sq-bg-lab@1/sq-bg-lab.js';
  var cfg = window.sqBgLab || {};
  var LS = 'sqBgLab:' + location.hostname;
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var labOn = /[?&#]bglab\b/.test(location.search + location.hash) || cfg.lab === true;

  /* ---------------- effect catalogue ---------------- */
  var EFFECTS = {
    grid:    { group: 'Static', label: 'Blueprint grid', fade: true,  desc: 'Fine drafting grid that fades out from a focus point.' },
    contour: { group: 'Static', label: 'Contours',       fade: false, desc: 'Topographic rings. Place, terrain, roots.' },
    stripe:  { group: 'Static', label: 'Pinstripe',      fade: true,  desc: 'Angled hairlines. Quiet, editorial texture.' },
    grain:   { group: 'Static', label: 'Paper grain',    fade: false, desc: 'Print-like grain. Warms up flat color.' },
    mark:    { group: 'Static', label: 'Watermark',      fade: false, desc: 'A logo or mark cropped large in the corner at low contrast.' },
    commit:  { group: 'Motion', label: 'Commit grid',    fade: true,  desc: 'Shimmering cell grid (Twinkle, Wave, Ripple, Rain).' },
    network: { group: 'Motion', label: 'Network',        fade: false, desc: 'Slow drifting nodes that link when close. Connection.' },
    flow:    { group: 'Motion', label: 'Flow lines',     fade: true,  desc: 'Slow moving contour lines.' },
    aurora:  { group: 'Motion', label: 'Glow drift',     fade: false, desc: 'Soft accent light drifting behind content.' }
  };
  var DEFAULTS = {
    grid:    { intensity: 1, major: 120, minor: 24 },
    contour: { intensity: 1, rings: 16 },
    stripe:  { intensity: 1, gap: 16, angle: 115 },
    grain:   { intensity: 1 },
    mark:    { intensity: 1, scale: 130, src: '' },
    commit:  { intensity: 1, mode: 'twinkle', cell: 10, gap: 3, speed: 1 },
    network: { intensity: 1, density: 1, speed: 1 },
    flow:    { intensity: 1, lines: 22, speed: 1 },
    aurora:  { intensity: 1, speed: 1 }
  };
  var FADE_DEFAULTS = { focusX: 85, focusY: 20, reach: 78 };
  var PARAMS = {
    grid:    [['major', 'Big squares', 40, 240, 4, 'px'], ['minor', 'Small squares', 8, 60, 1, 'px']],
    contour: [['rings', 'Rings', 6, 30, 1, '']],
    stripe:  [['gap', 'Spacing', 6, 40, 1, 'px'], ['angle', 'Angle', 0, 180, 1, '°']],
    grain:   [],
    mark:    [['scale', 'Size', 60, 220, 5, '%']],
    commit:  [['cell', 'Cell size', 4, 24, 1, 'px'], ['gap', 'Gap', 1, 8, 1, 'px'], ['speed', 'Speed', 0.2, 3, 0.1, '×']],
    network: [['density', 'Density', 0.3, 2.5, 0.1, '×'], ['speed', 'Speed', 0.2, 3, 0.1, '×']],
    flow:    [['lines', 'Lines', 8, 40, 1, ''], ['speed', 'Speed', 0.2, 3, 0.1, '×']],
    aurora:  [['speed', 'Speed', 0.3, 3, 0.1, '×']]
  };
  var FADE_PARAMS = [['focusX', 'Focus across', 0, 100, 1, '%'], ['focusY', 'Focus down', 0, 100, 1, '%'], ['reach', 'Fade reach', 30, 150, 1, '%']];

  /* ---------------- helpers ---------------- */
  var probe;
  function rgb(color) {
    if (!color) return null;
    if (!probe) { probe = document.createElement('i'); probe.style.display = 'none'; document.body.appendChild(probe); }
    probe.style.color = ''; probe.style.color = color;
    var m = getComputedStyle(probe).color.match(/[\d.]+/g);
    return m ? m.slice(0, 3).map(Number).join(',') : null;
  }
  function lum(triple) { var m = triple.split(',').map(Number); return (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) / 255; }
  function hash(x, y) { var s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
  function svgUrl(svg) { return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")'; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function full(s) {
    var e = s.effect, o = Object.assign({}, DEFAULTS[e] || {}, EFFECTS[e] && EFFECTS[e].fade ? FADE_DEFAULTS : {}, s);
    o.effect = e; return o;
  }
  function round(v) { return Math.round(v * 1000) / 1000; }

  /* ---------------- styles ---------------- */
  var css = document.createElement('style');
  css.id = 'sq-bg-lab-css';
  css.textContent =
    '.sbl-layer{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0}' +
    '.sbl-layer canvas{position:absolute;inset:0;width:100%;height:100%}' +
    '.sbl-blob{position:absolute;border-radius:50%;filter:blur(70px);will-change:transform}' +
    '@keyframes sblA{0%{transform:translate(0,0) scale(1)}50%{transform:translate(-12vw,8vh) scale(1.15)}100%{transform:translate(6vw,-6vh) scale(.95)}}' +
    '@keyframes sblB{0%{transform:translate(0,0) scale(1)}50%{transform:translate(10vw,-10vh) scale(.9)}100%{transform:translate(-8vw,6vh) scale(1.1)}}';
  document.head.appendChild(css);

  /* ---------------- sections ---------------- */
  function sectionInfo(s) {
    var host = s.querySelector('.section-background') || s;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    var bg = rgb(getComputedStyle(host).backgroundColor);
    var dark = bg && !/,0$/.test(bg) && getComputedStyle(host).backgroundColor.indexOf('rgba(0, 0, 0, 0)') !== 0 ? lum(bg) < 0.45 : false;
    var textEl = s.querySelector('h1,h2,h3,h4,p') || s;
    var ink = rgb(getComputedStyle(textEl).color) || (dark ? '255,255,255' : '0,0,0');
    var name = (s.querySelector('h1,h2,h3,h4,p') || {}).textContent || '';
    return { el: s, id: s.getAttribute('data-section-id'), host: host, dark: dark, ink: ink, name: name.trim().slice(0, 34), layer: null, kill: null };
  }
  var secs = [];
  function scan() { secs = [].slice.call(document.querySelectorAll('section.page-section[data-section-id]')).map(sectionInfo); }

  /* ---------------- animation loop ---------------- */
  var anims = [], raf = 0, last = 0;
  function loop(t) {
    raf = requestAnimationFrame(loop);
    if (t - last < 33) return; last = t;
    for (var i = 0; i < anims.length; i++) if (anims[i].visible) anims[i].draw(t / 1000);
  }
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { anims.forEach(function (a) { if (a.layer === e.target) a.visible = e.isIntersecting; }); });
  }) : null;
  function canvasIn(L) {
    var cv = document.createElement('canvas'); L.appendChild(cv);
    var ctx = cv.getContext('2d'), box = { w: 1, h: 1 };
    function fit() {
      var r = L.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.max(1, r.width * d); cv.height = Math.max(1, r.height * d);
      ctx.setTransform(d, 0, 0, d, 0, 0); box.w = r.width; box.h = r.height;
    }
    fit();
    var ro = 'ResizeObserver' in window ? new ResizeObserver(fit) : null; if (ro) ro.observe(L);
    return { ctx: ctx, box: box, stop: function () { if (ro) ro.disconnect(); } };
  }
  function animate(L, draw, stop) {
    var a = { layer: L, visible: true, draw: draw };
    anims.push(a); if (io) io.observe(L);
    if (!raf) raf = requestAnimationFrame(loop);
    if (reduce) { draw(4); a.visible = false; }
    return function () { anims.splice(anims.indexOf(a), 1); if (io) io.unobserve(L); if (stop) stop(); };
  }
  function fade(L, o) {
    var m = 'radial-gradient(ellipse 85% 95% at ' + o.focusX + '% ' + o.focusY + '%,#000 10%,transparent ' + o.reach + '%)';
    L.style.webkitMaskImage = m; L.style.maskImage = m;
  }

  /* ---------------- renderers ---------------- */
  var R = {
    grid: function (L, o, ink) {
      var a = 0.09 * o.intensity, b = 0.045 * o.intensity;
      L.style.backgroundImage = ['linear-gradient(rgba(' + ink + ',' + a + ') 1px,transparent 1px)', 'linear-gradient(90deg,rgba(' + ink + ',' + a + ') 1px,transparent 1px)', 'linear-gradient(rgba(' + ink + ',' + b + ') 1px,transparent 1px)', 'linear-gradient(90deg,rgba(' + ink + ',' + b + ') 1px,transparent 1px)'].join(',');
      L.style.backgroundSize = o.major + 'px ' + o.major + 'px,' + o.major + 'px ' + o.major + 'px,' + o.minor + 'px ' + o.minor + 'px,' + o.minor + 'px ' + o.minor + 'px';
      L.style.backgroundPosition = '-1px -1px';
    },
    stripe: function (L, o, ink) {
      L.style.backgroundImage = 'repeating-linear-gradient(' + o.angle + 'deg,rgba(' + ink + ',' + (0.08 * o.intensity) + ') 0 1px,transparent 1px ' + o.gap + 'px)';
    },
    grain: function (L, o, ink, s) {
      var v = s.dark ? 1 : 0;
      L.style.backgroundImage = svgUrl("<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 " + v + " 0 0 0 0 " + v + " 0 0 0 0 " + v + " 0 0 0 .5 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>");
      L.style.opacity = String(Math.min(1, 0.55 * o.intensity));
    },
    contour: function (L, o, ink) {
      var paths = '', centers = [[1250, 260, 0], [380, 900, 2.1]];
      centers.forEach(function (c) {
        for (var k = 0; k < o.rings; k++) {
          var d = '';
          for (var i = 0; i <= 140; i++) {
            var t = i / 140 * Math.PI * 2;
            var r = 40 + k * 34 + 16 * Math.sin(3 * t + c[2] + k * 0.25) + 9 * Math.sin(5 * t - k * 0.18 + c[2]) + 5 * Math.sin(8 * t + k * 0.4);
            d += (i ? 'L' : 'M') + (c[0] + r * Math.cos(t)).toFixed(1) + ' ' + (c[1] + r * 0.78 * Math.sin(t)).toFixed(1);
          }
          paths += "<path d='" + d + "Z'/>";
        }
      });
      L.style.backgroundImage = svgUrl("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 1000' preserveAspectRatio='xMidYMid slice'><g fill='none' stroke='rgb(" + ink + ")' stroke-opacity='" + (0.11 * o.intensity).toFixed(3) + "' stroke-width='1.2'>" + paths + '</g></svg>');
      L.style.backgroundSize = 'cover'; L.style.backgroundPosition = 'center';
    },
    mark: function (L, o, ink, s) {
      var src = o.src || cfg.mark || ((document.querySelector('.header-title-logo img, .header-branding img') || {}).src) || '';
      if (!src) return;
      var img = new Image(); img.src = src; img.alt = '';
      img.style.cssText = 'position:absolute;right:-6%;bottom:-18%;height:' + o.scale + '%;width:auto;max-width:none;opacity:' + Math.min(1, 0.07 * o.intensity) + ';filter:' + (s.dark ? 'brightness(0) invert(1)' : 'brightness(0)');
      L.appendChild(img);
    },
    aurora: function (L, o, ink, s, acc) {
      var b1 = document.createElement('div'), b2 = document.createElement('div');
      b1.className = b2.className = 'sbl-blob';
      var g = (s.dark ? 0.35 : 0.22) * o.intensity, t1 = reduce ? 0 : 26 / o.speed, t2 = reduce ? 0 : 32 / o.speed;
      b1.style.cssText += 'width:55vw;height:55vw;max-width:900px;max-height:900px;right:-10%;top:-30%;background:radial-gradient(circle,rgba(' + acc + ',' + g + ') 0%,transparent 65%);animation:sblA ' + t1 + 's ease-in-out infinite alternate';
      b2.style.cssText += 'width:50vw;height:50vw;max-width:800px;max-height:800px;left:-12%;bottom:-35%;background:radial-gradient(circle,rgba(' + ink + ',' + (g * 0.6) + ') 0%,transparent 65%);animation:sblB ' + t2 + 's ease-in-out infinite alternate';
      L.appendChild(b1); L.appendChild(b2);
    },
    commit: function (L, o, ink, s, acc) {
      var c = canvasIn(L), ctx = c.ctx, box = c.box;
      return animate(L, function (t) {
        var step = o.cell + o.gap, sp = o.speed;
        ctx.clearRect(0, 0, box.w, box.h);
        var cols = Math.ceil(box.w / step), rows = Math.ceil(box.h / step), cx = cols * 0.78, cy = rows * 0.25;
        for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
          var h = hash(x, y), v;
          if (o.mode === 'wave') v = Math.pow(0.5 + 0.5 * Math.sin(x * 0.18 + y * 0.06 - t * sp * 1.4), 4);
          else if (o.mode === 'ripple') v = Math.pow(0.5 + 0.5 * Math.sin(Math.hypot(x - cx, y - cy) * 0.35 - t * sp * 2.2), 5);
          else if (o.mode === 'rain') { var len = rows + 14, p = ((t * sp * 9 * (0.6 + hash(x, 7) * 1.4) + hash(x, 3) * len) % len) - y; v = p >= 0 && p < 8 ? Math.pow(1 - p / 8, 2) : 0; }
          else v = Math.pow(0.5 + 0.5 * Math.sin(t * sp * (0.6 + h * 1.6) + h * 40), 8);
          var al = (s.dark ? 0.05 : 0.045) + v * (s.dark ? 0.32 : 0.22);
          ctx.fillStyle = h > 0.965 ? 'rgba(' + acc + ',' + Math.min(1, al * 1.6 * o.intensity) + ')' : 'rgba(' + ink + ',' + al * o.intensity + ')';
          ctx.fillRect(x * step, y * step, o.cell, o.cell);
        }
      }, c.stop);
    },
    network: function (L, o, ink, s, acc) {
      var c = canvasIn(L), ctx = c.ctx, box = c.box;
      var n = Math.max(12, Math.round(box.w * box.h / 16000 * o.density));
      var P = []; for (var i = 0; i < n; i++) P.push({ x: Math.random() * box.w, y: Math.random() * box.h, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25, g: i % 9 === 0 });
      var lt = 0;
      return animate(L, function (t) {
        var dt = lt ? Math.min(0.1, t - lt) * 60 * o.speed : 1; lt = t;
        ctx.clearRect(0, 0, box.w, box.h);
        P.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.x < -20) p.x = box.w + 20; if (p.x > box.w + 20) p.x = -20; if (p.y < -20) p.y = box.h + 20; if (p.y > box.h + 20) p.y = -20; });
        for (var i = 0; i < P.length; i++) for (var j = i + 1; j < P.length; j++) {
          var d = Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y);
          if (d < 150) { ctx.strokeStyle = 'rgba(' + ink + ',' + (1 - d / 150) * (s.dark ? 0.22 : 0.16) * o.intensity + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(P[i].x, P[i].y); ctx.lineTo(P[j].x, P[j].y); ctx.stroke(); }
        }
        P.forEach(function (p) { ctx.fillStyle = p.g ? 'rgba(' + acc + ',' + 0.8 * o.intensity + ')' : 'rgba(' + ink + ',' + (s.dark ? 0.4 : 0.3) * o.intensity + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, p.g ? 2.6 : 1.8, 0, 6.283); ctx.fill(); });
      }, c.stop);
    },
    flow: function (L, o, ink, s, acc) {
      var c = canvasIn(L), ctx = c.ctx, box = c.box;
      return animate(L, function (t) {
        ctx.clearRect(0, 0, box.w, box.h);
        var sp = o.speed * 0.35;
        for (var i = 0; i < o.lines; i++) {
          var y0 = (i + 0.5) / o.lines * box.h;
          ctx.beginPath();
          for (var x = -10; x <= box.w + 10; x += 12) {
            var y = y0 + 26 * Math.sin(x * 0.0035 + t * sp + i * 0.42) + 14 * Math.sin(x * 0.009 - t * sp * 1.3 + i * 0.9);
            if (x < 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = i % 7 === 3 ? 'rgba(' + acc + ',' + 0.35 * o.intensity + ')' : 'rgba(' + ink + ',' + (s.dark ? 0.13 : 0.1) * o.intensity + ')';
          ctx.lineWidth = 1.2; ctx.stroke();
        }
      }, c.stop);
    }
  };

  /* ---------------- render ---------------- */
  var settings = clone(cfg.sections || {});
  function accentFor(s) { return rgb(cfg.accent) || s.ink; }
  function renderSection(s) {
    if (s.kill) { s.kill(); s.kill = null; }
    if (s.layer) { s.layer.remove(); s.layer = null; }
    var set = settings[s.id];
    if (!set || !set.effect || set.effect === 'none' || !R[set.effect]) return;
    var o = full(set), L = document.createElement('div');
    L.className = 'sbl-layer'; s.host.appendChild(L); s.layer = L;
    var ink = rgb(o.ink) || s.ink;
    if (EFFECTS[o.effect].fade && o.fade !== false) fade(L, o);
    s.kill = R[o.effect](L, o, ink, s, accentFor(s)) || null;
  }
  function renderAll() { secs.forEach(renderSection); }

  function start() {
    scan(); renderAll();
    if (labOn) lab();
  }

  /* ---------------- exports ---------------- */
  function configSnippet() {
    var out = {}, any = false;
    Object.keys(settings).forEach(function (id) {
      var s = settings[id]; if (!s || !s.effect || s.effect === 'none') return;
      var o = full(s), keep = { effect: o.effect };
      Object.keys(o).forEach(function (k) { if (k !== 'effect' && o[k] !== '' && o[k] !== undefined) keep[k] = typeof o[k] === 'number' ? round(o[k]) : o[k]; });
      out[id] = keep; any = true;
    });
    if (!any) return '<!-- No backgrounds set yet. Pick a section and an effect. -->';
    var body = JSON.stringify(out, null, 2).replace(/\n/g, '\n  ');
    return '<!-- Section backgrounds | sq-bg-lab -->\n<script>\nwindow.sqBgLab = {\n' + (cfg.accent ? '  accent: ' + JSON.stringify(cfg.accent) + ',\n' : '') + '  sections: ' + body + '\n};\n</script>\n<script src="' + CDN + '"></script>';
  }
  function cssSnippet() {
    var parts = [];
    Object.keys(settings).forEach(function (id) {
      var set = settings[id]; if (!set || !set.effect) return;
      var o = full(set), s = secs.filter(function (x) { return x.id === id; })[0]; if (!s) return;
      var ink = rgb(o.ink) || s.ink, sel = '[data-section-id="' + id + '"]';
      var mask = EFFECTS[o.effect].fade && o.fade !== false ? '  -webkit-mask-image: ~"radial-gradient(ellipse 85% 95% at var(--bg-focus-x) var(--bg-focus-y), #000 10%, transparent var(--bg-reach))";\n  mask-image: ~"radial-gradient(ellipse 85% 95% at var(--bg-focus-x) var(--bg-focus-y), #000 10%, transparent var(--bg-reach))";\n' : '';
      var vars = '  --bg-color: ' + ink.split(',').join(', ') + ';    /* R, G, B */\n  --bg-intensity: ' + round(o.intensity) + ';\n' + (mask ? '  --bg-focus-x: ' + o.focusX + '%;\n  --bg-focus-y: ' + o.focusY + '%;\n  --bg-reach: ' + o.reach + '%;\n' : '');
      if (o.effect === 'grid') {
        parts.push('/* Blueprint grid — settings */\n' + sel + ' {\n  --bg-major: ' + o.major + 'px;\n  --bg-minor: ' + o.minor + 'px;\n  --bg-line: 1px;\n' + vars + '}\n' + sel + ' .section-background::after {\n  content: "";\n  position: absolute;\n  inset: 0;\n  pointer-events: none;\n  background-image: ~"linear-gradient(rgba(var(--bg-color), calc(.09 * var(--bg-intensity))) var(--bg-line), transparent var(--bg-line)), linear-gradient(90deg, rgba(var(--bg-color), calc(.09 * var(--bg-intensity))) var(--bg-line), transparent var(--bg-line)), linear-gradient(rgba(var(--bg-color), calc(.045 * var(--bg-intensity))) var(--bg-line), transparent var(--bg-line)), linear-gradient(90deg, rgba(var(--bg-color), calc(.045 * var(--bg-intensity))) var(--bg-line), transparent var(--bg-line))";\n  background-size: ~"var(--bg-major) var(--bg-major), var(--bg-major) var(--bg-major), var(--bg-minor) var(--bg-minor), var(--bg-minor) var(--bg-minor)";\n  background-position: -1px -1px;\n' + mask + '}');
      } else if (o.effect === 'stripe') {
        parts.push('/* Pinstripe — settings */\n' + sel + ' {\n  --bg-gap: ' + o.gap + 'px;\n  --bg-angle: ' + o.angle + 'deg;\n' + vars + '}\n' + sel + ' .section-background::after {\n  content: "";\n  position: absolute;\n  inset: 0;\n  pointer-events: none;\n  background-image: ~"repeating-linear-gradient(var(--bg-angle), rgba(var(--bg-color), calc(.08 * var(--bg-intensity))) 0 1px, transparent 1px var(--bg-gap))";\n' + mask + '}');
      }
    });
    return parts.length ? parts.join('\n\n') : '/* CSS export covers Blueprint grid and Pinstripe. Other effects need the script (Copy config). */';
  }

  /* ---------------- lab panel ---------------- */
  function lab() {
    try { var saved = JSON.parse(localStorage.getItem(LS) || 'null'); if (saved && saved.sections) { settings = Object.assign(settings, saved.sections); if (saved.accent) cfg.accent = saved.accent; renderAll(); } } catch (e) {}
    function persist() { try { localStorage.setItem(LS, JSON.stringify({ sections: settings, accent: cfg.accent || '' })); } catch (e) {} }

    var st = document.createElement('style');
    st.textContent =
      '#sbl-panel{position:fixed;right:16px;bottom:16px;z-index:2147483000;width:310px;max-height:calc(100vh - 32px);overflow:auto;background:#111915;color:#f3efe6;border:1px solid rgba(255,255,255,.12);border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,.35);font:500 12px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;padding:14px 16px 16px;-webkit-font-smoothing:antialiased}' +
      '#sbl-panel *{box-sizing:border-box}' +
      '#sbl-panel h6{margin:14px 0 6px;font:700 10px/1 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:rgba(243,239,230,.55)}' +
      '#sbl-panel .t{display:flex;align-items:center;justify-content:space-between;gap:8px}' +
      '#sbl-panel .ttl{font:700 14px/1 system-ui,sans-serif}#sbl-panel .ttl i{font-style:normal;color:#d9a441}' +
      '#sbl-panel .live{font:700 9px/1 system-ui;letter-spacing:.12em;color:rgba(243,239,230,.5);margin-left:6px}' +
      '#sbl-panel .p{display:flex;flex-wrap:wrap;gap:6px}' +
      '#sbl-panel button{all:unset;cursor:pointer;padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:#f3efe6;font:600 12px/1 system-ui,sans-serif}' +
      '#sbl-panel button:hover{border-color:rgba(255,255,255,.35)}#sbl-panel button.on{background:#d9a441;border-color:#d9a441;color:#111915}' +
      '#sbl-panel .d{margin-top:10px;color:rgba(243,239,230,.72)}' +
      '#sbl-panel label{display:flex;justify-content:space-between;margin:12px 0 6px;font:700 10px/1 system-ui;letter-spacing:.12em;text-transform:uppercase;color:rgba(243,239,230,.55)}#sbl-panel label b{color:#f3efe6;letter-spacing:0}' +
      '#sbl-panel input[type=range]{width:100%;accent-color:#d9a441}' +
      '#sbl-panel input[type=text]{width:100%;padding:7px 9px;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:#f3efe6;font:500 12px system-ui}' +
      '#sbl-panel input[type=color]{width:34px;height:26px;border:0;background:none;padding:0;cursor:pointer}' +
      '#sbl-panel .row{display:flex;align-items:center;gap:8px;margin-top:6px}' +
      '#sbl-panel textarea{width:100%;height:120px;margin-top:8px;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:#0b100d;color:#cfe3d6;font:11px/1.45 ui-monospace,Menlo,monospace;resize:vertical}' +
      '#sbl-panel.min .b{display:none}' +
      '#sbl-panel .tgt{padding:8px 10px;border-radius:8px;background:rgba(255,255,255,.05);color:rgba(243,239,230,.85)}' +
      '.sbl-hover{outline:2px dashed #d9a441 !important;outline-offset:-2px}.sbl-picked{outline:2px solid #d9a441 !important;outline-offset:-2px}';
    document.head.appendChild(st);

    var P = document.createElement('div'); P.id = 'sbl-panel';
    var targets = [], picking = false;
    function btn(k, v, txt) { return '<button data-k="' + k + '" data-v="' + v + '">' + txt + '</button>'; }
    function group(g) { return Object.keys(EFFECTS).filter(function (k) { return EFFECTS[k].group === g; }).map(function (k) { return btn('effect', k, EFFECTS[k].label); }).join(''); }
    P.innerHTML =
      '<div class="t"><div class="ttl">Background lab<i>.</i><span class="live">● LIVE</span></div><div class="p"><button data-a="min">–</button><button data-a="exit" title="Close lab">✕</button></div></div>' +
      '<div class="b">' +
      '<h6>Section</h6><div class="tgt">None picked</div>' +
      '<div class="p" style="margin-top:6px"><button data-a="pick">Pick on page</button><button data-a="all">All</button><button data-a="dark">Dark</button><button data-a="light">Light</button></div>' +
      '<h6>Static</h6><div class="p">' + group('Static') + '</div>' +
      '<h6>Motion</h6><div class="p">' + group('Motion') + btn('effect', 'none', 'Off') + '</div>' +
      '<div class="d"></div>' +
      '<div class="ctl"></div>' +
      '<h6>Accent color</h6><div class="row"><input type="color" data-a="accent"><span class="acc-v" style="color:rgba(243,239,230,.7)"></span></div>' +
      '<h6>Export</h6><div class="p"><button data-a="copy">Copy config</button><button data-a="css">Copy CSS</button><button data-a="reset">Reset section</button></div>' +
      '<textarea readonly spellcheck="false"></textarea>' +
      '</div>';
    document.body.appendChild(P);
    var $ = function (q) { return P.querySelector(q); };

    function cur() { return targets.length ? (settings[targets[0].id] || { effect: 'none' }) : { effect: 'none' }; }
    function each(fn) { targets.forEach(function (s) { settings[s.id] = settings[s.id] || { effect: 'none' }; fn(settings[s.id], s); }); }
    function slider(key, label, min, max, step, unit, val) {
      var shown = unit === '×' ? Number(val).toFixed(1) + '×' : unit === '%' && key === 'intensity' ? Math.round(val * 100) + '%' : val + unit;
      return '<label>' + label + ' <b data-o="' + key + '">' + shown + '</b></label><input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '" data-p="' + key + '" data-u="' + unit + '">';
    }
    function drawControls() {
      var c = cur(), e = c.effect, o = e && e !== 'none' ? full(c) : null, h = '';
      P.querySelectorAll('button[data-k=effect]').forEach(function (b) { b.classList.toggle('on', targets.length && b.dataset.v === (e || 'none')); });
      $('.d').textContent = !targets.length ? 'Pick a section on the page, or choose All, Dark or Light.' : o ? EFFECTS[e].desc : 'No background on this section.';
      if (o) {
        h += slider('intensity', 'Intensity', 0, 2.5, 0.05, '%', o.intensity);
        if (e === 'commit') h += '<h6>Pattern</h6><div class="p">' + ['twinkle', 'wave', 'ripple', 'rain'].map(function (m) { return '<button data-m="' + m + '" class="' + (o.mode === m ? 'on' : '') + '">' + m[0].toUpperCase() + m.slice(1) + '</button>'; }).join('') + '</div>';
        PARAMS[e].forEach(function (p) { h += slider(p[0], p[1], p[2], p[3], p[4], p[5], o[p[0]]); });
        if (EFFECTS[e].fade && o.fade !== false) FADE_PARAMS.forEach(function (p) { h += slider(p[0], p[1], p[2], p[3], p[4], p[5], o[p[0]]); });
        if (e === 'mark') h += '<label>Image URL (blank = site logo)</label><input type="text" data-t="src" value="' + (o.src || '') + '" placeholder="https://…/mark.svg">';
      }
      $('.ctl').innerHTML = h;
      var acc = cfg.accent || '#d9a441';
      $('input[data-a=accent]').value = /^#[0-9a-f]{6}$/i.test(acc) ? acc : '#d9a441';
      $('.acc-v').textContent = cfg.accent || 'not set (uses text color)';
    }
    function setTargets(list) {
      secs.forEach(function (s) { s.el.classList.remove('sbl-picked'); });
      targets = list; targets.forEach(function (s) { s.el.classList.add('sbl-picked'); });
      setTimeout(function () { targets.forEach(function (s) { s.el.classList.remove('sbl-picked'); }); }, 900);
      $('.tgt').textContent = !list.length ? 'None picked' : list.length === 1 ? (list[0].name || list[0].id) + (list[0].dark ? ' · dark' : ' · light') : list.length + ' sections';
      drawControls();
    }
    function refresh() { targets.forEach(renderSection); persist(); $('textarea').value = configSnippet(); }

    function onMove(e) { var s = e.target.closest && e.target.closest('section.page-section'); secs.forEach(function (x) { x.el.classList.toggle('sbl-hover', x.el === s); }); }
    function onPick(e) {
      if (P.contains(e.target)) return;
      var el = e.target.closest && e.target.closest('section.page-section'); if (!el) return;
      e.preventDefault(); e.stopPropagation();
      stopPick(); setTargets(secs.filter(function (s) { return s.el === el; }));
    }
    function stopPick() { picking = false; document.removeEventListener('mousemove', onMove, true); document.removeEventListener('click', onPick, true); secs.forEach(function (x) { x.el.classList.remove('sbl-hover'); }); $('button[data-a=pick]').classList.remove('on'); }

    P.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var a = b.dataset.a;
      if (a === 'min') { P.classList.toggle('min'); b.textContent = P.classList.contains('min') ? '+' : '–'; return; }
      if (a === 'exit') { stopPick(); P.remove(); return; }
      if (a === 'pick') { if (picking) return stopPick(); picking = true; b.classList.add('on'); document.addEventListener('mousemove', onMove, true); document.addEventListener('click', onPick, true); return; }
      if (a === 'all') return setTargets(secs.slice());
      if (a === 'dark') return setTargets(secs.filter(function (s) { return s.dark; }));
      if (a === 'light') return setTargets(secs.filter(function (s) { return !s.dark; }));
      if (a === 'reset') { each(function (set, s) { delete settings[s.id]; }); refresh(); drawControls(); return; }
      if (a === 'copy' || a === 'css') {
        var txt = a === 'copy' ? configSnippet() : cssSnippet(); $('textarea').value = txt;
        if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = a === 'copy' ? 'Copy config' : 'Copy CSS'; }, 1200); }, function () {});
        $('textarea').select(); return;
      }
      if (b.dataset.k === 'effect') {
        if (!targets.length) return;
        var v = b.dataset.v;
        each(function (set, s) { var keep = {}; ['focusX', 'focusY', 'reach', 'intensity'].forEach(function (k) { if (set[k] !== undefined) keep[k] = set[k]; }); settings[s.id] = v === 'none' ? { effect: 'none' } : Object.assign({ effect: v }, keep); });
        refresh(); drawControls(); return;
      }
      if (b.dataset.m) { each(function (set) { set.mode = b.dataset.m; }); P.querySelectorAll('button[data-m]').forEach(function (x) { x.classList.toggle('on', x === b); }); persist(); $('textarea').value = configSnippet(); targets.forEach(renderSection); }
    });
    var tmr;
    P.addEventListener('input', function (e) {
      var t = e.target;
      if (t.dataset.a === 'accent') { cfg.accent = t.value; $('.acc-v').textContent = t.value; clearTimeout(tmr); tmr = setTimeout(function () { renderAll(); persist(); $('textarea').value = configSnippet(); }, 120); return; }
      var k = t.dataset.p || t.dataset.t; if (!k || !targets.length) return;
      var val = t.dataset.p ? parseFloat(t.value) : t.value;
      each(function (set) { set[k] = val; });
      var out = P.querySelector('b[data-o="' + k + '"]');
      if (out) { var u = t.dataset.u; out.textContent = u === '×' ? val.toFixed(1) + '×' : k === 'intensity' ? Math.round(val * 100) + '%' : val + u; }
      clearTimeout(tmr); tmr = setTimeout(refresh, 60);
    });

    $('textarea').value = configSnippet();
    drawControls();
    window.sqBgLab = window.sqBgLab || cfg;
    window.sqBgLab.api = { settings: settings, sections: secs, renderAll: renderAll, configSnippet: configSnippet, cssSnippet: cssSnippet, version: VERSION };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
