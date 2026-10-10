-- Target: kkakkungi-prep (Supabase public schema)
-- Applied to production on 2026-10-10; checked afterward against pg_proc privileges.
-- Scope: function EXECUTE privileges only. No tables, policies, or data changes.
BEGIN;

-- Remove PUBLIC and direct application-role EXECUTE grants.
REVOKE EXECUTE ON FUNCTION public.accept_household_invitation(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_household(text, text, date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_household_invitation(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_household_with_profile(text, text, text, date, date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_household_invitation(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_household_member(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_household_owner(uuid) FROM PUBLIC, anon, authenticated;

-- Authenticated application RPCs.
GRANT EXECUTE ON FUNCTION public.accept_household_invitation(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_household_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_household_with_profile(text, text, text, date, date) TO authenticated;

-- Invitation landing page reads invitation metadata without requiring sign-in.
-- This function verifies possession of a random invitation token.
GRANT EXECUTE ON FUNCTION public.get_household_invitation(text) TO anon, authenticated;

-- Helper functions are called by RLS policies for signed-in users.
GRANT EXECUTE ON FUNCTION public.is_household_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_household_owner(uuid) TO authenticated;

-- Legacy create_household is no longer used by the Next.js application.
-- No EXECUTE permission is restored to anon or authenticated for it.

-- Verify effective role permissions and unexpected explicit grants atomically.
DO $verify$
DECLARE
  mismatches text;
BEGIN
  WITH expected(signature, anon_allowed, auth_allowed) AS (
    VALUES
      ('public.accept_household_invitation(text,text)', false, true),
      ('public.create_household(text,text,date)', false, false),
      ('public.create_household_invitation(text)', false, true),
      ('public.create_household_with_profile(text,text,text,date,date)', false, true),
      ('public.get_household_invitation(text)', true, true),
      ('public.is_household_member(uuid)', false, true),
      ('public.is_household_owner(uuid)', false, true)
  ), checked AS (
    SELECT e.*, to_regprocedure(e.signature) AS function_oid FROM expected e
  ), evaluated AS (
    SELECT c.signature,
      CASE
        WHEN c.function_oid IS NULL THEN 'function missing'
        WHEN EXISTS (
          SELECT 1 FROM pg_proc p
          CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
          WHERE p.oid = c.function_oid AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
        ) THEN 'PUBLIC direct execution still enabled'
        WHEN has_function_privilege('anon', c.function_oid, 'EXECUTE') IS DISTINCT FROM c.anon_allowed
          THEN 'anon effective permission mismatch'
        WHEN has_function_privilege('authenticated', c.function_oid, 'EXECUTE') IS DISTINCT FROM c.auth_allowed
          THEN 'authenticated effective permission mismatch'
        WHEN EXISTS (
          SELECT 1 FROM pg_proc p
          CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
          WHERE p.oid = c.function_oid AND acl.privilege_type = 'EXECUTE'
          AND (
            acl.grantee = 0
            OR NOT EXISTS (
              SELECT 1 FROM pg_roles r WHERE r.oid = acl.grantee
                AND r.rolname IN ('postgres', 'service_role', 'anon', 'authenticated')
            )
            OR (acl.grantee = (SELECT oid FROM pg_roles WHERE rolname='anon') AND NOT c.anon_allowed)
            OR (acl.grantee = (SELECT oid FROM pg_roles WHERE rolname='authenticated') AND NOT c.auth_allowed)
          )
        ) THEN 'unexpected direct EXECUTE grant'
        ELSE NULL
      END AS problem
    FROM checked c
  )
  SELECT string_agg(signature || ': ' || problem, E'\n') INTO mismatches
  FROM evaluated WHERE problem IS NOT NULL;

  IF mismatches IS NOT NULL THEN
    RAISE EXCEPTION 'Function EXECUTE permission check failed:%', E'\n' || mismatches;
  END IF;
END
$verify$;

COMMIT;
