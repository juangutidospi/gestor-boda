/**
 * Arnés mínimo de tests en navegador: registra suites y las ejecuta,
 * pintando el resultado en la página. Sin dependencias ni build.
 */
const suites = [];

/**
 * Registra una suite.
 * @param {string} name Nombre visible de la suite.
 * @param {() => Array<{name: string, ok: boolean, detail: string}> | Promise<Array<{name: string, ok: boolean, detail: string}>>} runFn
 */
export function register(name, runFn) {
  suites.push({ name, runFn });
}

/** Ejecuta todas las suites y pinta el informe. Fija window.__testFailures. */
export async function runAll() {
  const out = document.getElementById('out');
  let failures = 0;
  for (const suite of suites) {
    const results = await suite.runFn();
    const section = document.createElement('section');
    section.innerHTML = `<h2>${suite.name}</h2>`;
    for (const r of results) {
      if (!r.ok) failures++;
      const line = document.createElement('div');
      line.textContent = `${r.ok ? 'PASS' : 'FAIL'} — ${r.name}${r.detail ? ` · ${r.detail}` : ''}`;
      line.style.color = r.ok ? '#2f9d78' : '#c0392b';
      section.appendChild(line);
    }
    out.appendChild(section);
  }
  window.__testFailures = failures;
  const summary = document.createElement('p');
  summary.textContent = failures === 0 ? 'TODO VERDE' : `${failures} fallo(s)`;
  summary.style.fontWeight = '700';
  out.prepend(summary);
}
