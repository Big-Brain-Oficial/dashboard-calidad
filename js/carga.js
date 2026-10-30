// Pestaña 2: sprints importados desde Excel y/o cargados a mano, guardados en el localStorage del navegador
const STORAGE_KEY = 'dashboard-calidad:sprints';

const GRUPOS_FORM = [
  { titulo: 'Completitud funcional', campos: ['USE', 'USAC'] },
  { titulo: 'Corrección funcional', campos: ['USVF', 'USCAF'] },
  { titulo: 'Analizabilidad', campos: ['DEFE', 'DEFT'] },
  { titulo: 'Modificabilidad', campos: ['USM', 'USMD'] },
];
const CAMPOS_SPTH = ['SPTH1', 'SPTH2', 'SPTH3', 'SPTH4', 'SPTH5'];

function leerSprints() {
  try {
    const sprints = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(sprints) ? sprints : [];
  } catch {
    return [];
  }
}

function guardarSprints(sprints) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sprints));
  } catch (err) {
    console.error('No se pudo guardar en localStorage', err);
  }
}

function construirFormulario(form) {
  const campo = (nombre, ayuda, extra = '') => `
    <label class="campo">
      <span><b>${nombre}</b> <small>${ayuda}</small></span>
      <input name="${nombre}" type="number" min="0" required ${extra} />
    </label>`;

  form.querySelector('.grupos').innerHTML =
    GRUPOS_FORM.map(({ titulo, campos }) => `
      <fieldset>
        <legend>${titulo}</legend>
        ${campos.map((c) => campo(c, VARIABLES[c], 'step="1"')).join('')}
      </fieldset>`).join('') +
    `<fieldset class="spth">
      <legend>Velocidad</legend>
      <div class="fila-spth">${campo('SPT', VARIABLES.SPT, 'step="any"')}</div>
      <p class="ayuda"><b>SPTH</b>: ${VARIABLES.SPTH}. Se completan solos con los sprints que ya cargaste.</p>
      <div class="fila-spth">${CAMPOS_SPTH.map((c, i) => campo(c, `Sprint −${5 - i}`, 'step="any"')).join('')}</div>
    </fieldset>`;
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
    fila.innerHTML = `<td>${esc(s.sprint)}</td>${CAMPOS_DIRECTOS.map((c) => `<td>${esc(s[c])}</td>`).join('')}<td></td>`;
    const borrar = document.createElement('button');
    borrar.type = 'button';
    borrar.className = 'link-peligro';
    borrar.textContent = 'Eliminar';
    borrar.addEventListener('click', () => {
      sprints.splice(i, 1);
      guardarSprints(sprints);
      renderCarga();
    });
    fila.lastElementChild.appendChild(borrar);
    tbody.appendChild(fila);
  });
  document.getElementById('cargados').hidden = !sprints.length;
  renderDashboard(document.getElementById('dashboard-carga'), { sprints });
}

function iniciarCarga() {
  const form = document.getElementById('form-sprint');
  const errores = document.getElementById('errores-form');
  construirFormulario(form);
  document.querySelector('#tabla-cargados thead tr').innerHTML =
    `<th>Sprint</th>${CAMPOS_DIRECTOS.map((c) => `<th title="${VARIABLES[c]}">${c}</th>`).join('')}<th></th>`;

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
  });

  document.getElementById('exportar').addEventListener('click', () =>
    descargarExcel(leerSprints(), 'sprints.xlsx').catch((err) => alert(err.message)));

  document.getElementById('plantilla').addEventListener('click', () =>
    descargarExcel([], 'plantilla-sprints.xlsx').catch((err) => alert(err.message)));

  document.getElementById('importar').addEventListener('change', async (e) => {
    const archivo = e.target.files[0];
    e.target.value = '';
    if (!archivo) return;
    const estado = document.getElementById('estado-excel');
    estado.className = 'ayuda';
    estado.textContent = 'Leyendo el archivo…';
    try {
      const { sprints, errores } = await leerExcel(archivo);
      if (errores.length) {
        estado.className = 'error';
        estado.innerHTML = `<b>No se importó: el archivo tiene errores.</b><ul>${errores
          .map((err) => `<li>${esc(err)}</li>`)
          .join('')}</ul>`;
        return;
      }
      const actuales = leerSprints().length;
      if (actuales && !confirm(`Ya hay ${actuales} sprints cargados. ¿Reemplazarlos por los ${sprints.length} del Excel?`)) {
        estado.textContent = '';
        return;
      }
      guardarSprints(sprints);
      sugerirSiguiente(form, sprints);
      renderCarga();
      estado.textContent = `Se importaron ${sprints.length} sprints desde "${archivo.name}". Los que cargues ahora se agregan a continuación.`;
    } catch (err) {
      estado.className = 'error';
      estado.textContent = `No se pudo leer el archivo: ${err.message}`;
      console.error(err);
    }
  });

  document.getElementById('limpiar').addEventListener('click', () => {
    if (confirm('¿Borrar todos los sprints cargados?')) {
      guardarSprints([]);
      sugerirSiguiente(form, []);
      renderCarga();
    }
  });

  sugerirSiguiente(form, leerSprints());
  renderCarga();
}
