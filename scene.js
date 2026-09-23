(() => {
  const hero = document.getElementById("hero");
  const guides = hero.querySelector(".guides");
  const [vertical, horizontal, diagonal] = guides.querySelectorAll("line:not(.guide-erase)");
  const [verticalFill, horizontalFill, diagonalFill] = guides.querySelectorAll(".guide-erase");
  const circle = guides.querySelector("circle");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
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

  window.addEventListener("scroll", scheduleScroll, { passive: true });
  window.addEventListener("resize", scheduleScroll, { passive: true });
  reducedMotion.addEventListener("change", scheduleScroll);
  updateScroll();
})();
