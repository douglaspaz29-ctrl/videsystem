/**
 * =====================================================================
 * VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
 * PROCESSADOR DE ARQUIVOS E DADOS COMERCIAIS MULTI-FONTE
 * 
 * Capacidades:
 * 1. Parser Nativo de CSV e TSV com auto-detecção de delimitador e aspas
 * 2. Parser Nativo de Planilhas XLSX via descompressão ZIP (zero dependências externas)
 * 3. Parser de Payloads Estruturados JSON e Formulários Manuais
 * 4. Classificador Inteligente de Esquema/Tipo de Dado Comercial
 * 5. Validador, Normalizador e Gerador de Fingerprint Criptográfico (SHA-256)
 * 6. Preservação Epistemológica da Natureza do Dado (SIMULADO / IMPORTADO / OPERACIONAL)
 * =====================================================================
 */

const crypto = require('crypto');
const zlib = require('zlib');

/**
 * Utilitário de descompactação nativa de arquivos ZIP (especificação PKZIP)
 * Permite ler .xlsx diretamente sem nenhuma biblioteca externa.
 * @param {Buffer} buffer 
 * @returns {Object.<string, Buffer>}
 */
function descompactarZipNativo(buffer) {
    const arquivos = {};
    if (!Buffer.isBuffer(buffer) || buffer.length < 22) {
        return arquivos;
    }

    // Localiza o fim do diretório central (EOCD - End of Central Directory Record)
    // Assinatura: 0x06054b50 (PK\x05\x06)
    let eocdOffset = -1;
    const minOffset = Math.max(0, buffer.length - 65557);
    for (let i = buffer.length - 22; i >= minOffset; i--) {
        if (buffer.readUInt32LE(i) === 0x06054b50) {
            eocdOffset = i;
            break;
        }
    }

    if (eocdOffset === -1) {
        // Fallback: Varredura de Local File Headers (0x04034b50)
        let pos = 0;
        while (pos < buffer.length - 30) {
            if (buffer.readUInt32LE(pos) !== 0x04034b50) {
                pos++;
                continue;
            }
            const metodo = buffer.readUInt16LE(pos + 8);
            const compSize = buffer.readUInt32LE(pos + 18);
            const fnLen = buffer.readUInt16LE(pos + 26);
            const extraLen = buffer.readUInt16LE(pos + 28);
            const nome = buffer.toString('utf8', pos + 30, pos + 30 + fnLen);
            const dataOffset = pos + 30 + fnLen + extraLen;

            if (compSize > 0 && dataOffset + compSize <= buffer.length) {
                const dadosComp = buffer.slice(dataOffset, dataOffset + compSize);
                try {
                    if (metodo === 0) {
                        arquivos[nome] = dadosComp;
                    } else if (metodo === 8) {
                        arquivos[nome] = zlib.inflateRawSync(dadosComp);
                    }
                } catch (e) {
                    // Ignora arquivos internos irrelevantes corrompidos
                }
                pos = dataOffset + compSize;
            } else {
                pos += 30;
            }
        }
        return arquivos;
    }

    // Leitura padrão via Central Directory
    const cdOffset = buffer.readUInt32LE(eocdOffset + 16);
    const totalEntradas = buffer.readUInt16LE(eocdOffset + 10);
    let p = cdOffset;

    for (let i = 0; i < totalEntradas && p < buffer.length; i++) {
        if (buffer.readUInt32LE(p) !== 0x02014b50) break;

        const metodo = buffer.readUInt16LE(p + 10);
        const compSize = buffer.readUInt32LE(p + 20);
        const fnLen = buffer.readUInt16LE(p + 28);
        const extraLen = buffer.readUInt16LE(p + 30);
        const commentLen = buffer.readUInt16LE(p + 32);
        const localHeaderOffset = buffer.readUInt32LE(p + 42);
        const nomeArquivo = buffer.toString('utf8', p + 46, p + 46 + fnLen);

        if (localHeaderOffset + 30 <= buffer.length && buffer.readUInt32LE(localHeaderOffset) === 0x04034b50) {
            const localFnLen = buffer.readUInt16LE(localHeaderOffset + 26);
            const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
            const dataStart = localHeaderOffset + 30 + localFnLen + localExtraLen;

            if (dataStart + compSize <= buffer.length) {
                const dadosComp = buffer.slice(dataStart, dataStart + compSize);
                try {
                    if (metodo === 0) {
                        arquivos[nomeArquivo] = dadosComp;
                    } else if (metodo === 8) {
                        arquivos[nomeArquivo] = zlib.inflateRawSync(dadosComp);
                    }
                } catch (e) {
                    // Silencia erro em arquivos de metadados não essenciais
                }
            }
        }

        p += 46 + fnLen + extraLen + commentLen;
    }

    return arquivos;
}

/**
 * Parser de planilhas XLSX baseado na descompressão nativa de arquivos XML OpenPackaging
 * @param {Buffer} buffer 
 * @returns {Array<Object>}
 */
function processarXLSX(buffer) {
    const arquivos = descompactarZipNativo(buffer);
    
    // 1. Extração da Shared Strings Table (xl/sharedStrings.xml)
    const stringsCompartilhadas = [];
    const ssBuffer = arquivos['xl/sharedStrings.xml'] || arquivos['xl/SharedStrings.xml'];
    if (ssBuffer) {
        const ssXml = ssBuffer.toString('utf8');
        const regexSi = /<si\b[^>]*>([\s\S]*?)<\/si>/gi;
        let match;
        while ((match = regexSi.exec(ssXml)) !== null) {
            const siContent = match[1];
            const partesTexto = [];
            const regexT = /<t\b[^>]*>([\s\S]*?)<\/t>/gi;
            let mText;
            while ((mText = regexT.exec(siContent)) !== null) {
                partesTexto.push(mText[1]);
            }
            stringsCompartilhadas.push(partesTexto.join('').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'));
        }
    }

    // 2. Extração da primeira planilha (xl/worksheets/sheet1.xml)
    let sheetBuffer = arquivos['xl/worksheets/sheet1.xml'] || arquivos['xl/worksheets/sheet.xml'];
    if (!sheetBuffer) {
        // Tenta achar qualquer sheet*.xml
        for (const k of Object.keys(arquivos)) {
            if (/xl\/worksheets\/sheet\d+\.xml/i.test(k)) {
                sheetBuffer = arquivos[k];
                break;
            }
        }
    }

    if (!sheetBuffer) {
        throw new Error('Nenhuma planilha legível encontrada no arquivo XLSX.');
    }

    const sheetXml = sheetBuffer.toString('utf8');
    const linhas = [];
    const regexRow = /<row\b[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/gi;
    let matchRow;

    // Converte referência de coluna (ex: 'A', 'B', 'AA') para índice base 0
    function colParaIndice(colStr) {
        let indice = 0;
        for (let i = 0; i < colStr.length; i++) {
            indice = indice * 26 + (colStr.charCodeAt(i) - 64);
        }
        return indice - 1;
    }

    while ((matchRow = regexRow.exec(sheetXml)) !== null) {
        const rowContent = matchRow[2];
        const celulas = [];
        const regexCell = /<c\b([^>]*)>([\s\S]*?)<\/c>/gi;
        let matchCell;

        while ((matchCell = regexCell.exec(rowContent)) !== null) {
            const attrs = matchCell[1];
            const inner = matchCell[2];

            // Pega coordenada ex: r="A1"
            const refMatch = /r="([A-Z]+)(\d+)"/i.exec(attrs);
            const tipoMatch = /t="([^"]+)"/i.exec(attrs);
            const tipo = tipoMatch ? tipoMatch[1] : 'n';

            let valor = '';
            if (tipo === 's') {
                const vMatch = /<v>(\d+)<\/v>/i.exec(inner);
                if (vMatch) {
                    const idx = parseInt(vMatch[1], 10);
                    valor = stringsCompartilhadas[idx] || '';
                }
            } else if (tipo === 'inlineStr') {
                const tMatch = /<t\b[^>]*>([\s\S]*?)<\/t>/i.exec(inner);
                if (tMatch) valor = tMatch[1];
            } else {
                const vMatch = /<v>([\s\S]*?)<\/v>/i.exec(inner);
                if (vMatch) valor = vMatch[1];
            }

            if (refMatch) {
                const colIdx = colParaIndice(refMatch[1]);
                celulas[colIdx] = valor.trim();
            } else {
                celulas.push(valor.trim());
            }
        }
        linhas.push(celulas);
    }

    if (linhas.length === 0) return [];

    // Linha 1 = Cabeçalhos
    const headers = linhas[0].map((h, i) => (h && h.toString().trim()) || `coluna_${i + 1}`);
    const resultado = [];

    for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i];
        if (!linha || linha.every(c => !c || c.toString().trim() === '')) continue;
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            const k = headers[j];
            obj[k] = linha[j] !== undefined ? linha[j] : null;
        }
        resultado.push(obj);
    }

    return resultado;
}

/**
 * Parser de CSV e TSV com suporte a aspas, multiline, BOM e detecção automática de separador
 * @param {string} conteudoTexto 
 * @returns {Array<Object>}
 */
function processarCSVouTSV(conteudoTexto) {
    if (!conteudoTexto || typeof conteudoTexto !== 'string') return [];

    // Remove Byte Order Mark (BOM) se existir
    let texto = conteudoTexto.replace(/^\uFEFF/, '');
    if (texto.trim() === '') return [];

    // Auto-detecta delimitador com base nas 5 primeiras linhas
    const primeirasLinhas = texto.split(/\r?\n/).slice(0, 5).join('\n');
    const contagemVirgula = (primeirasLinhas.match(/,/g) || []).length;
    const contagemPontoEVirgula = (primeirasLinhas.match(/;/g) || []).length;
    const contagemTab = (primeirasLinhas.match(/\t/g) || []).length;
    const contagemPipe = (primeirasLinhas.match(/\|/g) || []).length;

    let delimitador = ',';
    if (contagemPontoEVirgula > contagemVirgula && contagemPontoEVirgula > contagemTab) {
        delimitador = ';';
    } else if (contagemTab > contagemVirgula && contagemTab > contagemPontoEVirgula) {
        delimitador = '\t';
    } else if (contagemPipe > contagemVirgula && contagemPipe > contagemPontoEVirgula) {
        delimitador = '|';
    }

    // Máquina de estados para parsear campos com aspas e quebras de linha
    const registros = [];
    let linhaAtual = [];
    let campoAtual = '';
    let dentroDeAspas = false;

    for (let i = 0; i < texto.length; i++) {
        const char = texto[i];
        const proxChar = texto[i + 1];

        if (dentroDeAspas) {
            if (char === '"') {
                if (proxChar === '"') {
                    // Aspa escapada ("")
                    campoAtual += '"';
                    i++;
                } else {
                    // Fim de campo entre aspas
                    dentroDeAspas = false;
                }
            } else {
                campoAtual += char;
            }
        } else {
            if (char === '"') {
                dentroDeAspas = true;
            } else if (char === delimitador) {
                linhaAtual.push(campoAtual.trim());
                campoAtual = '';
            } else if (char === '\n' || (char === '\r' && proxChar === '\n')) {
                linhaAtual.push(campoAtual.trim());
                campoAtual = '';
                if (linhaAtual.some(c => c !== '')) {
                    registros.push(linhaAtual);
                }
                linhaAtual = [];
                if (char === '\r') i++; // Consome \n
            } else if (char === '\r') {
                linhaAtual.push(campoAtual.trim());
                campoAtual = '';
                if (linhaAtual.some(c => c !== '')) {
                    registros.push(linhaAtual);
                }
                linhaAtual = [];
            } else {
                campoAtual += char;
            }
        }
    }

    if (campoAtual !== '' || linhaAtual.length > 0) {
        linhaAtual.push(campoAtual.trim());
        if (linhaAtual.some(c => c !== '')) {
            registros.push(linhaAtual);
        }
    }

    if (registros.length === 0) return [];

    // Cabeçalhos na primeira linha
    const cabecalhos = registros[0].map((h, idx) => (h && h.trim()) || `coluna_${idx + 1}`);
    const dados = [];

    for (let r = 1; r < registros.length; r++) {
        const linha = registros[r];
        if (linha.every(c => c === '')) continue;
        const item = {};
        for (let c = 0; c < cabecalhos.length; c++) {
            item[cabecalhos[c]] = linha[c] !== undefined ? linha[c] : null;
        }
        dados.push(item);
    }

    return dados;
}

/**
 * Classifica a categoria do conjunto de dados comercial com base nas chaves e amostras
 * @param {Array<Object>} registros 
 * @param {string} [tipoExplicitado] 
 * @returns {string} 'CONTATO' | 'INTERACAO' | 'OPORTUNIDADE_ORCAMENTO' | 'VENDA' | 'PRODUTO_SERVICO' | 'METRICA_RETENCAO' | 'GENERICO_COMERCIAL'
 */
function classificarTipoDadosComerciais(registros, tipoExplicitado = null) {
    if (tipoExplicitado) {
        const t = tipoExplicitado.toUpperCase();
        if (['CONTATO', 'CONTATOS', 'LEAD', 'LEADS', 'CONTATOS_LEADS'].includes(t)) return 'CONTATO';
        if (['INTERACAO', 'INTERACOES', 'CONVERSAS', 'ATENDIMENTO', 'ATENDIMENTOS'].includes(t)) return 'INTERACAO';
        if (['OPORTUNIDADE', 'OPORTUNIDADES', 'ORCAMENTO', 'ORCAMENTOS', 'PROPOSTA', 'PROPOSTAS'].includes(t)) return 'OPORTUNIDADE_ORCAMENTO';
        if (['VENDA', 'VENDAS', 'FECHAMENTO', 'TRANSACOES'].includes(t)) return 'VENDA';
        if (['PRODUTO', 'PRODUTOS', 'SERVICO', 'SERVICOS', 'CATALOGO'].includes(t)) return 'PRODUTO_SERVICO';
        if (['RETENCAO', 'RECOMPRA', 'CHURN', 'NPS', 'LTV'].includes(t)) return 'METRICA_RETENCAO';
        if (['INSTAGRAM', 'INSTAGRAM_INSIGHTS', 'METRICAS_INSTAGRAM', 'REELS', 'STORIES'].includes(t)) return 'METRICAS_INSTAGRAM';
        if (['META_ADS', 'CAMPANHAS_META_ADS', 'ANUNCIOS', 'CAMPANHAS', 'FACEBOOK_ADS'].includes(t)) return 'CAMPANHAS_META_ADS';
        if (['CONVERSAO_WEB', 'WEB_ANALYTICS', 'GA4', 'SITES', 'LANDING_PAGE'].includes(t)) return 'CONVERSAO_WEB';
    }

    if (!Array.isArray(registros) || registros.length === 0) {
        return 'GENERICO_COMERCIAL';
    }

    // Coleta todas as chaves do conjunto em lowercase
    const chavesSet = new Set();
    for (const reg of registros.slice(0, 10)) {
        for (const k of Object.keys(reg)) {
            chavesSet.add(k.toLowerCase().replace(/[^a-z0-9_]/g, ''));
        }
    }
    const chaves = Array.from(chavesSet);

    const temChave = (...termos) => termos.some(termo => chaves.some(k => k.includes(termo)));

    // 1. Métricas de Retenção e Recompra
    if (temChave('churn', 'nps', 'csat', 'retencao', 'recompra', 'tempo_casa', 'renovacao', 'recorrencia')) {
        return 'METRICA_RETENCAO';
    }

    // 2. Interações e Conversas
    if (temChave('mensagem', 'message', 'texto', 'dialogo', 'atendente', 'sessao', 'sentido', 'direcao') &&
        (temChave('canal', 'telefone', 'cliente', 'horario') || chaves.length <= 8)) {
        return 'INTERACAO';
    }

    // 3. Vendas e Fechamento
    if (temChave('venda', 'pagamento', 'faturamento', 'nf', 'nota_fiscal', 'comissao') || 
       (temChave('valor', 'total') && temChave('data_venda', 'fechado', 'comprador', 'pago'))) {
        return 'VENDA';
    }

    // 4. Oportunidades e Orçamentos
    if (temChave('oportunidade', 'orcamento', 'proposta', 'deal', 'estagio', 'fase_funil', 'motivo_perda', 'probabilidade')) {
        return 'OPORTUNIDADE_ORCAMENTO';
    }

    // 5. Catálogo de Produtos e Serviços
    if (temChave('sku', 'codigo_produto', 'categoria', 'estoque', 'preco_custo', 'margem') ||
       (temChave('produto', 'servico') && temChave('preco', 'valor_unitario'))) {
        return 'PRODUTO_SERVICO';
    }

    // 6. Métricas de Instagram Insights
    if (temChave('instagram', 'reels', 'stories', 'carrossel', 'salvamentos', 'visitas_perfil') ||
       (temChave('alcance', 'impressoes') && temChave('curtidas', 'comentarios', 'salvamentos'))) {
        return 'METRICAS_INSTAGRAM';
    }

    // 7. Campanhas de Mídia Paga Meta Ads
    if (temChave('meta_ads', 'facebook_ads', 'cpm', 'cpc', 'ctr', 'adset', 'criativo') ||
       (temChave('investimento', 'spend') && temChave('cliques', 'resultados', 'cpa'))) {
        return 'CAMPANHAS_META_ADS';
    }

    // 8. Conversão de Sites e Interfaces Web
    if (temChave('ga4', 'sessoes', 'bounce_rate', 'taxa_rejeicao', 'landing_page', 'cliques_cta', 'formularios_iniciados', 'formularios_concluidos')) {
        return 'CONVERSAO_WEB';
    }

    // 9. Contatos e Leads
    if (temChave('nome', 'contato', 'lead', 'cliente') && temChave('telefone', 'whatsapp', 'email', 'fone', 'celular')) {
        return 'CONTATO';
    }

    return 'GENERICO_COMERCIAL';
}

/**
 * Normaliza número de telefone para o padrão internacional E.164 (ex: +5511999998888)
 * @param {string|number} tel 
 * @returns {string|null}
 */
function normalizarTelefoneE164(tel) {
    if (!tel) return null;
    const digitos = tel.toString().replace(/\D/g, '');
    if (!digitos) return null;

    if (digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) {
        return `+${digitos}`;
    }
    if (digitos.length === 10 || digitos.length === 11) {
        return `+55${digitos}`;
    }
    if (digitos.length >= 8 && digitos.length <= 15) {
        return `+${digitos}`;
    }
    return null;
}

/**
 * Normaliza e sanitiza endereço de e-mail
 * @param {string} email 
 * @returns {string|null}
 */
function normalizarEmail(email) {
    if (!email || typeof email !== 'string') return null;
    const limpo = email.trim().toLowerCase();
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regexEmail.test(limpo) ? limpo : null;
}

/**
 * Converte strings ou números de data para formato ISO-8601 estrito
 * @param {any} valorData 
 * @returns {string|null}
 */
function normalizarDataISO(valorData) {
    if (!valorData) return null;

    // Se já é Date
    if (valorData instanceof Date && !isNaN(valorData.getTime())) {
        return valorData.toISOString();
    }

    const str = valorData.toString().trim();
    if (!str) return null;

    // Formato brasileiro DD/MM/AAAA ou DD/MM/AAAA HH:MM:SS
    const matchBR = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (matchBR) {
        const dia = matchBR[1].padStart(2, '0');
        const mes = matchBR[2].padStart(2, '0');
        const ano = matchBR[3];
        const hora = (matchBR[4] || '00').padStart(2, '0');
        const min = (matchBR[5] || '00').padStart(2, '0');
        const seg = (matchBR[6] || '00').padStart(2, '0');
        const isoTentativa = `${ano}-${mes}-${dia}T${hora}:${min}:${seg}Z`;
        const d = new Date(isoTentativa);
        if (!isNaN(d.getTime())) return d.toISOString();
    }

    // Número serial do Excel (ex: 45260 = dias desde 1900-01-01)
    if (/^\d{5}(?:\.\d+)?$/.test(str)) {
        const serial = parseFloat(str);
        const dataExcel = new Date((serial - 25569) * 86400 * 1000);
        if (!isNaN(dataExcel.getTime())) return dataExcel.toISOString();
    }

    // Tentativa padrão Date.parse
    const dPadrao = new Date(str);
    if (!isNaN(dPadrao.getTime())) {
        return dPadrao.toISOString();
    }

    return null;
}

/**
 * Gera fingerprint criptográfico SHA-256 único e canônico para deduplicação precisa
 * @param {Object} item 
 * @param {string} tipo 
 * @returns {string}
 */
function gerarFingerprintHash(item, tipo) {
    // Normaliza chaves ordenadas para garantir idempotência matemática
    const chavesOrdenadas = Object.keys(item).sort();
    const partesCanonica = [];

    partesCanonica.push(`TIPO:${tipo}`);
    for (const k of chavesOrdenadas) {
        let val = item[k];
        if (val === null || val === undefined) continue;
        if (typeof val === 'string') val = val.trim().toLowerCase();
        partesCanonica.push(`${k.toLowerCase()}:${val}`);
    }

    const strCanonica = partesCanonica.join('|');
    return crypto.createHash('sha256').update(strCanonica).digest('hex');
}

/**
 * Validador e normalizador individual de registro comercial
 * Preserva estritamente a verdade factual: NUNCA inventa dados faltantes.
 * @param {Object} dadoBruto 
 * @param {string} tipo 
 * @param {string} natureza 
 * @returns {Object}
 */
function validarENormalizarItemComercial(dadoBruto, tipo, natureza = 'IMPORTADO') {
    const normalizado = {};
    const inconsistencias = [];

    // Localizador flexível de campos nos dados brutos
    const encontrarValor = (...candidatos) => {
        for (const c of candidatos) {
            for (const k of Object.keys(dadoBruto)) {
                if (k.toLowerCase().replace(/[^a-z0-9_]/g, '') === c.toLowerCase().replace(/[^a-z0-9_]/g, '')) {
                    if (dadoBruto[k] !== undefined && dadoBruto[k] !== null && dadoBruto[k] !== '') {
                        return dadoBruto[k];
                    }
                }
            }
        }
        return null;
    };

    // Identificador Externo
    const idExterno = encontrarValor('id', 'codigo', 'cod', 'identificador', 'external_id', 'cpf', 'cnpj', 'numero');
    normalizado.identificador_externo = idExterno ? idExterno.toString().trim() : null;

    // Data de Ocorrência
    const rawData = encontrarValor('data', 'data_hora', 'timestamp', 'created_at', 'criado_em', 'data_contato', 'data_venda', 'data_interacao');
    const dataIso = normalizarDataISO(rawData);
    normalizado.data_ocorrencia = dataIso;
    if (rawData && !dataIso) {
        inconsistencias.push(`Data fornecida '${rawData}' não pôde ser convertida para ISO-8601.`);
    }

    // Regras Específicas por Tipo
    if (tipo === 'CONTATO') {
        const nome = encontrarValor('nome', 'name', 'contato', 'cliente', 'razao_social');
        const telefoneRaw = encontrarValor('telefone', 'phone', 'whatsapp', 'celular', 'fone');
        const emailRaw = encontrarValor('email', 'e_mail', 'correio');
        const canal = encontrarValor('canal', 'origem', 'canal_origem', 'fonte') || 'IMPORTACAO_COMERCIAL';

        normalizado.nome = nome ? nome.toString().trim() : null;
        normalizado.telefone = normalizarTelefoneE164(telefoneRaw);
        normalizado.email = normalizarEmail(emailRaw);
        normalizado.canal_origem = canal.toString().trim();
        normalizado.empresa = encontrarValor('empresa', 'organizacao', 'cliente_empresa');

        if (!normalizado.nome && !normalizado.telefone && !normalizado.email) {
            inconsistencias.push('Contato não possui nenhum dado identificador primário (nome, telefone ou email).');
        } else if (normalizado.nome && !normalizado.telefone && !normalizado.email) {
            inconsistencias.push('Contato possui apenas nome, sem canal direto (telefone ou email).');
        }
        if (telefoneRaw && !normalizado.telefone) {
            inconsistencias.push(`Telefone '${telefoneRaw}' com formato inválido para E.164.`);
        }
        if (emailRaw && !normalizado.email) {
            inconsistencias.push(`E-mail '${emailRaw}' com formato inválido.`);
        }
    } else if (tipo === 'INTERACAO') {
        const texto = encontrarValor('mensagem', 'texto', 'conteudo', 'message', 'transcricao', 'dialogo', 'resumo');
        const direcaoRaw = encontrarValor('direcao', 'sentido', 'tipo_direcao', 'direction');
        const canal = encontrarValor('canal', 'canal_atendimento', 'meio') || 'WHATSAPP';
        const contatoRef = encontrarValor('contato', 'telefone', 'cliente', 'nome', 'remetente');

        normalizado.conteudo_texto = texto ? texto.toString().trim() : '';
        normalizado.direcao = (direcaoRaw && ['OUT', 'SAIDA', 'ENVIADA', 'OPERADOR'].includes(direcaoRaw.toString().toUpperCase())) ? 'SAIDA' : 'ENTRADA';
        normalizado.canal = canal.toString().trim().toUpperCase();
        normalizado.contato_referencia = contatoRef ? contatoRef.toString().trim() : null;

        if (!normalizado.conteudo_texto && !texto) {
            inconsistencias.push('Interação sem conteúdo textual ou registro de mensagem.');
        }
    } else if (tipo === 'OPORTUNIDADE_ORCAMENTO' || tipo === 'VENDA') {
        const valorRaw = encontrarValor('valor', 'total', 'preco', 'orcamento', 'ticket', 'receita');
        const statusRaw = encontrarValor('status', 'fase', 'estagio', 'etapa', 'situacao');
        const produto = encontrarValor('produto', 'servico', 'item', 'solucao');
        const motivoPerda = encontrarValor('motivo_perda', 'motivo', 'perda_motivo', 'razao_recusa');

        let valorNumerico = null;
        if (valorRaw !== null) {
            const vStr = valorRaw.toString().replace(/[^\d.,-]/g, '').replace(',', '.');
            const vFloat = parseFloat(vStr);
            if (!isNaN(vFloat)) valorNumerico = vFloat;
            else inconsistencias.push(`Valor monetário '${valorRaw}' inválido.`);
        }

        normalizado.valor = valorNumerico;
        normalizado.status = statusRaw ? statusRaw.toString().trim().toUpperCase() : 'DESCONHECIDO';
        normalizado.produto_servico = produto ? produto.toString().trim() : null;
        normalizado.motivo_perda = motivoPerda ? motivoPerda.toString().trim() : null;
        normalizado.contato_referencia = encontrarValor('cliente', 'contato', 'nome', 'empresa');

        if (valorNumerico === null) {
            inconsistencias.push('Oportunidade/Venda sem valor financeiro identificado.');
        }
    } else if (tipo === 'PRODUTO_SERVICO') {
        const nome = encontrarValor('nome', 'produto', 'servico', 'item', 'descricao');
        const sku = encontrarValor('sku', 'codigo', 'cod');
        const preco = encontrarValor('preco', 'preco_venda', 'valor');

        normalizado.nome = nome ? nome.toString().trim() : null;
        normalizado.sku = sku ? sku.toString().trim() : null;
        normalizado.preco = preco ? parseFloat(preco.toString().replace(/[^\d.,]/g, '').replace(',', '.')) : null;

        if (!normalizado.nome) {
            inconsistencias.push('Produto/Serviço sem nome de identificação.');
        }
    } else if (tipo === 'METRICA_RETENCAO') {
        const nps = encontrarValor('nps', 'score_nps', 'nota_nps');
        const churn = encontrarValor('churn', 'cancelou', 'status_cancelamento');
        const ltv = encontrarValor('ltv', 'tempo_casa', 'recorrencia');

        normalizado.nps = nps !== null ? parseInt(nps.toString(), 10) : null;
        normalizado.churn = churn ? (['SIM', 'TRUE', '1', 'CANCELADO'].includes(churn.toString().toUpperCase())) : false;
        normalizado.ltv = ltv ? parseFloat(ltv.toString().replace(/[^\d.,]/g, '').replace(',', '.')) : null;
        normalizado.cliente_referencia = encontrarValor('cliente', 'empresa', 'contato', 'id_cliente');
    } else if (tipo === 'METRICAS_INSTAGRAM') {
        normalizado.alcance = parseInt(encontrarValor('alcance', 'reach', 'pessoas_alcancadas') || 0, 10);
        normalizado.impressoes = parseInt(encontrarValor('impressoes', 'impressions') || 0, 10);
        normalizado.curtidas = parseInt(encontrarValor('curtidas', 'likes') || 0, 10);
        normalizado.comentarios = parseInt(encontrarValor('comentarios', 'comments') || 0, 10);
        normalizado.compartilhamentos = parseInt(encontrarValor('compartilhamentos', 'shares') || 0, 10);
        normalizado.salvamentos = parseInt(encontrarValor('salvamentos', 'saves') || 0, 10);
        normalizado.visitas_perfil = parseInt(encontrarValor('visitas_perfil', 'profile_visits') || 0, 10);
        normalizado.formato = (encontrarValor('formato', 'tipo_conteudo', 'tipo') || 'FEED_ESTATICO').toString().toUpperCase();
        normalizado.identificador_post = encontrarValor('post_id', 'id_publicacao', 'link', 'titulo');
        if (normalizado.alcance === 0 && normalizado.impressoes === 0) {
            inconsistencias.push('Métrica de Instagram sem registro de alcance ou impressões.');
        }
    } else if (tipo === 'CAMPANHAS_META_ADS') {
        normalizado.nome_campanha = encontrarValor('campanha', 'campaign_name', 'nome') || 'Campanha Sem Nome';
        normalizado.investimento = parseFloat((encontrarValor('investimento', 'spend', 'valor_gasto') || 0).toString().replace(/[^\d.,]/g, '').replace(',', '.'));
        normalizado.alcance = parseInt(encontrarValor('alcance', 'reach') || 0, 10);
        normalizado.impressoes = parseInt(encontrarValor('impressoes', 'impressions') || 0, 10);
        normalizado.cliques = parseInt(encontrarValor('cliques', 'clicks', 'link_clicks') || 0, 10);
        normalizado.resultados = parseInt(encontrarValor('resultados', 'results', 'conversoes') || 0, 10);
        normalizado.cpm = parseFloat((encontrarValor('cpm') || 0).toString().replace(/[^\d.,]/g, '').replace(',', '.'));
        normalizado.cpc = parseFloat((encontrarValor('cpc') || 0).toString().replace(/[^\d.,]/g, '').replace(',', '.'));
        normalizado.ctr = parseFloat((encontrarValor('ctr') || 0).toString().replace(/[^\d.,]/g, '').replace(',', '.'));
        if (normalizado.investimento === 0 && normalizado.impressoes === 0) {
            inconsistencias.push('Registro de campanha sem investimento ou impressões informadas.');
        }
    } else if (tipo === 'CONVERSAO_WEB') {
        normalizado.sessoes = parseInt(encontrarValor('sessoes', 'sessions') || 0, 10);
        normalizado.usuarios = parseInt(encontrarValor('usuarios', 'users') || 0, 10);
        normalizado.cliques_cta = parseInt(encontrarValor('cliques_cta', 'cta_clicks') || 0, 10);
        normalizado.formularios_iniciados = parseInt(encontrarValor('formularios_iniciados', 'form_starts') || 0, 10);
        normalizado.formularios_concluidos = parseInt(encontrarValor('formularios_concluidos', 'form_submits', 'leads') || 0, 10);
        normalizado.pagina = encontrarValor('pagina', 'landing_page', 'url', 'caminho');
        normalizado.canal_origem = encontrarValor('canal', 'origem', 'medium', 'source') || 'DIRETO';
        if (normalizado.sessoes === 0 && normalizado.cliques_cta === 0) {
            inconsistencias.push('Registro de conversão web sem sessões ou cliques identificados.');
        }
    }

    // Determina status de validação
    let statusValidacao = 'VALIDO';
    if (inconsistencias.length > 0) {
        // Se falta identificador primário completo, é REJEITADO
        if (tipo === 'CONTATO' && !normalizado.nome && !normalizado.telefone && !normalizado.email) {
            statusValidacao = 'REJEITADO';
        } else if (tipo === 'INTERACAO' && !normalizado.conteudo_texto) {
            statusValidacao = 'REJEITADO';
        } else {
            statusValidacao = 'INCONSISTENTE';
        }
    }

    const fingerprint = gerarFingerprintHash(dadoBruto, tipo);

    return {
        tipoRegistro: tipo,
        identificadorExterno: normalizado.identificador_externo,
        dadosBrutos: dadoBruto,
        dadosNormalizados: normalizado,
        naturezaDado: natureza,
        statusValidacao,
        motivoInconsistencia: inconsistencias.length > 0 ? inconsistencias.join(' | ') : null,
        fingerprintHash: fingerprint,
        dataOcorrencia: normalizado.data_ocorrencia || null
    };
}

module.exports = {
    descompactarZipNativo,
    processarXLSX,
    processarCSVouTSV,
    classificarTipoDadosComerciais,
    normalizarTelefoneE164,
    normalizarEmail,
    normalizarDataISO,
    gerarFingerprintHash,
    validarENormalizarItemComercial
};
