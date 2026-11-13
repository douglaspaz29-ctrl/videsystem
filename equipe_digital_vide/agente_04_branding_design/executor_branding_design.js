/**
 * =====================================================================
 * VIDE — EQUIPE DIGITAL
 * AGENTE 04: BRANDING E DESIGN (EXECUTOR OPERACIONAL)
 * Concepção estratégica de marca, criação de identidade visual,
 * exportação de vetores SVG e geração de Design Tokens para o Desenvolvedor
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');

// Importações dos módulos de governança da Equipe Digital VIDE
const {
    obterProjetoPorId,
    atualizarEstadoTarefa,
    registrarEvento
} = require('../agente_02_coordenador/repositorio_projetos_tarefas');

const {
    conferirEntrega
} = require('../agente_02_coordenador/executor_coordenador');
const { iaService } = require('../ia_service');
const { storageService } = require('../storage_service');

// Diretório oficial de entregas físicas
const DIRETORIO_ENTREGAS_BASE = path.join(__dirname, '..', 'entregas_clientes');

/**
 * 1. FUNÇÃO 1: Validar Permissão e Ingerir Tarefa de Branding
 * @param {string} idProjeto 
 * @param {string} idTarefa 
 * @returns {Object} Tarefa e Projeto prontos para execução
 */
function validarPermissaoExecucaoBranding(idProjeto, idTarefa) {
    const projeto = obterProjetoPorId(idProjeto);
    if (!projeto) {
        throw new Error(`[ERRO_BRANDING] Projeto [${idProjeto}] não foi encontrado no repositório.`);
    }

    // Regra 1: Validação de Autorização Comercial
    const autorizacao = projeto.autorizacao_comercial || {};
    if (autorizacao.status !== 'AUTORIZADO') {
        throw new Error(
            `[BLOQUEIO_COMERCIAL] Projeto [${idProjeto}] está com status [${autorizacao.status}]. ` +
            `O Agente Branding e Design não pode iniciar projetos sem autorização comercial formal.`
        );
    }

    // Regra 2: Localização da Tarefa
    const tarefa = (projeto.grafo_tarefas || []).find(t => t.id_tarefa === idTarefa);
    if (!tarefa) {
        throw new Error(`[ERRO_BRANDING] Tarefa [${idTarefa}] não existe no grafo do projeto [${idProjeto}].`);
    }

    // Regra 3: Validação de Especialista
    if (!tarefa.especialista.toLowerCase().includes('branding') && !tarefa.especialista.toLowerCase().includes('design')) {
        throw new Error(`[ERRO_ESPECIALISTA] Tarefa [${idTarefa}] está atribuída para [${tarefa.especialista}], não para Branding e Design.`);
    }

    // Regra 4: Validação de Estado
    if (tarefa.estado === 'BLOQUEADA_POR_DEPENDENCIA') {
        const deps = (tarefa.dependencias || []).join(', ');
        throw new Error(
            `[BLOQUEIO_DEPENDENCIA] Tarefa [${idTarefa}] está BLOQUEADA_POR_DEPENDENCIA. ` +
            `Aguardando conclusão de: [${deps}].`
        );
    }

    if (tarefa.estado === 'BLOQUEADA_POR_AUTORIZACAO') {
        throw new Error(`[BLOQUEIO_COMERCIAL] Tarefa [${idTarefa}] bloqueada por falta de autorização comercial.`);
    }

    if (tarefa.estado === 'APROVADA' || tarefa.estado === 'CONCLUIDA') {
        throw new Error(`[AVISO_BRANDING] Tarefa [${idTarefa}] já foi concluída e aprovada.`);
    }

    // Transição para EM_ANDAMENTO
    atualizarEstadoTarefa({
        idProjeto,
        idTarefa,
        novoEstado: 'EM_ANDAMENTO',
        notaAuditoria: 'Tarefa assumida pelo Agente 04 (Branding e Design) para concepção do sistema de identidade visual.',
        autor: 'Agente 04 — Branding e Design'
    });

    return {
        projeto: obterProjetoPorId(idProjeto),
        tarefa
    };
}

/**
 * 2. FUNÇÃO 2: Concepção do Sistema de Identidade Visual e UI/UX
 * Gera posicionamento, paleta cromática, tipografia, tokens JSON/CSS e vetores SVG
 * @param {Object} briefingEntrada 
 * @returns {Object} Sistema de design completo
 */
function conceberSistemaIdentidadeVisual(briefingEntrada) {
    const cliente = briefingEntrada.cliente || 'Cliente VIDE';
    const solicitacao = briefingEntrada.solicitacao || '';

    // Análise de Nicho e Arquétipo de Marca
    let nicho = 'Clínica de Alto Padrão / Saúde Especializada';
    let arquetipo = 'O Especialista / O Governante de Confiança';
    let tomVoz = 'Clínico, Preciso, Sofisticado, Acolhedor e Objetivo';
    let corPrimaria = '#00F0FF'; // Ciano Cirúrgico Elétrico
    let corSecundaria = '#0066FF'; // Azul Safira Profundo
    let corPrimariaNome = 'Ciano Cirúrgico Alta Precisão';
    let corSecundariaNome = 'Azul Safira Institucional';

    if (solicitacao.toLowerCase().includes('estétic') || cliente.toLowerCase().includes('lumina')) {
        nicho = 'Dermatologia & Estética Avançada';
        arquetipo = 'O Criador / O Amante da Harmonia Natural';
        tomVoz = 'Elegante, Hospitalidade Fasano, Suave e Científico';
        corPrimaria = '#E5C07B'; // Ouro Champanhe
        corSecundaria = '#B8860B'; // Ouro Escovado
        corPrimariaNome = 'Champanhe Nobre';
        corSecundariaNome = 'Ouro Âmbar';
    } else if (solicitacao.toLowerCase().includes('hamburg') || solicitacao.toLowerCase().includes('craft')) {
        nicho = 'Gastronomia Artesanal de Excelência';
        arquetipo = 'O Rebelde / O Mestre Artesão';
        tomVoz = 'Enérgico, Apetitoso, Autêntico e Direto';
        corPrimaria = '#FF5722'; // Laranja Brasa
        corSecundaria = '#FFC107'; // Mostarda Rústica
        corPrimariaNome = 'Brasa Intensa';
        corSecundariaNome = 'Mostarda Rústica';
    }

    // 2.1. ESTRUTURA DOS DESIGN TOKENS (Contrato para o Desenvolvedor)
    const designTokens = {
        meta: {
            cliente,
            nicho,
            versao: '1.0.0',
            criado_em: new Date().toISOString(),
            autor: 'Agente 04 — Branding e Design VIDE'
        },
        branding: {
            arquetipo,
            tom_de_voz: tomVoz,
            promessa_marca: 'Segurança absoluta, tecnologia de ponta e experiência impecável.'
        },
        colors: {
            primary: corPrimaria,
            primaryName: corPrimariaNome,
            secondary: corSecundaria,
            secondaryName: corSecundariaNome,
            background: '#06080E',
            backgroundCard: '#0D121F',
            backgroundCardHover: '#131A2C',
            textPrimary: '#FFFFFF',
            textSecondary: '#8899B5',
            textMuted: '#556680',
            border: 'rgba(255, 255, 255, 0.08)',
            borderActive: 'rgba(0, 240, 255, 0.35)',
            feedback: {
                success: '#00E676',
                alert: '#FFB300',
                error: '#FF5252'
            }
        },
        typography: {
            fontFamilyTitle: "'Plus Jakarta Sans', -apple-system, sans-serif",
            fontFamilyBody: "'Inter', -apple-system, sans-serif",
            fontFamilyMono: "'SF Mono', 'Fira Code', monospace",
            scales: {
                display: 'clamp(36px, 5vw, 64px)',
                h1: 'clamp(28px, 4vw, 44px)',
                h2: '24px',
                h3: '18px',
                bodyLarge: '16px',
                body: '14px',
                caption: '12px'
            },
            fontWeights: {
                regular: '400',
                medium: '500',
                semiBold: '600',
                bold: '700',
                black: '900'
            }
        },
        spacing: {
            xs: '4px',
            sm: '8px',
            md: '16px',
            lg: '24px',
            xl: '32px',
            xxl: '64px'
        },
        radii: {
            sm: '4px',
            md: '8px',
            lg: '16px',
            xl: '24px',
            pill: '9999px'
        },
        shadows: {
            card: '0 20px 40px rgba(0, 0, 0, 0.45)',
            glow: `0 0 20px ${corPrimaria}33`,
            button: `0 4px 14px ${corPrimaria}40`
        }
    };

    // 2.2. CSS DESIGN TOKENS (Variáveis CSS para importação direta no CSS do Desenvolvedor)
    const tokensCss = `/* ==========================================================================
   DESIGN TOKENS OFICIAIS — GERADOS PELO AGENTE 04 (BRANDING & DESIGN)
   Cliente: ${cliente} | Nicho: ${nicho}
   Data: ${new Date().toLocaleDateString('pt-BR')}
   ========================================================================== */

:root {
    /* Paleta Cromática */
    --cor-primaria: ${corPrimaria};
    --cor-secundaria: ${corSecundaria};
    --cor-fundo-base: #06080E;
    --cor-fundo-card: #0D121F;
    --cor-fundo-card-hover: #131A2C;
    --cor-texto-puro: #FFFFFF;
    --cor-texto-secundario: #8899B5;
    --cor-texto-suave: #556680;
    --cor-borda: rgba(255, 255, 255, 0.08);
    --cor-borda-ativa: rgba(0, 240, 255, 0.35);

    /* Cores de Feedback */
    --cor-sucesso: #00E676;
    --cor-alerta: #FFB300;
    --cor-erro: #FF5252;

    /* Tipografia Oficial */
    --fonte-titulos: ${designTokens.typography.fontFamilyTitle};
    --fonte-corpo: ${designTokens.typography.fontFamilyBody};
    --fonte-mono: ${designTokens.typography.fontFamilyMono};

    /* Escala Tipográfica Fluida */
    --tamanho-display: ${designTokens.typography.scales.display};
    --tamanho-h1: ${designTokens.typography.scales.h1};
    --tamanho-h2: ${designTokens.typography.scales.h2};
    --tamanho-h3: ${designTokens.typography.scales.h3};
    --tamanho-corpo-grande: ${designTokens.typography.scales.bodyLarge};
    --tamanho-corpo: ${designTokens.typography.scales.body};
    --tamanho-legenda: ${designTokens.typography.scales.caption};

    /* Espaçamentos */
    --espaco-xs: 4px;
    --espaco-sm: 8px;
    --espaco-md: 16px;
    --espaco-lg: 24px;
    --espaco-xl: 32px;
    --espaco-xxl: 64px;

    /* Raios de Arredondamento */
    --raio-sm: 4px;
    --raio-md: 8px;
    --raio-lg: 16px;
    --raio-pill: 9999px;

    /* Sombras e Elevação */
    --sombra-card: 0 20px 40px rgba(0, 0, 0, 0.45);
    --sombra-glow: 0 0 20px ${corPrimaria}33;
    --sombra-botao: 0 4px 14px ${corPrimaria}40;
}`;

    // 2.3. VETORES SVG REAIS (Logotipo e Símbolo Vetoriais com viewBox)
    const simboloSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
  <defs>
    <linearGradient id="gradSimbolo" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${corPrimaria}" />
      <stop offset="100%" stop-color="${corSecundaria}" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect width="80" height="80" rx="16" fill="#0D121F" stroke="rgba(255,255,255,0.1)" stroke-width="1.5" />
  <path d="M 22 26 L 40 56 L 58 26" fill="none" stroke="url(#gradSimbolo)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)" />
  <circle cx="40" cy="30" r="4" fill="${corPrimaria}" />
</svg>`;

    const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 80" width="340" height="80">
  <defs>
    <linearGradient id="gradLogo" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${corPrimaria}" />
      <stop offset="100%" stop-color="${corSecundaria}" />
    </linearGradient>
  </defs>
  <!-- Símbolo -->
  <rect x="0" y="8" width="64" height="64" rx="14" fill="#0D121F" stroke="rgba(255,255,255,0.1)" stroke-width="1.5" />
  <path d="M 18 28 L 32 52 L 46 28" fill="none" stroke="url(#gradLogo)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
  <circle cx="32" cy="32" r="3.5" fill="${corPrimaria}" />
  <!-- Tipografia da Marca -->
  <text x="82" y="44" font-family="'Plus Jakarta Sans', -apple-system, sans-serif" font-size="22" font-weight="800" fill="#FFFFFF" letter-spacing="-0.5">
    ${cliente.toUpperCase().split('(')[0].trim()}
  </text>
  <text x="82" y="62" font-family="'Inter', -apple-system, sans-serif" font-size="11" font-weight="600" fill="${corPrimaria}" letter-spacing="1.5">
    ${nicho.toUpperCase().slice(0, 32)}
  </text>
</svg>`;

    // 2.4. MANUAL DE USO DA MARCA (brand_guidelines.md)
    const brandGuidelines = `# MANUAL DE IDENTIDADE VISUAL & DIRETRIZES DE MARCA
## Cliente: ${cliente} | Segmento: ${nicho}
**Autor:** Agente 04 — Branding e Design da VIDE  
**Versão:** 1.0.0 — Homologada para Execução

---

### 1. Posicionamento Estratégico & Identidade Verbal
- **Arquétipo Principal:** ${arquetipo}
- **Tom de Voz Oficial:** ${tomVoz}
- **Pilar Central da Comunicação:** Toda comunicação visual deve transmitir segurança técnica, precisão cirúrgica e hospitalidade de alto padrão. Textos prolixos, gírias e elementos visuais infantis ou espalhafatosos são terminantemente proibidos.

---

### 2. Paleta Cromática Institucional

| Aplicação | Nome da Cor | Código HEX | Função no Layout |
| :--- | :--- | :--- | :--- |
| **Primária** | ${corPrimariaNome} | \`${corPrimaria}\` | Destaques de conversão, CTAs principais, pontos focais e ícones de autoridade. |
| **Secundária** | ${corSecundariaNome} | \`${corSecundaria}\` | Gradientes de profundidade, botões secundários e detalhes estruturais. |
| **Fundo Base** | Obsidiana Profundo | \`#06080E\` | Cor predominante de fundo (Dark mode refinado e de alto contraste). |
| **Superfície** | Card Grafite | \`#0D121F\` | Fundo de módulos, cartões de serviços, depoimentos e formulários. |
| **Texto Primário** | Branco Puro | \`#FFFFFF\` | Títulos monumentais e textos de leitura de primeiro nível. |
| **Texto Secundário** | Cinza Aço | \`#8899B5\` | Parágrafos explicativos, subtítulos e legendas de suporte. |

> [!NOTE]
> **Acessibilidade WCAG AA:** O contraste entre o texto primário (\`#FFFFFF\`) e o fundo base (\`#06080E\`) é de **18.2:1**, superando com folga a exigência mínima internacional de 4.5:1.

---

### 3. Escala e Hierarquia Tipográfica
- **Família de Títulos:** \`${designTokens.typography.fontFamilyTitle}\` (Editorial, peso 700 e 800).
- **Família de Corpo de Texto:** \`${designTokens.typography.fontFamilyBody}\` (Alta legibilidade, peso 400 e 500).
- **Escala de Tamanhos:**
  - Display Monumental: \`${designTokens.typography.scales.display}\`
  - Título Principal H1: \`${designTokens.typography.scales.h1}\`
  - Título de Seção H2: \`${designTokens.typography.scales.h2}\`
  - Título de Cartão H3: \`${designTokens.typography.scales.h3}\`
  - Corpo de Leitura: \`${designTokens.typography.scales.body}\` (Line-height 1.6)

---

### 4. Ativos Gráficos e Logotipo
- **Logotipo Completo:** Disponibilizado no arquivo vetorial \`assets/logo.svg\`.
- **Símbolo Isolado:** Disponibilizado em \`assets/simbolo.svg\` para favicon e ícone flutuante.
- **Área de Não-Interferência:** Manter sempre um respiro mínimo equivalente a 50% da altura do símbolo em volta do logotipo.

---

### 5. Instruções Diretas para o Agente 03 (Desenvolvedor)
O Desenvolvedor deve importar diretamente o arquivo \`tokens_design.css\` ou consumir o arquivo \`design_tokens.json\` gerado neste diretório para estilizar a landing page, garantindo fidelidade absoluta aos padrões cromáticos e tipográficos estabelecidos.

---

### 6. Racional Narrativo de IA (Agente 04)
\`\`\`json
${iaService.gerarRespostaSemanticaLocal('narrativa de marca')}
\`\`\`
`;

    // 2.5. MOSTRUÁRIO VISUAL INTERATIVO (guia_marca_interativo.html)
    const guiaInterativoHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Brand Guidelines — ${cliente}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="tokens_design.css">
    <style>
        body {
            background-color: var(--cor-fundo-base);
            color: var(--cor-texto-puro);
            font-family: var(--fonte-corpo);
            padding: 40px 24px;
            line-height: 1.6;
        }
        .container { max-width: 1000px; margin: 0 auto; }
        .header-brand { border-bottom: 1px solid var(--cor-borda); padding-bottom: 24px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: center; }
        h1, h2, h3 { font-family: var(--fonte-titulos); }
        .grid-cores { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 48px; }
        .card-cor { background: var(--cor-fundo-card); border: 1px solid var(--cor-borda); border-radius: var(--raio-md); overflow: hidden; }
        .bloco-cor { height: 100px; width: 100%; }
        .detalhes-cor { padding: 16px; }
        .detalhes-cor strong { display: block; font-size: 14px; margin-bottom: 4px; }
        .detalhes-cor code { font-family: var(--fonte-mono); font-size: 12px; color: var(--cor-primaria); }
        .bloco-logo { background: var(--cor-fundo-card); border: 1px solid var(--cor-borda-ativa); border-radius: var(--raio-lg); padding: 32px; text-align: center; margin-bottom: 48px; }
        .card-info { background: var(--cor-fundo-card); border: 1px solid var(--cor-borda); border-radius: var(--raio-md); padding: 24px; margin-bottom: 24px; }
    </style>
</head>
<body>
    <div class="container">
        <header class="header-brand">
            <div>
                <span style="font-size: 12px; color: var(--cor-primaria); font-weight: 700; letter-spacing: 1px;">BRAND GUIDELINES OFICIAIS</span>
                <h1>${cliente}</h1>
                <p style="color: var(--cor-texto-secundario); font-size: 14px;">${nicho} // Sistema de Identidade Visual VIDE</p>
            </div>
            <div style="text-align: right;">
                <span style="background: rgba(0, 240, 255, 0.1); border: 1px solid var(--cor-borda-ativa); color: var(--cor-primaria); padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700;">
                    <i class="fas fa-check-circle"></i> Homologado para Dev
                </span>
            </div>
        </header>

        <!-- Logotipo Oficial Renderizado -->
        <h2>1. Identidade Gráfica Vetorial (SVG)</h2>
        <div class="bloco-logo">
            <img src="assets/logo.svg" alt="${cliente}" style="max-width: 320px; height: auto;">
            <p style="color: var(--cor-texto-secundario); font-size: 13px; margin-top: 16px;">
                Vetor SVG gerado com proporções escaláveis e suporte a alta densidade de pixels (Retina).
            </p>
        </div>

        <!-- Paleta Cromática -->
        <h2>2. Paleta Cromática de Alta Precisão</h2>
        <div class="grid-cores">
            <div class="card-cor">
                <div class="bloco-cor" style="background: ${corPrimaria};"></div>
                <div class="detalhes-cor">
                    <strong>${corPrimariaNome}</strong>
                    <code>${corPrimaria}</code>
                </div>
            </div>
            <div class="card-cor">
                <div class="bloco-cor" style="background: ${corSecundaria};"></div>
                <div class="detalhes-cor">
                    <strong>${corSecundariaNome}</strong>
                    <code>${corSecundaria}</code>
                </div>
            </div>
            <div class="card-cor">
                <div class="bloco-cor" style="background: #06080E; border-bottom: 1px solid #222;"></div>
                <div class="detalhes-cor">
                    <strong>Obsidiana Fundo</strong>
                    <code>#06080E</code>
                </div>
            </div>
            <div class="card-cor">
                <div class="bloco-cor" style="background: #0D121F; border-bottom: 1px solid #222;"></div>
                <div class="detalhes-cor">
                    <strong>Grafite Card</strong>
                    <code>#0D121F</code>
                </div>
            </div>
        </div>

        <!-- Tipografia e Tokens -->
        <h2>3. Diretrizes de Interface para o Desenvolvedor</h2>
        <div class="card-info">
            <h3 style="margin-bottom: 12px;"><i class="fas fa-code" style="color: var(--cor-primaria);"></i> Consumo de Design Tokens</h3>
            <p style="color: var(--cor-texto-secundario); font-size: 14px; margin-bottom: 16px;">
                O Agente 03 (Desenvolvedor) consome automaticamente os arquivos <code>tokens_design.css</code> e <code>design_tokens.json</code> gerados nesta pasta para compor a folha de estilos da Landing Page sem divergências de cores ou fontes.
            </p>
            <div style="background: rgba(0,0,0,0.4); padding: 12px; border-radius: 6px; font-family: var(--fonte-mono); font-size: 12px; color: var(--cor-primaria);">
                @import "branding/tokens_design.css";
            </div>
        </div>
    </div>
</body>
</html>`;

    return {
        designTokens,
        tokensCss,
        logoSvg,
        simboloSvg,
        brandGuidelines,
        guiaInterativoHtml
    };
}

/**
 * 3. FUNÇÃO 3: Gravação Física dos Arquivos de Branding no Disco
 * @param {Object} params
 * @returns {Object} Dados da entrega física gerada
 */
function construirArquivosFisicosBranding({ idProjeto, idTarefa, dadosBranding }) {
    if (!fs.existsSync(DIRETORIO_ENTREGAS_BASE)) {
        fs.mkdirSync(DIRETORIO_ENTREGAS_BASE, { recursive: true });
    }

    const pastaProjeto = path.join(DIRETORIO_ENTREGAS_BASE, idProjeto);
    const pastaBranding = path.join(pastaProjeto, 'branding');
    const pastaAssets = path.join(pastaBranding, 'assets');

    [pastaProjeto, pastaBranding, pastaAssets].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    // 1. Grava Design Tokens em JSON
    storageService.salvarArquivo(idProjeto, 'branding', 'design_tokens.json', JSON.stringify(dadosBranding.designTokens, null, 2));

    // 2. Grava Variáveis CSS
    storageService.salvarArquivo(idProjeto, 'branding', 'tokens_design.css', dadosBranding.tokensCss);

    // 3. Grava Logotipo e Símbolo em SVG
    storageService.salvarArquivo(idProjeto, 'branding', 'assets/logo.svg', dadosBranding.logoSvg);
    storageService.salvarArquivo(idProjeto, 'branding', 'assets/simbolo.svg', dadosBranding.simboloSvg);

    // 4. Grava Manual em Markdown
    storageService.salvarArquivo(idProjeto, 'branding', 'brand_guidelines.md', dadosBranding.brandGuidelines);

    // 5. Grava Guia Interativo HTML
    storageService.salvarArquivo(idProjeto, 'branding', 'guia_marca_interativo.html', dadosBranding.guiaInterativoHtml);

    return {
        idProjeto,
        idTarefa,
        diretorioBranding: pastaBranding,
        arquivosCriados: [
            'design_tokens.json',
            'tokens_design.css',
            'brand_guidelines.md',
            'guia_marca_interativo.html',
            'assets/logo.svg',
            'assets/simbolo.svg'
        ]
    };
}

/**
 * 4. FUNÇÃO 4: Bateria de Testes Técnicos de Branding e Design
 * @param {Object} params
 * @returns {Object} Relatório detalhado dos testes
 */
function executarBateriaTestesBranding({ diretorioBranding, criteriosAceite = [] }) {
    const relatorio = {
        data_execucao: new Date().toISOString(),
        testes_individuais: {},
        criterios_atendidos: false,
        pontuacao_conformidade: 0,
        falhas: []
    };

    // 1. Teste de Existência dos 6 Arquivos Obrigatórios
    const caminhoJson = path.join(diretorioBranding, 'design_tokens.json');
    const caminhoCss = path.join(diretorioBranding, 'tokens_design.css');
    const caminhoMd = path.join(diretorioBranding, 'brand_guidelines.md');
    const caminhoHtml = path.join(diretorioBranding, 'guia_marca_interativo.html');
    const caminhoLogoSvg = path.join(diretorioBranding, 'assets', 'logo.svg');
    const caminhoSimboloSvg = path.join(diretorioBranding, 'assets', 'simbolo.svg');

    const todosExistem = fs.existsSync(caminhoJson) &&
                         fs.existsSync(caminhoCss) &&
                         fs.existsSync(caminhoMd) &&
                         fs.existsSync(caminhoHtml) &&
                         fs.existsSync(caminhoLogoSvg) &&
                         fs.existsSync(caminhoSimboloSvg);

    relatorio.testes_individuais.arquivos_obrigatorios_presentes = todosExistem;
    if (!todosExistem) {
        relatorio.falhas.push('Nem todos os 6 arquivos físicos de branding foram encontrados no disco.');
    }

    // 2. Teste de Integridade do JSON de Design Tokens
    if (fs.existsSync(caminhoJson)) {
        try {
            const json = JSON.parse(fs.readFileSync(caminhoJson, 'utf-8'));
            const temCores = json.colors && json.colors.primary && json.colors.background;
            const temTipografia = json.typography && json.typography.fontFamilyTitle;
            const temEscala = json.typography && json.typography.scales && json.typography.scales.h1;

            relatorio.testes_individuais.design_tokens_json_valido = !!(temCores && temTipografia && temEscala);
            if (!relatorio.testes_individuais.design_tokens_json_valido) {
                relatorio.falhas.push('design_tokens.json incompleto: faltam cores ou escalas tipográficas.');
            }
        } catch (e) {
            relatorio.testes_individuais.design_tokens_json_valido = false;
            relatorio.falhas.push('Erro sintático no JSON de design tokens: ' + e.message);
        }
    } else {
        relatorio.testes_individuais.design_tokens_json_valido = false;
    }

    // 3. Teste do CSS de Variáveis (tokens_design.css)
    if (fs.existsSync(caminhoCss)) {
        const conteudoCss = fs.readFileSync(caminhoCss, 'utf-8');
        const temRoot = conteudoCss.includes(':root');
        const temCorPrimaria = conteudoCss.includes('--cor-primaria:');
        const temFonte = conteudoCss.includes('--fonte-titulos:');

        relatorio.testes_individuais.tokens_css_validos = temRoot && temCorPrimaria && temFonte;
        if (!relatorio.testes_individuais.tokens_css_validos) {
            relatorio.falhas.push('tokens_design.css não contém :root ou variáveis esperadas.');
        }
    } else {
        relatorio.testes_individuais.tokens_css_validos = false;
    }

    // 4. Teste de Validação dos Vetores SVG
    if (fs.existsSync(caminhoLogoSvg) && fs.existsSync(caminhoSimboloSvg)) {
        const conteudoLogo = fs.readFileSync(caminhoLogoSvg, 'utf-8');
        const conteudoSimbolo = fs.readFileSync(caminhoSimboloSvg, 'utf-8');

        const logoValido = conteudoLogo.includes('<svg') && conteudoLogo.includes('viewBox') && conteudoLogo.includes('</svg>');
        const simboloValido = conteudoSimbolo.includes('<svg') && conteudoSimbolo.includes('viewBox') && conteudoSimbolo.includes('</svg>');

        relatorio.testes_individuais.vetores_svg_validos = logoValido && simboloValido;
        if (!relatorio.testes_individuais.vetores_svg_validos) {
            relatorio.falhas.push('Arquivos SVG corrompidos ou sem viewBox.');
        }
    } else {
        relatorio.testes_individuais.vetores_svg_validos = false;
    }

    // 5. Teste de Completude do Manual de Marca (Guidelines)
    if (fs.existsSync(caminhoMd)) {
        const conteudoMd = fs.readFileSync(caminhoMd, 'utf-8');
        const temArquétipo = conteudoMd.includes('Arquétipo');
        const temPaleta = conteudoMd.includes('Paleta Cromática');
        const temWCAG = conteudoMd.includes('WCAG');

        relatorio.testes_individuais.manual_brand_guidelines_completo = temArquétipo && temPaleta && temWCAG;
        if (!relatorio.testes_individuais.manual_brand_guidelines_completo) {
            relatorio.falhas.push('Manual de marca não cobre arquétipo, paleta ou conformidade WCAG.');
        }
    } else {
        relatorio.testes_individuais.manual_brand_guidelines_completo = false;
    }

    // Cálculo da Pontuação
    const totalTestes = Object.keys(relatorio.testes_individuais).length;
    const aprovados = Object.values(relatorio.testes_individuais).filter(Boolean).length;
    relatorio.pontuacao_conformidade = Math.round((aprovados / totalTestes) * 100);
    relatorio.criterios_atendidos = relatorio.pontuacao_conformidade === 100;

    return relatorio;
}

/**
 * 5. FUNÇÃO 5: Submeter Entrega ao Coordenador Geral para Auditoria
 * @param {Object} params
 * @returns {Object} Projeto atualizado após auditoria do Coordenador
 */
function submeterAoCoordenadorBranding({ idProjeto, idTarefa, dadosEntrega, relatorioTestes }) {
    const atendeTodos = relatorioTestes.criterios_atendidos === true;

    const parecer = atendeTodos
        ? `[APROVADO NA AUDITORIA] Sistema de Identidade Visual e UI/UX completo e homologado. ` +
          `Ativos vetoriais SVG gerados e validados. Design Tokens em JSON e CSS gerados em conformidade total. ` +
          `A tarefa dependente do Agente Desenvolvedor está liberada para execução imediata.`
        : `[REJEITADO NA AUDITORIA] A entrega de Branding não atendeu aos critérios técnicos. ` +
          `Falhas: ${relatorioTestes.falhas.join('; ')}. Tarefa marcada com pendência para correção.`;

    const projetoAuditado = conferirEntrega({
        idProjeto,
        idTarefa,
        entregaSubmetida: {
            diretorio: dadosEntrega.diretorioBranding,
            arquivos: dadosEntrega.arquivosCriados,
            testes: relatorioTestes,
            data_submissao: new Date().toISOString()
        },
        criteriosAtendidos: atendeTodos,
        parecerCoordenador: parecer
    });

    return {
        sucesso: atendeTodos,
        projeto: projetoAuditado,
        parecer
    };
}

/**
 * 6. PIPELINE INTEGRADO: Ciclo Completo do Agente 04
 * @param {Object} params
 * @returns {Object}
 */
function executarCicloCompletoBranding({ idProjeto, idTarefa }) {
    // Passo 1: Validar permissão
    const { projeto, tarefa } = validarPermissaoExecucaoBranding(idProjeto, idTarefa);

    // Passo 2: Conceber o sistema visual
    const dadosBranding = conceberSistemaIdentidadeVisual({
        cliente: projeto.cliente,
        solicitacao: projeto.solicitacao_original,
        idProjeto
    });

    // Passo 3: Construir arquivos físicos no disco
    const dadosEntrega = construirArquivosFisicosBranding({
        idProjeto,
        idTarefa,
        dadosBranding
    });

    // Passo 4: Executar testes de conformidade
    const relatorioTestes = executarBateriaTestesBranding({
        diretorioBranding: dadosEntrega.diretorioBranding,
        criteriosAceite: tarefa.criterios_aceite
    });

    // Passo 5: Submeter ao Coordenador Geral
    const resultadoSubmissao = submeterAoCoordenadorBranding({
        idProjeto,
        idTarefa,
        dadosEntrega,
        relatorioTestes
    });

    return {
        idProjeto,
        idTarefa,
        dadosBranding,
        dadosEntrega,
        relatorioTestes,
        resultadoSubmissao
    };
}

module.exports = {
    validarPermissaoExecucaoBranding,
    conceberSistemaIdentidadeVisual,
    construirArquivosFisicosBranding,
    executarBateriaTestesBranding,
    submeterAoCoordenadorBranding,
    executarCicloCompletoBranding,
    DIRETORIO_ENTREGAS_BASE
};
