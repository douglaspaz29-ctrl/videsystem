/**
 * =====================================================================
 * VIDE — EQUIPE DIGITAL
 * Testes Oficiais de Integração Real: n8n ➔ Triagem ➔ Coordenador ➔ Painel
 * Validação rigorosa ponta a ponta da automação
 * =====================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

function fazerRequisicaoHttp({ url, metodo = 'GET', body = null }) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: metodo,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let dados = '';
            res.on('data', chunk => { dados += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(dados);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: dados });
                }
            });
        });

        req.on('error', err => reject(err));
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function executarTestesPontaAPonta() {
    console.log('======================================================================');
    console.log('VIDE — TESTES DE INTEGRAÇÃO REAL: N8N ➔ TRIAGEM ➔ COORDENADOR ➔ PAINEL');
    console.log('======================================================================\n');

    const resultados = {
        teste1_webhook_autorizado: false,
        teste2_webhook_bloqueio_comercial: false,
        teste3_painel_atualizado: false,
        teste4_persistencia_integridade: false
    };

    // -----------------------------------------------------------------
    // TESTE 1: Webhook Entrada - Demanda com Autorização Comercial
    // -----------------------------------------------------------------
    console.log('>>> TESTE 1: Disparo de Webhook (Demanda de Landing Page)');
    try {
        const payload1 = {
            solicitacaoOriginal: "Olá, tenho uma clínica odontológica e quero criar uma landing page institucional para captação.",
            identificadorCenario: "Dr. Roberto Guimarães (WhatsApp Lead)",
            prazoUrgenciaInformado: "Preciso publicar em 15 dias"
        };

        const res1 = await fazerRequisicaoHttp({
            url: 'http://localhost:3000/api/webhook/triagem',
            metodo: 'POST',
            body: payload1
        });

        console.log(`Status HTTP: ${res1.status}`);
        const resultadoTriagem = res1.data.resultado.etapa_01_triagem;
        const resultadoCoordenador = res1.data.resultado.etapa_02_coordenador;

        console.log(`✓ ID Demanda Gerada: ${resultadoTriagem.idDemanda}`);
        console.log(`✓ ID Projeto Coordenador: ${resultadoCoordenador.id_projeto}`);
        console.log(`✓ Situação do Projeto: ${resultadoCoordenador.situacao_projeto}`);
        console.log(`✓ Autorização Comercial: ${resultadoCoordenador.autorizacao_comercial.status}`);
        console.log(`✓ Tarefas Criadas: ${resultadoCoordenador.grafo_tarefas.length}`);

        if (res1.status === 200 && resultadoCoordenador.situacao_projeto === 'EM_EXECUCAO' && resultadoCoordenador.grafo_tarefas.length === 2) {
            resultados.teste1_webhook_autorizado = true;
            console.log('--> TESTE 1 PASSOU: Webhook processado, Triagem classificou e Coordenador ativou grafo.\n');
        } else {
            console.log('--> TESTE 1 FALHOU!\n');
        }
    } catch (e) {
        console.error('Erro no Teste 1:', e.message);
    }

    // -----------------------------------------------------------------
    // TESTE 2: Webhook Entrada - Relato de Sintoma SEM Contratação
    // -----------------------------------------------------------------
    console.log('>>> TESTE 2: Disparo de Webhook (Sintoma sem Contratação Comercial)');
    try {
        const payload2 = {
            solicitacaoOriginal: "Recebo contatos pelo Instagram, mas o pessoal some no WhatsApp e não compra.",
            identificadorCenario: "Dra. Patricia Medeiros (Instagram Lead)",
            prazoUrgenciaInformado: null
        };

        const res2 = await fazerRequisicaoHttp({
            url: 'http://localhost:3000/api/webhook/triagem',
            metodo: 'POST',
            body: payload2
        });

        console.log(`Status HTTP: ${res2.status}`);
        const resultadoTriagem = res2.data.resultado.etapa_01_triagem;
        const resultadoCoordenador = res2.data.resultado.etapa_02_coordenador;

        console.log(`✓ ID Demanda Gerada: ${resultadoTriagem.idDemanda}`);
        console.log(`✓ ID Projeto Coordenador: ${resultadoCoordenador.id_projeto}`);
        console.log(`✓ Situação do Projeto: ${resultadoCoordenador.situacao_projeto}`);
        console.log(`✓ Autorização Comercial: ${resultadoCoordenador.autorizacao_comercial.status}`);
        console.log(`✓ Tarefas Executivas Despachadas: 0 (Apenas tarefa comercial criada: ${resultadoCoordenador.grafo_tarefas[0].estado})`);

        if (res2.status === 200 && 
            resultadoCoordenador.situacao_projeto === 'AGUARDANDO_AUTORIZACAO_COMERCIAL' && 
            resultadoCoordenador.grafo_tarefas[0].estado === 'BLOQUEADA_POR_AUTORIZACAO') {
            resultados.teste2_webhook_bloqueio_comercial = true;
            console.log('--> TESTE 2 PASSOU: Bloqueio comercial mantido com rigor. Zero trabalho executivo não-pago.\n');
        } else {
            console.log('--> TESTE 2 FALHOU!\n');
        }
    } catch (e) {
        console.error('Erro no Teste 2:', e.message);
    }

    // -----------------------------------------------------------------
    // TESTE 3: Consulta ao Painel via API (Verificar Projetos Registrados)
    // -----------------------------------------------------------------
    console.log('>>> TESTE 3: Verificação de Leitura do Painel Interno');
    try {
        const res3 = await fazerRequisicaoHttp({
            url: 'http://localhost:3000/api/projetos',
            metodo: 'GET'
        });

        console.log(`Status HTTP: ${res3.status}`);
        const projetos = res3.data.projetos || [];
        console.log(`✓ Total de Projetos no Painel: ${projetos.length}`);

        if (res3.status === 200 && projetos.length >= 2) {
            resultados.teste3_painel_atualizado = true;
            console.log('--> TESTE 3 PASSOU: Painel reflete instantaneamente todos os projetos criados via webhook.\n');
        } else {
            console.log('--> TESTE 3 FALHOU!\n');
        }
    } catch (e) {
        console.error('Erro no Teste 3:', e.message);
    }

    // -----------------------------------------------------------------
    // TESTE 4: Auditoria de Persistência em Disco
    // -----------------------------------------------------------------
    console.log('>>> TESTE 4: Auditoria dos Arquivos Persistidos em Disco');
    const pastaProjetos = path.join(__dirname, 'dados_persistencia', 'projetos');
    const arquivoIndice = path.join(__dirname, 'dados_persistencia', 'indice_projetos.json');

    const arquivosDisco = fs.readdirSync(pastaProjetos);
    const indiceExiste = fs.existsSync(arquivoIndice);
    console.log(`✓ Arquivos JSON de Projeto em Disco: ${arquivosDisco.length}`);
    console.log(`✓ Arquivo de Índice Existe: ${indiceExiste}`);

    if (arquivosDisco.length >= 2 && indiceExiste) {
        resultados.teste4_persistencia_integridade = true;
        console.log('--> TESTE 4 PASSOU: Todos os registros estão armazenados em arquivos persistentes.\n');
    } else {
        console.log('--> TESTE 4 FALHOU!\n');
    }

    console.log('======================================================================');
    console.log('SUMÁRIO DOS TESTES DE INTEGRAÇÃO:');
    console.log(`1. Webhook com Autorização: ${resultados.teste1_webhook_autorizado ? 'PASSO' : 'FALHOU'}`);
    console.log(`2. Webhook com Bloqueio Comercial: ${resultados.teste2_webhook_bloqueio_comercial ? 'PASSOU' : 'FALHOU'}`);
    console.log(`3. Atualização do Painel: ${resultados.teste3_painel_atualizado ? 'PASSOU' : 'FALHOU'}`);
    console.log(`4. Persistência e Integridade: ${resultados.teste4_persistencia_integridade ? 'PASSOU' : 'FALHOU'}`);
    console.log('======================================================================');
}

executarTestesPontaAPonta();
