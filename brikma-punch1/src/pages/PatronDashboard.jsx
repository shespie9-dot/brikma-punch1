import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Soumission from './Soumission'
import Location from './Location'

const css = `
  :root{--navy:#1e3a5f;--blue:#2563a8;--blue2:#3b82c4;--brick:#c0623a;--green:#1a7a4a;--green2:#22a060;--orange:#d97706;--red:#c0392b;--yellow:#e6a817;--bg:#0f1923;--card:#1a2a3a;--border:#2e4060;--text:#e8edf2;--muted:#6b7a8d;}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:var(--bg);color:var(--text);font-family:'Outfit',sans-serif;}
  input,select,textarea{font-family:'Outfit',sans-serif;}
  input[type=time]::-webkit-calendar-picker-indicator{filter:invert(1);opacity:0.4;}
`

const SEUIL_OT = 8
const TYPES_TRAVAIL = ['Normal','Excavation','Maçonnerie','Charpente','Toiture','Finition','Électricité','Plomberie','Peinture','Nettoyage','Formation','Autre']

function toMin(t){if(!t)return 0;const[h,m]=t.split(':').map(Number);return h*60+m}
function calcHrsJour(j){
  if(j.statut!=='present'||!j.arrive||!j.depart)return 0
  let tot=toMin(j.depart)-toMin(j.arrive)
  if(j.diner_out&&j.diner_in)tot-=(toMin(j.diner_in)-toMin(j.diner_out))
  return Math.max(0,tot/60)
}
function getRegJour(j){const h=calcHrsJour(j);return j.ot_approuve?Math.min(h,SEUIL_OT):h}
function getOTJour(j){return j.ot_approuve?Math.max(0,calcHrsJour(j)-SEUIL_OT):0}

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

  // Edit feuille
  const [editMode,setEditMode]=useState(false)
  const [editData,setEditData]=useState({})
  const [editJours,setEditJours]=useState([])
  const [editSaving,setEditSaving]=useState(false)
  const [editMsg,setEditMsg]=useState('')

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
    setEditMode(false); setEditMsg('')
    const {data}=await supabase.from('jours_travail').select('*').eq('feuille_id',f.id).order('jour_date')
    setJours(data||[])
    setView('detail')
  }

  function startEdit(){
    setEditData({
      chantier_principal: selected.chantier_principal||'',
      taux_reg: selected.taux_reg||0,
      taux_ot: selected.taux_ot||0,
      taux_ccq: selected.taux_ccq||0,
    })
    setEditJours(jours.map(j=>({...j,
      arrive: j.arrive||'',
      diner_out: j.diner_out||'',
      diner_in: j.diner_in||'',
      depart: j.depart||'',
    })))
    setEditMsg('')
    setEditMode(true)
  }

  function updEditJour(i,k,v){
    setEditJours(prev=>{const n=[...prev];n[i]={...n[i],[k]:v};return n})
  }

  async function saveEdit(){
    setEditSaving(true); setEditMsg('')
    try {
      // Recalculer les totaux
      const totHrs = editJours.reduce((s,j)=>s+calcHrsJour(j),0)
      const totReg = editJours.reduce((s,j)=>s+getRegJour(j),0)
      const totOT  = editJours.reduce((s,j)=>s+getOTJour(j),0)

      const typesPaie = [...new Set(editJours.filter(j=>j.statut==='present').map(j=>j.type_paie))]
      const typePaieGlobal = typesPaie.length===1?typesPaie[0]:'mixte'

      // Recalculer paie brute
      const paieBrute = editJours.reduce((acc,j)=>{
        if(j.statut!=='present') return acc
        const reg=getRegJour(j), ot=getOTJour(j)
        if(j.type_paie==='ccq'){
          return acc+reg*Number(editData.taux_ccq||0)+ot*(Number(editData.taux_ccq||0)*1.5)
        }
        return acc+reg*Number(editData.taux_reg||0)+ot*Number(editData.taux_ot||0)
      },0)

      // Update feuille
      const {error:e1}=await supabase.from('feuilles_temps').update({
        chantier_principal: editData.chantier_principal,
        taux_reg: Number(editData.taux_reg)||0,
        taux_ot: Number(editData.taux_ot)||0,
        total_heures: totHrs,
        total_reg: totReg,
        total_ot: totOT,
        type_paie: typePaieGlobal,
        paie_brute: paieBrute,
      }).eq('id',selected.id)
      if(e1) throw e1

      // Update chaque jour
      for(const j of editJours){
        const reg=getRegJour(j), ot=getOTJour(j)
        await supabase.from('jours_travail').update({
          statut: j.statut,
          arrive: j.arrive||null,
          diner_out: j.diner_out||null,
          diner_in: j.diner_in||null,
          depart: j.depart||null,
          adresse_chantier: j.adresse_chantier||'',
          type_travail: j.type_travail||'Normal',
          heures_reg: reg,
          heures_ot: ot,
          ot_approuve: j.ot_approuve||false,
          ot_raison: j.ot_raison||'',
          notes: j.notes||'',
          type_paie: j.type_paie||'hors_decret',
        }).eq('id',j.id)
      }

      setEditMsg('✅ Feuille mise à jour!')
      // Refresh
      const {data:f2}=await supabase.from('feuilles_temps').select('*').eq('id',selected.id).single()
      const {data:j2}=await supabase.from('jours_travail').select('*').eq('feuille_id',selected.id).order('jour_date')
      setSelected(f2); setJours(j2||[])
      fetchAll()
      setEditMode(false)
    } catch(e){
      setEditMsg('Erreur: '+e.message)
    }
    setEditSaving(false)
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
          <div style={{display:'flex',gap:'8px',alignItems:'center',marginBottom:'16px'}}>
            <button onClick={()=>{setView('dashboard');setEditMode(false)}} style={{background:'transparent',border:'1px solid var(--border)',color:'var(--muted)',padding:'7px 14px',borderRadius:'6px',cursor:'pointer',fontSize:'0.82rem'}}>← Retour</button>
            {!editMode && <button onClick={startEdit} style={{background:'rgba(230,168,23,0.15)',border:'1.5px solid var(--yellow)',color:'var(--yellow)',padding:'7px 18px',borderRadius:'6px',cursor:'pointer',fontSize:'0.82rem',fontWeight:'600'}}>✏️ MODIFIER</button>}
            {editMode && <button onClick={()=>setEditMode(false)} style={{background:'transparent',border:'1px solid var(--border)',color:'var(--muted)',padding:'7px 14px',borderRadius:'6px',cursor:'pointer',fontSize:'0.82rem'}}>✕ Annuler</button>}
          </div>

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
              {[['Total heures',(editMode?editJours.reduce((s,j)=>s+calcHrsJour(j),0):selected.total_heures).toFixed?.(1)+'h'||'—','var(--blue2)'],['Overtime',(editMode?editJours.reduce((s,j)=>s+getOTJour(j),0):selected.total_ot).toFixed?.(1)+'h'||'—','var(--orange)'],['Taux rég.',(editMode?editData.taux_reg:selected.taux_reg)+' $/h','#a8c4e0'],['Paie brute',(selected.paie_brute||0).toFixed(2)+' $','var(--yellow)']].map(([lbl,val,clr])=>(
                <div key={lbl} style={{background:'#0f1923',borderRadius:'7px',padding:'11px',textAlign:'center'}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.2rem',color:clr}}>{val}</div>
                  <div style={{fontSize:'0.62rem',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--muted)',marginTop:'2px'}}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* MODE LECTURE */}
          {!editMode && <>
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

          {/* MODE ÉDITION */}
          {editMode && <>
            {/* Chantier + taux */}
            <div style={{background:'var(--card)',border:'1.5px solid var(--yellow)',borderRadius:'9px',padding:'16px',marginBottom:'12px'}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',letterSpacing:'2px',color:'var(--yellow)',marginBottom:'12px'}}>✏️ MODIFIER LA FEUILLE</div>
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={labelS}>Chantier principal</label>
                  <input value={editData.chantier_principal} onChange={e=>setEditData({...editData,chantier_principal:e.target.value})} style={inputS}/>
                </div>
                <div>
                  <label style={labelS}>Taux rég. ($/h)</label>
                  <input type="number" value={editData.taux_reg} onChange={e=>setEditData({...editData,taux_reg:e.target.value})} style={inputS}/>
                </div>
                <div>
                  <label style={labelS}>Taux OT ($/h)</label>
                  <input type="number" value={editData.taux_ot} onChange={e=>setEditData({...editData,taux_ot:e.target.value})} style={inputS}/>
                </div>
                <div>
                  <label style={labelS}>Taux CCQ ($/h)</label>
                  <input type="number" value={editData.taux_ccq||0} onChange={e=>setEditData({...editData,taux_ccq:e.target.value})} style={inputS}/>
                </div>
              </div>
            </div>

            {/* Jours éditables */}
            <div style={{display:'flex',flexDirection:'column',gap:'8px',marginBottom:'12px'}}>
              {editJours.map((j,i)=>{
                const hrs=calcHrsJour(j); const ot=getOTJour(j)
                return(
                  <div key={j.id} style={{background:'var(--card)',border:`1.5px solid ${ot>0?'var(--orange)':'var(--border)'}`,borderRadius:'8px',overflow:'hidden'}}>
                    {/* Entête jour */}
                    <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 14px',borderBottom:'1px solid var(--border)',flexWrap:'wrap'}}>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.95rem',letterSpacing:'1.5px',color:'#a8c4e0',minWidth:'75px'}}>{j.jour_nom}</div>
                      <div style={{fontSize:'0.72rem',color:'var(--muted)'}}>{j.jour_date}</div>
                      <select value={j.statut} onChange={e=>updEditJour(i,'statut',e.target.value)}
                        style={{padding:'4px 8px',borderRadius:'5px',border:'1.5px solid',fontSize:'0.78rem',fontWeight:'600',cursor:'pointer',outline:'none',background:'#0f1923',
                          borderColor:j.statut==='present'?'var(--green2)':j.statut==='absent'?'var(--red)':'var(--yellow)',
                          color:j.statut==='present'?'var(--green2)':j.statut==='absent'?'var(--red)':'var(--yellow)'}}>
                        <option value="present">✅ Présent</option>
                        <option value="absent">❌ Absent</option>
                        <option value="conge">🌴 Congé</option>
                        <option value="ferie">🏛 Férié</option>
                      </select>
                      {j.statut==='present' && (
                        <div style={{display:'flex',gap:'4px'}}>
                          {[['hors_decret','HD'],['ccq','CCQ']].map(([val,lbl])=>(
                            <button key={val} onClick={()=>updEditJour(i,'type_paie',val)} style={{padding:'3px 8px',borderRadius:'4px',border:`1.5px solid ${j.type_paie===val?'var(--blue2)':'var(--border)'}`,background:j.type_paie===val?'rgba(59,130,196,0.25)':'transparent',color:j.type_paie===val?'var(--blue2)':'var(--muted)',fontSize:'0.7rem',fontWeight:'700',cursor:'pointer'}}>{lbl}</button>
                          ))}
                        </div>
                      )}
                      {ot>0 && <span style={{background:'var(--orange)',color:'white',fontSize:'0.68rem',fontWeight:'700',padding:'2px 7px',borderRadius:'4px'}}>OT +{ot.toFixed(1)}h</span>}
                      <div style={{marginLeft:'auto',fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',color:hrs===0?'#3a5070':ot>0?'var(--orange)':'var(--green2)'}}>{hrs===0?'—':hrs.toFixed(1)+'h'}</div>
                    </div>

                    {/* Corps jour */}
                    {j.statut==='present' && (
                      <div style={{padding:'12px 14px'}}>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 2fr 1fr',gap:'8px',marginBottom:'8px'}}>
                          {[['Arrivée','arrive'],['Dîner sortie','diner_out'],['Dîner retour','diner_in'],['Départ','depart']].map(([lbl,key])=>(
                            <div key={key}>
                              <div style={{fontSize:'0.6rem',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--muted)',marginBottom:'3px'}}>{lbl}</div>
                              <input type="time" value={j[key]||''} onChange={e=>updEditJour(i,key,e.target.value)}
                                style={{width:'100%',background:'#0f1923',border:'1.5px solid var(--border)',color:'white',borderRadius:'5px',padding:'6px 7px',fontSize:'0.85rem',outline:'none'}}/>
                            </div>
                          ))}
                          <div>
                            <div style={{fontSize:'0.6rem',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--muted)',marginBottom:'3px'}}>📍 Adresse</div>
                            <input value={j.adresse_chantier||''} onChange={e=>updEditJour(i,'adresse_chantier',e.target.value)}
                              style={{width:'100%',background:'#0f1923',border:'1.5px solid var(--border)',color:'white',borderRadius:'5px',padding:'6px 7px',fontSize:'0.82rem',outline:'none'}}/>
                          </div>
                          <div>
                            <div style={{fontSize:'0.6rem',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--muted)',marginBottom:'3px'}}>Type</div>
                            <select value={j.type_travail||'Normal'} onChange={e=>updEditJour(i,'type_travail',e.target.value)}
                              style={{width:'100%',background:'#0f1923',border:'1.5px solid var(--border)',color:'white',borderRadius:'5px',padding:'6px 7px',fontSize:'0.82rem',outline:'none'}}>
                              {TYPES_TRAVAIL.map(t=><option key={t}>{t}</option>)}
                            </select>
                          </div>
                        </div>
                        {ot>0 && (
                          <div style={{display:'flex',gap:'10px',alignItems:'center',background:'rgba(217,119,6,0.08)',border:'1px solid rgba(217,119,6,0.3)',borderRadius:'6px',padding:'8px 12px'}}>
                            <label style={{display:'flex',alignItems:'center',gap:'6px',cursor:'pointer',fontSize:'0.82rem',color:'var(--orange)',fontWeight:'600',whiteSpace:'nowrap'}}>
                              <input type="checkbox" checked={j.ot_approuve||false} onChange={e=>updEditJour(i,'ot_approuve',e.target.checked)} style={{accentColor:'var(--orange)'}}/>
                              OT approuvé
                            </label>
                            <input value={j.ot_raison||''} onChange={e=>updEditJour(i,'ot_raison',e.target.value)} placeholder="Raison OT..."
                              style={{flex:1,background:'#0f1923',border:'1px solid rgba(217,119,6,0.3)',color:'white',borderRadius:'5px',padding:'5px 8px',fontSize:'0.82rem',outline:'none'}}/>
                          </div>
                        )}
                        <input value={j.notes||''} onChange={e=>updEditJour(i,'notes',e.target.value)} placeholder="Notes..."
                          style={{width:'100%',background:'#0f1923',border:'1.5px solid var(--border)',color:'white',borderRadius:'5px',padding:'6px 8px',fontSize:'0.82rem',outline:'none',marginTop:'6px'}}/>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {editMsg && <div style={{padding:'10px 14px',borderRadius:'7px',marginBottom:'12px',background:editMsg.includes('✅')?'rgba(34,160,96,0.15)':'rgba(192,57,43,0.15)',color:editMsg.includes('✅')?'var(--green2)':'#e57373',fontSize:'0.84rem'}}>{editMsg}</div>}

            <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
              <button onClick={()=>setEditMode(false)} style={{background:'transparent',border:'1px solid var(--border)',color:'var(--muted)',padding:'11px 22px',borderRadius:'7px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',letterSpacing:'2px',cursor:'pointer'}}>ANNULER</button>
              <button onClick={saveEdit} disabled={editSaving} style={{background:editSaving?'#3a5070':'var(--yellow)',border:'none',color:editSaving?'white':'#0f1923',padding:'11px 28px',borderRadius:'7px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.95rem',letterSpacing:'2px',cursor:editSaving?'not-allowed':'pointer',fontWeight:'700'}}>
                {editSaving?'SAUVEGARDE...':'💾 SAUVEGARDER'}
              </button>
            </div>
          </>}
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
