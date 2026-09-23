(() => {
  const hero = document.getElementById("hero");
  const guides = hero.querySelector(".guides");
  const [vertical, horizontal, diagonal] = guides.querySelectorAll("line:not(.guide-erase)");
  const [verticalFill, horizontalFill, diagonalFill] = guides.querySelectorAll(".guide-erase");
  const circle = guides.querySelector("circle");
  const octopus = hero.querySelector(".octopus");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const exits = [
    [".title-octopus", .02, .46, -.34, -28, -2],
    [".title-mentality", .08, .44, -.47, 24, 2],
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
    return { element, start, end, rise, drift, rotate };
  });
  let scrollFrame = 0;
  let heroBrushCleared = false;
  const parallax = window.octopusParallax = { x: 0, y: 0 };
  const parallaxTarget = { x: 0, y: 0 };
  let parallaxFrame = 0;
  let parallaxTime = 0;
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
    // Scrolling changes only opacity. Freeze the cursor offset in place so
    // the octopus does not travel upward or snap back while it fades.
    if (window.scrollY > 2 && parallaxFrame) {
      cancelAnimationFrame(parallaxFrame);
      parallaxFrame = 0;
    }
    octopus.style.opacity = String(1 - ease(phase(
      clamp(window.scrollY / stageHeight), 0, .32)));
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
    exits.forEach(({ element, start, end, rise, drift, rotate }) => {
      const amount = ease(phase(progress, start, end));
      element.style.opacity = String(1 - amount);
      element.style.transform = `translate3d(${drift * amount}px, ${stageHeight * rise * amount}px, 0) rotate(${rotate * amount}deg)`;
    });
  }
  function scheduleScroll() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
  }

  function applyParallax() {
    octopus.style.setProperty("--parallax-x", `${parallax.x.toFixed(3)}px`);
    octopus.style.setProperty("--parallax-y", `${parallax.y.toFixed(3)}px`);
  }
  function renderParallax(now) {
    parallaxFrame = 0;
    if (window.scrollY > 2 || reducedMotion.matches) return;
    const follow = 1 - Math.exp(-(now - parallaxTime) / 180);
    parallaxTime = now;
    parallax.x += (parallaxTarget.x - parallax.x) * follow;
    parallax.y += (parallaxTarget.y - parallax.y) * follow;
    const settled = Math.hypot(parallaxTarget.x - parallax.x, parallaxTarget.y - parallax.y) < .02;
    if (settled) Object.assign(parallax, parallaxTarget);
    applyParallax();
    if (!settled) parallaxFrame = requestAnimationFrame(renderParallax);
  }
  function scheduleParallax() {
    if (parallaxFrame || window.scrollY > 2 || reducedMotion.matches) return;
    parallaxTime = performance.now();
    parallaxFrame = requestAnimationFrame(renderParallax);
  }
  function centerParallax() {
    parallaxTarget.x = parallaxTarget.y = 0;
    scheduleParallax();
  }
  hero.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch" || window.scrollY > 2 || reducedMotion.matches) return;
    const rect = hero.getBoundingClientRect();
    const scale = Math.min(rect.width / 1920, rect.height / 1080);
    parallaxTarget.x = (clamp((event.clientX - rect.left) / rect.width) * 2 - 1) * 28 * scale;
    parallaxTarget.y = (clamp((event.clientY - rect.top) / rect.height) * 2 - 1) * 20 * scale;
    scheduleParallax();
  }, { passive: true });
  hero.addEventListener("pointerleave", centerParallax);
  window.addEventListener("blur", centerParallax);

  window.addEventListener("scroll", scheduleScroll, { passive: true });
  window.addEventListener("resize", () => { centerParallax(); scheduleScroll(); }, { passive: true });
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) {
      cancelAnimationFrame(parallaxFrame);
      parallaxFrame = 0;
      parallax.x = parallax.y = parallaxTarget.x = parallaxTarget.y = 0;
      applyParallax();
    }
    scheduleScroll();
  });
  updateScroll();
})();
