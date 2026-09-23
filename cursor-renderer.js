// Shared, dependency-free relief reveal for the hero and the clay screen.
window.createReliefRenderer = ({ stage, canvas, fallback, baseColor,
  depth = 0.075, enabled = () => true }) => {
  const fallbackPath = fallback.querySelector("[data-relief-path]");
  const fallbackMask = fallback.querySelector("mask");
  const fallbackImage = fallback.querySelector("image");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  // The center is about 250px wide; the broad feather removes the brush outline.
  const REVEAL_RADIUS = 270;
  const TRAIL_LIFETIME = 2600;
  const gl = canvas.getContext("webgl", { alpha: false, depth: false,
    stencil: false, antialias: false, premultipliedAlpha: false });
  const artwork = new Image();
  let ready = false;
  let width = 1, height = 1, scale = 1;
  let mapWidth = 1, mapHeight = 1;
  let programs, triangle, imageTexture;
  let surfaces = [];
  let currentSurface = 0;
  let pointer = null;
  let follower = null;
  let lastInput = -Infinity;
  let lastFrame = 0;
  let animationFrame = 0;
  let fallbackSamples = [];

  const vertexSource = `
    attribute vec2 position;
    varying vec2 uv;
    void main() {
      uv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;
  const fieldSource = `
    precision highp float;
    varying vec2 uv;
    uniform sampler2D previous;
    uniform vec2 resolution;
    uniform vec2 texel;
    uniform vec2 start;
    uniform vec2 end;
    uniform float radius;
    uniform float paint;
    uniform float dt;
    uniform float time;
    uniform float motion;

    void main() {
      vec2 pixel = uv * resolution;
      // A slowly moving flow and diffusion soften old paint in place.
      vec2 flow = vec2(sin(pixel.y * 0.012 + time * 0.37),
                       cos(pixel.x * 0.011 - time * 0.29));
      vec2 sampleUV = uv - flow * 8.0 * dt * motion / resolution;
      float center = texture2D(previous, sampleUV).r;
      float nearby = texture2D(previous, sampleUV + vec2(texel.x, 0.0)).r;
      nearby += texture2D(previous, sampleUV - vec2(texel.x, 0.0)).r;
      nearby += texture2D(previous, sampleUV + vec2(0.0, texel.y)).r;
      nearby += texture2D(previous, sampleUV - vec2(0.0, texel.y)).r;
      float ink = mix(center, nearby * 0.25, min(dt * 8.0, 0.28));
      ink = max(0.0, ink * exp(-dt * 1.25) - dt * 0.026);
      vec2 segment = end - start;
      float along = clamp(dot(pixel - start, segment) / max(dot(segment, segment), 0.01), 0.0, 1.0);
      float distance = length(pixel - mix(start, end, along));
      float wave = sin(pixel.x * 0.016 + sin(pixel.y * 0.012))
                 * cos(pixel.y * 0.013 - time * 0.14);
      float spread = radius * (1.0 + wave * 0.13);
      float brush = 1.0 - smoothstep(0.28, 1.0, distance / spread);
      ink = max(ink, brush * paint);
      gl_FragColor = vec4(ink, 0.0, 0.0, 1.0);
    }
  `;
  const reliefSource = `
    precision highp float;
    varying vec2 uv;
    uniform sampler2D field;
    uniform sampler2D artwork;
    uniform vec2 cover;
    uniform vec2 imageTexel;
    uniform vec3 baseColor;
    uniform float motion;
    uniform float depth;

    float light(vec3 color) { return dot(color, vec3(0.299, 0.587, 0.114)); }
    void main() {
      float ink = texture2D(field, uv).r;
      float amount = smoothstep(0.025, 0.78, ink);
      vec2 imageUV = (uv - 0.5) * cover + 0.5;
      // The relief's shading drives a bounded rise, strongest halfway through
      // the reveal. Fully revealed artwork returns to its original position.
      vec2 sampleStep = imageTexel * 5.0;
      float left = light(texture2D(artwork, imageUV - vec2(sampleStep.x, 0.0)).rgb);
      float right = light(texture2D(artwork, imageUV + vec2(sampleStep.x, 0.0)).rgb);
      float down = light(texture2D(artwork, imageUV - vec2(0.0, sampleStep.y)).rgb);
      float up = light(texture2D(artwork, imageUV + vec2(0.0, sampleStep.y)).rgb);
      vec2 normal = clamp(vec2(right - left, up - down), -0.2, 0.2);
      float emergence = 4.0 * amount * (1.0 - amount);
      // Most of the lift moves together, so petals keep their shape. The small
      // normal offset adds depth without folding or stretching fine edges.
      vec2 lift = vec2(-0.015, 0.045) + normal * 0.10;
      imageUV += lift * depth * emergence * motion;
      vec3 relief = texture2D(artwork, imageUV).rgb;
      float localLight = (left + right + down + up) * 0.25;
      float detail = abs(light(relief) - localLight);
      // Accentuate existing highlights and contact shadows only during the rise.
      relief += (light(relief) - localLight) * 0.18 * emergence * motion;
      relief = clamp(relief, 0.0, 1.0);
      amount = clamp(amount + detail * 3.0 * amount * (1.0 - amount), 0.0, 1.0);
      gl_FragColor = vec4(mix(baseColor, relief, amount), 1.0);
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }
  function program(fragmentSource, names) {
    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    const handle = gl.createProgram();
    gl.attachShader(handle, vertex);
    gl.attachShader(handle, fragment);
    gl.linkProgram(handle);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(handle, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(handle));
    return { handle, position: gl.getAttribLocation(handle, "position"),
      uniforms: Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(handle, name)])) };
  }
  function texture() {
    const result = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, result);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return result;
  }
  function use(program) {
    gl.useProgram(program.handle);
    gl.bindBuffer(gl.ARRAY_BUFFER, triangle);
    gl.enableVertexAttribArray(program.position);
    gl.vertexAttribPointer(program.position, 2, gl.FLOAT, false, 0, 0);
  }
  function bindTexture(unit, image) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, image);
  }
  function showFallback() {
    ready = false;
    canvas.style.display = "none";
    fallback.style.display = "block";
  }
  function initialize() {
    if (!gl || !artwork.complete || !artwork.naturalWidth) { showFallback(); return; }
    try {
      programs = {
        field: program(fieldSource, ["previous", "resolution", "texel", "start", "end", "radius", "paint", "dt", "time", "motion"]),
        relief: program(reliefSource, ["field", "artwork", "cover", "imageTexel", "baseColor", "motion", "depth"])
      };
      triangle = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, triangle);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      imageTexture = texture();
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, artwork);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      ready = true;
      resize();
      canvas.style.display = "block";
      fallback.style.display = "none";
    } catch (error) {
      console.warn("Relief reveal uses the soft SVG fallback:", error.message);
      showFallback();
    }
  }
  function reset() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    pointer = follower = null;
    lastInput = -Infinity;
    fallbackSamples = [];
    fallbackPath.setAttribute("d", "");
    if (!ready) return;
    gl.clearColor(0, 0, 0, 1);
    surfaces.forEach((surface) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, surface.framebuffer);
      gl.clear(gl.COLOR_BUFFER_BIT);
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(...baseColor, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  function resize() {
    width = Math.max(1, stage.clientWidth);
    height = Math.max(1, stage.clientHeight);
    scale = Math.min(width / 1920, height / 1080);
    fallback.setAttribute("viewBox", `0 0 ${width} ${height}`);
    [fallbackImage, fallbackMask].forEach((element) => {
      element.setAttribute("width", width);
      element.setAttribute("height", height);
    });
    fallbackPath.setAttribute("stroke-width", 340 * scale);
    fallback.querySelector("feGaussianBlur").setAttribute("stdDeviation", 52 * scale);
    if (ready) {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      mapWidth = Math.min(640, Math.round(width * .4));
      mapHeight = Math.max(1, Math.round(mapWidth * height / width));
      surfaces.forEach(({ image, framebuffer }) => {
        gl.deleteTexture(image);
        gl.deleteFramebuffer(framebuffer);
      });
      surfaces = Array.from({ length: 2 }, () => {
        const image = texture();
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, mapWidth, mapHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, image, 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("Reveal buffer is unavailable");
        return { image, framebuffer };
      });
      currentSurface = 0;
    }
    reset();
  }
  function drawField(start, end, paint, dt, now) {
    const next = 1 - currentSurface;
    const { field, relief } = programs;
    gl.bindFramebuffer(gl.FRAMEBUFFER, surfaces[next].framebuffer);
    gl.viewport(0, 0, mapWidth, mapHeight);
    use(field);
    bindTexture(0, surfaces[currentSurface].image);
    gl.uniform1i(field.uniforms.previous, 0);
    gl.uniform2f(field.uniforms.resolution, width, height);
    gl.uniform2f(field.uniforms.texel, 1 / mapWidth, 1 / mapHeight);
    gl.uniform2f(field.uniforms.start, start.x, height - start.y);
    gl.uniform2f(field.uniforms.end, end.x, height - end.y);
    gl.uniform1f(field.uniforms.radius, REVEAL_RADIUS * scale);
    gl.uniform1f(field.uniforms.paint, paint ? 1 : 0);
    gl.uniform1f(field.uniforms.dt, dt);
    gl.uniform1f(field.uniforms.time, now / 1000);
    gl.uniform1f(field.uniforms.motion, reducedMotion.matches ? 0 : 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    currentSurface = next;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    use(relief);
    bindTexture(0, surfaces[currentSurface].image);
    bindTexture(1, imageTexture);
    const aspect = width / height;
    const imageAspect = artwork.naturalWidth / artwork.naturalHeight;
    gl.uniform1i(relief.uniforms.field, 0);
    gl.uniform1i(relief.uniforms.artwork, 1);
    gl.uniform2f(relief.uniforms.cover, Math.min(1, aspect / imageAspect), Math.min(1, imageAspect / aspect));
    gl.uniform2f(relief.uniforms.imageTexel, 1 / artwork.naturalWidth, 1 / artwork.naturalHeight);
    gl.uniform3fv(relief.uniforms.baseColor, baseColor);
    gl.uniform1f(relief.uniforms.motion, reducedMotion.matches ? 0 : 1);
    gl.uniform1f(relief.uniforms.depth, depth);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function render(now) {
    animationFrame = 0;
    if (!follower) return;
    if (!enabled()) { reset(); return; }
    const dt = Math.min(.05, Math.max(.001, (now - lastFrame) / 1000));
    const idle = now - lastInput;
    if (idle > TRAIL_LIFETIME) { reset(); return; }
    const previous = { ...follower };
    if (pointer) {
      const follow = reducedMotion.matches ? 1 : 1 - Math.exp(-dt / .045);
      follower.x += (pointer.x - follower.x) * follow;
      follower.y += (pointer.y - follower.y) * follow;
    }
    const painting = pointer !== null && idle < 90;
    if (ready) drawField(previous, follower, painting, dt, now);
    else {
      if (painting) fallbackSamples.push({ ...follower, time: now });
      fallbackSamples = fallbackSamples.filter((sample) => now - sample.time < 1800);
      if (fallbackSamples.length) {
        fallbackPath.setAttribute("d", "M" + fallbackSamples.map((point) => `${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join("L") + "l0.01 0");
        fallbackPath.setAttribute("opacity", Math.max(0, 1 - idle / 1800));
      } else fallbackPath.setAttribute("d", "");
    }
    lastFrame = now;
    animationFrame = requestAnimationFrame(render);
  }
  stage.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch" || !enabled()
      || event.target.closest(".menu-button, .menu-panel, .brand")) {
      pointer = null;
      return;
    }
    const bounds = stage.getBoundingClientRect();
    const now = performance.now();
    const nextPointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    if (!pointer || !follower || now - lastInput > TRAIL_LIFETIME) follower = { ...nextPointer };
    pointer = nextPointer;
    lastInput = now;
    if (!animationFrame) {
      lastFrame = now - 16;
      animationFrame = requestAnimationFrame(render);
    }
  }, { passive: true });
  stage.addEventListener("pointerleave", () => { pointer = null; });
  window.addEventListener("blur", reset);
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", () => { if (document.hidden) reset(); });
  new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) reset(); }).observe(stage);
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    showFallback();
    reset();
  });
  canvas.addEventListener("webglcontextrestored", () => { surfaces = []; initialize(); });
  artwork.addEventListener("load", initialize);
  artwork.addEventListener("error", showFallback);
  artwork.src = fallbackImage.getAttribute("href");
  resize();
  return { reset };
};
