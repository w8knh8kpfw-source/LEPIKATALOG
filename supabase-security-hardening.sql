-- LEPÍ Security Patch 4.8
-- Run once in the Supabase SQL Editor using a project administrator account.
-- The Node.js backend uses SUPABASE_SERVICE_ROLE_KEY; browser clients must not
-- access order, review, or product-status tables directly.

do $$
begin
  if to_regclass('public.orders') is not null then
    execute 'alter table public.orders enable row level security';
    execute 'revoke all on table public.orders from anon, authenticated';
    execute 'grant all on table public.orders to service_role';
  end if;

  if to_regclass('public.reviews') is not null then
    execute 'alter table public.reviews enable row level security';
    execute 'revoke all on table public.reviews from anon, authenticated';
    execute 'grant all on table public.reviews to service_role';
  end if;

  if to_regclass('public.product_statuses') is not null then
    execute 'alter table public.product_statuses enable row level security';
    execute 'revoke all on table public.product_statuses from anon, authenticated';
    execute 'grant all on table public.product_statuses to service_role';
  end if;
end
$$;

-- Verify after running:
-- select schemaname, tablename, rowsecurity
-- from pg_tables
-- where schemaname = 'public'
--   and tablename in ('orders', 'reviews', 'product_statuses');
