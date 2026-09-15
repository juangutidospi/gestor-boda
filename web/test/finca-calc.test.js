import { register } from './runner.js';
import { eur, eurK, coste, filtrar, ordenar, tiposDe, calcularStats, filasComparador } from '../js/components/views/finca-view/finca-calc.js';

register('finca/calc', () => {
  const out = [];
  const fincas = [
    { id: '1', nombre: 'Alfa', tipo: 'Finca', zona: 'Madrid', km: 30, capSent: 300, capPie: 500, menu: 100, alquiler: 0, valoracion: 4.5, estado: 'favorita', notas: '' },
    { id: '2', nombre: 'Beta', tipo: 'Bodega', zona: 'Toledo', km: 80, capSent: 150, capPie: 200, menu: 90, alquiler: 4800, valoracion: 4.2, estado: 'candidata', notas: 'con barra' },
    { id: '3', nombre: 'Gamma', tipo: 'Finca', zona: 'Ávila', km: 120, capSent: 250, capPie: 400, menu: 96, alquiler: 0, valoracion: 4.9, estado: 'descartada', notas: '' },
  ];

  out.push({ name: 'coste = alquiler + menu*inv', ok: coste(fincas[1], 140) === 4800 + 90 * 140, detail: String(coste(fincas[1], 140)) });
  out.push({ name: 'eur formatea es-ES', ok: eur(1234) === '1.234 €', detail: eur(1234) });
  out.push({ name: 'eurK sobre 10k', ok: eurK(18200) === '18,2k €', detail: eurK(18200) });
  out.push({ name: 'eurK bajo 10k = eur', ok: eurK(4800) === eur(4800), detail: eurK(4800) });

  out.push({ name: 'filtrar por estado', ok: filtrar(fincas, { q: '', tipo: 'Todos', estado: 'favorita' }).length === 1, detail: '' });
  out.push({ name: 'filtrar por tipo', ok: filtrar(fincas, { q: '', tipo: 'Finca', estado: 'Todos' }).length === 2, detail: '' });
  out.push({ name: 'filtrar por texto (zona/notas)', ok: filtrar(fincas, { q: 'barra', tipo: 'Todos', estado: 'Todos' }).length === 1, detail: '' });

  const porCoste = ordenar(fincas, 'coste-asc', 140).map(f => f.id);
  out.push({ name: 'ordenar coste-asc', ok: porCoste[0] === '3' || porCoste[0] === '1', detail: porCoste.join(',') }); // 1 y 3 tienen alquiler 0; menor menu*inv gana

  const porVal = ordenar(fincas, 'valoracion', 140).map(f => f.id);
  out.push({ name: 'ordenar valoracion desc', ok: porVal[0] === '3', detail: porVal.join(',') });

  out.push({ name: 'tiposDe incluye Todos y únicos', ok: JSON.stringify(tiposDe(fincas)) === JSON.stringify(['Todos', 'Finca', 'Bodega']), detail: tiposDe(fincas).join(',') });

  const stats = calcularStats(fincas, 140);
  out.push({ name: 'stats: 5 tarjetas', ok: stats.length === 5, detail: String(stats.length) });
  const seg = stats.find(s => s.key === 'seguimiento');
  out.push({ name: 'stats: en seguimiento = no descartadas', ok: seg.value === 2, detail: String(seg.value) });

  const filas = filasComparador([fincas[0], fincas[1]], 140);
  const costeRow = filas.find(r => r.key === 'coste');
  out.push({ name: 'comparador: mejor coste marcado (min)', ok: costeRow.cells[0].win === true && costeRow.cells[1].win === false, detail: '' });

  return out;
});
