export function wireCatalogAccordion(root) {
  if (!root) return;

  function closeAll(except = null) {
    root.querySelectorAll('.catalog-entry.is-open').forEach((entry) => {
      if (entry === except) return;
      entry.classList.remove('is-open');
      const row = entry.querySelector('.catalog-row');
      const panel = entry.querySelector('.catalog-accordion');
      if (row) row.setAttribute('aria-expanded', 'false');
      if (panel) panel.hidden = true;
    });
  }

  function toggleEntry(entry) {
    const row = entry.querySelector('.catalog-row');
    const panel = entry.querySelector('.catalog-accordion');
    if (!row || !panel) return;

    const willOpen = !entry.classList.contains('is-open');
    closeAll();
    if (willOpen) {
      entry.classList.add('is-open');
      row.setAttribute('aria-expanded', 'true');
      panel.hidden = false;
    }
  }

  root.addEventListener('click', (event) => {
    if (event.target.closest('.catalog-add')) return;
    const view = document.querySelector('.catalog-page')?.dataset.view;
    if (view === '2' || view === '3') return;
    const entry = event.target.closest('.catalog-entry');
    if (!entry || !root.contains(entry)) return;
    toggleEntry(entry);
  });

  root.addEventListener('keydown', (event) => {
    if (event.target.closest('.catalog-add')) return;
    const view = document.querySelector('.catalog-page')?.dataset.view;
    if (view === '2' || view === '3') return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const entry = event.target.closest('.catalog-entry');
    const row = event.target.closest('.catalog-row');
    if (!entry || !row || !root.contains(entry)) return;
    event.preventDefault();
    toggleEntry(entry);
  });
}
