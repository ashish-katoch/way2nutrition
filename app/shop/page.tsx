import {Catalog} from '@/components/products';
export default async function Shop({searchParams}:{searchParams:Promise<{category?:string}>}){const {category}=await searchParams;return <Catalog initialCategory={category||''}/>;}
