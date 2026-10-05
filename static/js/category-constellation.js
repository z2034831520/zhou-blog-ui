// A small, dependency-free map of the Hugo columns. Links remain usable without JS.
(() => {
  const svgNS = 'http://www.w3.org/2000/svg';
  const known = {
    '心理学定律': [115, 105], '杂谈': [350, 82],
    'FreeRTOS': [635, 104], '操作系统': [870, 92],
    'C': [135, 275], '单片机': [365, 270],
    '计算机网络': [630, 278], 'Ubuntu': [870, 274],
    '计算机组成原理': [150, 454], 'Python': [400, 445],
    'Docker': [750, 454]
  };
  const suggestedLinks = [
    ['心理学定律', '杂谈'], ['杂谈', 'C'],
    ['C', '单片机'], ['C', '计算机组成原理'],
    ['单片机', 'FreeRTOS'], ['FreeRTOS', '操作系统'],
    ['FreeRTOS', '计算机网络'], ['计算机网络', 'Ubuntu'],
    ['Ubuntu', 'Docker'], ['Docker', 'Python']
  ];

  document.querySelectorAll('[data-constellation]').forEach(stage => {
    const nodes = [...stage.querySelectorAll('.constellation-node')];
    const svg = stage.querySelector('.constellation-lines');
    if (!nodes.length || !svg) return;

    const positions = new Map();
    let added = 0;
    nodes.forEach(node => {
      const name = node.dataset.column;
      if (known[name]) {
        positions.set(name, known[name]);
      } else {
        positions.set(name, [140 + (added % 4) * 240, 620 + Math.floor(added / 4) * 170]);
        added += 1;
      }
    });
    const height = added ? 710 + Math.floor((added - 1) / 4) * 170 : 560;
    stage.style.height = `${height}px`;
    svg.setAttribute('viewBox', `0 0 1000 ${height}`);
    svg.setAttribute('preserveAspectRatio', 'none');

    const stars = document.createElementNS(svgNS, 'g');
    stars.classList.add('constellation-background-stars');
    for (let i = 0; i < 46; i += 1) {
      const star = document.createElementNS(svgNS, 'circle');
      star.setAttribute('cx', String(25 + ((i * 233 + 89) % 950)));
      star.setAttribute('cy', String(20 + ((i * 137 + 43) % (height - 40))));
      star.setAttribute('r', i % 7 === 0 ? '1.5' : '0.8');
      stars.append(star);
    }
    svg.append(stars);

    const lines = document.createElementNS(svgNS, 'g');
    lines.classList.add('constellation-connections');
    const parent = new Map([...positions.keys()].map(name => [name, name]));
    const find = name => {
      while (parent.get(name) !== name) name = parent.get(name);
      return name;
    };
    const edges = [];
    const connect = (a, b) => {
      if (!positions.has(a) || !positions.has(b) || a === b ||
          edges.some(edge => edge.a === a && edge.b === b || edge.a === b && edge.b === a)) return;
      edges.push({ a, b });
      parent.set(find(a), find(b));
    };
    suggestedLinks.forEach(([a, b]) => connect(a, b));

    // Keep newly added columns and partial sets connected to the nearest cluster.
    const names = [...positions.keys()];
    while (names.some(name => find(name) !== find(names[0]))) {
      let closest = null;
      for (const a of names) for (const b of names) {
        if (find(a) === find(b)) continue;
        const [ax, ay] = positions.get(a);
        const [bx, by] = positions.get(b);
        const distance = (ax - bx) ** 2 + (ay - by) ** 2;
        if (!closest || distance < closest.distance) closest = { a, b, distance };
      }
      if (!closest) break;
      connect(closest.a, closest.b);
    }

    edges.forEach(({ a, b }) => {
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', positions.get(a)[0]);
      line.setAttribute('y1', positions.get(a)[1]);
      line.setAttribute('x2', positions.get(b)[0]);
      line.setAttribute('y2', positions.get(b)[1]);
      line.dataset.a = a;
      line.dataset.b = b;
      lines.append(line);
    });
    svg.append(lines);

    const setActive = name => {
      stage.classList.toggle('has-active-node', Boolean(name));
      nodes.forEach(node => node.classList.toggle('is-active', node.dataset.column === name));
      lines.querySelectorAll('line').forEach(line => {
        line.classList.toggle('is-active', line.dataset.a === name || line.dataset.b === name);
      });
    };
    nodes.forEach(node => {
      const [x, y] = positions.get(node.dataset.column);
      node.style.left = `${x / 10}%`;
      node.style.top = `${y}px`;
      node.addEventListener('pointerenter', () => setActive(node.dataset.column));
      node.addEventListener('pointerleave', () => setActive(null));
      node.addEventListener('focus', () => setActive(node.dataset.column));
      node.addEventListener('blur', () => setActive(null));
    });
    stage.classList.add('is-ready');

    // The homepage scrolls a camera from one column to the full map.
    // All stars and connections remain in the same scene throughout the zoom.
    const section = stage.closest('[data-scroll-expand]');
    const world = stage.querySelector('.constellation-world');
    if (!section || !world || nodes.length < 2) return;
    const media = window.matchMedia('(min-width: 800px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    const progressLabel = section.querySelector('.constellation-progress');
    const scrollArea = stage.closest('.constellation-scroll');
    const focusNode = nodes.find(node => node.dataset.column === '单片机') || nodes[0];
    const startScale = 3.6;
    const zoomDuration = 900;
    // The wheel is locked during zoom; only a short sticky runout is needed afterward.
    const holdDistance = 200;
    const sticky = section.querySelector('.constellation-sticky');
    const clamp = value => Math.max(0, Math.min(1, value));
    const smoothstep = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
    let expanding = false;
    let current = 0;
    let frame = 0;
    let expandedOnce = false;
    let animating = false;
    let animationStart = 0;

    const renderZoom = progress => {
      const eased = smoothstep(progress);
      const scale = Math.exp(Math.log(startScale) * (1 - eased));
      const focusX = focusNode.offsetLeft;
      const focusY = focusNode.offsetTop;
      const centerX = scrollArea.scrollLeft + scrollArea.clientWidth / 2;
      const centerY = stage.clientHeight / 2;
      const x = (1 - eased) * (centerX - focusX) - focusX * (scale - 1);
      const y = (1 - eased) * (centerY - focusY) - focusY * (scale - 1);
      world.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
      if (progressLabel) progressLabel.textContent = `${scale.toFixed(1)}×`;
    };
    const tick = now => {
      frame = 0;
      current = clamp((now - animationStart) / zoomDuration);
      renderZoom(current);
      if (current < 1) frame = requestAnimationFrame(tick);
      else {
        animating = false;
        expandedOnce = true;
      }
    };
    const isReady = () => {
      const rect = sticky.getBoundingClientRect();
      return rect.top >= -2 && rect.top <= 16 && rect.bottom <= window.innerHeight - 12;
    };
    const startZoom = () => {
      if (!expanding || animating || expandedOnce) return;
      animating = true;
      animationStart = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const onScroll = () => { if (isReady()) startZoom(); };
    const onWheel = event => {
      if (!expanding || expandedOnce) return;
      if (animating) { event.preventDefault(); return; }
      if (event.deltaY <= 0 || !isReady()) return;
      event.preventDefault();
      startZoom();
    };
    const measure = () => {
      const heading = section.querySelector('.constellation-heading');
      const headingHeight = heading.getBoundingClientRect().height +
        parseFloat(getComputedStyle(heading).marginBottom || 0);
      section.style.minHeight = `${headingHeight + sticky.getBoundingClientRect().height + holdDistance}px`;
    };
    const enable = () => {
      if (expanding) return;
      expanding = true;
      measure();
      current = expandedOnce ? 1 : 0;
      renderZoom(current);
      section.classList.add('is-expanding');
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('resize', measure, { passive: true });
      scrollArea.addEventListener('scroll', onPan, { passive: true });
      onScroll();
    };
    const disable = () => {
      if (!expanding) return;
      expanding = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      animating = false;
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', measure);
      scrollArea.removeEventListener('scroll', onPan);
      section.classList.remove('is-expanding');
      section.style.removeProperty('min-height');
      world.style.removeProperty('transform');
      if (progressLabel) progressLabel.textContent = '';
    };
    const onPan = () => { if (expanding) renderZoom(current); };
    const sync = () => {
      const fits = section.querySelector('.constellation-sticky').getBoundingClientRect().height <= window.innerHeight - 24;
      if (media.matches && fits) enable(); else disable();
    };
    media.addEventListener('change', sync);
    window.addEventListener('resize', sync, { passive: true });
    sync();
  });
})();
