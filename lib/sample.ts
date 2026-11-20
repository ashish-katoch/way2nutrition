import type { Product } from './types';
const entries=[
 ['sample-vitamin-c','Sample Vitamin C','Vitamins','206','60 tablets',49900],
 ['sample-magnesium','Sample Magnesium','Minerals','256','90 tablets',79900],
 ['sample-omega','Sample Omega-3','Other supplements','314','30 softgels',59900],
 ['sample-mens','Sample Men’s Formula','Men’s formulas','206','60 tablets',89900],
 ['sample-womens','Sample Women’s Formula','Women’s formulas','256','60 tablets',89900],
 ['sample-daily','Sample Daily Omega-3','Other supplements','314','30 softgels',99900]
] as const;
export const sampleProducts: Product[]=entries.map(([id,name,category,image,size,price])=>({
 id,name,category,description:'Demonstration product with a sample INR price. Replace this listing with your actual product, photo, selling price, and stock before opening the store.',
 image_url:'/assets/products/'+image+'.webp',published:true,
 variants:[{sku:id+'-standard',size,price_minor:price,currency:'INR',stock:20,enabled:true}]
}));
