/**
 * Cliente de Supabase (carga perezosa). No hay build: `@supabase/supabase-js`
 * se importa desde un CDN ESM solo la primera vez que se necesita, así que el
 * arranque y los tests no dependen de la red mientras no se use.
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const SUPABASE_ESM = 'https://esm.sh/@supabase/supabase-js@2.45.4';

/** @returns {boolean} ¿Hay URL y anon key configuradas? */
export function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/** @type {Promise<import('@supabase/supabase-js').SupabaseClient>|null} */
let clientPromise = null;

/**
 * Devuelve el cliente de Supabase (singleton). Lanza si no está configurado.
 * @returns {Promise<import('@supabase/supabase-js').SupabaseClient>}
 */
export function getClient() {
  if (!isConfigured()) throw new Error('Supabase no configurado (web/js/core/config.js)');
  if (!clientPromise) {
    clientPromise = import(/* @vite-ignore */ SUPABASE_ESM).then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      }));
  }
  return clientPromise;
}
