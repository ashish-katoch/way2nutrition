-- Optional demonstration inventory. The six prices are sample INR prices in paise.
-- Reapplying the seed preserves merchant edits and existing reservations.
begin;
with sample(id,name,category,photo) as (values
 ('sample-vitamin-c','Sample Vitamin C','Vitamins','206'),
 ('sample-magnesium','Sample Magnesium','Minerals','256'),
 ('sample-omega','Sample Omega-3','Other supplements','314'),
 ('sample-mens','Sample Men’s Formula','Men’s formulas','206'),
 ('sample-womens','Sample Women’s Formula','Women’s formulas','256'),
 ('sample-daily','Sample Daily Omega-3','Other supplements','314')
)
insert into public.products(id,name,category,image_url,description,published)
 select id,name,category,'/assets/products/'||photo||'.webp',
 'Demonstration product with a sample INR price. Replace this listing with your actual product, photo, selling price, and stock before opening the store.',true from sample
 on conflict(id) do nothing;
with sample(id,size,price) as (values
 ('sample-vitamin-c','60 tablets',49900),('sample-magnesium','90 tablets',79900),
 ('sample-omega','30 softgels',59900),('sample-mens','60 tablets',89900),
 ('sample-womens','60 tablets',89900),('sample-daily','30 softgels',99900)
)
insert into public.product_variants(sku,product_id,size,price_minor,stock,enabled)
 select id||'-standard',id,size,price,20,true from sample on conflict(sku) do nothing;
commit;
