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
function calcTotaux(ls, fraisPct=0){
  const sous_total = ls.reduce((s,l)=>s+calcLigne(l),0)
  const frais_montant = sous_total * Number(fraisPct) / 100
  const base = sous_total + frais_montant
  const tps = base*TPS_RATE
  const tvq = base*TVQ_RATE
  return {sous_total, frais_service:Number(fraisPct), frais_montant, tps, tvq, total:base+tps+tvq}
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
  const [editingId,setEditingId]=useState(null)
  const [editingNo,setEditingNo]=useState(null)

  const [form,setForm]=useState({client_nom:'',client_tel:'',client_email:'',client_adresse:'',chantier:'',type_batiment:'',description:''})
  const [lignes,setLignes]=useState([{description:'',categorie:'Matériaux',unite:'unité',quantite:1,prix_unitaire:0}])
  const [fraisService,setFraisService]=useState(0)

  useEffect(()=>{fetchList()},[])

  async function fetchList(){
    setLoading(true)
    const{data}=await supabase.from('soumissions').select('*').order('created_at',{ascending:false})
    setList(data||[])
    setLoading(false)
  }

  async function openDetail(s){
    setSelected(s)
    const{data}=await supabase.from('soumission_lignes').select('*').eq('soumission_id',s.id)
    setSelectedLignes(data||[])
    setView('detail')
  }

  function nouvelleForm(){
    setEditingId(null)
    setEditingNo(null)
    setFraisService(0)
    setForm({client_nom:'',client_tel:'',client_email:'',client_adresse:'',chantier:'',type_batiment:'',description:''})
    setLignes([{description:'',categorie:'Matériaux',unite:'unité',quantite:1,prix_unitaire:0}])
    setMsg('')
    setView('form')
  }

  async function ouvrirEdition(soum){
    setEditingId(soum.id)
    setEditingNo(soum.no_soumission)
    setFraisService(soum.frais_service||0)
    setForm({
      client_nom:soum.client_nom||'',
      client_tel:soum.client_tel||'',
      client_email:soum.client_email||'',
      client_adresse:soum.client_adresse||'',
      chantier:soum.chantier||'',
      type_batiment:soum.type_batiment||'',
      description:soum.description||''
    })
    const{data}=await supabase.from('soumission_lignes').select('*').eq('soumission_id',soum.id)
    setLignes(data?.length
      ? data.map(l=>({description:l.description,categorie:l.categorie,unite:l.unite,quantite:l.quantite,prix_unitaire:l.prix_unitaire}))
      : [{description:'',categorie:'Matériaux',unite:'unité',quantite:1,prix_unitaire:0}]
    )
    setMsg('')
    setView('form')
  }

  async function supprimer(id){
    if(!window.confirm('Supprimer cette soumission? Cette action est irréversible.')) return
    await supabase.from('soumissions').delete().eq('id',id)
    setView('list')
    fetchList()
  }

  function updLigne(i,k,v){setLignes(prev=>{const n=[...prev];n[i]={...n[i],[k]:v};return n})}
  function addLigne(){setLignes(prev=>[...prev,{description:'',categorie:'Matériaux',unite:'unité',quantite:1,prix_unitaire:0}])}
  function removeLigne(i){setLignes(prev=>prev.filter((_,idx)=>idx!==i))}

  const totaux = calcTotaux(lignes, fraisService)

  async function sauvegarder(statut){
    if(!form.client_nom.trim()){setMsg('Nom du client requis');return}
    setSaving(true);setMsg('')
    const{sous_total,frais_service,tps,tvq,total}=calcTotaux(lignes,fraisService)
    const payload={...form,statut,sous_total,frais_service,tps,tvq,total}

    let soumId=editingId
    if(editingId){
      const{error:eu}=await supabase.from('soumissions').update(payload).eq('id',editingId)
      if(eu){setMsg('Erreur: '+eu.message);setSaving(false);return}
      await supabase.from('soumission_lignes').delete().eq('soumission_id',editingId)
    } else {
      const no_soumission=genNo(list)
      const{data:soum,error:e1}=await supabase.from('soumissions').insert({...payload,no_soumission}).select().single()
      if(e1){setMsg('Erreur: '+e1.message);setSaving(false);return}
      soumId=soum.id
      if(statut==='envoye'&&form.client_email){
        envoyerEmailSoumission(form.client_email, no_soumission, total)
      }
    }

    const ld=lignes.filter(l=>l.description.trim()).map(l=>({soumission_id:soumId,description:l.description,categorie:l.categorie,unite:l.unite,quantite:Number(l.quantite),prix_unitaire:Number(l.prix_unitaire),sous_total:calcLigne(l)}))
    if(ld.length) await supabase.from('soumission_lignes').insert(ld)

    setMsg(editingId?'✅ Soumission mise à jour!':'✅ Soumission sauvegardée!')
    fetchList()
    setSaving(false)
    setTimeout(()=>{setView('list');setMsg('');setEditingId(null);setEditingNo(null)},1200)
  }

  async function envoyerEmailSoumission(to, no, total){
    try{
      await supabase.functions.invoke('send-email',{
        body:{
          to,
          subject:`Soumission ${no} — Brikma Construction`,
          html:`<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;border-radius:8px">
            <div style="background:#1e3a5f;padding:20px 24px;border-radius:6px 6px 0 0">
              <h1 style="color:white;margin:0;font-size:22px;letter-spacing:2px">BRIKMA CONSTRUCTION</h1>
            </div>
            <div style="background:white;padding:24px;border-radius:0 0 6px 6px">
              <h2 style="color:#1e3a5f;margin-top:0">Votre soumission ${no}</h2>
              <p style="color:#444">Bonjour,</p>
              <p style="color:#444">Nous avons le plaisir de vous faire parvenir votre soumission numéro <strong>${no}</strong>.</p>
              <div style="background:#f0f4f8;border-left:4px solid #c0623a;padding:16px;margin:20px 0;border-radius:0 6px 6px 0">
                <div style="font-size:13px;color:#666">Montant total (taxes incluses)</div>
                <div style="font-size:28px;font-weight:bold;color:#1e3a5f">${Number(total).toFixed(2)} $</div>
              </div>
              <p style="color:#444">N'hésitez pas à nous contacter pour toute question.</p>
              <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
              <p style="color:#999;font-size:12px;margin:0">Brikma Construction</p>
            </div>
          </div>`
        }
      })
    }catch(e){
      console.warn('Envoi courriel échoué:',e)
    }
  }

  async function changerStatut(id,statut){
    await supabase.from('soumissions').update({statut}).eq('id',id)
    setSelected(prev=>({...prev,statut}))
    fetchList()
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
          <div key={s.id} style={{background:'var(--card)',border:'1.5px solid var(--border)',borderRadius:'8px',padding:'13px 16px',display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
            <div onClick={()=>openDetail(s)} style={{flex:1,minWidth:'180px',cursor:'pointer'}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',letterSpacing:'2px',color:'var(--blue2)'}}>{s.no_soumission}</div>
              <div style={{fontWeight:'600',color:'white',fontSize:'0.9rem'}}>{s.client_nom}</div>
              <div style={{fontSize:'0.73rem',color:'#6b7a8d'}}>{s.chantier||'—'}</div>
            </div>
            <div onClick={()=>openDetail(s)} style={{textAlign:'right',minWidth:'100px',cursor:'pointer'}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.1rem',color:'var(--yellow)'}}>{fmt(s.total)} $</div>
              <div style={{fontSize:'0.7rem',color:'#6b7a8d'}}>{new Date(s.created_at).toLocaleDateString('fr-CA')}</div>
            </div>
            <StatutBadge statut={s.statut}/>
            <div style={{display:'flex',gap:'5px'}}>
              {s.statut==='brouillon'&&(
                <button
                  onClick={e=>{e.stopPropagation();ouvrirEdition(s)}}
                  title="Modifier"
                  style={{background:'rgba(59,130,196,0.15)',border:'1px solid #3b82c4',color:'#3b82c4',padding:'5px 9px',borderRadius:'5px',cursor:'pointer',fontSize:'0.85rem',lineHeight:1}}
                >✏️</button>
              )}
              <button
                onClick={e=>{e.stopPropagation();supprimer(s.id)}}
                title="Supprimer"
                style={{background:'rgba(192,57,43,0.12)',border:'1px solid #c0392b',color:'#e57373',padding:'5px 9px',borderRadius:'5px',cursor:'pointer',fontSize:'0.85rem',lineHeight:1}}
              >🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  /* ── FORM ── */
  if(view==='form') return(
    <div><style>{css}</style>
      <button
        onClick={()=>{setView('list');setEditingId(null);setEditingNo(null)}}
        style={{background:'transparent',border:'1px solid var(--border)',color:'#6b7a8d',padding:'7px 14px',borderRadius:'6px',cursor:'pointer',fontSize:'0.82rem',marginBottom:'16px'}}
      >← Retour</button>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.2rem',letterSpacing:'2px',color:'#a8c4e0',marginBottom:'14px'}}>
        📋 {editingId ? `MODIFIER — ${editingNo}` : `NOUVELLE SOUMISSION — ${genNo(list)}`}
      </div>

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

      {/* TOTAUX + FRAIS DE SERVICE */}
      <div style={{background:'linear-gradient(135deg,var(--navy),#1a3a5a)',border:'1px solid var(--border)',borderRadius:'9px',padding:'16px',marginBottom:'14px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'20px',flexWrap:'wrap'}}>
          <div style={{minWidth:'210px'}}>
            <label style={labelS}>Frais de service (%)</label>
            <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'7px'}}>
              <input
                type="number"
                value={fraisService}
                onChange={e=>setFraisService(e.target.value)}
                placeholder="0"
                min="0"
                max="100"
                style={{...inputS,maxWidth:'90px'}}
              />
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.1rem',color:'var(--orange)'}}>%</span>
            </div>
            <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
              {[0,5,10,15,20].map(p=>(
                <button
                  key={p}
                  type="button"
                  onClick={()=>setFraisService(p)}
                  style={{
                    padding:'3px 9px',borderRadius:'4px',fontSize:'0.75rem',cursor:'pointer',fontWeight:'600',
                    border: Number(fraisService)===p ? '1.5px solid var(--orange)' : '1px solid #2e4060',
                    background: Number(fraisService)===p ? 'rgba(217,119,6,0.2)' : 'transparent',
                    color: Number(fraisService)===p ? 'var(--orange)' : '#6b7a8d'
                  }}
                >{p===0?'Aucun':p+'%'}</button>
              ))}
            </div>
            {Number(fraisService)>0&&(
              <div style={{fontSize:'0.75rem',color:'var(--orange)',marginTop:'6px'}}>= {fmt(totaux.frais_montant)} $ sur le sous-total</div>
            )}
          </div>
          <div style={{minWidth:'280px'}}>
            {[
              ['Sous-total', fmt(totaux.sous_total)+' $', 'white', false],
              ...(Number(fraisService)>0 ? [[`Frais de service (${fraisService}%)`, fmt(totaux.frais_montant)+' $', 'var(--orange)', false]] : []),
              ['TPS (5%)', fmt(totaux.tps)+' $', '#8fa8c8', false],
              ['TVQ (9.975%)', fmt(totaux.tvq)+' $', '#8fa8c8', false],
              ['TOTAL', fmt(totaux.total)+' $', 'var(--yellow)', true],
            ].map(([lbl,val,clr,isTotal])=>(
              <div key={lbl} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0',borderTop:isTotal?'1px solid rgba(255,255,255,0.15)':'none',marginTop:isTotal?'4px':'0'}}>
                <span style={{fontSize:'0.82rem',color:'#8fa8c8'}}>{lbl}</span>
                <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:isTotal?'1.4rem':'1rem',color:clr}}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {msg&&<div style={{padding:'10px 14px',borderRadius:'7px',marginBottom:'12px',background:msg.includes('✅')?'rgba(34,160,96,0.15)':'rgba(192,57,43,0.15)',color:msg.includes('✅')?'#22a060':'#e57373',fontSize:'0.84rem'}}>{msg}</div>}

      <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
        <button onClick={()=>sauvegarder('brouillon')} disabled={saving} style={{background:'transparent',border:'1.5px solid var(--border)',color:'#6b7a8d',padding:'11px 22px',borderRadius:'7px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',letterSpacing:'2px',cursor:'pointer'}}>
          💾 BROUILLON
        </button>
        <button onClick={()=>sauvegarder('envoye')} disabled={saving} style={{background:'var(--brick)',border:'none',color:'white',padding:'11px 22px',borderRadius:'7px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',letterSpacing:'2px',cursor:saving?'not-allowed':'pointer'}}>
          {saving?'...':(editingId?'✅ ENREGISTRER':'📤 SOUMETTRE AU CLIENT')}
        </button>
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
                <div style={{fontSize:'0.7rem',color:'#6b7a8d',marginBottom:'6px'}}>{new Date(selected.created_at).toLocaleDateString('fr-CA')}</div>
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
              <div style={{minWidth:'260px'}}>
                {[
                  ['Sous-total', fmt(selected.sous_total)+' $'],
                  ...(Number(selected.frais_service)>0?[[`Frais de service (${selected.frais_service}%)`, fmt(selected.sous_total*selected.frais_service/100)+' $']]:[]),
                  ['TPS (5%)', fmt(selected.tps)+' $'],
                  ['TVQ (9.975%)', fmt(selected.tvq)+' $'],
                ].map(([lbl,val])=>(
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
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
              <button onClick={()=>printSoumission(selected,selectedLignes)} style={{background:'#1e3a5f',border:'none',color:'white',padding:'9px 20px',borderRadius:'7px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',letterSpacing:'2px',cursor:'pointer'}}>🖨 IMPRIMER / PDF</button>
              {selected.statut==='brouillon'&&(
                <button onClick={()=>ouvrirEdition(selected)} style={{background:'rgba(59,130,196,0.15)',border:'1.5px solid #3b82c4',color:'#3b82c4',padding:'9px 20px',borderRadius:'7px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',letterSpacing:'2px',cursor:'pointer'}}>✏️ MODIFIER</button>
              )}
              <button onClick={()=>supprimer(selected.id)} style={{background:'rgba(192,57,43,0.12)',border:'1.5px solid #c0392b',color:'#e57373',padding:'9px 20px',borderRadius:'7px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',letterSpacing:'2px',cursor:'pointer'}}>🗑 SUPPRIMER</button>
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              {selected.statut!=='acceptee'&&<button onClick={()=>changerStatut(selected.id,'acceptee')} style={{background:'rgba(34,160,96,0.15)',border:'1.5px solid #22a060',color:'#22a060',padding:'9px 20px',borderRadius:'7px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',letterSpacing:'2px',cursor:'pointer'}}>✓ ACCEPTÉE</button>}
              {selected.statut!=='refusee'&&<button onClick={()=>changerStatut(selected.id,'refusee')} style={{background:'rgba(192,57,43,0.15)',border:'1.5px solid #c0392b',color:'#e57373',padding:'9px 20px',borderRadius:'7px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',letterSpacing:'2px',cursor:'pointer'}}>✕ REFUSÉE</button>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
