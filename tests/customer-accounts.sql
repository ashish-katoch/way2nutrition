-- Disposable test database only, after schema + seed + customer migration.
begin;
insert into auth.users(id) values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
set local role authenticated;
set local request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
insert into public.customer_profiles(user_id,full_name) values(auth.uid(),'Customer One');
insert into public.customer_saved_products(user_id,product_id) values(auth.uid(),'sample-vitamin-c');
insert into public.customer_recent_products(user_id,product_id) values(auth.uid(),'sample-vitamin-c');
do $$ begin
 begin
  insert into public.customer_profiles(user_id,full_name) values('22222222-2222-4222-8222-222222222222','Forbidden');
  raise exception 'Cross-customer profile write succeeded';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.customer_saved_products(user_id,product_id) values('22222222-2222-4222-8222-222222222222','sample-vitamin-c');
  raise exception 'Cross-customer saved product write succeeded';
 exception when insufficient_privilege then null; end;
end $$;
set local request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
do $$ begin
 if exists(select 1 from public.customer_profiles) or exists(select 1 from public.customer_saved_products) or exists(select 1 from public.customer_recent_products) then raise exception 'Another customer can read private account data'; end if;
end $$;
set local role anon;
do $$ begin
 begin perform 1 from public.customer_profiles;raise exception 'Anonymous private read succeeded';exception when insufficient_privilege then null;end;
end $$;
rollback;
