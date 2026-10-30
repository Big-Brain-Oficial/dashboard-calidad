// Modelo de calidad del sprint (Escenario G): métricas, umbrales e indicadores.
// Funciones puras: reciben los datos de los sprints y devuelven la evaluación.

const VARIABLES = {
  USE: 'Historias comprometidas en el Sprint Planning',
  USAC: 'Historias comprometidas que se terminaron y aceptaron al cierre',
  USVF: 'Historias sometidas a verificación funcional',
  USCAF: 'Historias verificadas que cumplen todos sus criterios de aceptación',
  DEFE: 'Defectos elegibles para diagnóstico (ya se diagnosticaron o ya venció el plazo máximo)',
  DEFT: 'Defectos elegibles cuya causa se identificó dentro del plazo máximo',
  USM: 'Historias modificadas después del inicio del sprint (implementadas y verificadas)',
  USMD: 'Historias modificadas cuyo cambio introdujo defectos o degradó la calidad',
  SPT: 'Story points de las historias terminadas (DoD) en el sprint',
  SPTH: 'Story points terminados en cada uno de los 5 sprints anteriores',
  VPH: 'Velocidad promedio de los 5 sprints anteriores',
  VVR: 'Diferencia entre la velocidad del sprint (SPT) y el promedio histórico (VPH)',
};

const formatoNumero = (v, decimales = 1, minimo = 0) =>
  v.toLocaleString('es-AR', { minimumFractionDigits: minimo, maximumFractionDigits: decimales });

const INDICADORES = [
  {
    clave: 'GCF',
    nombre: 'Completitud funcional',
    pregunta: '¿Se terminó lo que se comprometió?',
    formula: 'GCF = USAC ÷ USE × 100',
    variables: ['USAC', 'USE'],
    calcular: (s) => (s.USE > 0 ? (s.USAC / s.USE) * 100 : null),
    cortes: [90, 80, 60],
    formato: (v) => `${formatoNumero(v, 0)} %`,
  },
  {
    clave: 'ICF',
    nombre: 'Corrección funcional',
    pregunta: '¿Lo verificado cumple los criterios de aceptación?',
    formula: 'ICF = USCAF ÷ USVF',
    variables: ['USCAF', 'USVF'],
    calcular: (s) => (s.USVF > 0 ? s.USCAF / s.USVF : null),
    cortes: [0.9, 0.8, 0.65],
    formato: (v) => formatoNumero(v, 2, 2),
  },
  {
    clave: 'EDD',
    nombre: 'Analizabilidad',
    pregunta: '¿Se encontró a tiempo la causa de los defectos?',
    formula: 'EDD = DEFT ÷ DEFE',
    variables: ['DEFT', 'DEFE'],
    calcular: (s) => (s.DEFE > 0 ? s.DEFT / s.DEFE : null),
    cortes: [0.9, 0.8, 0.65],
    formato: (v) => formatoNumero(v, 2, 2),
  },
  {
    clave: 'IMSD',
    nombre: 'Modificabilidad',
    pregunta: '¿Los cambios de alcance se implementaron sin degradar la calidad?',
    formula: 'IMSD = (USM − USMD) ÷ USM × 100',
    variables: ['USM', 'USMD'],
    calcular: (s) => (s.USM > 0 ? ((s.USM - s.USMD) / s.USM) * 100 : null),
    cortes: [90, 80, 60],
    formato: (v) => `${formatoNumero(v, 0)} %`,
  },
];

const CAMPOS_DIRECTOS = ['USE', 'USAC', 'USVF', 'USCAF', 'DEFE', 'DEFT', 'USM', 'USMD', 'SPT'];

// Pares (parte, total) que deben cumplir parte <= total
const RESTRICCIONES = [['USAC', 'USE'], ['USCAF', 'USVF'], ['DEFT', 'DEFE'], ['USMD', 'USM']];

// Umbral de VVR (en SP) que separa velocidad Alta / Promedio / Baja
const MARGEN_VELOCIDAD = 2;

function nivelIndicador(valor, [satisfactorio, adecuado, atencion]) {
  if (valor === null) return null;
  valor = Math.round(valor * 1e9) / 1e9; // evita que 79.99999… caiga bajo el umbral de 80
  if (valor >= satisfactorio) return 'Satisfactorio';
  if (valor >= adecuado) return 'Adecuado';
  if (valor >= atencion) return 'Atención';
  return 'Insuficiente';
}

// Indicador general. Los indicadores sin dato (denominador 0) no se consideran.
function calidadGeneral(niveles) {
  const validos = niveles.filter(Boolean);
  if (!validos.length) return null;
  if (validos.includes('Insuficiente')) return 'Baja';
  if (validos.includes('Atención')) return 'En atención';
  if (validos.every((n) => n === 'Satisfactorio')) return 'Alta';
  return 'Adecuada';
}

function nivelVelocidad(vvr) {
  if (vvr === null) return null;
  if (vvr > MARGEN_VELOCIDAD) return 'Alta';
  if (vvr < -MARGEN_VELOCIDAD) return 'Baja';
  return 'Promedio';
}

function relacionVelocidadCalidad(velocidad, calidad) {
  if (!velocidad || !calidad) return null;
  const calidadBuena = calidad === 'Alta' || calidad === 'Adecuada';
  if (velocidad === 'Alta') {
    if (calidad === 'Alta') return 'Concordancia alta';
    if (calidad === 'Adecuada') return 'Concordancia adecuada';
    return 'Desajuste de calidad';
  }
  return calidadBuena ? 'Calidad sostenida' : 'Desempeño en alerta';
}

const EXPLICACION_RELACION = {
  'Concordancia alta': 'Velocidad alta y calidad alta: la velocidad refleja bien el desempeño.',
  'Concordancia adecuada': 'Velocidad alta con calidad adecuada.',
  'Desajuste de calidad': 'Velocidad alta pero calidad en atención o baja: la velocidad oculta problemas.',
  'Calidad sostenida': 'Velocidad promedio o baja, pero la calidad se mantuvo alta o adecuada.',
  'Desempeño en alerta': 'Velocidad promedio o baja y calidad en atención o baja.',
};

// Completa SPTH de cada sprint: si no viene explícito, usa los 5 SPT previos
// (tomando primero el "historial" del dataset y luego los sprints anteriores).
// Un SPTH explícito reemplaza el historial acumulado para los sprints siguientes.
function completarHistorial({ historial = [], sprints = [] }) {
  let previos = [...historial];
  return sprints.map((s) => {
    if (s.SPTH) previos = [...s.SPTH];
    const spth = previos.length >= 5 ? previos.slice(-5) : null;
    previos.push(s.SPT);
    return { ...s, SPTH: spth };
  });
}

function evaluarSprints(datos) {
  return completarHistorial(datos).map((s) => {
    const indicadores = INDICADORES.map((ind) => {
      const valor = ind.calcular(s);
      return { ...ind, valor, nivel: nivelIndicador(valor, ind.cortes) };
    });
    const vph = s.SPTH ? s.SPTH.reduce((a, b) => a + b, 0) / s.SPTH.length : null;
    const vvr = vph === null ? null : s.SPT - vph;
    const calidad = calidadGeneral(indicadores.map((i) => i.nivel));
    const velocidad = nivelVelocidad(vvr);
    return {
      ...s,
      indicadores,
      vph,
      vvr,
      calidad,
      velocidad,
      relacion: relacionVelocidadCalidad(velocidad, calidad),
    };
  });
}

// Interpretación final: % de sprints con concordancia alta sobre los evaluables
function resumir(evaluados) {
  const conRelacion = evaluados.filter((s) => s.relacion);
  const altas = conRelacion.filter((s) => s.relacion === 'Concordancia alta').length;
  if (!conRelacion.length) return { total: 0, altas: 0, porcentaje: null, veredicto: null };
  const porcentaje = (altas / conRelacion.length) * 100;
  let veredicto = 'No adecuado';
  if (porcentaje > 75) veredicto = 'Adecuado';
  else if (porcentaje >= 50) veredicto = 'En atención';
  return { total: conRelacion.length, altas, porcentaje, veredicto };
}

const EXPLICACION_VEREDICTO = {
  Adecuado: 'La velocidad es una medida suficiente: cuando sube, la calidad acompaña.',
  'En atención': 'La velocidad es solo una referencia parcial: hay que mirarla junto con los indicadores de calidad.',
  'No adecuado': 'La velocidad no alcanza para evaluar el sprint: no refleja su calidad. Hay que decidir con los 4 indicadores.',
};

function validarSprint(s) {
  const errores = [];
  if (!s.sprint) errores.push('Falta el nombre del sprint.');
  CAMPOS_DIRECTOS.forEach((c) => {
    if (typeof s[c] !== 'number' || !(s[c] >= 0)) errores.push(`${c} debe ser un número mayor o igual a 0.`);
  });
  RESTRICCIONES.forEach(([parte, total]) => {
    if (s[parte] > s[total]) errores.push(`${parte} no puede ser mayor que ${total}.`);
  });
  if (s.SPTH != null && (!Array.isArray(s.SPTH) || s.SPTH.length !== 5 || s.SPTH.some((v) => !(v >= 0)))) {
    errores.push('SPTH debe tener los story points de 5 sprints anteriores.');
  }
  return errores;
}
