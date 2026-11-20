import {reject} from './http';
export function validateProduct(value:unknown) {
 if(!value||typeof value!=='object')reject(400,'Product details are required.');
 const p=value as Record<string,unknown>;
 const text=(key:string,max:number,required=true)=>{
  const v=typeof p[key]==='string'?(p[key] as string).trim():'';
  if((required&&!v)||v.length>max)reject(400,'Check the product '+key+'.');return v;
 };
 const id=text('id',100);
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))reject(400,'Use lowercase letters, numbers, and hyphens for the product ID.');
 const image_url=text('image_url',2000,false);
 if(image_url&&!/^https:\/\//.test(image_url)&&!image_url.startsWith('/assets/'))reject(400,'Use an HTTPS product image.');
 if(!Array.isArray(p.variants)||!p.variants.length||p.variants.length>30)reject(400,'Add between 1 and 30 variants.');
 const skus=new Set<string>();
 const variants=p.variants.map((v:Record<string,unknown>)=>{
  if(!v||typeof v!=='object'||typeof v.sku!=='string'||!v.sku.trim()||v.sku.length>100||skus.has(v.sku))reject(400,'Each variant needs a unique SKU.');
  skus.add(v.sku);
  if(typeof v.size!=='string'||!v.size.trim()||v.size.length>120)reject(400,'Each variant needs a pack size.');
  if(!Number.isSafeInteger(v.price_minor)||Number(v.price_minor)<0||Number(v.price_minor)>100000000)reject(400,'Enter a valid price in paise.');
  if(!Number.isSafeInteger(v.stock)||Number(v.stock)<0||Number(v.stock)>1000000)reject(400,'Enter valid available stock.');
  if(v.original_stock!=null&&(!Number.isSafeInteger(v.original_stock)||Number(v.original_stock)<0))reject(400,'Reload the product before changing stock.');
  if(v.currency&&v.currency!=='INR')reject(400,'This store currently sells in INR.');
  return {sku:v.sku.trim(),size:v.size.trim(),price_minor:Number(v.price_minor),currency:'INR',stock:Number(v.stock),original_stock:v.original_stock==null?null:Number(v.original_stock),enabled:v.enabled!==false};
 });
 return {id,name:text('name',200),category:text('category',100),description:text('description',12000,false),image_url,published:p.published===true,variants};
}
