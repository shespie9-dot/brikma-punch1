import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

const JOURS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche']
const TYPES = ['Normal','Excavation','Maçonnerie','Charpente','Toiture','Finition','Électricité','Plomberie','Peinture','Nettoyage','Formation','Autre']
const SEUIL_OT = 8

const css = `
  :root{--navy:#1e3a5f;--blue:#2563a8;--blue2:#3b82c4;--brick:#c0623a;--green:#1a7a4a;--green2:#22a060;--orange:#d97706;--red:#c0392b;--yellow:#e6a817;--bg:#0f1923;--card:#1a2a3a;--card2:#1e3347;--border:#2e4060;--text:#e8edf2;--muted:#6b7a8d;}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:var(--bg);color:var(--text);font-family:'Outfit',sans-serif;}
  input,select,textarea{font-family:'Outfit',sans-serif;}
  input[type=time]::-webkit-calendar-picker-indicator{filter:invert(1);opacity:0.5;}
`

function toMin(t){if(!t)return 0;const[h,m]=t.split(':').map(Number);return h*60+m}
function calcHrs(d){
  if(d.statut!=='present'||!d.arrive||!d.depart)return 0
  let tot=toMin(d.depart)-toMin(d.arrive)
  if(d.dinerOut&&d.dinerIn)tot-=(toMin(d.dinerIn)-toMin(d.dinerOut))
  return Math.max(0,tot/60)
}
function rawOT(d){return Math.max(0,calcHrs(d)-SEUIL_OT)}
function getOT(d){return d.otApprouve?rawOT(d):0}
function getReg(d){return d.otApprouve?Math.min(calcHrs(d),SEUIL_OT):calcHrs(d)}

function getLundi(){
  const n=new Date();const dow=n.getDay();const diff=n.getDate()-dow+(dow===0?-6:1)
  const m=new Date(n);m.setDate(diff);return m
}

export default function EmployePunch({employe,onLogout}){
  const [lundi,setLundi]=useState(getLundi())
  const [chantierPrincipal,setChantierPrincipal]=useState('')
  const [jours,setJours]=useState(JOURS.map((j,i)=>({
    jour:j,arrive:i<5?'07:00':'',dinerOut:i<5?'12:00':'',dinerIn:i<5?'13:00':'',depart:i<5?'16:00':'',
    statut:i<5?'present':'absent',type:'Normal',adresse:'',otApprouve:false,otRaison:'',notes:'',
    typePaie:employe.type_paie||'hors_decret'
  })))
  const [tauxReg,setTauxReg]=useState(employe.taux_regulier||0)
  const [tauxOT,setTauxOT]=useState(employe.taux_ot||0)
  const [indem,setIndem]=useState(0)
  const [typePaie,setTypePaie]=useState(employe.type_paie||'hors_decret')
  const [tauxCCQ,setTauxCCQ]=useState(employe.taux_ccq||0)
  const [loading,setLoading]=useState(false)
  const [success,setSuccess]=useState(false)
  const [err,setErr]=useState('')
  const [saveStatus,setSaveStatus]=useState('idle') // idle | saving | saved | error
  const [savedDays,setSavedDays]=useState(new Set())
  const [otherBrouillon,setOtherBrouillon]=useState(null)
  const [view,setView]=useState('punch') // punch | historique | detailFeuille
  const [mesFeuilles,setMesFeuilles]=useState([])
  const [feuillesLoading,setFeuillesLoading]=useState(false)
  const [selectedFeuille,setSelectedFeuille]=useState(null)
  const [selectedJours,setSelectedJours]=useState([])

  const stateRef=useRef(null)
  const debounceRefs=useRef({})

  const dateJour=(i)=>{const d=new Date(lundi);d.setDate(d.getDate()+i);return d}
  const fmtDate=(d)=>d.toLocaleDateString('fr-CA',{day:'2-digit',month:'short'})
  const fmtDateISO=(d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

  useEffect(()=>{
    stateRef.current={jours,lundi,chantierPrincipal,tauxReg,tauxOT,tauxCCQ,indem}
  })

  useEffect(()=>{
    loadWeek(lundi)
  },[lundi])

  async function loadWeek(lundiDate){
    const semaineDu=fmtDateISO(lundiDate)
    const {data}=await supabase.from('brouillons').select('*').eq('employe_id',employe.id).eq('semaine_du',semaineDu).order('jour_index')
    if(data&&data.length){
      const first=data[0]
      setChantierPrincipal(first.chantier_principal||'')
      setTauxReg(first.taux_reg||0)
      setTauxOT(first.taux_ot||0)
      setTauxCCQ(first.taux_ccq||0)
      setIndem(first.indem||0)
      setJours(prev=>{
        const n=[...prev]
        data.forEach(row=>{
          const i=row.jour_index
          if(i>=0&&i<7){
            n[i]={
              jour:JOURS[i],
              arrive:(row.arrive||'').slice(0,5),
              dinerOut:(row.diner_out||'').slice(0,5),
              dinerIn:(row.diner_in||'').slice(0,5),
              depart:(row.depart||'').slice(0,5),
              statut:row.statut||'absent',
              type:row.type_travail||'Normal',
              adresse:row.adresse_chantier||'',
              otApprouve:row.ot_approuve||false,
              otRaison:row.ot_raison||'',
              notes:row.notes||'',
              typePaie:row.type_paie||employe.type_paie||'hors_decret'
            }
          }
        })
        return n
      })
      setSavedDays(new Set(data.map(r=>r.jour_index)))
    }else{
      setSavedDays(new Set())
    }
    checkOtherWeeks(semaineDu)
  }

  async function checkOtherWeeks(semaineDuActuelle){
    const {data}=await supabase.from('brouillons').select('semaine_du').eq('employe_id',employe.id).neq('semaine_du',semaineDuActuelle).order('semaine_du',{ascending:false}).limit(1)
    setOtherBrouillon(data&&data.length?data[0].semaine_du:null)
  }

  function continuerAutre(){
    if(!otherBrouillon)return
    setLundi(new Date(otherBrouillon+'T00:00:00'))
    setOtherBrouillon(null)
  }

  async function verMesFeuilles(){
    setFeuillesLoading(true)
    const {data}=await supabase.from('feuilles_temps').select('*').eq('employe_id',employe.id).order('submitted_at',{ascending:false})
    setMesFeuilles(data||[])
    setFeuillesLoading(false)
    setView('historique')
  }

  async function verDetailFeuille(f){
    setSelectedFeuille(f)
    const {data}=await supabase.from('jours_travail').select('*').eq('feuille_id',f.id).order('jour_date')
    setSelectedJours(data||[])
    setView('detailFeuille')
  }

  function StatutFeuilleBadge({statut}){
    const cfg={
      soumis:{bg:'rgba(59,130,196,0.15)',color:'#3b82c4',txt:'🕐 En attente'},
      approuve:{bg:'rgba(34,160,96,0.15)',color:'#22a060',txt:'✅ Approuvée'},
      refuse:{bg:'rgba(192,57,43,0.15)',color:'#e57373',txt:'❌ Refusée'}
    }
    const c=cfg[statut]||cfg.soumis
    return <span style={{background:c.bg,color:c.color,padding:'3px 10px',borderRadius:'4px',fontSize:'0.75rem',fontWeight:'700',letterSpacing:'1px'}}>{c.txt}</span>
  }

  function scheduleSave(i){
    setSaveStatus('saving')
    if(debounceRefs.current[i])clearTimeout(debounceRefs.current[i])
    debounceRefs.current[i]=setTimeout(()=>doSaveDay(i),1000)
  }
  function scheduleSaveAll(){for(let i=0;i<7;i++)scheduleSave(i)}

  async function doSaveDay(i){
    const s=stateRef.current
    const d=s.jours[i]
    const semaineDu=fmtDateISO(s.lundi)
    const jd=new Date(s.lundi);jd.setDate(jd.getDate()+i)
    const row={
      employe_id:employe.id,semaine_du:semaineDu,jour_index:i,
      jour_nom:d.jour,jour_date:fmtDateISO(jd),
      statut:d.statut,arrive:d.arrive||null,diner_out:d.dinerOut||null,diner_in:d.dinerIn||null,depart:d.depart||null,
      adresse_chantier:d.adresse,type_travail:d.type,
      ot_approuve:d.otApprouve,ot_raison:d.otRaison,notes:d.notes,type_paie:d.typePaie,
      chantier_principal:s.chantierPrincipal,taux_reg:Number(s.tauxReg)||0,taux_ot:Number(s.tauxOT)||0,
      taux_ccq:Number(s.tauxCCQ)||0,indem:Number(s.indem)||0,
      updated_at:new Date().toISOString()
    }
    try{
      const {error}=await supabase.from('brouillons').upsert(row,{onConflict:'employe_id,semaine_du,jour_index'})
      if(error)throw error
      setSavedDays(prev=>new Set(prev).add(i))
      setSaveStatus('saved')
      setTimeout(()=>setSaveStatus(s2=>s2==='saved'?'idle':s2),2000)
    }catch(e){
      setSaveStatus('error')
    }
  }

  function updJour(i,k,v){
    setJours(prev=>{const n=[...prev];n[i]={...n[i],[k]:v};return n})
    scheduleSave(i)
  }
  function remplirAdresses(val){
    setChantierPrincipal(val)
    setJours(prev=>prev.map(d=>d.adresse===''||d.adresse===chantierPrincipal?{...d,adresse:val}:d))
    scheduleSaveAll()
  }
  function updHeaderField(setter,val){
    setter(val)
    scheduleSaveAll()
  }
  function getDayStatus(d,i){
    if(!savedDays.has(i))return 'empty'
    if(d.statut==='present'&&(!d.arrive||!d.depart))return 'partial'
    return 'done'
  }

  const totHrs=jours.reduce((s,d)=>s+calcHrs(d),0)
  const totOT=jours.reduce((s,d)=>s+getOT(d),0)
  const totReg=jours.reduce((s,d)=>s+getReg(d),0)
  const joursT=jours.filter(d=>d.statut==='present').length

  function calcPaie(){
    const totals=jours.reduce((acc,d)=>{
      if(d.statut!=='present') return acc
      const reg=getReg(d),ot=getOT(d)
      const r=d.typePaie==='ccq'
        ?{reg:reg*tauxCCQ,ot:ot*(tauxCCQ*1.5)}
        :{reg:reg*tauxReg,ot:ot*tauxOT}
      return{reg:acc.reg+r.reg,ot:acc.ot+r.ot}
    },{reg:0,ot:0})
    return{reg:totals.reg,ot:totals.ot,total:totals.reg+totals.ot+Number(indem)}
  }
  const paie=calcPaie()

  async function soumettre(){
    if(!chantierPrincipal.trim()){setErr('Entre le chantier principal');return}
    setLoading(true);setErr('')
    try{
      const semaineDu=fmtDateISO(lundi)
      // Insert feuille
      const typesPaie=[...new Set(jours.filter(d=>d.statut==='present').map(d=>d.typePaie))]
      const typePaieGlobal=typesPaie.length===1?typesPaie[0]:'mixte'
      const {data:feuille,error:e1}=await supabase.from('feuilles_temps').insert({
        employe_id:employe.id,employe_nom:employe.nom,semaine_du:semaineDu,
        chantier_principal:chantierPrincipal,statut:'soumis',
        total_heures:totHrs,total_reg:totReg,total_ot:totOT,
        type_paie:typePaieGlobal,taux_reg:tauxReg,
        taux_ot:tauxOT,paie_brute:paie.total
      }).select().single()
      if(e1)throw e1

      // Insert jours
      const joursData=jours.map((d,i)=>({
        feuille_id:feuille.id,jour_nom:d.jour,
        jour_date:fmtDateISO(dateJour(i)),statut:d.statut,
        arrive:d.arrive||null,diner_out:d.dinerOut||null,diner_in:d.dinerIn||null,depart:d.depart||null,
        adresse_chantier:d.adresse,type_travail:d.type,
        heures_reg:getReg(d),heures_ot:getOT(d),
        ot_approuve:d.otApprouve,ot_raison:d.otRaison,notes:d.notes,
        type_paie:d.typePaie
      }))
      const {error:e2}=await supabase.from('jours_travail').insert(joursData)
      if(e2)throw e2

      await supabase.from('brouillons').delete().eq('employe_id',employe.id).eq('semaine_du',semaineDu)
      setSavedDays(new Set())
      setSuccess(true)
    }catch(e){setErr('Erreur: '+e.message)}
    setLoading(false)
  }

  if(success) return (
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Outfit',sans-serif"}}>
      <style>{css}</style>
      <div style={{textAlign:'center',padding:'40px'}}>
        <div style={{fontSize:'4rem',marginBottom:'16px'}}>✅</div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.8rem',letterSpacing:'3px',color:'white',marginBottom:'8px'}}>Feuille soumise!</div>
        <div style={{color:'var(--muted)',marginBottom:'8px'}}>Semaine du {lundi.toLocaleDateString('fr-CA',{day:'numeric',month:'long'})}</div>
        <div style={{color:'var(--green2)',fontSize:'1.1rem',fontWeight:'600',marginBottom:'24px'}}>{totHrs.toFixed(1)}h travaillées · Paie brute: {paie.total.toFixed(2)} $</div>
        <button onClick={()=>{
          setSuccess(false)
          setSaveStatus('idle')
          setSavedDays(new Set())
          setLundi(getLundi())
          setJours(JOURS.map((j,i)=>({jour:j,arrive:i<5?'07:00':'',dinerOut:i<5?'12:00':'',dinerIn:i<5?'13:00':'',depart:i<5?'16:00':'',statut:i<5?'present':'absent',type:'Normal',adresse:'',otApprouve:false,otRaison:'',notes:'',typePaie:employe.type_paie||'hors_decret'})))
        }} style={{background:'var(--blue)',border:'none',color:'white',padding:'12px 28px',borderRadius:'8px',fontFamily:"'Outfit',sans-serif",fontSize:'0.9rem',fontWeight:'600',cursor:'pointer',marginRight:'10px'}}>Nouvelle semaine</button>
        <button onClick={onLogout} style={{background:'transparent',border:'1px solid var(--border)',color:'var(--muted)',padding:'12px 28px',borderRadius:'8px',fontFamily:"'Outfit',sans-serif",fontSize:'0.9rem',cursor:'pointer'}}>Déconnexion</button>
      </div>
    </div>
  )

  if(view==='historique') return (
    <div style={{minHeight:'100vh',background:'var(--bg)',fontFamily:"'Outfit',sans-serif"}}>
      <style>{css}</style>
      <div style={{background:'var(--navy)',borderBottom:'4px solid',borderImage:'linear-gradient(90deg,#c0623a,#3b82c4) 1'}}>
        <div style={{maxWidth:'900px',margin:'0 auto',padding:'16px 20px',display:'flex',alignItems:'center',gap:'14px'}}>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.5rem',letterSpacing:'3px',color:'white'}}>Brikma Construction</div>
            <div style={{fontSize:'0.7rem',color:'var(--brick)',letterSpacing:'2px',textTransform:'uppercase'}}>Mes feuilles de temps</div>
          </div>
          <button onClick={()=>setView('punch')} style={{background:'transparent',border:'1px solid var(--border)',color:'var(--muted)',padding:'6px 12px',borderRadius:'6px',cursor:'pointer',fontSize:'0.78rem'}}>⬅ Retour</button>
        </div>
      </div>
      <div style={{maxWidth:'900px',margin:'0 auto',padding:'20px 14px 60px'}}>
        {feuillesLoading && <div style={{color:'var(--muted)',textAlign:'center',padding:'30px'}}>Chargement...</div>}
        {!feuillesLoading && mesFeuilles.length===0 && <div style={{color:'var(--muted)',textAlign:'center',padding:'30px'}}>Aucune feuille soumise pour l'instant.</div>}
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {mesFeuilles.map(f=>(
            <div key={f.id} onClick={()=>verDetailFeuille(f)} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'9px',padding:'14px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:'160px'}}>
                <div style={{fontWeight:'600',color:'white',fontSize:'0.9rem'}}>Semaine du {new Date(f.semaine_du+'T00:00:00').toLocaleDateString('fr-CA',{day:'numeric',month:'long'})}</div>
                <div style={{fontSize:'0.73rem',color:'var(--muted)'}}>{f.chantier_principal}</div>
              </div>
              <div style={{fontSize:'0.82rem',color:'var(--blue2)'}}>{Number(f.total_heures||0).toFixed(1)}h</div>
              <div style={{fontSize:'0.82rem',color:'var(--yellow)'}}>{Number(f.paie_brute||0).toFixed(2)} $</div>
              <StatutFeuilleBadge statut={f.statut}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  if(view==='detailFeuille' && selectedFeuille) return (
    <div style={{minHeight:'100vh',background:'var(--bg)',fontFamily:"'Outfit',sans-serif"}}>
      <style>{css}</style>
      <div style={{background:'var(--navy)',borderBottom:'4px solid',borderImage:'linear-gradient(90deg,#c0623a,#3b82c4) 1'}}>
        <div style={{maxWidth:'900px',margin:'0 auto',padding:'16px 20px',display:'flex',alignItems:'center',gap:'14px'}}>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.5rem',letterSpacing:'3px',color:'white'}}>Brikma Construction</div>
            <div style={{fontSize:'0.7rem',color:'var(--brick)',letterSpacing:'2px',textTransform:'uppercase'}}>Détail de la feuille</div>
          </div>
          <button onClick={()=>setView('historique')} style={{background:'transparent',border:'1px solid var(--border)',color:'var(--muted)',padding:'6px 12px',borderRadius:'6px',cursor:'pointer',fontSize:'0.78rem'}}>⬅ Retour</button>
        </div>
      </div>
      <div style={{maxWidth:'900px',margin:'0 auto',padding:'20px 14px 60px'}}>
        <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'9px',padding:'16px',marginBottom:'16px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'10px'}}>
          <div>
            <div style={{fontWeight:'600',color:'white'}}>Semaine du {new Date(selectedFeuille.semaine_du+'T00:00:00').toLocaleDateString('fr-CA',{day:'numeric',month:'long'})}</div>
            <div style={{fontSize:'0.78rem',color:'var(--muted)'}}>{selectedFeuille.chantier_principal}</div>
          </div>
          <StatutFeuilleBadge statut={selectedFeuille.statut}/>
        </div>

        {selectedFeuille.note_patron && (
          <div style={{background:'rgba(230,168,23,0.1)',border:'1.5px solid var(--yellow)',borderRadius:'9px',padding:'14px 16px',marginBottom:'16px'}}>
            <div style={{fontSize:'0.68rem',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--yellow)',marginBottom:'6px'}}>📝 Note du patron</div>
            <div style={{fontSize:'0.86rem',color:'white'}}>{selectedFeuille.note_patron}</div>
          </div>
        )}

        <div style={{display:'flex',flexDirection:'column',gap:'8px',marginBottom:'16px'}}>
          {selectedJours.map(j=>(
            <div key={j.id} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'8px',padding:'11px 16px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
              <div style={{minWidth:'80px',color:'#a8c4e0',fontWeight:'600',fontSize:'0.85rem'}}>{j.jour_nom}</div>
              <div style={{fontSize:'0.73rem',color:'var(--muted)',minWidth:'120px'}}>
                {j.statut==='present'?`${j.arrive||'—'} → ${j.depart||'—'}`:j.statut}
              </div>
              <div style={{fontSize:'0.78rem',color:'var(--muted)',flex:1,minWidth:'140px'}}>{j.adresse_chantier}</div>
              <div style={{fontSize:'0.82rem',color:'var(--green2)'}}>{Number(j.heures_reg||0).toFixed(1)}h reg</div>
              {Number(j.heures_ot||0)>0 && <div style={{fontSize:'0.82rem',color:'var(--orange)'}}>+{Number(j.heures_ot).toFixed(1)}h OT</div>}
            </div>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px'}}>
          {[['Total heures',Number(selectedFeuille.total_heures||0).toFixed(1)+'h','var(--blue2)'],
            ['Heures OT',Number(selectedFeuille.total_ot||0).toFixed(1)+'h','var(--orange)'],
            ['Paie brute',Number(selectedFeuille.paie_brute||0).toFixed(2)+' $','var(--yellow)']].map(([lbl,val,clr])=>(
            <div key={lbl} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'8px',padding:'13px',textAlign:'center'}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.3rem',color:clr,marginBottom:'3px'}}>{val}</div>
              <div style={{fontSize:'0.62rem',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--muted)'}}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',fontFamily:"'Outfit',sans-serif"}}>
      <style>{css}</style>

      {/* HEADER */}
      <div style={{background:'var(--navy)',borderBottom:'4px solid',borderImage:'linear-gradient(90deg,#c0623a,#3b82c4) 1'}}>
        <div style={{maxWidth:'900px',margin:'0 auto',padding:'16px 20px',display:'flex',alignItems:'center',gap:'14px'}}>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.5rem',letterSpacing:'3px',color:'white'}}>Brikma Construction</div>
            <div style={{fontSize:'0.7rem',color:'var(--brick)',letterSpacing:'2px',textTransform:'uppercase'}}>Feuille de temps</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontWeight:'600',color:'white',fontSize:'0.9rem'}}>👷 {employe.nom}</div>
            <div style={{fontSize:'0.73rem',color:'var(--muted)'}}>{employe.poste||'Employé'} · {employe.code_acces}</div>
            <div style={{fontSize:'0.7rem',marginTop:'2px',minHeight:'14px',
              color:saveStatus==='saving'?'var(--yellow)':saveStatus==='saved'?'var(--green2)':saveStatus==='error'?'var(--red)':'transparent'}}>
              {saveStatus==='saving'&&'⏳ Sauvegarde...'}
              {saveStatus==='saved'&&'💾 Sauvegardé'}
              {saveStatus==='error'&&'⚠️ Erreur sauvegarde'}
            </div>
          </div>
          <button onClick={verMesFeuilles} style={{background:'transparent',border:'1px solid var(--border)',color:'var(--muted)',padding:'6px 12px',borderRadius:'6px',cursor:'pointer',fontSize:'0.78rem'}}>📋 Mes feuilles</button>
          <button onClick={onLogout} style={{background:'transparent',border:'1px solid var(--border)',color:'var(--muted)',padding:'6px 12px',borderRadius:'6px',cursor:'pointer',fontSize:'0.78rem'}}>⬅ Sortir</button>
        </div>
      </div>

      <div style={{maxWidth:'900px',margin:'0 auto',padding:'20px 14px 60px'}}>

        {otherBrouillon && (
          <div style={{background:'rgba(59,130,196,0.12)',border:'1.5px solid var(--blue2)',borderRadius:'9px',padding:'12px 16px',marginBottom:'16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'10px'}}>
            <div style={{fontSize:'0.85rem',color:'var(--blue2)'}}>📝 Tu as une feuille en cours — semaine du {new Date(otherBrouillon+'T00:00:00').toLocaleDateString('fr-CA',{day:'numeric',month:'long'})}</div>
            <button onClick={continuerAutre} style={{background:'var(--blue2)',border:'none',color:'white',padding:'8px 18px',borderRadius:'6px',fontWeight:'600',fontSize:'0.82rem',cursor:'pointer'}}>Continuer →</button>
          </div>
        )}

        {/* SEMAINE + CHANTIER */}
        <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'10px',padding:'18px',marginBottom:'16px'}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',letterSpacing:'2px',color:'var(--blue2)',marginBottom:'14px'}}>📅 SEMAINE & CHANTIER</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div>
              <label style={{fontSize:'0.67rem',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--muted)',display:'block',marginBottom:'5px'}}>Semaine du (lundi)</label>
              <input type="date" value={`${lundi.getFullYear()}-${String(lundi.getMonth()+1).padStart(2,'0')}-${String(lundi.getDate()).padStart(2,'0')}`}
                onChange={e=>{const d=new Date(e.target.value+'T00:00:00');setLundi(d)}}
                style={{width:'100%',background:'#0f1923',border:'1.5px solid var(--border)',color:'white',borderRadius:'6px',padding:'9px 12px',fontSize:'0.88rem',outline:'none'}}/>
            </div>
            <div>
              <label style={{fontSize:'0.67rem',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--muted)',display:'block',marginBottom:'5px'}}>Chantier principal *</label>
              <input type="text" value={chantierPrincipal} onChange={e=>remplirAdresses(e.target.value)} placeholder="ex: 123 rue Principale, Laval"
                style={{width:'100%',background:'#0f1923',border:'1.5px solid var(--border)',color:'white',borderRadius:'6px',padding:'9px 12px',fontSize:'0.88rem',outline:'none'}}/>
            </div>
          </div>
        </div>

        {/* JOURS */}
        <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'16px'}}>
          {jours.map((d,i)=>{
            const hrs=calcHrs(d); const ot=rawOT(d); const hasOT=ot>0
            const dDate=dateJour(i)
            return (
              <div key={i} style={{background:'var(--card)',border:`1.5px solid ${hasOT?'var(--orange)':'var(--border)'}`,borderRadius:'9px',overflow:'hidden'}}>
                {/* Jour header */}
                <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'11px 16px',borderBottom:'1px solid var(--border)',flexWrap:'wrap',gap:'8px'}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',letterSpacing:'1.5px',color:'var(--navy) ',minWidth:'80px',color:'#a8c4e0'}}>{d.jour}</div>
                  <div style={{fontSize:'0.73rem',color:'var(--muted)',minWidth:'65px'}}>{fmtDate(dDate)}</div>
                  <span title="Statut sauvegarde" style={{fontSize:'0.9rem'}}>
                    {getDayStatus(d,i)==='empty'?'⬜':getDayStatus(d,i)==='partial'?'✏️':'✅'}
                  </span>
                  <select value={d.statut} onChange={e=>updJour(i,'statut',e.target.value)}
                    style={{padding:'5px 9px',borderRadius:'5px',border:'1.5px solid',fontSize:'0.78rem',fontWeight:'600',cursor:'pointer',outline:'none',
                      borderColor:d.statut==='present'?'var(--green2)':d.statut==='absent'?'var(--red)':d.statut==='conge'?'var(--yellow)':'var(--blue2)',
                      color:d.statut==='present'?'var(--green2)':d.statut==='absent'?'var(--red)':d.statut==='conge'?'var(--yellow)':'var(--blue2)',
                      background:d.statut==='present'?'rgba(34,160,96,0.1)':d.statut==='absent'?'rgba(192,57,43,0.1)':'rgba(59,130,196,0.1)'}}>
                    <option value="present">✅ Présent</option>
                    <option value="absent">❌ Absent</option>
                    <option value="conge">🌴 Congé</option>
                    <option value="ferie">🏛 Férié</option>
                  </select>
                  {d.statut==='present' && (
                    <div style={{display:'flex',gap:'3px'}}>
                      {[['hors_decret','HD'],['ccq','CCQ']].map(([val,lbl])=>(
                        <button key={val} onClick={()=>updJour(i,'typePaie',val)} style={{
                          padding:'3px 9px',borderRadius:'4px',
                          border:`1.5px solid ${d.typePaie===val?'var(--blue2)':'var(--border)'}`,
                          background:d.typePaie===val?'rgba(59,130,196,0.25)':'transparent',
                          color:d.typePaie===val?'var(--blue2)':'var(--muted)',
                          fontSize:'0.7rem',fontWeight:'700',cursor:'pointer',transition:'all 0.15s'
                        }}>{lbl}</button>
                      ))}
                    </div>
                  )}
                  {hasOT && <span style={{background:'var(--orange)',color:'white',fontSize:'0.68rem',fontWeight:'700',letterSpacing:'1px',padding:'3px 8px',borderRadius:'4px'}}>OT +{ot.toFixed(1)}h</span>}
                  <div style={{marginLeft:'auto',fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.05rem',letterSpacing:'1px',padding:'3px 10px',borderRadius:'5px',
                    color:hrs===0?'#3a5070':hasOT?'var(--orange)':'var(--green2)',
                    background:hrs===0?'transparent':hasOT?'rgba(217,119,6,0.1)':'rgba(34,160,96,0.1)'}}>
                    {hrs===0?'— h':hrs.toFixed(1)+'h'}
                  </div>
                </div>

                {/* Jour body */}
                {d.statut==='present' && (
                  <div style={{padding:'13px 16px'}}>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr) 2fr 1fr',gap:'10px',marginBottom:hasOT?'12px':'0'}}>
                      {[['Arrivée','arrive'],['Dîner Sortie','dinerOut'],['Dîner Retour','dinerIn'],['Départ','depart']].map(([lbl,key])=>(
                        <div key={key}>
                          <div style={{fontSize:'0.62rem',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--muted)',marginBottom:'4px'}}>{lbl}</div>
                          <input type="time" value={d[key]} onChange={e=>updJour(i,key,e.target.value)}
                            style={{width:'100%',background:'#0f1923',border:'1.5px solid var(--border)',color:'white',borderRadius:'5px',padding:'7px 8px',fontSize:'0.86rem',outline:'none'}}/>
                        </div>
                      ))}
                      <div>
                        <div style={{fontSize:'0.62rem',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--muted)',marginBottom:'4px'}}>📍 Adresse chantier</div>
                        <input type="text" value={d.adresse} onChange={e=>updJour(i,'adresse',e.target.value)} placeholder="Adresse ce jour..."
                          style={{width:'100%',background:'#0f1923',border:'1.5px solid var(--border)',color:'white',borderRadius:'5px',padding:'7px 8px',fontSize:'0.83rem',outline:'none'}}/>
                      </div>
                      <div>
                        <div style={{fontSize:'0.62rem',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--muted)',marginBottom:'4px'}}>Type</div>
                        <select value={d.type} onChange={e=>updJour(i,'type',e.target.value)}
                          style={{width:'100%',background:'#0f1923',border:'1.5px solid var(--border)',color:'white',borderRadius:'5px',padding:'7px 8px',fontSize:'0.83rem',outline:'none'}}>
                          {TYPES.map(t=><option key={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* OT SECTION */}
                    {hasOT && (
                      <div style={{background:'rgba(217,119,6,0.08)',border:'1.5px solid rgba(217,119,6,0.3)',borderRadius:'7px',padding:'12px 14px'}}>
                        <div style={{fontSize:'0.68rem',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--orange)',marginBottom:'10px'}}>⚡ OVERTIME — {ot.toFixed(2)}h au-delà de {SEUIL_OT}h</div>
                        <div style={{display:'flex',gap:'12px',alignItems:'center',flexWrap:'wrap'}}>
                          <label style={{display:'flex',alignItems:'center',gap:'7px',cursor:'pointer',fontSize:'0.82rem',fontWeight:'600',color:'var(--orange)'}}>
                            <input type="checkbox" checked={d.otApprouve} onChange={e=>updJour(i,'otApprouve',e.target.checked)} style={{width:'16px',height:'16px',accentColor:'var(--orange)'}}/>
                            OT approuvé
                          </label>
                          <input type="text" value={d.otRaison} onChange={e=>updJour(i,'otRaison',e.target.value)} placeholder="Raison / Justification..."
                            style={{flex:1,minWidth:'180px',background:'#0f1923',border:'1.5px solid rgba(217,119,6,0.3)',color:'white',borderRadius:'5px',padding:'7px 10px',fontSize:'0.83rem',outline:'none'}}/>
                          <input type="text" value={d.notes} onChange={e=>updJour(i,'notes',e.target.value)} placeholder="Notes..."
                            style={{flex:1,minWidth:'130px',background:'#0f1923',border:'1.5px solid var(--border)',color:'white',borderRadius:'5px',padding:'7px 10px',fontSize:'0.83rem',outline:'none'}}/>
                        </div>
                      </div>
                    )}
                    {!hasOT && (
                      <input type="text" value={d.notes} onChange={e=>updJour(i,'notes',e.target.value)} placeholder="Notes..."
                        style={{width:'100%',background:'#0f1923',border:'1.5px solid var(--border)',color:'white',borderRadius:'5px',padding:'7px 10px',fontSize:'0.83rem',outline:'none',marginTop:'8px'}}/>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* TOTAUX */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px',marginBottom:'16px'}}>
          {[['Hrs régulières',totReg.toFixed(1),'var(--green2)'],['Overtime (OT)',totOT.toFixed(1),'var(--orange)'],['Total heures',totHrs.toFixed(1),'var(--blue2)'],['Jours travaillés',joursT,'#a8c4e0']].map(([lbl,val,clr])=>(
            <div key={lbl} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'8px',padding:'13px',textAlign:'center'}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.5rem',letterSpacing:'1px',color:clr,marginBottom:'3px'}}>{val}</div>
              <div style={{fontSize:'0.62rem',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--muted)'}}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* PAIE */}
        <div style={{background:'linear-gradient(135deg,var(--navy),#1a3a5a)',border:'1px solid var(--border)',borderRadius:'10px',padding:'18px',marginBottom:'16px'}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',letterSpacing:'2px',color:'#a8c4e0',marginBottom:'14px'}}>💵 CALCUL DE PAIE</div>
          
          <div style={{fontSize:'0.67rem',color:'#6b7a8d',marginBottom:'10px'}}>💡 Le type CCQ / HD se choisit par jour directement sur chaque journée ci-haut.</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'12px'}}>
            {[
              ['Taux CCQ ($/h)',tauxCCQ,setTauxCCQ,'OT × 1.5 = '+(tauxCCQ*1.5).toFixed(2)+' $/h'],
              ['Taux rég. HD ($/h)',tauxReg,setTauxReg,null],
              ['Taux OT HD ($/h)',tauxOT,setTauxOT,null],
              ['Indemnités ($)',indem,setIndem,null]
            ].map(([lbl,val,set,hint])=>(
              <div key={lbl}>
                <div style={{fontSize:'0.62rem',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase',color:'#8fa8c8',marginBottom:'5px'}}>{lbl}</div>
                <input type="number" value={val} onChange={e=>updHeaderField(set,e.target.value)} placeholder="0.00"
                  style={{width:'100%',background:'rgba(255,255,255,0.1)',border:'1.5px solid rgba(255,255,255,0.2)',color:'white',borderRadius:'6px',padding:'8px 11px',fontSize:'0.86rem',outline:'none'}}/>
                {hint && <div style={{fontSize:'0.68rem',color:'#6b7a8d',marginTop:'3px'}}>{hint}</div>}
              </div>
            ))}
          </div>

          <div style={{marginTop:'14px',paddingTop:'12px',borderTop:'1px solid rgba(255,255,255,0.1)',display:'flex',gap:'20px',justifyContent:'flex-end',flexWrap:'wrap'}}>
            {[['Paie régulière',paie.reg.toFixed(2)+' $'],['Paie OT',paie.ot.toFixed(2)+' $'],['Indemnités',Number(indem).toFixed(2)+' $']].map(([lbl,val])=>(
              <div key={lbl} style={{textAlign:'right'}}>
                <div style={{fontSize:'0.62rem',letterSpacing:'1.5px',textTransform:'uppercase',color:'#8fa8c8'}}>{lbl}</div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.2rem',color:'white',marginTop:'2px'}}>{val}</div>
              </div>
            ))}
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:'0.62rem',letterSpacing:'1.5px',textTransform:'uppercase',color:'#8fa8c8'}}>Paie brute totale</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.4rem',color:'var(--yellow)',marginTop:'2px'}}>{paie.total.toFixed(2)} $</div>
            </div>
          </div>
        </div>

        {err && <div style={{background:'rgba(192,57,43,0.15)',border:'1px solid rgba(192,57,43,0.4)',color:'#e57373',borderRadius:'7px',padding:'10px 14px',fontSize:'0.82rem',marginBottom:'14px'}}>⚠️ {err}</div>}

        <button onClick={soumettre} disabled={loading}
          style={{width:'100%',background:loading?'#3a5070':'var(--brick)',border:'none',color:'white',padding:'14px',borderRadius:'8px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.1rem',letterSpacing:'2px',cursor:loading?'not-allowed':'pointer',transition:'all 0.2s'}}>
          {loading ? 'ENVOI EN COURS...' : 'SOUMETTRE AU PATRON →'}
        </button>
      </div>
    </div>
  )
}
