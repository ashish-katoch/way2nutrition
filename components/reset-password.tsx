'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useAuth} from './auth-context';
export default function ResetPassword(){
 const {client,ready,error}=useAuth(),started=useRef(false),[allowed,setAllowed]=useState(false),[problem,setProblem]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false);
 useEffect(()=>{if(!ready||!client||started.current)return;started.current=true;
  const params=new URLSearchParams(location.search),code=params.get('code');
  if(!code){setProblem('Open the password-reset link from your email in the browser where you requested it.');return;}
  client.auth.exchangeCodeForSession(code).then(({error})=>{if(error)setProblem('This reset link is invalid or expired. Request a new link.');else{setAllowed(true);history.replaceState(null,'','/account/reset-password');}});
 },[client,ready]);
 async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(!client||!allowed)return;const data=new FormData(event.currentTarget),password=String(data.get('password')||'');if(password!==data.get('confirm')){setProblem('The passwords do not match.');return;}setBusy(true);setProblem('');try{const {error}=await client.auth.updateUser({password});if(error)throw error;setDone(true);setAllowed(false);}catch(e){setProblem(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}}
 return <section className="page account-callback"><div className="account-auth-card"><span className="eyebrow">A fresh start</span><h1>{done?'Password updated.':'Choose a new password.'}</h1>{done?<><p>Your new password is ready.</p><Link className="button" href="/account">Go to your account</Link></>:allowed?<form onSubmit={submit}><label>New password<input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password"/></label><label>Confirm new password<input name="confirm" type="password" required minLength={8} maxLength={128} autoComplete="new-password"/></label><button className="button" disabled={busy}>{busy?'Updating…':'Update password'}</button></form>:!problem&&!error?<p role="status">Checking your reset link…</p>:null}{(problem||error)&&<p role="alert" className="account-error">{problem||error}</p>}{!done&&<Link className="account-switch" href="/account/forgot-password">Request a new reset link</Link>}</div></section>;
}
