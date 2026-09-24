(() => {
  const heroRelief = window.createReliefRenderer({
    stage: document.getElementById("hero"),
    canvas: document.getElementById("hero-relief-canvas"),
    fallback: document.getElementById("hero-relief"),
    baseColor: [0, 16 / 255, 162 / 255],
    reveal: {
      canvas: document.getElementById("octopus-reveal-canvas"),
      fallback: document.getElementById("white-reveal"),
      offset: () => window.octopusParallax
    },
    depth: 0.075,
    enabled: () => window.scrollY <= 2
  });
  window.createReliefRenderer({
    stage: document.getElementById("clay"),
    canvas: document.getElementById("clay-canvas"),
    fallback: document.getElementById("clay-reveal"),
    baseColor: [247 / 255, 37 / 255, 38 / 255],
    depth: 0.075
  });
  // The hero remains sticky during its exit; stop its hover layer on scroll.
  let heroAtTop = window.scrollY <= 2;
  window.addEventListener("scroll", () => {
    const atTop = window.scrollY <= 2;
    if (heroAtTop && !atTop) heroRelief.reset();
    heroAtTop = atTop;
  }, { passive: true });
})();
