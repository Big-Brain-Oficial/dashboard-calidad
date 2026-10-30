# Dashboard - Calidad del Sprint

> Trabajo práctico de la materia **"Aspectos Avanzados de Calidad de Software"**. UTN FRRe, Ingeniería en Sistemas de Información, ciclo lectivo 2026. Grupo G – Big Brain.

Dashboard estático (HTML + JS + [Chart.js](https://www.chartjs.org/)), desplegado en Vercel. Implementa el modelo de calidad del **Escenario G: Calidad del Sprint más allá de la velocidad** y responde a la necesidad de información: *¿en qué grado la velocidad es una medida suficiente para determinar la calidad del desempeño del sprint?*

## Cómo está organizado

La barra lateral tiene dos partes:

- **Datos**: elige de dónde salen los sprints.
  - **Precargados**: los datos de ejemplo de [`data/sprints.json`](data/sprints.json). Esta fuente es fija.
  - **Carga manual**: arranca con una base de 6 sprints ([`data/carga-base.json`](data/carga-base.json), extraída de las métricas directas de `Dataset_Historias_Calidad_6_Sprints.xlsx`), y los sprints que se ingresan con el formulario se suman a continuación. Se guardan en el `localStorage` del navegador: cada navegador tiene los suyos y no se comparten entre usuarios. Con *Restaurar datos base* se vuelve a los 6 sprints originales.
- **Secciones**: muestran una parte del dashboard por vez.
  - **Cargar sprint** (solo en carga manual): un formulario con las métricas directas, agrupadas por dimensión. Los SPTH se completan solos con los sprints ya cargados.
  - **Resumen**: el porcentaje de sprints con *concordancia alta* y el veredicto, la cantidad de sprints en cada relación velocidad–calidad y un gráfico de velocidad coloreado por calidad.
  - **Sprints**: una tabla con los 4 indicadores de cada sprint, cada celda coloreada según su nivel.
  - **Detalle del sprint**: la relación velocidad–calidad, la calidad y la velocidad de un sprint, y los indicadores agrupados por dimensión (Adecuación funcional y Mantenibilidad), cada uno con su medidor de umbrales.
  - **Glosario y reglas**: en tres partes (variables por dimensión, indicadores con sus umbrales y reglas de decisión).

El significado de cada variable también aparece al pasar el mouse por encima (o al tocarla en el celular).

## Métricas directas que se cargan

| Campo | Significado |
|---|---|
| `USE` | Historias comprometidas en el Sprint Planning |
| `USAC` | Historias comprometidas que se terminaron y aceptaron al cierre |
| `USVF` | Historias sometidas a verificación funcional |
| `USCAF` | Historias verificadas que cumplen todos sus criterios de aceptación |
| `DEFE` | Defectos elegibles para diagnóstico |
| `DEFT` | Defectos elegibles cuya causa se identificó dentro del plazo máximo |
| `USM` | Historias modificadas después del inicio del sprint |
| `USMD` | Historias modificadas que degradaron la calidad |
| `SPT` | Story points terminados en el sprint |
| `SPTH1` … `SPTH5` | SPT de los 5 sprints anteriores. Se completan solos con los sprints ya cargados. |

Reglas de consistencia: `USAC ≤ USE`, `USCAF ≤ USVF`, `DEFT ≤ DEFE` y `USMD ≤ USM`.

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
- Headers de seguridad: CSP (solo permite scripts propios y de `cdn.jsdelivr.net`, para Chart.js, y la fuente Plus Jakarta Sans de Google Fonts), `X-Frame-Options`, `nosniff`, `Referrer-Policy` y `Permissions-Policy`.
- Los archivos de `data/` siempre se revalidan, así un cambio en los datos se ve apenas se deploya.

`.vercelignore` deja afuera los archivos que no hacen falta en producción.

**Desde el dashboard de Vercel:** *Add New → Project*, importar el repo de GitHub y deployar sin cambiar nada (toma `vercel.json`). Cada push a `main` genera un deploy de producción y cada PR, un preview.

**Desde la terminal:**

```bash
npx vercel          # primer deploy (vincula el proyecto)
npx vercel --prod   # deploy a producción
```
