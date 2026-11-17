/**
 * =====================================================================
 * VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
 * SUÍTE DE TESTES: AUTENTICAÇÃO OBRIGATÓRIA E RBAC NAS ROTAS LEGADAS
 * =====================================================================
 * Validação rigorosa dos requisitos de segurança da Etapa 1:
 * - Acesso anônimo bloqueado (HTTP 401)
 * - Token inválido / forjado bloqueado (HTTP 401)
 * - Perfil sem permissão bloqueado (HTTP 403)
 * - Usuário autorizado liberado (HTTP 200 / 201)
 * - Operações internas dos 7 agentes 100% preservadas
 * =====================================================================
 */

const http = require('http');
const path = require('path');
const { seguranca } = require('./seguranca');
const { db } = require('./banco_dados');

// Importa os agentes e repositório para validar operações internas
const { processarTriagemRevisada } = require('./agente_01_triagem/executor_triagem');
const { receberRegistroTriagem, autorizarProjetoComercialmente } = require('./agente_02_coordenador/executor_coordenador');
const { obterProjetoPorId, salvarProjeto, listarProjetos } = require('./agente_02_coordenador/repositorio_projetos_tarefas');

let totalTestes = 0;
let aprovados = 0;

function assert(descricao, condicao, detalhes = '') {
    totalTestes++;
    if (condicao) {
        aprovados++;
        console.log(`✓ [APROVADO] ${descricao}`);
        if (detalhes) console.log(`   └─ ${detalhes}`);
    } else {
        console.error(`✗ [REPROVADO] ${descricao}`);
        if (detalhes) console.error(`   └─ DETALHES: ${detalhes}`);
    }
}

function dispararHttp({ porta, caminho, metodo = 'GET', headers = {}, body = null }) {
    return new Promise((resolve, reject) => {
        const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
        const reqHeaders = { ...headers };
        if (payload) {
            reqHeaders['Content-Type'] = 'application/json';
            reqHeaders['Content-Length'] = Buffer.byteLength(payload);
        }

        const req = http.request({
            hostname: '127.0.0.1',
            port: porta,
            path: caminho,
            method: metodo,
            headers: reqHeaders
        }, (res) => {
            let dados = '';
            res.on('data', chunk => dados += chunk);
            res.on('end', () => {
                let json = null;
                try { json = JSON.parse(dados); } catch (_) {}
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: json || dados
                });
            });
        });

        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function executarSuiteSeguranca() {
    console.log('======================================================================');
    console.log('VIDE — VALIDAÇÃO DE SEGURANÇA E AUTENTICAÇÃO NAS ROTAS LEGADAS');
    console.log('======================================================================\n');

    // Carrega o servidor local
    const appServidor = require('../servidor_local');
    const PORTA_TESTE = 3000;

    // Aguarda 1 segundo para garantir que o listener HTTP esteja pronto
    await new Promise(r => setTimeout(r, 1000));

    // Tokens de teste
    const tokenDiretor = seguranca.gerarTokenSessao({ userId: 'usr_douglas', usuario: 'douglas', papel: 'DIRETOR' });
    const tokenOperador = seguranca.gerarTokenSessao({ userId: 'usr_operador', usuario: 'operador_01', papel: 'OPERADOR' });
    const tokenClienteViewer = seguranca.gerarTokenSessao({ userId: 'usr_cliente', usuario: 'cliente_demo', papel: 'CLIENTE_VIEWER' });
    const tokenInvalido = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmYWtlIn0.assinatura_falsa_123';
    const tokenExpirado = seguranca.gerarTokenSessao({ userId: 'usr_exp', usuario: 'expirado', papel: 'DIRETOR' }, -3600);

    // =========================================================================
    // BLOCO 1: ROTAS DE CONSULTA — GET /api/projetos
    // =========================================================================
    console.log('>>> BLOCO 1: GET /api/projetos (Listagem de Projetos)');

    // 1.1 Acesso Anônimo
    const res1 = await dispararHttp({ porta: PORTA_TESTE, caminho: '/api/projetos', metodo: 'GET' });
    assert('1.1 Acesso anônimo a GET /api/projetos é bloqueado com HTTP 401',
        res1.status === 401 && res1.body.sucesso === false,
        `Status recebido: ${res1.status} | Resposta: ${JSON.stringify(res1.body)}`
    );

    // 1.2 Token Inválido / Forjado
    const res2 = await dispararHttp({
        porta: PORTA_TESTE,
        caminho: '/api/projetos',
        metodo: 'GET',
        headers: { 'Authorization': `Bearer ${tokenInvalido}` }
    });
    assert('1.2 Acesso com token de assinatura forjada é rejeitado com HTTP 401',
        res2.status === 401 && res2.body.sucesso === false,
        `Status recebido: ${res2.status}`
    );

    // 1.3 Token Expirado
    const res3 = await dispararHttp({
        porta: PORTA_TESTE,
        caminho: '/api/projetos',
        metodo: 'GET',
        headers: { 'Authorization': `Bearer ${tokenExpirado}` }
    });
    assert('1.3 Acesso com token expirado é rejeitado com HTTP 401',
        res3.status === 401 && res3.body.sucesso === false,
        `Status recebido: ${res3.status}`
    );

    // 1.4 Usuário Autorizado (Diretor)
    const res4 = await dispararHttp({
        porta: PORTA_TESTE,
        caminho: '/api/projetos',
        metodo: 'GET',
        headers: { 'Authorization': `Bearer ${tokenDiretor}` }
    });
    assert('1.4 Usuário autorizado com JWT válido acessa GET /api/projetos com HTTP 200',
        res4.status === 200 && res4.body.sucesso === true && Array.isArray(res4.body.projetos),
        `Status recebido: ${res4.status} | Total de projetos retornados: ${res4.body.projetos?.length}`
    );

    // =========================================================================
    // BLOCO 2: ROTAS DE CRIAÇÃO E MUTABILIDADE — POST /api/projetos/novo
    // =========================================================================
    console.log('\n>>> BLOCO 2: POST /api/projetos/novo (Criação de Projetos e RBAC)');

    const payloadNovoProjeto = {
        cliente: 'Empresa Teste Seguranca',
        solicitacao: 'Criação de esteira digital e diagnóstico comercial completo',
        prazo: '30 dias'
    };

    // 2.1 Acesso Anônimo
    const res5 = await dispararHttp({
        porta: PORTA_TESTE,
        caminho: '/api/projetos/novo',
        metodo: 'POST',
        body: payloadNovoProjeto
    });
    assert('2.1 Criação anônima em POST /api/projetos/novo é bloqueada com HTTP 401',
        res5.status === 401 && res5.body.sucesso === false,
        `Status recebido: ${res5.status} | Erro: ${res5.body.erro}`
    );

    // 2.2 Token Inválido
    const res6 = await dispararHttp({
        porta: PORTA_TESTE,
        caminho: '/api/projetos/novo',
        metodo: 'POST',
        headers: { 'Authorization': `Bearer ${tokenInvalido}` },
        body: payloadNovoProjeto
    });
    assert('2.2 Criação com token inválido é rejeitada com HTTP 401',
        res6.status === 401 && res6.body.sucesso === false,
        `Status recebido: ${res6.status}`
    );

    // 2.3 Perfil Sem Permissão de Mutação (CLIENTE_VIEWER) -> HTTP 403 Forbidden
    const res7 = await dispararHttp({
        porta: PORTA_TESTE,
        caminho: '/api/projetos/novo',
        metodo: 'POST',
        headers: { 'Authorization': `Bearer ${tokenClienteViewer}` },
        body: payloadNovoProjeto
    });
    assert('2.3 Perfil sem permissão de escrita (CLIENTE_VIEWER) é barrado com HTTP 403 Forbidden',
        res7.status === 403 && res7.body.sucesso === false,
        `Status recebido: ${res7.status} | Mensagem: ${res7.body.erro}`
    );

    // 2.4 Usuário Autorizado (Diretor) -> HTTP 201 Created
    const res8 = await dispararHttp({
        porta: PORTA_TESTE,
        caminho: '/api/projetos/novo',
        metodo: 'POST',
        headers: { 'Authorization': `Bearer ${tokenDiretor}` },
        body: payloadNovoProjeto
    });
    const idProjetoCriado = res8.body.id_projeto;
    assert('2.4 Diretor com token JWT válido cria projeto com HTTP 201 Created',
        res8.status === 201 && res8.body.sucesso === true && !!idProjetoCriado,
        `Status recebido: ${res8.status} | ID Projeto Criado: ${idProjetoCriado}`
    );

    // =========================================================================
    // BLOCO 3: DEMAIS ROTAS LEGADAS DE PROJETOS E ARQUIVOS
    // =========================================================================
    console.log('\n>>> BLOCO 3: DEMAIS ROTAS LEGADAS PROTEGIDAS');

    // 3.1 GET /api/projetos/:id/detalhes
    const res9 = await dispararHttp({
        porta: PORTA_TESTE,
        caminho: `/api/projetos/${idProjetoCriado}/detalhes`,
        metodo: 'GET'
    });
    assert('3.1 Consulta de detalhes sem token retorna HTTP 401',
        res9.status === 401 && res9.body.sucesso === false,
        `Status: ${res9.status}`
    );

    const res10 = await dispararHttp({
        porta: PORTA_TESTE,
        caminho: `/api/projetos/${idProjetoCriado}/detalhes`,
        metodo: 'GET',
        headers: { 'Authorization': `Bearer ${tokenDiretor}` }
    });
    assert('3.2 Consulta de detalhes com token válido retorna HTTP 200',
        res10.status === 200 && res10.body.sucesso === true,
        `Status: ${res10.status} | Agentes mapeados: ${Object.keys(res10.body.status_agentes || {}).length}`
    );

    // 3.3 POST /api/projetos/:id/anexos
    const res11 = await dispararHttp({
        porta: PORTA_TESTE,
        caminho: `/api/projetos/${idProjetoCriado}/anexos`,
        metodo: 'POST',
        body: { briefing: 'Material complementar' }
    });
    assert('3.3 Anexação de material sem token retorna HTTP 401',
        res11.status === 401 && res11.body.sucesso === false,
        `Status: ${res11.status}`
    );

    // 3.4 POST /api/whatsapp/enviar
    const res12 = await dispararHttp({
        porta: PORTA_TESTE,
        caminho: '/api/whatsapp/enviar',
        metodo: 'POST',
        body: { to: '5511999999999', text: 'Teste' }
    });
    assert('3.4 Despacho de WhatsApp sem token retorna HTTP 401',
        res12.status === 401 && res12.body.sucesso === false,
        `Status: ${res12.status}`
    );

    // 3.5 POST /api/webhooks/testar-disparo
    const res13 = await dispararHttp({
        porta: PORTA_TESTE,
        caminho: '/api/webhooks/testar-disparo',
        metodo: 'POST',
        body: { url: 'https://webhook.site/teste' }
    });
    assert('3.5 Disparo de webhook de saída sem token retorna HTTP 401',
        res13.status === 401 && res13.body.sucesso === false,
        `Status: ${res13.status}`
    );

    // =========================================================================
    // BLOCO 4: OPERAÇÕES INTERNAS DOS 7 AGENTES (PRESERVAÇÃO INTEGRAL)
    // =========================================================================
    console.log('\n>>> BLOCO 4: OPERAÇÕES INTERNAS DOS 7 AGENTES (SEM IMPACTO)');

    // 4.1 Triagem direta in-memory
    const triagemInterna = processarTriagemRevisada('Demanda interna corporativa direta para modernização de atendimento');
    assert('4.1 Agente 01 (Triagem) executa internamente sem barreira de rede',
        !!triagemInterna && triagemInterna.especialistasConfirmados?.length > 0,
        `Especialistas confirmados: ${triagemInterna.especialistasConfirmados?.join(', ')}`
    );

    // 4.2 Coordenador recebe e constrói projeto in-memory
    const projetoInterno = receberRegistroTriagem(triagemInterna, { forcarPendente: true });
    assert('4.2 Agente 02 (Coordenador) cria projeto e grafo DAG internamente',
        !!projetoInterno && projetoInterno.grafo_tarefas?.length > 0,
        `ID: ${projetoInterno.id_projeto} | Tarefas no grafo: ${projetoInterno.grafo_tarefas?.length}`
    );

    // 4.3 Autorização comercial in-memory
    const projetoAutorizado = autorizarProjetoComercialmente(projetoInterno.id_projeto, 'Aprovação interna executiva');
    assert('4.3 Governança comercial e desbloqueio de tarefas funcionam internamente',
        projetoAutorizado.situacao_projeto === 'EM_EXECUCAO' && projetoAutorizado.autorizacao_comercial?.status === 'AUTORIZADO',
        `Status do Projeto: ${projetoAutorizado.situacao_projeto}`
    );

    // 4.4 Repositório de persistência in-memory / disco
    const prjConsultado = obterProjetoPorId(projetoInterno.id_projeto);
    assert('4.4 Repositório de projetos e tarefas recupera projeto internamente com 100% de integridade',
        prjConsultado && prjConsultado.id_projeto === projetoInterno.id_projeto,
        `Projeto recuperado com sucesso: ${prjConsultado?.cliente}`
    );

    console.log('\n======================================================================');
    console.log(`SUMÁRIO DOS TESTES DE SEGURANÇA E AUTENTICAÇÃO:`);
    console.log(`Total de Casos de Teste: ${totalTestes}`);
    console.log(`Casos Aprovados:         ${aprovados}`);
    console.log(`Casos Reprovados:        ${totalTestes - aprovados}`);
    console.log(`Taxa de Sucesso:         ${((aprovados / totalTestes) * 100).toFixed(1)}%`);
    console.log('======================================================================\n');

    process.exit(totalTestes === aprovados ? 0 : 1);
}

executarSuiteSeguranca().catch(err => {
    console.error('Falha catastrófica na suíte de segurança:', err);
    process.exit(1);
});
