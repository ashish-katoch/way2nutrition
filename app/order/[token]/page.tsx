import Receipt from '@/components/receipt';
export default async function OrderPage({params}:{params:Promise<{token:string}>}){const {token}=await params;return <Receipt token={token}/>;}
