# 🏗 Brikma Punch – Guide de déploiement

## Stack
- **Frontend** : React + Vite (Vercel gratuit)
- **Base de données** : Supabase (gratuit jusqu'à 500MB)

---

## ÉTAPE 1 — Supabase (base de données)

1. Va sur **https://supabase.com** → "Start your project" → compte gratuit
2. Clique **"New Project"** → nomme-le `brikma-punch`
3. Dans le menu gauche → **SQL Editor** → colle et exécute le SQL dans `src/supabase.js`
4. Va dans **Settings → API** → copie :
   - **Project URL** (ex: `https://abcdef.supabase.co`)
   - **anon public key** (longue chaîne JWT)
5. Dans `src/supabase.js`, remplace `SUPABASE_URL` et `SUPABASE_ANON_KEY`

---

## ÉTAPE 2 — GitHub (upload du code)

1. Va sur **https://github.com** → "New repository" → nomme-le `brikma-punch`
2. Upload tous les fichiers de ce dossier
3. (Ou utilise la commande Git si tu préfères)

---

## ÉTAPE 3 — Vercel (hébergement gratuit)

1. Va sur **https://vercel.com** → connecte ton compte GitHub
2. Clique **"Add New Project"** → sélectionne `brikma-punch`
3. Framework: **Vite** (auto-détecté)
4. Clique **Deploy** → Vercel te donne une URL comme :
   `https://brikma-punch.vercel.app`
5. Envoie cette URL à tes employés sur WhatsApp!

---

## ÉTAPE 4 — Ajouter tes employés

1. Va sur ton app → **Connexion Patron** → code `BRIKMA2024`
2. Onglet **👷 Employés** → ajoute chaque employé avec :
   - Nom complet
   - Code d'accès (ex: `EMP001`, `EMP002`)
   - Poste
   - Type de paie: **Hors décret** ou **CCQ**
   - Taux horaire
3. Donne le code d'accès à chaque employé

---

## Utilisation

### Employé (téléphone)
1. Ouvre l'URL → **Employé** → entre son code
2. Remplit sa semaine, adresses chantier, heures, OT
3. Soumet → toi tu reçois dans le dashboard

### Patron (toi)
1. Connexion **Patron** → code `BRIKMA2024`
2. Vois toutes les feuilles soumises
3. Approuve ou refuse avec note
4. Export CSV pour ta comptabilité

---

## Modifier le code patron
Dans `supabase.js`, SQL Editor Supabase :
```sql
UPDATE patrons SET code_acces = 'MONCODE' WHERE code_acces = 'BRIKMA2024';
```

## Coûts
- Supabase : **GRATUIT** jusqu'à 500MB (largement suffisant pour 15+ employés)
- Vercel : **GRATUIT** (usage perso/petite équipe)
- **Total : 0 $/mois** 🎉
