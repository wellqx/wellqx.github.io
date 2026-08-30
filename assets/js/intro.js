/* WELLQX — intro.js : home boot sequence */
(function () {
  var WQ = window.WQ || (window.WQ = {});
  var revealed = false;

  var loader = document.getElementById('nyan-loader');
  var counterWrap = document.getElementById('intro-counter');
  var numEl = document.getElementById('intro-counter__num');
  var title = document.querySelector('.c-title');

  if (!title) return;

  function reveal() {
    if (revealed) return;
    revealed = true;
    document.removeEventListener('pointerdown', skipper);
    if (loader) {
      loader.style.animation = 'none';
      loader.style.transition = 'opacity .6s ease';
      loader.style.opacity = '0';
    }
    if (counterWrap) counterWrap.classList.add('is-empty');
    if (title) title.classList.add('is-visible');
    if (WQ.release) WQ.release();
    WQ.setLights(false);
  }

  function skipAllowed() {
    var W = window.WQ || {};
    return !W.getPhase || W.getPhase() !== 'prompt';
  }

  function skipper() { if (skipAllowed()) reveal(); }

  function runCounter(cb) {
    if (!counterWrap || !numEl) { cb(); return; }
    numEl.textContent = '0';
    counterWrap.classList.remove('is-empty');
    var target = 900 + Math.floor(Math.random() * 4200);
    var start = performance.now();
    var dur = 1300;
    function frame(now) {
      var p = Math.min(1, (now - start) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      numEl.textContent = String(Math.round(target * e)).padStart(3, '0');
      if (p < 1) requestAnimationFrame(frame);
      else cb();
    }
    requestAnimationFrame(frame);
  }

  function boot() {
    if (loader) loader.classList.add('is-running');
    setTimeout(function () {
      if (loader) {
        loader.classList.remove('is-running');
        loader.style.transition = 'opacity .5s ease';
        loader.style.opacity = '0';
        setTimeout(function () { loader.style.display = 'none'; }, 600);
      }
      if (revealed) return;
      runCounter(function () {
        if (revealed) return;
        if (WQ.runReaction) {
          WQ.runReaction().then(reveal).catch(function () { reveal(); });
        } else {
          reveal();
        }
      });
    }, 1500);
  }

  if (document.body.getAttribute('data-page') === 'top') {
    document.addEventListener('pointerdown', skipper);
    boot();
  }
})();