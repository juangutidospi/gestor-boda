# Vista Presupuesto (Fase 4) — Diseño

Reemplaza el placeholder de Presupuesto por la vista agregada del prototipo (UN
componente con getters de plantilla), más una capa premium coherente con las vistas ya
implementadas. Réplica exacta del cálculo del prototipo.

- Fecha: 2026-09-20
- Repositorio: `gestor-boda` · Rama: `feat/vista-presupuesto`
- Base: Fases 0-3 (en `main`)
- Estado: propuesto

---

## 1. Objetivo y alcance

Implementar la vista "Presupuesto": una vista **agregada** (read-mostly) que cruza finca
elegida/candidatas, proveedores e invitados contra un límite editable, y muestra cuánto
hay contratado, cuánto por confirmar, el margen (o el exceso) y ratios por invitado.

**Entra:** toda la vista Presupuesto (base del prototipo + capa premium).
**No entra:** Salón, Timing.

**Estado escribible:** solo el límite (`presupuestoRepo`). El nº de invitados
presupuestados (`guestCount`) se **lee** de config (se edita en la vista Finca), como en
el prototipo. El resto se calcula de las otras entidades.

## 2. Arquitectura (patrón consolidado)

- UN componente: `components/views/presupuesto-view/presupuesto-view.js` + `.css.js`,
  con getters de plantilla (`_headerTpl`, `_resumenTpl`, `_bloquesTpl`, `_bloqueTpl`,
  `_insightsTpl`) y wiring en `afterRender()`.
- Lógica pura en `presupuesto-view/presupuesto-calc.js` (sin DOM, testeable):
  `calcularPresupuesto({ fincas, proveedores, invitados, guestCount, limite })` devuelve
  todos los valores y los tres bloques.
- Reutiliza: `coste()` de `finca-view/finca-calc.js`, `pax()` de
  `invitados-view/invitados-calc.js`, `eur()/eurK()` de `core/money.js`. Reutiliza el
  primitivo `app-toast` (celebración/avisos). No usa `modal-dialog` (no hay CRUD propio).

```
components/views/presupuesto-view/
├── presupuesto-view.js / .css.js
└── presupuesto-calc.js
```

## 3. Modelo de datos (ya en el seed de Fase 0)

Lee, sin crear entidades nuevas:
- `fincasRepo` — finca `elegida` y `candidatas` (no descartada / no elegida), con
  `coste = alquiler + menu * inv`.
- `proveedoresRepo` — `{ categoria, estado, precio, senal }`; catering = `categoria ===
  'Catering'`.
- `invitadosRepo` — `pax = 1 + plus` para las "cabezas" (personas en lista real).
- `configRepo.guestCount` — invitados presupuestados (`inv`), por defecto 140.
- `presupuestoRepo` — `{ limite }` (único escribible; `setLimite`).

## 4. Lógica de negocio (portada del prototipo, exacta)

Con `inv = guestCount`, `limite = presupuestoRepo.limite`:

- `cabezas = Σ pax(invitado)` sobre todos los invitados.
- `esBanquete(p) = p.categoria === 'Catering'`.
- `provContratados = proveedores contratado & !banquete`; `provPend = (presupuesto |
  contactado) & !banquete`.
- `cateringProv = Σ precio` de los proveedores de Catering.
- `provCont = Σ precio(provContratados)`; `provPend€ = Σ precio(provPend)`.
- `senales = Σ senal` de todos los proveedores.
- `fincaCoste = elegida ? coste(elegida, inv) : 0`.
- `candidatas = fincas no descartada y no elegida`; `costesCand = candidatas.map(coste)`;
  `fincaPend = elegida ? 0 : media(costesCand)` (redondeada; 0 si no hay candidatas).
- `banquete = fincaCoste || cateringProv || fincaPend` (primer no-cero).
- `contratado = provCont + fincaCoste`.
- `pendiente = provPend€ + (fincaCoste ? 0 : banquete)`.
- `total = contratado + pendiente`.
- `dif = limite − total`; `exceso = max(0, total − limite)`.
- Anchos de barra (`pc(n) = limite>0 ? clamp(0..100, n/limite*100) : 0`, a 1 decimal):
  - `barContratado = pc(min(contratado, limite))`
  - `barPrevisto = pc(max(0, min(total, limite) − contratado))`
  - `barExceso = pc(exceso)`

### Bloques (3)

1. **Finca y banquete** — total = `banquete`; nota = `elegida ? 'Cerrado con {nombre}' :
   'Estimación con la media de candidatas'`. Líneas:
   - Con finca elegida: `{nombre}` (Banquete para `inv` invitados) = `fincaCoste`;
     `Señal 25 %` (al reservar la fecha) = `fincaCoste*0.25`; `Coste por invitado`
     (`menu €/persona [+ alquiler]`) = `coste/inv`.
   - Sin finca elegida: `Sin finca elegida` (`N candidatas en seguimiento`) = `—`;
     `Media de las candidatas` (sobre `inv`) = `fincaPend | —`; `La más barata` = `min
     costesCand | —`.
   - Si hay `cateringProv`: línea extra `Catering de la finca` (cocina propia: es el
     banquete, no va en proveedores) = `cateringProv`.
2. **Proveedores** — total = `provCont + provPend€`; nota = `N contratados · M por
   confirmar · catering aparte`. Líneas: por categoría (excluyendo `Catering`, y
   excluyendo estados `descartado`/`pendiente`), ordenadas por importe desc; detalle =
   `K contratado(s)` o `presupuesto por confirmar`; importe = suma de la categoría.
3. **Pagos y ratios** — total = `senales`; nota = `Lo desembolsado y lo que queda`.
   Líneas: `Señales ya pagadas` = `senales`; `Pendiente de pago` (contratado menos
   señales) = `max(0, contratado − senales)`; `Coste por invitado` (sobre `inv`) =
   `total/inv | —`; `En lista real` (`cabezas` personas con acompañantes) =
   `total/cabezas | —`; `Margen libre` (lo que queda del límite) = `dif` con signo.

### Textos derivados
- `presPorInvitado = inv ? '{eur(total/inv)} por invitado · {inv} presupuestados
  ({cabezas} en lista)' : 'Sin invitados'`.
- `presDifLabel = dif>=0 ? 'Margen disponible' : 'Te pasas por'`; valor `dif` con signo.
- Footer: nota del prototipo sobre el catering y los ratios por invitado (con `inv`).

## 5. Colores → tokens (regla de la casa)

El prototipo usa un verde suelto `#8fae84`. Se mapea a tokens (soporta claro/oscuro):
- Contratado → `--rsvp-si-dot` (verde).
- Por confirmar → `--color-accent-300`.
- Fuera de presupuesto → `--color-accent`.
- Pista de la barra → `--color-neutral-200`.
- Color del margen: `--color-text` si `dif>=0`, `--color-accent-700` si te pasas.

Sin ningún hex hardcodeado (lo verifica el test de tokens).

## 6. Persistencia

- `presupuestoRepo.setLimite(n)` al cambiar el input (número ≥ 0).
- Nada más se persiste; la vista recalcula desde los repos al abrir (`refresh()`).

## 7. Interacción y accesibilidad

- `refresh()` (lo llama el router) lee repos, calcula y pinta.
- Editar el límite → `setLimite` → recalcular y repintar solo el resumen/bloques (sin
  perder el foco del input), con re-animación de barra y contadores.
- Chips de insight accionables: "N por confirmar" → navega a Proveedores; "Sin finca
  elegida" → navega a Finca (vía hash del router). Focus visible, `aria`.
- Números con `tabular-nums`; bloques con `break-inside: avoid` para no cortarse.

## 8. Diseño premium (coherente con Invitados/Proveedores)

- Contadores animados (rAF, easing cúbico) para Total previsto y Margen.
- Barra apilada animada al pintar (transición de anchos), con guard
  `prefers-reduced-motion`.
- Chips de insight/alerta: exceso ("Te pasas por X"), margen ("Margen libre X"),
  proveedores por confirmar, finca sin elegir.
- Confeti sobrio **una vez** al pasar de estar por encima del límite a caber en él
  (`dif` cruza a ≥0); semilla del estado previo en `refresh()` para no celebrar en falso
  al abrir. Respeta `prefers-reduced-motion`.

## 9. Tests

- `presupuesto-calc.test.js` (pura): `total = contratado + pendiente`; `dif` y `exceso`
  con y sin exceso; anchos de barra suman correctamente; con finca elegida
  (`pendiente` no incluye banquete) vs sin finca elegida (`banquete` va a pendiente);
  catering cuenta como banquete y no aparece en el bloque Proveedores; bloque Proveedores
  ordenado por importe desc; ratios `total/inv` y `total/cabezas`.
- Paridad i18n es/en (todas las claves nuevas) y tokens↔temas (sin hex).

## 10. Cableado

- `index.html`: `<section class="view" id="view-presupuesto">` →
  `<presupuesto-view class="view" id="view-presupuesto">`.
- `main.js`: import de `presupuesto-view.js`. El router ya selecciona por `.view` y llama
  `refresh()` al abrir.

## 11. Criterios de aceptación

1. La vista replica el cálculo del prototipo (total, margen/exceso, barra, señales, tres
   bloques y sus líneas) con los datos del seed.
2. Editar el límite recalcula todo en vivo sin perder el foco del input.
3. Contadores y barra se animan al abrir; chips de insight navegan a la vista relevante;
   confeti solo al cruzar a "cabe en el límite". Todo respeta `prefers-reduced-motion`.
4. Bilingüe es/en con paridad; solo tokens (claro/oscuro correctos).
5. Suite completa en verde.

## 12. Decisiones / riesgos

- **`guestCount` de solo lectura aquí** (se edita en Finca), fiel al prototipo. Si más
  adelante se quiere editar desde Presupuesto, es un añadido menor.
- **Reutilizar `coste`/`pax`** en vez de duplicar mantiene una sola fuente de verdad; la
  calc importa de finca-calc/invitados-calc.
- **Catering como banquete**: es la regla clave del prototipo (no contar dos veces); los
  tests la fijan.
- **Vista read-mostly**: no hay `modal-dialog` ni CRUD; menos superficie que Proveedores.
