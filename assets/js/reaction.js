/* WELLQX — reaction.js : lights-out reaction game + SHIFT state machine */
(function () {
  var WQ = window.WQ || (window.WQ = {});
  var phase = 'idle';
  var promptShownAt = 0;
  var waitTimer = null;
  var roundCallbacks = [];
  var HUD = null, promptEl = null, timeEl = null, labelEl = null;

  function initHud() {
    HUD = document.getElementById('reaction-hud');
    if (!HUD) return false;
    promptEl = document.getElementById('reaction-prompt');
    timeEl = document.getElementById('reaction-time');
    labelEl = document.getElementById('reaction-label');
    return true;
  }

  function setPhase(p) {
    phase = p;
    if (!HUD) return;
    HUD.classList.toggle('is-prompt', p === 'prompt');
    HUD.classList.toggle('is-waiting', p === 'wait');
    HUD.classList.toggle('is-result', p === 'result');
  }

  function setPrompt(t) { if (promptEl) promptEl.innerHTML = t; }
  function hideHud() {
    if (!HUD) return;
    HUD.classList.remove('is-prompt', 'is-waiting', 'is-result');
  }
  function clearWait() {
    if (waitTimer) { clearTimeout(waitTimer); waitTimer = null; }
  }

  function schedulePrompt(delay) {
    setPhase('wait');
    setPrompt('LIGHTS OUT');
    clearWait();
    waitTimer = setTimeout(function () {
      waitTimer = null;
      promptShownAt = performance.now();
      setPrompt('LIGHTS OUT, PRESS SHIFT!');
      setPhase('prompt');
    }, delay);
  }

  function finishRound(ms) {
    clearWait();
    setPrompt('');
    if (timeEl) timeEl.textContent = ms + ' ms';
    if (labelEl) labelEl.textContent = 'REACTION';
    setPhase('result');
    setTimeout(function () {
      var cbs = roundCallbacks;
      roundCallbacks = [];
      setPhase('idle');
      hideHud();
      cbs.forEach(function (cb) { cb(ms); });
    }, 1700);
  }

  function startRound(opts) {
    opts = opts || {};
    var delay = (opts.delay != null) ? opts.delay : (1800 + Math.random() * 2600);
    WQ.setLights(true);
    schedulePrompt(delay);
  }

  function press() {
    if (phase === 'prompt') {
      finishRound(Math.max(0, Math.round(performance.now() - promptShownAt)));
      return;
    }
    if (phase === 'wait') {
      clearWait();
      schedulePrompt(2200 + Math.random() * 2600);
      return;
    }
    if (WQ.isLightsOut()) {
      WQ.setLights(false);
      hideHud();
    } else {
      startRound();
    }
  }

  WQ.runReaction = function (opts) {
    if (!initHud()) return Promise.reject(new Error('reaction hud missing'));
    return new Promise(function (resolve) {
      roundCallbacks.push(resolve);
      startRound(opts);
    });
  };

  WQ.release = function () {
    clearWait();
    roundCallbacks = [];
    setPhase('idle');
    setPrompt('');
    hideHud();
  };

  WQ.getPhase = function () { return phase; };

  document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('reaction-hud')) return;
    initHud(); /* binds reaction on pages that have the HUD */
    /* mouse / touch reaction press while the prompt is on screen */
    document.addEventListener('pointerdown', function () {
      if (phase === 'prompt') press();
    });
  });

  /* expose press for intro/main to wire after DOM ready */
  WQ.reactionPress = press;
})();