/* =========================================================
   S1 CONTEST — «Frozen» edition
   Снегопад (canvas), параллакс льда, снежные блоки, меню
   ========================================================= */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var header = document.querySelector('header');
  var hero = document.querySelector('.hero');
  var heroContent = document.querySelector('.hero-content');
  var iceFrame = document.querySelector('.ice-frame');
  var iceImg = document.querySelector('.ice-img');

  /* ---------- Мобильное меню ---------- */
  var toggle = document.querySelector('.mobile-menu-toggle');
  var navLinks = document.querySelector('.nav-links');
  var overlay = document.querySelector('.mobile-menu-overlay');

  function toggleMenu() {
    toggle.classList.toggle('active');
    navLinks.classList.toggle('active');
    overlay.classList.toggle('active');
    document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
  }
  if (toggle) toggle.addEventListener('click', toggleMenu);
  if (overlay) overlay.addEventListener('click', toggleMenu);
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    a.addEventListener('click', function () { if (navLinks.classList.contains('active')) toggleMenu(); });
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth > 860 && navLinks && navLinks.classList.contains('active')) toggleMenu();
  });

  /* ---------- Плавный скролл по якорям ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (!href || href === '#') return;
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.pageYOffset - header.offsetHeight - 10;
      window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  /* ---------- Появление блоков: снег «оседает», сосульки отрастают ---------- */
  var REVEAL = '.info-card,.detail-item,.category-card,.reg-card,.ticket-card,.criteria-box,.criterion,' +
    '.contact-item,.info-box,.rules-item,.master-card,.pricing-master,.booking-terms,.masters-intro,' +
    '.fees-table-container,.warning-box';
  var els = Array.prototype.slice.call(document.querySelectorAll(REVEAL));

  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        el.classList.add('in-view');
        setTimeout(function () { el.classList.add('settled'); }, 2200);
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) {
      var sibs = el.parentNode ? Array.prototype.filter.call(el.parentNode.children, function (c) { return els.indexOf(c) > -1; }) : [el];
      var i = Math.max(0, sibs.indexOf(el));
      el.style.setProperty('--d', (i % 4) * 0.12 + 's');
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  /* ---------- «Свет сквозь лёд» — подсветка карточек за курсором ---------- */
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    var card = e.target.closest && e.target.closest(REVEAL);
    if (!card) return;
    var r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

  /* ---------- Скролл: шапка, прозрачность льда, параллакс героя ---------- */
  var scrollDelta = 0;
  var lastY = window.pageYOffset;
  var ticking = false;

  function applyScroll() {
    ticking = false;
    var y = window.pageYOffset, vh = window.innerHeight;
    header.classList.toggle('scrolled', y > 50);
    var p = Math.min(1, y / (vh * 0.85));
    if (iceFrame) iceFrame.style.setProperty('--iceO', (1 - p * 0.62).toFixed(3));
    if (hero && y < vh * 1.3) {
      hero.style.setProperty('--heroShift', (y * 0.22).toFixed(1) + 'px');
      if (heroContent) heroContent.style.opacity = Math.max(0, 1 - y / (vh * 0.75)).toFixed(3);
    }
    scrollDelta += y - lastY;
    lastY = y;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(applyScroll); }
  }, { passive: true });
  applyScroll();

  /* ---------- Снегопад ---------- */
  function makeSprite(size, stops) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var g = c.getContext('2d');
    var gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
    return c;
  }
  var spriteHard = makeSprite(64, [[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,.9)'], [0.65, 'rgba(210,235,255,.22)'], [1, 'rgba(210,235,255,0)']]);
  var spriteSoft = makeSprite(128, [[0, 'rgba(235,246,255,.55)'], [0.45, 'rgba(210,232,255,.22)'], [1, 'rgba(200,225,255,0)']]);

  function Layer(canvas, cfg) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.cfg = cfg;
    this.flakes = [];
    this.resize();
  }
  Layer.prototype.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth, h = window.innerHeight;
    this.w = w; this.h = h; this.dpr = dpr;
    this.c.width = Math.round(w * dpr);
    this.c.height = Math.round(h * dpr);
    var n = Math.round(Math.min(this.cfg.max, Math.max(this.cfg.min, (w * h) / this.cfg.area)));
    while (this.flakes.length < n) this.flakes.push(this.make(true));
    this.flakes.length = n;
    for (var i = 0; i < this.flakes.length; i++) {
      var f = this.flakes[i];
      if (f.x > w) f.x = Math.random() * w;
      if (f.y > h) f.y = Math.random() * h;
    }
  };
  Layer.prototype.make = function (anywhere) {
    var c = this.cfg, depth = Math.pow(Math.random(), 1.6);
    var r = c.rMin + (c.rMax - c.rMin) * depth;
    return {
      x: Math.random() * this.w,
      y: anywhere ? Math.random() * this.h : -r * 4,
      r: r, d: depth,
      vy: c.vMin + (c.vMax - c.vMin) * depth,
      ph: Math.random() * 6.283,
      fr: 0.4 + Math.random() * 0.9,
      am: 6 + Math.random() * 18,
      a: c.aMin + (c.aMax - c.aMin) * (0.4 + 0.6 * depth),
      star: !c.soft && r > 1.5 && Math.random() < 0.12
    };
  };
  Layer.prototype.step = function (dt, t, wind, speedMul, scrollDelta) {
    var ctx = this.ctx, dpr = this.dpr, w = this.w, h = this.h, soft = this.cfg.soft;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    var sp = soft ? spriteSoft : spriteHard;
    for (var i = 0; i < this.flakes.length; i++) {
      var f = this.flakes[i];
      f.y += f.vy * speedMul * dt - scrollDelta * f.d * 0.5;
      f.x += (wind * (0.35 + f.d) + Math.sin(t * f.fr + f.ph) * f.am) * dt;
      var m = f.r * 5;
      if (f.y > h + m) { f.y = -m; f.x = Math.random() * w; }
      else if (f.y < -m * 3) { f.y = h + m; }
      if (f.x > w + m) f.x = -m; else if (f.x < -m) f.x = w + m;
      var size = soft ? f.r * 2 : f.r * 3.4;
      ctx.globalAlpha = f.a;
      ctx.drawImage(sp, f.x - size / 2, f.y - size / 2, size, size);
      if (f.star) {
        var tw = 0.5 + 0.5 * Math.sin(t * 2.2 + f.ph * 3);
        var L = f.r * (3 + 3 * tw);
        ctx.globalAlpha = f.a * tw;
        ctx.strokeStyle = '#eaf6ff'; ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(f.x - L, f.y); ctx.lineTo(f.x + L, f.y);
        ctx.moveTo(f.x, f.y - L); ctx.lineTo(f.x, f.y + L);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  };

  var backEl = document.getElementById('snow-back');
  var frontEl = document.getElementById('snow-front');
  var small = window.innerWidth < 700;
  var back = backEl && new Layer(backEl, {
    area: small ? 9000 : 6500, min: 60, max: small ? 150 : 240,
    rMin: 0.6, rMax: 2.6, vMin: 22, vMax: 70, aMin: 0.25, aMax: 0.95
  });
  var front = frontEl && new Layer(frontEl, {
    area: small ? 90000 : 60000, min: 8, max: 26, soft: true,
    rMin: 6, rMax: 22, vMin: 60, vMax: 150, aMin: 0.35, aMax: 0.9
  });

  /* ветер от курсора и параллакс льда */
  var tx = 0, ty = 0, cx = 0, cy = 0;
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    tx = e.clientX / window.innerWidth - 0.5;
    ty = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });
  if (window.DeviceOrientationEvent && small) {
    window.addEventListener('deviceorientation', function (e) {
      if (e.gamma != null) tx = Math.max(-0.5, Math.min(0.5, e.gamma / 60));
    }, { passive: true });
  }

  window.addEventListener('resize', function () {
    if (back) back.resize();
    if (front) front.resize();
    if (reduce) drawStatic();
  });

  function drawStatic() {
    if (back) back.step(0, 0, 0, 0, 0);
    if (front) front.step(0, 0, 0, 0, 0);
  }

  if (reduce) {
    drawStatic();
  } else {
    var last = performance.now(), t = 0, wind = 10, vel = 0;
    (function loop(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now; t += dt;

      var sd = scrollDelta; scrollDelta = 0;
      vel += ((Math.abs(sd) / Math.max(dt, 0.001)) - vel) * Math.min(1, dt * 5);
      var speedMul = 1 + Math.min(2.2, vel / 1400);
      var targetWind = 12 + tx * 90 + Math.sin(t * 0.23) * 16 + Math.sin(t * 0.61) * 7;
      wind += (targetWind - wind) * Math.min(1, dt * 1.8);

      if (back) back.step(dt, t, wind, speedMul, sd);
      if (front) front.step(dt, t, wind * 1.3, speedMul, sd);

      /* параллакс льда за курсором */
      cx += (tx - cx) * Math.min(1, dt * 3);
      cy += (ty - cy) * Math.min(1, dt * 3);
      if (iceImg) {
        iceImg.style.setProperty('--px', (-cx * 26).toFixed(2) + 'px');
        iceImg.style.setProperty('--py', (-cy * 18).toFixed(2) + 'px');
      }
      requestAnimationFrame(loop);
    })(last);
  }
})();
