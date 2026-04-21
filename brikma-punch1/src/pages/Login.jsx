import { useState } from 'react'
import { supabase } from '../supabase'

const S = {
  page: { minHeight:'100vh', background:'#0f1923', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', fontFamily:"'Outfit',sans-serif" },
  card: { background:'#1a2a3a', border:'1px solid #2e4060', borderRadius:'14px', padding:'40px 36px', width:'100%', maxWidth:'420px', boxShadow:'0 20px 60px rgba(0,0,0,0.5)' },
  logoWrap: { textAlign:'center', marginBottom:'28px' },
  logo: { fontFamily:"'Bebas Neue',sans-serif", fontSize:'2rem', letterSpacing:'3px', color:'white', lineHeight:1 },
  sub: { fontSize:'0.72rem', color:'#c0623a', letterSpacing:'3px', textTransform:'uppercase', marginTop:'4px' },
  divider: { height:'4px', background:'linear-gradient(90deg,#c0623a,#3b82c4)', borderRadius:'2px', margin:'0 0 28px' },
  tabs: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'24px' },
  tab: (active) => ({ padding:'10px', borderRadius:'7px', border: active ? '2px solid #3b82c4' : '2px solid #2e4060', background: active ? 'rgba(59,130,196,0.15)' : 'transparent', color: active ? '#3b82c4' : '#6b7a8d', fontFamily:"'Outfit',sans-serif", fontSize:'0.85rem', fontWeight:'600', cursor:'pointer', transition:'all 0.2s' }),
  label: { display:'block', fontSize:'0.68rem', fontWeight:'700', letterSpacing:'1.5px', textTransform:'uppercase', color:'#6b7a8d', marginBottom:'6px' },
  input: { width:'100%', background:'#0f1923', border:'1.5px solid #2e4060', color:'white', borderRadius:'7px', padding:'11px 14px', fontFamily:"'Outfit',sans-serif", fontSize:'0.9rem', outline:'none', marginBottom:'16px' },
  btn: { width:'100%', background:'#c0623a', border:'none', color:'white', padding:'13px', borderRadius:'8px', fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.05rem', letterSpacing:'2px', cursor:'pointer', transition:'all 0.2s' },
  err: { background:'rgba(192,57,43,0.15)', border:'1px solid rgba(192,57,43,0.4)', color:'#e57373', borderRadius:'7px', padding:'10px 14px', fontSize:'0.82rem', marginBottom:'14px' },
  hint: { textAlign:'center', fontSize:'0.74rem', color:'#4a6080', marginTop:'16px' }
}

export default function Login({ onLogin }) {
  const [role, setRole] = useState('employe')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function handleLogin() {
    if (!code.trim()) { setErr('Entre ton code d\'accès'); return }
    setLoading(true); setErr('')
    try {
      if (role === 'patron') {
        const { data, error } = await supabase.from('patrons').select('*').eq('code_acces', code.trim().toUpperCase()).maybeSingle()
        if (data) {
          onLogin({ role: 'patron' }); return
        }
        // Si erreur Supabase (table absente, RLS, réseau) → fallback code hardcodé
        if (error && code.trim().toUpperCase() === 'BRIKMA2024') {
          onLogin({ role: 'patron' }); return
        }
        setErr('Code patron invalide')
      } else {
        const { data, error } = await supabase.from('employes').select('*').eq('code_acces', code.trim().toUpperCase()).eq('actif', true).maybeSingle()
        if (error) { setErr('Erreur de connexion') }
        else if (!data) { setErr('Code employé introuvable ou inactif') }
        else { onLogin({ role: 'employe', employe: data }); return }
      }
    } catch(e) {
      if (role === 'patron' && code.trim().toUpperCase() === 'BRIKMA2024') {
        onLogin({ role: 'patron' }); return
      }
      setErr('Erreur de connexion')
    }
    setLoading(false)
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logoWrap}>
          <div style={S.logo}>Brikma Construction Inc.</div>
          <div style={S.sub}>Feuille de temps</div>
        </div>
        <div style={S.divider}/>
        <div style={S.tabs}>
          <button style={S.tab(role==='employe')} onClick={()=>setRole('employe')}>👷 Employé</button>
          <button style={S.tab(role==='patron')} onClick={()=>setRole('patron')}>🏗 Patron</button>
        </div>
        {err && <div style={S.err}>⚠️ {err}</div>}
        <label style={S.label}>{role==='patron' ? 'Code patron' : 'Ton code employé'}</label>
        <input
          style={S.input}
          placeholder={role==='patron' ? 'ex: BRIKMA2024' : 'ex: EMP001'}
          value={code}
          onChange={e=>setCode(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&handleLogin()}
          autoCapitalize="characters"
        />
        <button style={S.btn} onClick={handleLogin} disabled={loading}>
          {loading ? 'CONNEXION...' : 'ENTRER →'}
        </button>
        <div style={S.hint}>RBQ : 5804-2102-01 · 438-998-2220</div>
      </div>
    </div>
  )
}
