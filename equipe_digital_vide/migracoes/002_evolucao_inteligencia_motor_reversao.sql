-- =====================================================================
-- VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
-- MIGRAÇÃO DE REVERSÃO: 002_evolucao_inteligencia_motor_reversao.sql
-- =====================================================================

DROP POLICY IF EXISTS p_isolation_aprendizados_miv ON aprendizados_miv;
DROP TABLE IF EXISTS aprendizados_miv CASCADE;

ALTER TABLE recomendacoes_miv 
    DROP COLUMN IF EXISTS hipotese_id,
    DROP COLUMN IF EXISTS resultado_esperado,
    DROP COLUMN IF EXISTS indicador_avaliacao,
    DROP COLUMN IF EXISTS janela_observacao_dias,
    DROP COLUMN IF EXISTS criterio_sucesso,
    DROP COLUMN IF EXISTS grau_confianca;

ALTER TABLE gargalos_comerciais
    DROP COLUMN IF EXISTS urgencia_operacional,
    DROP COLUMN IF EXISTS metodo_afericao_resultado,
    DROP COLUMN IF EXISTS confianca_analitica;

ALTER TABLE hipoteses_causais
    DROP COLUMN IF EXISTS tipo_investigacao,
    DROP COLUMN IF EXISTS evidencias_conflitantes,
    DROP COLUMN IF EXISTS metodo_investigacao,
    DROP COLUMN IF EXISTS status_validacao;

ALTER TABLE padroes_comportamentais
    DROP COLUMN IF EXISTS periodo_inicio,
    DROP COLUMN IF EXISTS periodo_fim,
    DROP COLUMN IF EXISTS contexto_segmento,
    DROP COLUMN IF EXISTS grau_confianca,
    DROP COLUMN IF EXISTS limitacoes_analise,
    DROP COLUMN IF EXISTS tipo_classificacao;
