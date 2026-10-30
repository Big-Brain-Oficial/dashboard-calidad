# Dashboard - Calidad del Sprint

> Trabajo práctico de la materia **"Aspectos Avanzados de Calidad de Software"**. UTN FRRe, Ingeniería en Sistemas de Información, ciclo lectivo 2026. Grupo G – Big Brain.

Dashboard estático (HTML + JS + [Chart.js](https://www.chartjs.org/)), desplegado en Vercel. Implementa el modelo de calidad del **Escenario G: Calidad del Sprint más allá de la velocidad** y responde a la necesidad de información: *¿en qué grado la velocidad es una medida suficiente para determinar la calidad del desempeño del sprint?*

## Qué muestra

1. **Respuesta principal**: el porcentaje de sprints con *concordancia alta* (velocidad alta y calidad alta al mismo tiempo) y el veredicto. Es *Adecuado* por encima del 75 %, *En atención* entre el 50 % y el 75 %, y *No adecuado* por debajo del 50 %.
2. **Velocidad y calidad por sprint**: un gráfico de story points terminados (SPT), con cada barra coloreada según la calidad del sprint, y una línea con el promedio histórico (VPH).
3. **Resumen por sprint**: la velocidad, la calidad y la relación velocidad–calidad de cada sprint.
4. **Detalle del sprint**: los 4 indicadores (GCF, ICF, EDD e IMSD), cada uno con su fórmula y el significado de cada variable.

## Pestañas

- **Datos precargados** (fija): muestra los datos de ejemplo de [`data/sprints.json`](data/sprints.json).
- **Carga manual** (flexible):
  1. **Importar Excel**: carga la base inicial de sprints. Si ya había datos, se reemplazan después de pedir confirmación.
  2. **Agregar un sprint**: un formulario con las métricas directas. Cada sprint nuevo se suma a continuación de la base.
  3. **Exportar Excel**: descarga todo lo cargado, en el mismo formato que la importación.

  Los datos de esta pestaña se guardan en el `localStorage` del navegador: cada navegador tiene los suyos y no se comparten entre usuarios.

## Formato del Excel

Lo más simple es usar el botón **Descargar plantilla**, que trae una hoja `Sprints` y otra `Referencia` con el significado de cada columna. La importación lee la hoja `Sprints` o, si no existe, la primera hoja. Tiene una fila por sprint, en orden cronológico:

| Columna | Significado |
|---|---|
| `Sprint` | Nombre o número del sprint |
| `USE` | Historias comprometidas en el Sprint Planning |
| `USAC` | Historias comprometidas que se terminaron y aceptaron al cierre |
| `USVF` | Historias sometidas a verificación funcional |
| `USCAF` | Historias verificadas que cumplen todos sus criterios de aceptación |
| `DEFE` | Defectos elegibles para diagnóstico |
| `DEFT` | Defectos elegibles cuya causa se identificó dentro del plazo máximo |
| `USM` | Historias modificadas después del inicio del sprint |
| `USMD` | Historias modificadas que degradaron la calidad |
| `SPT` | Story points terminados en el sprint |
| `SPTH1` … `SPTH5` | *(opcional)* SPT de los 5 sprints anteriores. Alcanza con completarlos en la primera fila: las siguientes los toman de las filas previas. |

- Los encabezados aceptan variantes como `#USE`, `usac` o `SPTH₁`, y los decimales se pueden escribir con coma.
- Reglas de consistencia: `USAC ≤ USE`, `USCAF ≤ USVF`, `DEFT ≤ DEFE` y `USMD ≤ USM`. Si el archivo tiene errores no se importa, y se muestra el número de fila de cada problema.

## Decisiones de implementación

- Si el denominador de una métrica es 0 (por ejemplo, un sprint sin modificaciones, `USM = 0`), el indicador se muestra como *Sin datos* y no entra en el cálculo de la calidad general.
- Un sprint sin 5 sprints anteriores no tiene velocidad relativa (VVR). Por eso queda fuera del porcentaje de concordancia alta.
- En la guía, la interpretación *No adecuado* dice "por debajo del 75 %". Se tomó como "por debajo del 50 %" para que los rangos no se superpongan.

## Desarrollo local

```bash
npm run dev   # http://localhost:3000
```

La carpeta se tiene que servir por HTTP: `fetch` no funciona si se abre `index.html` directamente como archivo.

## Deploy en Vercel

La configuración está en [`vercel.json`](vercel.json):

- Es un sitio estático: no hay framework, no se instalan dependencias y no hay build. Se publica la raíz del repo.
- `cleanUrls`: las URLs se sirven sin la extensión `.html`.
- Headers de seguridad: CSP (solo permite scripts de `cdn.jsdelivr.net` para Chart.js y de `cdn.sheetjs.com` para Excel), `X-Frame-Options`, `nosniff`, `Referrer-Policy` y `Permissions-Policy`.
- Los archivos de `data/` siempre se revalidan, así un cambio en los datos se ve apenas se deploya.

`.vercelignore` deja afuera los archivos que no hacen falta en producción.

**Desde el dashboard de Vercel:** *Add New → Project*, importar el repo de GitHub y deployar sin cambiar nada (toma `vercel.json`). Cada push a `main` genera un deploy de producción y cada PR, un preview.

**Desde la terminal:**

```bash
npx vercel          # primer deploy (vincula el proyecto)
npx vercel --prod   # deploy a producción
```
