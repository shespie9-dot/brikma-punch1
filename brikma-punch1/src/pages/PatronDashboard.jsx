import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Soumission from './Soumission'
import Location from './Location'

const css = `
  :root{--navy:#1e3a5f;--blue:#2563a8;--blue2:#3b82c4;--brick:#c0623a;--green:#1a7a4a;--green2:#22a060;--orange:#d97706;--red:#c0392b;--yellow:#e6a817;--bg:#0f1923;--card:#1a2a3a;--border:#2e4060;--text:#e8edf2;--muted:#6b7a8d;}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:var(--bg);color:var(--text);font-family:'Outfit',sans-serif;}
  input,select,textarea{font-family:'Outfit',sans-serif;}
`

function StatutBadge({statut}){
  const cfg={soumis:{bg:'rgba(59,130,196,0.15)',color:'#3b82c4',txt:'Soumis'},approuve:{bg:'rgba(34,160,96,0.15)',color:'#22a060',txt:'Approuvé'},refuse:{bg:'rgba(192,57,43,0.15)',color:'#e57373',txt:'Refusé'}}
  const c=cfg[statut]||cfg.soumis
  return <span style={{background:c.bg,color:c.color,padding:'3px 10px',borderRadius:'4px',fontSize:'0.75rem',fontWeight:'700',letterSpacing:'1px'}}>{c.txt}</span>
}

function TypePaieBadge({type}){
  const cfg={ccq:{bg:'rgba(230,168,23,0.15)',color:'#e6a817',txt:'CCQ'},hors_decret:{bg:'rgba(59,130,196,0.1)',color:'#8fa8c8',txt:'Hors décret'},mixte:{bg:'rgba(160,100,220,0.15)',color:'#b088e8',txt:'CCQ + HD'}}
  const c=cfg[type]||cfg.hors_decret
  return <span style={{background:c.bg,color:c.color,padding:'2px 8px',borderRadius:'4px',fontSize:'0.7rem',fontWeight:'700',letterSpacing:'1px'}}>{c.txt}</span>
}

export default function PatronDashboard({onLogout}){
  const [feuilles,setFeuilles]=useState([])
  const [employes,setEmployes]=useState([])
  const [selected,setSelected]=useState(null)
  const [jours,setJours]=useState([])
  const [loading,setLoading]=useState(true)
  const [view,setView]=useState('dashboard') // dashboard | detail | employes
  const [filtreSemaine,setFiltreSemaine]=useState('')
  const [filtreEmploye,setFiltreEmploye]=useState('')
  const [filtreStatut,setFiltreStatut]=useState('')
  const [notePatron,setNotePatron]=useState('')

  // Nouvel employé
  const [newEmp,setNewEmp]=useState({nom:'',code_acces:'',poste:'',type_paie:'hors_decret',taux_regulier:0,taux_ot:0,taux_ccq:0})
  const [empLoading,setEmpLoading]=useState(false)
  const [empMsg,setEmpMsg]=useState('')

  useEffect(()=>{fetchAll()},[])

  async function fetchAll(){
    setLoading(true)
    const {data:f}=await supabase.from('feuilles_temps').select('*').order('submitted_at',{ascending:false})
    const {data:e}=await supabase.from('employes').select('*').order('nom')
    setFeuilles(f||[])
    setEmployes(e||[])
    setLoading(false)
  }

  async function openDetail(f){
    setSelected(f); setNotePatron(f.note_patron||'')
    const {data}=await supabase.from('jours_travail').select('*').eq('feuille_id',f.id).order('jour_date')
    setJours(data||[])
    setView('detail')
  }

  async function changerStatut(id,statut){
    const {error}=await supabase.from('feuilles_temps').update({statut,note_patron:notePatron,approved_at:statut==='approuve'?new Date().toISOString():null}).eq('id',id)
    if(error){alert('Erreur approbation: '+error.message);return}
    setSelected(prev=>({...prev,statut,note_patron:notePatron}))
    fetchAll()
  }

  async function ajouterEmploye(){
    if(!newEmp.nom||!newEmp.code_acces){setEmpMsg('Nom et code requis');return}
    setEmpLoading(true); setEmpMsg('')
    const {error}=await supabase.from('employes').insert({...newEmp,code_acces:newEmp.code_acces.toUpperCase(),actif:true})
    if(error) setEmpMsg('Erreur: '+(error.message.includes('unique')?'Ce code existe déjà':error.message))
    else{setEmpMsg('✅ Employé ajouté!');setNewEmp({nom:'',code_acces:'',poste:'',type_paie:'hors_decret',taux_regulier:0,taux_ot:0,taux_ccq:0});fetchAll()}
    setEmpLoading(false)
  }

  async function toggleActif(emp){
    await supabase.from('employes').update({actif:!emp.actif}).eq('id',emp.id)
    fetchAll()
  }

  function exportCSV(){
    const headers=['Employé','Semaine','Chantier','Type paie','Hrs Rég','Hrs OT','Total Hrs','Paie brute','Statut','Soumis le']
    const rows=feuillesFiltrees.map(f=>[
      f.employe_nom, f.semaine_du, f.chantier_principal, f.type_paie==='ccq'?'CCQ':'Hors décret',
      f.total_reg, f.total_ot, f.total_heures, f.paie_brute, f.statut,
      new Date(f.submitted_at).toLocaleDateString('fr-CA')
    ])
    const csv=[headers,...rows].map(r=>r.map(v=>`"${v||''}"`).join(',')).join('\n')
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})
    const url=URL.createObjectURL(blob)
    const a=document.createElement('a');a.href=url;a.download=`brikma-feuilles-${new Date().toISOString().slice(0,10)}.csv`;a.click()
  }

  const feuillesFiltrees=feuilles.filter(f=>{
    if(filtreEmploye&&!f.employe_nom?.toLowerCase().includes(filtreEmploye.toLowerCase()))return false
    if(filtreSemaine&&f.semaine_du!==filtreSemaine)return false
    if(filtreStatut&&f.statut!==filtreStatut)return false
    return true
  })

  const stats={
    total:feuilles.length,
    soumis:feuilles.filter(f=>f.statut==='soumis').length,
    approuves:feuilles.filter(f=>f.statut==='approuve').length,
    totalHrs:feuilles.filter(f=>f.statut==='approuve').reduce((s,f)=>s+f.total_heures,0),
    totalPaie:feuilles.filter(f=>f.statut==='approuve').reduce((s,f)=>s+f.paie_brute,0),
  }

  const inputS={width:'100%',background:'#0f1923',border:'1.5px solid var(--border)',color:'white',borderRadius:'6px',padding:'8px 11px',fontSize:'0.86rem',outline:'none'}
  const labelS={fontSize:'0.62rem',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--muted)',display:'block',marginBottom:'4px'}

  if(loading && view==='dashboard' && feuilles.length===0) return <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontFamily:"'Outfit',sans-serif"}}><style>{css}</style>Chargement...</div>

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',fontFamily:"'Outfit',sans-serif"}}>
      <style>{css}</style>

      {/* HEADER */}
      <div style={{background:'var(--navy)',borderBottom:'4px solid',borderImage:'linear-gradient(90deg,#c0623a,#3b82c4) 1'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto',padding:'14px 20px',display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.5rem',letterSpacing:'3px',color:'white'}}>Brikma Construction — Dashboard Patron</div>
          </div>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
            {[['dashboard','📊 Dashboard'],['employes','👷 Employés'],['soumissions','📋 Soumissions'],['locations','🏗 Locations']].map(([v,lbl])=>(
              <button key={v} onClick={()=>setView(v)} style={{padding:'7px 14px',borderRadius:'6px',border:`1.5px solid ${view===v?'var(--blue2)':'var(--border)'}`,background:view===v?'rgba(59,130,196,0.2)':'transparent',color:view===v?'var(--blue2)':'var(--muted)',fontSize:'0.82rem',fontWeight:'600',cursor:'pointer'}}>{lbl}</button>
            ))}
            <button onClick={onLogout} style={{padding:'7px 12px',borderRadius:'6px',border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',fontSize:'0.78rem',cursor:'pointer'}}>⬅ Sortir</button>
          </div>
        </div>
      </div>

      <div style={{maxWidth:'1100px',margin:'0 auto',padding:'20px 14px 60px'}}>

        {/* ── DASHBOARD ── */}
        {view==='dashboard' && <>
          {/* STATS */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'10px',marginBottom:'18px'}}>
            {[
              ['En attente',stats.soumis,'var(--blue2)'],
              ['Approuvées',stats.approuves,'var(--green2)'],
              ['Total feuilles',stats.total,'#a8c4e0'],
              ['Heures approuvées',stats.totalHrs.toFixed(1)+'h','var(--orange)'],
              ['Paie totale',stats.totalPaie.toFixed(0)+' $','var(--yellow)'],
            ].map(([lbl,val,clr])=>(
              <div key={lbl} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'8px',padding:'13px',textAlign:'center'}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.5rem',letterSpacing:'1px',color:clr,marginBottom:'3px'}}>{val}</div>
                <div style={{fontSize:'0.62rem',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--muted)'}}>{lbl}</div>
              </div>
            ))}
          </div>

          {/* FILTRES + EXPORT */}
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'9px',padding:'14px 16px',marginBottom:'14px',display:'flex',gap:'10px',flexWrap:'wrap',alignItems:'flex-end'}}>
            <div style={{flex:'1',minWidth:'150px'}}>
              <label style={labelS}>Employé</label>
              <input type="text" value={filtreEmploye} onChange={e=>setFiltreEmploye(e.target.value)} placeholder="Filtrer par nom..." style={inputS}/>
            </div>
            <div style={{flex:'1',minWidth:'140px'}}>
              <label style={labelS}>Semaine du</label>
              <input type="date" value={filtreSemaine} onChange={e=>setFiltreSemaine(e.target.value)} style={inputS}/>
            </div>
            <div style={{flex:'1',minWidth:'130px'}}>
              <label style={labelS}>Statut</label>
              <select value={filtreStatut} onChange={e=>setFiltreStatut(e.target.value)} style={inputS}>
                <option value="">Tous</option>
                <option value="soumis">Soumis</option>
                <option value="approuve">Approuvés</option>
                <option value="refuse">Refusés</option>
              </select>
            </div>
            <button onClick={exportCSV} style={{background:'var(--green)',border:'none',color:'white',padding:'8px 18px',borderRadius:'6px',fontFamily:"'Outfit',sans-serif",fontSize:'0.84rem',fontWeight:'600',cursor:'pointer',whiteSpace:'nowrap'}}>📥 Export CSV</button>
          </div>

          {/* LISTE FEUILLES */}
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {feuillesFiltrees.length===0 && <div style={{textAlign:'center',padding:'40px',color:'var(--muted)'}}>Aucune feuille trouvée</div>}
            {feuillesFiltrees.map(f=>(
              <div key={f.id} onClick={()=>openDetail(f)} style={{background:'var(--card)',border:`1.5px solid ${f.statut==='soumis'?'var(--blue2)':f.statut==='approuve'?'var(--green2)':'var(--red)'}`,borderRadius:'8px',padding:'13px 16px',cursor:'pointer',transition:'all 0.2s',display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
                <div style={{flex:'1',minWidth:'140px'}}>
                  <div style={{fontWeight:'600',color:'white',fontSize:'0.9rem'}}>{f.employe_nom}</div>
                  <div style={{fontSize:'0.75rem',color:'var(--muted)',marginTop:'2px'}}>Semaine du {f.semaine_du}</div>
                </div>
                <div style={{fontSize:'0.78rem',color:'var(--muted)',flex:'1',minWidth:'120px'}}>{f.chantier_principal}</div>
                <TypePaieBadge type={f.type_paie}/>
                <div style={{textAlign:'right',minWidth:'80px'}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.1rem',color:'var(--blue2)'}}>{f.total_heures}h</div>
                  {f.total_ot>0 && <div style={{fontSize:'0.7rem',color:'var(--orange)'}}>OT: {f.total_ot}h</div>}
                </div>
                <div style={{textAlign:'right',minWidth:'90px'}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.05rem',color:'var(--yellow)'}}>{f.paie_brute?.toFixed(2)} $</div>
                </div>
                <StatutBadge statut={f.statut}/>
              </div>
            ))}
          </div>
        </>}

        {/* ── DÉTAIL FEUILLE ── */}
        {view==='detail' && selected && <>
          <button onClick={()=>setView('dashboard')} style={{background:'transparent',border:'1px solid var(--border)',color:'var(--muted)',padding:'7px 14px',borderRadius:'6px',cursor:'pointer',fontSize:'0.82rem',marginBottom:'16px'}}>← Retour</button>

          {/* INFO */}
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'9px',padding:'16px',marginBottom:'14px'}}>
            <div style={{display:'flex',gap:'16px',flexWrap:'wrap',alignItems:'center',marginBottom:'14px'}}>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.2rem',letterSpacing:'2px',color:'white'}}>{selected.employe_nom}</div>
                <div style={{fontSize:'0.78rem',color:'var(--muted)'}}>Semaine du {selected.semaine_du} · {selected.chantier_principal}</div>
              </div>
              <TypePaieBadge type={selected.type_paie}/>
              <StatutBadge statut={selected.statut}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px'}}>
              {[['Total heures',selected.total_heures+'h','var(--blue2)'],['Overtime',selected.total_ot+'h','var(--orange)'],['Taux rég.',selected.taux_reg+' $/h','#a8c4e0'],['Paie brute',selected.paie_brute?.toFixed(2)+' $','var(--yellow)']].map(([lbl,val,clr])=>(
                <div key={lbl} style={{background:'#0f1923',borderRadius:'7px',padding:'11px',textAlign:'center'}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.2rem',color:clr}}>{val}</div>
                  <div style={{fontSize:'0.62rem',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--muted)',marginTop:'2px'}}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* JOURS */}
          <div style={{display:'flex',flexDirection:'column',gap:'7px',marginBottom:'14px'}}>
            {jours.map(j=>(
              <div key={j.id} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'7px',padding:'11px 14px'}}>
                <div style={{display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap'}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.95rem',letterSpacing:'1px',color:'#a8c4e0',minWidth:'75px'}}>{j.jour_nom}</div>
                  <div style={{fontSize:'0.73rem',color:'var(--muted)',minWidth:'60px'}}>{j.jour_date}</div>
                  <span style={{fontSize:'0.75rem',color:j.statut==='present'?'var(--green2)':j.statut==='absent'?'var(--red)':'var(--yellow)'}}>{j.statut==='present'?'✅':j.statut==='absent'?'❌':'🌴'} {j.statut}</span>
                  {j.statut==='present' && <>
                    <span style={{fontSize:'0.78rem',color:'var(--muted)'}}>{j.arrive} → {j.depart}</span>
                    <span style={{fontSize:'0.78rem',color:'var(--blue2)',fontWeight:'600'}}>{(j.heures_reg+j.heures_ot).toFixed(1)}h</span>
                    {j.heures_ot>0 && <span style={{background:'rgba(217,119,6,0.15)',color:'var(--orange)',padding:'2px 7px',borderRadius:'4px',fontSize:'0.72rem',fontWeight:'700'}}>OT {j.heures_ot.toFixed(1)}h {j.ot_approuve?'✅':''}</span>}
                    <span style={{fontSize:'0.75rem',color:'var(--muted)',marginLeft:'auto'}}>📍 {j.adresse_chantier||'—'}</span>
                  </>}
                </div>
                {j.ot_raison && <div style={{fontSize:'0.75rem',color:'var(--orange)',marginTop:'6px',paddingLeft:'4px'}}>⚡ {j.ot_raison}</div>}
                {j.notes && <div style={{fontSize:'0.75rem',color:'var(--muted)',marginTop:'4px',paddingLeft:'4px'}}>{j.notes}</div>}
              </div>
            ))}
          </div>

          {/* APPROBATION */}
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'9px',padding:'16px'}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',letterSpacing:'2px',color:'#a8c4e0',marginBottom:'12px'}}>✍️ APPROBATION</div>
            <label style={labelS}>Note au superviseur / employé</label>
            <textarea value={notePatron} onChange={e=>setNotePatron(e.target.value)} placeholder="Commentaires, corrections demandées..."
              style={{...inputS,minHeight:'70px',resize:'vertical',marginBottom:'14px'}}/>
            <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
              <button onClick={()=>changerStatut(selected.id,'refuse')} style={{background:'rgba(192,57,43,0.2)',border:'1.5px solid var(--red)',color:'#e57373',padding:'10px 22px',borderRadius:'7px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.95rem',letterSpacing:'2px',cursor:'pointer'}}>✕ REFUSER</button>
              <button onClick={()=>changerStatut(selected.id,'approuve')} style={{background:'rgba(34,160,96,0.2)',border:'1.5px solid var(--green2)',color:'var(--green2)',padding:'10px 22px',borderRadius:'7px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.95rem',letterSpacing:'2px',cursor:'pointer'}}>✓ APPROUVER</button>
            </div>
          </div>
        </>}

        {/* ── GESTION EMPLOYÉS ── */}
        {view==='employes' && <>
          {/* Ajouter */}
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'9px',padding:'16px',marginBottom:'16px'}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',letterSpacing:'2px',color:'var(--blue2)',marginBottom:'14px'}}>➕ AJOUTER UN EMPLOYÉ</div>
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:'10px',marginBottom:'10px'}}>
              <div><label style={labelS}>Nom complet *</label><input value={newEmp.nom} onChange={e=>setNewEmp({...newEmp,nom:e.target.value})} placeholder="ex: Jean Tremblay" style={inputS}/></div>
              <div><label style={labelS}>Code accès * </label><input value={newEmp.code_acces} onChange={e=>setNewEmp({...newEmp,code_acces:e.target.value.toUpperCase()})} placeholder="ex: EMP001" style={inputS}/></div>
              <div><label style={labelS}>Poste</label>
                <select value={newEmp.poste} onChange={e=>setNewEmp({...newEmp,poste:e.target.value})} style={inputS}>
                  <option value="">-- Poste --</option>
                  {['Contremaître','Charpentier-menuisier','Briqueteur-maçon','Électricien','Plombier','Manœuvre','Opérateur machinerie','Peintre','Aide général'].map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'10px',marginBottom:'12px'}}>
              <div>
                <label style={labelS}>Type de paie</label>
                <select value={newEmp.type_paie} onChange={e=>setNewEmp({...newEmp,type_paie:e.target.value})} style={inputS}>
                  <option value="hors_decret">Hors décret</option>
                  <option value="ccq">CCQ</option>
                </select>
              </div>
              {newEmp.type_paie==='ccq' ? (
                <div><label style={labelS}>Taux CCQ ($/h)</label><input type="number" value={newEmp.taux_ccq} onChange={e=>setNewEmp({...newEmp,taux_ccq:e.target.value})} style={inputS}/></div>
              ):<>
                <div><label style={labelS}>Taux régulier ($/h)</label><input type="number" value={newEmp.taux_regulier} onChange={e=>setNewEmp({...newEmp,taux_regulier:e.target.value})} style={inputS}/></div>
                <div><label style={labelS}>Taux OT ($/h)</label><input type="number" value={newEmp.taux_ot} onChange={e=>setNewEmp({...newEmp,taux_ot:e.target.value})} style={inputS}/></div>
              </>}
            </div>
            {empMsg && <div style={{marginBottom:'10px',fontSize:'0.82rem',color:empMsg.includes('✅')?'var(--green2)':'#e57373'}}>{empMsg}</div>}
            <button onClick={ajouterEmploye} disabled={empLoading} style={{background:'var(--blue)',border:'none',color:'white',padding:'10px 24px',borderRadius:'7px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.95rem',letterSpacing:'2px',cursor:'pointer'}}>{empLoading?'...':'AJOUTER →'}</button>
          </div>

          {/* Liste */}
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {employes.map(emp=>(
              <div key={emp.id} style={{background:'var(--card)',border:`1.5px solid ${emp.actif?'var(--border)':'rgba(192,57,43,0.3)'}`,borderRadius:'8px',padding:'12px 16px',display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap',opacity:emp.actif?1:0.6}}>
                <div style={{flex:1,minWidth:'140px'}}>
                  <div style={{fontWeight:'600',color:'white',fontSize:'0.9rem'}}>{emp.nom}</div>
                  <div style={{fontSize:'0.73rem',color:'var(--muted)'}}>{emp.poste||'—'} · Code: <span style={{color:'var(--blue2)',fontWeight:'600'}}>{emp.code_acces}</span></div>
                </div>
                <TypePaieBadge type={emp.type_paie}/>
                <div style={{fontSize:'0.78rem',color:'var(--muted)'}}>
                  {emp.type_paie==='ccq'?`CCQ: ${emp.taux_ccq} $/h`:`Rég: ${emp.taux_regulier} $/h · OT: ${emp.taux_ot} $/h`}
                </div>
                <button onClick={()=>toggleActif(emp)} style={{background:emp.actif?'rgba(192,57,43,0.15)':'rgba(34,160,96,0.15)',border:`1px solid ${emp.actif?'var(--red)':'var(--green2)'}`,color:emp.actif?'#e57373':'var(--green2)',padding:'5px 12px',borderRadius:'5px',fontSize:'0.75rem',fontWeight:'600',cursor:'pointer'}}>
                  {emp.actif?'Désactiver':'Réactiver'}
                </button>
              </div>
            ))}
          </div>
        </>}

        {/* ── SOUMISSIONS ── */}
        {view==='soumissions' && <Soumission/>}

        {/* ── LOCATIONS ── */}
        {view==='locations' && <Location/>}

      </div>
    </div>
  )
}
