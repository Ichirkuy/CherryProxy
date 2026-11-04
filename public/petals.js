// Falling cherry blossom petals on a full-screen background canvas

(() => {
  const canvas = document.getElementById("petals");
  const ctx = canvas.getContext("2d");
  const player = document.getElementById("player");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const colors = ["#ffd1e1", "#ffb7d0", "#ff9ec0", "#ffc4d8", "#fbe3ec"];

  let width, height, petals = [];

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // More petals on bigger screens, fewer on phones (and with reduced motion)
    const count = Math.round(Math.min(70, width / 18) / (reduceMotion ? 3 : 1));
    while (petals.length < count) petals.push(makePetal(true));
    petals.length = count;
  }

  function makePetal(anywhere) {
    return {
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : -20,
      size: 7 + Math.random() * 8,
      speed: (0.6 + Math.random() * 1.1) * (reduceMotion ? 0.4 : 1),
      drift: 0.3 + Math.random() * 0.6,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.01 + Math.random() * 0.02,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.04,
      flip: Math.random() * Math.PI * 2,
      flipSpeed: 0.02 + Math.random() * 0.03,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 0.6 + Math.random() * 0.4,
    };
  }

  // A petal: rounded teardrop with a small notch at the wide end
  function drawPetal(p) {
    const s = p.size;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.scale(1, Math.abs(Math.cos(p.flip)) * 0.7 + 0.3); // fake 3D tumble
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(0, s);
    ctx.bezierCurveTo(-s, s * 0.4, -s * 0.8, -s * 0.8, -s * 0.2, -s);
    ctx.lineTo(0, -s * 0.75);
    ctx.lineTo(s * 0.2, -s);
    ctx.bezierCurveTo(s * 0.8, -s * 0.8, s, s * 0.4, 0, s);
    ctx.fill();
    ctx.restore();
  }

  function frame() {
    requestAnimationFrame(frame);
    // Don't burn CPU while a game is open or the tab is hidden
    if (!player.classList.contains("hidden") || document.hidden) return;

    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < petals.length; i++) {
      const p = petals[i];
      p.sway += p.swaySpeed;
      p.x += Math.sin(p.sway) * p.drift + 0.4; // gentle breeze to the right
      p.y += p.speed;
      p.angle += p.spin;
      p.flip += p.flipSpeed;
      if (p.y > height + 20 || p.x > width + 20) {
        petals[i] = makePetal(false);
        petals[i].x = Math.random() * width * 1.2 - width * 0.2;
      }
      drawPetal(p);
    }
  }

  window.addEventListener("resize", resize);
  resize();
  frame();
})();
