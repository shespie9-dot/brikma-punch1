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
  notes text
);

-- 2. DONNÉES DE BASE
-- ============================================================

-- Code patron par défaut
INSERT INTO patrons (code_acces) VALUES ('BRIKMA2024') ON CONFLICT DO NOTHING;

-- 3. DÉSACTIVER RLS (app interne, accès par code seulement)
-- ============================================================

ALTER TABLE employes DISABLE ROW LEVEL SECURITY;
ALTER TABLE patrons DISABLE ROW LEVEL SECURITY;
ALTER TABLE feuilles_temps DISABLE ROW LEVEL SECURITY;
ALTER TABLE jours_travail DISABLE ROW LEVEL SECURITY;

-- Fin du script
