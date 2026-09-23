(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const BRUSH_RADIUS = 190;
  const POINT_COUNT = 31;
  const HEAD_FOLLOW_TIME = 70;
  const CHAIN_FOLLOW_TIME = 38;
  const MASK_HOLD = 80;
  const MASK_FADE = 370;
  const TRAIL_DELAY = 90;
  const TRAIL_HOLD = 180;
  const TRAIL_FADE = 420;
  const stage = document.getElementById("hero");
  const guides = stage.querySelector(".guides");
  const [verticalGuide, horizontalGuide, diagonalGuide] = guides.querySelectorAll("line");
  const circleGuide = guides.querySelector("circle");
  const trailSvg = document.getElementById("paint-trail");
  const trailGroup = document.getElementById("trail-strokes");
  const maskGroup = document.getElementById("mask-strokes");
  const renderer = window.createCursorRenderer(document.getElementById("glow-trail"), trailSvg);
  const maskPath = document.createElementNS(SVG_NS, "path");
  const trailPath = document.createElementNS(SVG_NS, "path");
  const gradient = document.createElementNS(SVG_NS, "linearGradient");
  gradient.id = "ribbon-colors";
  gradient.setAttribute("gradientUnits", "userSpaceOnUse");
  [["0%", "#2E61CE"], ["52%", "#92FFF6"], ["100%", "#FFFFFF"]].forEach(([offset, color]) => {
    const stop = document.createElementNS(SVG_NS, "stop");
    stop.setAttribute("offset", offset);
    stop.setAttribute("stop-color", color);
    gradient.append(stop);
  });
  const definitions = document.createElementNS(SVG_NS, "defs");
  definitions.append(gradient);
  trailSvg.prepend(definitions);
  trailPath.setAttribute("fill", "url(#ribbon-colors)");
  trailGroup.append(trailPath);
  maskGroup.append(maskPath);
  const menuButton = document.getElementById("menu-button");
  const menuPanel = document.getElementById("menu-panel");
  const menuLabel = document.getElementById("menu-label");
  const textTargets = Array.from(stage.querySelectorAll(".eyebrow, .support-copy, .footer-note, .studio-copy h2, .studio-copy p"));
  let layout = { width: 0, height: 0, scale: 1 };
  let textRects = [];
  let chain = [];
  let history = [];
  let pointer = null;
  let lastInputTime = 0;
  let lastFrameTime = 0;
  let animationFrame = 0;

  function stopFollowing() { pointer = null; }
  function clearBrush() {
    chain = [];
    history = [];
    stopFollowing();
    maskPath.setAttribute("d", "");
    trailPath.setAttribute("d", "");
    renderer.draw([], 0);
    textTargets.forEach((element) => element.classList.remove("brush-touched"));
  }
  function setGuide(line, x1, y1, x2, y2) {
    Object.entries({ x1, y1, x2, y2 }).forEach(([key, value]) => line.setAttribute(key, value));
  }
  function measureText() {
    const origin = stage.getBoundingClientRect();
    textRects = textTargets.map((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left - origin.left, right: rect.right - origin.left,
        top: rect.top - origin.top, bottom: rect.bottom - origin.top };
    });
  }
  function updateLayout() {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    const scale = Math.min(width / 1920, height / 1080);
    const size = 922 * scale;
    layout = { width, height, scale };
    stage.style.setProperty("--s", String(scale));
    trailSvg.setAttribute("viewBox", "0 0 " + width + " " + height);
    maskGroup.setAttribute("transform", "scale(" + 1 / scale + ") translate(" + -(width - size) / 2 + " " + -(height - size) / 2 + ")");
    guides.setAttribute("viewBox", "0 0 " + width + " " + height);
    setGuide(verticalGuide, width / 2 - 408 * scale, 0, width / 2 - 408 * scale, height);
    setGuide(horizontalGuide, 0, height * 313 / 1080, width, height * 313 / 1080);
    setGuide(diagonalGuide, 0, height, width, 0);
    circleGuide.setAttribute("cx", width / 2);
    circleGuide.setAttribute("cy", height / 2);
    circleGuide.setAttribute("r", 468 * scale);
    renderer.resize(width, height);
    clearBrush();
    measureText();
  }
  function setMenuOpen(open) {
    menuButton.setAttribute("aria-expanded", String(open));
    menuPanel.hidden = !open;
    menuLabel.textContent = open ? "Close" : "Menu";
  }
  menuButton.addEventListener("click", () => setMenuOpen(menuPanel.hidden));
  menuPanel.addEventListener("click", (event) => { if (event.target.closest("a")) setMenuOpen(false); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") setMenuOpen(false); });

  stage.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch" || event.target.closest(".menu-button, .menu-panel, .brand")) {
      stopFollowing(); return;
    }
    const bounds = stage.getBoundingClientRect();
    const now = performance.now();
    pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    if (!chain.length) {
      chain = Array.from({ length: POINT_COUNT }, () => ({ ...pointer }));
      lastFrameTime = now;
    }
    lastInputTime = now;
    scheduleFrame();
  }, { passive: true });
  stage.addEventListener("pointerleave", stopFollowing);
  window.addEventListener("blur", stopFollowing);

  function smoothFade(value) {
    const t = Math.max(0, Math.min(1, value));
    return 1 - t * t * (3 - 2 * t);
  }
  // A following chain bends and catches up continuously, instead of storing a
  // stationary line. Small time steps keep its feel consistent at 60 / 120 Hz.
  function updateChain(now) {
    const dt = Math.min(50, Math.max(0, now - lastFrameTime));
    const steps = Math.max(1, Math.ceil(dt / (1000 / 120)));
    const headEase = 1 - Math.exp(-dt / steps / HEAD_FOLLOW_TIME);
    const tailEase = 1 - Math.exp(-dt / steps / CHAIN_FOLLOW_TIME);
    for (let step = 0; step < steps; step++) {
      if (pointer) {
        chain[0].x += (pointer.x - chain[0].x) * headEase;
        chain[0].y += (pointer.y - chain[0].y) * headEase;
      }
      for (let i = 1; i < chain.length; i++) {
        chain[i].x += (chain[i - 1].x - chain[i].x) * tailEase;
        chain[i].y += (chain[i - 1].y - chain[i].y) * tailEase;
      }
    }
  }
  function interpolate(a, b, t) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }
  function delayedChain(now) {
    const time = now - TRAIL_DELAY;
    while (history.length > 2 && history[1].time <= time) history.shift();
    if (!history.length || history[0].time > time) return [];
    if (history.length < 2) return history[0].points;
    const [a, b] = history;
    const amount = Math.max(0, Math.min(1, (time - a.time) / (b.time - a.time)));
    return a.points.map((point, i) => interpolate(point, b.points[i], amount));
  }
  function makeFootprint(points) {
    let length = 0;
    const distances = points.map((point, i) => {
      if (i) length += Math.hypot(point.x - points[i - 1].x, point.y - points[i - 1].y);
      return length;
    });
    return points.map((point, i) => {
      // Taper by actual distance so overlapping nodes at the start of a motion
      // form a pointed tail, rather than an extra round head.
      const progress = length > .5 ? distances[i] / length : i / (POINT_COUNT - 1);
      return { ...point, progress,
        radius: Math.max(.1, BRUSH_RADIUS * layout.scale * Math.pow(1 - progress, .85)) };
    });
  }
  const number = (value) => Math.round(value * 100) / 100;
  const xy = (x, y) => number(x) + " " + number(y);
  function makeBrushPath(footprint) {
    // Union round disks and tangent connectors; consistent winding keeps loops solid.
    const parts = [];
    footprint.forEach((point, i) => {
      const { x, y, radius: r } = point;
      const radius = number(r);
      parts.push("M" + xy(x + r, y) + "a" + radius + " " + radius + " 0 1 1 " + number(-2 * r) + " 0a" + radius + " " + radius + " 0 1 1 " + number(2 * r) + " 0Z");
      if (!i) return;
      const previous = footprint[i - 1];
      const dx = x - previous.x;
      const dy = y - previous.y;
      const length = Math.hypot(dx, dy);
      if (length <= Math.abs(previous.radius - r) + .001) return;
      const tx = dx / length;
      const ty = dy / length;
      const slope = (previous.radius - r) / length;
      const normal = Math.sqrt(1 - slope * slope);
      const lx = slope * tx - normal * ty;
      const ly = slope * ty + normal * tx;
      const rx = slope * tx + normal * ty;
      const ry = slope * ty - normal * tx;
      parts.push("M" + xy(previous.x + lx * previous.radius, previous.y + ly * previous.radius)
        + "L" + xy(previous.x + rx * previous.radius, previous.y + ry * previous.radius)
        + "L" + xy(x + rx * r, y + ry * r) + "L" + xy(x + lx * r, y + ly * r) + "Z");
    });
    return parts.join("");
  }
  function brushTouchesRect(footprint, rect) {
    return footprint.some((point) => {
      const dx = point.x - Math.max(rect.left, Math.min(point.x, rect.right));
      const dy = point.y - Math.max(rect.top, Math.min(point.y, rect.bottom));
      return dx * dx + dy * dy <= point.radius * point.radius;
    });
  }
  function render(now) {
    animationFrame = 0;
    if (!chain.length) return;
    const idle = now - lastInputTime;
    if (idle >= TRAIL_DELAY + TRAIL_HOLD + TRAIL_FADE) { clearBrush(); return; }
    updateChain(now);
    lastFrameTime = now;
    history.push({ time: now, points: chain.map((point) => ({ ...point })) });
    const mask = makeFootprint(chain);
    const trail = makeFootprint(delayedChain(now));
    const maskOpacity = smoothFade((idle - MASK_HOLD) / MASK_FADE);
    const trailOpacity = smoothFade((idle - TRAIL_DELAY - TRAIL_HOLD) / TRAIL_FADE);
    maskPath.setAttribute("d", makeBrushPath(mask));
    maskPath.setAttribute("opacity", number(maskOpacity));
    trailPath.setAttribute("d", makeBrushPath(trail));
    trailPath.setAttribute("opacity", number(trailOpacity));
    if (trail.length) {
      gradient.setAttribute("x1", trail[trail.length - 1].x);
      gradient.setAttribute("y1", trail[trail.length - 1].y);
      gradient.setAttribute("x2", trail[0].x + .01);
      gradient.setAttribute("y2", trail[0].y);
    }
    renderer.draw(trail, trailOpacity);
    textTargets.forEach((element, i) => element.classList.toggle("brush-touched",
      (maskOpacity > .12 && brushTouchesRect(mask, textRects[i]))
      || (trailOpacity > .12 && brushTouchesRect(trail, textRects[i]))));
    scheduleFrame();
  }
  function scheduleFrame() {
    if (!animationFrame) animationFrame = requestAnimationFrame(render);
  }
  updateLayout();
  window.addEventListener("resize", updateLayout, { passive: true });
  document.fonts.ready.then(measureText);
})();
