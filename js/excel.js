// Importación / exportación de sprints en Excel (SheetJS, cargado solo cuando se usa)
const URL_SHEETJS = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
const HOJA_SPRINTS = 'Sprints';

let cargaSheetJs = null;

function cargarSheetJs() {
  cargaSheetJs ??= new Promise((resolver, rechazar) => {
    const script = document.createElement('script');
    script.src = URL_SHEETJS;
    script.onload = () => resolver(window.XLSX);
    script.onerror = () => {
      cargaSheetJs = null;
      rechazar(new Error('No se pudo cargar la librería de Excel. Revisá la conexión.'));
    };
    document.head.appendChild(script);
  });
  return cargaSheetJs;
}

const columnasExcel = () => ['Sprint', ...CAMPOS_DIRECTOS, ...CAMPOS_SPTH];

// "#USAC", "usac", "SPTH₁" o "Sprint " se reconocen igual
function normalizarEncabezado(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[₀-₉]/g, (d) => String(d.charCodeAt(0) - 0x2080))
    .replace(/[#\s_.-]/g, '')
    .toUpperCase();
}

function aNumero(valor) {
  if (valor === null || valor === '') return NaN;
  return typeof valor === 'number' ? valor : Number(String(valor).trim().replace(',', '.'));
}

async function leerExcel(archivo) {
  const XLSX = await cargarSheetJs();
  const libro = XLSX.read(await archivo.arrayBuffer());
  const hoja = libro.Sheets[HOJA_SPRINTS] ?? libro.Sheets[libro.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json(hoja, { defval: null, raw: true });

  const errores = [];
  const sprints = [];
  filas.forEach((filaOriginal, i) => {
    const fila = Object.fromEntries(Object.entries(filaOriginal).map(([k, v]) => [normalizarEncabezado(k), v]));
    if (Object.values(fila).every((v) => v === null || v === '')) return;

    const sprint = { sprint: String(fila.SPRINT ?? fila.NOMBRE ?? '').trim() };
    CAMPOS_DIRECTOS.forEach((c) => { sprint[c] = aNumero(fila[c]); });

    const spth = CAMPOS_SPTH.map((c) => fila[c]);
    const cargados = spth.filter((v) => v !== null && v !== undefined && v !== '');
    if (cargados.length === 5) sprint.SPTH = spth.map(aNumero);
    else if (cargados.length) errores.push(`Fila ${i + 2}: completá los 5 SPTH o dejalos todos vacíos.`);

    validarSprint(sprint).forEach((e) => errores.push(`Fila ${i + 2} (${sprint.sprint || 'sin nombre'}): ${e}`));
    sprints.push(sprint);
  });

  if (!sprints.length) errores.push('La hoja no tiene filas con datos.');
  return { sprints, errores };
}

async function descargarExcel(sprints, nombreArchivo) {
  const XLSX = await cargarSheetJs();
  const filas = sprints.map((s) => {
    const fila = { Sprint: s.sprint };
    CAMPOS_DIRECTOS.forEach((c) => { fila[c] = s[c]; });
    CAMPOS_SPTH.forEach((c, i) => { fila[c] = s.SPTH?.[i] ?? null; });
    return fila;
  });

  const libro = XLSX.utils.book_new();
  const hoja = XLSX.utils.json_to_sheet(filas, { header: columnasExcel() });
  hoja['!cols'] = columnasExcel().map((c) => ({ wch: c === 'Sprint' ? 14 : 8 }));
  XLSX.utils.book_append_sheet(libro, hoja, HOJA_SPRINTS);

  const referencia = [
    ['Columna', 'Significado'],
    ['Sprint', 'Nombre o número del sprint, en orden cronológico'],
    ...CAMPOS_DIRECTOS.map((c) => [c, VARIABLES[c]]),
    ['SPTH1 … SPTH5', `${VARIABLES.SPTH}. Opcional: si se dejan vacíos se toman de las filas anteriores (alcanza con completarlos en la primera fila).`],
  ];
  const hojaRef = XLSX.utils.aoa_to_sheet(referencia);
  hojaRef['!cols'] = [{ wch: 16 }, { wch: 100 }];
  XLSX.utils.book_append_sheet(libro, hojaRef, 'Referencia');

  XLSX.writeFile(libro, nombreArchivo);
}
