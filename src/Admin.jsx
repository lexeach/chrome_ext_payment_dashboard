import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ShieldCheck, Users, CreditCard, FileText, RefreshCw, LogOut, Search, LockKeyhole, CircleDollarSign } from 'lucide-react';
import './admin.css';

const API_DEFAULT = 'https://autofill-payment-backend-fork.onrender.com';
function AdminApp() {
  const [api, setApi] = useState(localStorage.getItem('adminApi') || API_DEFAULT);
  const [token, setToken] = useState(sessionStorage.getItem('adminToken') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState('');

  async function request(path, options={}) {
    const response = await fetch(api.replace(/\/$/,'') + path, {
      ...options,
      headers: { 'Content-Type':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {}), ...(options.headers||{}) }
    });
    const data = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  }
  async function loadAll() {
    const [s,u,p,o] = await Promise.all([
      request('/api/admin/stats'), request('/api/admin/users?limit=200'),
      request('/api/admin/profiles?limit=300'), request('/api/admin/orders?limit=300')
    ]);
    setStats(s); setUsers(u.users||[]); setProfiles(p.profiles||[]); setOrders(o.orders||[]);
  }
  useEffect(() => {
    if (!token) return;
    loadAll().catch(e => { setError(e.message); if (/session|admin login|required|invalid/i.test(e.message)) { sessionStorage.removeItem('adminToken'); setToken(''); } });
  }, [token]);
  async function login(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      localStorage.setItem('adminApi',api);
      const r = await fetch(api.replace(/\/$/,'')+'/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email.trim(),password})});
      const data = await r.json().catch(()=>({}));
      if (!r.ok) throw new Error(data.error || `Login failed (${r.status})`);
      sessionStorage.setItem('adminToken',data.token); setToken(data.token); setPassword('');
    } catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  function logout() { sessionStorage.removeItem('adminToken'); setToken(''); setStats(null); setUsers([]); setProfiles([]); setOrders([]); setError(''); }
  const filteredUsers = useMemo(()=>users.filter(x=>`${x.email} ${x.id}`.toLowerCase().includes(query.toLowerCase())),[users,query]);
  const filteredProfiles = useMemo(()=>profiles.filter(x=>`${x.name} ${x.user_email} ${x.id}`.toLowerCase().includes(query.toLowerCase())),[profiles,query]);
  const filteredOrders = useMemo(()=>orders.filter(x=>`${x.profile_name} ${x.user_email} ${x.order_id} ${x.status}`.toLowerCase().includes(query.toLowerCase())),[orders,query]);
  const refresh = async()=>{setBusy(true);setError('');try{await loadAll()}catch(e){setError(e.message)}finally{setBusy(false)}};
  async function manuallyActivate(profile) {
    if (profile.is_active) return;
    if (!window.confirm(`Manually activate "${profile.name}" for ${profile.user_email}? This bypasses online payment.`)) return;
    setBusy(true); setError('');
    try {
      await request(`/api/admin/profiles/${encodeURIComponent(profile.id)}/activate`, { method:'POST', body: JSON.stringify({}) });
      await loadAll();
    } catch(e) { setError(e.message); }
    finally { setBusy(false); }
  }

  if (!token) return <main className="admin-auth-shell"><form className="admin-auth-card" onSubmit={login}>
    <div className="admin-brand-mark"><ShieldCheck size={26}/></div><p className="admin-eyebrow">AUTOFILL CONSOLE</p><h1>Admin sign in</h1>
    <p className="admin-muted">Restricted access. Use the administrator credentials configured on the backend.</p>
    <label>Admin email<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@example.com"/></label>
    <label>Admin password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
    <details><summary>Backend URL</summary><input value={api} onChange={e=>setApi(e.target.value)} required/><small>Usually the deployed Render backend URL.</small></details>
    <button className="admin-primary" disabled={busy}>{busy?'Signing in…':'Sign in securely'}</button>{error&&<p className="admin-error">{error}</p>}
  </form></main>;
  return <div className="admin-layout">
    <aside className="admin-sidebar"><div className="admin-brand"><span className="admin-brand-mark small">AF</span><div><b>Autofill Console</b><small>Administration</small></div></div>
      <button className={tab==='overview'?'selected':''} onClick={()=>{setTab('overview');setQuery('')}}><ShieldCheck size={17}/> Overview</button>
      <button className={tab==='users'?'selected':''} onClick={()=>{setTab('users');setQuery('')}}><Users size={17}/> Users</button>
      <button className={tab==='profiles'?'selected':''} onClick={()=>{setTab('profiles');setQuery('')}}><FileText size={17}/> Profiles</button>
      <button className={tab==='orders'?'selected':''} onClick={()=>{setTab('orders');setQuery('')}}><CreditCard size={17}/> Payments</button>
      <div className="admin-sidebar-bottom"><small>Admin session</small><button onClick={logout}><LogOut size={16}/> Log out</button></div>
    </aside>
    <main className="admin-main">
      <header className="admin-topbar"><div><p className="admin-eyebrow">SECURE WORKSPACE</p><h1>{({overview:'Overview',users:'User accounts',profiles:'Saved profiles',orders:'Payment orders'})[tab]}</h1></div><button className="admin-secondary" onClick={refresh} disabled={busy}><RefreshCw size={15}/> Refresh</button></header>
      {error&&<div className="admin-error-banner">{error}</div>}
      {tab==='overview'&&<><section className="admin-stats">
        <div><span><Users/></span><small>Total users</small><strong>{stats?.users??'—'}</strong></div>
        <div><span><FileText/></span><small>Total profiles</small><strong>{stats?.profiles??'—'}</strong></div>
        <div><span><CreditCard/></span><small>Payment orders</small><strong>{stats?.orders??'—'}</strong></div>
        <div><span><CircleDollarSign/></span><small>Verified payments</small><strong>{stats?.paidOrders??'—'}</strong><small>₹{((stats?.paidAmountPaise||0)/100).toLocaleString('en-IN')}</small></div>
      </section><section className="admin-panel"><h2>Admin panel ready</h2><p>Use the sections on the left to review registered accounts, profile metadata and payment order status.</p><p className="admin-note"><LockKeyhole size={16}/> Profile field contents are intentionally excluded from the admin profile list.</p></section></>}
      {tab!=='overview'&&<section className="admin-panel"><div className="admin-table-head"><div><h2>{tab==='users'?'Registered users':tab==='profiles'?'Profile records':'Payment history'}</h2><p className="admin-muted">Showing latest records returned by the backend.</p></div><div className="admin-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search records…"/></div></div>
      <div className="admin-table-wrap"><table><thead><tr>{tab==='users'?<><th>Email</th><th>Status</th><th>Created</th><th>User ID</th></>:tab==='profiles'?<><th>Profile</th><th>Owner</th><th>Fields</th><th>Status</th><th>Created</th><th>Action</th></>:<><th>Order / Payment ID</th><th>Account</th><th>Profile</th><th>Amount</th><th>Status</th><th>Created</th></>}</tr></thead><tbody>
      {tab==='users'&&filteredUsers.map(x=><tr key={x.id}><td>{x.email}</td><td><span className={x.active?'admin-pill good':'admin-pill'}>{x.active?'Active':'Inactive'}</span></td><td>{x.created_at?new Date(x.created_at).toLocaleString():'—'}</td><td className="admin-id">{x.id}</td></tr>)}
      {tab==='profiles'&&filteredProfiles.map(x=><tr key={x.id}><td>{x.name}</td><td>{x.user_email}</td><td>{x.field_count}</td><td><span className={x.is_active?'admin-pill good':'admin-pill danger-pill'}>{x.is_active?'Activated':'Not activated'}</span><small>{x.activation_method==='admin'?'Manual admin activation':x.activation_method==='payment'?'Payment verified':''}</small></td><td>{x.created_at?new Date(x.created_at).toLocaleString():'—'}</td><td>{x.is_active?<span className="admin-pill good">Active</span>:<button className="admin-activate-btn" disabled={busy} onClick={()=>manuallyActivate(x)}>Activate manually</button>}</td></tr>)}
      {tab==='orders'&&filteredOrders.map(x=><tr key={x.order_id}><td><span className="admin-id">{x.order_id}</span><small>{x.payment_id||'Payment not recorded'}</small></td><td>{x.user_email}</td><td>{x.profile_name||'—'}</td><td>₹{(Number(x.amount_paise||0)/100).toLocaleString('en-IN')}</td><td><span className={x.status==='paid'?'admin-pill good':'admin-pill'}>{x.status}</span></td><td>{x.created_at?new Date(x.created_at).toLocaleString():'—'}</td></tr>)}
      {((tab==='users'&&!filteredUsers.length)||(tab==='profiles'&&!filteredProfiles.length)||(tab==='orders'&&!filteredOrders.length))&&<tr><td colSpan="6" className="admin-empty">No matching records found.</td></tr>}
      </tbody></table></div></section>}
    </main>
  </div>;
}
createRoot(document.getElementById('admin-root')).render(<AdminApp/>);
