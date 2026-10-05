// Reveal article columns as they enter view; content remains visible without JS.
(() => {
  const sections = document.querySelectorAll('[data-article-reveal]');
  if (!sections.length || !('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });

  document.documentElement.classList.add('article-reveal-ready');
  sections.forEach(section => observer.observe(section));
})();
