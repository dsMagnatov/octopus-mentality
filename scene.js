(() => {
  const hero = document.getElementById("hero");
  const clay = document.getElementById("clay");
  const guides = hero.querySelector(".guides");
  const [vertical, horizontal, diagonal] = guides.querySelectorAll("line:not(.guide-erase)");
  const [verticalFill, horizontalFill, diagonalFill] = guides.querySelectorAll(".guide-erase");
  const circle = guides.querySelector("circle");
  const claySvg = document.getElementById("clay-reveal");
  const clayMask = document.getElementById("clay-brush-mask");
  const clayPath = document.getElementById("clay-brush-path");
  const clayImage = document.getElementById("clay-image");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const POINT_COUNT = 31;
  const exits = [
    [".title-octopus", .02, .46, -.34, -28, -2],
    [".title-mentality", .08, .44, -.47, 24, 2],
    [".octopus", .12, .75, -.72, 18, -4],
    [".brand", .20, .57, -.32, -16, -3],
    [".menu-button", .28, .69, -.33, 18, 3],
    [".top-right", .04, .40, -.39, 12, 2],
    [".left-middle", .14, .54, -.42, -15, -3],
    [".studio-copy h2", .23, .59, -.31, 9, 2],
    [".studio-copy p:first-of-type", .07, .43, -.39, -12, -2],
    [".studio-copy p:last-of-type", .31, .72, -.37, 19, 2],
    [".left-bottom", .03, .38, -.47, 15, 3],
    [".right-bottom", .25, .60, -.35, -13, -2],
    [".footer-note", .17, .51, -.42, -10, 2]
  ].map(([selector, start, end, rise, drift, rotate]) => {
    const element = hero.querySelector(selector);
    element.dataset.exit = "";
    return { element, start, end, rise, drift, rotate,
      base: selector === ".octopus" ? "translate(-50%, -50%) " : "" };
  });
  let scrollFrame = 0;
  let heroBrushCleared = false;
  let width = 0;
  let height = 0;
  let brushWidth = 0;
  let pointer = null;
  let chain = [];
  let brushFrame = 0;
  let lastInput = 0;
  let lastFrame = 0;

  const clamp = (value) => Math.min(1, Math.max(0, value));
  const phase = (progress, start, end) => clamp((progress - start) / (end - start));
  const ease = (value) => value * value * (3 - 2 * value);
  const guide = (line, x1, y1, x2, y2) => {
    Object.entries({ x1, y1, x2, y2 }).forEach(([key, value]) => line.setAttribute(key, value));
  };

  function updateScroll() {
    scrollFrame = 0;
    const progress = reducedMotion.matches ? 0 : clamp(window.scrollY / hero.clientHeight);
    const stageWidth = hero.clientWidth;
    const stageHeight = hero.clientHeight;
    if (progress > .01 && !heroBrushCleared) {
      window.clearHeroBrush?.();
      heroBrushCleared = true;
    } else if (progress <= .01) heroBrushCleared = false;

    const verticalAmount = ease(phase(progress, .09, .48));
    const horizontalAmount = ease(phase(progress, .24, .63));
    const diagonalAmount = ease(phase(progress, .04, .69));
    const vx = Number(vertical.getAttribute("x1"));
    const hy = Number(horizontal.getAttribute("y1"));
    guide(verticalFill, vx, stageHeight * (1 - verticalAmount), vx, stageHeight);
    guide(horizontalFill, stageWidth * (1 - horizontalAmount), hy, stageWidth, hy);
    guide(diagonalFill, 0, stageHeight, stageWidth * diagonalAmount,
      stageHeight * (1 - diagonalAmount));
    verticalFill.style.opacity = verticalAmount > 0 ? "1" : "0";
    horizontalFill.style.opacity = horizontalAmount > 0 ? "1" : "0";
    diagonalFill.style.opacity = diagonalAmount > 0 ? "1" : "0";
    const radius = Number(circle.getAttribute("r"));
    const circumference = 2 * Math.PI * radius;
    const circleLeft = 1 - ease(phase(progress, .16, .82));
    circle.style.strokeDasharray = `${circumference * circleLeft} ${circumference}`;
    circle.setAttribute("transform", `rotate(180 ${stageWidth / 2} ${stageHeight / 2})`);
    exits.forEach(({ element, start, end, rise, drift, rotate, base }) => {
      const amount = ease(phase(progress, start, end));
      element.style.opacity = String(1 - amount);
      element.style.transform = `${base}translate3d(${drift * amount}px, ${stageHeight * rise * amount}px, 0) rotate(${rotate * amount}deg)`;
    });
  }
  function scheduleScroll() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
  }

  function updateSize() {
    width = clay.clientWidth;
    height = clay.clientHeight;
    brushWidth = 250 * Math.min(width / 1920, height / 1080);
    claySvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    clayMask.setAttribute("width", width);
    clayMask.setAttribute("height", height);
    clayImage.setAttribute("width", width);
    clayImage.setAttribute("height", height);
    clayPath.setAttribute("stroke-width", brushWidth);
    chain = [];
    pointer = null;
    clayPath.setAttribute("d", "");
    scheduleScroll();
  }
  function updateChain(now) {
    const dt = Math.min(50, Math.max(0, now - lastFrame));
    const steps = Math.max(1, Math.ceil(dt / (1000 / 120)));
    const headEase = 1 - Math.exp(-dt / steps / 70);
    const tailEase = 1 - Math.exp(-dt / steps / 38);
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
  function renderBrush(now) {
    brushFrame = 0;
    if (!chain.length) return;
    const idle = now - lastInput;
    if (idle >= 450) {
      chain = [];
      clayPath.setAttribute("d", "");
      return;
    }
    if (!reducedMotion.matches) updateChain(now);
    else if (pointer) chain.forEach((point) => Object.assign(point, pointer));
    lastFrame = now;
    const coords = chain.map((point) => `${point.x.toFixed(1)} ${point.y.toFixed(1)}`);
    clayPath.setAttribute("d", `M${coords.join("L")}L${(chain.at(-1).x + .01).toFixed(2)} ${chain.at(-1).y.toFixed(1)}`);
    clayPath.setAttribute("opacity", String(1 - ease(phase(idle, 80, 450))));
    scheduleBrush();
  }
  function scheduleBrush() {
    if (!brushFrame) brushFrame = requestAnimationFrame(renderBrush);
  }
  clay.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") return;
    const bounds = clay.getBoundingClientRect();
    const now = performance.now();
    pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    if (!chain.length) {
      chain = Array.from({ length: POINT_COUNT }, () => ({ ...pointer }));
      lastFrame = now;
    }
    lastInput = now;
    scheduleBrush();
  }, { passive: true });
  clay.addEventListener("pointerleave", () => { pointer = null; });
  window.addEventListener("blur", () => { pointer = null; });
  window.addEventListener("scroll", scheduleScroll, { passive: true });
  window.addEventListener("resize", updateSize, { passive: true });
  updateSize();
  updateScroll();
})();
