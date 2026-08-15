import { qs } from './dom.js';

const TRANSFORM_ORIGIN = '50% 400px';

export function angleForIndex(index, total) {
  const angleIncrement = 360 / Math.max(total, 1);
  return index * angleIncrement - 90;
}

export function extraerPlantasDelDom(root) {
  const entries = Array.from(root.querySelectorAll('.catalog-entry'));
  const plantas = [];
  for (const entry of entries) {
    const nombreEl = entry.querySelector('.catalog-tile-name');
    const addBtn = entry.querySelector('.catalog-add[data-imagen]');
    const imagen = addBtn?.dataset?.imagen;
    if (!nombreEl || !addBtn || !imagen) continue;
    plantas.push({ nombre: nombreEl.textContent, imagen, dataset: { ...addBtn.dataset } });
  }
  return plantas;
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function crearItem(planta) {
  const item = document.createElement('div');
  item.className = 'catalog-gallery-3d-item';

  const img = document.createElement('img');
  img.src = planta.imagen;
  img.alt = planta.nombre;
  img.loading = 'lazy';
  item.appendChild(img);

  return item;
}

function aplicarPlantaAlBoton(btn, planta) {
  Object.entries(planta.dataset).forEach(([key, value]) => {
    btn.dataset[key] = value;
  });
}

function buildGallery3D(container, onSeleccion) {
  const ring = qs('.catalog-gallery-3d-ring', container);
  const previewImg = qs('.catalog-gallery-3d-preview img', container);
  const addBtn = qs('.catalog-add--gallery3d', container);
  if (!ring || ring.childElementCount > 0) return; // ya construido

  const plantas = extraerPlantasDelDom(document);
  if (plantas.length === 0) return;

  const items = plantas.map((planta) => {
    const item = crearItem(planta);
    ring.appendChild(item);
    return item;
  });

  const total = items.length;
  const reduced = prefersReducedMotion();
  const gsap = window.gsap;
  let seleccionada = null;

  function mostrarPreview(planta) {
    if (previewImg) previewImg.src = planta.imagen;
    if (addBtn) {
      aplicarPlantaAlBoton(addBtn, planta);
      addBtn.hidden = false;
      onSeleccion?.(addBtn);
    }
  }

  items.forEach((item, index) => {
    const planta = plantas[index];
    const angle = angleForIndex(index, total);
    if (gsap && !reduced) {
      gsap.set(item, { rotationY: 90, rotationZ: angle, transformOrigin: TRANSFORM_ORIGIN });
    } else {
      item.style.transform = `rotateZ(${angle}deg) rotateY(90deg)`;
      item.style.transformOrigin = TRANSFORM_ORIGIN;
    }

    item.addEventListener('mouseover', () => {
      if (previewImg) previewImg.src = planta.imagen;
      if (gsap && !reduced) {
        gsap.to(item, { x: 10, y: 10, z: 10, ease: 'power2.out', duration: 0.5 });
      }
    });

    item.addEventListener('mouseout', () => {
      if (previewImg) previewImg.src = seleccionada ? seleccionada.imagen : plantas[0].imagen;
      if (gsap && !reduced) {
        gsap.to(item, { x: 0, y: 0, z: 0, ease: 'power2.out', duration: 0.5 });
      }
    });

    item.addEventListener('click', () => {
      seleccionada = planta;
      mostrarPreview(planta);
    });
  });

  if (previewImg) previewImg.src = plantas[0].imagen;

  if (!gsap || reduced) return;

  const ScrollTrigger = window.ScrollTrigger;
  if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  const stage = qs('.catalog-gallery-3d-stage', container);
  container.addEventListener('mousemove', (event) => {
    const rect = stage.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const percentX = (event.clientX - centerX) / (rect.width / 2);
    const percentY = (event.clientY - centerY) / (rect.height / 2);

    gsap.to(ring, {
      duration: 1,
      ease: 'power2.out',
      rotateX: 55 + percentY * 2,
      rotateY: percentX * 2,
      overwrite: 'auto',
    });
  });

  if (ScrollTrigger) {
    ScrollTrigger.create({
      trigger: container,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 2,
      onUpdate: (self) => {
        const rotationProgress = self.progress * 360;
        items.forEach((item, index) => {
          const currentAngle = angleForIndex(index, total) + rotationProgress;
          gsap.to(item, {
            rotationZ: currentAngle,
            duration: 1,
            ease: 'power3.out',
            overwrite: 'auto',
          });
        });
      },
    });
  }
}

function updateGalleryTopOffset() {
  const header = qs('.catalog-header');
  if (!header) return;
  const top = header.getBoundingClientRect().bottom;
  document.documentElement.style.setProperty('--gallery-3d-top', `${Math.max(top, 0)}px`);
}

export function wireCatalogGallery3D({ onSeleccion } = {}) {
  const container = qs('#catalog-gallery-3d');
  let onResize = null;

  return {
    activar() {
      if (!container) return;
      container.hidden = false;
      buildGallery3D(container, onSeleccion);
      updateGalleryTopOffset();
      onResize = () => updateGalleryTopOffset();
      window.addEventListener('resize', onResize);
      window.ScrollTrigger?.refresh();
    },
    desactivar() {
      if (!container) return;
      container.hidden = true;
      if (onResize) {
        window.removeEventListener('resize', onResize);
        onResize = null;
      }
    },
  };
}
