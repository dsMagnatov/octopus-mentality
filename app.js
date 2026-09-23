(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const BRUSH_RADIUS = 190;
  const TAIL_LENGTH = 1100;
  const FOLLOW_TIME = 38;
  const MASK_HOLD = 260;
  const MASK_FADE = 840;
  const WHITE_DELAY = 190;
  const WHITE_HOLD = 770;
  const WHITE_FADE = 730;
  const stage = document.getElementById("hero");
  const guides = stage.querySelector(".guides");
  const [verticalGuide, horizontalGuide, diagonalGuide] = guides.querySelectorAll("line");
  const circleGuide = guides.querySelector("circle");
  const trailSvg = document.getElementById("paint-trail");
  const trailGroup = document.getElementById("trail-strokes");
  const maskGroup = document.getElementById("mask-strokes");
  const menuButton = document.getElementById("menu-button");
  const menuPanel = document.getElementById("menu-panel");
  const menuLabel = document.getElementById("menu-label");
  const textTargets = Array.from(stage.querySelectorAll(".eyebrow, .support-copy, .footer-note, .studio-copy h2, .studio-copy p"));
  let layout = { width: 0, height: 0, scale: 1 };
  let textRects = [];
  const strokes = [];
  let activeStroke = null;
  let pointer = null;
  let follower = null;
  let lastInputTime = 0;
  let lastFrameTime = 0;
  let animationFrame = 0;

  function stopFollowing() { activeStroke = null; pointer = null; follower = null; }
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
    strokes.length = 0;
    trailGroup.replaceChildren();
    maskGroup.replaceChildren();
    stopFollowing();
    textTargets.forEach((element) => element.classList.remove("brush-touched"));
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

  function beginStroke(point) {
    const maskPath = document.createElementNS(SVG_NS, "path");
    const trailPath = document.createElementNS(SVG_NS, "path");
    maskGroup.append(maskPath);
    trailGroup.append(trailPath);
    activeStroke = { points: [point], maskPath, trailPath, maskKey: "", trailKey: "" };
    strokes.push(activeStroke);
    follower = { ...point };
  }
  stage.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch" || event.target.closest(".menu-button, .menu-panel, .brand")) {
      stopFollowing(); return;
    }
    const bounds = stage.getBoundingClientRect();
    const now = performance.now();
    pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top, time: now };
    if (!activeStroke || now - lastInputTime > 400) beginStroke(pointer);
    lastInputTime = now;
    scheduleFrame();
  }, { passive: true });
  stage.addEventListener("pointerleave", stopFollowing);
  window.addEventListener("blur", stopFollowing);

  function smoothFade(value) {
    const t = Math.max(0, Math.min(1, value));
    return 1 - t * t * (3 - 2 * t);
  }
  function updateFollower(now) {
    if (!pointer || !follower || !activeStroke) return;
    const dt = Math.min(64, Math.max(1, now - (lastFrameTime || now - 16)));
    const amount = 1 - Math.exp(-dt / FOLLOW_TIME);
    const dx = pointer.x - follower.x;
    const dy = pointer.y - follower.y;
    if (Math.hypot(dx, dy) < .15 * layout.scale) return;
    const next = { x: follower.x + dx * amount, y: follower.y + dy * amount, time: now };
    activeStroke.points.push(next);
    follower = next;
  }
  function interpolate(a, b, t) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t,
      time: a.time + (b.time - a.time) * t };
  }
  // Interpolate the delayed head between input samples to avoid visible stepping.
  function pointsAtTime(points, time) {
    const result = [];
    for (let i = 0; i < points.length; i++) {
      if (points[i].time <= time) result.push(points[i]);
      else {
        if (i > 0) result.push(interpolate(points[i - 1], points[i],
          (time - points[i - 1].time) / (points[i].time - points[i - 1].time)));
        break;
      }
    }
    return result;
  }
  // Quadratic midpoint splines round corners without overshooting the pointer path.
  function smoothCenterline(points) {
    if (points.length < 3) return points;
    const result = [points[0]];
    let start = points[0];
    for (let i = 1; i < points.length; i++) {
      const control = points[i];
      const end = i === points.length - 1 ? control : interpolate(control, points[i + 1], .5);
      const length = Math.hypot(control.x - start.x, control.y - start.y)
        + Math.hypot(end.x - control.x, end.y - control.y);
      const steps = Math.max(1, Math.ceil(length / (12 * layout.scale)));
      for (let j = 1; j <= steps; j++) {
        const t = j / steps;
        result.push(interpolate(interpolate(start, control, t), interpolate(control, end, t), t));
      }
      start = end;
    }
    return result;
  }
  const number = (value) => Math.round(value * 100) / 100;
  const xy = (x, y) => number(x) + " " + number(y);
  function makeBrushPath(points) {
    const centers = smoothCenterline(points);
    const footprint = [];
    let distance = 0;
    for (let i = centers.length - 1; i >= 0; i--) {
      if (i < centers.length - 1) distance += Math.hypot(centers[i + 1].x - centers[i].x, centers[i + 1].y - centers[i].y);
      const remaining = 1 - distance / (TAIL_LENGTH * layout.scale);
      if (remaining <= 0) break;
      const radius = BRUSH_RADIUS * layout.scale * Math.sin(remaining * Math.PI / 2);
      footprint.push({ ...centers[i], radius });
    }
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
    return { path: parts.join(""), footprint };
  }
  function brushTouchesRect(footprint, rect) {
    return footprint.some((point) => {
      const dx = point.x - Math.max(rect.left, Math.min(point.x, rect.right));
      const dy = point.y - Math.max(rect.top, Math.min(point.y, rect.bottom));
      return dx * dx + dy * dy <= point.radius * point.radius;
    });
  }
  function updatePath(stroke, kind, points, opacity) {
    const element = stroke[kind + "Path"];
    element.setAttribute("opacity", number(opacity));
    if (!points.length || opacity <= 0) return null;
    const key = points.length + ":" + points[0].time + ":" + points[points.length - 1].time;
    if (stroke[kind + "Key"] !== key) {
      stroke[kind + "Brush"] = makeBrushPath(points);
      stroke[kind + "Key"] = key;
      element.setAttribute("d", stroke[kind + "Brush"].path);
    }
    return stroke[kind + "Brush"];
  }
  function render(now) {
    animationFrame = 0;
    updateFollower(now);
    lastFrameTime = now;
    const touchedText = new Set();
    for (let i = strokes.length - 1; i >= 0; i--) {
      const stroke = strokes[i];
      const idle = now - stroke.points[stroke.points.length - 1].time;
      if (idle > WHITE_DELAY + WHITE_HOLD + WHITE_FADE) {
        stroke.maskPath.remove(); stroke.trailPath.remove(); strokes.splice(i, 1); continue;
      }
      while (stroke.points.length > 2 && now - stroke.points[1].time > 2200) stroke.points.shift();
      const maskOpacity = smoothFade((idle - MASK_HOLD) / MASK_FADE);
      const maskBrush = updatePath(stroke, "mask", stroke.points, maskOpacity);
      const delayed = pointsAtTime(stroke.points, now - WHITE_DELAY);
      const trailOpacity = delayed.length ? smoothFade((idle - WHITE_DELAY - WHITE_HOLD) / WHITE_FADE) : 0;
      const trailBrush = updatePath(stroke, "trail", delayed, trailOpacity);
      textRects.forEach((rect, index) => {
        if ((maskOpacity > .12 && maskBrush && brushTouchesRect(maskBrush.footprint, rect))
          || (trailOpacity > .12 && trailBrush && brushTouchesRect(trailBrush.footprint, rect))) touchedText.add(index);
      });
    }
    textTargets.forEach((element, index) => element.classList.toggle("brush-touched", touchedText.has(index)));
    if (strokes.length) scheduleFrame();
  }
  function scheduleFrame() {
    if (!animationFrame) animationFrame = requestAnimationFrame(render);
  }
  updateLayout();
  window.addEventListener("resize", updateLayout, { passive: true });
  document.fonts.ready.then(measureText);
})();
