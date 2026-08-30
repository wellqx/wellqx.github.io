/* WELLQX — main.js : shared behaviour */
(function () {
  var WQ = (window.WQ = window.WQ || {});

  /* ---------- Lights / SHIFT state ---------- */
  var lightsOut = false;

  WQ.isLightsOut = function () { return lightsOut; };

  WQ.setLights = function (out) {
    lightsOut = out;
    var root = document.documentElement;
    root.classList.toggle('lights-off', out);
    var gl = document.getElementById('webgl');
    if (gl) gl.classList.toggle('is-fading', out);
    var btn = document.getElementById('js-lights-btn');
    if (btn) btn.classList.toggle('is-active', out);
    var btn2 = document.getElementById('js-lights-btn-idle');
    if (btn2) btn2.classList.toggle('is-active', out);
    var ev = new CustomEvent('wq:lights', { detail: { out: out } });
    document.dispatchEvent(ev);
  };

  /* shift press entrypoint — reaction game may override handler */
  WQ.shiftHandler = null;
  WQ.pressShift = function () {
    var h = WQ.shiftHandler;
    if (typeof h === 'function') { h(); return; }
    WQ.setLights(!lightsOut);
  };

  WQ.bindShift = function (fn) { WQ.shiftHandler = fn; };
  WQ.unbindShift = function () { WQ.shiftHandler = null; };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Shift') { e.preventDefault(); WQ.pressShift(); }
  });

  /* ---------- Header ---------- */
  function initHeader() {
    document.querySelectorAll('.item.has-dropdown').forEach(function (item) {
      var link = item.querySelector('.item__link');
      if (!link) return;
      link.addEventListener('click', function (e) {
        if (item.classList.contains('is-open')) {
          item.classList.remove('is-open');
        } else {
          closeAllDropdowns();
          item.classList.add('is-open');
          link.setAttribute('aria-expanded', 'true');
        }
        e.stopPropagation();
      });
    });
    document.addEventListener('click', closeAllDropdowns);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAllDropdowns();
    });
    /* hide navs when scrolled on non-top pages (reference behaviour) */
    var header = document.querySelector('.l-header');
    if (!header) return;
  }
  function closeAllDropdowns() {
    document.querySelectorAll('.item.is-open').forEach(function (i) { i.classList.remove('is-open'); });
  }

  /* ---------- Tempo clock ---------- */
  function initClock() {
    var node = document.getElementById('js-tempo-time');
    if (!node) return;
    var label = node.getAttribute('data-city') || 'LOCAL';
    function tick() {
      var d = new Date();
      var h = d.getHours();
      var ampm = h >= 12 ? 'PM' : 'AM';
      var h12 = h % 12; if (h12 === 0) h12 = 12;
      var m = ('0' + d.getMinutes()).slice(-2);
      node.textContent = h12 + ':' + m + ' ' + ampm + ' ' + label;
    }
    tick();
    setInterval(tick, 10000);
  }

  /* ---------- Reveal on scroll ---------- */
  var revealObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        en.target.classList.add('visible');
        en.target.classList.add('is-visible');
        revealObs.unobserve(en.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  function initReveal() {
    document.querySelectorAll('.c-tempo__text,.reveal,.reveal-item,.detail__item,.featureRow,.reveal-live')
      .forEach(function (el) { revealObs.observe(el); });
    var nxt = document.querySelector('.nextWrap__project');
    if (nxt) revealObs.observe(nxt);
  }

  /* ---------- Project detail scroll meta ---------- */
  function initProjectScroll() {
    if (!document.querySelector('.l-project')) return;
    var scroller = document.querySelector('.l-main') || window;
    var ticking = false;
    scroller.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY || scroller.scrollTop || 0;
        document.body.classList.toggle('is-scrolled', y > 80);
        document.body.classList.toggle('is-scrolled-past-title', y > window.innerHeight * 0.75);
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---------- NEXT circle counter ---------- */
  function initNextCircle() {
    var wrap = document.querySelector('.nextWrap__inner');
    if (!wrap) return;
    var circle = wrap.querySelector('circle.is-progress');
    var num = wrap.querySelector('.nextWrap__counter .num');
    var total = parseInt(num.getAttribute('data-dur') || '1', 10);
    var started = false;
    var obs = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !started) {
        started = true;
        var start = null;
        var dur = 1500;
        function frame(ts) {
          if (!start) start = ts;
          var p = Math.min(1, (ts - start) / dur);
          var e = 1 - Math.pow(1 - p, 4);
          if (circle) circle.style.strokeDashoffset = (302 * (1 - e)).toFixed(2);
          if (num) num.textContent = String(Math.round(total * e)).padStart(3, '0');
          if (p < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      }
    }, { threshold: 0.4 });
    obs.observe(wrap);
  }

  /* ---------- About marquee ---------- */
  function initMarquee() {
    var track = document.querySelector('.js-marquee-track');
    if (!track) return;
    var content = track.innerHTML;
    var half = content;
    /* duplicate content once; we animate -50% translate for seamless loop */
    track.innerHTML = (content + half);
    var speed = 60; /* px/s */
    var pos = 0;
    var last = null;
    function step(ts) {
      if (last !== null) {
        pos += ((ts - last) / 1000) * speed;
        var halfW = track.scrollWidth / 2;
        if (pos >= halfW) pos -= halfW;
        track.style.transform = 'translate3d(-' + pos + 'px,0,0)';
      }
      last = ts;
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- Boot ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    initHeader();
    initClock();
    initReveal();
    initProjectScroll();
    initNextCircle();
    initMarquee();

    /* switcher buttons — route through reaction game when active */
    document.querySelectorAll('[data-lights-idle]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (typeof WQ.reactionPress === 'function') WQ.reactionPress();
        else WQ.setLights(!WQ.isLightsOut());
      });
    });
    /* SHIFT key routing */
    if (typeof WQ.reactionPress === 'function') WQ.bindShift(WQ.reactionPress);
    /* simple fade-in on load */
    var main = document.querySelector('main');
    if (main) main.classList.add('fade-in');
  });
})();