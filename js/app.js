// Navegación lateral: la sección visible (vista) se refleja en el hash (#vista)
const VISTAS = {
  cargar: { titulo: 'Cargar sprint', sub: 'Ingresá las métricas directas de un sprint' },
  resumen: { titulo: 'Resumen', sub: 'La respuesta del modelo, de un vistazo' },
  sprints: { titulo: 'Sprints', sub: 'Los indicadores de cada sprint, uno al lado del otro' },
  detalle: { titulo: 'Detalle del sprint', sub: 'Cómo le fue a un sprint en cada dimensión' },
  glosario: { titulo: 'Glosario y reglas', sub: 'Qué significa cada variable y cómo se evalúa' },
};

function aplicarNavegacion() {
  // Se toma el último segmento para seguir aceptando enlaces viejos como #carga/resumen
  const pedida = location.hash.slice(1).split('/').at(-1);
  const vista = VISTAS[pedida] ? pedida : 'resumen';

  document.body.dataset.vista = vista;
  document.querySelectorAll('.nav-item').forEach((b) => b.setAttribute('aria-current', b.dataset.vista === vista ? 'page' : 'false'));
  document.getElementById('topbar-titulo').textContent = VISTAS[vista].titulo;
  document.getElementById('topbar-sub').textContent = VISTAS[vista].sub;
  window.scrollTo({ top: 0 });
}

function navegar({ vista }) {
  if (location.hash === `#${vista}`) aplicarNavegacion();
  else location.hash = vista;
}

document.querySelectorAll('.nav-item').forEach((b) => {
  b.addEventListener('click', () => navegar({ vista: b.dataset.vista }));
});
window.addEventListener('hashchange', aplicarNavegacion);

// Tooltips para cualquier elemento con data-tip (hover, foco o toque)
const globo = document.createElement('div');
globo.className = 'globo';
globo.setAttribute('role', 'tooltip');
globo.hidden = true;
document.body.appendChild(globo);

function mostrarGlobo(el) {
  globo.textContent = el.dataset.tip;
  globo.hidden = false;
  const r = el.getBoundingClientRect();
  const g = globo.getBoundingClientRect();
  const left = Math.min(Math.max(8, r.left + r.width / 2 - g.width / 2), window.innerWidth - g.width - 8);
  const arriba = r.top - g.height - 8;
  globo.style.left = `${left}px`;
  globo.style.top = `${arriba < 8 ? r.bottom + 8 : arriba}px`;
}

document.addEventListener('mouseover', (e) => {
  const el = e.target.closest('[data-tip]');
  if (el) mostrarGlobo(el);
  else globo.hidden = true;
});
document.addEventListener('focusin', (e) => {
  const el = e.target.closest('[data-tip]');
  if (el) mostrarGlobo(el);
});
document.addEventListener('focusout', () => { globo.hidden = true; });
window.addEventListener('scroll', () => { globo.hidden = true; }, { passive: true });

if (window.Chart) Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;

iniciarCarga();
aplicarNavegacion();
