-- =====================================================================
-- VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
-- MIGRAÇÃO VERSIONADA 003: CAMADA DE INGESTÃO E PROCESSAMENTO DE DADOS COMERCIAIS
-- =====================================================================
-- Escopo:
-- 1. Tabela de Lotes de Ingestão (lotes_ingestao_comercial)
-- 2. Tabela de Itens Comerciais Estagiados (itens_dados_comerciais)
-- 3. Índices de Deduplicação por Fingerprint e Sequência Temporal
-- 4. Isolamento Multiempresa Mandatório via Row-Level Security (RLS)
-- =====================================================================

-- 1. TABELA: lotes_ingestao_comercial
CREATE TABLE IF NOT EXISTS lotes_ingestao_comercial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    fonte_origem VARCHAR(64) NOT NULL, -- 'IMPORTACAO_CSV', 'IMPORTACAO_XLSX', 'FORMULARIO_ESTRUTURADO', 'CADASTRO_MANUAL', 'HISTORICO_OPORTUNIDADES', 'VENDAS_ORCAMENTOS', 'PRODUTOS_SERVICOS', 'RELATORIO_RETENCAO', 'CRM_LEGADO'
    nome_arquivo VARCHAR(255),
    natureza_dado VARCHAR(32) NOT NULL DEFAULT 'IMPORTADO', -- 'SIMULADO', 'IMPORTADO', 'OPERACIONAL_VERIFICADO'
    status_processamento VARCHAR(32) NOT NULL DEFAULT 'PENDENTE', -- 'PENDENTE', 'PROCESSADO', 'PROCESSADO_COM_ALERTAS', 'FALHA'
    total_registros INT DEFAULT 0,
    registros_validos INT DEFAULT 0,
    registros_duplicados INT DEFAULT 0,
    registros_inconsistentes INT DEFAULT 0,
    registros_rejeitados INT DEFAULT 0,
    resumo_processamento JSONB DEFAULT '{}'::jsonb,
    inconsistencias JSONB DEFAULT '[]'::jsonb,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    processado_em TIMESTAMPTZ,
    CONSTRAINT uq_lotes_empresa_id UNIQUE (empresa_id, id),
    CONSTRAINT fk_lote_empresa FOREIGN KEY (empresa_id)
        REFERENCES empresas_motor(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lotes_empresa_data ON lotes_ingestao_comercial(empresa_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_lotes_status ON lotes_ingestao_comercial(status_processamento);

-- 2. TABELA: itens_dados_comerciais
CREATE TABLE IF NOT EXISTS itens_dados_comerciais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    lote_id UUID NOT NULL,
    tipo_registro VARCHAR(64) NOT NULL, -- 'CONTATO', 'INTERACAO', 'OPORTUNIDADE_ORCAMENTO', 'VENDA', 'PRODUTO_SERVICO', 'METRICA_RETENCAO'
    identificador_externo VARCHAR(255),
    dados_brutos JSONB NOT NULL,
    dados_normalizados JSONB,
    natureza_dado VARCHAR(32) NOT NULL DEFAULT 'IMPORTADO',
    status_validacao VARCHAR(32) NOT NULL DEFAULT 'VALIDO', -- 'VALIDO', 'INCONSISTENTE', 'DUPLICADO', 'REJEITADO'
    motivo_inconsistencia TEXT,
    fingerprint_hash VARCHAR(64) NOT NULL,
    data_ocorrencia TIMESTAMPTZ,
    contato_id UUID,
    interacao_id UUID,
    processado_pelo_motor BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_itens_empresa_id UNIQUE (empresa_id, id),
    CONSTRAINT fk_item_lote FOREIGN KEY (empresa_id, lote_id)
        REFERENCES lotes_ingestao_comercial(empresa_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_item_contato FOREIGN KEY (empresa_id, contato_id)
        REFERENCES contatos_clientes(empresa_id, id) ON DELETE SET NULL,
    CONSTRAINT fk_item_interacao FOREIGN KEY (empresa_id, interacao_id)
        REFERENCES interacoes_comerciais(empresa_id, id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_itens_empresa_lote ON itens_dados_comerciais(empresa_id, lote_id);
CREATE INDEX IF NOT EXISTS idx_itens_fingerprint ON itens_dados_comerciais(empresa_id, fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_itens_data_ocorrencia ON itens_dados_comerciais(empresa_id, data_ocorrencia);
CREATE INDEX IF NOT EXISTS idx_itens_status_validacao ON itens_dados_comerciais(empresa_id, status_validacao);

-- 3. ATIVAÇÃO DE ROW-LEVEL SECURITY (RLS) MULTIEMPRESA
ALTER TABLE lotes_ingestao_comercial ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_dados_comerciais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_isolation_lotes_ingestao ON lotes_ingestao_comercial;
CREATE POLICY p_isolation_lotes_ingestao ON lotes_ingestao_comercial
    FOR ALL
    USING (empresa_id = current_setting('vide.current_empresa_id', true)::uuid);

DROP POLICY IF EXISTS p_isolation_itens_dados ON itens_dados_comerciais;
CREATE POLICY p_isolation_itens_dados ON itens_dados_comerciais
    FOR ALL
    USING (empresa_id = current_setting('vide.current_empresa_id', true)::uuid);
