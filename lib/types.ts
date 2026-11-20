export type Variant = {sku:string;product_id?:string;size:string;price_minor:number;currency:string;stock:number;enabled:boolean;image_url?:string};
export type Product = {id:string;name:string;category:string;description:string;image_url:string;published:boolean;variants:Variant[]};
export type BagItem = {id:string;sku:string;quantity:number};
