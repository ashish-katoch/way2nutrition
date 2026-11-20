'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useAuth} from './auth-context';
import {safeAccountNext} from '@/lib/browser-auth';
import Icon from './icon';
type Mode='login'|'signup'|'forgot';
export default function AuthForm({mode}:{mode:Mode}){
 const {client,ready,config,error}=useAuth();
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[problem,setProblem]=useState(''),[showPassword,setShowPassword]=useState(false);
 const next=()=>safeAccountNext(new URLSearchParams(location.search).get('next'));
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(!client)return;setBusy(true);setProblem('');setMessage('');const form=new FormData(event.currentTarget),email=String(form.get('email')||'').trim(),password=String(form.get('password')||'');
  try{
   if(mode==='login'){
    const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;location.assign(next());
   }else if(mode==='signup'){
    const name=String(form.get('name')||'').trim();
    const result=await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+'/auth/callback',data:{display_name:name}}});if(result.error)throw result.error;
    if(result.data.session)location.assign('/account');else setMessage('Check your email for a confirmation link. Once confirmed, you can sign in to your account.');
   }else{
    const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/account/reset-password'});if(error)throw error;
    setMessage('If an account exists for this email, a password-reset link will arrive shortly. Open it in this browser.');
   }
  }catch(e){setProblem(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}
 }
 async function google(){if(!client)return;setBusy(true);setProblem('');const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/auth/callback',queryParams:{prompt:'select_account'}}});if(error){setProblem(error.message);setBusy(false);}}
 const title=mode==='signup'?'Make yourself at home.':mode==='forgot'?'A fresh start.':'Welcome back.';
 return <section className="page account-auth-page"><div className="account-auth-intro"><span className="eyebrow">Your Way2Nutrition account</span><h1>{title}</h1><p>{mode==='signup'?'Keep your favorites, revisit products, and follow your orders in one place.':mode==='forgot'?'Enter your account email and we’ll send you a link to choose a new password.':'Your saved products, order history, and everyday essentials are waiting.'}</p><Link href="/shop" className="account-back">Explore the collection <Icon name="arrow"/></Link></div><div className="account-auth-card"><h2>{mode==='signup'?'Create an account':mode==='forgot'?'Reset your password':'Sign in'}</h2>{!ready?<p role="status">Preparing secure sign-in…</p>:error?<p role="alert" className="account-error">{error}</p>:<><form onSubmit={submit}>{mode==='signup'&&<label>Your name<input required name="name" autoComplete="name" maxLength={120}/></label>}<label>Email address<input required type="email" name="email" autoComplete="email" maxLength={254}/></label>{mode!=='forgot'&&<label>Password<div className="account-password"><input required name="password" type={showPassword?'text':'password'} autoComplete={mode==='signup'?'new-password':'current-password'} minLength={mode==='signup'?8:1} maxLength={128}/><button type="button" aria-label={showPassword?'Hide password':'Show password'} onClick={()=>setShowPassword(!showPassword)}>{showPassword?'Hide':'Show'}</button></div>{mode==='signup'&&<small>Use at least 8 characters.</small>}</label>}{mode==='login'&&<Link className="account-forgot" href="/account/forgot-password">Forgot password?</Link>}<button className="button" disabled={busy||!client}>{busy?'Please wait…':mode==='signup'?'Create account':mode==='forgot'?'Send reset link':'Sign in'}<Icon name="arrow"/></button></form>{mode!=='forgot'&&config?.googleEnabled&&<><div className="account-divider">or</div><button className="account-google" disabled={busy} onClick={google}><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.2h6a5.1 5.1 0 0 1-2.2 3.3v2.8h3.6c2.1-1.9 3.2-4.7 3.2-8.1Z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8a6.7 6.7 0 0 1-10-3.5H2.1v2.9A11.2 11.2 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.8 14a6.7 6.7 0 0 1 0-4V7.1H2.1a11.2 11.2 0 0 0 0 9.8L5.8 14Z"/><path fill="#EA4335" d="M12 5.3c1.6 0 3 .5 4.1 1.6l3.1-3.1A10.7 10.7 0 0 0 12 1a11.2 11.2 0 0 0-9.9 6.1L5.8 10A6.7 6.7 0 0 1 12 5.3Z"/></svg>Continue with Google</button></>}{message&&<p role="status" className="account-success">{message}</p>}{problem&&<p role="alert" className="account-error">{problem}</p>}</>}<p className="account-switch">{mode==='login'?<>New to Way2Nutrition? <Link href="/account/signup">Create an account</Link></>:<Link href="/account/login">Back to sign in</Link>}</p><p className="account-fine">Your account details stay private. <Link href="/privacy">Shopping privacy</Link></p></div></section>;
}
