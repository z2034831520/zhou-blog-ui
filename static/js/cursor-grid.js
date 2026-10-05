// Canvas adaptation of React Bits Cursor Grid for the Hugo homepage.
// Copyright (c) 2026 David Haz; MIT + Commons Clause.
// See /licenses/React-Bits-LICENSE.txt.
(() => {
  const hero = document.querySelector('.hero');
  const canvas = hero?.querySelector('.hero-cursor-grid');
  if (!canvas ||
      !window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const context = canvas.getContext('2d');
  if (!context) return;

  const cellSize = 58;
  const radius = 120;
  const holdTime = 90;
  const fadeDuration = 700;
  const maxOpacity = 0.62;
  let width = 0;
  let height = 0;
  let columns = 0;
  let rows = 0;
  let offsetX = 0;
  let offsetY = 0;
  let levels = new Float32Array(0);
  let touched = new Float64Array(0);
  let frame = 0;

  const resize = () => {
    width = hero.clientWidth;
    height = hero.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    columns = Math.ceil(width / cellSize) + 1;
    rows = Math.ceil(height / cellSize) + 1;
    offsetX = (width - columns * cellSize) / 2;
    offsetY = (height - rows * cellSize) / 2;
    levels = new Float32Array(columns * rows);
    touched = new Float64Array(columns * rows);
    cancelAnimationFrame(frame);
    frame = 0;
  };

  const draw = now => {
    frame = 0;
    context.clearRect(0, 0, width, height);
    let visible = false;

    for (let index = 0; index < levels.length; index++) {
      if (levels[index] <= 0) continue;
      const age = Math.max(0, now - touched[index] - holdTime);
      const opacity = levels[index] * Math.max(0, 1 - age / fadeDuration);
      if (opacity < 0.005) {
        levels[index] = 0;
        continue;
      }
      visible = true;
      const x = offsetX + (index % columns) * cellSize + 0.5;
      const y = offsetY + Math.floor(index / columns) * cellSize + 0.5;
      context.fillStyle = `rgba(119, 217, 224, ${opacity * 0.07})`;
      context.fillRect(x, y, cellSize - 1, cellSize - 1);
      context.strokeStyle = `rgba(119, 217, 224, ${opacity})`;
      context.lineWidth = 1.2;
      context.strokeRect(x, y, cellSize - 1, cellSize - 1);
    }

    if (visible) frame = requestAnimationFrame(draw);
  };

  const onPointerMove = event => {
    if (event.pointerType === 'touch') return;
    const bounds = hero.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const now = performance.now();
    const minColumn = Math.max(0, Math.floor((x - radius - offsetX) / cellSize));
    const maxColumn = Math.min(columns - 1, Math.floor((x + radius - offsetX) / cellSize));
    const minRow = Math.max(0, Math.floor((y - radius - offsetY) / cellSize));
    const maxRow = Math.min(rows - 1, Math.floor((y + radius - offsetY) / cellSize));

    for (let row = minRow; row <= maxRow; row++) {
      for (let column = minColumn; column <= maxColumn; column++) {
        const centerX = offsetX + column * cellSize + cellSize / 2;
        const centerY = offsetY + row * cellSize + cellSize / 2;
        const distance = Math.hypot(centerX - x, centerY - y);
        if (distance >= radius) continue;
        const index = row * columns + column;
        const remaining = Math.max(0, 1 - Math.max(0, now - touched[index] - holdTime) / fadeDuration);
        const strength = Math.pow(1 - distance / radius, 1.4) * maxOpacity;
        levels[index] = Math.max(levels[index] * remaining, strength);
        touched[index] = now;
      }
    }
    if (!frame) frame = requestAnimationFrame(draw);
  };

  hero.classList.add('has-cursor-grid');
  resize();
  hero.addEventListener('pointermove', onPointerMove, { passive: true });
  if ('ResizeObserver' in window) {
    new ResizeObserver(resize).observe(hero);
  } else {
    window.addEventListener('resize', resize, { passive: true });
  }
})();
