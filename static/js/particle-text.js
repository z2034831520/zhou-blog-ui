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
  const easeOutCubic = value => 1 - Math.pow(1 - value, 3);
  const base = [234, 242, 245];
  const accent = [119, 217, 224];
  const pointer = { active: false, x: 0, y: 0, smoothX: 0, smoothY: 0 };

  let particles = [];
  let width = 0;
  let height = 0;
  let gatherStart = 0;
  let frameId = 0;
  let resizeFrame = 0;
  let inView = true;

  const stop = () => {
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = 0;
  };

  const render = now => {
    frameId = 0;
    context.clearRect(0, 0, width, height);
    context.shadowBlur = 3;
    context.shadowColor = 'rgba(119, 217, 224, .65)';

    pointer.smoothX += (pointer.x - pointer.smoothX) * 0.18;
    pointer.smoothY += (pointer.y - pointer.smoothY) * 0.18;

    for (const particle of particles) {
      const progress = clamp((now - gatherStart - particle.delay) / 1350, 0, 1);
      const eased = easeOutCubic(progress);
      let x = particle.startX + (particle.targetX - particle.startX) * eased;
      let y = particle.startY + (particle.targetY - particle.startY) * eased;

      if (progress === 1) {
        const driftTime = now * 0.001;
        x += Math.sin(driftTime * 0.9 + particle.seed * 10) * particle.depth * 0.6;
        y += Math.cos(driftTime * 0.75 + particle.depth * 10) * particle.depth * 0.6;
      }

      if (pointer.active) {
        const dx = x - pointer.smoothX;
        const dy = y - pointer.smoothY;
        const distance = Math.hypot(dx, dy);
        if (distance > 0 && distance < 110) {
          const force = Math.pow(1 - distance / 110, 2) * 38;
          x += dx / distance * force;
          y += dy / distance * force;
        }
      }

      particle.x += (x - particle.x) * 0.24;
      particle.y += (y - particle.y) * 0.24;
      context.globalAlpha = 0.32 + progress * 0.68;
      context.fillStyle = particle.color;
      context.fillRect(particle.x, particle.y, particle.size, particle.size);
    }

    context.globalAlpha = 1;
    context.shadowBlur = 0;
    title.classList.add('is-ready');
    if (inView && !document.hidden && !motion.matches && !compact.matches) {
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
    if (motion.matches || compact.matches) {
      stop();
      title.classList.remove('is-ready');
      return;
    }

    const box = title.getBoundingClientRect();
    width = Math.round(box.width);
    height = Math.round(box.height);
    if (width < 10 || height < 10) return;

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
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
    if (!targets.length) return;

    const stride = Math.max(1, Math.ceil(targets.length / 2200));
    const scatter = Math.min(175, width * 0.18 + 50);
    particles = targets.filter((_, index) => index % stride === 0).map((target, index) => {
      const seed = ((index * 9301 + 49297) % 233280) / 233280;
      const depth = 0.45 + (((index * 233 + 97) % 1000) / 1000) * 0.9;
      const angle = seed * Math.PI * 2;
      const distance = scatter * (0.35 + depth * 0.75);
      const startX = target.x + Math.cos(angle) * distance + (seed - 0.5) * scatter * 0.45;
      const startY = target.y + Math.sin(angle) * distance + (depth - 0.9) * scatter * 0.45;
      const blend = clamp(target.x / Math.max(1, width) + (seed - 0.5) * 0.35, 0, 1);
      const color = `rgb(${base.map((channel, channelIndex) =>
        Math.round(channel + (accent[channelIndex] - channel) * blend)).join(',')})`;
      return {
        x: startX, y: startY, startX, startY,
        targetX: target.x, targetY: target.y,
        size: Math.max(1, 1.7 * (0.75 + target.alpha / 255 * 0.45)),
        color, seed, depth, delay: seed * 350
      };
    });

    gatherStart = performance.now();
    pointer.active = false;
    stop();
    resume();
  };

  const queueBuild = () => {
    if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(build);
  };

  title.addEventListener('pointermove', event => {
    const box = title.getBoundingClientRect();
    pointer.x = event.clientX - box.left;
    pointer.y = event.clientY - box.top;
    if (!pointer.active) {
      pointer.smoothX = pointer.x;
      pointer.smoothY = pointer.y;
    }
    pointer.active = true;
  }, { passive: true });
  title.addEventListener('pointerleave', () => { pointer.active = false; });
  document.addEventListener('visibilitychange', resume);
  motion.addEventListener('change', () => {
    if (motion.matches) {
      stop();
      title.classList.remove('is-ready');
    } else {
      queueBuild();
    }
  });
  compact.addEventListener('change', () => {
    if (compact.matches) {
      stop();
      title.classList.remove('is-ready');
    } else if (!motion.matches) {
      queueBuild();
    }
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      if (inView) resume(); else stop();
    }).observe(title);
  }
  if ('ResizeObserver' in window) new ResizeObserver(queueBuild).observe(title);
  if (!motion.matches && !compact.matches) {
    queueBuild();
    document.fonts?.ready.then(queueBuild).catch(() => {});
  }
})();
