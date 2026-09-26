import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { adminCreateDreamVoraNotification, adminListDreamVoraNotifications, adminListDreamVoraPayments, adminListDreamVoraUsers, adminLoginDreamVora, adminSetDreamVoraAccountActive, adminSetDreamVoraPaymentStatus } from "@/lib/dreamvora.server";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — DreamVora" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminPage,
});

type Payment = { id:string; phone_used:string; amount:number; lipa_number:string; status:string; submitted_at:string; approved_at:string|null; balance_credited:boolean; name:string; username:string; account_phone:string; email:string; account_paid:boolean; account_active:boolean; account_balance:number; account_earnings:number };
type AdminNotification = { id:string; title:string; message:string; active:boolean; createdAt:string };
type AdminUser = { id:string; name:string; username:string; phone:string; email:string; country:string; paid:boolean; accountActive:boolean; balance:number; earnings:number; createdAt:string };

function AdminPage(){
  const [password,setPassword]=useState(""); const [token,setToken]=useState<string|null>(()=>typeof window!=="undefined"?sessionStorage.getItem("dreamvora_admin"):null);
  const [payments,setPayments]=useState<Payment[]>([]); const [users,setUsers]=useState<AdminUser[]>([]); const [notifications,setNotifications]=useState<AdminNotification[]>([]); const [error,setError]=useState<string|null>(null); const [busy,setBusy]=useState<string|null>(null);
  const [title,setTitle]=useState(""); const [message,setMessage]=useState(""); const [sending,setSending]=useState(false); const [sent,setSent]=useState<string|null>(null);
  const [showPayments,setShowPayments]=useState(false); const [showUsers,setShowUsers]=useState(false);
  const [paymentSearch,setPaymentSearch]=useState(""); const [userSearch,setUserSearch]=useState("");

  async function login(e:React.FormEvent){e.preventDefault();setError(null);try{const r=await adminLoginDreamVora({data:{password}});sessionStorage.setItem("dreamvora_admin",r.token);setToken(r.token);setPassword("");}catch(err){setError(err instanceof Error?err.message:"Admin login imeshindikana.")}}
  async function load(){if(!token)return;try{const [p,u,n]=await Promise.all([adminListDreamVoraPayments({data:{token}}),adminListDreamVoraUsers({data:{token}}),adminListDreamVoraNotifications({data:{token}})]);setPayments(p.payments as Payment[]);setUsers(u.users as AdminUser[]);setNotifications(n.notifications as AdminNotification[]);setError(null)}catch(err){setError(err instanceof Error?err.message:"Imeshindikana kupakia admin data.")}}
  useEffect(()=>{void load(); if(!token)return; const t=window.setInterval(()=>void load(),15000); return()=>window.clearInterval(t)},[token]);
  async function setStatus(id:string,status:"APPROVED"|"REJECTED"){if(!token)return;setBusy(id);setError(null);try{const result=await adminSetDreamVoraPaymentStatus({data:{token,paymentId:id,status}});if(status==="APPROVED" && result.activated !== true) throw new Error("Malipo yamebadilishwa lakini activation ya account haikukamilika.");await load()}catch(err){setError(err instanceof Error?err.message:"Imeshindikana kubadili status.")}finally{setBusy(null)}}
  async function toggleAccount(userId:string, active:boolean){if(!token)return;setBusy(userId);setError(null);try{await adminSetDreamVoraAccountActive({data:{token,userId,active}});await load()}catch(err){setError(err instanceof Error?err.message:"Imeshindikana kubadili account.")}finally{setBusy(null)}}
  async function createNotification(e:React.FormEvent){e.preventDefault();if(!token)return;setSending(true);setSent(null);setError(null);try{await adminCreateDreamVoraNotification({data:{token,title,message}});setTitle("");setMessage("");setSent("Notification imetumwa kwa dashboard za users.");await load()}catch(err){setError(err instanceof Error?err.message:"Notification haikutumwa.")}finally{setSending(false)}}

  const filteredPayments = useMemo(() => {
    const q = paymentSearch.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) => [p.name,p.username,p.phone_used,p.account_phone,p.email].some((value) => value?.toLowerCase().includes(q)));
  }, [payments,paymentSearch]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => [u.name,u.username,u.phone,u.email].some((value) => value?.toLowerCase().includes(q)));
  }, [users,userSearch]);

  if(!token)return <main className="min-h-screen bg-k-slate-50 flex items-center justify-center p-4"><form onSubmit={login} className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl"><h1 className="text-2xl font-extrabold text-k-slate-900">DreamVora Admin</h1><p className="mt-2 text-sm text-k-slate-500">Ingia kusimamia malipo na notifications.</p>{error&&<div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}<input className="k-field mt-5" type="password" placeholder="Admin password" value={password} onChange={e=>setPassword(e.target.value)} required/><button className="k-btn mt-3" type="submit">Ingia Admin</button></form></main>;

  return <main className="min-h-screen bg-k-slate-50 p-4 md:p-8"><div className="mx-auto max-w-6xl"><div className="flex items-center justify-between gap-3"><div><h1 className="text-2xl font-extrabold text-k-slate-900">DreamVora Admin</h1><p className="text-sm text-k-slate-500">Simamia malipo na ujumbe wa dashboard.</p></div><button onClick={()=>{sessionStorage.removeItem("dreamvora_admin");setToken(null)}} className="rounded-xl bg-k-slate-900 px-4 py-2 text-sm font-bold text-white">Toka</button></div>{error&&<div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}

    <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm"><h2 className="text-lg font-extrabold text-k-slate-900">Tuma Notification kwa Users</h2><p className="mt-1 text-xs text-k-slate-500">Itaonekana juu ya Welcome kwenye Dashboard ya user mpaka a-dismiss.</p><form onSubmit={createNotification} className="mt-4 grid gap-3"><input className="k-field" maxLength={100} placeholder="Kichwa, mfano: Tangazo la leo" value={title} onChange={e=>setTitle(e.target.value)} required/><textarea className="k-field min-h-28 resize-y" maxLength={500} placeholder="Andika ujumbe wa notification..." value={message} onChange={e=>setMessage(e.target.value)} required/><div className="flex items-center gap-3"><button disabled={sending} className="k-btn-green disabled:opacity-60" type="submit">{sending?"Inatuma...":"Tuma Notification"}</button>{sent&&<span className="text-xs font-bold text-emerald-700">{sent}</span>}</div></form><div className="mt-5 space-y-2">{notifications.slice(0,5).map(n=><div key={n.id} className="rounded-2xl border border-k-slate-200 p-3"><div className="text-sm font-extrabold">{n.title}</div><div className="mt-1 text-xs text-k-slate-500">{n.message}</div><div className="mt-2 text-[10px] text-k-slate-400">{new Date(n.createdAt).toLocaleString("sw-TZ")}</div></div>)}</div></section>

    <section className="mt-6 space-y-3">
      <button type="button" onClick={()=>setShowUsers(v=>!v)} aria-expanded={showUsers} className="flex w-full items-center justify-between rounded-2xl bg-white px-5 py-4 text-left shadow-sm border border-k-slate-200 transition hover:bg-k-slate-50">
        <div><div className="text-lg font-extrabold text-k-slate-900">Account za User</div><div className="mt-1 text-xs text-k-slate-500">Activate au deactivate account za users.</div></div>
        <div className="flex items-center gap-3"><span className="rounded-full bg-k-slate-100 px-3 py-1 text-xs font-extrabold text-k-slate-700">{users.length}</span><ChevronDown className={`h-5 w-5 transition-transform ${showUsers?"rotate-180":""}`} /></div>
      </button>
      {showUsers&&<div className="rounded-3xl bg-white p-4 shadow-sm border border-k-slate-200">
        <div className="relative mb-4"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-k-slate-400"/><input className="k-field pl-10" value={userSearch} onChange={e=>setUserSearch(e.target.value)} placeholder="Search jina la user, username, simu au email..." /></div>
        {filteredUsers.length===0?<div className="rounded-2xl bg-k-slate-50 p-8 text-center text-sm text-k-slate-500">{userSearch.trim()?"Hakuna user anayelingana na search hiyo.":"Hakuna users bado."}</div>:<div className="space-y-3">{filteredUsers.map(u=><article key={u.id} className="rounded-2xl bg-k-slate-50 p-4 border border-k-slate-200"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><div className="font-extrabold text-k-slate-900">{u.name} <span className="font-normal text-k-slate-500">(@{u.username})</span></div><div className="mt-1 text-xs text-k-slate-500">{u.phone} • {u.email}</div><div className="mt-2 text-xs font-semibold">Payment: {u.paid?"PAID":"NOT PAID"} • Balance: TZS {u.balance.toLocaleString()}</div></div><div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-extrabold ${u.accountActive?"bg-emerald-100 text-emerald-800":"bg-red-100 text-red-800"}`}>{u.accountActive?"ACTIVE":"DEACTIVATED"}</span><button disabled={busy===u.id} onClick={()=>void toggleAccount(u.id,!u.accountActive)} className={`rounded-xl px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50 ${u.accountActive?"bg-red-600":"bg-emerald-600"}`}>{busy===u.id?"...":u.accountActive?"DEACTIVATE":"ACTIVATE"}</button></div></div></article>)}</div>}
        {userSearch.trim()&&<div className="mt-3 text-center text-xs font-semibold text-k-slate-500">Inaonyesha {filteredUsers.length} kati ya {users.length} users.</div>}
      </div>}
    </section>

    <section className="mt-3 space-y-3">
      <button type="button" onClick={()=>setShowPayments(v=>!v)} aria-expanded={showPayments} className="flex w-full items-center justify-between rounded-2xl bg-white px-5 py-4 text-left shadow-sm border border-k-slate-200 transition hover:bg-k-slate-50">
        <div><div className="text-lg font-extrabold text-k-slate-900">Malipo</div><div className="mt-1 text-xs text-k-slate-500">Angalia, search na simamia maombi ya malipo.</div></div>
        <div className="flex items-center gap-3"><span className="rounded-full bg-k-slate-100 px-3 py-1 text-xs font-extrabold text-k-slate-700">{payments.length}</span><ChevronDown className={`h-5 w-5 transition-transform ${showPayments?"rotate-180":""}`} /></div>
      </button>
      {showPayments&&<div className="rounded-3xl bg-white p-4 shadow-sm border border-k-slate-200">
        <div className="relative mb-2"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-k-slate-400"/><input className="k-field pl-10" value={paymentSearch} onChange={e=>setPaymentSearch(e.target.value)} placeholder="Search jina la user, username, simu au email..." /></div>
        <p className="mb-4 text-xs text-k-slate-500">Pending requests huonekana hapa na ukurasa hu-refresh kila sekunde 15.</p>
        {filteredPayments.length===0?<div className="rounded-2xl bg-k-slate-50 p-8 text-center text-sm text-k-slate-500">{paymentSearch.trim()?"Hakuna malipo yanayolingana na search hiyo.":"Hakuna maombi ya malipo bado."}</div>:<div className="space-y-3">{filteredPayments.map(p=><article key={p.id} className="rounded-2xl bg-k-slate-50 p-4 border border-k-slate-200"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><div className="font-extrabold text-k-slate-900">{p.name} <span className="font-normal text-k-slate-500">(@{p.username})</span></div><div className="mt-1 text-xs text-k-slate-500">Account: {p.account_phone} • Email: {p.email}</div><div className="mt-2 text-sm">Simu iliyotumika kulipia: <strong>{p.phone_used}</strong></div><div className="text-sm">Lipa Namba: <strong>{p.lipa_number}</strong> • Kiasi: <strong>TZS {p.amount.toLocaleString()}</strong></div><div className="mt-1 text-xs font-semibold text-k-slate-600">Account: {p.account_paid?"ACTIVE ✓":"NOT ACTIVE"} • Balance: TZS {Number(p.account_balance??0).toLocaleString()}</div><div className="mt-1 text-[11px] text-k-slate-400">{new Date(p.submitted_at).toLocaleString("sw-TZ")}</div></div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-extrabold ${p.status==="PENDING"?"bg-amber-100 text-amber-800":p.status==="APPROVED"?"bg-emerald-100 text-emerald-800":"bg-red-100 text-red-800"}`}>{p.status}</span>{p.status==="PENDING"&&<><button disabled={busy===p.id} onClick={()=>void setStatus(p.id,"APPROVED")} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50">{busy===p.id?"...":"APPROVE & ACTIVATE"}</button><button disabled={busy===p.id} onClick={()=>void setStatus(p.id,"REJECTED")} className="rounded-xl bg-red-600 px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50">REJECT</button></>}{p.status==="APPROVED"&&!p.account_paid&&<button disabled={busy===p.id} onClick={()=>void setStatus(p.id,"APPROVED")} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50">{busy===p.id?"...":"ACTIVATE ACCOUNT"}</button>}</div></div></article>)}</div>}
        {paymentSearch.trim()&&<div className="mt-3 text-center text-xs font-semibold text-k-slate-500">Inaonyesha {filteredPayments.length} kati ya {payments.length} malipo.</div>}
      </div>}
    </section>
  </div></main>
}
