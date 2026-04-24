import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { printSoumission } from '../utils/printDoc'

const TPS_RATE = 0.05
const TVQ_RATE = 0.09975
const CATEGORIES = ['Matériaux','Main-d\'œuvre','Équipement','Sous-traitance','Transport','Autre']
const UNITES = ['unité','heure','jour','forfait','pi²','pi lin.','m²','m','tonne']
const TYPES_BAT = ['Résidentiel','Commercial','Institutionnel','Industriel','Autre']

const css = `
  :root{--navy:#1e3a5f;--blue:#2563a8;--blue2:#3b82c4;--brick:#c0623a;--green2:#22a060;--orange:#d97706;--red:#c0392b;--yellow:#e6a817;--bg:#0f1923;--card:#1a2a3a;--border:#2e4060;--muted:#6b7a8d;}
  *{box-sizing:border-box;}
  input,select,textarea{font-family:'Outfit',sans-serif;}
`
const inputS = {width:'100%',background:'#0f1923',border:'1.5px solid #2e4060',color:'white',borderRadius:'6px',padding:'8px 11px',fontSize:'0.85rem',outline:'none'}
const labelS = {fontSize:'0.6rem',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase',color:'#6b7a8d',display:'block',marginBottom:'4px'}
const cardS = {background:'#1a2a3a',border:'1px solid #2e4060',borderRadius:'9px',padding:'16px',marginBottom:'14px'}

function calcLigne(l){ return Number(l.quantite||0)*Number(l.prix_unitaire||0) }
function calcTotaux(ls, fraisService=0){
  const sous_total = ls.reduce((s,l)=>s+calcLigne(l),0)
  const frais_service_montant = sous_total * (Number(fraisService)||0) / 100
  const base_taxable = sous_total + frais_service_montant
  const tps = base_taxable*TPS_RATE
  const tvq = base_taxable*TVQ_RATE
  return {sous_total, frais_service_montant, base_taxable, tps, tvq, total:base_taxable+tps+tvq}
}
function genNo(list){
  const yr = new Date().getFullYear()
  const nums = list.map(s=>{const p=s.no_soumission?.split('-');return p?.length===3?parseInt(p[2])||0:0})
  const next = Math.max(0,...nums)+1
  return `BRIK-${yr}-${String(next).padStart(4,'0')}`
}
function fmt(n){ return Number(n||0).toFixed(2) }

function StatutBadge({statut}){
  const c={brouillon:{bg:'rgba(59,130,196,0.12)',cl:'#3b82c4',t:'Brouillon'},envoye:{bg:'rgba(230,168,23,0.12)',cl:'#e6a817',t:'Envoyée'},acceptee:{bg:'rgba(34,160,96,0.12)',cl:'#22a060',t:'Acceptée'},refusee:{bg:'rgba(192,57,43,0.12)',cl:'#e57373',t:'Refusée'}}[statut]||{bg:'rgba(59,130,196,0.12)',cl:'#3b82c4',t:statut}
  return <span style={{background:c.bg,color:c.cl,padding:'3px 10px',borderRadius:'4px',fontSize:'0.72rem',fontWeight:'700',letterSpacing:'1px'}}>{c.t}</span>
}

export default function Soumission(){
  const [list,setList]=useState([])
  const [view,setView]=useState('list')
  const [selected,setSelected]=useState(null)
  const [selectedLignes,setSelectedLignes]=useState([])
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [msg,setMsg]=useState('')
  const [emailModal,setEmailModal]=useState(false)
  const [emailOverride,setEmailOverride]=useState('')
  const [emailSending,setEmailSending]=useState(false)
  const [emailResult,setEmailResult]=useState(null) // null | 'ok' | 'err'
  const [emailErr,setEmailErr]=useState('')

  const [form,setForm]=useState({client_nom:'',client_tel:'',client_email:'',client_adresse:'',chantier:'',type_batiment:'',description:''})
  const [lignes,setLignes]=useState([{description:'',categorie:'Matériaux',unite:'unité',quantite:1,prix_unitaire:0}])
  const [fraisService,setFraisService]=useState(0)
  const [editId,setEditId]=useState(null)
  const [editNo,setEditNo]=useState('')

  useEffect(()=>{fetch()},[])

  async function fetch(){
    setLoading(true)
    const{data}=await supabase.from('soumissions').select('*').order('created_at',{ascending:false})
    setList(data||[])
    setLoading(false)
  }

  async function openDetail(s){
    const{data:fresh}=await supabase.from('soumissions').select('*').eq('id',s.id).single()
    setSelected(fresh||s)
    const{data}=await supabase.from('soumission_lignes').select('*').eq('soumission_id',s.id)
    setSelectedLignes(data||[])
    setView('detail')
  }

  function nouvelleForm(){
    setForm({client_nom:'',client_tel:'',client_email:'',client_adresse:'',chantier:'',type_batiment:'',description:''})
    setLignes([{description:'',categorie:'Matériaux',unite:'unité',quantite:1,prix_unitaire:0}])
    setFraisService(0)
    setEditId(null); setEditNo('')
    setMsg('')
    setView('form')
  }

  async function editBrouillon(s, e){
    if(e) e.stopPropagation()
    const{data:ls}=await supabase.from('soumission_lignes').select('*').eq('soumission_id',s.id)
    setForm({client_nom:s.client_nom||'',client_tel:s.client_tel||'',client_email:s.client_email||'',client_adresse:s.client_adresse||'',chantier:s.chantier||'',type_batiment:s.type_batiment||'',description:s.description||''})
    setLignes(ls&&ls.length?ls.map(l=>({description:l.description,categorie:l.categorie,unite:l.unite,quantite:l.quantite,prix_unitaire:l.prix_unitaire})):[{description:'',categorie:'Matériaux',unite:'unité',quantite:1,prix_unitaire:0}])
    setFraisService(s.frais_service||0)
    setEditId(s.id); setEditNo(s.no_soumission)
    setMsg('')
    setView('form')
  }

  async function deleteSoumission(id, e){
    if(e) e.stopPropagation()
    if(!window.confirm('Supprimer cette soumission? Cette action est irréversible.')) return
    await supabase.from('soumission_lignes').delete().eq('soumission_id',id)
    await supabase.from('soumissions').delete().eq('id',id)
    fetch()
  }

  function updLigne(i,k,v){setLignes(prev=>{const n=[...prev];n[i]={...n[i],[k]:v};return n})}
  function addLigne(){setLignes(prev=>[...prev,{description:'',categorie:'Matériaux',unite:'unité',quantite:1,prix_unitaire:0}])}
  function removeLigne(i){setLignes(prev=>prev.filter((_,idx)=>idx!==i))}

  const totaux = calcTotaux(lignes, fraisService)

  async function sauvegarder(statut){
    if(!form.client_nom.trim()){setMsg('Nom du client requis');return}
    setSaving(true);setMsg('')
    const{sous_total,frais_service_montant,tps,tvq,total}=calcTotaux(lignes,fraisService)
    let soumId
    if(editId){
      const{error:e1}=await supabase.from('soumissions').update({...form,statut,frais_service:Number(fraisService)||0,frais_service_montant,sous_total,tps,tvq,total}).eq('id',editId)
      if(e1){setMsg('Erreur: '+e1.message);setSaving(false);return}
      await supabase.from('soumission_lignes').delete().eq('soumission_id',editId)
      soumId=editId
    } else {
      const no_soumission = genNo(list)
      const{data:soum,error:e1}=await supabase.from('soumissions').insert({...form,no_soumission,statut,frais_service:Number(fraisService)||0,frais_service_montant,sous_total,tps,tvq,total}).select().single()
      if(e1){setMsg('Erreur: '+e1.message);setSaving(false);return}
      soumId=soum.id
    }
    const ld=lignes.filter(l=>l.description.trim()).map(l=>({soumission_id:soumId,description:l.description,categorie:l.categorie,unite:l.unite,quantite:Number(l.quantite),prix_unitaire:Number(l.prix_unitaire),sous_total:calcLigne(l)}))
    if(ld.length) await supabase.from('soumission_lignes').insert(ld)
    setMsg('✅ Soumission sauvegardée!')
    fetch()
    setSaving(false)
    setTimeout(()=>{setView('list');setMsg('');setEditId(null);setEditNo('')},1200)
  }

  async function changerStatut(id,statut){
    await supabase.from('soumissions').update({statut}).eq('id',id)
    setSelected(prev=>({...prev,statut}))
    fetch()
  }

  function ouvrirEmailModal(){
    setEmailOverride(selected?.client_email||'')
    setEmailResult(null)
    setEmailErr('')
    setEmailModal(true)
  }

  async function envoyerEmail(){
    const dest = emailOverride.trim()
    if(!dest) return
    setEmailSending(true); setEmailResult(null); setEmailErr('')
    try {
      const resp = await fetch(
        'https://dzhbgfbizufgmmrhdjqi.supabase.co/functions/v1/send-soumission',
        {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({soumission_id: selected.id, email_override: dest}),
        }
      )
      const data = await resp.json()
      if(!resp.ok || data.error) throw new Error(data.error || 'Erreur envoi')
      setEmailResult('ok')
      setSelected(prev=>({...prev, statut:'envoye', client_email:dest, envoye_le: new Date().toISOString()}))
      fetch()
    } catch(e) {
      setEmailResult('err')
      setEmailErr(e.message)
    }
    setEmailSending(false)
  }

  /* ── LIST ── */
  if(view==='list') return(
    <div><style>{css}</style>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.2rem',letterSpacing:'2px',color:'#a8c4e0'}}>📋 SOUMISSIONS ({list.length})</div>
        <button onClick={nouvelleForm} style={{background:'var(--brick)',border:'none',color:'white',padding:'9px 22px',borderRadius:'6px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',letterSpacing:'2px',cursor:'pointer'}}>+ NOUVELLE</button>
      </div>
      {loading&&<div style={{color:'#6b7a8d',textAlign:'center',padding:'40px'}}>Chargement...</div>}
      {!loading&&list.length===0&&<div style={{color:'#6b7a8d',textAlign:'center',padding:'40px'}}>Aucune soumission — créez-en une!</div>}
      <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
        {list.map(s=>(
          <div key={s.id} onClick={()=>openDetail(s)} style={{background:'var(--card)',border:'1.5px solid var(--border)',borderRadius:'8px',padding:'13px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:'180px'}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',letterSpacing:'2px',color:'var(--blue2)'}}>{s.no_soumission}</div>
              <div style={{fontWeight:'600',color:'white',fontSize:'0.9rem'}}>{s.client_nom}</div>
              <div style={{fontSize:'0.73rem',color:'#6b7a8d'}}>{s.chantier||'—'}</div>
            </div>
            <div style={{textAlign:'right',minWidth:'100px'}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.1rem',color:'var(--yellow)'}}>{fmt(s.total)} $</div>
              <div style={{fontSize:'0.7rem',color:'#6b7a8d'}}>{new Date(s.created_at).toLocaleDateString('fr-CA')}</div>
            </div>
            {s.ouvert_le && <span style={{background:'rgba(34,160,96,0.15)',color:'#22a060',padding:'3px 9px',borderRadius:'4px',fontSize:'0.7rem',fontWeight:'700',letterSpacing:'1px',whiteSpace:'nowrap'}}>📬 Vu {new Date(s.ouvert_le).toLocaleDateString('fr-CA')}</span>}
            <StatutBadge statut={s.statut}/>
            <button onClick={e=>editBrouillon(s,e)} title="Modifier"
              style={{background:'rgba(230,168,23,0.12)',border:'1.5px solid var(--yellow)',color:'var(--yellow)',padding:'4px 10px',borderRadius:'5px',fontSize:'0.78rem',fontWeight:'700',cursor:'pointer',whiteSpace:'nowrap'}}>✏️</button>
            <button onClick={e=>deleteSoumission(s.id,e)} title="Supprimer"
              style={{background:'rgba(192,57,43,0.12)',border:'1.5px solid rgba(192,57,43,0.5)',color:'#e57373',padding:'4px 9px',borderRadius:'5px',fontSize:'1rem',lineHeight:1,cursor:'pointer',fontWeight:'700'}}>×</button>
          </div>
        ))}
      </div>
    </div>
  )

  /* ── FORM ── */
  if(view==='form') return(
    <div><style>{css}</style>
      <button onClick={()=>setView('list')} style={{background:'transparent',border:'1px solid var(--border)',color:'#6b7a8d',padding:'7px 14px',borderRadius:'6px',cursor:'pointer',fontSize:'0.82rem',marginBottom:'16px'}}>← Retour</button>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.2rem',letterSpacing:'2px',color:'#a8c4e0',marginBottom:'14px'}}>{editId?`✏️ MODIFIER BROUILLON — ${editNo}`:`📋 NOUVELLE SOUMISSION — ${genNo(list)}`}</div>

      {/* CLIENT */}
      <div style={cardS}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.85rem',letterSpacing:'2px',color:'var(--blue2)',marginBottom:'12px'}}>👤 INFORMATIONS CLIENT</div>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:'10px',marginBottom:'10px'}}>
          <div><label style={labelS}>Nom du client *</label><input value={form.client_nom} onChange={e=>setForm({...form,client_nom:e.target.value})} placeholder="Nom ou entreprise" style={inputS}/></div>
          <div><label style={labelS}>Téléphone</label><input value={form.client_tel} onChange={e=>setForm({...form,client_tel:e.target.value})} placeholder="514-XXX-XXXX" style={inputS}/></div>
          <div><label style={labelS}>Courriel</label><input value={form.client_email} onChange={e=>setForm({...form,client_email:e.target.value})} placeholder="client@email.com" style={inputS}/></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px'}}>
          <div><label style={labelS}>Adresse client</label><input value={form.client_adresse} onChange={e=>setForm({...form,client_adresse:e.target.value})} placeholder="123 rue..." style={inputS}/></div>
          <div><label style={labelS}>Adresse chantier</label><input value={form.chantier} onChange={e=>setForm({...form,chantier:e.target.value})} placeholder="Adresse du chantier" style={inputS}/></div>
          <div><label style={labelS}>Type de bâtiment</label>
            <select value={form.type_batiment} onChange={e=>setForm({...form,type_batiment:e.target.value})} style={inputS}>
              <option value="">-- Sélectionner --</option>
              {TYPES_BAT.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div style={{marginTop:'10px'}}>
          <label style={labelS}>Description générale</label>
          <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Description des travaux à effectuer..." style={{...inputS,minHeight:'65px',resize:'vertical'}}/>
        </div>
      </div>

      {/* TABLEAU */}
      <div style={cardS}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.85rem',letterSpacing:'2px',color:'var(--blue2)',marginBottom:'12px'}}>📦 TRAVAUX ET MATÉRIAUX</div>
        <div style={{display:'grid',gridTemplateColumns:'3fr 1.2fr 0.8fr 0.8fr 1fr 80px',gap:'6px',marginBottom:'6px',padding:'0 2px'}}>
          {['Description','Catégorie','Unité','Qté','Prix unit.','Total'].map(h=>(
            <div key={h} style={{fontSize:'0.58rem',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase',color:'#6b7a8d'}}>{h}</div>
          ))}
        </div>
        {lignes.map((l,i)=>(
          <div key={i} style={{display:'grid',gridTemplateColumns:'3fr 1.2fr 0.8fr 0.8fr 1fr 80px',gap:'6px',marginBottom:'6px',alignItems:'center'}}>
            <input value={l.description} onChange={e=>updLigne(i,'description',e.target.value)} placeholder="Description..." style={{...inputS,padding:'6px 8px',fontSize:'0.82rem'}}/>
            <select value={l.categorie} onChange={e=>updLigne(i,'categorie',e.target.value)} style={{...inputS,padding:'6px 8px',fontSize:'0.82rem'}}>
              {CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
            <select value={l.unite} onChange={e=>updLigne(i,'unite',e.target.value)} style={{...inputS,padding:'6px 8px',fontSize:'0.82rem'}}>
              {UNITES.map(u=><option key={u}>{u}</option>)}
            </select>
            <input type="number" value={l.quantite} onChange={e=>updLigne(i,'quantite',e.target.value)} style={{...inputS,padding:'6px 8px',fontSize:'0.82rem'}}/>
            <input type="number" value={l.prix_unitaire} onChange={e=>updLigne(i,'prix_unitaire',e.target.value)} placeholder="0.00" style={{...inputS,padding:'6px 8px',fontSize:'0.82rem'}}/>
            <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',color:'var(--yellow)',whiteSpace:'nowrap'}}>{fmt(calcLigne(l))}$</span>
              {lignes.length>1&&<button onClick={()=>removeLigne(i)} style={{background:'none',border:'none',color:'#e57373',cursor:'pointer',fontSize:'1.1rem',lineHeight:1}}>×</button>}
            </div>
          </div>
        ))}
        <button onClick={addLigne} style={{background:'rgba(59,130,196,0.08)',border:'1px dashed var(--blue2)',color:'var(--blue2)',padding:'8px',borderRadius:'6px',cursor:'pointer',fontSize:'0.82rem',marginTop:'8px',width:'100%'}}>+ Ajouter une ligne</button>
      </div>

      {/* FRAIS DE SERVICE */}
      <div style={{background:'rgba(59,130,196,0.06)',border:'1px solid rgba(59,130,196,0.25)',borderRadius:'9px',padding:'14px 16px',marginBottom:'14px',display:'flex',alignItems:'center',gap:'16px',flexWrap:'wrap'}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.85rem',letterSpacing:'2px',color:'var(--blue2)'}}>⚙️ FRAIS DE SERVICE</div>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <label style={{...labelS,marginBottom:0,whiteSpace:'nowrap'}}>% sur sous-total</label>
          <div style={{position:'relative',display:'flex',alignItems:'center'}}>
            <input type="number" min="0" max="100" step="0.5" value={fraisService} onChange={e=>setFraisService(e.target.value)}
              style={{...inputS,width:'90px',padding:'6px 28px 6px 10px',fontSize:'0.9rem'}}/>
            <span style={{position:'absolute',right:'8px',color:'#6b7a8d',fontSize:'0.85rem',pointerEvents:'none'}}>%</span>
          </div>
        </div>
        {Number(fraisService)>0 && (
          <div style={{marginLeft:'auto',textAlign:'right'}}>
            <span style={{fontSize:'0.75rem',color:'#8fa8c8'}}>Montant frais de service : </span>
            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',color:'var(--blue2)',marginLeft:'6px'}}>{fmt(totaux.frais_service_montant)} $</span>
          </div>
        )}
      </div>

      {/* TOTAUX */}
      <div style={{background:'linear-gradient(135deg,var(--navy),#1a3a5a)',border:'1px solid var(--border)',borderRadius:'9px',padding:'16px',marginBottom:'14px'}}>
        <div style={{display:'flex',justifyContent:'flex-end'}}>
          <div style={{minWidth:'300px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0'}}>
              <span style={{fontSize:'0.82rem',color:'#8fa8c8'}}>Sous-total travaux</span>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',color:'white'}}>{fmt(totaux.sous_total)} $</span>
            </div>
            {Number(fraisService)>0 && (
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0'}}>
                <span style={{fontSize:'0.82rem',color:'var(--blue2)'}}>Frais de service ({fraisService}%)</span>
                <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',color:'var(--blue2)'}}>{fmt(totaux.frais_service_montant)} $</span>
              </div>
            )}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0',borderTop:'1px solid rgba(255,255,255,0.1)',marginTop:'2px'}}>
              <span style={{fontSize:'0.82rem',color:'#8fa8c8'}}>Base taxable</span>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',color:'white'}}>{fmt(totaux.base_taxable)} $</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0'}}>
              <span style={{fontSize:'0.82rem',color:'#8fa8c8'}}>TPS (5%)</span>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',color:'#8fa8c8'}}>{fmt(totaux.tps)} $</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0'}}>
              <span style={{fontSize:'0.82rem',color:'#8fa8c8'}}>TVQ (9.975%)</span>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',color:'#8fa8c8'}}>{fmt(totaux.tvq)} $</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderTop:'1px solid rgba(255,255,255,0.15)',marginTop:'4px'}}>
              <span style={{fontSize:'0.82rem',color:'#8fa8c8'}}>TOTAL</span>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.4rem',color:'var(--yellow)'}}>{fmt(totaux.total)} $</span>
            </div>
          </div>
        </div>
      </div>

      {msg&&<div style={{padding:'10px 14px',borderRadius:'7px',marginBottom:'12px',background:msg.includes('✅')?'rgba(34,160,96,0.15)':'rgba(192,57,43,0.15)',color:msg.includes('✅')?'#22a060':'#e57373',fontSize:'0.84rem'}}>{msg}</div>}

      <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
        <button onClick={()=>sauvegarder('brouillon')} disabled={saving} style={{background:'transparent',border:'1.5px solid var(--border)',color:'#6b7a8d',padding:'11px 22px',borderRadius:'7px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',letterSpacing:'2px',cursor:'pointer'}}>💾 BROUILLON</button>
        <button onClick={()=>sauvegarder('envoye')} disabled={saving} style={{background:'var(--brick)',border:'none',color:'white',padding:'11px 22px',borderRadius:'7px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',letterSpacing:'2px',cursor:saving?'not-allowed':'pointer'}}>{saving?'...':'📤 SOUMETTRE AU CLIENT'}</button>
      </div>
    </div>
  )

  /* ── DETAIL ── */
  return(
    <div><style>{css}</style>
      <button onClick={()=>setView('list')} style={{background:'transparent',border:'1px solid var(--border)',color:'#6b7a8d',padding:'7px 14px',borderRadius:'6px',cursor:'pointer',fontSize:'0.82rem',marginBottom:'16px'}}>← Retour</button>
      {selected&&(
        <>
          <div style={cardS}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'14px',flexWrap:'wrap',gap:'10px'}}>
              <div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.4rem',letterSpacing:'3px',color:'var(--blue2)'}}>{selected.no_soumission}</div>
                <div style={{fontSize:'1rem',fontWeight:'600',color:'white',marginTop:'2px'}}>{selected.client_nom}</div>
                {selected.client_tel&&<div style={{fontSize:'0.8rem',color:'#6b7a8d'}}>{selected.client_tel} {selected.client_email&&'· '+selected.client_email}</div>}
                {selected.client_adresse&&<div style={{fontSize:'0.8rem',color:'#6b7a8d'}}>{selected.client_adresse}</div>}
                {selected.chantier&&<div style={{fontSize:'0.8rem',color:'#a8c4e0',marginTop:'4px'}}>📍 {selected.chantier}</div>}
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.6rem',color:'var(--yellow)'}}>{fmt(selected.total)} $</div>
                <div style={{fontSize:'0.7rem',color:'#6b7a8d',marginBottom:'4px'}}>{new Date(selected.created_at).toLocaleDateString('fr-CA')}</div>
                {selected.envoye_le && <div style={{fontSize:'0.7rem',color:'#e6a817',marginBottom:'4px'}}>📤 Envoyé {new Date(selected.envoye_le).toLocaleDateString('fr-CA')}</div>}
                {selected.ouvert_le && <div style={{fontSize:'0.7rem',color:'#22a060',marginBottom:'6px'}}>📬 Vu le {new Date(selected.ouvert_le).toLocaleString('fr-CA',{dateStyle:'short',timeStyle:'short'})}</div>}
                <StatutBadge statut={selected.statut}/>
              </div>
            </div>
            {selected.description&&<div style={{fontSize:'0.84rem',color:'#a8c4e0',padding:'10px',background:'rgba(255,255,255,0.04)',borderRadius:'6px',marginBottom:'12px'}}>{selected.description}</div>}

            {/* Lignes */}
            {selectedLignes.length>0&&(
              <div>
                <div style={{fontSize:'0.6rem',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase',color:'#6b7a8d',marginBottom:'8px'}}>Détail des travaux</div>
                <div style={{display:'grid',gridTemplateColumns:'3fr 1fr 0.8fr 0.8fr 1fr 1fr',gap:'4px',marginBottom:'4px',padding:'0 4px'}}>
                  {['Description','Catégorie','Unité','Qté','Prix unit.','Sous-total'].map(h=>(
                    <div key={h} style={{fontSize:'0.58rem',fontWeight:'700',letterSpacing:'1px',textTransform:'uppercase',color:'#6b7a8d'}}>{h}</div>
                  ))}
                </div>
                {selectedLignes.map(l=>(
                  <div key={l.id} style={{display:'grid',gridTemplateColumns:'3fr 1fr 0.8fr 0.8fr 1fr 1fr',gap:'4px',padding:'7px 4px',borderTop:'1px solid rgba(46,64,96,0.5)',alignItems:'center'}}>
                    <div style={{fontSize:'0.84rem',color:'white'}}>{l.description}</div>
                    <div style={{fontSize:'0.75rem',color:'#6b7a8d'}}>{l.categorie}</div>
                    <div style={{fontSize:'0.75rem',color:'#6b7a8d'}}>{l.unite}</div>
                    <div style={{fontSize:'0.84rem',color:'#a8c4e0'}}>{l.quantite}</div>
                    <div style={{fontSize:'0.84rem',color:'#a8c4e0'}}>{fmt(l.prix_unitaire)} $</div>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.95rem',color:'var(--yellow)'}}>{fmt(l.sous_total)} $</div>
                  </div>
                ))}
              </div>
            )}

            {/* Totaux */}
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:'14px',paddingTop:'10px',borderTop:'1px solid var(--border)'}}>
              <div style={{minWidth:'280px'}}>
                <div style={{display:'flex',justifyContent:'space-between',padding:'3px 0'}}>
                  <span style={{fontSize:'0.8rem',color:'#6b7a8d'}}>Sous-total travaux</span>
                  <span style={{fontSize:'0.9rem',color:'#a8c4e0'}}>{fmt(selected.sous_total)} $</span>
                </div>
                {Number(selected.frais_service)>0 && (
                  <div style={{display:'flex',justifyContent:'space-between',padding:'3px 0'}}>
                    <span style={{fontSize:'0.8rem',color:'var(--blue2)'}}>Frais de service ({selected.frais_service}%)</span>
                    <span style={{fontSize:'0.9rem',color:'var(--blue2)'}}>{fmt(selected.frais_service_montant)} $</span>
                  </div>
                )}
                {[['TPS (5%)',fmt(selected.tps)+' $'],['TVQ (9.975%)',fmt(selected.tvq)+' $']].map(([lbl,val])=>(
                  <div key={lbl} style={{display:'flex',justifyContent:'space-between',padding:'3px 0'}}>
                    <span style={{fontSize:'0.8rem',color:'#6b7a8d'}}>{lbl}</span>
                    <span style={{fontSize:'0.9rem',color:'#a8c4e0'}}>{val}</span>
                  </div>
                ))}
                <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderTop:'1px solid var(--border)',marginTop:'4px'}}>
                  <span style={{fontSize:'0.85rem',color:'white',fontWeight:'600'}}>TOTAL</span>
                  <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.3rem',color:'var(--yellow)'}}>{fmt(selected.total)} $</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{display:'flex',gap:'8px',justifyContent:'space-between',flexWrap:'wrap',marginTop:'4px'}}>
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={()=>printSoumission(selected,selectedLignes)} style={{background:'#1e3a5f',border:'none',color:'white',padding:'9px 20px',borderRadius:'7px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',letterSpacing:'2px',cursor:'pointer'}}>🖨 IMPRIMER / PDF</button>
              <button onClick={ouvrirEmailModal} style={{background:'var(--brick)',border:'none',color:'white',padding:'9px 20px',borderRadius:'7px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',letterSpacing:'2px',cursor:'pointer'}}>📧 ENVOYER PAR COURRIEL</button>
              <button onClick={()=>editBrouillon(selected,null)} style={{background:'rgba(230,168,23,0.15)',border:'1.5px solid var(--yellow)',color:'var(--yellow)',padding:'9px 20px',borderRadius:'7px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',letterSpacing:'2px',cursor:'pointer'}}>✏️ MODIFIER</button>
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              {selected.statut!=='acceptee'&&<button onClick={()=>changerStatut(selected.id,'acceptee')} style={{background:'rgba(34,160,96,0.15)',border:'1.5px solid #22a060',color:'#22a060',padding:'9px 20px',borderRadius:'7px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',letterSpacing:'2px',cursor:'pointer'}}>✓ ACCEPTÉE</button>}
              {selected.statut!=='refusee'&&<button onClick={()=>changerStatut(selected.id,'refusee')} style={{background:'rgba(192,57,43,0.15)',border:'1.5px solid #c0392b',color:'#e57373',padding:'9px 20px',borderRadius:'7px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',letterSpacing:'2px',cursor:'pointer'}}>✕ REFUSÉE</button>}
              <button onClick={()=>deleteSoumission(selected.id,null)} style={{background:'rgba(192,57,43,0.15)',border:'1.5px solid #c0392b',color:'#e57373',padding:'9px 20px',borderRadius:'7px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',letterSpacing:'2px',cursor:'pointer'}}>🗑 SUPPRIMER</button>
            </div>
          </div>
        </>
      )}

      {/* ── MODAL EMAIL ── */}
      {emailModal && selected && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'20px'}}>
          <div style={{background:'#1a2a3a',border:'1px solid #2e4060',borderRadius:'12px',width:'100%',maxWidth:'520px'}}>
            {/* Header */}
            <div style={{padding:'16px 20px',borderBottom:'1px solid #2e4060',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.1rem',letterSpacing:'2px',color:'#a8c4e0'}}>📧 ENVOYER PAR COURRIEL</div>
              <button onClick={()=>setEmailModal(false)} style={{background:'none',border:'none',color:'#6b7a8d',fontSize:'1.4rem',cursor:'pointer',lineHeight:1}}>×</button>
            </div>

            <div style={{padding:'20px'}}>

              {/* Succès */}
              {emailResult==='ok' && (
                <div style={{textAlign:'center',padding:'20px 0'}}>
                  <div style={{fontSize:'2.8rem',marginBottom:'10px'}}>✅</div>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.2rem',letterSpacing:'2px',color:'#22a060',marginBottom:'6px'}}>Courriel envoyé!</div>
                  <div style={{color:'#6b7a8d',fontSize:'0.85rem',marginBottom:'6px'}}>La soumission a été envoyée à <strong style={{color:'white'}}>{emailOverride}</strong></div>
                  <div style={{color:'#6b7a8d',fontSize:'0.8rem',marginBottom:'20px'}}>Tu recevras une notification quand le client ouvrira le courriel.</div>
                  <button onClick={()=>setEmailModal(false)} style={{background:'var(--blue2)',border:'none',color:'white',padding:'10px 28px',borderRadius:'7px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.95rem',letterSpacing:'2px',cursor:'pointer'}}>FERMER</button>
                </div>
              )}

              {/* Erreur */}
              {emailResult==='err' && (
                <div style={{marginBottom:'14px',background:'rgba(192,57,43,0.12)',border:'1px solid rgba(192,57,43,0.4)',borderRadius:'7px',padding:'12px 14px',color:'#e57373',fontSize:'0.84rem'}}>
                  ⚠️ {emailErr}
                </div>
              )}

              {/* Formulaire */}
              {emailResult!=='ok' && (
                <>
                  <div style={{marginBottom:'16px'}}>
                    <label style={{...labelS,marginBottom:'6px',display:'block'}}>Adresse courriel du client *</label>
                    <input type="email" value={emailOverride} onChange={e=>setEmailOverride(e.target.value)}
                      placeholder="client@exemple.com" style={{...inputS,fontSize:'0.95rem'}} disabled={emailSending}/>
                    {!emailOverride.trim()
                      ? <div style={{color:'#e57373',fontSize:'0.78rem',marginTop:'4px'}}>⚠️ Aucun courriel enregistré — entre-le ci-dessus</div>
                      : <div style={{color:'#22a060',fontSize:'0.78rem',marginTop:'4px'}}>✅ {emailOverride}</div>
                    }
                  </div>

                  {/* Aperçu */}
                  <div style={{background:'#0f1923',border:'1px solid #2e4060',borderRadius:'7px',padding:'12px 14px',marginBottom:'16px',fontSize:'0.8rem',lineHeight:'1.6'}}>
                    <div style={{marginBottom:'7px',paddingBottom:'7px',borderBottom:'1px solid #2e4060'}}>
                      <span style={{color:'#6b7a8d'}}>À : </span><span style={{color:'white'}}>{emailOverride||'—'}</span><br/>
                      <span style={{color:'#6b7a8d'}}>Objet : </span><span style={{color:'white'}}>Soumission {selected.no_soumission} — Brikma Construction Inc.</span>
                    </div>
                    <div style={{color:'#8fa8c8',fontSize:'0.78rem'}}>
                      Courriel HTML professionnel avec la soumission complète :<br/>
                      logo · parties · tableau des travaux · totaux · zone de signature
                    </div>
                  </div>

                  {/* Info tracking */}
                  <div style={{background:'rgba(34,160,96,0.07)',border:'1px solid rgba(34,160,96,0.2)',borderRadius:'7px',padding:'10px 14px',marginBottom:'16px',fontSize:'0.79rem',color:'#6b9a78'}}>
                    🔔 Tu seras notifié dans le dashboard quand le client ouvre le courriel
                  </div>

                  <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
                    <button onClick={()=>setEmailModal(false)} disabled={emailSending} style={{background:'transparent',border:'1px solid #2e4060',color:'#6b7a8d',padding:'10px 20px',borderRadius:'7px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.88rem',letterSpacing:'1.5px',cursor:'pointer'}}>ANNULER</button>
                    <button onClick={envoyerEmail} disabled={!emailOverride.trim()||emailSending}
                      style={{background:emailOverride.trim()&&!emailSending?'var(--brick)':'#3a5070',border:'none',color:'white',padding:'10px 24px',borderRadius:'7px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.95rem',letterSpacing:'2px',cursor:emailOverride.trim()&&!emailSending?'pointer':'not-allowed',minWidth:'180px'}}>
                      {emailSending ? '⏳ ENVOI EN COURS...' : '📧 ENVOYER'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
