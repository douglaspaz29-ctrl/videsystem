-- =====================================================================
-- VIDE — MOTOR DE INTELIGÊNCIA COMERCIAL (v2.2)
-- SCRIPT DE REVERSÃO / ROLLBACK: 001_motor_inteligencia_v22_reversao.sql
-- Escopo: Remoção segura e idempotente das 16 tabelas e políticas do Motor
-- PRESERVAÇÃO TOTAL: NENHUMA TABELA LEGADA É REMOVIDA OU MODIFICADA
-- =====================================================================

DO $$
BEGIN
    -- 1. Remoção do Trigger de Auditoria
    DROP TRIGGER IF EXISTS trg_trilha_auditoria_seguranca_append_only ON trilha_auditoria_seguranca;
    DROP FUNCTION IF EXISTS fn_trilha_auditoria_append_only();

    -- 2. Remoção das Tabelas de Junção Relacional (Ordem reversa de dependência)
    DROP TABLE IF EXISTS gargalos_evidencias_rel CASCADE;
    DROP TABLE IF EXISTS diagnosticos_evidencias_rel CASCADE;
    DROP TABLE IF EXISTS hipoteses_evidencias_rel CASCADE;
    DROP TABLE IF EXISTS padroes_evidencias_rel CASCADE;

    -- 3. Remoção das Tabelas de Ações e Diagnósticos
    DROP TABLE IF EXISTS recomendacoes_miv CASCADE;
    DROP TABLE IF EXISTS gargalos_comerciais CASCADE;
    DROP TABLE IF EXISTS diagnosticos_crescimento CASCADE;
    DROP TABLE IF EXISTS hipoteses_causais CASCADE;
    DROP TABLE IF EXISTS padroes_comportamentais CASCADE;

    -- 4. Remoção das Tabelas de Interação e Evidência
    DROP TABLE IF EXISTS evidencias_comerciais CASCADE;
    DROP TABLE IF EXISTS eventos_jornada CASCADE;
    DROP TABLE IF EXISTS interacoes_comerciais CASCADE;
    DROP TABLE IF EXISTS identificadores_contato CASCADE;
    DROP TABLE IF EXISTS contatos_clientes CASCADE;

    -- 5. Remoção da Trilha de Auditoria e Entidade Raiz
    DROP TABLE IF EXISTS trilha_auditoria_seguranca CASCADE;
    DROP TABLE IF EXISTS empresas_motor CASCADE;

    -- 6. Atualização da tabela de controle de migração se existir
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'schema_migrations') THEN
        DELETE FROM schema_migrations WHERE versao = '001_motor_inteligencia_v22';
    END IF;

    RAISE NOTICE 'Reversão da migração 001_motor_inteligencia_v22 concluída com sucesso. Tabelas legadas preservadas.';
END $$;
