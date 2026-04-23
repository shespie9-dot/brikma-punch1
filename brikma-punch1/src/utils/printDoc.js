const COMPANY = {
  nom: 'Brikma Construction Inc.',
  adresse: '8545 59e avenue, Laval QC H7R 4G5',
  tel: '438-998-2220',
  rbq: '5804-2102-01',
}

const TPS_NO = 'TPS : 123456789 RT0001'
const TVQ_NO = 'TVQ : 1234567890 TQ0001'

function fmt(n){ return Number(n||0).toFixed(2) }
function fmtDate(d){
  if(!d) return '—'
  return new Date(d+'T00:00:00').toLocaleDateString('fr-CA',{year:'numeric',month:'long',day:'numeric'})
}
function today(){ return new Date().toLocaleDateString('fr-CA',{year:'numeric',month:'long',day:'numeric'}) }

const baseStyle = `
  @page { margin: 15mm 20mm; size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #1a2030; background: white; }

  /* HEADER */
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e3a5f; padding-bottom: 14px; margin-bottom: 16px; }
  .logo-block { }
  .logo-icon { font-size: 28pt; line-height: 1; }
  .logo-name { font-size: 18pt; font-weight: 900; letter-spacing: 2px; color: #1e3a5f; line-height: 1.1; }
  .logo-sub { font-size: 8pt; letter-spacing: 3px; color: #c0623a; text-transform: uppercase; margin-top: 2px; }
  .company-info { text-align: right; font-size: 9.5pt; color: #444; line-height: 1.6; }
  .company-info strong { color: #1e3a5f; }

  /* DOCUMENT TITLE */
  .doc-title-bar { background: #1e3a5f; color: white; padding: 10px 16px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .doc-type { font-size: 16pt; font-weight: 900; letter-spacing: 3px; }
  .doc-no { font-size: 13pt; font-weight: 700; letter-spacing: 2px; color: #e6a817; }
  .doc-date { font-size: 9pt; color: #a8c4e0; margin-top: 2px; }

  /* SECTIONS */
  .two-col { display: flex; gap: 16px; margin-bottom: 14px; }
  .box { border: 1px solid #ccd6e0; border-radius: 4px; padding: 10px 12px; flex: 1; }
  .box-title { font-size: 7.5pt; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #c0623a; border-bottom: 1px solid #e0e8f0; padding-bottom: 5px; margin-bottom: 7px; }
  .box p { font-size: 10pt; line-height: 1.7; color: #222; }
  .box p strong { color: #1e3a5f; }

  /* TABLE */
  .section-title { font-size: 8pt; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #1e3a5f; margin-bottom: 6px; border-left: 3px solid #c0623a; padding-left: 8px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  thead tr { background: #1e3a5f; color: white; }
  thead th { padding: 7px 8px; text-align: left; font-size: 8pt; letter-spacing: 1px; text-transform: uppercase; font-weight: 700; }
  thead th.right { text-align: right; }
  tbody tr { border-bottom: 1px solid #e8edf5; }
  tbody tr:nth-child(even) { background: #f5f8fc; }
  tbody td { padding: 7px 8px; font-size: 10pt; color: #222; vertical-align: top; }
  tbody td.right { text-align: right; font-weight: 600; }
  tbody td.muted { color: #666; font-size: 9.5pt; }
  tfoot tr { background: #eef2f8; }
  tfoot td { padding: 6px 8px; font-size: 10pt; }

  /* TOTAUX */
  .totaux-wrap { display: flex; justify-content: flex-end; margin-bottom: 16px; }
  .totaux-table { width: 280px; }
  .totaux-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e8edf5; }
  .totaux-row:last-child { border-bottom: none; border-top: 2px solid #1e3a5f; margin-top: 4px; padding-top: 8px; }
  .totaux-lbl { font-size: 10pt; color: #555; }
  .totaux-val { font-size: 10pt; font-weight: 600; color: #222; }
  .totaux-row.total .totaux-lbl { font-size: 12pt; font-weight: 900; color: #1e3a5f; }
  .totaux-row.total .totaux-val { font-size: 14pt; font-weight: 900; color: #1e3a5f; }

  /* CONDITIONS */
  .conditions { background: #f5f8fc; border: 1px solid #ccd6e0; border-radius: 4px; padding: 10px 12px; margin-bottom: 16px; font-size: 8.5pt; color: #555; line-height: 1.6; }
  .conditions strong { color: #1e3a5f; display: block; margin-bottom: 4px; font-size: 9pt; }

  /* SIGNATURES */
  .signatures { display: flex; gap: 30px; margin-bottom: 20px; margin-top: 10px; }
  .sig-box { flex: 1; }
  .sig-title { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #1e3a5f; margin-bottom: 6px; }
  .sig-line { border-bottom: 1.5px solid #333; height: 50px; margin-bottom: 6px; }
  .sig-name { font-size: 9pt; color: #555; }

  /* FOOTER */
  .footer { border-top: 2px solid #1e3a5f; padding-top: 8px; display: flex; justify-content: space-between; font-size: 8pt; color: #666; }
  .footer .accent { color: #c0623a; font-weight: 700; }

  /* DÉPÔT BADGE */
  .depot-box { display: inline-block; background: #fff3e0; border: 1.5px solid #c0623a; border-radius: 4px; padding: 6px 14px; font-size: 10pt; color: #c0623a; font-weight: 700; margin-bottom: 14px; }
`

function header(){
  return `
    <div class="header">
      <div class="logo-block">
        <div class="logo-icon">🏗</div>
        <div class="logo-name">BRIKMA</div>
        <div class="logo-sub">Construction Inc.</div>
      </div>
      <div class="company-info">
        <strong>${COMPANY.nom}</strong><br>
        ${COMPANY.adresse}<br>
        Tél : ${COMPANY.tel}<br>
        RBQ : ${COMPANY.rbq}<br>
        ${TPS_NO}<br>
        ${TVQ_NO}
      </div>
    </div>`
}

function footer(){
  return `
    <div class="footer">
      <span><span class="accent">Brikma Construction Inc.</span> · ${COMPANY.adresse}</span>
      <span>${COMPANY.tel} · RBQ ${COMPANY.rbq}</span>
    </div>`
}

// ─────────────────────────────────────────────
// SOUMISSION — layout professionnel devis
// ─────────────────────────────────────────────
export function printSoumission(s, lignes = []){
  const dateDoc = today()
  const dateFin = (() => {
    const d = new Date(); d.setDate(d.getDate()+30)
    return d.toLocaleDateString('fr-CA',{year:'numeric',month:'long',day:'numeric'})
  })()

  const baseTaxable = Number(s.sous_total||0) + Number(s.frais_service_montant||0)
  const acompte30 = (baseTaxable * 0.30).toFixed(2)

  const lignesRows = lignes.length
    ? lignes.map((l,i)=>`
        <tr style="background:${i%2===0?'#fff':'#f7f9fc'}">
          <td style="padding:7px 8px;font-size:10pt;border-bottom:1px solid #e4eaf2;">${l.description||'—'}</td>
          <td style="padding:7px 8px;font-size:9pt;color:#666;border-bottom:1px solid #e4eaf2;">${l.unite}</td>
          <td style="padding:7px 8px;font-size:10pt;text-align:right;border-bottom:1px solid #e4eaf2;">${Number(l.quantite||0)}</td>
          <td style="padding:7px 8px;font-size:10pt;text-align:right;border-bottom:1px solid #e4eaf2;">${fmt(l.prix_unitaire)} $</td>
          <td style="padding:7px 8px;font-size:10pt;text-align:right;font-weight:600;border-bottom:1px solid #e4eaf2;">${fmt(l.sous_total)} $</td>
        </tr>`).join('')
    : `<tr><td colspan="5" style="text-align:center;color:#999;padding:16px;font-style:italic;">Aucune ligne de travaux</td></tr>`

  const style = `
    @page { margin: 12mm 16mm; size: A4; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; color: #1a2030; background: white; line-height: 1.45; }

    /* ── HEADER ── */
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 3px solid #1e3a5f; }
    .logo-circle { width: 72px; height: 72px; border-radius: 50%; background: #1e3a5f; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; }
    .logo-circle .lc-icon { font-size: 22pt; line-height: 1; }
    .logo-circle .lc-name { font-size: 7pt; font-weight: 900; letter-spacing: 2px; color: #e6a817; text-transform: uppercase; margin-top: 2px; }
    .doc-head-right { text-align: right; }
    .doc-title { font-size: 28pt; font-weight: 900; letter-spacing: 4px; color: #1e3a5f; line-height: 1; }
    .doc-no { font-size: 11pt; color: #444; margin-top: 4px; }
    .doc-no span { font-weight: 700; color: #1e3a5f; }
    .doc-date { font-size: 10pt; color: #666; margin-top: 2px; }

    /* ── PARTIES ── */
    .parties { display: flex; gap: 16px; margin-bottom: 14px; }
    .party-box { flex: 1; border: 1px solid #ccd6e0; border-radius: 3px; padding: 10px 12px; font-size: 10pt; line-height: 1.7; }
    .party-box .party-title { font-size: 7.5pt; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #c0623a; border-bottom: 1px solid #e4eaf2; padding-bottom: 5px; margin-bottom: 8px; }
    .party-box strong { color: #1e3a5f; font-size: 10.5pt; }

    /* ── INFOS SUPP ── */
    .infos-bar { background: #f5f8fc; border: 1px solid #dde5f0; border-radius: 3px; padding: 8px 12px; margin-bottom: 10px; font-size: 9pt; color: #555; display: flex; gap: 24px; flex-wrap: wrap; }
    .infos-bar span { display: flex; align-items: center; gap: 4px; }
    .infos-bar strong { color: #1e3a5f; }

    /* ── OBJET ── */
    .objet-line { margin-bottom: 12px; font-size: 10pt; }
    .objet-line strong { color: #1e3a5f; }

    /* ── TABLE ── */
    .table-title { font-size: 8pt; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #1e3a5f; margin-bottom: 6px; padding-left: 8px; border-left: 3px solid #c0623a; }
    table.items { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    table.items thead tr { background: #1e3a5f; }
    table.items thead th { padding: 8px 8px; text-align: left; font-size: 8pt; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: white; }
    table.items thead th.r { text-align: right; }

    /* ── BOTTOM SPLIT ── */
    .bottom-split { display: flex; gap: 20px; align-items: flex-start; margin-bottom: 16px; }
    .conditions-box { flex: 1.2; font-size: 9pt; color: #444; line-height: 1.7; }
    .conditions-box .cond-title { font-size: 9pt; font-weight: 700; color: #1e3a5f; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; }
    .conditions-box .acompte { display: inline-block; background: #fff3e0; border: 1.5px solid #c0623a; border-radius: 3px; padding: 5px 12px; font-size: 9.5pt; color: #c0623a; font-weight: 700; margin-top: 8px; }

    /* ── TOTAUX BOX ── */
    .totaux-box { flex: 1; }
    .totaux-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; border-bottom: 1px solid #e4eaf2; font-size: 10pt; }
    .totaux-row .tl { color: #555; }
    .totaux-row .tv { font-weight: 600; color: #1a2030; text-align: right; }
    .totaux-row.frais .tl { color: #2563a8; }
    .totaux-row.frais .tv { color: #2563a8; }
    .totaux-row.net { background: #1e3a5f; border-radius: 0 0 4px 4px; border-bottom: none; padding: 9px 12px; }
    .totaux-row.net .tl { color: white; font-weight: 900; font-size: 11pt; letter-spacing: 1px; }
    .totaux-row.net .tv { color: #e6a817; font-weight: 900; font-size: 13pt; }
    .totaux-header { background: #2e4a6e; padding: 6px 12px; border-radius: 4px 4px 0 0; font-size: 8pt; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #a8c4e0; }

    /* ── SIGNATURE ── */
    .sig-section { border: 1.5px dashed #a0b4cc; border-radius: 4px; padding: 14px 16px; margin-bottom: 14px; }
    .sig-section .sig-instr { font-size: 9pt; color: #666; margin-bottom: 10px; text-align: center; font-style: italic; }
    .sig-grid { display: flex; gap: 30px; }
    .sig-col { flex: 1; }
    .sig-col .sig-label { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #1e3a5f; margin-bottom: 5px; }
    .sig-col .sig-line { border-bottom: 1.5px solid #555; height: 44px; margin-bottom: 5px; }
    .sig-col .sig-sub { font-size: 8.5pt; color: #888; }

    /* ── FOOTER ── */
    .page-footer { border-top: 2px solid #1e3a5f; padding-top: 8px; text-align: center; font-size: 8pt; color: #777; line-height: 1.8; }
    .page-footer strong { color: #1e3a5f; }
  `

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Soumission ${s.no_soumission} — Brikma Construction</title>
  <style>${style}</style>
</head>
<body>

  <!-- HEADER -->
  <div class="page-header">
    <div style="display:flex;gap:14px;align-items:center;">
      <div class="logo-circle">
        <div class="lc-icon">🏗</div>
        <div class="lc-name">Brikma</div>
      </div>
      <div style="font-size:9.5pt;color:#444;line-height:1.7;">
        <strong style="font-size:11pt;color:#1e3a5f;">${COMPANY.nom}</strong><br>
        ${COMPANY.adresse}<br>
        Tél : ${COMPANY.tel}<br>
        RBQ : ${COMPANY.rbq}
      </div>
    </div>
    <div class="doc-head-right">
      <div class="doc-title">SOUMISSION</div>
      <div class="doc-no">Numéro : <span>${s.no_soumission}</span></div>
      <div class="doc-date">Date d'émission : ${dateDoc}</div>
      <div class="doc-date">Valide jusqu'au : ${dateFin}</div>
    </div>
  </div>

  <!-- PARTIES -->
  <div class="parties">
    <div class="party-box">
      <div class="party-title">De — Entrepreneur</div>
      <strong>${COMPANY.nom}</strong><br>
      ${COMPANY.adresse}<br>
      Téléphone : ${COMPANY.tel}<br>
      RBQ : ${COMPANY.rbq}<br>
      ${TPS_NO}<br>
      ${TVQ_NO}
    </div>
    <div class="party-box">
      <div class="party-title">Client</div>
      <strong>${s.client_nom||'—'}</strong><br>
      ${s.client_adresse||''}${s.client_adresse&&s.client_tel?'<br>':''}
      ${s.client_tel||''}${s.client_tel&&s.client_email?' · ':''}${s.client_email||''}
    </div>
  </div>

  <!-- INFOS SUPP -->
  <div class="infos-bar">
    <span>📅 <strong>Durée de validité :</strong> 30 jours</span>
    <span>🔧 <strong>Service après-vente :</strong> Inclus</span>
    <span>✅ <strong>Garantie travaux :</strong> 1 an</span>
    ${s.type_batiment?`<span>🏢 <strong>Type :</strong> ${s.type_batiment}</span>`:''}
  </div>

  <!-- OBJET -->
  ${(s.chantier||s.description)?`
  <div class="objet-line">
    ${s.chantier?`<strong>Chantier :</strong> ${s.chantier}<br>`:''}
    ${s.description?`<strong>Objet :</strong> ${s.description}`:''}
  </div>`:''}

  <!-- TABLEAU -->
  <div class="table-title">Désignation des travaux et matériaux</div>
  <table class="items">
    <thead>
      <tr>
        <th style="width:44%">Désignation</th>
        <th>Unité</th>
        <th class="r">Quantité</th>
        <th class="r">Prix unit. HT</th>
        <th class="r">Total HT</th>
      </tr>
    </thead>
    <tbody>${lignesRows}</tbody>
  </table>

  <!-- BOTTOM SPLIT -->
  <div class="bottom-split">
    <div class="conditions-box">
      <div class="cond-title">Conditions de règlement :</div>
      · Acompte de 30% à la commande<br>
      · Solde à la livraison, par paiement comptant<br>
      · Paiement accepté : chèque, virement, comptant<br>
      · Tout travail supplémentaire fera l'objet d'un avenant<br>
      · Les prix sont en dollars canadiens, taxes en sus
      <div class="acompte">Acompte de 30% à la commande : ${acompte30} $</div>
    </div>
    <div class="totaux-box">
      <div class="totaux-header">Récapitulatif</div>
      <div class="totaux-row">
        <span class="tl">Sous-total HT</span>
        <span class="tv">${fmt(s.sous_total)} $</span>
      </div>
      ${Number(s.frais_service)>0?`
      <div class="totaux-row frais">
        <span class="tl">Frais de service (${s.frais_service}%)</span>
        <span class="tv">${fmt(s.frais_service_montant)} $</span>
      </div>`:''}
      <div class="totaux-row">
        <span class="tl">TPS (5%)</span>
        <span class="tv">${fmt(s.tps)} $</span>
      </div>
      <div class="totaux-row">
        <span class="tl">TVQ (9,975%)</span>
        <span class="tv">${fmt(s.tvq)} $</span>
      </div>
      <div class="totaux-row net">
        <span class="tl">NET À PAYER</span>
        <span class="tv">${fmt(s.total)} $</span>
      </div>
    </div>
  </div>

  <!-- SIGNATURE -->
  <div class="sig-section">
    <div class="sig-instr">Signature du client (précédée de la mention « Bon pour accord »)</div>
    <div class="sig-grid">
      <div class="sig-col">
        <div class="sig-label">Signature du client — Acceptation</div>
        <div class="sig-line"></div>
        <div class="sig-sub">Nom : _________________________________ &nbsp; Date : _______________</div>
      </div>
      <div class="sig-col">
        <div class="sig-label">Signature Brikma Construction</div>
        <div class="sig-line"></div>
        <div class="sig-sub">Nom : _________________________________ &nbsp; Date : _______________</div>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="page-footer">
    <strong>${COMPANY.nom}</strong> · ${COMPANY.adresse} · Tél : ${COMPANY.tel} · RBQ : ${COMPANY.rbq}<br>
    ${TPS_NO} &nbsp;·&nbsp; ${TVQ_NO}
  </div>

  <script>window.onload=function(){window.focus();window.print();}</script>
</body>
</html>`

  const w = window.open('','_blank')
  w.document.write(html)
  w.document.close()
}

// ─────────────────────────────────────────────
// LOCATION
// ─────────────────────────────────────────────
export function printLocation(loc, articles = []){
  const dateDoc = today()
  const duree = (() => {
    if(!loc.date_depart || !loc.date_retour) return 1
    const d = (new Date(loc.date_retour) - new Date(loc.date_depart)) / (1000*60*60*24)
    return Math.max(1, Math.round(d))
  })()

  const articlesRows = articles.length
    ? articles.map(a=>`
        <tr>
          <td>${a.article||'—'}</td>
          <td class="muted">${a.categorie}</td>
          <td class="right">${Number(a.quantite||0)}</td>
          <td class="right">${fmt(a.prix_jour)} $</td>
          <td class="right">${duree} jr${duree>1?'s':''}</td>
          <td class="right">${fmt(a.sous_total)} $</td>
        </tr>`).join('')
    : '<tr><td colspan="6" style="text-align:center;color:#999;padding:14px;">Aucun article</td></tr>'

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Contrat ${loc.no_contrat} — Brikma Construction</title>
  <style>${baseStyle}</style>
</head>
<body>
  ${header()}

  <div class="doc-title-bar">
    <div>
      <div class="doc-type">CONTRAT DE LOCATION</div>
      <div class="doc-date">Émis le ${dateDoc}</div>
    </div>
    <div class="doc-no">${loc.no_contrat}</div>
  </div>

  <div class="two-col">
    <div class="box">
      <div class="box-title">🏗 Brikma Construction</div>
      <p><strong>${COMPANY.nom}</strong><br>
      ${COMPANY.adresse}<br>
      ${COMPANY.tel}<br>
      RBQ : ${COMPANY.rbq}</p>
    </div>
    <div class="box">
      <div class="box-title">👤 Locataire</div>
      <p><strong>${loc.client_nom||'—'}</strong><br>
      ${loc.client_tel||''} ${loc.client_email?'· '+loc.client_email:''}<br>
      ${loc.client_adresse||''}</p>
    </div>
  </div>

  <div class="two-col">
    <div class="box">
      <div class="box-title">🪪 Pièce d'identité</div>
      <p><strong>${loc.id_type||'—'}</strong><br>
      No : ${loc.id_no||'—'}</p>
    </div>
    <div class="box">
      <div class="box-title">📅 Période de location</div>
      <p><strong>Départ :</strong> ${fmtDate(loc.date_depart)}<br>
      <strong>Retour :</strong> ${fmtDate(loc.date_retour)}<br>
      <strong>Durée :</strong> ${duree} jour${duree>1?'s':''}</p>
    </div>
    <div class="box">
      <div class="box-title">📍 Chantier & Paiement</div>
      <p>${loc.chantier||'—'}<br>
      Mode : ${loc.mode_paiement||'—'}</p>
    </div>
  </div>

  ${Number(loc.depot)>0 ? `<div class="depot-box">Dépôt de garantie perçu : ${fmt(loc.depot)} $</div>` : ''}

  <div class="section-title">Articles en location</div>
  <table>
    <thead>
      <tr>
        <th>Article</th>
        <th>Catégorie</th>
        <th class="right">Qté</th>
        <th class="right">Prix / jour</th>
        <th class="right">Durée</th>
        <th class="right">Sous-total</th>
      </tr>
    </thead>
    <tbody>${articlesRows}</tbody>
  </table>

  <div class="totaux-wrap">
    <div class="totaux-table">
      <div class="totaux-row">
        <span class="totaux-lbl">Sous-total (${duree} jour${duree>1?'s':''})</span>
        <span class="totaux-val">${fmt(loc.sous_total)} $</span>
      </div>
      <div class="totaux-row">
        <span class="totaux-lbl">TPS (5%)</span>
        <span class="totaux-val">${fmt(loc.tps)} $</span>
      </div>
      <div class="totaux-row">
        <span class="totaux-lbl">TVQ (9,975%)</span>
        <span class="totaux-val">${fmt(loc.tvq)} $</span>
      </div>
      <div class="totaux-row total">
        <span class="totaux-lbl">TOTAL</span>
        <span class="totaux-val">${fmt(loc.total)} $</span>
      </div>
    </div>
  </div>

  <div class="conditions">
    <strong>Conditions du contrat de location</strong>
    · Le locataire est responsable du matériel loué dès la prise en charge jusqu'au retour complet.<br>
    · Tout dommage, perte ou vol sera facturé au coût de remplacement.<br>
    · Le matériel doit être retourné propre et en bon état à la date prévue.<br>
    · Tout retard de retour sera facturé au tarif journalier en vigueur.<br>
    · Le dépôt de garantie sera remboursé après inspection complète du matériel.
  </div>

  <div class="section-title">Signatures</div>
  <div class="signatures">
    <div class="sig-box">
      <div class="sig-title">Signature du représentant — Brikma Construction</div>
      <div class="sig-line"></div>
      <div class="sig-name">Nom : ___________________________________ &nbsp;&nbsp; Date : _____________</div>
    </div>
    <div class="sig-box">
      <div class="sig-title">Signature du locataire — Acceptation des conditions</div>
      <div class="sig-line"></div>
      <div class="sig-name">Nom : ___________________________________ &nbsp;&nbsp; Date : _____________</div>
    </div>
  </div>

  ${footer()}

  <script>
    window.onload = function(){ window.focus(); window.print(); }
  </script>
</body>
</html>`

  const w = window.open('','_blank')
  w.document.write(html)
  w.document.close()
}
