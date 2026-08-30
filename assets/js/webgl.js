/* WELLQX — webgl.js : blue energy field background */
(function () {
  var canvasHost = document.getElementById('webgl');
  if (!canvasHost) return;

  function supportsGL() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }
  if (!supportsGL()) {
    document.body.classList.add('no-webgl');
    return;
  }

  /* honour prefers-reduced-motion: static low-res frame, no loop */
  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var canvas = document.createElement('canvas');
  canvasHost.appendChild(canvas);
  var gl = canvas.getContext('webgl', { antialias: false, alpha: false })
    || canvas.getContext('experimental-webgl');
  if (!gl) {
    document.body.classList.add('no-webgl');
    canvasHost.removeChild(canvas);
    return;
  }

  var VS = [
    'attribute vec2 a_pos;',
    'void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }'
  ].join('\n');

  var FS = [
    'precision highp float;',
    'uniform vec2 u_res;',
    'uniform float u_time;',
    'uniform vec2 u_mouse;',
    'uniform float u_pulse;',
    '',
    'float hash(vec2 p){',
    '  p = fract(p * vec2(123.34, 456.21));',
    '  p += dot(p, p + 45.32);',
    '  return fract(p.x * p.y);',
    '}',
    'float noise(vec2 p){',
    '  vec2 i = floor(p), f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0,0.0)), u.x),',
    '              mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);',
    '}',
    'float fbm(vec2 p){',
    '  float v = 0.0, a = 0.55;',
    '  for (int i = 0; i < 3; i++){',
    '    v += a * noise(p);',
    '    p = p * 2.03 + 11.7;',
    '    a *= 0.5;',
    '  }',
    '  return v;',
    '}',
    'void main(){',
    '  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res.xy) / u_res.y;',
    '  float t = u_time * 0.045;',
    '  vec2 m = (u_mouse - 0.5) * 0.45;',
    '',
    '  vec2 warp = uv + vec2(fbm(uv * 1.4 + m + t), fbm(uv * 1.4 - m - t * 0.7)) * 0.55;',
    '  float v = fbm(warp * 2.1 + vec2(m.x, -m.y) + t * 1.6);',
    '',
    '  /* organic nebula mask, darker top for readability */',
    '  float depth = (1.0 - uv.y * 0.62);',
    '  float glow = smoothstep(0.62, 0.12, v) * depth;',
    '  vec3 col = vec3(0.05, 0.42, 0.95) * glow;',
    '',
    '  /* thin bright filaments */',
    '  float fil = 1.0 - abs(v - 0.52) * 7.0;',
    '  float filW = smoothstep(0.0, 0.75, fil) * (0.55 + 0.45 * sin(uv.x * 42.0 + t * 24.0));',
    '  col += vec3(0.12, 0.6, 1.0) * filW * 0.4 * depth;',
    '',
    '  /* rising glints */',
    '  float rp = fract(hash(floor(uv * 18.0 + vec2(t * 0.4, -t * 2.0))));',
    '  col += vec3(0.4, 0.75, 1.0) * pow(rp, 18.0) * 0.25 * depth;',
    '',
    '  /* breath pulse */',
    '  float pulse = u_pulse * exp(-t * 4.0);',
    '  col += vec3(0.6, 0.8, 1.0) * pulse * 0.25;',
    '',
    '  col = clamp(col, 0.0, 1.0);',
    '  float vig = 1.0 - 0.42 * dot(uv, uv);',
    '  gl_FragColor = vec4(col * vig, 1.0);',
    '}'
  ].join('\n');

  function makeShader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }
  var prog = gl.createProgram();
  gl.attachShader(prog, makeShader(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, makeShader(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    document.body.classList.add('no-webgl');
    canvasHost.removeChild(canvas);
    return;
  }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var locPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(locPos);
  gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(prog, 'u_res');
  var uTime = gl.getUniformLocation(prog, 'u_time');
  var uMouse = gl.getUniformLocation(prog, 'u_mouse');
  var uPulse = gl.getUniformLocation(prog, 'u_pulse');

  var W = 0, H = 0;
  function resize() {
    /* render at ~60% of the visible size — soft upscale, ~3x cheaper fill.
       cap devicePixelRatio so 4K panels don't blow the budget. */
    var SCALE = reduced ? 0.35 : 0.60;
    var DPR = Math.min(window.devicePixelRatio || 1, 1.25) * SCALE;
    var r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.floor(r.width * DPR));
    H = Math.max(1, Math.floor(r.height * DPR));
    canvas.width = W; canvas.height = H;
    gl.viewport(0, 0, W, H);
  }
  resize();
  window.addEventListener('resize', resize);

  var mouse = { x: 0.5, y: 0.55 };
  window.addEventListener('pointermove', function (e) {
    mouse.x = e.clientX / window.innerWidth;
    mouse.y = 1 - e.clientY / window.innerHeight;
  }, { passive: true });

  var pulseVal = 0;
  window.addEventListener('wq:lights', function () {
    pulseVal = 1.0;
  });

  var t0 = performance.now();
  var running = true;
  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) t0 = performance.now();
  });

  /* slow ease the pulse down across frames */
  var shaderTime = 0;
  function frame(now) {
    if (!running) { requestAnimationFrame(frame); return; }
    var src = (now - t0) / 1000;
    shaderTime = src * 0.35 + shaderTime * 0.65;
    pulseVal *= 0.985;

    gl.uniform2f(uRes, W, H);
    gl.uniform1f(uTime, src + shaderTime);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.uniform1f(uPulse, pulseVal);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reduced) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();