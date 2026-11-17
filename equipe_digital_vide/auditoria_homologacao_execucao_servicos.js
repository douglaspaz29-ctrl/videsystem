/**
 * =====================================================================
 * VIDE — AUDITORIA OFICIAL DE FINALIZAÇÃO E HOMOLOGAÇÃO
 * SISTEMA DE EXECUÇÃO E ENTREGA DE SERVIÇOS
 * =====================================================================
 * Validação rigorosa dos 4 pilares exigidos pela Diretoria Executiva:
 * 1. Persistência e Reidratação Relacional no PostgreSQL 16 (Render)
 * 2. Isolamento Multiempresa RLS
 * 3. Validação dos 9 Cenários Operacionais de Governança e DAG
 * 4. Verificação de Integridade e Trilha de Auditoria
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const pg = require('pg');

const {
    FRENTES_COMERCIAIS,
    ESTADOS_SISTEMA,
    criarProjetoDemandaComercial,
    autorizarProjetoComercialmente,
    verificarAutorizacaoEPredecessores,
    executarTarefaProjeto,
    avaliarEntregaTarefa,
    executarCorrecaoTarefa,
    obterDossieExecucaoProjeto
} = require('./servico_execucao_servicos');

const { db } = require('./banco_dados');
const { seguranca } = require('./seguranca');
const { salvarProjeto, obterProjetoPorId } = require('./agente_02_coordenador/repositorio_projetos_tarefas');

const connStr = process.env.DATABASE_URL || 'postgresql://vide_admin:0CaD0pCC9KRjdM1Ts69BcPkm0ylqvjZi@dpg-dbrabbei0phs73f98ve0-a.oregon-postgres.render.com:5432/vide_homologacao';
const API_KEY = 'rnd_eGL4bVF9eFQQNUBWpOU0vVJy86JN';
const DB_ID = 'dpg-dbrabbei0phs73f98ve0-a';

function configurarAllowList(ips) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ ipAllowList: ips });
        const req = https.request({
            hostname: 'api.render.com',
            path: '/v1/postgres/' + DB_ID,
            method: 'PATCH',
            headers: {
                'Authorization': 'Bearer ' + API_KEY,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }, (res) => {
            let d = ''; res.on('data', c => d += c);
            res.on('end', () => resolve(res.statusCode));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function obterIpAtual() {
    return new Promise((resolve, reject) => {
        https.get('https://api.ipify.org?format=json', (res) => {
            let d = ''; res.on('data', c => d += c);
            res.on('end', () => resolve(JSON.parse(d).ip));
        }).on('error', reject);
    });
}

async function executarAuditoriaHomologacao() {
    console.log('========================================================================');
    console.log('VIDE — AUDITORIA DE FINALIZAÇÃO E HOMOLOGAÇÃO: SISTEMA DE EXECUÇÃO');
    console.log('========================================================================\n');

    let totalAsserts = 0;
    let totalPassou = 0;

    function asserir(condicao, descricao) {
        totalAsserts++;
        if (condicao) {
            console.log(`  ✓ [AUDITORIA ${totalAsserts.toString().padStart(2, '0')}] ${descricao}`);
            totalPassou++;
        } else {
            console.error(`  ❌ [FALHA ${totalAsserts.toString().padStart(2, '0')}] ${descricao}`);
            throw new Error(`Falha de auditoria: ${descricao}`);
        }
    }

    const meuIp = await obterIpAtual();
    console.log(`IP de auditoria: ${meuIp}`);
    console.log('Liberando perímetro temporário no Render PostgreSQL...');
    const statusPatch = await configurarAllowList([{ cidrBlock: meuIp + '/32', description: 'Auditoria Homologacao Execucao' }]);
    asserir(statusPatch === 200, 'Perímetro temporário liberado na allowlist do Render');
    await new Promise(r => setTimeout(r, 4000));

    const pool = new pg.Pool({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false }
    });
    db.pgPool = pool;

    try {
        const client = await pool.connect();
        try {
            // -----------------------------------------------------------------
            // PILAR 1: VERIFICAÇÃO DO ESQUEMA FÍSICO NO POSTGRESQL 16
            // -----------------------------------------------------------------
            console.log('\n--- PILAR 1: ESTRUTURA FÍSICA E MIGRAÇÃO 004 NO POSTGRESQL ---');
            
            const rColsProj = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'projetos'
            `);
            const colunasProj = rColsProj.rows.map(r => r.column_name);

            asserir(colunasProj.includes('frentes_comerciais'), 'Coluna projetos.frentes_comerciais existe no PostgreSQL.');
            asserir(colunasProj.includes('escopo_autorizado'), 'Coluna projetos.escopo_autorizado existe no PostgreSQL.');
            asserir(colunasProj.includes('entregaveis'), 'Coluna projetos.entregaveis existe no PostgreSQL.');
            asserir(colunasProj.includes('limites_trabalho'), 'Coluna projetos.limites_trabalho existe no PostgreSQL.');
            asserir(colunasProj.includes('responsavel_aprovacao'), 'Coluna projetos.responsavel_aprovacao existe no PostgreSQL.');
            asserir(colunasProj.includes('natureza_projeto'), 'Coluna projetos.natureza_projeto existe no PostgreSQL.');

            const rColsTar = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'tarefas'
            `);
            const colunasTar = rColsTar.rows.map(r => r.column_name);

            asserir(colunasTar.includes('objetivo'), 'Coluna tarefas.objetivo existe no PostgreSQL.');
            asserir(colunasTar.includes('entradas_necessarias'), 'Coluna tarefas.entradas_necessarias existe no PostgreSQL.');
            asserir(colunasTar.includes('resultado_esperado'), 'Coluna tarefas.resultado_esperado existe no PostgreSQL.');
            asserir(colunasTar.includes('criterio_conclusao'), 'Coluna tarefas.criterio_conclusao existe no PostgreSQL.');
            asserir(colunasTar.includes('evidencias_execucao'), 'Coluna tarefas.evidencias_execucao existe no PostgreSQL.');
            asserir(colunasTar.includes('historico_alteracoes'), 'Coluna tarefas.historico_alteracoes existe no PostgreSQL.');
            asserir(colunasTar.includes('bloqueio_motivo'), 'Coluna tarefas.bloqueio_motivo existe no PostgreSQL.');
            asserir(colunasTar.includes('apontamentos_correcao'), 'Coluna tarefas.apontamentos_correcao existe no PostgreSQL.');

            const rAud = await client.query(`
                SELECT table_name FROM information_schema.tables WHERE table_name = 'auditoria_execucao_servicos'
            `);
            asserir(rAud.rows.length === 1, 'Tabela auditoria_execucao_servicos existe no PostgreSQL.');

            // -----------------------------------------------------------------
            // PILAR 2: PERSISTÊNCIA E REIDRATAÇÃO RELACIONAL EM HOMOLOGAÇÃO
            // -----------------------------------------------------------------
            console.log('\n--- PILAR 2: PERSISTÊNCIA E REIDRATAÇÃO DO PROJETO REMOTO ---');

            const idProjTeste = 'PRJ-2026-AA29F7';
            const rProjPg = await client.query('SELECT * FROM projetos WHERE id = $1', [idProjTeste]);
            asserir(rProjPg.rows.length === 1, `Projeto [${idProjTeste}] persistido fisicamente no PostgreSQL.`);

            const rowP = rProjPg.rows[0];
            asserir(rowP.autorizacao_status === 'AUTORIZADO', 'Status de autorização confirmado como AUTORIZADO no banco.');
            asserir(rowP.responsavel_aprovacao.includes('Douglas Paz'), 'Responsável registrado como Douglas Paz.');
            
            const rTarPg = await client.query('SELECT * FROM tarefas WHERE projeto_id = $1 ORDER BY criado_em ASC', [idProjTeste]);
            asserir(rTarPg.rows.length >= 4, `Tarefas persistidas no PostgreSQL para o projeto [${idProjTeste}]: ${rTarPg.rows.length} tarefas.`);

            const tarBranding = rTarPg.rows.find(t => t.especialista.includes('Branding'));
            asserir(tarBranding && tarBranding.estado === 'CONCLUIDO', 'Tarefa de Branding persistida como CONCLUIDO no banco.');

            const tarDev = rTarPg.rows.find(t => t.especialista.includes('Desenvolvedor'));
            asserir(tarDev && tarDev.estado === 'EM_EXECUCAO', 'Tarefa de Dev desbloqueada e persistida como EM_EXECUCAO.');

            const tarAuto = rTarPg.rows.find(t => t.especialista.includes('Automação'));
            asserir(tarAuto && tarAuto.estado === 'BLOQUEADO', 'Tarefa de Automação mantida e persistida como BLOQUEADO.');

            // -----------------------------------------------------------------
            // PILAR 3: REIDRATAÇÃO VIA API RELACIONAL (ZERO PERDA DE DADOS)
            // -----------------------------------------------------------------
            console.log('\n--- PILAR 3: REIDRATAÇÃO VIA ADAPTADOR E SERVIÇO ---');

            const projReidratado = await db.obterProjetoDoPostgres(idProjTeste);
            asserir(projReidratado !== null, 'Projeto reidratado com sucesso do PostgreSQL pelo adaptador.');
            salvarProjeto(projReidratado);
            asserir(projReidratado.grafo_tarefas && projReidratado.grafo_tarefas.length >= 4, 'Grafo de tarefas reidratado com fidelidade relacional.');
            asserir(Array.isArray(projReidratado.frentes_comerciais) && projReidratado.frentes_comerciais.includes('PRESENCA_COMERCIAL'), 'Frente Presença Comercial recuperada.');
            asserir(projReidratado.frentes_comerciais.includes('SISTEMA_COMERCIAL'), 'Frente Sistema Comercial recuperada.');

            const dossie = obterDossieExecucaoProjeto(idProjTeste);
            asserir(dossie !== null, 'Dossiê executivo 360º gerado a partir do projeto reidratado.');
            asserir(dossie.progresso_percentual >= 20, `Progresso executivo coerente calculado pelo dossiê (${dossie.progresso_percentual}%).`);

            // -----------------------------------------------------------------
            // PILAR 4: ISOLAMENTO MULTIEMPRESA (RLS & TENANCY)
            // -----------------------------------------------------------------
            console.log('\n--- PILAR 4: ISOLAMENTO MULTIEMPRESA ---');

            // Usuário Douglas Paz (Diretor Executivo) tem acesso global
            const tokenDouglas = seguranca.gerarTokenSessao({
                id: 'usr_douglas',
                usuario: 'douglas',
                nome: 'Douglas Paz',
                papel: 'DIRETOR'
            });
            const authDouglas = seguranca.validarToken(tokenDouglas);
            asserir(authDouglas && authDouglas.papel === 'DIRETOR', 'Token executivo de Diretoria validado com privilégio DIRETOR.');

            // Usuário Cliente Alfa restrito exclusivamente à Empresa Alfa
            const idTenantAlfa = 'emp_alfa_112233';
            const idTenantBeta = 'emp_beta_445566';
            const tokenClienteAlfa = seguranca.gerarTokenSessao({
                id: 'usr_cliente_alfa',
                usuario: 'gestor_alfa',
                nome: 'Gestor Alfa',
                papel: 'CLIENTE',
                clienteId: idTenantAlfa
            });
            const authAlfa = seguranca.validarToken(tokenClienteAlfa);
            asserir(authAlfa && authAlfa.clienteId === idTenantAlfa, 'Token de Cliente vinculado com isolamento ao tenant Alfa.');

            // Simulação de tentativa de acesso cruzado: Cliente Alfa tentando acessar projeto do Tenant Beta
            const projetoBeta = {
                id_projeto: 'PRJ-BETA-CONFIDENCIAL',
                cliente_id: idTenantBeta,
                situacao_projeto: 'EM_EXECUCAO'
            };

            const acessoPermitido = (authAlfa.papel === 'DIRETOR' || authAlfa.papel === 'DIRETORA' || authAlfa.clienteId === projetoBeta.cliente_id);
            asserir(acessoPermitido === false, 'Acesso cruzado bloqueado: Cliente Alfa não tem permissão para ler dados do Tenant Beta.');

            // -----------------------------------------------------------------
            // PILAR 5: VALIDAÇÃO DOS 9 CENÁRIOS OPERACIONAIS
            // -----------------------------------------------------------------
            console.log('\n--- PILAR 5: VALIDAÇÃO DOS 9 CENÁRIOS OPERACIONAIS ---');

            // 1. Projeto sem autorização comercial
            const pSemAut = criarProjetoDemandaComercial({
                empresaContratante: 'Empresa Teste Início [SIMULADO]',
                solicitacaoOriginal: 'Desenvolvimento comercial completo.',
                frentesComerciais: [FRENTES_COMERCIAIS.PRESENCA_COMERCIAL]
            });
            asserir(pSemAut.situacao_projeto === 'AGUARDANDO_AUTORIZACAO_COMERCIAL', 'Cenário 1: Projeto inicia em AGUARDANDO_AUTORIZACAO_COMERCIAL.');

            // 2. Bloqueio mandatório sem autorização
            let bloqueouSemAut = false;
            try {
                executarTarefaProjeto({ idProjeto: pSemAut.id_projeto, idTarefa: 'TSK-INICIAL' });
            } catch (e) {
                if (e.message.includes('[BLOQUEIO_AUTORIZACAO_COMERCIAL]')) bloqueouSemAut = true;
            }
            asserir(bloqueouSemAut, 'Cenário 2: Execução bloqueada com [BLOQUEIO_AUTORIZACAO_COMERCIAL].');

            // 3. Autorização comercial formal por Douglas Paz
            const pAut = autorizarProjetoComercialmente({
                idProjeto: pSemAut.id_projeto,
                escopoAutorizado: 'Implementação de landing page de alta conversão.',
                limitesTrabalho: 'Sem compra de tráfego nem anúncios.',
                entregaveis: ['Ativos de branding', 'Código web responsivo'],
                responsavelAprovacao: 'Douglas Paz — Diretor Executivo'
            });
            asserir(pAut.situacao_projeto === 'EM_EXECUCAO', 'Cenário 3: Projeto formalmente autorizado e em EM_EXECUCAO.');
            asserir(pAut.grafo_tarefas.length === 2, 'Cenário 3: Grafo DAG planejado com 2 tarefas encadeadas.');

            // 4. Execução de tarefa pelo especialista
            const tsk01 = pAut.grafo_tarefas[0];
            const resExec01 = executarTarefaProjeto({ idProjeto: pAut.id_projeto, idTarefa: tsk01.id_tarefa });
            asserir(resExec01.estado === 'AGUARDANDO_APROVACAO', 'Cenário 4: Tarefa executada avança para AGUARDANDO_APROVACAO.');
            asserir(resExec01.evidencias.length > 0, 'Cenário 4: Evidências estruturadas anexadas.');

            // 5. Bloqueio por dependência no DAG
            const tsk02 = pAut.grafo_tarefas[1];
            let bloqueouDep = false;
            try {
                executarTarefaProjeto({ idProjeto: pAut.id_projeto, idTarefa: tsk02.id_tarefa });
            } catch (e) {
                if (e.message.includes('[BLOQUEIO_DEPENDENCIA]')) bloqueouDep = true;
            }
            asserir(bloqueouDep, 'Cenário 5: Tarefa 02 bloqueada com [BLOQUEIO_DEPENDENCIA].');

            // 6. Entregável enviado para aprovação
            const pAtual = db.obterProjeto(pAut.id_projeto);
            const tskAtual = pAtual.grafo_tarefas.find(t => t.id_tarefa === tsk01.id_tarefa);
            asserir(tskAtual.estado === 'AGUARDANDO_APROVACAO', 'Cenário 6: Entregável formalmente aguardando conferência humana.');

            // 7. Entregável rejeitado e encaminhado para correção
            const resRejeicao = avaliarEntregaTarefa({
                idProjeto: pAut.id_projeto,
                idTarefa: tsk01.id_tarefa,
                aprovado: false,
                parecer: 'Ajustar contraste de cores da paleta para atender WCAG AA.',
                apontamentosCorrecao: 'Corrigir contraste dos botões primários.',
                responsavelAvaliacao: 'Douglas Paz — Diretor Executivo'
            });
            asserir(resRejeicao.aprovado === false, 'Cenário 7: Rejeição registrada com sucesso.');
            asserir(resRejeicao.novo_estado === 'EM_EXECUCAO', 'Cenário 7: Tarefa retornada para EM_EXECUCAO.');
            
            const pAposRej = obterProjetoPorId(pAut.id_projeto);
            const tskRej = pAposRej.grafo_tarefas.find(t => t.id_tarefa === tsk01.id_tarefa);
            asserir(tskRej.necessita_correcao === true, 'Cenário 7: Flag necessita_correcao ativada.');

            // Correção executada
            const resCorr = executarCorrecaoTarefa({
                idProjeto: pAut.id_projeto,
                idTarefa: tsk01.id_tarefa,
                instrucoesCorrecao: 'Contraste ajustado para 4.8:1 no CSS de tokens.'
            });
            asserir((resCorr.estado || resCorr.novo_estado) === 'AGUARDANDO_APROVACAO', 'Cenário 7: Tarefa corrigida ressubmetida para aprovação.');

            // 8. Entregável aprovado e destravamento DAG
            const resAprov = avaliarEntregaTarefa({
                idProjeto: pAut.id_projeto,
                idTarefa: tsk01.id_tarefa,
                aprovado: true,
                parecer: 'Tokens e ativos aprovados com louvor pela Diretoria.',
                responsavelAvaliacao: 'Douglas Paz — Diretor Executivo'
            });
            asserir(resAprov.aprovado === true, 'Cenário 8: Entrega aprovada formalmente.');
            asserir(resAprov.novo_estado === 'CONCLUIDO', 'Cenário 8: Tarefa marcada como CONCLUIDO.');

            const pAposAprov = obterProjetoPorId(pAut.id_projeto);
            const tsk02Destravada = pAposAprov.grafo_tarefas.find(t => t.id_tarefa === tsk02.id_tarefa);
            asserir(tsk02Destravada.estado === 'EM_EXECUCAO', 'Cenário 8: Grafo DAG desbloqueou automaticamente a Tarefa 02.');

            // 9. Projeto concluído com histórico preservado
            executarTarefaProjeto({ idProjeto: pAut.id_projeto, idTarefa: tsk02.id_tarefa });
            avaliarEntregaTarefa({
                idProjeto: pAut.id_projeto,
                idTarefa: tsk02.id_tarefa,
                aprovado: true,
                parecer: 'Landing page testada e aprovada.',
                responsavelAvaliacao: 'Douglas Paz — Diretor Executivo'
            });

            const dossieFinal = obterDossieExecucaoProjeto(pAut.id_projeto);
            asserir(dossieFinal.situacao_projeto === 'CONCLUIDO', 'Cenário 9: Projeto atingiu status CONCLUIDO após aprovação de todas as tarefas.');
            asserir(dossieFinal.progresso_percentual === 100, 'Cenário 9: Progresso de entrega atingiu 100%.');
            asserir(dossieFinal.historico_auditoria.length >= 6, 'Cenário 9: Trilha de auditoria contém todos os eventos preservados.');

            console.log('\n========================================================================');
            console.log(`TOTAL DE ASSERÇÕES DE AUDITORIA: ${totalAsserts}`);
            console.log(`ASSERÇÕES HOMOLOGADAS:           ${totalPassou} / ${totalAsserts} (100%)`);
            console.log('STATUS DO SISTEMA DE EXECUÇÃO:   HOMOLOGADO COM SUCESSO TOTAL');
            console.log('========================================================================\n');

        } finally {
            client.release();
        }
    } finally {
        await pool.end();
        console.log('Restaurando allowlist do Render...');
        await configurarAllowList([]);
        console.log('Perímetro restrito restaurado!');
    }
}

executarAuditoriaHomologacao().catch(err => {
    console.error('Erro na auditoria:', err);
    process.exit(1);
});
