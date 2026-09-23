// Native WebGL renderer for the studio's broad, three-color cursor ribbon.
// Motion reference: React Bits Glow Cursor (see README.md).
window.createCursorRenderer = (canvas, fallback) => {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: false,
    premultipliedAlpha: false, depth: false, stencil: false });
  let ready = false;
  let program;
  let locations;
  let width = 1;
  let height = 1;
  let pixelRatio = 1;
  const coordinates = new Float32Array(31 * 4);
  const vertexSource = `
    attribute vec2 position;
    void main() { gl_Position = vec4(position, 0.0, 1.0); }
  `;
  const fragmentSource = `
    precision highp float;
    uniform vec2 resolution;
    uniform float pixelRatio;
    uniform float opacity;
    uniform vec4 points[31];

    vec3 palette(float t) {
      vec3 white = vec3(1.0);
      vec3 mint = vec3(0.57255, 1.0, 0.96471);
      vec3 blue = vec3(0.18039, 0.38039, 0.80784);
      vec3 front = mix(white, mint, smoothstep(0.06, 0.5, t));
      return mix(front, blue, smoothstep(0.48, 0.94, t));
    }

    void main() {
      vec2 pixel = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y) / pixelRatio;
      float edge = 10000.0;
      float edgeProgress = 0.0;
      float weightSum = 0.0;
      vec3 colorSum = vec3(0.0);
      for (int i = 0; i < 30; i++) {
        vec4 a = points[i];
        vec4 b = points[i + 1];
        vec2 segment = b.xy - a.xy;
        float t = clamp(dot(pixel - a.xy, segment) / max(dot(segment, segment), 0.001), 0.0, 1.0);
        float radius = mix(a.z, b.z, t);
        float distance = length(pixel - mix(a.xy, b.xy, t));
        float progress = mix(a.w, b.w, t);
        if (distance - radius < edge) {
          edge = distance - radius;
          edgeProgress = progress;
        }
        float weight = exp(-5.0 * pow(distance / max(radius, 1.0), 2.0));
        weight *= max(length(segment), 0.1);
        colorSum += palette(progress) * weight;
        weightSum += weight;
      }
      float softEdge = max(1.2, points[0].z * 0.035);
      float body = 1.0 - smoothstep(-softEdge, softEdge, edge);
      float halo = exp(-max(edge, 0.0) / max(points[0].z * 0.065, 1.0)) * 0.12;
      float alpha = max(body, halo) * opacity;
      if (alpha < 0.003) discard;
      vec3 color = weightSum > 0.00000001 ? colorSum / weightSum : palette(edgeProgress);
      // White porcelain at the head, even when the chain catches up at rest.
      float head = 1.0 - smoothstep(0.15, 1.3, length(pixel - points[0].xy) / max(points[0].z, 1.0));
      color = mix(color, vec3(1.0), head * 0.85);
      gl_FragColor = vec4(color, alpha);
    }
  `;
  function showFallback() {
    ready = false;
    canvas.style.display = "none";
    fallback.style.display = "";
  }
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
  function initialize() {
    if (!gl) { showFallback(); return; }
    try {
      const vertex = compile(gl.VERTEX_SHADER, vertexSource);
      const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
      program = gl.createProgram();
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, "position");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      locations = Object.fromEntries(["resolution", "pixelRatio", "opacity", "points[0]"]
        .map((name) => [name, gl.getUniformLocation(program, name)]));
      gl.clearColor(0, 0, 0, 0);
      ready = true;
      canvas.style.display = "";
      fallback.style.display = "none";
      resize(width, height);
    } catch (error) {
      console.warn("Cursor uses the SVG fallback:", error.message);
      showFallback();
    }
  }
  function resize(nextWidth, nextHeight) {
    width = nextWidth;
    height = nextHeight;
    if (!ready) return;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function draw(points, opacity) {
    if (!ready) return;
    gl.disable(gl.SCISSOR_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (!points.length || opacity <= 0) return;
    let left = width, top = height, right = 0, bottom = 0;
    points.forEach((point, index) => {
      coordinates.set([point.x, point.y, point.radius, point.progress], index * 4);
      const extent = point.radius * 1.4 + 3;
      left = Math.min(left, point.x - extent);
      right = Math.max(right, point.x + extent);
      top = Math.min(top, point.y - extent);
      bottom = Math.max(bottom, point.y + extent);
    });
    // Shade only the ribbon's bounds, particularly on large desktop displays.
    left = Math.max(0, Math.floor(left * pixelRatio));
    top = Math.max(0, Math.floor(top * pixelRatio));
    right = Math.min(canvas.width, Math.ceil(right * pixelRatio));
    bottom = Math.min(canvas.height, Math.ceil(bottom * pixelRatio));
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(left, canvas.height - bottom, Math.max(0, right - left), Math.max(0, bottom - top));
    gl.useProgram(program);
    gl.uniform2f(locations.resolution, canvas.width, canvas.height);
    gl.uniform1f(locations.pixelRatio, pixelRatio);
    gl.uniform1f(locations.opacity, opacity);
    gl.uniform4fv(locations["points[0]"], coordinates);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  canvas.addEventListener("webglcontextlost", (event) => { event.preventDefault(); showFallback(); });
  canvas.addEventListener("webglcontextrestored", initialize);
  initialize();
  return { resize, draw };
};
