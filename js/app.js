// Navegación entre pestañas usando el hash de la URL (#precargados / #carga)
const TAB_DEFAULT = 'precargados';
const TABS = [...document.querySelectorAll('.tab')].map((tab) => tab.dataset.tab);

function mostrarTab(nombre) {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.setAttribute('aria-selected', tab.dataset.tab === nombre);
  });
  document.querySelectorAll('.panel').forEach((panel) => {
    panel.hidden = panel.id !== `panel-${nombre}`;
  });
}

function tabActual() {
  const hash = location.hash.slice(1);
  return TABS.includes(hash) ? hash : TAB_DEFAULT;
}

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => { location.hash = tab.dataset.tab; });
});

window.addEventListener('hashchange', () => mostrarTab(tabActual()));
mostrarTab(tabActual());

iniciarPrecargados();
iniciarCarga();
