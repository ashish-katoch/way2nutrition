'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useAuth} from './auth-context';
export default function AuthCallback(){
 const {client,ready,error}=useAuth(),started=useRef(false),[problem,setProblem]=useState('');
 useEffect(()=>{if(!ready||!client||started.current)return;started.current=true;
  const params=new URLSearchParams(location.search),providerError=params.get('error_description')||new URLSearchParams(location.hash.slice(1)).get('error_description');
  if(providerError){setProblem(providerError);return;}
  const code=params.get('code');
  if(!code){setProblem('This confirmation link is incomplete. Return to sign in or request a fresh link.');return;}
  client.auth.exchangeCodeForSession(code).then(({error})=>{if(error)setProblem('This link is invalid, expired, or was opened in a different browser. Please sign in or request a new link.');else location.replace('/account');});
 },[client,ready]);
 return <section className="page account-callback"><span className="eyebrow">Your Way2Nutrition account</span><h1>{problem||error?'Let’s try again.':'Finishing sign-in…'}</h1>{problem||error?<><p role="alert">{problem||error}</p><Link className="button" href="/account/login">Return to sign in</Link></>:<p role="status">Confirming your session securely.</p>}</section>;
}
