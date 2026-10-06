-- ============================================================================
-- 0005_extras.sql — Campos que faltaban para cubrir todas las vistas:
--   · fincas.senal        señal de la finca (banner de la elegida)
--   · weddings.settings   bolsa JSONB para claves de config sin columna propia
--                         (p. ej. bodaFecha y horaDorada de la vista Timing)
-- Idempotente.
-- ============================================================================

alter table public.fincas   add column if not exists senal    integer not null default 0;
alter table public.weddings add column if not exists settings jsonb   not null default '{}'::jsonb;
