import { register } from './runner.js';
import { filtrar, ordenar, calcularStats, chipsCategorias, checklistDe, checklistProgreso, timelinePagos } from '../js/components/views/proveedores-view/proveedores-calc.js';

register('proveedores/calc', () => {
  const out = [];
  const cats = ['Fotografía', 'Vídeo', 'Flores'];
  const p = (over) => ({ id: 'x', nombre: 'N', categoria: 'Flores', estado: 'contactado', precio: 0, senal: 0, contacto: '', telefono: '', notas: '', ...over });
  const provs = [
    p({ id: 'a', categoria: 'Fotografía', estado: 'contratado', precio: 2400, senal: 600 }),
    p({ id: 'b', categoria: 'Flores', estado: 'presupuesto', precio: 1650, notas: 'olivo' }),
    p({ id: 'c', categoria: 'Vídeo', estado: 'descartado', precio: 0 }),
  ];

  out.push({ name: 'filtrar por estado', ok: filtrar(provs, { q: '', categoria: 'Todas', estado: 'contratado' }).length === 1, detail: '' });
  out.push({ name: 'filtrar por categoría', ok: filtrar(provs, { q: '', categoria: 'Flores', estado: 'Todos' }).length === 1, detail: '' });
  out.push({ name: 'filtrar por texto (nota)', ok: filtrar(provs, { q: 'olivo', categoria: 'Todas', estado: 'Todos' }).length === 1, detail: '' });

  const ord = ordenar(provs, cats).map((x) => x.categoria);
  out.push({ name: 'ordenar por categorías', ok: ord[0] === 'Fotografía' && ord[2] === 'Flores', detail: ord.join(',') });

  const ordPrecio = ordenar(provs, cats, 'precio').map((x) => x.id);
  out.push({ name: 'ordenar por precio (mayor primero)', ok: ordPrecio[0] === 'a' && ordPrecio[2] === 'c', detail: ordPrecio.join(',') });
  const ordNombre = ordenar([p({ id: 'z', nombre: 'Zeta' }), p({ id: 'a', nombre: 'Alfa' })], cats, 'nombre').map((x) => x.nombre);
  out.push({ name: 'ordenar por nombre (A-Z)', ok: ordNombre[0] === 'Alfa', detail: ordNombre.join(',') });
  const ordEstado = ordenar(provs, cats, 'estado').map((x) => x.estado);
  out.push({ name: 'ordenar por estado (contratado primero)', ok: ordEstado[0] === 'contratado', detail: ordEstado.join(',') });

  const stats = calcularStats(provs, cats);
  out.push({ name: 'stats: 4', ok: stats.length === 4, detail: String(stats.length) });
  const comp = stats.find((s) => s.key === 'comprometido');
  out.push({ name: 'comprometido = solo contratados (2400)', ok: String(comp.value).includes('2.400'), detail: String(comp.value) });
  const cub = stats.find((s) => s.key === 'cubiertas');
  out.push({ name: 'cubiertas = 1 categoría', ok: String(cub.value).startsWith('1'), detail: String(cub.value) });

  const chips = chipsCategorias(provs, cats);
  out.push({ name: 'chip Fotografía cubierta', ok: chips.find((c) => c.categoria === 'Fotografía').estado === 'cubierta', detail: '' });
  out.push({ name: 'chip Flores en marcha', ok: chips.find((c) => c.categoria === 'Flores').estado === 'enMarcha', detail: '' });
  out.push({ name: 'chip Vídeo vacía (descartado no cuenta)', ok: chips.find((c) => c.categoria === 'Vídeo').estado === 'vacia', detail: '' });

  // Checklist: deriva del estado cuando no hay guardado.
  const chDeriv = checklistDe({ estado: 'contratado', senal: 500 });
  out.push({ name: 'checklist derivado: contratado con señal → presupuesto+señal+contrato', ok: chDeriv.presupuesto && chDeriv.senal && chDeriv.contrato && !chDeriv.confirmado, detail: JSON.stringify(chDeriv) });
  const chStored = checklistDe({ estado: 'contratado', senal: 500, checklist: { confirmado: true, contrato: false } });
  out.push({ name: 'checklist guardado prevalece sobre el derivado', ok: chStored.confirmado === true && chStored.contrato === false, detail: JSON.stringify(chStored) });
  const prog = checklistProgreso({ estado: 'contratado', senal: 500 });
  out.push({ name: 'checklistProgreso cuenta pasos hechos', ok: prog.done === 3 && prog.total === 4, detail: `${prog.done}/${prog.total}` });

  // Timeline de pagos: solo contratados con saldo, ordenado por fecha.
  const tl = timelinePagos([
    { id: 'a', nombre: 'A', categoria: 'X', estado: 'contratado', precio: 2000, senal: 500, fechaPago: '2027-01-10' },
    { id: 'b', nombre: 'B', categoria: 'Y', estado: 'contratado', precio: 1000, senal: 300, fechaPago: '2026-11-15' },
    { id: 'c', nombre: 'C', categoria: 'Z', estado: 'presupuesto', precio: 900, senal: 0 },
    { id: 'd', nombre: 'D', categoria: 'W', estado: 'contratado', precio: 400, senal: 400, fechaPago: '2026-10-01' },
  ]);
  out.push({ name: 'timeline: solo contratados con saldo > 0', ok: tl.entradas.length === 2, detail: tl.entradas.map((e) => e.id).join(',') });
  out.push({ name: 'timeline: ordenado por fecha (b antes que a)', ok: tl.entradas[0].id === 'b', detail: tl.entradas.map((e) => e.id).join(',') });
  out.push({ name: 'timeline: total pendiente = 1500 + 700', ok: tl.totalPendiente === 2200, detail: String(tl.totalPendiente) });
  out.push({ name: 'timeline: total pagado suma señales', ok: tl.totalPagado === 1200, detail: String(tl.totalPagado) });

  return out;
});
