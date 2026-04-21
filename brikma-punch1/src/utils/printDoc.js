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
// SOUMISSION
// ─────────────────────────────────────────────
export function printSoumission(s, lignes = []){
  const dateDoc = today()
  const dateFin = (() => {
    const d = new Date(); d.setDate(d.getDate()+30)
    return d.toLocaleDateString('fr-CA',{year:'numeric',month:'long',day:'numeric'})
  })()

  const lignesRows = lignes.length
    ? lignes.map(l=>`
        <tr>
          <td>${l.description||'—'}</td>
          <td class="muted">${l.categorie}</td>
          <td class="muted">${l.unite}</td>
          <td class="right">${Number(l.quantite||0)}</td>
          <td class="right">${fmt(l.prix_unitaire)} $</td>
          <td class="right">${fmt(l.sous_total)} $</td>
        </tr>`).join('')
    : '<tr><td colspan="6" style="text-align:center;color:#999;padding:14px;">Aucune ligne</td></tr>'

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Soumission ${s.no_soumission} — Brikma Construction</title>
  <style>${baseStyle}</style>
</head>
<body>
  ${header()}

  <div class="doc-title-bar">
    <div>
      <div class="doc-type">SOUMISSION</div>
      <div class="doc-date">Émise le ${dateDoc}</div>
    </div>
    <div class="doc-no">${s.no_soumission}</div>
  </div>

  <div class="two-col">
    <div class="box">
      <div class="box-title">📋 De</div>
      <p><strong>${COMPANY.nom}</strong><br>
      ${COMPANY.adresse}<br>
      ${COMPANY.tel}<br>
      RBQ : ${COMPANY.rbq}</p>
    </div>
    <div class="box">
      <div class="box-title">👤 Client</div>
      <p><strong>${s.client_nom||'—'}</strong><br>
      ${s.client_tel||''} ${s.client_email?'· '+s.client_email:''}<br>
      ${s.client_adresse||''}</p>
    </div>
    <div class="box">
      <div class="box-title">📍 Chantier</div>
      <p>${s.chantier||'—'}<br>
      ${s.type_batiment?'<em>'+s.type_batiment+'</em>':''}</p>
    </div>
  </div>

  ${s.description?`
  <div class="box" style="margin-bottom:14px;">
    <div class="box-title">📝 Description des travaux</div>
    <p>${s.description}</p>
  </div>` : ''}

  <div class="section-title">Détail des travaux et matériaux</div>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Catégorie</th>
        <th>Unité</th>
        <th class="right">Qté</th>
        <th class="right">Prix unit.</th>
        <th class="right">Sous-total</th>
      </tr>
    </thead>
    <tbody>${lignesRows}</tbody>
  </table>

  <div class="totaux-wrap">
    <div class="totaux-table">
      <div class="totaux-row">
        <span class="totaux-lbl">Sous-total</span>
        <span class="totaux-val">${fmt(s.sous_total)} $</span>
      </div>
      <div class="totaux-row">
        <span class="totaux-lbl">TPS (5%)</span>
        <span class="totaux-val">${fmt(s.tps)} $</span>
      </div>
      <div class="totaux-row">
        <span class="totaux-lbl">TVQ (9,975%)</span>
        <span class="totaux-val">${fmt(s.tvq)} $</span>
      </div>
      <div class="totaux-row total">
        <span class="totaux-lbl">TOTAL</span>
        <span class="totaux-val">${fmt(s.total)} $</span>
      </div>
    </div>
  </div>

  <div class="conditions">
    <strong>Conditions de la soumission</strong>
    · Cette soumission est valide jusqu'au <strong>${dateFin}</strong> (30 jours).<br>
    · Les prix sont en dollars canadiens, taxes en sus sauf indication contraire.<br>
    · Tout travail supplémentaire fera l'objet d'une soumission additionnelle.<br>
    · Un acompte de 30% est requis avant le début des travaux.<br>
    · Paiement final dû à la livraison des travaux.
  </div>

  <div class="section-title">Signatures</div>
  <div class="signatures">
    <div class="sig-box">
      <div class="sig-title">Signature du patron — Brikma Construction</div>
      <div class="sig-line"></div>
      <div class="sig-name">Nom : ___________________________________ &nbsp;&nbsp; Date : _____________</div>
    </div>
    <div class="sig-box">
      <div class="sig-title">Signature du client — Acceptation de la soumission</div>
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
