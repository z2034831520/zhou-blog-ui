// Adapted from React Bits SpotlightCard; the Hugo article cards remain links.
// Copyright (c) 2026 David Haz; MIT + Commons Clause.
// See /licenses/React-Bits-LICENSE.txt.
(() => {
  const spotlightEnabled = window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (spotlightEnabled) {
    document.querySelectorAll('.post-card').forEach(card => {
      card.addEventListener('pointermove', event => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
        card.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
      }, { passive: true });
    });
  }

  document.querySelectorAll('.post-carousel').forEach(track => {
    track.addEventListener('wheel', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey ||
          Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;

      const maxScroll = track.scrollWidth - track.clientWidth;
      if (maxScroll <= 1) return;

      const unit = event.deltaMode === 1 ? 24 : event.deltaMode === 2 ? track.clientWidth : 1;
      const next = Math.max(0, Math.min(maxScroll, track.scrollLeft + event.deltaY * unit));
      if (Math.abs(next - track.scrollLeft) < 0.5) return;

      event.preventDefault();
      track.scrollLeft = next;
    }, { passive: false });
  });
})();
