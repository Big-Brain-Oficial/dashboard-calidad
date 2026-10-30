// Renderiza el dashboard (usado por ambas fuentes de datos). Cada sección es una
// "vista" que se muestra según la navegación lateral (ver app.js).

// Cada resultado se muestra con ícono + texto + color; el color nunca va solo
const ESTADO = {
  Satisfactorio: 'ok', Alta: 'ok', 'Concordancia alta': 'ok',
  Adecuado: 'bien', Adecuada: 'bien', 'Concordancia adecuada': 'bien', 'Calidad sostenida': 'bien',
  Atención: 'alerta', 'En atención': 'alerta', 'Desajuste de calidad': 'alerta',
  Insuficiente: 'critico', Baja: 'critico', 'Desempeño en alerta': 'critico',
};
const ESTADO_VEREDICTO = { Adecuado: 'ok', 'En atención': 'alerta', 'No adecuado': 'critico' };
const ICONO = { ok: '✓', bien: '✓', alerta: '!', critico: '✕', na: '–' };
const ICONO_VELOCIDAD = { Alta: '↑', Promedio: '→', Baja: '↓' };
const ORDEN_CALIDAD = ['Alta', 'Adecuada', 'En atención', 'Baja'];
const ORDEN_RELACION = ['Concordancia alta', 'Concordancia adecuada', 'Calidad sostenida', 'Desajuste de calidad', 'Desempeño en alerta'];
const COMBINACION_RELACION = {
  'Concordancia alta': '↑ Velocidad · Calidad alta',
  'Concordancia adecuada': '↑ Velocidad · Calidad adecuada',
  'Calidad sostenida': '→↓ Velocidad · Calidad buena',
  'Desajuste de calidad': '↑ Velocidad · Calidad en riesgo',
  'Desempeño en alerta': '→↓ Velocidad · Calidad en riesgo',
};
const DIMENSIONES = [
  { clave: 'funcional', nombre: 'Adecuación funcional', icono: '◎' },
  { clave: 'mantenibilidad', nombre: 'Mantenibilidad', icono: '⚙' },
];
// Variables del modelo agrupadas por dimensión (glosario y formulario de carga)
const GRUPOS_VARIABLES = [
  { clave: 'funcional', nombre: 'Adecuación funcional', icono: '◎', variables: ['USE', 'USAC', 'USVF', 'USCAF'] },
  { clave: 'mantenibilidad', nombre: 'Mantenibilidad', icono: '⚙', variables: ['DEFE', 'DEFT', 'USM', 'USMD'] },
  { clave: 'velocidad', nombre: 'Velocidad', icono: '↗', variables: ['SPT', 'SPTH', 'VPH', 'VVR'] },
];
const REGLA_CALIDAD = 'Alta: los 4 indicadores Satisfactorios · Adecuada: todos Satisfactorios o Adecuados · En atención: alguno en Atención · Baja: alguno Insuficiente';
const REGLA_VELOCIDAD = `Compara SPT con el promedio de los 5 sprints anteriores (VPH). Alta: más de ${MARGEN_VELOCIDAD} SP por encima · Baja: más de ${MARGEN_VELOCIDAD} SP por debajo`;

const esc = (texto) =>
  String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const tip = (texto) => ` data-tip="${esc(texto)}" tabindex="0"`;
const info = (texto) => `<span class="info"${tip(texto)} aria-label="Más información">i</span>`;
const estadoDe = (texto) => ESTADO[texto] ?? 'na';

function chip(texto, estado = estadoDe(texto)) {
  if (!texto) return '<span class="chip na">– Sin datos</span>';
  return `<span class="chip ${estado}">${ICONO[estado]} ${esc(texto)}</span>`;
}

function chipVelocidad(nivel) {
  if (!nivel) return '<span class="chip na">– Sin historial</span>';
  return `<span class="chip vel">${ICONO_VELOCIDAD[nivel]} ${nivel}</span>`;
}

const sp = (v) => `${formatoNumero(v)} SP`;
const signo = (v) => (v > 0 ? '+' : '') + formatoNumero(v);

const graficosPorRaiz = new WeakMap();

function renderDashboard(raiz, datos) {
  graficosPorRaiz.get(raiz)?.destroy();
  const sprints = evaluarSprints(datos);
  if (!sprints.length) {
    raiz.innerHTML = `
      <div class="card vacio">
        <div class="vacio-icono">📊</div>
        <h2>Todavía no hay sprints cargados</h2>
        <p class="sub">Cargá el primero desde <b>Cargar sprint</b> para ver el dashboard.</p>
      </div>`;
    return;
  }
  raiz.replaceChildren(document.getElementById('tpl-dashboard').content.cloneNode(true));
  const $ = (sel) => raiz.querySelector(sel);

  renderRespuesta($('.hero'), resumir(sprints));
  renderDistribucion($('.tiles'), sprints);
  renderGlosario($('.vista-glosario'));

  const irADetalle = (i) => {
    seleccionar(i);
    navegar({ vista: 'detalle' });
  };
  const grafico = renderGraficoSprints($('.grafico canvas'), $('.leyenda'), sprints, irADetalle);
  graficosPorRaiz.set(raiz, grafico);
  renderTablaSprints($('.tabla-sprints'), sprints, irADetalle);

  const pills = sprints.map((s, i) => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.setAttribute('role', 'tab');
    pill.className = 'pill-sprint';
    pill.innerHTML = `<i class="punto ${estadoDe(s.relacion)}"></i>${esc(s.sprint)}`;
    pill.addEventListener('click', () => seleccionar(i));
    $('.pills-sprints').appendChild(pill);
    return pill;
  });

  function seleccionar(i) {
    pills.forEach((p, j) => p.setAttribute('aria-selected', i === j));
    renderDetalle($('.detalle'), sprints[i]);
  }
  seleccionar(sprints.length - 1);
}

// ---------- Resumen ----------

function anillo(porcentaje, estado) {
  const r = 52;
  const circunferencia = 2 * Math.PI * r;
  const largo = porcentaje === null ? 0 : (circunferencia * porcentaje) / 100;
  // Marcas en los límites de la escala (50 % y 75 %)
  const marcas = [50, 75].map((p) => {
    const a = (p / 100) * 2 * Math.PI - Math.PI / 2;
    const punto = (radio) => `${60 + radio * Math.cos(a)} ${60 + radio * Math.sin(a)}`;
    return `<path class="anillo-marca" d="M${punto(43)} L${punto(61)}" />`;
  }).join('');
  return `
    <svg viewBox="0 0 120 120" role="img" aria-label="${porcentaje === null ? 'Sin datos' : `${formatoNumero(porcentaje, 0)} % de sprints con concordancia alta`}">
      <circle class="anillo-pista" cx="60" cy="60" r="${r}" />
      <circle class="anillo-valor ${estado}" cx="60" cy="60" r="${r}" stroke-dasharray="${largo} ${circunferencia}" transform="rotate(-90 60 60)" />
      ${marcas}
      <text class="anillo-num" x="60" y="62">${porcentaje === null ? '–' : `${formatoNumero(porcentaje, 0)}%`}</text>
      <text class="anillo-sub" x="60" y="80">concordancia alta</text>
    </svg>`;
}

function renderRespuesta(el, { total, altas, porcentaje, veredicto }) {
  const estado = ESTADO_VEREDICTO[veredicto] ?? 'na';
  el.classList.add(estado);
  el.querySelector('.anillo').innerHTML = anillo(porcentaje, estado);
  el.querySelector('.veredicto').innerHTML = veredicto ? chip(veredicto, estado) : chip(null);
  el.querySelector('.veredicto-texto').textContent = veredicto
    ? EXPLICACION_VEREDICTO[veredicto]
    : 'Ningún sprint tiene los 5 sprints anteriores necesarios para comparar su velocidad.';
  el.querySelector('.hero-detalle').textContent = total
    ? `${altas} de ${total} sprints tuvieron velocidad alta y calidad alta`
    : '';
}

function renderDistribucion(el, sprints) {
  const sinDatos = sprints.filter((s) => !s.relacion).length;
  const tile = (n, estado, label, sub, ayuda) => `
    <div class="tile ${estado}${n ? '' : ' cero'}"${tip(ayuda)}>
      <span class="tile-num">${n}</span>
      <span class="tile-texto">
        <span class="tile-label">${ICONO[estado]} ${label}</span>
        <span class="tile-sub">${sub}</span>
      </span>
      <span class="tile-barra"><span style="width:${(n / sprints.length) * 100}%"></span></span>
    </div>`;
  el.innerHTML = ORDEN_RELACION.map((rel) => tile(
    sprints.filter((s) => s.relacion === rel).length,
    estadoDe(rel), rel, COMBINACION_RELACION[rel], EXPLICACION_RELACION[rel],
  )).join('') + (sinDatos
    ? tile(sinDatos, 'na', 'Sin historial', 'No entran en el porcentaje', 'Sprints sin 5 sprints anteriores para comparar la velocidad')
    : '');
}

function renderGraficoSprints(canvas, leyenda, sprints, alElegir) {
  const css = getComputedStyle(document.body);
  const color = (nombre) => css.getPropertyValue(nombre).trim();
  const colorCalidad = {
    Alta: color('--estado-ok'),
    Adecuada: color('--estado-bien'),
    'En atención': color('--estado-alerta'),
    Baja: color('--estado-critico'),
  };

  leyenda.innerHTML =
    ORDEN_CALIDAD.map((c) => `<span><i class="muestra" style="background:${colorCalidad[c]}"></i>Calidad ${c.toLowerCase()}</span>`).join('') +
    `<span${tip(VARIABLES.VPH)}><i class="muestra linea"></i>Promedio histórico</span>`;

  return new Chart(canvas, {
    data: {
      labels: sprints.map((s) => s.sprint),
      datasets: [
        {
          type: 'line',
          label: 'Promedio histórico (VPH)',
          data: sprints.map((s) => s.vph),
          borderColor: color('--texto-2'),
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          pointHoverRadius: 4,
          order: 0,
        },
        {
          type: 'bar',
          label: 'Story points terminados (SPT)',
          data: sprints.map((s) => s.SPT),
          backgroundColor: sprints.map((s) => colorCalidad[s.calidad] ?? color('--estado-na')),
          borderRadius: 6,
          borderSkipped: 'bottom',
          maxBarThickness: 56,
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      onClick: (_, elementos) => { if (elementos.length) alElegir(elementos[0].index); },
      onHover: (evento, elementos) => { evento.native.target.style.cursor = elementos.length ? 'pointer' : 'default'; },
      plugins: {
        legend: { display: false },
        tooltip: {
          padding: 12,
          callbacks: {
            label: (ctx) => (ctx.raw === null ? null : ` ${ctx.dataset.label}: ${sp(ctx.raw)}`),
            afterBody: (items) => {
              const s = sprints[items[0].dataIndex];
              return ['', `Calidad: ${s.calidad ?? 'sin datos'}`, `Relación: ${s.relacion ?? 'sin datos'}`];
            },
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: color('--texto-2') } },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Story points', color: color('--texto-2') },
          grid: { color: color('--borde') },
          border: { display: false },
          ticks: { color: color('--texto-2') },
        },
      },
    },
  });
}

// ---------- Sprints (tabla) ----------

function renderTablaSprints(tabla, sprints, alElegir) {
  tabla.querySelector('thead').innerHTML = `
    <tr>
      <th>Sprint</th>
      <th${tip(REGLA_VELOCIDAD)}>Velocidad</th>
      ${INDICADORES.map((i) => `<th class="num"${tip(`${i.nombre}: ${i.pregunta}`)}>${i.clave}</th>`).join('')}
      <th${tip(REGLA_CALIDAD)}>Calidad</th>
      <th>Relación velocidad–calidad</th>
    </tr>`;
  const tbody = tabla.querySelector('tbody');
  sprints.forEach((s, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><b>${esc(s.sprint)}</b></td>
      <td>${chipVelocidad(s.velocidad)} <span class="sub">${sp(s.SPT)}${s.vvr === null ? '' : ` · ${signo(s.vvr)}`}</span></td>
      ${s.indicadores.map((ind) => `
        <td class="celda ${estadoDe(ind.nivel)}"${tip(`${ind.nombre}: ${ind.nivel ?? 'sin datos'}`)}>
          ${ind.valor === null ? '–' : ind.formato(ind.valor)} <span class="celda-ico">${ICONO[estadoDe(ind.nivel)]}</span>
        </td>`).join('')}
      <td>${chip(s.calidad)}</td>
      <td>${chip(s.relacion)}</td>`;
    tr.addEventListener('click', (e) => { if (!e.target.closest('[data-tip]')) alElegir(i); });
    tbody.appendChild(tr);
  });
}

// ---------- Detalle del sprint ----------

function rangos(ind) {
  const unidad = ind.cortes[0] > 1 ? ' %' : '';
  const [satisfactorio, adecuado, atencion] = ind.cortes.map((c) => ind.formato(c).replace(' %', ''));
  return [
    ['critico', 'Insuficiente', `< ${atencion}${unidad}`],
    ['alerta', 'Atención', `${atencion}–${adecuado}${unidad}`],
    ['bien', 'Adecuado', `${adecuado}–${satisfactorio}${unidad}`],
    ['ok', 'Satisfactorio', `≥ ${satisfactorio}${unidad}`],
  ];
}

// Barra con las 4 zonas de umbral y un marcador en el valor medido
function medidor(ind, { leyenda = false } = {}) {
  const maximo = ind.cortes[0] > 1 ? 100 : 1;
  const pct = (v) => Math.min(Math.max(v / maximo, 0), 1) * 100;
  const [satisfactorio, adecuado, atencion] = ind.cortes;
  const zonas = [
    ['critico', pct(atencion)],
    ['alerta', pct(adecuado) - pct(atencion)],
    ['bien', pct(satisfactorio) - pct(adecuado)],
    ['ok', 100 - pct(satisfactorio)],
  ];
  return `
    <div class="medidor"${leyenda ? '' : tip(rangos(ind).map(([, nombre, rango]) => `${nombre}: ${rango}`).join(' · '))} role="img" aria-label="${ind.nombre}: ${ind.valor === null ? 'sin datos' : ind.formato(ind.valor)}">
      <div class="zonas">${zonas.map(([estado, ancho]) => `<span class="zona ${estado}" style="width:${ancho}%"></span>`).join('')}</div>
      ${ind.valor === null ? '' : `<span class="marcador" style="left:${pct(ind.valor)}%"></span>`}
      ${leyenda
        ? `<div class="rangos">${rangos(ind).map(([estado, nombre, rango]) => `<span class="${estado}"><b>${nombre}</b> ${rango}</span>`).join('')}</div>`
        : `<p class="meta">Meta: ≥ ${ind.formato(satisfactorio)}</p>`}
    </div>`;
}

function tarjetaIndicador(ind, s) {
  return `
    <article class="card indicador">
      <header>
        <h4>${ind.nombre}</h4>
        ${chip(ind.nivel)}
      </header>
      <p class="sub">${ind.pregunta}</p>
      <div class="valor-fila">
        <span class="valor">${ind.valor === null ? '–' : ind.formato(ind.valor)}</span>
        <span class="clave"${tip(ind.formula)}>${ind.clave}</span>
      </div>
      ${medidor(ind)}
      <div class="vars">
        ${ind.variables.map((v) => `
          <span class="var"${tip(VARIABLES[v])}>
            <span class="var-fila"><b>${v}</b><span class="var-valor">${esc(s[v])}</span></span>
            <small>${ETIQUETAS[v]}</small>
          </span>`).join('')}
      </div>
    </article>`;
}

function barrasVelocidad(s) {
  if (s.vph === null) return '<p class="sub">No hay 5 sprints anteriores para comparar.</p>';
  const maximo = Math.max(s.SPT, s.vph) || 1;
  const barra = (clave, valor, clase) => `
    <div class="bv"${tip(VARIABLES[clave])}>
      <span class="bv-clave">${clave}</span>
      <span class="bv-pista"><span class="bv-barra ${clase}" style="width:${(valor / maximo) * 100}%"></span></span>
      <span class="bv-num">${formatoNumero(valor)}</span>
    </div>`;
  return `
    <div class="barras-vel">
      ${barra('SPT', s.SPT, 'spt')}
      ${barra('VPH', s.vph, 'vph')}
    </div>
    <p class="vvr"${tip(VARIABLES.VVR)}>VVR <b>${signo(s.vvr)} SP</b></p>`;
}

function renderDetalle(el, s) {
  el.innerHTML = `
    <div class="tiles-resumen">
      <article class="card resumen-tile ${estadoDe(s.relacion)}">
        <p class="eyebrow">Relación velocidad–calidad</p>
        <p class="resumen-valor"><span class="icono-estado">${ICONO[estadoDe(s.relacion)]}</span>${s.relacion ?? 'Sin datos'}</p>
        <p class="sub">${s.relacion ? EXPLICACION_RELACION[s.relacion] : 'Falta la velocidad o la calidad.'}</p>
      </article>
      <article class="card resumen-tile ${estadoDe(s.calidad)}">
        <p class="eyebrow">Calidad del sprint ${info(REGLA_CALIDAD)}</p>
        <p class="resumen-valor"><span class="icono-estado">${ICONO[estadoDe(s.calidad)]}</span>${s.calidad ?? 'Sin datos'}</p>
        <div class="mini-niveles">
          ${s.indicadores.map((i) => `<span class="mini ${estadoDe(i.nivel)}"${tip(`${i.nombre}: ${i.nivel ?? 'sin datos'}`)}>${ICONO[estadoDe(i.nivel)]} ${i.clave}</span>`).join('')}
        </div>
      </article>
      <article class="card resumen-tile velocidad">
        <p class="eyebrow">Velocidad ${info(REGLA_VELOCIDAD)}</p>
        <p class="resumen-valor"><span class="icono-estado">${ICONO_VELOCIDAD[s.velocidad] ?? '–'}</span>${s.velocidad ?? 'Sin historial'}</p>
        ${barrasVelocidad(s)}
      </article>
    </div>
    <div class="dimensiones">
      ${DIMENSIONES.map((d) => `
        <section class="dimension dim-${d.clave}">
          <header class="dim-header"><span class="dim-icono">${d.icono}</span><h3>${d.nombre}</h3></header>
          <div class="indicadores">
            ${s.indicadores.filter((i) => i.dimension === d.clave).map((i) => tarjetaIndicador(i, s)).join('')}
          </div>
        </section>`).join('')}
    </div>`;
}

// ---------- Glosario y reglas ----------

function renderGlosario(el) {
  const seccion = (numero, titulo, sub, contenido) => `
    <section class="glosario-seccion">
      <header class="seccion-titulo">
        <span class="seccion-num">${numero}</span>
        <div><h2>${titulo}</h2><p class="sub">${sub}</p></div>
      </header>
      ${contenido}
    </section>`;

  const regla = (titulo, items) => `
    <article class="card regla">
      <h3>${titulo}</h3>
      <ul>${items.map(([chipHtml, texto]) => `<li>${chipHtml}<span>${texto}</span></li>`).join('')}</ul>
    </article>`;

  el.innerHTML = [
    seccion(1, 'Variables', 'Pasá el mouse por ⓘ para ver la definición completa', `
      <div class="grilla-glosario">
        ${GRUPOS_VARIABLES.map((g) => `
          <article class="card grupo-variables dim-${g.clave}">
            <header class="dim-header"><span class="dim-icono">${g.icono}</span><h3>${g.nombre}</h3></header>
            <ul class="lista-variables">
              ${g.variables.map((v) => `
                <li><span class="codigo">${v}</span><span>${ETIQUETAS[v]}</span>${info(VARIABLES[v])}</li>`).join('')}
            </ul>
          </article>`).join('')}
      </div>`),

    seccion(2, 'Indicadores', 'Cómo se calcula cada uno y dónde están sus umbrales', `
      <div class="grilla-glosario cuatro">
        ${INDICADORES.map((i) => `
          <article class="card glosario-ind dim-${i.dimension}">
            <span class="codigo">${i.clave}</span>
            <h3>${i.nombre}</h3>
            <p class="formula">${i.formula}</p>
            ${medidor({ ...i, valor: null }, { leyenda: true })}
          </article>`).join('')}
      </div>`),

    seccion(3, 'Reglas de decisión', 'Cómo se combinan los indicadores hasta llegar al veredicto', `
      <div class="grilla-glosario cuatro">
        ${regla('Calidad del sprint', [
          [chip('Alta'), 'Los 4 indicadores Satisfactorios'],
          [chip('Adecuada'), 'Todos Satisfactorios o Adecuados'],
          [chip('En atención'), 'Alguno en Atención'],
          [chip('Baja'), 'Alguno Insuficiente'],
        ])}
        ${regla('Velocidad', [
          [chipVelocidad('Alta'), `VVR mayor a +${MARGEN_VELOCIDAD} SP`],
          [chipVelocidad('Promedio'), `VVR entre −${MARGEN_VELOCIDAD} y +${MARGEN_VELOCIDAD} SP`],
          [chipVelocidad('Baja'), `VVR menor a −${MARGEN_VELOCIDAD} SP`],
        ])}
        ${regla('Relación velocidad–calidad', ORDEN_RELACION.map((r) => [chip(r), COMBINACION_RELACION[r]]))}
        ${regla('Veredicto final', [
          [chip('Adecuado', 'ok'), 'Más del 75 % de concordancia alta'],
          [chip('En atención', 'alerta'), 'Entre 50 % y 75 %'],
          [chip('No adecuado', 'critico'), 'Menos del 50 %'],
        ])}
      </div>`),
  ].join('');
}
