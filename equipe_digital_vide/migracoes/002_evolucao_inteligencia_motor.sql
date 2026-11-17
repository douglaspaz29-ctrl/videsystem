-- =====================================================================
-- VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
-- MIGRAÇÃO VERSIONADA 002: EVOLUÇÃO DA INTELIGÊNCIA DO MOTOR COMERCIAL
-- =====================================================================
-- Escopo:
-- 1. Ampliação epistemológica de Padrões (ocorrências, período, limitações, confiança)
-- 2. Diferenciação formal de Hipóteses Causais (fatos, padrões, hipóteses, causas confirmadas)
-- 3. Priorização inteligente de Gargalos (urgência operacional, mensurabilidade)
-- 4. Recomendações MIV estruturadas (resultado esperado, indicador, janela, critério)
-- 5. Tabela oficial de Aprendizado Contínuo (aprendizados_miv) com RLS multiempresa
-- =====================================================================

-- 1. ENRIQUECIMENTO DA TABELA: padroes_comportamentais
ALTER TABLE padroes_comportamentais 
    ADD COLUMN IF NOT EXISTS periodo_inicio TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS periodo_fim TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS contexto_segmento VARCHAR(128),
    ADD COLUMN IF NOT EXISTS grau_confianca VARCHAR(16) DEFAULT 'MEDIO',
    ADD COLUMN IF NOT EXISTS limitacoes_analise TEXT,
    ADD COLUMN IF NOT EXISTS tipo_classificacao VARCHAR(32) DEFAULT 'PADRAO_CONFIRMADO';

-- 2. ENRIQUECIMENTO DA TABELA: hipoteses_causais
ALTER TABLE hipoteses_causais
    ADD COLUMN IF NOT EXISTS tipo_investigacao VARCHAR(32) DEFAULT 'HIPOTESE_CAUSAL',
    ADD COLUMN IF NOT EXISTS evidencias_conflitantes TEXT,
    ADD COLUMN IF NOT EXISTS metodo_investigacao TEXT,
    ADD COLUMN IF NOT EXISTS status_validacao VARCHAR(32) DEFAULT 'EM_ANALISE';

-- 3. ENRIQUECIMENTO DA TABELA: gargalos_comerciais
ALTER TABLE gargalos_comerciais
    ADD COLUMN IF NOT EXISTS urgencia_operacional VARCHAR(16) DEFAULT 'MEDIA',
    ADD COLUMN IF NOT EXISTS metodo_afericao_resultado TEXT,
    ADD COLUMN IF NOT EXISTS confianca_analitica VARCHAR(16) DEFAULT 'MEDIA';

-- 4. ENRIQUECIMENTO DA TABELA: recomendacoes_miv
ALTER TABLE recomendacoes_miv
    ADD COLUMN IF NOT EXISTS hipotese_id UUID,
    ADD COLUMN IF NOT EXISTS resultado_esperado TEXT,
    ADD COLUMN IF NOT EXISTS indicador_avaliacao VARCHAR(128),
    ADD COLUMN IF NOT EXISTS janela_observacao_dias INT DEFAULT 14,
    ADD COLUMN IF NOT EXISTS criterio_sucesso TEXT,
    ADD COLUMN IF NOT EXISTS grau_confianca VARCHAR(16) DEFAULT 'ALTO';

-- 5. NOVA TABELA: aprendizados_miv (Loop de Feedback e Aprendizado Acumulado)
CREATE TABLE IF NOT EXISTS aprendizados_miv (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    miv_id UUID NOT NULL,
    data_implementacao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    indicador_baseline NUMERIC(12,2),
    indicador_pos NUMERIC(12,2),
    unidade_medida VARCHAR(32) DEFAULT '%',
    resultado_observado TEXT NOT NULL,
    status_aprendizado VARCHAR(32) NOT NULL, -- 'SUCESSO_CONFIRMADO', 'SEM_EFEITO_OBSERVADO', 'PIORA_DETECTADA', 'INCONCLUSIVO'
    gap_esperado_vs_realizado TEXT,
    aprendizados_consolidados TEXT NOT NULL,
    necessidade_nova_investigacao BOOLEAN DEFAULT FALSE,
    hipotese_revisada TEXT,
    registrado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_aprendizados_empresa_id UNIQUE (empresa_id, id),
    CONSTRAINT fk_aprendizado_miv FOREIGN KEY (empresa_id, miv_id) 
        REFERENCES recomendacoes_miv(empresa_id, id) ON DELETE RESTRICT
);

-- Índices de Performance e Integridade
CREATE INDEX IF NOT EXISTS idx_aprendizados_empresa ON aprendizados_miv(empresa_id, registrado_em DESC);
CREATE INDEX IF NOT EXISTS idx_aprendizados_miv ON aprendizados_miv(miv_id);

-- 6. ATIVAÇÃO DE ROW-LEVEL SECURITY (RLS) NA NOVA TABELA
ALTER TABLE aprendizados_miv ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_isolation_aprendizados_miv ON aprendizados_miv;
CREATE POLICY p_isolation_aprendizados_miv ON aprendizados_miv 
    FOR ALL 
    USING (empresa_id = current_setting('vide.current_empresa_id', true)::uuid);
