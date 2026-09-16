/**
 * Valores de enum del modelo → clave i18n. El test de paridad verifica que
 * cada clave existe en es.js y en.js.
 */
export const ENUMS = {
  fincaEstado: { favorita: 'enum.finca.favorita', candidata: 'enum.finca.candidata', descartada: 'enum.finca.descartada', elegida: 'enum.finca.elegida' },
  invLado: { novia: 'enum.lado.novia', novio: 'enum.lado.novio' },
  invRsvp: { confirmado: 'enum.rsvp.confirmado', pendiente: 'enum.rsvp.pendiente', no: 'enum.rsvp.no' },
  invInvitacion: {
    'sin enviar': 'enum.invitacion.sin_enviar', enviada: 'enum.invitacion.enviada',
    recordatorio: 'enum.invitacion.recordatorio', respondida: 'enum.invitacion.respondida',
  },
  provEstado: {
    contratado: 'enum.prov.contratado', presupuesto: 'enum.prov.presupuesto',
    contactado: 'enum.prov.contactado', pendiente: 'enum.prov.pendiente',
  },
  mesaForma: { redonda: 'enum.mesa.redonda', rectangular: 'enum.mesa.rectangular' },
};
