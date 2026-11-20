-- Run once in the existing project's SQL Editor. Preserves products and orders.
begin;
create table if not exists public.customer_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '' check(length(full_name)<=120),
 phone text not null default '' check(length(phone)<=25),
 address jsonb not null default '{}' check(jsonb_typeof(address)='object'),
 updated_at timestamptz not null default now()
);
create table if not exists public.customer_saved_products (
 user_id uuid not null references auth.users(id) on delete cascade,
 product_id text not null references public.products(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(user_id,product_id)
);
create table if not exists public.customer_recent_products (
 user_id uuid not null references auth.users(id) on delete cascade,
 product_id text not null references public.products(id) on delete cascade,
 viewed_at timestamptz not null default now(),
 primary key(user_id,product_id)
);
create index if not exists customer_recent_by_time on public.customer_recent_products(user_id,viewed_at desc);
alter table public.customer_profiles enable row level security;
alter table public.customer_saved_products enable row level security;
alter table public.customer_recent_products enable row level security;
revoke all on public.customer_profiles,public.customer_saved_products,public.customer_recent_products from public,anon,authenticated;
grant select,insert,update,delete on public.customer_profiles,public.customer_saved_products,public.customer_recent_products to authenticated;
grant all on public.customer_profiles,public.customer_saved_products,public.customer_recent_products to service_role;
drop policy if exists own_customer_profile on public.customer_profiles;
create policy own_customer_profile on public.customer_profiles for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists own_saved_products on public.customer_saved_products;
create policy own_saved_products on public.customer_saved_products for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists own_recent_products on public.customer_recent_products;
create policy own_recent_products on public.customer_recent_products for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
commit;
