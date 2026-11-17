-- =====================================================================
-- VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
-- MIGRAÇÃO VERSIONADA 004 (REVERSÃO): SISTEMA DE EXECUÇÃO E ENTREGA
-- =====================================================================

DROP TABLE IF EXISTS auditoria_execucao_servicos CASCADE;

ALTER TABLE tarefas DROP COLUMN IF EXISTS apontamentos_correcao;
ALTER TABLE tarefas DROP COLUMN IF EXISTS bloqueio_motivo;
ALTER TABLE tarefas DROP COLUMN IF EXISTS historico_alteracoes;
ALTER TABLE tarefas DROP COLUMN IF EXISTS evidencias_execucao;
ALTER TABLE tarefas DROP COLUMN IF EXISTS criterio_conclusao;
ALTER TABLE tarefas DROP COLUMN IF EXISTS resultado_esperado;
ALTER TABLE tarefas DROP COLUMN IF EXISTS entradas_necessarias;
ALTER TABLE tarefas DROP COLUMN IF EXISTS objetivo;

ALTER TABLE projetos DROP COLUMN IF EXISTS natureza_projeto;
ALTER TABLE projetos DROP COLUMN IF EXISTS responsavel_aprovacao;
ALTER TABLE projetos DROP COLUMN IF EXISTS limites_trabalho;
ALTER TABLE projetos DROP COLUMN IF EXISTS entregaveis;
ALTER TABLE projetos DROP COLUMN IF EXISTS escopo_autorizado;
ALTER TABLE projetos DROP COLUMN IF EXISTS frentes_comerciais;
