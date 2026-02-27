-- Cleanup script for unused legacy tables (French schema)
-- Review before running in Supabase SQL editor.

begin;

drop table if exists public.devis_lignes cascade;
drop table if exists public.devis cascade;
drop table if exists public.factures_lignes cascade;
drop table if exists public.factures cascade;
drop table if exists public.paiements cascade;
drop table if exists public.entreprise_infos cascade;
drop table if exists public.optimization_results cascade;
drop table if exists public.pieces cascade;
drop table if exists public.projects cascade;

commit;
