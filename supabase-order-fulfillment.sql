-- LEPÍ: добавить выбор способа получения для отслеживания заказа
alter table public.orders
  add column if not exists fulfillment_type text
  check (fulfillment_type in ('delivery','pickup'));
