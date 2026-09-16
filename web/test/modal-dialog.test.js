import { register } from './runner.js';
import '../js/components/ui/modal-dialog/modal-dialog.js';

register('ui/modal-dialog', () => {
  const out = [];
  const d = document.createElement('modal-dialog');
  d.heading = 'Comparativa';
  document.body.appendChild(d);
  out.push({ name: 'nace cerrado', ok: d.shadowRoot.querySelector('.backdrop')?.getAttribute('data-open') === 'false', detail: '' });

  d.open();
  out.push({ name: 'open() abre y muestra heading', ok: d.shadowRoot.querySelector('.backdrop')?.getAttribute('data-open') === 'true' && d.shadowRoot.textContent.includes('Comparativa'), detail: '' });

  let closed = false;
  d.addEventListener('close', () => { closed = true; });
  d.close();
  out.push({ name: 'close() emite close y cierra', ok: closed && d.shadowRoot.querySelector('.backdrop')?.getAttribute('data-open') === 'false', detail: '' });

  d.remove();
  return out;
});
