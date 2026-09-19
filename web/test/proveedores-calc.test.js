import { register } from './runner.js';
import { filtrar, ordenar, calcularStats, chipsCategorias } from '../js/components/views/proveedores-view/proveedores-calc.js';

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
  return out;
});
