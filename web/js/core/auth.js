/**
 * Autenticación: envoltorio fino sobre Supabase Auth. Todo es asíncrono y
 * degrada con gracia si Supabase no está configurado.
 */
import { getClient, isConfigured } from './supabase.js';

export { isConfigured };

/** @returns {Promise<import('@supabase/supabase-js').Session|null>} */
export async function getSession() {
  if (!isConfigured()) return null;
  const sb = await getClient();
  const { data } = await sb.auth.getSession();
  return data.session ?? null;
}

/** @returns {Promise<import('@supabase/supabase-js').User|null>} */
export async function getUser() {
  const s = await getSession();
  return s?.user ?? null;
}

/**
 * Suscribe a cambios de sesión (login/logout/refresh).
 * @param {(session: import('@supabase/supabase-js').Session|null) => void} cb
 * @returns {Promise<() => void>} función para desuscribir
 */
export async function onAuthChange(cb) {
  if (!isConfigured()) return () => {};
  const sb = await getClient();
  const { data } = sb.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

/**
 * Entra con email + contraseña.
 * @param {string} email @param {string} password
 */
export async function signInPassword(email, password) {
  const sb = await getClient();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/**
 * Crea una cuenta con email + contraseña.
 * @param {string} email @param {string} password @param {string} [fullName]
 */
export async function signUp(email, password, fullName) {
  const sb = await getClient();
  const { error } = await sb.auth.signUp({
    email, password, options: { data: fullName ? { full_name: fullName } : undefined },
  });
  if (error) throw error;
}

/**
 * Envía un enlace mágico (sin contraseña) al email.
 * @param {string} email
 */
export async function signInMagicLink(email) {
  const sb = await getClient();
  const { error } = await sb.auth.signInWithOtp({
    email, options: { emailRedirectTo: window.location.origin + window.location.pathname },
  });
  if (error) throw error;
}

/** Cierra la sesión. */
export async function signOut() {
  if (!isConfigured()) return;
  const sb = await getClient();
  await sb.auth.signOut();
}
