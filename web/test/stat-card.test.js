import { register } from './runner.js';
import '../js/components/ui/stat-card/stat-card.js';
import '../js/components/ui/estado-badge/estado-badge.js';

register('ui/stat-card + estado-badge', () => {
  const out = [];

  const card = document.createElement('stat-card');
  card.setAttribute('label', 'Confirmados');
  card.setAttribute('value', '42');
  card.setAttribute('note', 'de 140');
  document.body.appendChild(card);
  const txt = card.shadowRoot.textContent;
  out.push({ name: 'stat-card muestra label/value/note', ok: txt.includes('Confirmados') && txt.includes('42') && txt.includes('de 140'), detail: '' });

  const badge = document.createElement('estado-badge');
  badge.kind = 'finca';
  badge.value = 'favorita';
  document.body.appendChild(badge);
  out.push({ name: 'estado-badge traduce el estado', ok: badge.shadowRoot.textContent.trim() === 'Favorita', detail: badge.shadowRoot.textContent.trim() });
  out.push({ name: 'estado-badge aplica la clase tag', ok: !!badge.shadowRoot.querySelector('.tag'), detail: '' });

  card.remove(); badge.remove();
  return out;
});
