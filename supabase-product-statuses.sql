create table if not exists public.product_statuses (
  product_id text primary key,
  status text not null default 'available'
    check (status in ('available', 'preorder', 'unavailable')),
  updated_at timestamptz not null default now()
);
alter table public.product_statuses enable row level security;
