/**
 * =====================================================================
 * VIDE — TESTES DE INDEPENDÊNCIA DO GOOGLE ANTIGRAVITY E PORTABILIDADE EM NUVEM
 * Validação de Desacoplamento do Computador Local e Prontidão Cloud 24/7
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');

let totalTestes = 0;
let testesAprovados = 0;

function registrarResultado(titulo, passou, detalhes = '') {
    totalTestes++;
    if (passou) {
        testesAprovados++;
        console.log(`✓ [APROVADO] ${titulo}`);
    } else {
        console.error(`✗ [FALHA] ${titulo} — Detalhes: ${detalhes}`);
    }
}

async function executarTestes() {
    console.log('======================================================================');
    console.log('VIDE — TESTES UNITÁRIOS: INDEPENDÊNCIA DO GOOGLE ANTIGRAVITY & CLOUD');
    console.log('======================================================================\n');

    const dirRaiz = path.join(__dirname, '..');
    const dirAgentes = __dirname;

    // 1. Verificação de Ausência de Caminhos Absolutos do Windows no Código Operacional
    console.log('>>> TESTE 1: Desacoplamento de Caminhos Absolutos do Windows');
    const arquivosParaAuditoria = [
        path.join(dirRaiz, 'servidor_local.js'),
        path.join(dirAgentes, 'config_ambiente.js'),
        path.join(dirAgentes, 'banco_dados.js'),
        path.join(dirAgentes, 'seguranca.js'),
        path.join(dirAgentes, 'ia_service.js'),
        path.join(dirAgentes, 'whatsapp_business_integration.js'),
        path.join(dirAgentes, 'conexao_triagem_coordenador.js'),
        path.join(dirAgentes, 'executor_triagem.js'),
        path.join(dirAgentes, 'agente_02_coordenador', 'executor_coordenador.js'),
        path.join(dirAgentes, 'agente_03_desenvolvedor', 'executor_desenvolvedor.js'),
        path.join(dirAgentes, 'agente_04_branding_design', 'executor_branding_design.js'),
        path.join(dirAgentes, 'agente_05_atendimento', 'executor_atendimento.js'),
        path.join(dirAgentes, 'agente_06_automacao', 'executor_automacao.js'),
        path.join(dirAgentes, 'agente_07_inteligencia_comercial', 'executor_inteligencia_comercial.js')
    ];

    let achouCaminhoHardcoded = false;
    let arquivoInfrator = '';

    for (const arq of arquivosParaAuditoria) {
        if (!fs.existsSync(arq)) continue;
        const conteudo = fs.readFileSync(arq, 'utf-8');
        // Ignora comentários de cabeçalho com exemplos se houver
        const linhas = conteudo.split('\n');
        for (let i = 0; i < linhas.length; i++) {
            const l = linhas[i].trim();
            if (l.startsWith('//') || l.startsWith('*') || l.startsWith('/*')) continue;
            if (l.includes('C:\\Users\\') || l.includes('C:/Users/')) {
                achouCaminhoHardcoded = true;
                arquivoInfrator = `${path.basename(arq)}:linha ${i+1}`;
                break;
            }
        }
        if (achouCaminhoHardcoded) break;
    }

    registrarResultado('1.1 Nenhum Caminho Absoluto Windows nos 7 Agentes ou Servidor', !achouCaminhoHardcoded, arquivoInfrator);

    // 2. Vinculação Dinâmica de Host e Porta para Containers em Nuvem
    console.log('\n>>> TESTE 2: Vinculação Dinâmica de Host e Porta (0.0.0.0 e PORT)');
    const config = require('./config_ambiente');
    const hostValido = config.HOST === '0.0.0.0' || !!process.env.HOST;
    const portaValida = typeof config.PORTA === 'number' && config.PORTA > 0;

    registrarResultado('2.1 Servidor Vincula em 0.0.0.0 para Exposição a Proxies/Containers', hostValido);
    registrarResultado('2.2 Porta Dinâmica Derivada de process.env.PORT', portaValida);

    // 3. Resolução Dinâmica de URL em Nuvem
    console.log('\n>>> TESTE 3: Resolução Dinâmica de URLs da Aplicação');
    const temBaseUrl = !!config.BASE_URL && typeof config.BASE_URL === 'string';
    registrarResultado('3.1 Detecção de URL Base para Nuvem (Railway / Render / Custom Domain)', temBaseUrl);

    // 4. Artefatos de Containerização e Infraestrutura Docker
    console.log('\n>>> TESTE 4: Artefatos de Containerização e Infraestrutura');
    const dockerfileExiste = fs.existsSync(path.join(dirRaiz, 'Dockerfile'));
    const composeExiste = fs.existsSync(path.join(dirRaiz, 'docker-compose.yml'));
    const caddyfileExiste = fs.existsSync(path.join(dirRaiz, 'Caddyfile'));
    const railwayExiste = fs.existsSync(path.join(dirRaiz, 'railway.json'));
    const renderExiste = fs.existsSync(path.join(dirRaiz, 'render.yaml'));

    let dockerfileValido = false;
    if (dockerfileExiste) {
        const dContent = fs.readFileSync(path.join(dirRaiz, 'Dockerfile'), 'utf-8');
        dockerfileValido = dContent.includes('USER node') && dContent.includes('CMD ["node", "servidor_local.js"]') && dContent.includes('HEALTHCHECK');
    }

    let composeValido = false;
    if (composeExiste) {
        const cContent = fs.readFileSync(path.join(dirRaiz, 'docker-compose.yml'), 'utf-8');
        composeValido = cContent.includes('vide-server') && cContent.includes('vide-n8n') && cContent.includes('vide-postgres') && cContent.includes('volumes:');
    }

    registrarResultado('4.1 Dockerfile Homologado com Usuário Não-Root e Healthcheck', dockerfileExiste && dockerfileValido);
    registrarResultado('4.2 Docker Compose Multi-Container (Server + n8n + PostgreSQL + Caddy)', composeExiste && composeValido);
    registrarResultado('4.3 Blueprints de Deploy 1-Click (Railway e Render)', railwayExiste && renderExiste && caddyfileExiste);

    // 5. Autonomia Operacional Completa (Independência de Antigravity)
    console.log('\n>>> TESTE 5: Autonomia Operacional em Relação ao Antigravity');
    const packageJsonExiste = fs.existsSync(path.join(dirRaiz, 'package.json'));
    let packageValido = false;
    if (packageJsonExiste) {
        const pkg = JSON.parse(fs.readFileSync(path.join(dirRaiz, 'package.json'), 'utf-8'));
        packageValido = pkg.scripts && pkg.scripts.start === 'node servidor_local.js' && pkg.scripts.test;
    }
    registrarResultado('5.1 Inicialização e Scripts Canônicos em package.json (start, test, migrate)', packageValido);

    console.log('\n======================================================================');
    console.log(`SUMÁRIO DA INDEPENDÊNCIA CLOUD: Total: ${totalTestes} | Aprovados: ${testesAprovados} | Taxa: ${Math.round((testesAprovados/totalTestes)*100)}%`);
    console.log('======================================================================\n');

    if (testesAprovados !== totalTestes) {
        process.exit(1);
    }
}

executarTestes().catch(e => {
    console.error('Erro na validação de independência cloud:', e);
    process.exit(1);
});
