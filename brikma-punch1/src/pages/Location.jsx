import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const TPS_RATE = 0.05
const TVQ_RATE = 0.09975
const CATEGORIES_ART = ['Échafaudage','Coffrage','Étaiement','Équipement','Accessoires','Autre']
const MODES_PAIEMENT = ['Comptant','Chèque','Virement','Carte de crédit']
const TYPES_ID = ['Permis de conduire','Passeport','Carte d\'identité','Autre']

const css = `
  :root{--navy:#1e3a5f;--blue:#2563a8;--blue2:#3b82c4;--brick:#c0623a;--green2:#22a060;--orange:#d97706;--red:#c0392b;--yellow:#e6a817;--bg:#0f1923;--card:#1a2a3a;--border:#2e4060;--muted:#6b7a8d;}
  *{box-sizing:border-box;}
  input,select,textarea{font-family:'Outfit',sans-serif;}
`
const inputS = {width:'100%',background:'#0f1923',border:'1.5px solid #2e4060',color:'white',borderRadius:'6px',padding:'8px 11px',fontSize:'0.85rem',outline:'none'}
const labelS = {fontSize:'0.6rem',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase',color:'#6b7a8d',display:'block',marginBottom:'4px'}
const cardS = {background:'#1a2a3a',border:'1px solid #2e4060',borderRadius:'9px',padding:'16px',marginBottom:'14px'}

function calcArticle(a,jours){ return Number(a.quantite||0)*Number(a.prix_jour||0)*Math.max(1,jours) }
function calcDuree(d1,d2){
  if(!d1||!d2) return 0
  const diff=(new Date(d2)-new Date(d1))/(1000*60*60*24)
  return Math.max(1,Math.round(diff))
}
function calcTotaux(articles,jours){
  const sous_total=articles.reduce((s,a)=>s+calcArticle(a,jours),0)
  const tps=sous_total*TPS_RATE
  const tvq=sous_total*TVQ_RATE
  return{sous_total,tps,tvq,total:sous_total+tps+tvq}
}
function genNo(list){
  const yr=new Date().getFullYear()
  const nums=list.map(l=>{const p=l.no_contrat?.split('-');return p?.length===3?parseInt(p[2])||0:0})
  const next=Math.max(0,...nums)+1
  return `LOC-${yr}-${String(next).padStart(4,'0')}`
}
function fmt(n){return Number(n||0).toFixed(2)}
function fmtDate(d){return d?new Date(d+'T00:00:00').toLocaleDateString('fr-CA'):'—'}

function StatutBadge({statut}){
  const c={actif:{bg:'rgba(34,160,96,0.12)',cl:'#22a060',t:'Actif'},termine:{bg:'rgba(59,130,196,0.12)',cl:'#3b82c4',t:'Terminé'},annule:{bg:'rgba(192,57,43,0.12)',cl:'#e57373',t:'Annulé'}}[statut]||{bg:'rgba(59,130,196,0.12)',cl:'#3b82c4',t:statut}
  return <span style={{background:c.bg,color:c.cl,padding:'3px 10px',borderRadius:'4px',fontSize:'0.72rem',fontWeight:'700',letterSpacing:'1px'}}>{c.t}</span>
}

export default function Location(){
  const [list,setList]=useState([])
  const [view,setView]=useState('list')
  const [selected,setSelected]=useState(null)
  const [selectedArticles,setSelectedArticles]=useState([])
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [msg,setMsg]=useState('')

  const [form,setForm]=useState({client_nom:'',client_tel:'',client_email:'',client_adresse:'',id_type:'Permis de conduire',id_no:'',date_depart:'',date_retour:'',chantier:'',mode_paiement:'Comptant',depot:0})
  const [articles,setArticles]=useState([{article:'',categorie:'Échafaudage',quantite:1,prix_jour:0}])

  useEffect(()=>{fetchList()},[])

  async function fetchList(){
    setLoading(true)
    const{data}=await supabase.from('locations').select('*').order('created_at',{ascending:false})
    setList(data||[])
    setLoading(false)
  }

  async function openDetail(l){
    setSelected(l)
    const{data}=await supabase.from('location_articles').select('*').eq('location_id',l.id)
    setSelectedArticles(data||[])
    setView('detail')
  }

  function nouvelleForm(){
    const today=new Date().toISOString().slice(0,10)
    setForm({client_nom:'',client_tel:'',client_email:'',client_adresse:'',id_type:'Permis de conduire',id_no:'',date_depart:today,date_retour:today,chantier:'',mode_paiement:'Comptant',depot:0})
    setArticles([{article:'',categorie:'Échafaudage',quantite:1,prix_jour:0}])
    setMsg('')
    setView('form')
  }

  function updArticle(i,k,v){setArticles(prev=>{const n=[...prev];n[i]={...n[i],[k]:v};return n})}
  function addArticle(){setArticles(prev=>[...prev,{article:'',categorie:'Échafaudage',quantite:1,prix_jour:0}])}
  function removeArticle(i){setArticles(prev=>prev.filter((_,idx)=>idx!==i))}

  const duree=calcDuree(form.date_depart,form.date_retour)
  const totaux=calcTotaux(articles,duree)

  async function sauvegarder(){
    if(!form.client_nom.trim()){setMsg('Nom du client requis');return}
    if(!form.date_depart||!form.date_retour){setMsg('Dates requises');return}
    setSaving(true);setMsg('')
    const no_contrat=genNo(list)
    const{sous_total,tps,tvq,total}=calcTotaux(articles,duree)
    const{data:loc,error:e1}=await supabase.from('locations').insert({...form,no_contrat,statut:'actif',sous_total,tps,tvq,total,depot:Number(form.depot)}).select().single()
    if(e1){setMsg('Erreur: '+e1.message);setSaving(false);return}
    const ad=articles.filter(a=>a.article.trim()).map(a=>({location_id:loc.id,article:a.article,categorie:a.categorie,quantite:Number(a.quantite),prix_jour:Number(a.prix_jour),sous_total:calcArticle(a,duree)}))
    if(ad.length) await supabase.from('location_articles').insert(ad)
    setMsg('✅ Contrat sauvegardé!')
    fetchList()
    setSaving(false)
    setTimeout(()=>{setView('list');setMsg('')},1200)
  }

  async function changerStatut(id,statut){
    await supabase.from('locations').update({statut}).eq('id',id)
    setSelected(prev=>({...prev,statut}))
    fetchList()
  }

  /* ── LIST ── */
  if(view==='list') return(
    <div><style>{css}</style>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.2rem',letterSpacing:'2px',color:'#a8c4e0'}}>🏗 LOCATIONS ({list.length})</div>
        <button onClick={nouvelleForm} style={{background:'var(--brick)',border:'none',color:'white',padding:'9px 22px',borderRadius:'6px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',letterSpacing:'2px',cursor:'pointer'}}>+ NOUVEAU CONTRAT</button>
      </div>
      {loading&&<div style={{color:'#6b7a8d',textAlign:'center',padding:'40px'}}>Chargement...</div>}
      {!loading&&list.length===0&&<div style={{color:'#6b7a8d',textAlign:'center',padding:'40px'}}>Aucun contrat — créez-en un!</div>}
      <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
        {list.map(l=>(
          <div key={l.id} onClick={()=>openDetail(l)} style={{background:'var(--card)',border:'1.5px solid var(--border)',borderRadius:'8px',padding:'13px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:'180px'}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',letterSpacing:'2px',color:'var(--orange)'}}>{l.no_contrat}</div>
              <div style={{fontWeight:'600',color:'white',fontSize:'0.9rem'}}>{l.client_nom}</div>
              <div style={{fontSize:'0.73rem',color:'#6b7a8d'}}>{fmtDate(l.date_depart)} → {fmtDate(l.date_retour)}</div>
            </div>
            <div style={{textAlign:'right',minWidth:'100px'}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.1rem',color:'var(--yellow)'}}>{fmt(l.total)} $</div>
              <div style={{fontSize:'0.7rem',color:'#6b7a8d'}}>Dépôt: {fmt(l.depot)} $</div>
            </div>
            <StatutBadge statut={l.statut}/>
          </div>
        ))}
      </div>
    </div>
  )

  /* ── FORM ── */
  if(view==='form') return(
    <div><style>{css}</style>
      <button onClick={()=>setView('list')} style={{background:'transparent',border:'1px solid var(--border)',color:'#6b7a8d',padding:'7px 14px',borderRadius:'6px',cursor:'pointer',fontSize:'0.82rem',marginBottom:'16px'}}>← Retour</button>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.2rem',letterSpacing:'2px',color:'#a8c4e0',marginBottom:'14px'}}>🏗 NOUVEAU CONTRAT — {genNo(list)}</div>

      {/* CLIENT + ID */}
      <div style={cardS}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.85rem',letterSpacing:'2px',color:'var(--orange)',marginBottom:'12px'}}>👤 INFORMATIONS CLIENT</div>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:'10px',marginBottom:'10px'}}>
          <div><label style={labelS}>Nom du client *</label><input value={form.client_nom} onChange={e=>setForm({...form,client_nom:e.target.value})} placeholder="Nom ou entreprise" style={inputS}/></div>
          <div><label style={labelS}>Téléphone</label><input value={form.client_tel} onChange={e=>setForm({...form,client_tel:e.target.value})} placeholder="514-XXX-XXXX" style={inputS}/></div>
          <div><label style={labelS}>Courriel</label><input value={form.client_email} onChange={e=>setForm({...form,client_email:e.target.value})} placeholder="client@email.com" style={inputS}/></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px',marginBottom:'10px'}}>
          <div><label style={labelS}>Adresse client</label><input value={form.client_adresse} onChange={e=>setForm({...form,client_adresse:e.target.value})} placeholder="123 rue..." style={inputS}/></div>
          <div><label style={labelS}>Type pièce d'identité</label>
            <select value={form.id_type} onChange={e=>setForm({...form,id_type:e.target.value})} style={inputS}>
              {TYPES_ID.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div><label style={labelS}>Numéro pièce d'identité</label><input value={form.id_no} onChange={e=>setForm({...form,id_no:e.target.value})} placeholder="No. de la pièce" style={inputS}/></div>
        </div>
      </div>

      {/* DATES + DÉPÔT */}
      <div style={cardS}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.85rem',letterSpacing:'2px',color:'var(--orange)',marginBottom:'12px'}}>📅 CONTRAT DE LOCATION</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',gap:'10px'}}>
          <div><label style={labelS}>Date départ *</label><input type="date" value={form.date_depart} onChange={e=>setForm({...form,date_depart:e.target.value})} style={inputS}/></div>
          <div><label style={labelS}>Date retour *</label><input type="date" value={form.date_retour} onChange={e=>setForm({...form,date_retour:e.target.value})} style={inputS}/></div>
          <div><label style={labelS}>Durée (calculée)</label><div style={{...inputS,color:'var(--orange)',fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',letterSpacing:'1px'}}>{duree} jour{duree>1?'s':''}</div></div>
          <div><label style={labelS}>Adresse chantier</label><input value={form.chantier} onChange={e=>setForm({...form,chantier:e.target.value})} placeholder="Adresse chantier" style={inputS}/></div>
          <div><label style={labelS}>Mode de paiement</label>
            <select value={form.mode_paiement} onChange={e=>setForm({...form,mode_paiement:e.target.value})} style={inputS}>
              {MODES_PAIEMENT.map(m=><option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div style={{marginTop:'10px',maxWidth:'200px'}}>
          <label style={labelS}>Dépôt de garantie ($)</label>
          <input type="number" value={form.depot} onChange={e=>setForm({...form,depot:e.target.value})} placeholder="0.00" style={inputS}/>
        </div>
      </div>

      {/* ARTICLES */}
      <div style={cardS}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.85rem',letterSpacing:'2px',color:'var(--orange)',marginBottom:'12px'}}>📦 ARTICLES EN LOCATION</div>
        <div style={{display:'grid',gridTemplateColumns:'3fr 1.2fr 0.8fr 1fr 80px',gap:'6px',marginBottom:'6px',padding:'0 2px'}}>
          {['Article','Catégorie','Qté',`Prix/jour (×${duree}j)`,'Total'].map(h=>(
            <div key={h} style={{fontSize:'0.58rem',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase',color:'#6b7a8d'}}>{h}</div>
          ))}
        </div>
        {articles.map((a,i)=>(
          <div key={i} style={{display:'grid',gridTemplateColumns:'3fr 1.2fr 0.8fr 1fr 80px',gap:'6px',marginBottom:'6px',alignItems:'center'}}>
            <input value={a.article} onChange={e=>updArticle(i,'article',e.target.value)} placeholder="Nom de l'article..." style={{...inputS,padding:'6px 8px',fontSize:'0.82rem'}}/>
            <select value={a.categorie} onChange={e=>updArticle(i,'categorie',e.target.value)} style={{...inputS,padding:'6px 8px',fontSize:'0.82rem'}}>
              {CATEGORIES_ART.map(c=><option key={c}>{c}</option>)}
            </select>
            <input type="number" value={a.quantite} onChange={e=>updArticle(i,'quantite',e.target.value)} style={{...inputS,padding:'6px 8px',fontSize:'0.82rem'}}/>
            <input type="number" value={a.prix_jour} onChange={e=>updArticle(i,'prix_jour',e.target.value)} placeholder="0.00" style={{...inputS,padding:'6px 8px',fontSize:'0.82rem'}}/>
            <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',color:'var(--yellow)',whiteSpace:'nowrap'}}>{fmt(calcArticle(a,duree))}$</span>
              {articles.length>1&&<button onClick={()=>removeArticle(i)} style={{background:'none',border:'none',color:'#e57373',cursor:'pointer',fontSize:'1.1rem',lineHeight:1}}>×</button>}
            </div>
          </div>
        ))}
        <button onClick={addArticle} style={{background:'rgba(217,119,6,0.08)',border:'1px dashed var(--orange)',color:'var(--orange)',padding:'8px',borderRadius:'6px',cursor:'pointer',fontSize:'0.82rem',marginTop:'8px',width:'100%'}}>+ Ajouter un article</button>
      </div>

      {/* TOTAUX */}
      <div style={{background:'linear-gradient(135deg,var(--navy),#1a3a5a)',border:'1px solid var(--border)',borderRadius:'9px',padding:'16px',marginBottom:'14px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'20px',flexWrap:'wrap'}}>
          <div>
            <div style={{fontSize:'0.6rem',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase',color:'#6b7a8d',marginBottom:'4px'}}>Dépôt de garantie</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.2rem',color:'var(--orange)'}}>{fmt(form.depot)} $</div>
          </div>
          <div style={{minWidth:'280px'}}>
            {[['Sous-total ('+duree+' jour'+(duree>1?'s':'')+' × articles)',fmt(totaux.sous_total)+' $','white'],['TPS (5%)',fmt(totaux.tps)+' $','#8fa8c8'],['TVQ (9.975%)',fmt(totaux.tvq)+' $','#8fa8c8'],['TOTAL',fmt(totaux.total)+' $','var(--yellow)']].map(([lbl,val,clr],idx)=>(
              <div key={lbl} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0',borderTop:idx===3?'1px solid rgba(255,255,255,0.15)':'none',marginTop:idx===3?'4px':'0'}}>
                <span style={{fontSize:'0.78rem',color:'#8fa8c8'}}>{lbl}</span>
                <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:idx===3?'1.4rem':'1rem',color:clr}}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {msg&&<div style={{padding:'10px 14px',borderRadius:'7px',marginBottom:'12px',background:msg.includes('✅')?'rgba(34,160,96,0.15)':'rgba(192,57,43,0.15)',color:msg.includes('✅')?'#22a060':'#e57373',fontSize:'0.84rem'}}>{msg}</div>}

      <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
        <button onClick={sauvegarder} disabled={saving} style={{background:'var(--brick)',border:'none',color:'white',padding:'11px 28px',borderRadius:'7px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',letterSpacing:'2px',cursor:saving?'not-allowed':'pointer'}}>{saving?'...':'💾 CRÉER LE CONTRAT'}</button>
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
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.4rem',letterSpacing:'3px',color:'var(--orange)'}}>{selected.no_contrat}</div>
                <div style={{fontSize:'1rem',fontWeight:'600',color:'white',marginTop:'2px'}}>{selected.client_nom}</div>
                {selected.client_tel&&<div style={{fontSize:'0.8rem',color:'#6b7a8d'}}>{selected.client_tel} {selected.client_email&&'· '+selected.client_email}</div>}
                {selected.client_adresse&&<div style={{fontSize:'0.8rem',color:'#6b7a8d'}}>{selected.client_adresse}</div>}
                <div style={{fontSize:'0.8rem',color:'#a8c4e0',marginTop:'6px'}}>🪪 {selected.id_type} : {selected.id_no||'—'}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.6rem',color:'var(--yellow)'}}>{fmt(selected.total)} $</div>
                <div style={{fontSize:'0.75rem',color:'var(--orange)'}}>{fmtDate(selected.date_depart)} → {fmtDate(selected.date_retour)}</div>
                <div style={{fontSize:'0.7rem',color:'#6b7a8d',marginBottom:'6px'}}>Dépôt: {fmt(selected.depot)} $</div>
                <StatutBadge statut={selected.statut}/>
              </div>
            </div>
            {selected.chantier&&<div style={{fontSize:'0.84rem',color:'#a8c4e0',marginBottom:'8px'}}>📍 {selected.chantier} · {selected.mode_paiement}</div>}

            {selectedArticles.length>0&&(
              <div>
                <div style={{fontSize:'0.6rem',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase',color:'#6b7a8d',marginBottom:'8px'}}>Articles loués</div>
                <div style={{display:'grid',gridTemplateColumns:'3fr 1fr 0.8fr 1fr 1fr',gap:'4px',marginBottom:'4px',padding:'0 4px'}}>
                  {['Article','Catégorie','Qté','Prix/jour','Sous-total'].map(h=>(
                    <div key={h} style={{fontSize:'0.58rem',fontWeight:'700',letterSpacing:'1px',textTransform:'uppercase',color:'#6b7a8d'}}>{h}</div>
                  ))}
                </div>
                {selectedArticles.map(a=>(
                  <div key={a.id} style={{display:'grid',gridTemplateColumns:'3fr 1fr 0.8fr 1fr 1fr',gap:'4px',padding:'7px 4px',borderTop:'1px solid rgba(46,64,96,0.5)',alignItems:'center'}}>
                    <div style={{fontSize:'0.84rem',color:'white'}}>{a.article}</div>
                    <div style={{fontSize:'0.75rem',color:'#6b7a8d'}}>{a.categorie}</div>
                    <div style={{fontSize:'0.84rem',color:'#a8c4e0'}}>{a.quantite}</div>
                    <div style={{fontSize:'0.84rem',color:'#a8c4e0'}}>{fmt(a.prix_jour)} $</div>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.95rem',color:'var(--yellow)'}}>{fmt(a.sous_total)} $</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{display:'flex',justifyContent:'flex-end',marginTop:'14px',paddingTop:'10px',borderTop:'1px solid var(--border)'}}>
              <div style={{minWidth:'260px'}}>
                {[['Sous-total',fmt(selected.sous_total)+' $'],['TPS (5%)',fmt(selected.tps)+' $'],['TVQ (9.975%)',fmt(selected.tvq)+' $']].map(([lbl,val])=>(
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

          <div style={{display:'flex',gap:'8px',justifyContent:'flex-end',flexWrap:'wrap'}}>
            {selected.statut!=='termine'&&<button onClick={()=>changerStatut(selected.id,'termine')} style={{background:'rgba(59,130,196,0.15)',border:'1.5px solid #3b82c4',color:'#3b82c4',padding:'9px 20px',borderRadius:'7px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',letterSpacing:'2px',cursor:'pointer'}}>✓ RETOUR COMPLÉTÉ</button>}
            {selected.statut!=='annule'&&<button onClick={()=>changerStatut(selected.id,'annule')} style={{background:'rgba(192,57,43,0.15)',border:'1.5px solid #c0392b',color:'#e57373',padding:'9px 20px',borderRadius:'7px',fontFamily:"'Bebas Neue',sans-serif",fontSize:'0.9rem',letterSpacing:'2px',cursor:'pointer'}}>✕ ANNULER</button>}
          </div>
        </>
      )}
    </div>
  )
}
