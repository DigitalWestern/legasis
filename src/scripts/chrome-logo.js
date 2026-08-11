/**
 * Live chrome treatment for the Legasis wordmark.
 *
 * The logo PNG already has its bevel lighting baked in, so its luminance works
 * as a height field. We sobel that into a surface normal, reflect a view ray
 * off it, and sample a procedural studio environment — horizontal softbox
 * strips, a lit ceiling, a dark floor, and one red kick light. That is what
 * makes chrome read as chrome: it is almost entirely reflection.
 *
 * The environment rotates with the pointer and drags with scroll, so the metal
 * stays alive while the wordmark itself never moves.
 *
 * Raw WebGL rather than three.js: this is one quad and one texture, and three
 * costs ~175kB gzipped to draw it.
 */

const VERT = `
  attribute vec2 aPos;
  varying vec2 vUv;
  void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

const FRAG = `
  precision highp float;

  uniform sampler2D uLogo;
  uniform vec2  uTexel;    // 1 / texture size
  uniform vec2  uFit;      // aspect-fit scale
  uniform vec2  uPointer;  // -1..1, eased
  uniform float uTime;
  uniform float uScroll;   // 0..1 through the hero
  uniform float uReveal;   // 0..1 load-in

  varying vec2 vUv;

  const vec3 RED = vec3(0.855, 0.161, 0.110); // Pantone 485

  float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

  // height (x) and coverage (y) in one fetch. the artwork sits on black, so
  // luminance is the height field; alpha covers a cut-out PNG instead.
  // Coverage handles both shapes of artwork: a cut-out PNG contributes its
  // alpha, and a black-backed one falls back to the luminance silhouette.
  vec2 logoAt(vec2 uv) {
    vec4 t = texture2D(uLogo, uv);
    float l = luma(t.rgb);
    float lit = step(0.015, l);
    return vec2(l, max(t.a * lit, lit * step(0.999, t.a)));
  }

  // The artwork carries compression noise, and a raw sobel turns every bit of
  // it into a speckle. Averaging a small cross first gives a height field clean
  // enough to differentiate.
  float height(vec2 uv) {
    vec2 d = uTexel * 1.1;
    return (
      logoAt(uv).x * 2.0 +
      logoAt(uv + vec2( d.x, 0.0)).x +
      logoAt(uv - vec2( d.x, 0.0)).x +
      logoAt(uv + vec2(0.0,  d.y)).x +
      logoAt(uv - vec2(0.0,  d.y)).x
    ) / 6.0;
  }

  // procedural studio. dir is a reflected ray; only its sweep matters.
  vec3 studio(vec2 dir) {
    float y = dir.y;

    vec3 col = mix(vec3(0.012), vec3(0.60), smoothstep(-0.75, 0.95, y));

    // three softbox strips — the banding that says "polished metal"
    col += vec3(1.0)                * smoothstep(0.055, 0.0, abs(y - 0.46)) * 0.95;
    col += vec3(0.86, 0.90, 0.96)   * smoothstep(0.030, 0.0, abs(y - 0.08)) * 0.55;
    col += vec3(0.30, 0.34, 0.40)   * smoothstep(0.075, 0.0, abs(y + 0.42));

    // slow rolling sheen so the surface never sits perfectly still
    col += vec3(0.10, 0.11, 0.13) * (sin(dir.x * 3.1 + uTime * 0.22) * 0.5 + 0.5);

    // one red kick, low and to the side: the only colour in the metal.
    // kept low — past about 0.5 it stops reading as a reflection and starts
    // reading as red paint.
    col += RED * smoothstep(0.62, 0.0, length(dir - vec2(0.72, -0.28))) * 0.45;

    // cool rim opposite it, so the whole thing doesn't read warm
    col += vec3(0.20, 0.30, 0.42) * smoothstep(0.60, 0.0, length(dir - vec2(-0.68, 0.34))) * 0.5;

    return col;
  }

  void main() {
    vec2 uv = (vUv - 0.5) * uFit + 0.5;

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(0.0);
      return;
    }

    vec2 c = logoAt(uv);
    if (c.y < 0.01) {
      gl_FragColor = vec4(0.0);
      return;
    }

    // sobel the smoothed height field into a normal
    vec2 e = uTexel * 2.2;
    float hL = height(uv - vec2(e.x, 0.0));
    float hR = height(uv + vec2(e.x, 0.0));
    float hD = height(uv - vec2(0.0, e.y));
    float hU = height(uv + vec2(0.0, e.y));
    vec3 n = normalize(vec3((hL - hR) * 1.7, (hD - hU) * 1.7, 1.0));

    // reflect a fixed view ray — the environment is what moves
    vec3 r = reflect(-vec3(0.0, 0.0, 1.0), n);

    vec2 dir = r.xy;
    dir += uPointer * 0.55;        // pointer tilts the room
    dir.y += uScroll * 0.85;       // scrolling drags the highlights down
    dir += (uv - 0.5) * 0.35;      // parallax across the wordmark

    vec3 col = studio(dir);

    // fresnel: stroke edges flare, flat faces stay dark
    col += vec3(0.75, 0.80, 0.88) * pow(1.0 - abs(n.z), 2.2) * 0.65;

    // keep some of the original render so the bevels stay crisp
    col = mix(col, col * (0.55 + c.x * 0.9), 0.55);

    // chromatic split at the silhouette: reads as a thick specular coating
    float edge = logoAt(uv + vec2(e.x, 0.0) * 2.5).y - logoAt(uv - vec2(e.x, 0.0) * 2.5).y;
    col.r += edge * 0.09;
    col.b -= edge * 0.06;

    // load-in: the metal pours in from the left behind a red heat line.
    // s runs 1 at the left edge to 0 at the right; the threshold sweeps from
    // above 1 (nothing shown) to below 0 (everything shown).
    float s = 1.0 - uv.x;
    float threshold = (1.0 - uReveal) * 1.3 - 0.3;
    float wipe = smoothstep(threshold, threshold + 0.28, s);
    col += RED * (1.0 - smoothstep(0.0, 0.16, abs(wipe - 0.5))) * (1.0 - uReveal) * 0.9;

    gl_FragColor = vec4(col, c.y * wipe);
  }
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[chrome-logo]', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * @returns {Promise<boolean>} true if the live shader took over, false to keep
 *   the PNG fallback in place.
 */
export async function mountChromeLogo(canvas, { src, reduced }) {
  if (reduced || window.innerWidth < 640) return false;

  const gl =
    canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: false }) ||
    canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
  if (!gl) return false;

  const image = await loadImage(src);
  if (!image) return false;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return false;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('[chrome-logo]', gl.getProgramInfoLog(program));
    return false;
  }
  gl.useProgram(program);

  // fullscreen triangle pair
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  // NPOT texture: clamp + linear, no mipmaps
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const u = (name) => gl.getUniformLocation(program, name);
  const uFit = u('uFit');
  const uPointer = u('uPointer');
  const uTime = u('uTime');
  const uScroll = u('uScroll');
  const uReveal = u('uReveal');

  gl.uniform1i(u('uLogo'), 0);
  gl.uniform2f(u('uTexel'), 1 / image.width, 1 / image.height);

  const logoAspect = image.width / image.height;

  const resize = () => {
    const dpr = Math.min(devicePixelRatio, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    // contain the wordmark inside the canvas
    const a = w / h;
    gl.uniform2f(uFit, a > logoAspect ? a / logoAspect : 1, a > logoAspect ? 1 : logoAspect / a);
  };
  resize();
  addEventListener('resize', resize, { passive: true });

  // pointer eases toward its target so the metal has some weight
  const target = { x: 0, y: 0 };
  const eased = { x: 0, y: 0 };
  addEventListener(
    'pointermove',
    (e) => {
      target.x = (e.clientX / innerWidth) * 2 - 1;
      target.y = -((e.clientY / innerHeight) * 2 - 1);
    },
    { passive: true }
  );

  // only draw while the hero is on screen
  let visible = true;
  new IntersectionObserver(([entry]) => (visible = entry.isIntersecting)).observe(canvas);

  const start = performance.now();
  let raf;
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    if (!visible) return;

    resize();

    const t = (now - start) / 1000;
    eased.x += (target.x - eased.x) * 0.045;
    eased.y += (target.y - eased.y) * 0.045;

    gl.uniform1f(uTime, t);
    gl.uniform1f(uReveal, Math.min(t / 1.6, 1));
    gl.uniform2f(uPointer, eased.x, eased.y);
    gl.uniform1f(uScroll, Math.min(scrollY / innerHeight, 1));

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  raf = requestAnimationFrame(frame);

  addEventListener('pagehide', () => cancelAnimationFrame(raf));
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    canvas.closest('.hero__mark')?.removeAttribute('data-chrome-live');
  });

  return true;
}
