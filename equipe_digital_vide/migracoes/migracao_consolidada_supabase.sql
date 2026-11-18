-- =====================================================================
-- VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
-- SCRIPT CONSOLIDADO DE IMPLANTAÇÃO DDL PARA SUPABASE POSTGRESQL (PRODUÇÃO)
-- =====================================================================
-- Este arquivo consolida todas as 27 tabelas relacionais da VIDE:
-- 1. Schema Base Operacional (Clientes, Projetos, Tarefas, Entregas, Auditoria)
-- 2. Motor de Inteligência Comercial v2.2 (Empresas, Contatos, Diagnósticos 7D, MIVs)
-- 3. Camada de Ingestão de Dados Multi-Fonte (Lotes, Registros Estagiados)
-- 4. Sistema de Execução e Entrega de Serviços (Frentes, Limites, DAG, Auditoria)
-- 5. Row Level Security (RLS) Multi-Tenant e Índices de Alta Performance
-- Execução idempotente e transacional no SQL Editor do Supabase.
-- =====================================================================

BEGIN;

-- =====================================================================
-- VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
-- SCHEMA OFICIAL POSTGRESQL / SUPABASE (DDL COMPLETO)
-- Arquitetura Relacional Multi-Tenant com Isolamento de Clientes,
-- Integridade Referencial, RLS e Auditoria Histórica
-- =====================================================================

-- Extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA: CLIENTES (Tenant Root)
CREATE TABLE IF NOT EXISTS clientes (
    id VARCHAR(64) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    documento VARCHAR(32),
    email VARCHAR(255),
    telefone VARCHAR(32),
    segmento VARCHAR(128),
    ticket_medio NUMERIC(12, 2) DEFAULT 0,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABELA: AGENTES ESPECIALISTAS (Catálogo da Equipe Digital)
CREATE TABLE IF NOT EXISTS agentes (
    id VARCHAR(64) PRIMARY KEY,
    nome VARCHAR(128) NOT NULL,
    papel VARCHAR(128) NOT NULL,
    tipo_inteligencia VARCHAR(64) NOT NULL DEFAULT 'REGRAS_E_LLM',
    versao VARCHAR(32) NOT NULL DEFAULT '1.0',
    status VARCHAR(32) NOT NULL DEFAULT 'ATIVO'
);

-- 3. TABELA: PROJETOS (Demandas Contratadas e em Andamento)
CREATE TABLE IF NOT EXISTS projetos (
    id VARCHAR(64) PRIMARY KEY,
    cliente_id VARCHAR(64) NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    id_demanda_origem VARCHAR(64),
    solicitacao_original TEXT NOT NULL,
    situacao_projeto VARCHAR(64) NOT NULL DEFAULT 'AGUARDANDO_AUTORIZACAO_COMERCIAL',
    autorizacao_status VARCHAR(32) NOT NULL DEFAULT 'PENDENTE',
    servicos_autorizados JSONB DEFAULT '[]'::jsonb,
    data_autorizacao TIMESTAMP WITH TIME ZONE,
    observacao_autorizacao TEXT,
    prioridade VARCHAR(32) DEFAULT 'NORMAL',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABELA: TAREFAS (Grafo DAG Atômico de Dependências)
CREATE TABLE IF NOT EXISTS tarefas (
    id VARCHAR(64) PRIMARY KEY,
    projeto_id VARCHAR(64) NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    agente_id VARCHAR(64) NOT NULL REFERENCES agentes(id),
    especialista VARCHAR(128) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    dependencias JSONB DEFAULT '[]'::jsonb,
    criterios_aceite JSONB DEFAULT '[]'::jsonb,
    estado VARCHAR(64) NOT NULL DEFAULT 'BLOQUEADA_POR_AUTORIZACAO',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABELA: ENTREGAS (Arquivos Físicos, Manifestos e Auditorias)
CREATE TABLE IF NOT EXISTS entregas (
    id VARCHAR(64) PRIMARY KEY,
    tarefa_id VARCHAR(64) NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
    projeto_id VARCHAR(64) NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    diretorio_fisico VARCHAR(512),
    arquivos JSONB DEFAULT '[]'::jsonb,
    manifesto JSONB,
    testes_conformidade JSONB,
    pontuacao_conformidade NUMERIC(5, 2) DEFAULT 0,
    aprovado_pelo_coordenador BOOLEAN DEFAULT FALSE,
    parecer_coordenador TEXT,
    submetido_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    auditado_em TIMESTAMP WITH TIME ZONE
);

-- 6. TABELA: EVENTOS_HISTORICO (Trilha Imutável de Auditoria Operacional)
CREATE TABLE IF NOT EXISTS eventos_historico (
    id SERIAL PRIMARY KEY,
    projeto_id VARCHAR(64) NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    tarefa_id VARCHAR(64) REFERENCES tarefas(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    autor VARCHAR(128) NOT NULL,
    tipo_evento VARCHAR(64) NOT NULL,
    estado_anterior VARCHAR(64),
    novo_estado VARCHAR(64),
    nota TEXT,
    detalhes JSONB
);

-- 7. TABELA: CRM_LEADS (Gestão de Contatos, Objeções e Cadências)
CREATE TABLE IF NOT EXISTS crm_leads (
    id VARCHAR(64) PRIMARY KEY,
    cliente_id VARCHAR(64) NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    nome VARCHAR(255),
    telefone VARCHAR(32) NOT NULL,
    canal_origem VARCHAR(64),
    etapa_funil VARCHAR(64) DEFAULT 'CONTATO_INICIAL',
    status_atendimento VARCHAR(64) DEFAULT 'NOVO',
    opt_out BOOLEAN DEFAULT FALSE,
    valor_estimado NUMERIC(12, 2) DEFAULT 0,
    mensagens JSONB DEFAULT '[]'::jsonb,
    cadencias_ativas JSONB DEFAULT '[]'::jsonb,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABELA: AUDITORIA_ADMIN (Segurança e Log de Ações Administrativas)
CREATE TABLE IF NOT EXISTS auditoria_admin (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    usuario VARCHAR(128) NOT NULL,
    ip VARCHAR(64),
    acao VARCHAR(128) NOT NULL,
    entidade VARCHAR(64) NOT NULL,
    entidade_id VARCHAR(64),
    dados_anteriores JSONB,
    dados_novos JSONB,
    sucesso BOOLEAN DEFAULT TRUE
);

-- 9. TABELA: USUARIOS_SISTEMA (Autenticação RBAC)
CREATE TABLE IF NOT EXISTS usuarios_sistema (
    id VARCHAR(64) PRIMARY KEY,
    usuario VARCHAR(64) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    papel VARCHAR(32) NOT NULL DEFAULT 'OPERADOR', -- 'DIRETORA', 'OPERADOR', 'CLIENTE_VIEWER'
    cliente_id VARCHAR(64) REFERENCES clientes(id),
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. TABELA: ARQUIVOS_ARMAZENAMENTO (Storage Durável de Entregáveis e Documentos)
CREATE TABLE IF NOT EXISTS arquivos_armazenamento (
    id VARCHAR(255) PRIMARY KEY,
    projeto_id VARCHAR(64) NOT NULL,
    especialista VARCHAR(128) NOT NULL,
    nome_arquivo VARCHAR(255) NOT NULL,
    caminho_relativo VARCHAR(512) NOT NULL,
    mimetype VARCHAR(128) DEFAULT 'text/plain',
    conteudo TEXT NOT NULL,
    tamanho_bytes INT NOT NULL DEFAULT 0,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- ÍNDICES DE PERFORMANCE E INTEGRIDADE
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_projetos_cliente ON projetos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_projetos_situacao ON projetos(situacao_projeto);
CREATE INDEX IF NOT EXISTS idx_tarefas_projeto ON tarefas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_estado ON tarefas(estado);
CREATE INDEX IF NOT EXISTS idx_crm_leads_cliente ON crm_leads(cliente_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_telefone ON crm_leads(telefone);
CREATE INDEX IF NOT EXISTS idx_eventos_projeto ON eventos_historico(projeto_id);
CREATE INDEX IF NOT EXISTS idx_arquivos_projeto ON arquivos_armazenamento(projeto_id);
CREATE INDEX IF NOT EXISTS idx_arquivos_especialista ON arquivos_armazenamento(especialista);

-- =====================================================================
-- ROW-LEVEL SECURITY (RLS) DESATIVADO PARA OPERAÇÃO DO BACKEND DEDICADO
-- =====================================================================
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE projetos DISABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas DISABLE ROW LEVEL SECURITY;
ALTER TABLE entregas DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads DISABLE ROW LEVEL SECURITY;

-- Exemplo de política de isolamento por cliente:
-- CREATE POLICY cliente_isolamento_projetos ON projetos
--     FOR ALL USING (cliente_id = current_setting('app.current_cliente_id', true));

-- =====================================================================
-- CARGA INICIAL: OS 7 AGENTES ESPECIALISTAS DA VIDE
-- =====================================================================
INSERT INTO agentes (id, nome, papel, tipo_inteligencia, versao) VALUES
('agente_01_triagem', 'Agente 01 — Triagem', 'Triagem, Diagnóstico e Classificação de Escopo', 'REGRAS_E_LLM', '1.1'),
('agente_02_coordenador', 'Agente 02 — Coordenador Geral', 'Coordenação, Grafo de Tarefas e Auditoria', 'REGRAS_E_LLM', '1.1'),
('agente_03_desenvolvedor', 'Agente 03 — Desenvolvedor Full-Stack', 'Programação, Landing Pages e Soluções Web', 'REGRAS_E_LLM', '1.0'),
('agente_04_branding_design', 'Agente 04 — Branding e Design', 'Identidade Visual, Design Tokens e UI/UX', 'REGRAS_E_LLM', '1.0'),
('agente_05_atendimento', 'Agente 05 — Atendimento e Vendas', 'Jornada, Roteiros Comerciais e Objeções', 'REGRAS_E_LLM', '1.0'),
('agente_06_automacao', 'Agente 06 — Automação e Integrações', 'Workflows n8n, Webhooks e CRM Runtime', 'REGRAS_E_LLM', '1.0'),
('agente_07_inteligencia_comercial', 'Agente 07 — Inteligência Comercial', 'Auditoria de Funil, Motor de Objeções e BI', 'REGRAS_E_LLM', '1.0')
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    papel = EXCLUDED.papel,
    tipo_inteligencia = EXCLUDED.tipo_inteligencia,
    versao = EXCLUDED.versao;


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


-- =====================================================================
-- VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
-- MIGRAÇÃO VERSIONADA 004: SISTEMA DE EXECUÇÃO E ENTREGA DE SERVIÇOS
-- =====================================================================
-- Escopo:
-- 1. Ampliação da tabela 'projetos' para governança de frentes comerciais,
--    escopo autorizado, entregáveis, limites do trabalho e aprovador.
-- 2. Ampliação da tabela 'tarefas' com suporte aos requisitos operacionais:
--    objetivo, entradas necessárias, resultado esperado, critérios de conclusão,
--    evidências de execução, histórico de alterações e apontamentos de correção.
-- 3. Tabela de auditoria operacional de execução e índices de performance.
-- =====================================================================

-- 1. Ampliação da tabela PROJETOS
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS frentes_comerciais JSONB DEFAULT '[]'::jsonb;
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS escopo_autorizado TEXT;
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS entregaveis JSONB DEFAULT '[]'::jsonb;
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS limites_trabalho TEXT;
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS responsavel_aprovacao VARCHAR(255);
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS natureza_projeto VARCHAR(32) DEFAULT 'SIMULADO';

-- 2. Ampliação da tabela TAREFAS
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS objetivo TEXT;
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS entradas_necessarias JSONB DEFAULT '[]'::jsonb;
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS resultado_esperado TEXT;
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS criterio_conclusao TEXT;
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS evidencias_execucao JSONB DEFAULT '[]'::jsonb;
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS historico_alteracoes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS bloqueio_motivo TEXT;
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS apontamentos_correcao TEXT;

-- 3. Tabela de Auditoria Operacional de Execução
CREATE TABLE IF NOT EXISTS auditoria_execucao_servicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projeto_id VARCHAR(64) NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    tarefa_id VARCHAR(64),
    evento VARCHAR(64) NOT NULL,
    estado_anterior VARCHAR(64),
    novo_estado VARCHAR(64) NOT NULL,
    autor VARCHAR(255) NOT NULL,
    detalhes JSONB DEFAULT '{}'::jsonb,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auditoria_exec_proj ON auditoria_execucao_servicos(projeto_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_tarefas_proj_estado ON tarefas(projeto_id, estado);
CREATE INDEX IF NOT EXISTS idx_projetos_situacao ON projetos(situacao_projeto);



-- =====================================================================
-- REGISTRO OFICIAL NA TABELA DE CONTROLE DE MIGRAÇÕES
-- =====================================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
    versao VARCHAR(64) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    executado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_migrations (versao, nome, checksum)
VALUES 
    ('001_motor_inteligencia_v22', '001_motor_inteligencia_v22.sql', 'BOOTSTRAP_SUPABASE_CONSOLIDADO'),
    ('002_evolucao_inteligencia_motor', '002_evolucao_inteligencia_motor.sql', 'BOOTSTRAP_SUPABASE_CONSOLIDADO'),
    ('003_camada_ingestao_dados_comerciais', '003_camada_ingestao_dados_comerciais.sql', 'BOOTSTRAP_SUPABASE_CONSOLIDADO'),
    ('004_sistema_execucao_servicos', '004_sistema_execucao_servicos.sql', 'BOOTSTRAP_SUPABASE_CONSOLIDADO')
ON CONFLICT (versao) DO NOTHING;

COMMIT;

-- SUCESSO: Estrutura relacional VIDE 100% implantada para operação no Supabase!
