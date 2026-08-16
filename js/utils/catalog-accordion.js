export function esDesktopConHover() {
  return window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;
}

export function wireCatalogAccordion(root) {
  if (!root) return;

  function closeAll(except = null) {
    root.querySelectorAll('.catalog-entry.is-open').forEach((entry) => {
      if (entry === except) return;
      entry.classList.remove('is-open');
      const row = entry.querySelector('.catalog-row');
      if (row) row.setAttribute('aria-expanded', 'false');
    });
  }

  function openEntry(entry) {
    const row = entry.querySelector('.catalog-row');
    if (!row || entry.classList.contains('is-open')) return;
    closeAll();
    entry.classList.add('is-open');
    row.setAttribute('aria-expanded', 'true');
  }

  function closeEntry(entry) {
    const row = entry.querySelector('.catalog-row');
    if (!row) return;
    entry.classList.remove('is-open');
    row.setAttribute('aria-expanded', 'false');
  }

  function toggleEntry(entry) {
    if (entry.classList.contains('is-open')) closeEntry(entry);
    else openEntry(entry);
  }

  function estaEnVistaAplicable() {
    const view = document.querySelector('.catalog-page')?.dataset.view;
    return view !== '2' && view !== '3';
  }

  root.addEventListener('click', (event) => {
    if (event.target.closest('.catalog-add')) return;
    if (!estaEnVistaAplicable()) return;
    if (esDesktopConHover()) return; // en desktop el hover ya se encarga
    const entry = event.target.closest('.catalog-entry');
    if (!entry || !root.contains(entry)) return;
    toggleEntry(entry);
  });

  root.querySelectorAll('.catalog-entry').forEach((entry) => {
    entry.addEventListener('mouseenter', () => {
      if (!esDesktopConHover() || !estaEnVistaAplicable()) return;
      openEntry(entry);
    });

    entry.addEventListener('mouseleave', () => {
      if (!esDesktopConHover() || !estaEnVistaAplicable()) return;
      closeEntry(entry);
    });
  });

  root.addEventListener('keydown', (event) => {
    if (event.target.closest('.catalog-add')) return;
    if (!estaEnVistaAplicable()) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const entry = event.target.closest('.catalog-entry');
    const row = event.target.closest('.catalog-row');
    if (!entry || !row || !root.contains(entry)) return;
    event.preventDefault();
    toggleEntry(entry);
  });
}
