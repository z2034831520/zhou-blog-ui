// Canvas adaptation of React Bits ParticleText for the Hugo article index.
// Copyright (c) 2026 David Haz. MIT + Commons Clause.
// See /licenses/React-Bits-LICENSE.txt and THIRD_PARTY_NOTICES.md.
(() => {
  const title = document.querySelector('[data-particle-title]');
  if (!title) return;

  const canvas = title.querySelector('canvas');
  const label = title.querySelector('span');
  const context = canvas?.getContext('2d');
  if (!context || !label) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compact = window.matchMedia('(max-width: 700px)');
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const base = [234, 242, 245];
  const accent = [119, 217, 224];
  const gatherDuration = 520;
  const gatherStagger = 80;
  const pointer = { active: false, x: 0, y: 0 };

  let particles = [];
  let width = 0;
  let height = 0;
  let pixelRatio = 0;
  let frameId = 0;
  let resizeFrame = 0;
  let lastFrameTime = 0;
  let forceBuild = false;
  let inView = true;
  let gatherStart = null;
  let gathered = false;

  const stop = () => {
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = 0;
  };

  const render = (now = performance.now()) => {
    frameId = 0;
    const elapsed = lastFrameTime ? Math.max(0, now - lastFrameTime) : 16;
    lastFrameTime = now;
    context.clearRect(0, 0, width, height);
    context.shadowBlur = 3;
    context.shadowColor = 'rgba(119, 217, 224, .65)';

    let moving = false;
    const gathering = !gathered && now < gatherStart + gatherDuration + gatherStagger;
    if (!gathering) gathered = true;
    const response = 1 - Math.exp(-elapsed / (pointer.active ? 16 : 27));
    for (const particle of particles) {
      if (gathering) {
        const progress = clamp((now - gatherStart - particle.delay) / gatherDuration, 0, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        particle.x = particle.startX + (particle.targetX - particle.startX) * eased;
        particle.y = particle.startY + (particle.targetY - particle.startY) * eased;
        moving = true;
        context.fillStyle = particle.color;
        context.fillRect(particle.x, particle.y, particle.size, particle.size);
        continue;
      }

      let x = particle.targetX;
      let y = particle.targetY;

      if (pointer.active) {
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 120) {
          const force = Math.pow(1 - distance / 120, 2) * 54;
          const angle = particle.seed * Math.PI * 2;
          x += (distance ? dx / distance : Math.cos(angle)) * force;
          y += (distance ? dy / distance : Math.sin(angle)) * force;
        }
      }

      particle.x += (x - particle.x) * response;
      particle.y += (y - particle.y) * response;
      if (Math.abs(x - particle.x) <= 0.1) particle.x = x;
      else moving = true;
      if (Math.abs(y - particle.y) <= 0.1) particle.y = y;
      else moving = true;
      context.fillStyle = particle.color;
      context.fillRect(particle.x, particle.y, particle.size, particle.size);
    }

    context.shadowBlur = 0;
    title.classList.add('is-ready');
    if (moving && inView && !document.hidden && !motion.matches && !compact.matches) {
      frameId = window.requestAnimationFrame(render);
    }
  };

  const resume = () => {
    if (!frameId && particles.length && inView && !document.hidden && !motion.matches && !compact.matches) {
      frameId = window.requestAnimationFrame(render);
    }
  };

  const build = () => {
    resizeFrame = 0;
    const required = forceBuild;
    forceBuild = false;
    if (motion.matches || compact.matches) {
      stop();
      title.classList.remove('is-ready');
      return;
    }

    const box = title.getBoundingClientRect();
    const nextWidth = Math.round(box.width);
    const nextHeight = Math.round(box.height);
    if (nextWidth < 10 || nextHeight < 10) return;

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (!required && nextWidth === width && nextHeight === height && ratio === pixelRatio) return;
    width = nextWidth;
    height = nextHeight;
    pixelRatio = ratio;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const sample = document.createElement('canvas');
    sample.width = width;
    sample.height = height;
    const sampleContext = sample.getContext('2d', { willReadFrequently: true });
    if (!sampleContext) return;

    const style = window.getComputedStyle(title);
    let fontSize = Number.parseFloat(style.fontSize);
    const font = () => `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
    sampleContext.font = font();
    const text = label.textContent.trim();
    const measuredWidth = sampleContext.measureText(text).width;
    if (measuredWidth > width - 8) {
      fontSize *= (width - 8) / measuredWidth;
      sampleContext.font = font();
    }

    const metrics = sampleContext.measureText(text);
    const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.78;
    const descent = metrics.actualBoundingBoxDescent || fontSize * 0.22;
    const baseline = (height - ascent - descent) / 2 + ascent;
    sampleContext.fillStyle = '#fff';
    sampleContext.fillText(text, 2, baseline);

    const data = sampleContext.getImageData(0, 0, width, height).data;
    const targets = [];
    const step = width < 500 ? 3 : 4;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 45) targets.push({ x, y, alpha });
      }
    }
    if (!targets.length) {
      particles = [];
      title.classList.remove('is-ready');
      return;
    }

    const stride = Math.max(1, Math.ceil(targets.length / 2200));
    if (gatherStart === null) gatherStart = performance.now();
    const gatherIsActive = !gathered && performance.now() < gatherStart + gatherDuration + gatherStagger;
    particles = targets.filter((_, index) => index % stride === 0).map((target, index) => {
      const seed = ((index * 9301 + 49297) % 233280) / 233280;
      const angle = seed * Math.PI * 2;
      const distance = 20 + seed * 20;
      const startX = target.x + Math.cos(angle) * distance;
      const startY = target.y + Math.sin(angle) * distance;
      const blend = clamp(target.x / Math.max(1, width) + (seed - 0.5) * 0.35, 0, 1);
      const color = `rgb(${base.map((channel, channelIndex) =>
        Math.round(channel + (accent[channelIndex] - channel) * blend)).join(',')})`;
      return {
        x: gatherIsActive ? startX : target.x,
        y: gatherIsActive ? startY : target.y,
        startX, startY, delay: seed * gatherStagger,
        targetX: target.x, targetY: target.y,
        size: Math.max(1, 1.7 * (0.75 + target.alpha / 255 * 0.45)),
        color, seed
      };
    });

    pointer.active = false;
    stop();
    lastFrameTime = 0;
    render();
  };

  const queueBuild = (required = false) => {
    forceBuild ||= required;
    if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(build);
  };

  title.addEventListener('pointermove', event => {
    const box = title.getBoundingClientRect();
    pointer.x = event.clientX - box.left;
    pointer.y = event.clientY - box.top;
    pointer.active = true;
    resume();
  }, { passive: true });
  title.addEventListener('pointerleave', () => { pointer.active = false; resume(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { pointer.active = false; stop(); }
    else resume();
  });
  motion.addEventListener('change', () => {
    if (motion.matches) {
      stop();
      title.classList.remove('is-ready');
    } else {
      queueBuild(true);
    }
  });
  compact.addEventListener('change', () => {
    if (compact.matches) {
      stop();
      title.classList.remove('is-ready');
    } else if (!motion.matches) {
      queueBuild(true);
    }
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      if (inView) resume(); else { pointer.active = false; stop(); }
    }).observe(title);
  }
  if ('ResizeObserver' in window) new ResizeObserver(() => queueBuild()).observe(title);
  if (!motion.matches && !compact.matches) {
    queueBuild(true);
    document.fonts?.ready.then(() => queueBuild(true)).catch(() => {});
  }
})();
