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
-- ROW-LEVEL SECURITY (RLS) PARA ISOLAMENTO MULTI-TENANT NO SUPABASE
-- =====================================================================
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;

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
