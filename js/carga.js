// Carga de sprints: se guardan en el localStorage del navegador.
// La primera vez se inicializa con la base de data/carga-base.json (6 sprints del dataset del equipo).
const STORAGE_KEY = 'dashboard-calidad:sprints';
const URL_BASE = 'data/carga-base.json';

const GRUPOS_FORM = GRUPOS_VARIABLES.filter((g) => g.clave !== 'velocidad');
const CAMPOS_SPTH = ['SPTH1', 'SPTH2', 'SPTH3', 'SPTH4', 'SPTH5'];

function leerSprints() {
  try {
    const sprints = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(sprints) ? sprints : [];
  } catch {
    return [];
  }
}

async function leerBase() {
  const resp = await fetch(URL_BASE, { cache: 'no-cache' });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return (await resp.json()).sprints;
}

function guardarSprints(sprints) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sprints));
  } catch (err) {
    console.error('No se pudo guardar en localStorage', err);
  }
}

function construirFormulario(form) {
  const campo = (nombre, etiqueta, extra = '') => `
    <label class="campo">
      <span class="campo-cabeza"><span class="codigo">${nombre}</span>${info(VARIABLES[nombre])}</span>
      <span class="campo-nombre">${etiqueta}</span>
      <input name="${nombre}" type="number" min="0" inputmode="decimal" required ${extra} />
    </label>`;

  const grupo = (clave, titulo, icono, contenido) => `
    <fieldset class="grupo dim-${clave}">
      <legend><span class="dim-icono">${icono}</span>${titulo}</legend>
      ${contenido}
    </fieldset>`;

  form.querySelector('.grupos').innerHTML =
    GRUPOS_FORM.map(({ clave, nombre, icono, variables }) =>
      grupo(clave, nombre, icono, `<div class="campos">${variables.map((c) => campo(c, ETIQUETAS[c], 'step="1"')).join('')}</div>`),
    ).join('') +
    grupo('velocidad', 'Velocidad', '↗', `
      <div class="campos">${campo('SPT', ETIQUETAS.SPT, 'step="any"')}</div>
      <p class="campo-label subtitulo">Story points de los 5 sprints anteriores ${info(`${VARIABLES.SPTH}. Se completan solos con los sprints ya cargados.`)}</p>
      <div class="campos campos-spth">${CAMPOS_SPTH.map((c, i) => `
        <label class="campo">
          <span class="campo-label"><span class="codigo">−${5 - i}</span></span>
          <input name="${c}" type="number" min="0" inputmode="decimal" step="any" required aria-label="Story points del sprint −${5 - i}" />
        </label>`).join('')}</div>`);
}

function leerFormulario(form) {
  const datos = new FormData(form);
  const sprint = { sprint: datos.get('sprint').trim() };
  CAMPOS_DIRECTOS.forEach((c) => { sprint[c] = Number(datos.get(c)); });
  sprint.SPTH = CAMPOS_SPTH.map((c) => Number(datos.get(c)));
  return sprint;
}

// Prellena el nombre y los SPTH a partir del último sprint cargado
function sugerirSiguiente(form, sprints) {
  // "Sprint 14" → "Sprint 15"; si el nombre no termina en número, se numera por posición
  const numerado = sprints.at(-1)?.sprint.match(/^(.*?)(\d+)\s*$/);
  form.elements.sprint.value = numerado
    ? `${numerado[1]}${Number(numerado[2]) + 1}`
    : `Sprint ${sprints.length + 1}`;
  const ultimo = completarHistorial({ sprints }).at(-1);
  if (!ultimo) return;
  const historial = [...(ultimo.SPTH ?? []), ultimo.SPT].slice(-5);
  CAMPOS_SPTH.forEach((c, i) => { form.elements[c].value = historial[i] ?? ''; });
}

function renderCarga() {
  const sprints = leerSprints();
  const tbody = document.querySelector('#tabla-cargados tbody');
  tbody.innerHTML = '';
  sprints.forEach((s, i) => {
    const fila = document.createElement('tr');
    fila.innerHTML = `<td><b>${esc(s.sprint)}</b></td>${CAMPOS_DIRECTOS.map((c) => `<td class="num">${esc(s[c])}</td>`).join('')}<td></td>`;
    const borrar = document.createElement('button');
    borrar.type = 'button';
    borrar.className = 'boton-icono';
    borrar.textContent = '✕';
    borrar.setAttribute('aria-label', `Eliminar ${s.sprint}`);
    borrar.title = 'Eliminar';
    borrar.addEventListener('click', () => {
      sprints.splice(i, 1);
      guardarSprints(sprints);
      renderCarga();
    });
    fila.lastElementChild.appendChild(borrar);
    tbody.appendChild(fila);
  });
  document.getElementById('cargados').hidden = !sprints.length;
  document.getElementById('fuente-carga').textContent =
    sprints.length === 1 ? '1 sprint cargado' : `${sprints.length} sprints cargados`;
  renderDashboard(document.getElementById('dashboard-carga'), { sprints });
}

async function iniciarCarga() {
  const form = document.getElementById('form-sprint');
  const errores = document.getElementById('errores-form');
  const boton = form.querySelector('[type="submit"]');
  construirFormulario(form);
  document.querySelector('#tabla-cargados thead tr').innerHTML =
    `<th>Sprint</th>${CAMPOS_DIRECTOS.map((c) => `<th class="num"${tip(VARIABLES[c])}>${c}</th>`).join('')}<th></th>`;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const sprint = leerFormulario(form);
    const problemas = validarSprint(sprint);
    errores.innerHTML = problemas.map((p) => `<li>${esc(p)}</li>`).join('');
    errores.hidden = !problemas.length;
    if (problemas.length) return;

    const sprints = leerSprints();
    sprints.push(sprint);
    guardarSprints(sprints);
    form.reset();
    sugerirSiguiente(form, sprints);
    renderCarga();
    boton.classList.add('exito');
    setTimeout(() => boton.classList.remove('exito'), 1200);
  });

  document.getElementById('limpiar').addEventListener('click', () => {
    if (confirm('¿Borrar todos los sprints cargados?')) {
      guardarSprints([]);
      sugerirSiguiente(form, []);
      renderCarga();
    }
  });

  document.getElementById('restaurar').addEventListener('click', async () => {
    if (!confirm('¿Reemplazar los sprints cargados por los 6 sprints de la base?')) return;
    try {
      const base = await leerBase();
      guardarSprints(base);
      sugerirSiguiente(form, base);
      renderCarga();
    } catch (err) {
      alert('No se pudo leer la base de datos.');
      console.error(err);
    }
  });

  // Primera visita en este navegador: se arranca con la base
  if (localStorage.getItem(STORAGE_KEY) === null) {
    try {
      guardarSprints(await leerBase());
    } catch (err) {
      console.error('No se pudo cargar la base', err);
    }
  }

  sugerirSiguiente(form, leerSprints());
  renderCarga();
}
