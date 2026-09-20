-- ============================================================================
-- SETUP DO AGENDAMENTO AUTOMÁTICO — buscar-noticias-saude (CADA 2 HORAS)
-- ----------------------------------------------------------------------------
-- COMO APLICAR (1 MINUTO):
--   1) Supabase Dashboard → SQL Editor → New query.
--   2) SUSTITUYA [SUA_SERVICE_ROLE_KEY_AQUI] pela service_role key real:
--      Dashboard → Settings → API → service_role (é SECRETA, não use a anon key).
--   3) Cole todo este conteúdo e clique em "Run".
--
-- O QUE FAZE:
--   - Habilita pg_cron (agendador) e pg_net (HTTP a partir do Postgres).
--   - Registra um job que, NO minuto 0 de cada 2 horas (schedule '0 */2 * * *'),
--     dispara um POST à Edge Function:
--       https://ecphyqttiffjwqnebolm.supabase.co/functions/v1/buscar-noticias-saude
--     com header 'Authorization: Bearer <service_role_key>'.
--
-- OBS:
--   - É IDEMPOTENTE: si o job já existe, é removido e recriado (puede rodarse
--     cuantas veces quiera sem duplicados).
--   - A consulta final lista o job registrado para verificação.
--   - Teste manual (opcional) comentado ao final.
-- ============================================================================

-- 1) Extensões
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2) Remove um agendamento anterior (evita jobs duplicados)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'buscar-noticias-saude') THEN
    PERFORM cron.unschedule('buscar-noticias-saude');
  END IF;
END $$;

-- 3) Agenda: minuto 0, cada 2 horas
SELECT cron.schedule(
  'buscar-noticias-saude',   -- nome do job
  '0 */2 * * *',             -- cron: cada 2 horas
  $$
    SELECT net.http_post(
      url     := 'https://ecphyqttiffjwqnebolm.supabase.co/functions/v1/buscar-noticias-saude',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer [SUA_SERVICE_ROLE_KEY_AQUI]'
      ),
      body    := '{}'
    ) AS request_id;
  $$
);

-- 4) Verificação: confirma que o job está registrado e ativo
SELECT jobid, schedule, jobname, active
FROM cron.job
WHERE jobname = 'buscar-noticias-saude';

-- 5) TESTE MANUAL (opcional): dispara agora; veja o resultado em
--    Dashboard → Functions → buscar-noticias-saude → Logs (1-2 min).
--    Descomente e rode SOLO ESTE BLOQUE para provar o agendamento:
--
-- SELECT net.http_post(
--   url     := 'https://ecphyqttiffjwqnebolm.supabase.co/functions/v1/buscar-noticias-saude',
--   headers := jsonb_build_object(
--     'Content-Type', 'application/json',
--     'Authorization', 'Bearer [SUA_SERVICE_ROLE_KEY_AQUI]'
--   ),
--   body    := '{}'
-- ) AS request_id;