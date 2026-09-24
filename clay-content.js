(() => {
  const section = document.getElementById("clay");
  const stage = document.getElementById("clay-stage");
  const titleLines = [...section.querySelectorAll(".clay-title-line")];
  const columns = [...section.querySelectorAll(".clay-column")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = (value) => Math.max(0, Math.min(1, value));
  const ease = (value) => value * value * (3 - 2 * value);
  const phase = (progress, start, end) => clamp((progress - start) / (end - start));
  let lineHeight = 21;
  let rowCount = 1;
  let frame = 0;

  section.classList.add("has-scroll-reveal");

  function update() {
    frame = 0;
    const scrollDistance = Math.max(1, section.offsetHeight - stage.offsetHeight);
    const progress = clamp((window.scrollY - section.offsetTop) / scrollDistance);
    const revealAll = reducedMotion.matches && window.scrollY >= section.offsetTop;

    titleLines.forEach((line, index) => {
      const amount = revealAll ? 1 : ease(phase(progress, .09 + index * .12, .21 + index * .12));
      line.style.opacity = amount.toFixed(3);
      line.style.filter = `blur(${((1 - amount) * 8).toFixed(2)}px)`;
      line.style.transform = `translateY(${((1 - amount) * 22).toFixed(2)}px)`;
    });

    const bodyProgress = revealAll ? 1 : phase(progress, .36, .96);
    columns.forEach((column, index) => {
      const rows = bodyProgress * (rowCount + 1.5) - index * .28;
      const whole = Math.floor(rows);
      const withinRow = clamp((rows - whole - .12) / .72);
      const shownHeight = Math.max(0, whole + ease(withinRow)) * lineHeight;
      column.style.setProperty("--reveal-y", `${shownHeight.toFixed(2)}px`);
    });
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  function measure() {
    const scale = Math.min(stage.clientWidth / 1920, stage.clientHeight / 1080);
    stage.style.setProperty("--s", String(scale));
    lineHeight = parseFloat(getComputedStyle(columns[0]).lineHeight) || 21 * scale;
    rowCount = Math.ceil(Math.max(...columns.map((column) => column.scrollHeight)) / lineHeight);
    schedule();
  }

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", measure, { passive: true });
  reducedMotion.addEventListener("change", schedule);
  document.fonts.ready.then(measure);
  measure();
})();
