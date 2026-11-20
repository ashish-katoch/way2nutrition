-- Run inside a disposable Supabase database after schema.sql and seed.sql.
begin;
do $$
declare
  first_id uuid := gen_random_uuid(); second_id uuid := gen_random_uuid();
  cust jsonb := '{"email":"buyer@example.test"}'; bag jsonb := '[{"sku":"sample-vitamin-c-standard","quantity":2}]';
  first_order public.orders; replay public.orders; second_order public.orders; lease uuid:=gen_random_uuid(); qty integer;
  before_stock integer; result text;
begin
  if has_function_privilege('anon','public.reserve_checkout(uuid,uuid,jsonb,jsonb)','execute') or
     has_function_privilege('authenticated','public.admin_save_product(jsonb)','execute') or
     has_column_privilege('authenticated','public.orders','status','update') then raise exception 'Private grants exposed.'; end if;
  select stock into before_stock from public.product_variants where sku='sample-vitamin-c-standard';
  first_order := public.reserve_checkout(first_id,null,cust,bag);
  replay := public.reserve_checkout(first_id,null,cust,bag);
  if replay.id<>first_order.id or first_order.amount_minor<>99800 then raise exception 'Checkout replay or total incorrect.'; end if;
  begin
    perform public.reserve_checkout(first_id,null,cust,'[{"sku":"sample-vitamin-c-standard","quantity":1}]');
    raise exception using errcode='P0004', message='Reused changed cart.';
  exception when raise_exception then null; end;
  begin
    perform public.reserve_checkout(gen_random_uuid(),null,cust,'[{"sku":"sample-vitamin-c-standard","quantity":1},{"sku":"zz-missing","quantity":1}]');
    raise exception using errcode='P0004', message='Invalid SKU reserved.';
  exception when raise_exception then null; end;
  if (select stock from public.product_variants where sku='sample-vitamin-c-standard')<>before_stock-2 then raise exception 'Stock counted twice or partial cart committed.'; end if;
  perform public.claim_gateway(first_order.id,lease);
  begin
    perform public.claim_gateway(first_order.id,gen_random_uuid());
    raise exception using errcode='P0004', message='Lease double claim.';
  exception when raise_exception then null; end;
  perform public.attach_gateway(first_order.id,lease,'order_testing');
  result := public.record_capture('order_testing','pay_testing',99800,'INR','eventA');
  if result<>'paid' or public.record_capture('order_testing','pay_testing',99800,'INR','eventA')<>'paid' then raise exception 'Payment did not settle.'; end if;
  if public.record_capture('order_testing','pay_testing',99800,'INR','eventB')<>'paid' then raise exception 'Two captures for same payment.'; end if;
  second_order := public.reserve_checkout(second_id,null,cust,bag);
  perform public.claim_gateway(second_order.id,lease);
  perform public.attach_gateway(second_order.id,lease,'order_late');
  update public.orders set expires_at=now()-interval '1 minute' where id=second_order.id;
  if public.expire_reservations()<>1 or public.expire_reservations()<>0 then raise exception 'Release not idempotent.'; end if;
  if public.record_capture('order_late','pay_late',99800,'INR','eventC')<>'payment_review' then raise exception 'Late payment did not enter review.'; end if;
  if (select stock from public.product_variants where sku='sample-vitamin-c-standard')<>before_stock-2 then raise exception 'Released stock incorrect.'; end if;
  perform public.admin_save_product('{"id":"new-product","name":"New","category":"Test","published":true,"variants":[{"sku":"new-sku","size":"Small","price_minor":123,"currency":"INR","stock":3,"enabled":true}]}');
  begin
    perform public.admin_save_product('{"id":"other-product","name":"Other","category":"Test","published":true,"variants":[{"sku":"new-sku","size":"Large","price_minor":123,"currency":"INR","stock":4,"enabled":true}]}');
    raise exception using errcode='P0004', message='SKU reused on another product.';
  exception when raise_exception then null; end;
  if exists(select 1 from public.products where id='other-product') then raise exception 'Partial admin save committed.'; end if;
  perform public.admin_save_product('{"id":"new-product","name":"New","category":"Test","published":true,"variants":[]}');
  if (select enabled from public.product_variants where sku='new-sku') then raise exception 'Missing SKU not disabled.'; end if;
end; $$;
set local role anon;
do $$ begin
  if (select count(*) from public.products) < 6 or (select count(*) from public.product_variants) < 6 then raise exception 'Catalog RLS denied shopper.'; end if;
end; $$;
rollback;
