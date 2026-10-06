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

    // Wheel input over the map moves the camera; page scrolling alone never starts it.
    // All stars and connections remain in the same scene throughout the zoom.
    const section = stage.closest('[data-scroll-expand]');
    const world = stage.querySelector('.constellation-world');
    if (!section || !world || nodes.length < 2) return;
    const media = window.matchMedia('(min-width: 800px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    const progressLabel = section.querySelector('.constellation-progress');
    const scrollArea = stage.closest('.constellation-scroll');
    const focusNode = nodes.find(node => node.dataset.column === '单片机') || nodes[0];
    const startScale = 3.6;
    const wheelDistance = 600;
    const scrollHint = section.querySelector('.constellation-scroll-hint');
    const initialHint = scrollHint?.textContent;
    const initialAriaLabel = scrollArea.getAttribute('aria-label');
    const clamp = value => Math.max(0, Math.min(1, value));
    let expanding = false;
    let current = 0;
    let expandedOnce = false;

    const renderZoom = progress => {
      current = clamp(progress);
      const scale = Math.exp(Math.log(startScale) * (1 - current));
      const focusX = focusNode.offsetLeft;
      const focusY = focusNode.offsetTop;
      const centerX = scrollArea.scrollLeft + scrollArea.clientWidth / 2;
      const centerY = stage.clientHeight / 2;
      const x = (1 - current) * (centerX - focusX) - focusX * (scale - 1);
      const y = (1 - current) * (centerY - focusY) - focusY * (scale - 1);
      world.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
      if (progressLabel) progressLabel.textContent = `${scale.toFixed(1)}×`;
    };
    const finishZoom = () => {
      expandedOnce = true;
      renderZoom(1);
      if (scrollHint) scrollHint.textContent = ' · 已展开全图，继续滚动浏览';
    };
    const onWheel = event => {
      if (!expanding || expandedOnce) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      const distance = event.deltaY * unit;
      if (!distance || (distance < 0 && current === 0)) return;
      event.preventDefault();
      const next = clamp(current + distance / wheelDistance);
      if (next === 1) finishZoom(); else renderZoom(next);
    };
    const onKeydown = event => {
      if (!expanding || expandedOnce || event.target !== scrollArea) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      finishZoom();
    };
    const onPan = () => { if (expanding) renderZoom(current); };
    const enable = () => {
      if (expanding) return;
      expanding = true;
      renderZoom(expandedOnce ? 1 : current);
      section.classList.add('is-expanding');
      scrollArea.setAttribute('aria-label', '专栏星图，可左右滚动；按回车或空格展开全图');
      scrollArea.addEventListener('wheel', onWheel, { passive: false });
      scrollArea.addEventListener('keydown', onKeydown);
      scrollArea.addEventListener('scroll', onPan, { passive: true });
    };
    const disable = () => {
      if (!expanding) return;
      expanding = false;
      scrollArea.removeEventListener('wheel', onWheel);
      scrollArea.removeEventListener('keydown', onKeydown);
      scrollArea.removeEventListener('scroll', onPan);
      section.classList.remove('is-expanding');
      scrollArea.setAttribute('aria-label', initialAriaLabel);
      world.style.removeProperty('transform');
      if (progressLabel) progressLabel.textContent = '';
    };
    const sync = () => {
      const fits = section.querySelector('.constellation-sticky').getBoundingClientRect().height <= window.innerHeight - 24;
      if (media.matches && fits) {
        enable();
        if (scrollHint) scrollHint.textContent = expandedOnce ? ' · 已展开全图，继续滚动浏览' : initialHint;
      } else disable();
    };
    media.addEventListener('change', sync);
    window.addEventListener('resize', sync, { passive: true });
    sync();
  });
})();
