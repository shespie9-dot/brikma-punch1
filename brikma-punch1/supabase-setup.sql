-- ============================================================
-- BRIKMA CONSTRUCTION - Setup complet Supabase
-- Coller dans : Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. TABLES (crée si elles n'existent pas)
-- ============================================================

CREATE TABLE IF NOT EXISTS patrons (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code_acces text UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS employes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nom text NOT NULL,
  code_acces text UNIQUE NOT NULL,
  poste text,
  type_paie text DEFAULT 'hors_decret',
  taux_regulier numeric DEFAULT 0,
  taux_ot numeric DEFAULT 0,
  taux_ccq numeric DEFAULT 0,
  actif boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS feuilles_temps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employe_id uuid,
  employe_nom text,
  semaine_du date,
  chantier_principal text,
  statut text DEFAULT 'soumis',
  total_heures numeric DEFAULT 0,
  total_reg numeric DEFAULT 0,
  total_ot numeric DEFAULT 0,
  type_paie text,
  taux_reg numeric DEFAULT 0,
  taux_ot numeric DEFAULT 0,
  paie_brute numeric DEFAULT 0,
  note_patron text,
  approved_at timestamptz,
  submitted_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jours_travail (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  feuille_id uuid,
  jour_nom text,
  jour_date date,
  statut text DEFAULT 'absent',
  arrive time,
  diner_out time,
  diner_in time,
  depart time,
  adresse_chantier text,
  type_travail text,
  heures_reg numeric DEFAULT 0,
  heures_ot numeric DEFAULT 0,
  ot_approuve boolean DEFAULT false,
  ot_raison text,
  notes text,
  type_paie text DEFAULT 'hors_decret'
);

-- Ajouter type_paie si la table jours_travail existe déjà
ALTER TABLE jours_travail ADD COLUMN IF NOT EXISTS type_paie text DEFAULT 'hors_decret';

-- 2. DONNÉES DE BASE
-- ============================================================

-- Codes patron
INSERT INTO patrons (code_acces) VALUES ('BRIKMA2024') ON CONFLICT DO NOTHING;
INSERT INTO patrons (code_acces) VALUES ('BUILDLEAD') ON CONFLICT DO NOTHING;

-- 3. TABLES SOUMISSIONS ET LOCATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS soumissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  no_soumission TEXT NOT NULL,
  client_nom TEXT, client_tel TEXT,
  client_email TEXT, client_adresse TEXT,
  chantier TEXT, type_batiment TEXT, description TEXT,
  statut TEXT DEFAULT 'brouillon',
  sous_total NUMERIC(10,2) DEFAULT 0,
  tps NUMERIC(10,2) DEFAULT 0,
  tvq NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS soumission_lignes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  soumission_id UUID REFERENCES soumissions(id) ON DELETE CASCADE,
  description TEXT, categorie TEXT DEFAULT 'Matériaux',
  unite TEXT DEFAULT 'unité',
  quantite NUMERIC(8,2) DEFAULT 1,
  prix_unitaire NUMERIC(8,2) DEFAULT 0,
  sous_total NUMERIC(10,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  no_contrat TEXT NOT NULL,
  client_nom TEXT, client_tel TEXT,
  client_email TEXT, client_adresse TEXT,
  id_type TEXT, id_no TEXT,
  date_depart DATE, date_retour DATE, chantier TEXT,
  mode_paiement TEXT, depot NUMERIC(8,2) DEFAULT 0,
  statut TEXT DEFAULT 'actif',
  sous_total NUMERIC(10,2) DEFAULT 0,
  tps NUMERIC(10,2) DEFAULT 0,
  tvq NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS location_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  article TEXT, categorie TEXT DEFAULT 'Échafaudage',
  quantite NUMERIC(6,2) DEFAULT 1,
  prix_jour NUMERIC(8,2) DEFAULT 0,
  sous_total NUMERIC(10,2) DEFAULT 0
);

-- 4. DÉSACTIVER RLS (app interne, accès par code seulement)
-- ============================================================

ALTER TABLE employes DISABLE ROW LEVEL SECURITY;
ALTER TABLE patrons DISABLE ROW LEVEL SECURITY;
ALTER TABLE feuilles_temps DISABLE ROW LEVEL SECURITY;
ALTER TABLE jours_travail DISABLE ROW LEVEL SECURITY;
ALTER TABLE soumissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE soumission_lignes DISABLE ROW LEVEL SECURITY;
ALTER TABLE locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE location_articles DISABLE ROW LEVEL SECURITY;

-- Fin du script
