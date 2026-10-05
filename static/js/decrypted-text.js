// A native adaptation of React Bits DecryptedText for the homepage's two-line quote.
(() => {
  const quote = document.querySelector('[data-decrypted-sequence]');
  const visual = quote?.querySelector('[data-decrypted-text]');
  if (!visual || !('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const original = visual.textContent;
  const characters = Array.from(original);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const letterPositions = characters.map((character, index) =>
    /[A-Za-z]/.test(character) ? index : -1
  ).filter(index => index >= 0);
  const revealOrder = new Map(letterPositions.map((index, order) => [index, order]));
  let timer;

  const render = revealed => {
    visual.textContent = characters.map((character, index) => {
      const order = revealOrder.get(index);
      if (order === undefined || order < revealed) return character;
      return alphabet[Math.floor(Math.random() * alphabet.length)];
    }).join('');
  };

  const finish = () => {
    if (timer) window.clearInterval(timer);
    timer = undefined;
    visual.textContent = original;
    quote.classList.remove('is-waiting');
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };

  function onVisibilityChange() {
    if (document.hidden) finish();
  }

  quote.classList.add('is-waiting');
  render(0);

  const start = () => {
    let revealed = 0;
    document.addEventListener('visibilitychange', onVisibilityChange);
    timer = window.setInterval(() => {
      revealed += 1;
      if (revealed >= letterPositions.length) finish();
      else render(revealed);
    }, 85);
  };

  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    start();
  }, { threshold: 0.45 });
  observer.observe(quote);
})();
