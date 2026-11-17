-- =====================================================================
-- VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
-- MIGRAÇÃO VERSIONADA 003: REVERSÃO DA CAMADA DE INGESTÃO DE DADOS COMERCIAIS
-- =====================================================================

DROP POLICY IF EXISTS p_isolation_itens_dados ON itens_dados_comerciais;
DROP POLICY IF EXISTS p_isolation_lotes_ingestao ON lotes_ingestao_comercial;

DROP TABLE IF EXISTS itens_dados_comerciais CASCADE;
DROP TABLE IF EXISTS lotes_ingestao_comercial CASCADE;
