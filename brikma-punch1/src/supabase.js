import { createClient } from '@supabase/supabase-js'

// 🔧 REMPLACE CES 2 VALEURS avec celles de ton projet Supabase
// Settings → API → Project URL et anon public key
const SUPABASE_URL = 'https://dzhbgfbizufgmmrhdjqi.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_nfV4cfGVvKIuH36s7eSE2g_Vg4V343x'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/* ═══════════════════════════════════════════════════════════
   SQL À EXÉCUTER UNE FOIS dans Supabase → SQL Editor
   ═══════════════════════════════════════════════════════════

-- Table employés
CREATE TABLE employes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  code_acces TEXT NOT NULL UNIQUE,  -- ex: EMP001
  poste TEXT,
  type_paie TEXT DEFAULT 'hors_decret', -- 'ccq' ou 'hors_decret'
  taux_regulier NUMERIC(8,2) DEFAULT 0,
  taux_ot NUMERIC(8,2) DEFAULT 0,
  taux_ccq NUMERIC(8,2) DEFAULT 0,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table feuilles de temps
CREATE TABLE feuilles_temps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employe_id UUID REFERENCES employes(id),
  employe_nom TEXT,
  semaine_du DATE NOT NULL,
  chantier_principal TEXT,
  statut TEXT DEFAULT 'soumis', -- 'soumis', 'approuve', 'refuse'
  total_heures NUMERIC(5,2) DEFAULT 0,
  total_reg NUMERIC(5,2) DEFAULT 0,
  total_ot NUMERIC(5,2) DEFAULT 0,
  type_paie TEXT DEFAULT 'hors_decret',
  taux_reg NUMERIC(8,2) DEFAULT 0,
  taux_ot NUMERIC(8,2) DEFAULT 0,
  paie_brute NUMERIC(10,2) DEFAULT 0,
  note_patron TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

-- Table jours (détail par jour)
CREATE TABLE jours_travail (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feuille_id UUID REFERENCES feuilles_temps(id) ON DELETE CASCADE,
  jour_nom TEXT,
  jour_date DATE,
  statut TEXT DEFAULT 'present',
  arrive TIME,
  diner_out TIME,
  diner_in TIME,
  depart TIME,
  adresse_chantier TEXT,
  type_travail TEXT DEFAULT 'Normal',
  heures_reg NUMERIC(4,2) DEFAULT 0,
  heures_ot NUMERIC(4,2) DEFAULT 0,
  ot_approuve BOOLEAN DEFAULT false,
  ot_raison TEXT,
  notes TEXT
);

-- Patron login (simple)
CREATE TABLE patrons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code_acces TEXT NOT NULL UNIQUE,
  nom TEXT
);

-- Insérer un patron par défaut (change le code!)
INSERT INTO patrons (code_acces, nom) VALUES ('BRIKMA2024', 'Administrateur');

═══════════════════════════════════════════════════════════ */
