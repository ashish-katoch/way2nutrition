-- Apply to a fresh Supabase project as its database owner.
begin;

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create function public.is_store_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.admin_users where user_id = auth.uid());
$$;

create table public.products (
  id text primary key check (length(id) between 1 and 180),
  name text not null check (length(trim(name)) between 1 and 300),
  category text not null,
  description text not null default '',
  image_url text not null default '',
  source_url text not null default '',
  published boolean not null default false
);

create table public.product_variants (
  sku text primary key check (length(sku) between 1 and 128),
  product_id text not null references public.products(id) on delete restrict,
  size text not null,
  price_minor integer check (price_minor > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  stock integer not null default 0 check (stock >= 0),
  enabled boolean not null default false,
  image_url text not null default '',
  check (not enabled or price_minor is not null)
);
create index variants_by_product on public.product_variants(product_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  receipt_token uuid not null unique default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer jsonb not null,
  requested_items jsonb not null,
  items jsonb not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null default 'INR' check (currency='INR'),
  status text not null default 'reserved' check (status in ('reserved','paid','expired','payment_review')),
  fulfillment_status text not null default 'unfulfilled' check (fulfillment_status in ('unfulfilled','processing','shipped','delivered')),
  tracking_number text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '20 minutes',
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  gateway_lease uuid,
  gateway_lease_until timestamptz,
  paid_at timestamptz,
  check (fulfillment_status='unfulfilled' or status='paid')
);
create index reserved_by_expiry on public.orders(expires_at) where status='reserved';
create index orders_by_user on public.orders(user_id,created_at desc);
create table public.order_lines (
  order_id uuid not null references public.orders(id),
  sku text not null references public.product_variants(sku) on delete restrict,
  quantity integer not null check (quantity between 1 and 99),
  primary key(order_id,sku)
);
create table public.payment_events (
  event_id text primary key,
  order_id uuid not null references public.orders(id),
  payment_id text not null,
  received_at timestamptz not null default now()
);
create table public.newsletter_subscribers (
  email text primary key,
  consented_at timestamptz not null default now(),
  consent_version text not null default 'fieldwork-product-news-v1'
);

alter table public.admin_users enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_lines enable row level security;
alter table public.payment_events enable row level security;
alter table public.newsletter_subscribers enable row level security;

revoke all on public.admin_users,public.products,public.product_variants,public.orders,public.order_lines,
  public.payment_events,public.newsletter_subscribers from public,anon,authenticated;
grant select on public.products,public.product_variants to anon,authenticated;
grant insert,update on public.products,public.product_variants to authenticated;
grant select on public.admin_users,public.orders to authenticated;
grant update(fulfillment_status,tracking_number) on public.orders to authenticated;
grant all on public.admin_users,public.products,public.product_variants,public.orders,public.order_lines,
  public.payment_events,public.newsletter_subscribers to service_role;

create policy own_admin_membership on public.admin_users for select to authenticated using (user_id=auth.uid());
create policy published_products on public.products for select using (published);
create policy admin_products on public.products for all to authenticated using (public.is_store_admin()) with check (public.is_store_admin());
create policy published_variants on public.product_variants for select using
  (enabled and exists(select 1 from public.products p where p.id=product_id and p.published));
create policy admin_variants on public.product_variants for all to authenticated using (public.is_store_admin()) with check (public.is_store_admin());
create policy customer_orders on public.orders for select to authenticated using (auth.uid()=user_id or public.is_store_admin());
create policy admin_fulfillment on public.orders for update to authenticated using (public.is_store_admin()) with check (public.is_store_admin());
revoke all on function public.is_store_admin() from public,anon,authenticated;
grant execute on function public.is_store_admin() to authenticated,service_role;

-- A request UUID is a private retry key. Neither contents nor customer identity can
-- change on replay. All SKU locks are acquired in a deterministic order.
create function public.reserve_checkout(p_request uuid,p_user uuid,p_customer jsonb,p_items jsonb)
returns public.orders language plpgsql set search_path='' as $$
declare
  existing public.orders; line record; variant record;
  wanted jsonb; snapshot jsonb := '[]'; subtotal bigint := 0;
begin
  if p_request is null or jsonb_typeof(p_customer) is distinct from 'object' or jsonb_typeof(p_items) is distinct from 'array'
    then raise exception 'Invalid checkout.'; end if;
  if jsonb_array_length(p_items) not between 1 and 50 then raise exception 'Invalid bag.'; end if;
  if exists (select 1 from jsonb_array_elements(p_items) a where
    jsonb_typeof(a->'sku') is distinct from 'string' or length(a->>'sku') not between 1 and 128 or
    jsonb_typeof(a->'quantity') is distinct from 'number' or (a->>'quantity') !~ '^[1-9][0-9]?$')
    then raise exception 'Invalid item quantity.'; end if;
  select jsonb_agg(jsonb_build_object('sku',sku,'quantity',qty) order by sku) into wanted
    from (select a->>'sku' sku,sum((a->>'quantity')::integer) qty from jsonb_array_elements(p_items) a group by 1) t;
  perform pg_advisory_xact_lock(hashtextextended(p_request::text,137));
  select * into existing from public.orders where request_id=p_request for update;
  if found then
    if existing.requested_items<>wanted or existing.customer<>p_customer or existing.user_id is distinct from p_user
      then raise exception 'Checkout details changed. Start a new checkout.'; end if;
    if existing.status<>'reserved' or existing.expires_at <= now() then raise exception 'Checkout has ended.'; end if;
    return existing;
  end if;
  for line in select * from jsonb_to_recordset(wanted) as r(sku text,quantity integer) order by sku loop
    select v.*,p.name,p.published into variant from public.product_variants v join public.products p on p.id=v.product_id
      where v.sku=line.sku for update of v;
    if not found or not variant.published or not variant.enabled or line.quantity>99 or
      variant.price_minor is null or variant.stock<line.quantity then raise exception 'An item is unavailable in this quantity.'; end if;
    update public.product_variants set stock=stock-line.quantity where sku=line.sku;
    subtotal := subtotal + variant.price_minor::bigint * line.quantity;
    snapshot := snapshot || jsonb_build_array(jsonb_build_object('sku',line.sku,'product_id',variant.product_id,
      'name',variant.name,'size',variant.size,'quantity',line.quantity,'unit_price_minor',variant.price_minor));
  end loop;
  if subtotal < 100 or subtotal > 2147483647 then raise exception 'Order total is outside the supported range.'; end if;
  insert into public.orders(request_id,user_id,customer,requested_items,items,amount_minor)
    values(p_request,p_user,p_customer,wanted,snapshot,subtotal) returning * into existing;
  insert into public.order_lines(order_id,sku,quantity)
    select existing.id,sku,quantity from jsonb_to_recordset(wanted) as r(sku text,quantity integer);
  return existing;
end; $$;

create function public.expire_reservations(p_limit integer default 50)
returns integer language plpgsql set search_path='' as $$
declare ids uuid[]; line record;
begin
  select array_agg(s.id) into ids from (
    select id from public.orders where status='reserved' and expires_at<=now()
    order by expires_at,id limit greatest(1,least(p_limit,200)) for update skip locked
  ) s;
  if ids is null then return 0; end if;
  for line in select sku,sum(quantity) qty from public.order_lines where order_id=any(ids) group by sku order by sku loop
    update public.product_variants set stock=stock+line.qty where sku=line.sku;
  end loop;
  update public.orders set status='expired',gateway_lease=null,gateway_lease_until=null where id=any(ids);
  return cardinality(ids);
end; $$;

-- Atomically claim responsibility for creating the remote order. A retry after a
-- timeout recovers an existing Razorpay order by its unique merchant receipt.
create function public.claim_gateway(p_id uuid,p_lease uuid) returns public.orders
language plpgsql set search_path='' as $$
declare o public.orders;
begin
  select * into strict o from public.orders where id=p_id for update;
  if o.status<>'reserved' or o.expires_at<=now() then raise exception 'Checkout has ended.'; end if;
  if o.razorpay_order_id is null then
    if o.gateway_lease_until>now() and o.gateway_lease<>p_lease then raise exception 'Checkout is being prepared. Please retry.'; end if;
    update public.orders set gateway_lease=p_lease,gateway_lease_until=now()+interval '45 seconds'
      where id=p_id returning * into o;
  end if;
  return o;
end; $$;

create function public.attach_gateway(p_id uuid,p_lease uuid,p_gateway text) returns public.orders
language plpgsql set search_path='' as $$
declare o public.orders;
begin
  update public.orders set razorpay_order_id=p_gateway,gateway_lease=null,gateway_lease_until=null
    where id=p_id and status='reserved' and expires_at>now() and gateway_lease=p_lease and razorpay_order_id is null returning * into o;
  if not found then raise exception 'Checkout has changed. Please retry.'; end if;
  return o;
end; $$;

create function public.record_capture(p_gateway text,p_payment text,p_amount bigint,p_currency text,p_event text)
returns text language plpgsql set search_path='' as $$
declare o public.orders; result text; recorded public.payment_events;
begin
  select * into o from public.orders where razorpay_order_id=p_gateway for update;
  if not found then raise exception 'Order not found.'; end if;
  if p_event is null or length(p_event) not between 1 and 200 or p_payment is null then raise exception 'Invalid payment reference.'; end if;
  insert into public.payment_events(event_id,order_id,payment_id) values(p_event,o.id,p_payment) on conflict do nothing;
  if not found then
    select * into strict recorded from public.payment_events where event_id=p_event;
    if recorded.order_id<>o.id or recorded.payment_id<>p_payment then raise exception 'Payment event conflict.'; end if;
    return o.status;
  end if;
  if o.status in ('paid','payment_review') then
    if o.razorpay_payment_id<>p_payment then raise exception 'Order already has a different payment.'; end if;
    return o.status;
  end if;
  -- A late capture after release requires merchant reconciliation; its stock might
  -- already belong to another customer. Never fulfill that order automatically.
  result := case when o.status='reserved' and o.amount_minor=p_amount and o.currency=p_currency then 'paid' else 'payment_review' end;
  update public.orders set status=result,razorpay_payment_id=p_payment,paid_at=now() where id=o.id;
  return result;
end; $$;

revoke all on function public.reserve_checkout(uuid,uuid,jsonb,jsonb),public.expire_reservations(integer),
  public.claim_gateway(uuid,uuid),public.attach_gateway(uuid,uuid,text),public.record_capture(text,text,bigint,text,text)
  from public,anon,authenticated;
grant execute on function public.reserve_checkout(uuid,uuid,jsonb,jsonb),public.expire_reservations(integer),
  public.claim_gateway(uuid,uuid),public.attach_gateway(uuid,uuid,text),public.record_capture(text,text,bigint,text,text) to service_role;

create function public.admin_save_product(payload jsonb) returns text
language plpgsql set search_path='' as $$
declare key text := payload->>'id'; v jsonb; touched integer;
begin
  if key is null or length(key) not between 1 and 180 or length(trim(coalesce(payload->>'name',''))) not between 1 and 300
    or length(trim(coalesce(payload->>'category',''))) not between 1 and 150
    or jsonb_typeof(payload->'published') is distinct from 'boolean'
    or jsonb_typeof(payload->'variants') is distinct from 'array' then raise exception 'Invalid product details.'; end if;
  if jsonb_array_length(payload->'variants')>100 then raise exception 'Too many variants.'; end if;
  if exists (select 1 from jsonb_array_elements(payload->'variants') a group by trim(a->>'sku') having count(*)>1)
    then raise exception 'Each SKU must be unique.'; end if;
  insert into public.products(id,name,category,description,image_url,published)
    values(key,trim(payload->>'name'),trim(payload->>'category'),coalesce(payload->>'description',''),coalesce(payload->>'image_url',''),(payload->>'published')::boolean)
    on conflict(id) do update set name=excluded.name,category=excluded.category,description=excluded.description,
    image_url=excluded.image_url,published=excluded.published;
  perform 1 from public.product_variants where product_id=key order by sku for update;
  for v in select value from jsonb_array_elements(payload->'variants') order by value->>'sku' loop
    if length(trim(coalesce(v->>'sku',''))) not between 1 and 128 or length(trim(coalesce(v->>'size',''))) not between 1 and 160
      or coalesce(v->>'currency','')<>'INR' or jsonb_typeof(v->'enabled') is distinct from 'boolean'
      or coalesce(v->>'stock','') !~ '^[0-9]{1,9}$' or (v->>'price_minor') !~ '^[0-9]{1,10}$'
      then raise exception 'Invalid variant details.'; end if;
    if v ? 'original_stock' and exists (select 1 from public.product_variants where sku=trim(v->>'sku') and stock is distinct from (v->>'original_stock')::integer) then
      raise exception 'Stock changed while you were editing. Reload the product and try again.';
    end if;
    insert into public.product_variants(sku,product_id,size,price_minor,currency,stock,enabled,image_url)
      values(trim(v->>'sku'),key,trim(v->>'size'),nullif((v->>'price_minor')::integer,0),'INR',(v->>'stock')::integer,(v->>'enabled')::boolean,coalesce(v->>'image_url',''))
      on conflict(sku) do update set size=excluded.size,price_minor=excluded.price_minor,stock=excluded.stock,
        enabled=excluded.enabled,image_url=excluded.image_url where public.product_variants.product_id=key;
    get diagnostics touched = row_count;
    if touched<>1 then raise exception 'This SKU already belongs to another product.'; end if;
  end loop;
  update public.product_variants set enabled=false where product_id=key and not exists
    (select 1 from jsonb_array_elements(payload->'variants') a where trim(a->>'sku')=sku);
  return key;
end; $$;
revoke all on function public.admin_save_product(jsonb) from public,anon,authenticated;
grant execute on function public.admin_save_product(jsonb) to service_role;

commit;
