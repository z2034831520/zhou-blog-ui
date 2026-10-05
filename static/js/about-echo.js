// Native Hugo adaptation of React Bits EchoText: a short entrance echo and pointer trail.
(() => {
  const title = document.querySelector('[data-echo-text]');
  const front = title?.querySelector('.about-echo-front');
  if (!front || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const count = 8;
  const offset = 18;
  const fade = 0.68;
  const duration = 1050;
  const copies = [];
  for (let depth = count; depth >= 1; depth -= 1) {
    const copy = document.createElement('span');
    copy.className = 'about-echo-copy';
    copy.setAttribute('aria-hidden', 'true');
    copy.textContent = front.textContent;
    copy.style.color = `color-mix(in srgb, var(--accent) ${Math.min(70, 22 + depth * 5)}%, var(--ink))`;
    copy.style.filter = `blur(${(depth / count * 2.4).toFixed(2)}px)`;
    title.insertBefore(copy, front);
    copies[depth] = copy;
  }

  const layers = [front, ...copies.slice(1)];
  const positions = layers.map((_, depth) => ({
    x: offset * (depth + 0.35),
    y: offset * 0.12 * (depth + 0.35)
  }));
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  let targetX = 0;
  let targetY = 0;
  let lastTargetX = 0;
  let lastTargetY = 0;
  let activity = 1;
  let startTime = performance.now();
  let frameId = 0;

  const render = now => {
    frameId = 0;
    const progress = clamp((now - startTime) / duration, 0, 1);
    const entranceRest = Math.pow(1 - progress, 3);
    const velocity = Math.hypot(targetX - lastTargetX, targetY - lastTargetY);
    lastTargetX = targetX;
    lastTargetY = targetY;
    let separation = 0;
    let unsettled = 0;

    layers.forEach((layer, depth) => {
      const position = positions[depth];
      const desiredX = targetX + offset * (depth + 0.35) * entranceRest;
      const desiredY = targetY + offset * 0.12 * (depth + 0.35) * entranceRest;
      const response = clamp(0.34 / (1 + depth * 0.95), 0.03, 0.34);
      position.x += (desiredX - position.x) * response;
      position.y += (desiredY - position.y) * response;
      unsettled = Math.max(unsettled, Math.hypot(desiredX - position.x, desiredY - position.y));
      layer.style.transform = `translate3d(${position.x.toFixed(2)}px, ${position.y.toFixed(2)}px, 0)`;
      if (depth > 0) separation = Math.max(separation,
        Math.hypot(position.x - positions[0].x, position.y - positions[0].y));
    });

    const nextActivity = Math.max(entranceRest,
      clamp(separation / (offset * 2.25), 0, 1),
      clamp(velocity / (offset * 0.35), 0, 1));
    activity += (nextActivity - activity) * 0.18;
    for (let depth = 1; depth <= count; depth += 1) {
      copies[depth].style.opacity = String(Math.pow(fade, depth) * activity);
    }
    if (progress < 1 || activity > 0.003 || unsettled > 0.1) {
      frameId = requestAnimationFrame(render);
    }
  };
  const schedule = () => { if (!frameId) frameId = requestAnimationFrame(render); };

  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    title.addEventListener('pointermove', event => {
      const rect = title.getBoundingClientRect();
      targetX = clamp((event.clientX - rect.left - rect.width / 2) / (rect.width / 2), -1, 1) * 24;
      targetY = clamp((event.clientY - rect.top - rect.height / 2) / (rect.height / 2), -1, 1) * 10;
      schedule();
    });
    title.addEventListener('pointerleave', () => {
      targetX = 0;
      targetY = 0;
      schedule();
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    } else if (!document.hidden) {
      startTime = performance.now() - duration;
      schedule();
    }
  });
  title.dataset.echoReady = 'true';
  schedule();
})();
