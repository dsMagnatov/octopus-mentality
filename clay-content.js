(() => {
  const section = document.getElementById("clay");
  const stage = document.getElementById("clay-stage");
  if (!section || !stage) return;

  const intro = document.getElementById("clay-intro");
  const visual = document.getElementById("story-visual");
  const art = visual.querySelector(".story-art");
  const caption = visual.querySelector(".story-caption");
  const statement = document.getElementById("story-statement");
  const contact = document.getElementById("contact-panel");
  const groups = [...section.querySelectorAll("[data-reveal-group]")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = (value) => Math.max(0, Math.min(1, value));
  const ease = (value) => 1 - Math.pow(1 - value, 3);
  const phase = (progress, start, end) => ease(clamp((progress - start) / (end - start)));
  let scale = 1;
  let frame = 0;

  // Keep the original text and line breaks in the DOM. Only the visible words
  // move inside clipping wrappers, so the reveal is a mask, not a fade wipe.
  function splitText(group) {
    const semanticElements = [group, ...group.querySelectorAll("h2, p, .story-kicker, .contact-kicker")]
      .filter((element) => element.matches("h2, p, .story-kicker, .contact-kicker"));
    const spokenText = semanticElements.map((element) => ({
      element,
      text: element.innerText.replace(/\s+/g, " ").trim(),
    }));
    const walker = document.createTreeWalker(group, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      if (walker.currentNode.nodeValue.trim()) nodes.push(walker.currentNode);
    }
    for (const node of nodes) {
      const fragment = document.createDocumentFragment();
      for (const part of node.nodeValue.match(/\s+|\S+/g) || []) {
        if (/^\s+$/.test(part)) {
          fragment.append(document.createTextNode(part));
        } else {
          const mask = document.createElement("span");
          const word = document.createElement("span");
          mask.className = "split-mask";
          mask.setAttribute("aria-hidden", "true");
          word.className = "split-word";
          word.textContent = part;
          mask.append(word);
          fragment.append(mask);
        }
      }
      node.replaceWith(fragment);
    }
    spokenText.forEach(({ element, text }) => {
      const accessible = document.createElement("span");
      accessible.className = "sr-only";
      accessible.textContent = text;
      element.prepend(accessible);
    });
  }

  function measureLines(group) {
    const masks = [...group.querySelectorAll(".split-mask")];
    const positions = masks.map((mask) => mask.getBoundingClientRect().top);
    const lines = [];
    for (const top of [...positions].sort((a, b) => a - b)) {
      if (!lines.some((line) => Math.abs(line - top) < 4)) lines.push(top);
    }
    masks.forEach((mask, index) => {
      const line = lines.findIndex((top) => Math.abs(top - positions[index]) < 4);
      mask.firstElementChild.style.setProperty("--delay", `${Math.max(0, line) * .065}s`);
    });
  }

  groups.forEach(splitText);
  section.classList.add("has-scroll-reveal");
  contact.inert = true;

  function update() {
    frame = 0;
    const distance = Math.max(1, section.offsetHeight - stage.offsetHeight);
    const progress = clamp((window.scrollY - section.offsetTop) / distance);
    const motion = (start, end) => reducedMotion.matches
      ? Number(progress >= end)
      : phase(progress, start, end);

    groups[0].classList.toggle("is-visible", progress >= .07);
    groups[1].classList.toggle("is-visible", progress >= .15);
    groups[2].classList.toggle("is-visible", progress >= .56);
    groups[3].classList.toggle("is-visible", progress >= .70);
    groups[4].classList.toggle("is-visible", progress >= .86);

    const introExit = motion(.40, .51);
    intro.style.setProperty("--intro-opacity", (1 - introExit).toFixed(3));
    intro.style.setProperty("--intro-y", `${(-55 * scale * introExit).toFixed(1)}px`);
    intro.setAttribute("aria-hidden", String(introExit > .98));

    const artEntry = motion(.46, .62);
    const artShift = motion(.65, .78);
    const artExit = motion(.81, .89);
    art.style.setProperty("--art-x", `${(-338 * scale * artShift).toFixed(1)}px`);
    art.style.setProperty("--art-y", `${(690 * scale * (1 - artEntry)).toFixed(1)}px`);
    art.style.setProperty("--art-scale", (.76 + .24 * artEntry - .21 * artShift).toFixed(3));
    art.style.setProperty("--art-opacity", (artEntry * (1 - artExit)).toFixed(3));
    art.setAttribute("aria-hidden", String(artEntry < .02 || artExit > .98));

    const captionEntry = motion(.54, .64);
    const captionExit = motion(.67, .74);
    caption.style.setProperty("--caption-y", `${(95 * scale * (1 - captionEntry)).toFixed(1)}px`);
    caption.style.setProperty("--caption-opacity", (captionEntry * (1 - captionExit)).toFixed(3));
    caption.setAttribute("aria-hidden", String(captionEntry < .02 || captionExit > .98));

    const statementEntry = motion(.65, .79);
    const statementExit = motion(.82, .90);
    statement.style.setProperty("--statement-y", `${(685 * scale * (1 - statementEntry)).toFixed(1)}px`);
    statement.style.setProperty("--statement-rotate", `${(-9 * (1 - statementEntry)).toFixed(2)}deg`);
    statement.style.setProperty("--statement-opacity", (statementEntry * (1 - statementExit)).toFixed(3));
    statement.setAttribute("aria-hidden", String(statementEntry < .02 || statementExit > .98));

    const contactEntry = motion(.82, .95);
    contact.style.setProperty("--contact-y", `${(960 * scale * (1 - contactEntry)).toFixed(1)}px`);
    contact.style.setProperty("--contact-opacity", contactEntry.toFixed(3));
    const contactActive = contactEntry > .9;
    contact.classList.toggle("is-active", contactActive);
    contact.inert = !contactActive;
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  function measure() {
    scale = Math.min(stage.clientWidth / 1920, stage.clientHeight / 1080);
    stage.style.setProperty("--s", String(scale));
    groups.forEach(measureLines);
    schedule();
  }

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", measure, { passive: true });
  reducedMotion.addEventListener("change", schedule);
  document.fonts.ready.then(measure);
  measure();
})();
