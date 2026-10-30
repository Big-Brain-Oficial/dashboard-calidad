// Navegación lateral: origen de datos (modo) + sección (vista), reflejados en el hash (#modo/vista)
const MODOS = {
  precargados: 'Datos precargados',
  carga: 'Carga manual',
};
const VISTAS = {
  cargar: { titulo: 'Cargar sprint', sub: 'Ingresá las métricas directas de un sprint' },
  resumen: { titulo: 'Resumen', sub: 'La respuesta del modelo, de un vistazo' },
  sprints: { titulo: 'Sprints', sub: 'Los indicadores de cada sprint, uno al lado del otro' },
  detalle: { titulo: 'Detalle del sprint', sub: 'Cómo le fue a un sprint en cada dimensión' },
  glosario: { titulo: 'Glosario y reglas', sub: 'Qué significa cada variable y cómo se evalúa' },
};

function estadoDesdeHash() {
  const [modo, vista] = location.hash.slice(1).split('/');
  return {
    modo: MODOS[modo] ? modo : 'precargados',
    vista: VISTAS[vista] ? vista : null,
  };
}

function aplicarNavegacion() {
  let { modo, vista } = estadoDesdeHash();
  if (!vista) vista = 'resumen';
  if (vista === 'cargar' && modo !== 'carga') vista = 'resumen';

  document.body.dataset.modo = modo;
  document.body.dataset.vista = vista;
  document.querySelectorAll('.modo').forEach((b) => b.setAttribute('aria-selected', b.dataset.modo === modo));
  document.querySelectorAll('.nav-item').forEach((b) => b.setAttribute('aria-current', b.dataset.vista === vista ? 'page' : 'false'));
  document.getElementById('topbar-modo').textContent = MODOS[modo];
  document.getElementById('topbar-titulo').textContent = VISTAS[vista].titulo;
  document.getElementById('topbar-sub').textContent = VISTAS[vista].sub;
  window.scrollTo({ top: 0 });
}

// Cambia modo y/o vista conservando lo que no se indique
function navegar({ modo = document.body.dataset.modo, vista = document.body.dataset.vista }) {
  const destino = `#${modo}/${vista}`;
  if (location.hash === destino) aplicarNavegacion();
  else location.hash = destino;
}

document.querySelectorAll('.modo').forEach((b) => {
  b.addEventListener('click', () => {
    const vistaActual = document.body.dataset.vista;
    navegar({ modo: b.dataset.modo, vista: vistaActual === 'cargar' ? 'resumen' : vistaActual });
  });
});
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

iniciarPrecargados();
iniciarCarga();
aplicarNavegacion();
