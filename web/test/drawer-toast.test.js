import { register } from './runner.js';
import '../js/components/ui/drawer/drawer.js';
import '../js/components/ui/toast/toast.js';

register('ui/drawer + toast', () => {
  const out = [];

  const d = document.createElement('app-drawer');
  d.heading = 'Añadir';
  document.body.appendChild(d);
  out.push({ name: 'drawer nace cerrado', ok: d.hasAttribute('hidden') || d.shadowRoot.querySelector('.scrim')?.getAttribute('data-open') === 'false', detail: '' });

  d.open();
  out.push({ name: 'open() lo abre', ok: d.shadowRoot.querySelector('.scrim')?.getAttribute('data-open') === 'true', detail: '' });
  out.push({ name: 'muestra el heading', ok: d.shadowRoot.textContent.includes('Añadir'), detail: '' });

  let closed = false;
  d.addEventListener('close', () => { closed = true; });
  d.close();
  out.push({ name: 'close() emite close y cierra', ok: closed && d.shadowRoot.querySelector('.scrim')?.getAttribute('data-open') === 'false', detail: '' });

  const tt = document.createElement('app-toast');
  document.body.appendChild(tt);
  tt.show('Guardado');
  out.push({ name: 'toast muestra el mensaje', ok: tt.shadowRoot.textContent.includes('Guardado'), detail: '' });

  d.remove(); tt.remove();
  return out;
});
