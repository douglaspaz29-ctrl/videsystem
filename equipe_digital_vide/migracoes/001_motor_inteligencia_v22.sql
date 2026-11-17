-- =====================================================================
-- VIDE — MOTOR DE INTELIGÊNCIA COMERCIAL (v2.2)
-- MIGRAÇÃO VERSIONADA: 001_motor_inteligencia_v22.sql
-- Escopo: Arquitetura Multi-Tenant com RLS, Integridade Composta,
-- Trilha Append-Only, Rastreabilidade Relacional e Minimização LGPD
-- =====================================================================

-- Extensão pgcrypto / uuid para geração de identificadores universais
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. TABELA RAIZ: EMPRESAS MOTOR (Tenants Clientes da VIDE)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS empresas_motor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_fantasia VARCHAR(255) NOT NULL,
    razao_social VARCHAR(255),
    segmento VARCHAR(128),
    plano_motor VARCHAR(64) DEFAULT 'PADRAO',
    status VARCHAR(32) DEFAULT 'ATIVO',
    cliente_legado_id VARCHAR(64) REFERENCES clientes(id) ON DELETE SET NULL,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_empresas_motor_id UNIQUE (id)
);

CREATE INDEX IF NOT EXISTS idx_empresas_motor_status ON empresas_motor(status);
CREATE INDEX IF NOT EXISTS idx_empresas_motor_cliente_legado ON empresas_motor(cliente_legado_id);

-- ---------------------------------------------------------------------
-- 2. TABELA: CONTATOS CLIENTES (Identidade Canônica & Minimização LGPD)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contatos_clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas_motor(id) ON DELETE RESTRICT,
    nome_identificado VARCHAR(255),
    canal_origem_primario VARCHAR(64) NOT NULL, -- WHATSAPP, INSTAGRAM, SITE, EMAIL
    status_jornada VARCHAR(64) DEFAULT 'PROSPECT', -- PROSPECT, QUALIFICADO, NEGOCIACAO, GANHO, PERDIDO
    base_legal_lgpd VARCHAR(64) DEFAULT 'LEGITIMO_INTERESSE', -- Art. 7º IX, V, I LGPD
    origem_consentimento VARCHAR(255),
    dados_pessoais_minimizados BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_contatos_empresa_id UNIQUE (empresa_id, id)
);

CREATE INDEX IF NOT EXISTS idx_contatos_empresa_jornada ON contatos_clientes(empresa_id, status_jornada);

-- ---------------------------------------------------------------------
-- 3. TABELA: IDENTIFICADORES DE CONTATO (Canais Verificados)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS identificadores_contato (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    contato_id UUID NOT NULL,
    tipo_identificador VARCHAR(64) NOT NULL, -- WHATSAPP_E164, INSTAGRAM_HANDLE, EMAIL, EXTERNAL_ID
    valor_identificador VARCHAR(255) NOT NULL,
    verificado BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_identificador_empresa UNIQUE (empresa_id, tipo_identificador, valor_identificador),
    CONSTRAINT uq_identificadores_empresa_id UNIQUE (empresa_id, id),
    CONSTRAINT fk_identificador_contato FOREIGN KEY (empresa_id, contato_id) 
        REFERENCES contatos_clientes(empresa_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_identificadores_lookup ON identificadores_contato(empresa_id, tipo_identificador, valor_identificador);

-- ---------------------------------------------------------------------
-- 4. TABELA: INTERAÇÕES COMERCIAIS (Diálogos, Sessões e Mensagens)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interacoes_comerciais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    contato_id UUID NOT NULL,
    canal VARCHAR(64) NOT NULL,
    direcao VARCHAR(32) NOT NULL, -- ENTRADA, SAIDA
    sessao_externa_id VARCHAR(255),
    conteudo_texto TEXT NOT NULL,
    metadados JSONB DEFAULT '{}',
    timestamp_interacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_interacoes_empresa_id UNIQUE (empresa_id, id),
    CONSTRAINT fk_interacao_contato FOREIGN KEY (empresa_id, contato_id) 
        REFERENCES contatos_clientes(empresa_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_interacoes_contato ON interacoes_comerciais(empresa_id, contato_id, timestamp_interacao);

-- ---------------------------------------------------------------------
-- 5. TABELA: EVENTOS DE JORNADA COMERCIAL
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS eventos_jornada (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    contato_id UUID NOT NULL,
    interacao_id UUID,
    tipo_evento VARCHAR(128) NOT NULL, -- SILENCIO_POS_PRECO, PEDIDO_DESCONTO, RECUSA_FECHAMENTO
    etapa_funil VARCHAR(64) NOT NULL, -- TOPO, MEIO, FUNDO, RETENCAO
    propriedades JSONB DEFAULT '{}',
    registrado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_eventos_empresa_id UNIQUE (empresa_id, id),
    CONSTRAINT fk_evento_contato FOREIGN KEY (empresa_id, contato_id) 
        REFERENCES contatos_clientes(empresa_id, id) ON DELETE RESTRICT,
    CONSTRAINT fk_evento_interacao FOREIGN KEY (empresa_id, interacao_id) 
        REFERENCES interacoes_comerciais(empresa_id, id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_eventos_funil ON eventos_jornada(empresa_id, etapa_funil, registrado_em);

-- ---------------------------------------------------------------------
-- 6. TABELA: EVIDÊNCIAS COMERCIAIS (Fatos Granulares do Agente 07)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evidencias_comerciais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    contato_id UUID,
    interacao_id UUID,
    evento_id UUID,
    tipo_evidencia VARCHAR(64) NOT NULL, -- CITACAO_DIRETA, RECORRENCIA_SILENCIO, PERDA_CONVERSAO
    trecho_fato TEXT NOT NULL,
    contexto_origem VARCHAR(255) NOT NULL,
    grau_confiabilidade NUMERIC(3,2) DEFAULT 1.00,
    registrado_por VARCHAR(64) DEFAULT 'AGENTE_07_PESQUISADOR',
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_evidencias_empresa_id UNIQUE (empresa_id, id),
    CONSTRAINT fk_evidencia_contato FOREIGN KEY (empresa_id, contato_id) 
        REFERENCES contatos_clientes(empresa_id, id) ON DELETE SET NULL,
    CONSTRAINT fk_evidencia_interacao FOREIGN KEY (empresa_id, interacao_id) 
        REFERENCES interacoes_comerciais(empresa_id, id) ON DELETE SET NULL,
    CONSTRAINT fk_evidencia_evento FOREIGN KEY (empresa_id, evento_id) 
        REFERENCES eventos_jornada(empresa_id, id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_evidencias_tipo ON evidencias_comerciais(empresa_id, tipo_evidencia);

-- ---------------------------------------------------------------------
-- 7. TABELA: PADRÕES COMPORTAMENTAIS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS padroes_comportamentais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    categoria_padrao VARCHAR(64) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descricao_padrao TEXT NOT NULL,
    frequencia_ocorrencia INT DEFAULT 1,
    status_padrao VARCHAR(32) DEFAULT 'EM_OBSERVACAO',
    detectado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_padroes_empresa_id UNIQUE (empresa_id, id)
);

CREATE INDEX IF NOT EXISTS idx_padroes_categoria ON padroes_comportamentais(empresa_id, categoria_padrao);

-- ---------------------------------------------------------------------
-- 8. RELACIONAMENTO RELACIONAL: PADRÕES <-> EVIDÊNCIAS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS padroes_evidencias_rel (
    empresa_id UUID NOT NULL,
    padrao_id UUID NOT NULL,
    evidencia_id UUID NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (padrao_id, evidencia_id),
    CONSTRAINT fk_padrel_padrao FOREIGN KEY (empresa_id, padrao_id) 
        REFERENCES padroes_comportamentais(empresa_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_padrel_evidencia FOREIGN KEY (empresa_id, evidencia_id) 
        REFERENCES evidencias_comerciais(empresa_id, id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 9. TABELA: HIPÓTESES CAUSAIS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hipoteses_causais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    padrao_id UUID,
    enunciado_hipotese TEXT NOT NULL,
    causa_raiz_provavel TEXT NOT NULL,
    nivel_confianca NUMERIC(3,2) DEFAULT 0.70,
    status_hipotese VARCHAR(32) DEFAULT 'LEVANTADA',
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_hipoteses_empresa_id UNIQUE (empresa_id, id),
    CONSTRAINT fk_hipotese_padrao FOREIGN KEY (empresa_id, padrao_id) 
        REFERENCES padroes_comportamentais(empresa_id, id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
-- 10. RELACIONAMENTO RELACIONAL: HIPÓTESES <-> EVIDÊNCIAS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hipoteses_evidencias_rel (
    empresa_id UUID NOT NULL,
    hipotese_id UUID NOT NULL,
    evidencia_id UUID NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (hipotese_id, evidencia_id),
    CONSTRAINT fk_hiprel_hipotese FOREIGN KEY (empresa_id, hipotese_id) 
        REFERENCES hipoteses_causais(empresa_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_hiprel_evidencia FOREIGN KEY (empresa_id, evidencia_id) 
        REFERENCES evidencias_comerciais(empresa_id, id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 11. TABELA: DIAGNÓSTICOS DE CRESCIMENTO (7 Dimensões - Capacidade 1)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS diagnosticos_crescimento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    status_diagnostico VARCHAR(32) DEFAULT 'CONCLUIDO',
    resumo_executivo TEXT NOT NULL,
    score_geral_maturidade NUMERIC(4,2),
    scores_dimensoes JSONB NOT NULL,
    versao_metodologia VARCHAR(32) DEFAULT 'VIDE_7D_V2',
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_diagnosticos_empresa_id UNIQUE (empresa_id, id)
);

CREATE INDEX IF NOT EXISTS idx_diagnosticos_data ON diagnosticos_crescimento(empresa_id, criado_em);

-- ---------------------------------------------------------------------
-- 12. RELACIONAMENTO RELACIONAL: DIAGNÓSTICOS <-> EVIDÊNCIAS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS diagnosticos_evidencias_rel (
    empresa_id UUID NOT NULL,
    diagnostico_id UUID NOT NULL,
    evidencia_id UUID NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (diagnostico_id, evidencia_id),
    CONSTRAINT fk_diagrel_diag FOREIGN KEY (empresa_id, diagnostico_id) 
        REFERENCES diagnosticos_crescimento(empresa_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_diagrel_evidencia FOREIGN KEY (empresa_id, evidencia_id) 
        REFERENCES evidencias_comerciais(empresa_id, id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 13. TABELA: GARGALOS COMERCIAIS & PRIORIZAÇÃO EPV
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gargalos_comerciais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    diagnostico_id UUID,
    dimensao_afetada VARCHAR(64) NOT NULL,
    titulo_gargalo VARCHAR(255) NOT NULL,
    descricao_detalhada TEXT NOT NULL,
    impacto_financeiro_estimado NUMERIC(12,2) DEFAULT 0,
    recorrencia_score NUMERIC(3,2) NOT NULL DEFAULT 1.0,
    abrangencia_score NUMERIC(3,2) NOT NULL DEFAULT 1.0,
    severidade_score NUMERIC(3,2) NOT NULL DEFAULT 1.0,
    esforco_estimado INT NOT NULL DEFAULT 3,
    epv_score NUMERIC(8,2) GENERATED ALWAYS AS (
        ROUND( ((recorrencia_score * 0.35 + abrangencia_score * 0.25 + severidade_score * 0.40) * 100.0) / GREATEST(esforco_estimado, 1), 2 )
    ) STORED,
    status_gargalo VARCHAR(32) DEFAULT 'IDENTIFICADO',
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_gargalos_empresa_id UNIQUE (empresa_id, id),
    CONSTRAINT fk_gargalo_diagnostico FOREIGN KEY (empresa_id, diagnostico_id) 
        REFERENCES diagnosticos_crescimento(empresa_id, id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_gargalos_epv ON gargalos_comerciais(empresa_id, epv_score DESC);

-- ---------------------------------------------------------------------
-- 14. RELACIONAMENTO RELACIONAL: GARGALOS <-> EVIDÊNCIAS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gargalos_evidencias_rel (
    empresa_id UUID NOT NULL,
    gargalo_id UUID NOT NULL,
    evidencia_id UUID NOT NULL,
    peso_contribuicao NUMERIC(3,2) DEFAULT 1.0,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (gargalo_id, evidencia_id),
    CONSTRAINT fk_gargrel_gargalo FOREIGN KEY (empresa_id, gargalo_id) 
        REFERENCES gargalos_comerciais(empresa_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_gargrel_evidencia FOREIGN KEY (empresa_id, evidencia_id) 
        REFERENCES evidencias_comerciais(empresa_id, id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 15. TABELA: RECOMENDAÇÕES MIV (Menor Intervenção Viável)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recomendacoes_miv (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    gargalo_id UUID NOT NULL,
    titulo_miv VARCHAR(255) NOT NULL,
    acao_proposta TEXT NOT NULL,
    justificativa_miv TEXT NOT NULL,
    produto_catalogo_vide VARCHAR(128),
    tarefa_central_id VARCHAR(64) REFERENCES tarefas(id) ON DELETE SET NULL,
    status_aprovacao VARCHAR(32) DEFAULT 'AGUARDANDO_DIRETORIA',
    resultado_obtido TEXT,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_recomendacoes_empresa_id UNIQUE (empresa_id, id),
    CONSTRAINT fk_miv_gargalo FOREIGN KEY (empresa_id, gargalo_id) 
        REFERENCES gargalos_comerciais(empresa_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_recomendacoes_status ON recomendacoes_miv(empresa_id, status_aprovacao);

-- ---------------------------------------------------------------------
-- 16. TABELA: TRILHA DE AUDITORIA DE SEGURANÇA (Append-Only)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trilha_auditoria_seguranca (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas_motor(id) ON DELETE RESTRICT,
    usuario_ou_agente VARCHAR(128) NOT NULL,
    acao_executada VARCHAR(128) NOT NULL,
    entidade_alvo VARCHAR(64) NOT NULL,
    entidade_id VARCHAR(64) NOT NULL,
    detalhes_seguranca JSONB NOT NULL DEFAULT '{}',
    ip_origem VARCHAR(64),
    user_agent VARCHAR(255),
    registrado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_auditoria_empresa_id UNIQUE (empresa_id, id)
);

CREATE INDEX IF NOT EXISTS idx_auditoria_busca ON trilha_auditoria_seguranca(empresa_id, registrado_em DESC);

-- ---------------------------------------------------------------------
-- 17. TRIGGER STATEMENT-LEVEL APPEND-ONLY PARA AUDITORIA
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trilha_auditoria_append_only()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'A trilha de auditoria de segurança da VIDE é estritamente append-only. Operações de % são proibidas na tabela %.', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_trilha_auditoria_seguranca_append_only ON trilha_auditoria_seguranca;
CREATE TRIGGER trg_trilha_auditoria_seguranca_append_only
BEFORE UPDATE OR DELETE OR TRUNCATE ON trilha_auditoria_seguranca
FOR EACH STATEMENT EXECUTE FUNCTION fn_trilha_auditoria_append_only();

-- ---------------------------------------------------------------------
-- 18. ATIVAÇÃO E APLICAÇÃO FORÇADA DE RLS (ROW-LEVEL SECURITY)
-- ---------------------------------------------------------------------
DO $$
DECLARE
    tbl text;
    tabelas_tenant text[] := ARRAY[
        'contatos_clientes',
        'identificadores_contato',
        'interacoes_comerciais',
        'eventos_jornada',
        'evidencias_comerciais',
        'padroes_comportamentais',
        'padroes_evidencias_rel',
        'hipoteses_causais',
        'hipoteses_evidencias_rel',
        'diagnosticos_crescimento',
        'diagnosticos_evidencias_rel',
        'gargalos_comerciais',
        'gargalos_evidencias_rel',
        'recomendacoes_miv',
        'trilha_auditoria_seguranca'
    ];
BEGIN
    FOREACH tbl IN ARRAY tabelas_tenant LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);
        
        -- Remover política anterior se existir
        EXECUTE format('DROP POLICY IF EXISTS p_isolation_%I ON %I;', tbl, tbl);
        
        -- Criar política de isolamento estrito por tenant
        EXECUTE format(
            'CREATE POLICY p_isolation_%I ON %I FOR ALL ' ||
            'USING (empresa_id = NULLIF(current_setting(''vide.current_empresa_id'', true), '''')::UUID) ' ||
            'WITH CHECK (empresa_id = NULLIF(current_setting(''vide.current_empresa_id'', true), '''')::UUID);',
            tbl, tbl
        );
    END LOOP;
END $$;
