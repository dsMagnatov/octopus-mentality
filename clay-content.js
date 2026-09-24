(() => {
  const content = document.querySelector(".editorial-content");
  if (!content) return;
  const targets = [...content.querySelectorAll("[data-reveal]")];
  const photos = [...content.querySelectorAll("[data-photo]")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const originals = new Map(targets.map((element) => [element, element.innerHTML]));
  const revealed = new WeakSet();
  let resizeTimer;
  let scrollFrame = 0;
  let observer;
  let layoutWidth = window.innerWidth;

  function splitLines(element) {
    element.classList.remove("is-split");
    element.innerHTML = originals.get(element);
    const sourceNode = element.cloneNode(true);
    sourceNode.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
    const source = sourceNode.textContent.trim();
    const indent = getComputedStyle(element).textIndent;
    const tokens = source.match(/\n|[^\S\n]+|[^\s]+/g) || [];
    const measured = [];
    let preceding = "";
    element.replaceChildren();

    // Measure real line breaks using the current font, width and first-line indent.
    for (const token of tokens) {
      if (token === "\n") {
        element.append(document.createElement("br"));
        preceding = "";
      } else if (/^\s+$/.test(token)) {
        element.append(document.createTextNode(token));
        preceding += token;
      } else {
        const word = document.createElement("span");
        word.textContent = token;
        word.style.display = "inline-block";
        element.append(word);
        measured.push({ word, text: token, space: preceding });
        preceding = "";
      }
    }

    const rows = [];
    measured.forEach((item) => {
      const top = item.word.getBoundingClientRect().top;
      let row = rows.find((candidate) => Math.abs(candidate.top - top) < 2);
      if (!row) {
        row = { top, words: [] };
        rows.push(row);
      }
      row.words.push(item);
    });

    const fragment = document.createDocumentFragment();
    const accessible = document.createElement("span");
    accessible.className = "sr-only";
    accessible.textContent = source.replace(/\s+/g, " ");
    fragment.append(accessible);
    rows.forEach((row, index) => {
      const mask = document.createElement("span");
      const line = document.createElement("span");
      mask.className = "line-mask";
      mask.setAttribute("aria-hidden", "true");
      line.className = "line-content";
      line.textContent = row.words.map((word, i) => (i ? word.space : "") + word.text).join("");
      line.style.setProperty("--line-delay", (index * .065) + "s");
      if (index === 0) line.style.textIndent = indent;
      mask.append(line);
      fragment.append(mask);
    });
    element.replaceChildren(fragment);
    element.classList.add("is-split");
    element.classList.toggle("is-revealed", revealed.has(element) || reducedMotion.matches);
  }

  function observeText() {
    observer?.disconnect();
    observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        revealed.add(target);
        target.classList.add("is-revealed");
        observer.unobserve(target);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: .01 });
    targets.forEach((target) => {
      if (!revealed.has(target)) observer.observe(target);
    });
  }

  function updatePhotos() {
    scrollFrame = 0;
    const viewportHeight = window.innerHeight;
    photos.forEach((photo) => {
      const rect = photo.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > viewportHeight) return;
      const progress = (viewportHeight / 2 - rect.top - rect.height / 2) / (viewportHeight + rect.height);
      const offset = reducedMotion.matches ? 0 : Math.max(-1, Math.min(1, progress)) * rect.height * .08;
      photo.style.setProperty("--photo-shift", offset.toFixed(2) + "px");
    });
  }

  function schedulePhotos() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updatePhotos);
  }

  function layout() {
    targets.forEach(splitLines);
    content.classList.add("is-ready");
    observeText();
    schedulePhotos();
  }

  window.addEventListener("scroll", schedulePhotos, { passive: true });
  window.addEventListener("resize", () => {
    if (window.innerWidth === layoutWidth) { schedulePhotos(); return; }
    layoutWidth = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 120);
  }, { passive: true });
  reducedMotion.addEventListener("change", layout);
  document.fonts.ready.then(layout);
})();
