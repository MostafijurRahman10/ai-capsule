import React from 'react';
import { Navigate, Route, Routes, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from './api.js';

const emptyCapsule = {
  project_name: '', prompt_title: '', prompt_version: 'v1', prompt_text: '',
  response_summary: '', category: 'Coding', usefulness: 'Good', reviewed: false,
  improved: false, screenshot_url: '', notes: ''
};

function Brand() {
  return <Link className="brand" to="/"><span className="brand-mark">AI</span><span>Capsule</span></Link>;
}

function Landing() {
  return <main className="landing">
    <nav><Brand /><Link className="button button-small" to="/login">Sign in</Link></nav>
    <section className="hero">
      <div className="eyebrow">YOUR PRIVATE PROMPT LIBRARY</div>
      <h1>Keep the prompts<br />worth using again.</h1>
      <p>Save useful AI prompts, record what worked, and improve each version in one focused workspace.</p>
      <Link className="button" to="/login">Continue with GitHub <span>→</span></Link>
      <div className="trust"><span>Secure OAuth</span><span>Private records</span><span>Simple versioning</span></div>
    </section>
    <section className="preview" aria-label="AI Capsule preview">
      <div className="preview-top"><span>Prompt collection</span><span className="pill">3 saved</span></div>
      <div className="preview-row"><span className="category-icon">⌘</span><div><strong>Debug cloud deployment</strong><small>SmartFarm · v2</small></div><span className="score good">Good</span></div>
      <div className="preview-row"><span className="category-icon">✦</span><div><strong>Refine research summary</strong><small>Data Ethics · v3</small></div><span className="score">Reviewed</span></div>
      <div className="preview-row"><span className="category-icon">Aa</span><div><strong>Improve technical explanation</strong><small>Portfolio · v1</small></div><span className="score good">Good</span></div>
    </section>
  </main>;
}

function Login() {
  const params = new URLSearchParams(location.search);
  return <main className="auth-page"><div className="auth-card"><Brand />
    <div className="auth-icon">↗</div><h1>Welcome back</h1>
    <p>Sign in to open your private prompt collection.</p>
    {params.get('error') && <div className="alert">GitHub sign-in did not complete. Please try again.</div>}
    <a className="button github" href="/auth/github"><span className="github-logo">●</span> Continue with GitHub</a>
    <Link className="text-link" to="/">← Back to home</Link>
  </div></main>;
}

function CapsuleForm({ initial, onSave, onCancel, busy }) {
  const [form, setForm] = useState(initial || emptyCapsule);
  const set = (name, value) => setForm(old => ({ ...old, [name]: value }));
  return <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="capsule-form">
    <div className="form-head"><div><span className="eyebrow">PROMPT RECORD</span><h2>{initial ? 'Edit capsule' : 'New capsule'}</h2></div><button type="button" className="icon-button" onClick={onCancel} aria-label="Close">×</button></div>
    <div className="form-grid">
      <label>Project name<input required value={form.project_name} onChange={e => set('project_name', e.target.value)} placeholder="e.g. SmartFarm Irrigation" /></label>
      <label>Prompt title<input required value={form.prompt_title} onChange={e => set('prompt_title', e.target.value)} placeholder="Short descriptive title" /></label>
      <label>Version<input value={form.prompt_version} onChange={e => set('prompt_version', e.target.value)} placeholder="v1" /></label>
      <label>Category<select value={form.category} onChange={e => set('category', e.target.value)}><option>Coding</option><option>Writing</option><option>Research</option><option>Study</option><option>Other</option></select></label>
    </div>
    <label>Prompt text<textarea required rows="5" value={form.prompt_text} onChange={e => set('prompt_text', e.target.value)} placeholder="Enter the prompt you want to save..." /></label>
    <label>Response summary<textarea rows="3" value={form.response_summary} onChange={e => set('response_summary', e.target.value)} placeholder="Summarise the AI response" /></label>
    <div className="form-grid">
      <label>Usefulness<select value={form.usefulness} onChange={e => set('usefulness', e.target.value)}><option>Good</option><option>Needs Improvement</option></select></label>
      <label>Screenshot evidence URL<input type="url" value={form.screenshot_url} onChange={e => set('screenshot_url', e.target.value)} placeholder="https://..." /></label>
    </div>
    <div className="checks"><label><input type="checkbox" checked={form.reviewed} onChange={e => set('reviewed', e.target.checked)} /> Response reviewed</label><label><input type="checkbox" checked={form.improved} onChange={e => set('improved', e.target.checked)} /> Output improved</label></div>
    <label>Notes<textarea rows="3" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Reflection or comments" /></label>
    <div className="form-actions"><button type="button" className="button secondary" onClick={onCancel}>Cancel</button><button className="button" disabled={busy}>{busy ? 'Saving...' : 'Save capsule'}</button></div>
  </form>;
}

function CapsuleCard({ item, onEdit, onDelete }) {
  return <article className="capsule-card">
    <div className="card-top"><span className="tag">{item.category || 'Uncategorised'}</span><span className={`score ${item.usefulness === 'Good' ? 'good' : 'warn'}`}>{item.usefulness || 'Unrated'}</span></div>
    <h3>{item.prompt_title}</h3><p className="project">{item.project_name} <span>·</span> {item.prompt_version || 'No version'}</p>
    <p className="prompt-text">{item.prompt_text}</p>
    {item.response_summary && <p className="summary"><strong>Response:</strong> {item.response_summary}</p>}
    <div className="status-row"><span className={item.reviewed ? 'done' : ''}>{item.reviewed ? '✓' : '○'} Reviewed</span><span className={item.improved ? 'done' : ''}>{item.improved ? '✓' : '○'} Improved</span></div>
    <div className="card-foot"><time>{new Date(item.created_at + 'Z').toLocaleDateString()}</time><div><button className="text-button" onClick={() => onEdit(item)}>Edit</button><button className="text-button danger" onClick={() => onDelete(item)}>Delete</button></div></div>
  </article>;
}

function Dashboard() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(undefined);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [me, capsules] = await Promise.all([api.me(), api.list()]);
      setUser(me); setItems(capsules);
    } catch (e) {
      if (e.status === 401) navigate('/login', { replace: true }); else setError(e.message);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async data => {
    setBusy(true); setError('');
    try {
      editing ? await api.update(editing.id, data) : await api.create(data);
      setShowForm(false); setEditing(undefined); await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const remove = async item => {
    if (!confirm(`Delete “${item.prompt_title}”? This cannot be undone.`)) return;
    try { await api.remove(item.id); setItems(old => old.filter(x => x.id !== item.id)); }
    catch (e) { setError(e.message); }
  };
  const logout = async () => { await api.logout(); navigate('/'); };

  if (loading) return <main className="loading">Opening your capsule...</main>;
  return <div className="app-shell">
    <header><Brand /><div className="user-menu"><span>@{user?.login}</span><button className="text-button" onClick={logout}>Sign out</button></div></header>
    <main className="dashboard"><section className="dashboard-head"><div><span className="eyebrow">PRIVATE WORKSPACE</span><h1>Your prompt capsules</h1><p>Save what worked. Improve what did not.</p></div><button className="button" onClick={() => { setEditing(undefined); setShowForm(true); }}>+ New capsule</button></section>
      {error && <div className="alert">{error}</div>}
      {items.length === 0 ? <section className="empty"><div className="empty-icon">✦</div><h2>Your collection is empty</h2><p>Create your first capsule and keep a useful prompt from getting lost.</p><button className="button" onClick={() => setShowForm(true)}>Create first capsule</button></section>
      : <section className="capsule-grid">{items.map(item => <CapsuleCard key={item.id} item={item} onEdit={x => { setEditing(x); setShowForm(true); }} onDelete={remove} />)}</section>}
    </main>
    {showForm && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false); }}><div className="modal"><CapsuleForm key={editing?.id || 'new'} initial={editing} onSave={save} onCancel={() => { setShowForm(false); setEditing(undefined); }} busy={busy} /></div></div>}
  </div>;
}

export default function App() {
  return <Routes><Route path="/" element={<Landing />} /><Route path="/login" element={<Login />} /><Route path="/dashboard" element={<Dashboard />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>;
}
