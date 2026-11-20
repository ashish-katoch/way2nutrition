import {ImageResponse} from 'next/og';
export const alt='Way2Nutrition — Everyday wellness, thoughtfully chosen';
export const size={width:1200,height:630};
export const contentType='image/png';
export default function Image(){return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',justifyContent:'space-between',background:'#203b2b',color:'#f8f7ec',padding:75}}><div style={{fontSize:45}}>Way2Nutrition ↗</div><div style={{display:'flex',flexDirection:'column',fontSize:84,lineHeight:1.05,fontWeight:700}}>Good nature.<br/>Every day.</div><div style={{fontSize:27,color:'#dce7bf'}}>Explore NOW vitamins, minerals &amp; adult supplements.</div></div>,size);}
