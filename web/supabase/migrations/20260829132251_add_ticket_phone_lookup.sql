alter table public.orders
  add column if not exists buyer_phone text;

alter table public.tickets
  add column if not exists holder_phone text;

alter table public.orders
  drop constraint if exists orders_buyer_phone_format;
alter table public.orders
  add constraint orders_buyer_phone_format
  check (buyer_phone is null or buyer_phone ~ '^\+40[0-9]{9}$');

alter table public.tickets
  drop constraint if exists tickets_holder_phone_format;
alter table public.tickets
  add constraint tickets_holder_phone_format
  check (holder_phone is null or holder_phone ~ '^\+40[0-9]{9}$');

create index if not exists tickets_holder_email_idx
  on public.tickets (holder_email);

create index if not exists tickets_holder_phone_idx
  on public.tickets (holder_phone)
  where holder_phone is not null;

comment on column public.orders.buyer_phone is
  'Romanian contact number normalized to +40 followed by 9 digits.';

comment on column public.tickets.holder_phone is
  'Optional ticket-access contact, normalized to +40 followed by 9 digits.';
