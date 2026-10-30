// Fuente "precargados": dataset estático en data/sprints.json
async function iniciarPrecargados() {
  const raiz = document.getElementById('dashboard-precargados');
  const fuente = document.getElementById('fuente-precargados');
  try {
    const resp = await fetch('data/sprints.json', { cache: 'no-cache' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const datos = await resp.json();

    const errores = (datos.sprints ?? []).flatMap((s, i) =>
      validarSprint(s).map((e) => `${s.sprint || `Sprint #${i + 1}`}: ${e}`),
    );
    if (errores.length) {
      raiz.innerHTML = `<div class="card alerta-error"><b>El dataset tiene errores:</b><ul>${errores
        .map((e) => `<li>${esc(e)}</li>`)
        .join('')}</ul></div>`;
      return;
    }

    fuente.textContent = `${datos.equipo ?? 'data/sprints.json'} · ${datos.sprints.length} sprints`;
    renderDashboard(raiz, datos);
  } catch (err) {
    raiz.innerHTML = '<p class="card alerta-error">No se pudo cargar <code>data/sprints.json</code>.</p>';
    console.error(err);
  }
}
