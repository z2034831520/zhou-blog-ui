// Inspired by React Bits GlowCursor. Adapted to a lightweight Canvas trail for Hugo.
// Copyright (c) 2026 David Haz; MIT + Commons Clause.
// See /licenses/React-Bits-LICENSE.txt and THIRD_PARTY_NOTICES.md.
(() => {
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!finePointer.matches || reducedMotion.matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'glow-cursor-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;
  document.body.append(canvas);

  const count = 28;
  const points = Array.from({ length: count }, () => ({ x: 0, y: 0 }));
  const target = { x: 0, y: 0 };
  let initialized = false;
  let lastInput = 0;
  let lastFrame = performance.now();
  let fade = 0;
  let frame = 0;
  let width = 0;
  let height = 0;

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const clear = () => context.clearRect(0, 0, width, height);
  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    fade = 0;
    initialized = false;
    clear();
  };

  const stroke = (widthScale, opacity, blur) => {
    context.shadowColor = '#77d9e0';
    context.shadowBlur = blur;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    for (let index = count - 1; index > 0; index -= 1) {
      const tail = index / (count - 1);
      const life = Math.pow(1 - tail, 1.25) * fade;
      if (life < 0.008) continue;
      const red = Math.round(119 + tail * 65);
      const green = Math.round(217 - tail * 34);
      const blue = Math.round(224 + tail * 31);
      context.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${life * opacity})`;
      context.lineWidth = Math.max(0.6, (6.2 - tail * 4.8) * widthScale);
      context.beginPath();
      context.moveTo(points[index].x, points[index].y);
      context.lineTo(points[index - 1].x, points[index - 1].y);
      context.stroke();
    }
  };

  const render = now => {
    frame = 0;
    if (document.hidden || !finePointer.matches || reducedMotion.matches) {
      stop();
      return;
    }
    const delta = Math.min(Math.max((now - lastFrame) / 16.667, 0.1), 3);
    lastFrame = now;
    const follow = 1 - Math.pow(0.73, delta);
    const chain = 1 - Math.pow(0.62, delta);
    points[0].x += (target.x - points[0].x) * follow;
    points[0].y += (target.y - points[0].y) * follow;
    for (let index = 1; index < count; index += 1) {
      points[index].x += (points[index - 1].x - points[index].x) * chain;
      points[index].y += (points[index - 1].y - points[index].y) * chain;
    }

    const idle = now - lastInput;
    fade += ((idle < 650 ? 1 : 0) - fade) * Math.min(1, 0.13 * delta);
    clear();
    if (fade > 0.005) {
      context.globalCompositeOperation = 'lighter';
      stroke(3.2, 0.13, 19);
      stroke(1, 0.46, 13);
      stroke(0.25, 0.75, 5);
      context.shadowBlur = 0;
      const glow = context.createRadialGradient(points[0].x, points[0].y, 0, points[0].x, points[0].y, 27);
      glow.addColorStop(0, `rgba(232, 252, 255, ${0.57 * fade})`);
      glow.addColorStop(0.2, `rgba(119, 217, 224, ${0.4 * fade})`);
      glow.addColorStop(1, 'rgba(119, 217, 224, 0)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(points[0].x, points[0].y, 27, 0, Math.PI * 2);
      context.fill();
      context.globalCompositeOperation = 'source-over';
    }
    if (idle < 650 || fade > 0.005) frame = requestAnimationFrame(render);
    else initialized = false;
  };

  const onMove = event => {
    if ((event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') ||
        !finePointer.matches || reducedMotion.matches) return;
    const now = performance.now();
    if (!initialized || now - lastInput > 1300) {
      points.forEach(point => { point.x = event.clientX; point.y = event.clientY; });
      initialized = true;
    }
    target.x = event.clientX;
    target.y = event.clientY;
    lastInput = now;
    if (!frame) {
      lastFrame = now;
      frame = requestAnimationFrame(render);
    }
  };

  resize();
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('blur', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) stop(); });
  finePointer.addEventListener('change', () => { if (!finePointer.matches) stop(); });
})();
