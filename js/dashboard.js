// Renderiza el dashboard completo (usado por ambas pestañas) a partir de un dataset

// Cada resultado se muestra como "chip" con ícono + texto; el color nunca va solo
const ESTADO = {
  Satisfactorio: 'ok', Alta: 'ok', 'Concordancia alta': 'ok',
  Adecuado: 'bien', Adecuada: 'bien', 'Concordancia adecuada': 'bien', 'Calidad sostenida': 'bien',
  Atención: 'alerta', 'En atención': 'alerta', 'Desajuste de calidad': 'alerta',
  Insuficiente: 'critico', Baja: 'critico', 'Desempeño en alerta': 'critico',
};
const ESTADO_VEREDICTO = { Adecuado: 'ok', 'En atención': 'alerta', 'No adecuado': 'critico' };
const ICONO = { ok: '✓', bien: '✓', alerta: '!', critico: '✕', neutro: '', na: '–' };
const ICONO_VELOCIDAD = { Alta: '↑', Promedio: '→', Baja: '↓' };
const ORDEN_CALIDAD = ['Alta', 'Adecuada', 'En atención', 'Baja'];

const esc = (texto) =>
  String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function chip(texto, estado = ESTADO[texto]) {
  if (!texto) return '<span class="chip na">– Sin datos</span>';
  return `<span class="chip ${estado}">${ICONO[estado]} ${esc(texto)}</span>`;
}

function chipVelocidad(nivel) {
  if (!nivel) return '<span class="chip na">– Sin historial</span>';
  return `<span class="chip neutro">${ICONO_VELOCIDAD[nivel]} ${nivel}</span>`;
}

const sp = (v) => `${formatoNumero(v)} SP`;
const signo = (v) => (v > 0 ? '+' : '') + formatoNumero(v);

function variablesHtml(pares) {
  return `<ul class="variables">${pares
    .map(([clave, valor]) => `<li><b>${clave}${valor === undefined ? '' : ` = ${esc(valor)}`}</b>: ${VARIABLES[clave]}</li>`)
    .join('')}</ul>`;
}

const graficosPorRaiz = new WeakMap();

function renderDashboard(raiz, datos) {
  graficosPorRaiz.get(raiz)?.destroy();
  const sprints = evaluarSprints(datos);
  if (!sprints.length) {
    raiz.innerHTML = '<p class="card vacio">Todavía no hay sprints cargados.</p>';
    return;
  }
  raiz.replaceChildren(document.getElementById('tpl-dashboard').content.cloneNode(true));
  const $ = (sel) => raiz.querySelector(sel);

  renderRespuesta($('.respuesta'), resumir(sprints));
  graficosPorRaiz.set(raiz, renderGraficoSprints($('.grafico canvas'), $('.leyenda'), sprints));

  const filas = sprints.map((s, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><b>${esc(s.sprint)}</b></td>
      <td>${chipVelocidad(s.velocidad)} <span class="sub">${sp(s.SPT)}${s.vvr === null ? '' : ` (${signo(s.vvr)})`}</span></td>
      <td>${chip(s.calidad)}</td>
      <td>${chip(s.relacion)}</td>`;
    tr.addEventListener('click', () => seleccionar(i));
    $('.tabla-sprints tbody').appendChild(tr);
    return tr;
  });

  const selector = $('.selector-sprint');
  sprints.forEach((s, i) => selector.add(new Option(s.sprint, i)));
  selector.addEventListener('change', () => seleccionar(Number(selector.value)));

  function seleccionar(i) {
    selector.value = i;
    filas.forEach((tr, j) => tr.classList.toggle('seleccionada', i === j));
    renderDetalle($('.detalle'), sprints[i]);
  }
  seleccionar(sprints.length - 1);

  $('.glosario dl').innerHTML = Object.entries(VARIABLES)
    .map(([clave, texto]) => `<dt>${clave}</dt><dd>${texto}</dd>`)
    .join('');
}

function renderRespuesta(el, { total, altas, porcentaje, veredicto }) {
  if (porcentaje === null) {
    el.querySelector('.hero-valor').textContent = '–';
    el.querySelector('.veredicto').innerHTML = chip(null);
    el.querySelector('.veredicto-texto').textContent =
      'Ningún sprint tiene los 5 sprints anteriores necesarios para calcular la velocidad relativa.';
    return;
  }
  el.querySelector('.hero-valor').textContent = `${formatoNumero(porcentaje, 0)} %`;
  el.querySelector('.hero-detalle').textContent = `${altas} de ${total} sprints con concordancia alta`;
  el.querySelector('.veredicto').innerHTML = chip(veredicto, ESTADO_VEREDICTO[veredicto]);
  el.querySelector('.veredicto-texto').textContent = EXPLICACION_VEREDICTO[veredicto];
}

function renderDetalle(el, s) {
  const velocidadTexto = s.vph === null
    ? '<p class="ayuda">No hay 5 sprints anteriores para comparar.</p>'
    : `<p class="cifras">${sp(s.SPT)} <span class="vs">vs. promedio</span> ${sp(s.vph)} → <b>VVR ${signo(s.vvr)} SP</b></p>`;

  el.innerHTML = `
    <div class="resumen-sprint">
      <article class="card destacado">
        <h3>Relación velocidad–calidad</h3>
        <div class="grande">${chip(s.relacion)}</div>
        <p class="ayuda">${s.relacion ? EXPLICACION_RELACION[s.relacion] : 'Falta la velocidad o la calidad para combinarlas.'}</p>
      </article>
      <article class="card">
        <h3>Calidad del sprint</h3>
        <div class="grande">${chip(s.calidad)}</div>
        <p class="ayuda">Combina los 4 indicadores: <b>Alta</b> si todos son Satisfactorios, <b>Adecuada</b> si son Satisfactorios o Adecuados, <b>En atención</b> si alguno está en Atención, <b>Baja</b> si alguno es Insuficiente.</p>
      </article>
      <article class="card">
        <h3>Velocidad del sprint</h3>
        <div class="grande">${chipVelocidad(s.velocidad)}</div>
        ${velocidadTexto}
        <p class="ayuda">Alta si supera al promedio por más de ${MARGEN_VELOCIDAD} SP; Baja si queda más de ${MARGEN_VELOCIDAD} SP por debajo.</p>
        <details><summary>¿Qué significa cada variable?</summary>${variablesHtml([['SPT'], ['VPH'], ['VVR']])}</details>
      </article>
    </div>
    <div class="indicadores">
      ${s.indicadores.map((ind) => `
        <article class="card indicador">
          <header><h3>${ind.nombre}</h3>${chip(ind.nivel)}</header>
          <p class="pregunta-ind">${ind.pregunta}</p>
          <p class="valor">${ind.valor === null ? '–' : ind.formato(ind.valor)}</p>
          <p class="formula">${ind.formula}</p>
          ${variablesHtml(ind.variables.map((v) => [v, s[v]]))}
          <p class="umbral">Satisfactorio desde ${ind.formato(ind.cortes[0])} · Adecuado desde ${ind.formato(ind.cortes[1])} · Atención desde ${ind.formato(ind.cortes[2])}</p>
        </article>`).join('')}
    </div>`;
}

function renderGraficoSprints(canvas, leyenda, sprints) {
  const css = getComputedStyle(document.documentElement);
  const color = (nombre) => css.getPropertyValue(nombre).trim();
  const colorCalidad = {
    Alta: color('--estado-ok'),
    Adecuada: color('--estado-bien'),
    'En atención': color('--estado-alerta'),
    Baja: color('--estado-critico'),
  };

  leyenda.innerHTML =
    ORDEN_CALIDAD.map((c) => `<span><i class="muestra" style="background:${colorCalidad[c]}"></i>${ICONO[ESTADO[c]]} Calidad ${c.toLowerCase()}</span>`).join('') +
    '<span><i class="muestra linea"></i>Promedio histórico (VPH)</span>';

  return new Chart(canvas, {
    data: {
      labels: sprints.map((s) => s.sprint),
      datasets: [
        {
          type: 'line',
          label: 'Promedio histórico (VPH)',
          data: sprints.map((s) => s.vph),
          borderColor: color('--texto-secundario'),
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          pointHoverRadius: 4,
          spanGaps: false,
        },
        {
          type: 'bar',
          label: 'Story points terminados (SPT)',
          data: sprints.map((s) => s.SPT),
          backgroundColor: sprints.map((s) => colorCalidad[s.calidad] ?? color('--borde')),
          borderRadius: 4,
          borderSkipped: 'bottom',
          maxBarThickness: 48,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => (ctx.raw === null ? null : `${ctx.dataset.label}: ${sp(ctx.raw)}`),
            afterBody: (items) => {
              const s = sprints[items[0].dataIndex];
              return [`Calidad: ${s.calidad ?? 'sin datos'}`, `Relación: ${s.relacion ?? 'sin datos'}`];
            },
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: color('--texto-secundario') } },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Story points', color: color('--texto-secundario') },
          grid: { color: color('--borde') },
          ticks: { color: color('--texto-secundario') },
        },
      },
    },
  });
}
