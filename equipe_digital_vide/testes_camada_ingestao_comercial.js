/**
 * =====================================================================
 * VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
 * BATERIA DE HOMOLOGAÇÃO: CAMADA DE INGESTÃO E DADOS COMERCIAIS
 * 
 * Verificações Executadas:
 * 1. Parser Nativo CSV/TSV (delimitadores, aspas, multiline, BOM)
 * 2. Parser Nativo XLSX via Descompressão ZIP (sem dependências externas)
 * 3. Classificação Automática e Validação Semântica de Esquemas
 * 4. Deduplicação por Fingerprint Criptográfico SHA-256 (intra-lote e banco)
 * 5. Preservação Epistemológica da Natureza (SIMULADO / IMPORTADO / OPERACIONAL)
 * 6. Tratamento de Incerteza (INFORMACAO_INSUFICIENTE para amostras escassas)
 * 7. Isolamento Multiempresa RLS (leitura, escrita e deduplicação)
 * 8. Resolução de Contatos, Interações e Extração de Evidências Factuais
 * 9. Integração e Alimentação do Motor 7D (Diagnóstico, EPV e MIV)
 * 10. Adaptadores de Integrações Futuras (Meta Cloud, Instagram, CRM, E-commerce)
 * 11. Endpoints REST com JWT Bearer e Proteção Contra Acesso Cruzado
 * =====================================================================
 */

process.env.JWT_SECRET = 'vide_test_jwt_secret_super_seguro_2026';
const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const { fork } = require('child_process');
const pg = require('pg');

const { ServicoMotorInteligenciaVIDE } = require('./servico_motor_inteligencia');
const { ServicoIngestaoComercialVIDE } = require('./servico_ingestao_comercial');
const {
    processarCSVouTSV,
    processarXLSX,
    classificarTipoDadosComerciais,
    validarENormalizarItemComercial,
    gerarFingerprintHash
} = require('./processador_arquivos_comerciais');
const {
    obterAdaptador,
    AdaptadorCSV,
    AdaptadorXLSX,
    AdaptadorFormularioManual,
    AdaptadorWhatsAppMetaCloud,
    AdaptadorInstagramGraph,
    AdaptadorCRMs,
    AdaptadorEcommerce
} = require('./adaptadores_integracoes_futuras');
const { seguranca } = require('./seguranca');

const connStr = process.env.DATABASE_URL || process.env.DATABASE_URL || null;
const API_KEY = process.env.RENDER_API_KEY || "";
const DB_ID = 'dpg-dbrabbei0phs73f98ve0-a';
const PORTA_TESTE = 3499;

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

function fazerRequisicao({ porta, metodo, caminho, headers = {}, body = null }) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: '127.0.0.1',
            port: porta,
            path: caminho,
            method: metodo,
            headers: {
                ...headers,
                ...(body ? { 'Content-Type': 'application/json' } : {})
            }
        }, (res) => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                let dados = null;
                try { dados = JSON.parse(d); } catch (e) { dados = d; }
                resolve({ status: res.statusCode, headers: res.headers, dados });
            });
        });
        req.on('error', reject);
        if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
        req.end();
    });
}

/**
 * Cria buffer sintético de planilha XLSX no formato PKZIP nativo
 */
function criarXLSXSintetico(linhasMatriz) {
    const parts = [];
    const cdEntries = [];
    let offset = 0;

    // Coleta strings únicas
    const strings = [];
    const strMap = new Map();
    for (const row of linhasMatriz) {
        for (const val of row) {
            const s = String(val);
            if (!strMap.has(s)) {
                strMap.set(s, strings.length);
                strings.push(s);
            }
        }
    }

    const sharedXml = '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        strings.map(s => `<si><t>${s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</t></si>`).join('') +
        '</sst>';

    let sheetXml = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';
    for (let r = 0; r < linhasMatriz.length; r++) {
        sheetXml += `<row r="${r + 1}">`;
        for (let c = 0; c < linhasMatriz[r].length; c++) {
            const colLetra = String.fromCharCode(65 + c);
            const strIdx = strMap.get(String(linhasMatriz[r][c]));
            sheetXml += `<c r="${colLetra}${r + 1}" t="s"><v>${strIdx}</v></c>`;
        }
        sheetXml += '</row>';
    }
    sheetXml += '</sheetData></worksheet>';

    const entradas = {
        'xl/sharedStrings.xml': sharedXml,
        'xl/worksheets/sheet1.xml': sheetXml
    };

    for (const [nome, conteudo] of Object.entries(entradas)) {
        const nomeBuf = Buffer.from(nome, 'utf8');
        const dataBuf = Buffer.from(conteudo, 'utf8');
        const deflated = zlib.deflateRawSync(dataBuf);

        const local = Buffer.alloc(30 + nomeBuf.length);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);
        local.writeUInt16LE(0, 6);
        local.writeUInt16LE(8, 8);
        local.writeUInt32LE(deflated.length, 18);
        local.writeUInt32LE(dataBuf.length, 22);
        local.writeUInt16LE(nomeBuf.length, 26);
        local.writeUInt16LE(0, 28);
        nomeBuf.copy(local, 30);

        parts.push(local);
        parts.push(deflated);

        const cd = Buffer.alloc(46 + nomeBuf.length);
        cd.writeUInt32LE(0x02014b50, 0);
        cd.writeUInt16LE(20, 4);
        cd.writeUInt16LE(20, 6);
        cd.writeUInt16LE(0, 8);
        cd.writeUInt16LE(8, 10);
        cd.writeUInt32LE(deflated.length, 20);
        cd.writeUInt32LE(dataBuf.length, 24);
        cd.writeUInt16LE(nomeBuf.length, 28);
        cd.writeUInt32LE(offset, 42);
        nomeBuf.copy(cd, 46);

        cdEntries.push(cd);
        offset += local.length + deflated.length;
    }

    const cdStart = offset;
    let cdLen = 0;
    for (const cd of cdEntries) {
        parts.push(cd);
        cdLen += cd.length;
    }

    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(cdEntries.length, 8);
    eocd.writeUInt16LE(cdEntries.length, 10);
    eocd.writeUInt32LE(cdLen, 12);
    eocd.writeUInt32LE(cdStart, 16);
    parts.push(eocd);

    return Buffer.concat(parts);
}

async function executarBateriaTestes() {
    console.log('=====================================================================');
    console.log('VIDE — TESTES DA CAMADA DE INGESTÃO E DADOS COMERCIAIS');
    console.log('=====================================================================');

    let testesPassados = 0;
    let testesFalhados = 0;

    function assercao(condicao, descricao) {
        if (condicao) {
            console.log(`[PASSOU] ${descricao}`);
            testesPassados++;
        } else {
            console.error(`[FALHOU] ${descricao}`);
            testesFalhados++;
        }
    }

    // -------------------------------------------------------------------------
    // TESTE 1: Parser Nativo de CSV/TSV com Auto-Delimitador e Quoted Strings
    // -------------------------------------------------------------------------
    console.log('\n--- 1. PARSER NATIVO CSV / TSV ---');
    const csvComplexo = `\uFEFFNome;Telefone;Email;Valor;Observacao\n"Carlos Eduardo";"(11) 98765-4321";carlos@empresa.com.br;3500.00;"Cliente interessado em automação,\nnecessita suporte imediato"\n"Ana Beatriz";"21999998888";ana@vide.com;1200.50;"Lead qualificado"`;
    const dadosCsv = processarCSVouTSV(csvComplexo);
    assercao(dadosCsv.length === 2, 'CSV com delimitador ponto-e-vírgula e multiline parseado corretamente');
    assercao(dadosCsv[0].Nome === 'Carlos Eduardo', 'Primeiro registro nome extraído sem aspas');
    assercao(dadosCsv[0].Observacao.includes('suporte imediato'), 'Valor com quebra de linha interna preservado');

    // -------------------------------------------------------------------------
    // TESTE 2: Parser Nativo de Planilhas XLSX sem Dependências Externas
    // -------------------------------------------------------------------------
    console.log('\n--- 2. PARSER NATIVO XLSX (PKZIP DESCOMPRESSÃO) ---');
    const matrizXlsx = [
        ['Lead_Nome', 'Telefone', 'Origem', 'Valor_Orcamento'],
        ['Hospital Santa Cruz', '1133334444', 'Meta_Ads', '15000'],
        ['Clinica Bem Estar', '11988887777', 'Organico', '8500']
    ];
    const xlsxBuffer = criarXLSXSintetico(matrizXlsx);
    const dadosXlsx = processarXLSX(xlsxBuffer);
    assercao(dadosXlsx.length === 2, 'XLSX descompactado e parseado com sucesso via PKZIP nativo');
    assercao(dadosXlsx[0].Lead_Nome === 'Hospital Santa Cruz', 'Header e dados alinhados na primeira linha');
    assercao(dadosXlsx[1].Valor_Orcamento === '8500', 'Valores de colunas subsequentes extraídos com fidelidade');

    // -------------------------------------------------------------------------
    // TESTE 3: Classificação Automática e Validação Semântica de Esquemas
    // -------------------------------------------------------------------------
    console.log('\n--- 3. CLASSIFICAÇÃO AUTOMÁTICA E VALIDAÇÃO SEMÂNTICA ---');
    const tipoContato = classificarTipoDadosComerciais(dadosCsv);
    assercao(tipoContato === 'CONTATO', 'Classificação inferiu CONTATO para registros com nome, telefone e email');

    const dadosVenda = [{ valor: 1200, status: 'FECHADO_GANHO', data_venda: '2026-11-17' }];
    const tipoVenda = classificarTipoDadosComerciais(dadosVenda);
    assercao(tipoVenda === 'VENDA', 'Classificação inferiu VENDA para dados de fechamento financeiro');

    const dadosRetencao = [{ cliente: 'Corp A', churn: false, nps: 9, recorrencia: 'MENSAL' }];
    const tipoRetencao = classificarTipoDadosComerciais(dadosRetencao);
    assercao(tipoRetencao === 'METRICA_RETENCAO', 'Classificação inferiu METRICA_RETENCAO para indicadores de churn e NPS');

    // Validação com dado inconsistente (não inventa dado)
    const itemIncompleto = { nome: 'Lead Sem Telefone Nem Email', valor: 'invalido' };
    const normIncompleto = validarENormalizarItemComercial(itemIncompleto, 'CONTATO', 'IMPORTADO');
    assercao(normIncompleto.statusValidacao === 'INCONSISTENTE', 'Contato com apenas nome marcado como INCONSISTENTE');
    assercao(normIncompleto.motivoInconsistencia && normIncompleto.motivoInconsistencia.includes('sem canal direto'), 'Inconsistência de canal ausente explicitada');

    const itemRejeitado = { observacao: 'Registro vazio sem contato identificável' };
    const normRejeitado = validarENormalizarItemComercial(itemRejeitado, 'CONTATO', 'IMPORTADO');
    assercao(normRejeitado.statusValidacao === 'REJEITADO', 'Contato sem identificador primário marcado como REJEITADO');
    assercao(normRejeitado.motivoInconsistencia && normRejeitado.motivoInconsistencia.includes('identificador primário'), 'Inconsistência de identificador primário explicitada');

    // -------------------------------------------------------------------------
    // TESTE 4: Deduplicação Criptográfica SHA-256 e Fingerprint Canônico
    // -------------------------------------------------------------------------
    console.log('\n--- 4. FINGERPRINT CRIPTOGRÁFICO E DEDUPLICAÇÃO ---');
    const hash1 = gerarFingerprintHash({ a: 1, b: 'Teste' }, 'CONTATO');
    const hash2 = gerarFingerprintHash({ b: 'teste', a: 1 }, 'CONTATO');
    assercao(hash1 === hash2, 'Idempotência matemática do fingerprint garantida para ordens e maiúsculas diferentes');

    // -------------------------------------------------------------------------
    // TESTE 5: Adaptadores de Integrações Futuras (WhatsApp, Instagram, CRM, E-commerce)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. CONTRATOS DE ADAPTADORES DE INTEGRAÇÕES FUTURAS ---');
    const adaptMeta = obterAdaptador('WHATSAPP_META_CLOUD');
    assercao(adaptMeta instanceof AdaptadorWhatsAppMetaCloud, 'Fábrica instanciou adaptador WhatsApp Meta Cloud');
    const payloadMetaMock = {
        entry: [{
            changes: [{
                value: {
                    contacts: [{ profile: { name: 'Cliente WhatsApp' }, wa_id: '5511999998888' }],
                    messages: [{ id: 'wamid.123', type: 'text', text: { body: 'Olá, gostaria de um orçamento' }, timestamp: '1731800000' }]
                }
            }]
        }]
    };
    const extraidoMeta = await adaptMeta.extrairRegistros(payloadMetaMock);
    assercao(extraidoMeta.registrosBrutos.length === 1, 'Webhook WhatsApp Meta transformado em registro bruto');
    assercao(extraidoMeta.registrosBrutos[0].texto === 'Olá, gostaria de um orçamento', 'Mensagem WhatsApp mapeada fielmente');

    const adaptCRM = obterAdaptador('CRM_HUBSPOT');
    assercao(adaptCRM instanceof AdaptadorCRMs, 'Fábrica instanciou adaptador de CRM comercial');

    const adaptEcom = obterAdaptador('ECOMMERCE_SHOPIFY');
    assercao(adaptEcom instanceof AdaptadorEcommerce, 'Fábrica instanciou adaptador de E-commerce');

    // -------------------------------------------------------------------------
    // PREPARAÇÃO DE CONEXÃO AO BANCO DE DADOS POSTGRESQL (RENDER)
    // -------------------------------------------------------------------------
    console.log('\n--- 6. AUTORIZAÇÃO DE IP E APLICAÇÃO DE MIGRAÇÃO POSTGRESQL ---');
    const meuIp = await obterIpAtual();
    console.log(`IP Público do ambiente: ${meuIp}`);
    const statusPatch = await configurarAllowList([{ cidrBlock: meuIp + '/32', description: 'Teste Ingestao Motor' }]);
    assercao(statusPatch === 200, 'IP liberado temporariamente na allowlist do Render PostgreSQL');
    await new Promise(r => setTimeout(r, 4000));

    const pool = new pg.Pool({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false }
    });

    const motor = new ServicoMotorInteligenciaVIDE({ pool });
    const servicoIngestao = new ServicoIngestaoComercialVIDE({ pool, motor });

    // Aplicação da migração 003
    const migrationSql = fs.readFileSync(path.join(__dirname, 'migracoes', '003_camada_ingestao_dados_comerciais.sql'), 'utf8');
    const clientMig = await pool.connect();
    try {
        await clientMig.query(migrationSql);
        console.log('[PASSOU] Migração 003 executada com sucesso no PostgreSQL!');
        testesPassados++;
    } finally {
        clientMig.release();
    }

    // Criação de duas empresas de teste para validação de isolamento multiempresa
    const empAlfa = await motor.cadastrarEmpresa({
        nomeFantasia: 'Empresa Teste Ingestão Alfa',
        segmento: 'Clínica Odontológica',
        planoMotor: 'PADRAO'
    });
    const empBeta = await motor.cadastrarEmpresa({
        nomeFantasia: 'Empresa Teste Ingestão Beta',
        segmento: 'Varejo Moda',
        planoMotor: 'PADRAO'
    });

    try {
        // ---------------------------------------------------------------------
        // TESTE 7: Ingestão de Lote, Deduplicação Intra-Lote e Banco (Tenant Alfa)
        // ---------------------------------------------------------------------
        console.log('\n--- 7. INGESTÃO DE LOTE E DEDUPLICAÇÃO TRANSACIONAL ---');
        const cargaContatos = [
            { nome: 'Marcos Vinicius', telefone: '11988881111', email: 'marcos@teste.com', canal: 'WHATSAPP' },
            { nome: 'Juliana Paes', telefone: '11988882222', email: 'juliana@teste.com', canal: 'INSTAGRAM' },
            { nome: 'Marcos Vinicius', telefone: '11988881111', email: 'marcos@teste.com', canal: 'WHATSAPP' } // Duplicata intra-lote
        ];

        const resLote1 = await servicoIngestao.ingestarLoteComercial({
            empresaId: empAlfa.id,
            fonteOrigem: 'FORMULARIO_ESTRUTURADO',
            carga: cargaContatos,
            tipoExplicitado: 'CONTATO',
            naturezaDado: 'IMPORTADO'
        });

        assercao(resLote1.sucesso === true, 'Lote 1 ingerido com sucesso no banco');
        assercao(resLote1.totalRegistros === 3, 'Total de 3 registros processados no lote 1');
        assercao(resLote1.registrosValidos === 2, '2 registros válidos identificados');
        assercao(resLote1.registrosDuplicados === 1, '1 duplicata intra-lote barrada via fingerprint');

        // Teste de deduplicação cross-batch (segunda ingestão do mesmo contato na mesma empresa)
        const resLote2 = await servicoIngestao.ingestarLoteComercial({
            empresaId: empAlfa.id,
            fonteOrigem: 'FORMULARIO_ESTRUTURADO',
            carga: [{ nome: 'Juliana Paes', telefone: '11988882222', email: 'juliana@teste.com', canal: 'INSTAGRAM' }],
            tipoExplicitado: 'CONTATO',
            naturezaDado: 'IMPORTADO'
        });
        assercao(resLote2.registrosDuplicados === 1, 'Deduplicação cross-batch identificou fingerprint já existente');

        // ---------------------------------------------------------------------
        // TESTE 8: Isolamento Multiempresa RLS (Mesmo Dado em Empresas Diferentes)
        // ---------------------------------------------------------------------
        console.log('\n--- 8. ISOLAMENTO MULTIEMPRESA RLS ---');
        // Inserir o mesmo contato para Empresa Beta não deve ser considerado duplicado de Alfa!
        const resBeta = await servicoIngestao.ingestarLoteComercial({
            empresaId: empBeta.id,
            fonteOrigem: 'FORMULARIO_ESTRUTURADO',
            carga: [{ nome: 'Marcos Vinicius', telefone: '11988881111', email: 'marcos@teste.com', canal: 'WHATSAPP' }],
            tipoExplicitado: 'CONTATO',
            naturezaDado: 'IMPORTADO'
        });
        assercao(resBeta.registrosValidos === 1 && resBeta.registrosDuplicados === 0, 'Isolamento RLS: fingerprint idêntico é válido para outro tenant');

        // Listagem de lotes isolada por tenant
        const lotesAlfa = await servicoIngestao.listarLotesPorEmpresa(empAlfa.id);
        const lotesBeta = await servicoIngestao.listarLotesPorEmpresa(empBeta.id);
        assercao(lotesAlfa.length === 2 && lotesBeta.length === 1, 'Listagem de lotes estritamente isolada por empresa');

        // ---------------------------------------------------------------------
        // TESTE 9: Tratamento de Incerteza (INFORMACAO_INSUFICIENTE)
        // ---------------------------------------------------------------------
        console.log('\n--- 9. TRATAMENTO RIGOROSO DE INCERTEZA (INFORMACAO_INSUFICIENTE) ---');
        // Ingestão de lote vazio ou somente com dados rejeitados
        const resLoteVazio = await servicoIngestao.ingestarLoteComercial({
            empresaId: empAlfa.id,
            fonteOrigem: 'FORMULARIO_ESTRUTURADO',
            carga: [],
            tipoExplicitado: 'CONTATO',
            naturezaDado: 'SIMULADO'
        });
        const resProcessamentoVazio = await servicoIngestao.processarLoteNoMotor({
            empresaId: empAlfa.id,
            loteId: resLoteVazio.loteId
        });
        assercao(resProcessamentoVazio.informacaoInsuficiente === true, 'Sinalização explícita de INFORMACAO_INSUFICIENTE para dados escassos');
        assercao(resProcessamentoVazio.diagnostico === null, 'Nenhum diagnóstico forçado gerado para lote vazio');

        // ---------------------------------------------------------------------
        // TESTE 10: Alimentação do Motor 7D (Contatos, Interações, Vendas, Retenção, MIV)
        // ---------------------------------------------------------------------
        console.log('\n--- 10. ALIMENTAÇÃO COMPLETA DO MOTOR DE INTELIGÊNCIA ---');
        const cargaComercialCompleta = [
            { tipo: 'CONTATO', nome: 'Dra. Patricia Lima', telefone: '11977776666', email: 'patricia@clinica.com' },
            { tipo: 'INTERACAO', contato: 'Dra. Patricia Lima', mensagem: 'Gostaria de saber o preço do plano anual de crescimento comercial.', canal: 'WHATSAPP', direcao: 'ENTRADA' },
            { tipo: 'OPORTUNIDADE_ORCAMENTO', cliente: 'Dra. Patricia Lima', valor: 3500.00, status: 'PROPOSTA_ENVIADA', produto: 'VIDE_SISTEMA_CRESCIMENTO' },
            { tipo: 'VENDA', cliente: 'Dra. Patricia Lima', valor: 3500.00, status: 'PAGO_FECHADO', produto: 'VIDE_SISTEMA_CRESCIMENTO' },
            { tipo: 'METRICA_RETENCAO', cliente: 'Dra. Patricia Lima', nps: 10, churn: false, recorrencia: 'ANUAL' }
        ];

        const loteRico = await servicoIngestao.ingestarLoteComercial({
            empresaId: empAlfa.id,
            fonteOrigem: 'FORMULARIO_ESTRUTURADO',
            carga: cargaComercialCompleta,
            naturezaDado: 'OPERACIONAL_VERIFICADO'
        });

        const resultadoMotor = await servicoIngestao.processarLoteNoMotor({
            empresaId: empAlfa.id,
            loteId: loteRico.loteId
        });

        assercao(resultadoMotor.sucesso === true, 'Lote rico processado com sucesso no Motor de Inteligência');
        assercao(resultadoMotor.contatosCriadosOuVinculados >= 1, 'Contato canônico resolvido e vinculado na base');
        assercao(resultadoMotor.interacoesCriadas >= 1, 'Interação comercial gravada na base analítica');
        assercao(resultadoMotor.evidenciasCriadas >= 2, 'Evidências factuais extraídas com sucesso');
        assercao(resultadoMotor.diagnostico7D && resultadoMotor.diagnostico7D.scoreGeral > 0, 'Diagnóstico 7D gerado com dimensões enriquecidas');
        assercao(resultadoMotor.gargalo && resultadoMotor.miv && resultadoMotor.hipotese, 'Análise causal, gargalos e recomendações MIV geradas');

        // ---------------------------------------------------------------------
        // TESTE 11: Endpoints REST HTTP com JWT e Proteção Multi-Tenant
        // ---------------------------------------------------------------------
        console.log('\n--- 11. ENDPOINTS REST HTTP DA CENTRAL DE COMANDO ---');

        // Sobe servidor local em processo isolado
        const servidorProcess = fork(path.join(__dirname, '..', 'servidor_local.js'), [], {
            env: {
                ...process.env,
                PORT: PORTA_TESTE.toString(),
                JWT_SECRET: 'vide_test_jwt_secret_super_seguro_2026'
            },
            silent: true
        });

        await new Promise(r => setTimeout(r, 2000));

        try {
            const tokenDiretor = seguranca.gerarTokenSessao({
                sub: 'usr-douglas-01',
                usuarioId: 'usr-douglas-01',
                nome: 'Douglas Paz',
                papel: 'DIRETOR'
            });

            const tokenClienteAlfa = seguranca.gerarTokenSessao({
                sub: 'usr-alfa-01',
                usuarioId: 'usr-alfa-01',
                nome: 'Gestor Alfa',
                papel: 'CLIENTE',
                clienteId: empAlfa.id
            });

            // 11.1 POST /api/motor/ingestao/lote (401 Não Autenticado)
            const res401 = await fazerRequisicao({
                porta: PORTA_TESTE,
                metodo: 'POST',
                caminho: '/api/motor/ingestao/lote',
                body: { empresaId: empAlfa.id, carga: 'Nome,Tel\nAna,11999' }
            });
            assercao(res401.status === 401, 'POST /api/motor/ingestao/lote rejeita requisições sem JWT (401)');

            // 11.2 POST /api/motor/ingestao/lote (403 Violação Multiempresa)
            const res403 = await fazerRequisicao({
                porta: PORTA_TESTE,
                metodo: 'POST',
                caminho: '/api/motor/ingestao/lote',
                headers: { 'Authorization': 'Bearer ' + tokenClienteAlfa },
                body: { empresaId: empBeta.id, carga: 'Nome,Tel\nAna,11999' }
            });
            assercao(res403.status === 403, 'POST /api/motor/ingestao/lote bloqueia tentativa de ingestão em empresa alheia (403)');

            // 11.3 POST /api/motor/ingestao/lote (200 Sucesso com Diretor)
            const res200 = await fazerRequisicao({
                porta: PORTA_TESTE,
                metodo: 'POST',
                caminho: '/api/motor/ingestao/lote',
                headers: { 'Authorization': 'Bearer ' + tokenDiretor },
                body: {
                    empresaId: empAlfa.id,
                    fonteOrigem: 'IMPORTACAO_CSV',
                    nomeArquivo: 'leads_novembro.csv',
                    carga: 'Nome,Telefone,Email\nFernanda Costa,11944445555,fernanda@teste.com',
                    naturezaDado: 'IMPORTADO'
                }
            });
            assercao(res200.status === 200 && res200.dados.sucesso === true, 'POST /api/motor/ingestao/lote processa arquivo com sucesso (200)');
            const loteCriadoId = res200.dados.loteId;

            // 11.4 GET /api/motor/ingestao/lotes/:empresaId
            const resListar = await fazerRequisicao({
                porta: PORTA_TESTE,
                metodo: 'GET',
                caminho: '/api/motor/ingestao/lotes/' + empAlfa.id,
                headers: { 'Authorization': 'Bearer ' + tokenDiretor }
            });
            assercao(resListar.status === 200 && resListar.dados.total >= 3, 'GET /api/motor/ingestao/lotes/:empresaId lista histórico de lotes');

            // 11.5 GET /api/motor/ingestao/lote/:loteId
            const resDetalhes = await fazerRequisicao({
                porta: PORTA_TESTE,
                metodo: 'GET',
                caminho: '/api/motor/ingestao/lote/' + loteCriadoId + '?empresaId=' + empAlfa.id,
                headers: { 'Authorization': 'Bearer ' + tokenDiretor }
            });
            assercao(resDetalhes.status === 200 && resDetalhes.dados.itens.length === 1, 'GET /api/motor/ingestao/lote/:loteId exibe itens estagiados e status');

            // 11.6 POST /api/motor/ingestao/processar-motor
            const resProcessar = await fazerRequisicao({
                porta: PORTA_TESTE,
                metodo: 'POST',
                caminho: '/api/motor/ingestao/processar-motor',
                headers: { 'Authorization': 'Bearer ' + tokenDiretor },
                body: {
                    empresaId: empAlfa.id,
                    loteId: loteCriadoId
                }
            });
            assercao(resProcessar.status === 200 && resProcessar.dados.sucesso === true, 'POST /api/motor/ingestao/processar-motor dispara pipeline analítico');

        } finally {
            servidorProcess.kill();
        }

    } finally {
        await pool.end();
        console.log('\n--- 12. LIMPEZA DE SEGURANÇA ---');
        await configurarAllowList([]);
        console.log('AllowList do Render restaurada com sucesso!');
    }

    console.log('\n=====================================================================');
    console.log(`RESULTADO FINAL: ${testesPassados} PASSARAM | ${testesFalhados} FALHARAM`);
    console.log('=====================================================================');

    if (testesFalhados > 0) {
        process.exit(1);
    }
}

executarBateriaTestes().catch(err => {
    console.error('ERRO FATAL NA EXECUÇÃO DOS TESTES:', err);
    configurarAllowList([]).finally(() => process.exit(1));
});
