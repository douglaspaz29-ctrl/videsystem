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
