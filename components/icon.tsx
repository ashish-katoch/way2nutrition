export default function Icon({name}:{name:string}){
 const paths:Record<string,string>={user:'M20 21v-2a6 6 0 0 0-12 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',search:'m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',heart:'M20 5a5 5 0 0 0-7 0l-1 1-1-1a5 5 0 0 0-7 7l8 8 8-8a5 5 0 0 0 0-7Z',bag:'M5 8h14l1 13H4L5 8ZM8 8V6a4 4 0 0 1 8 0v2',menu:'M3 9h18M3 15h18',close:'m5 5 14 14M5 19 19 5',arrow:'M5 19 19 5M5 5h14v14',down:'m6 9 6 6 6-6'};
 return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]||paths.arrow}/></svg>;
}
