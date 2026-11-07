-- LEPÍ: таблица для безопасного отслеживания заказов
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  tracking_token text not null unique,
  customer_name text not null,
  items jsonb not null default '[]'::jsonb,
  total text not null,
  status text not null default 'new'
    check (status in ('new','accepted','preparing','ready','courier','completed','cancelled')),
  created_at timestamptz not null default now(),
  status_updated_at timestamptz not null default now()
);
create index if not exists orders_tracking_token_idx on public.orders (tracking_token);
alter table public.orders enable row level security;
revoke all on table public.orders from anon, authenticated;
grant all on table public.orders to service_role;
