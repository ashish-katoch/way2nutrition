import type {Metadata} from 'next';
import {getProducts} from '@/lib/store';
import {notFound} from 'next/navigation';
import ProductDetail from '@/components/product-detail';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{const {id}=await params,p=(await getProducts()).find(p=>p.id===id);return p?{title:p.name,description:p.description.slice(0,160),alternates:{canonical:'/product/'+encodeURIComponent(id)}}:{title:'Product not found',robots:{index:false}};}
export default async function ProductPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params,products=await getProducts(),product=products.find(p=>p.id===id);if(!product)notFound();
 const related=[...products.filter(p=>p.id!==id&&p.category===product.category),...products.filter(p=>p.id!==id&&p.category!==product.category)].slice(0,3);
 return <ProductDetail product={product} related={related}/>;
}
