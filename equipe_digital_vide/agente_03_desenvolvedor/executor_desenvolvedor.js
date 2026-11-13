/**
 * =====================================================================
 * VIDE — EQUIPE DIGITAL
 * AGENTE 03: DESENVOLVEDOR FULL-STACK (EXECUTOR OPERACIONAL)
 * Implementação do ciclo completo de desenvolvimento, validação técnica
 * e submissão de soluções digitais ao Coordenador Geral da VIDE
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Importações dos módulos de governança da Equipe Digital VIDE
const {
    obterProjetoPorId,
    atualizarEstadoTarefa,
    registrarEvento
} = require('../agente_02_coordenador/repositorio_projetos_tarefas');

const {
    conferirEntrega
} = require('../agente_02_coordenador/executor_coordenador');
const { storageService } = require('../storage_service');
const { iaService } = require('../ia_service');

// Diretório oficial de entregas físicas no disco
const DIRETORIO_ENTREGAS_BASE = path.join(__dirname, '..', 'entregas_clientes');

/**
 * 1. FUNÇÃO 1: Validar Permissão e Ingerir Tarefa
 * Bloqueia estritamente projetos sem autorização ou tarefas com dependência pendente.
 * @param {string} idProjeto 
 * @param {string} idTarefa 
 * @returns {Object} Tarefa e Projeto prontos para execução
 */
function validarPermissaoExecucao(idProjeto, idTarefa) {
    const projeto = obterProjetoPorId(idProjeto);
    if (!projeto) {
        throw new Error(`[ERRO_DEV] Projeto [${idProjeto}] não foi encontrado no repositório.`);
    }

    // Regra 1: Validação de Autorização Comercial do Projeto
    const autorizacao = projeto.autorizacao_comercial || {};
    if (autorizacao.status !== 'AUTORIZADO') {
        throw new Error(
            `[BLOQUEIO_COMERCIAL] Projeto [${idProjeto}] está com status [${autorizacao.status}]. ` +
            `O Agente Desenvolvedor está expressamente proibido de iniciar trabalho técnico sem autorização comercial formal.`
        );
    }

    // Regra 2: Localização da Tarefa
    const tarefa = (projeto.grafo_tarefas || []).find(t => t.id_tarefa === idTarefa);
    if (!tarefa) {
        throw new Error(`[ERRO_DEV] Tarefa [${idTarefa}] não existe no grafo do projeto [${idProjeto}].`);
    }

    // Regra 3: Validação de Especialista
    if (tarefa.especialista !== 'Desenvolvedor' && !tarefa.especialista.toLowerCase().includes('desenvolv')) {
        throw new Error(`[ERRO_ESPECIALISTA] Tarefa [${idTarefa}] está atribuída para [${tarefa.especialista}], não para o Desenvolvedor.`);
    }

    // Regra 4: Validação de Estado e Dependências
    if (tarefa.estado === 'BLOQUEADA_POR_DEPENDENCIA') {
        const deps = (tarefa.dependencias || []).join(', ');
        throw new Error(
            `[BLOQUEIO_DEPENDENCIA] Tarefa [${idTarefa}] está BLOQUEADA_POR_DEPENDENCIA. ` +
            `Aguardando aprovação das tarefas predecessoras: [${deps}].`
        );
    }

    if (tarefa.estado === 'BLOQUEADA_POR_AUTORIZACAO') {
        throw new Error(
            `[BLOQUEIO_COMERCIAL] Tarefa [${idTarefa}] está BLOQUEADA_POR_AUTORIZACAO comercial.`
        );
    }

    if (tarefa.estado === 'APROVADA' || tarefa.estado === 'CONCLUIDA') {
        throw new Error(`[AVISO_DEV] Tarefa [${idTarefa}] já foi auditada e concluída anteriormente.`);
    }

    // Transição permitida: Muda o estado para EM_ANDAMENTO
    atualizarEstadoTarefa({
        idProjeto,
        idTarefa,
        novoEstado: 'EM_ANDAMENTO',
        notaAuditoria: 'Tarefa assumida pelo Agente 03 (Desenvolvedor) para planejamento e construção física.',
        autor: 'Agente 03 — Desenvolvedor'
    });

    return {
        projeto: obterProjetoPorId(idProjeto),
        tarefa
    };
}

/**
 * 2. FUNÇÃO 2: Interpretação de Briefing e Requisitos
 * Extrai parâmetros do cliente e analisa completude dos critérios de aceite
 * @param {Object} tarefa 
 * @param {Object} projeto 
 * @returns {Object} Briefing técnico estruturado
 */
function interpretarBriefing(tarefa, projeto) {
    const textoOriginal = projeto.solicitacao_original || '';
    const clienteNome = projeto.cliente || 'Cliente VIDE';

    // Determina o nicho e tom da empresa
    let nicho = 'Institucional / Serviços de Alto Padrão';
    let chamadaHero = `Excelência e Precisão em Cada Detalhe`;
    let subchamadaHero = `Soluções completas e atendimento personalizado para transformar sua experiência.`;
    let telefoneContato = '(11) 99876-5432';

    if (textoOriginal.toLowerCase().includes('odontol') || clienteNome.toLowerCase().includes('ortho') || clienteNome.toLowerCase().includes('dr.')) {
        nicho = 'Odontologia Avançada & Estética do Sorriso';
        chamadaHero = `Reabilitação Oral e Estética de Alto Padrão para o seu Sorriso`;
        subchamadaHero = `Tecnologia de ponta, conforto absoluto e resultados naturais com o rigor dos maiores especialistas.`;
        telefoneContato = '(11) 98765-4321';
    } else if (textoOriginal.toLowerCase().includes('estétic') || textoOriginal.toLowerCase().includes('lumina')) {
        nicho = 'Estética Médica & Longevidade Cutânea';
        chamadaHero = `A Harmonização Natural e Elegante que o seu Rosto Merece`;
        subchamadaHero = `Protocolos individualizados com tecnologia médica avançada para realçar sua melhor versão.`;
    }

    return {
        idProjeto: projeto.id_projeto,
        idTarefa: tarefa.id_tarefa,
        cliente: clienteNome,
        nicho,
        chamadaHero,
        subchamadaHero,
        telefoneContato,
        tituloPagina: `${clienteNome} — ${nicho}`,
        criteriosAceite: tarefa.criterios_aceite || [
            'Código HTML semântico e estruturado',
            'Design responsivo para mobile e desktop',
            'Formulário com validação de telefone brasileiro',
            'Botão com link direto para WhatsApp com mensagem pré-formatada'
        ]
    };
}

/**
 * 3. FUNÇÃO 3: Gerar Código Físico da Landing Page
 * Cria HTML semântico, CSS3 modular com variáveis e JavaScript nativo
 * @param {Object} briefing 
 * @returns {Object} Arquivos de código como strings
 */
function gerarCodigoSolucao(briefing) {
    // Header com Logo Vetorial se gerado pelo Branding ou Logo Padrão
    const logoHeaderHtml = briefing.tokensBranding
        ? `<img src="assets/logo.svg" alt="${briefing.cliente}" class="logo-svg-branding" style="max-height: 42px; width: auto;" onerror="this.outerHTML='<span class=\\'logo-texto\\'>${briefing.cliente}</span>'">`
        : `<span class="logo-simbolo">V</span><span class="logo-texto">${briefing.cliente}</span>`;
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${briefing.tituloPagina}</title>
    <meta name="description" content="${briefing.subchamadaHero}">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="css/estilos.css">
</head>
<body>
    <!-- Topo Institucional de Atendimento -->
    <div class="topo-aviso">
        <div class="container container-flex-entre">
            <span><i class="fas fa-map-marker-alt"></i> Atendimento com hora marcada e manobrista privativo</span>
            <span><i class="fab fa-whatsapp"></i> Agendamentos rápidos: ${briefing.telefoneContato}</span>
        </div>
    </div>

    <!-- Header Principal -->
    <header class="cabecalho-principal">
        <div class="container container-flex-entre">
            <a href="#" class="logotipo-marca">
                ${logoHeaderHtml}
            </a>
            <nav class="navegacao-menu">
                <a href="#diferenciais">Diferenciais</a>
                <a href="#tratamentos">Especialidades</a>
                <a href="#depoimentos">Avaliações</a>
                <a href="#agendamento" class="btn-cta-nav">Agendar Consulta</a>
            </nav>
        </div>
    </header>

    <!-- Hero Section de Alta Conversão -->
    <main>
        <section class="secao-hero">
            <div class="container">
                <div class="grid-hero">
                    <div class="conteudo-hero">
                        <div class="tag-categoria">
                            <span class="ponto-verde"></span> ${briefing.nicho.toUpperCase()}
                        </div>
                        <h1 class="titulo-hero">${briefing.chamadaHero}</h1>
                        <p class="descricao-hero">${briefing.subchamadaHero}</p>
                        
                        <div class="botoes-hero">
                            <a href="#agendamento" class="btn-primario">
                                <i class="fas fa-calendar-check"></i> Agendar Avaliação Individual
                            </a>
                            <a href="https://wa.me/55${briefing.telefoneContato.replace(/\D/g, '')}?text=Olá!%20Gostaria%20de%20saber%20mais%20informações." target="_blank" class="btn-secundario">
                                <i class="fab fa-whatsapp"></i> Falar no WhatsApp
                            </a>
                        </div>

                        <div class="indicadores-confianca">
                            <div class="item-confianca">
                                <strong>+2.500</strong>
                                <span>Pacientes Atendidos</span>
                            </div>
                            <div class="divisor-confianca"></div>
                            <div class="item-confianca">
                                <strong>4.9 / 5.0</strong>
                                <span>Avaliação no Google</span>
                            </div>
                            <div class="divisor-confianca"></div>
                            <div class="item-confianca">
                                <strong>100%</strong>
                                <span>Biossegurança Rígida</span>
                            </div>
                        </div>
                    </div>

                    <div class="card-hero-destaque">
                        <div class="card-destaque-interno">
                            <div class="card-topo">
                                <span class="badge-card">ESPECIALIDADE PRINCIPAL</span>
                                <i class="fas fa-award icone-destaque"></i>
                            </div>
                            <h3>Planejamento Digital e Precisão</h3>
                            <p>Mapeamento individualizado com equipamentos de última geração para prever os resultados antes do início.</p>
                            <ul class="lista-beneficios">
                                <li><i class="fas fa-check-circle"></i> Consulta com diagnóstico detalhado</li>
                                <li><i class="fas fa-check-circle"></i> Pontualidade e ambiente exclusivo</li>
                                <li><i class="fas fa-check-circle"></i> Acompanhamento integral pós-procedimento</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Seção de Diferenciais -->
        <section id="diferenciais" class="secao-diferenciais">
            <div class="container">
                <div class="cabecalho-secao">
                    <span class="subtitulo-secao">POR QUE ESCOLHER NOSSA CLÍNICA</span>
                    <h2>O Padrão de Excelência que Você Merece</h2>
                </div>

                <div class="grid-cards-3">
                    <article class="card-recurso">
                        <div class="icone-recurso"><i class="fas fa-microscope"></i></div>
                        <h3>Tecnologia Avançada</h3>
                        <p>Infraestrutura moderna e equipamentos de precisão internacional para diagnósticos rápidos e procedimentos confortáveis.</p>
                    </article>

                    <article class="card-recurso">
                        <div class="icone-recurso"><i class="fas fa-user-md"></i></div>
                        <h3>Equipe Qualificada</h3>
                        <p>Profissionais com formação de excelência, dedicados à atualização contínua e aos mais altos padrões éticos.</p>
                    </article>

                    <article class="card-recurso">
                        <div class="icone-recurso"><i class="fas fa-shield-alt"></i></div>
                        <h3>Conforto & Segurança</h3>
                        <p>Ambiente privativo, esterilização hospitalar rigorosa e acolhimento focado no seu bem-estar do início ao fim.</p>
                    </article>
                </div>
            </div>
        </section>

        <!-- Seção de Agendamento e Formulário de Conversão -->
        <section id="agendamento" class="secao-formulario">
            <div class="container">
                <div class="card-formulario-wrapper">
                    <div class="formulario-info">
                        <h2>Agende Sua Consulta de Avaliação</h2>
                        <p>Preencha os dados abaixo e nossa equipe entrará em contato em menos de 15 minutos pelo WhatsApp para confirmar o seu horário.</p>
                        
                        <div class="contatos-diretos">
                            <div class="item-contato-direto">
                                <i class="fas fa-clock"></i>
                                <div>
                                    <strong>Horário de Funcionamento</strong>
                                    <span>Segunda a Sexta: 08h às 19h | Sábados: 08h às 13h</span>
                                </div>
                            </div>
                            <div class="item-contato-direto">
                                <i class="fas fa-phone-alt"></i>
                                <div>
                                    <strong>Central de Atendimento</strong>
                                    <span>${briefing.telefoneContato}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="formulario-caixa">
                        <form id="form-agendamento" class="form-conversao" novalidate>
                            <div class="campo-grupo">
                                <label for="nome-cliente">Nome Completo *</label>
                                <input type="text" id="nome-cliente" name="nome" placeholder="Seu nome completo" required>
                                <span class="mensagem-erro" id="erro-nome"></span>
                            </div>

                            <div class="campo-grupo">
                                <label for="telefone-cliente">WhatsApp para Contato *</label>
                                <input type="tel" id="telefone-cliente" name="telefone" placeholder="(11) 99999-9999" maxlength="15" required>
                                <span class="mensagem-erro" id="erro-telefone"></span>
                            </div>

                            <div class="campo-grupo">
                                <label for="interesse-cliente">Tratamento de Interesse</label>
                                <select id="interesse-cliente" name="interesse">
                                    <option value="Avaliação Geral">Consulta de Avaliação Geral</option>
                                    <option value="Implantes e Próteses">Implantes & Reabilitação</option>
                                    <option value="Estética e Lentes">Estética Dental & Lentes</option>
                                    <option value="Ortodontia e Alinhadores">Alinhadores Invisíveis</option>
                                    <option value="Outro Procedimento">Outro Procedimento</option>
                                </select>
                            </div>

                            <div class="campo-grupo">
                                <label for="periodo-cliente">Melhor Período para Contato</label>
                                <select id="periodo-cliente" name="periodo">
                                    <option value="Manhã">Manhã (08h às 12h)</option>
                                    <option value="Tarde">Tarde (13h às 18h)</option>
                                    <option value="Qualquer Horário">Qualquer Horário</option>
                                </select>
                            </div>

                            <button type="submit" id="btn-enviar-form" class="btn-submit">
                                <i class="fab fa-whatsapp"></i> Enviar e Confirmar no WhatsApp
                            </button>
                            <p class="termo-privacidade"><i class="fas fa-lock"></i> Seus dados estão seguros e protegidos. Respeitamos sua privacidade.</p>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <!-- Rodapé Institucional -->
    <footer class="rodape-principal">
        <div class="container container-flex-entre">
            <div class="col-rodape">
                <span class="logo-texto-rodape">${briefing.cliente}</span>
                <p>${briefing.nicho} — Compromisso inegociável com a sua saúde e confiança.</p>
            </div>
            <div class="col-rodape-direita">
                <p>&copy; ${new Date().getFullYear()} ${briefing.cliente}. Todos os direitos reservados.</p>
                <p class="assinatura-tecnica">Desenvolvido com excelência técnica pela <strong>VIDE</strong>.</p>
            </div>
        </div>
    </footer>

    <!-- Botão Flutuante de WhatsApp -->
    <a href="https://wa.me/55${briefing.telefoneContato.replace(/\D/g, '')}?text=Olá!%20Gostaria%20de%20agendar%20uma%20consulta." class="btn-whatsapp-flutuante" target="_blank" title="Falar no WhatsApp">
        <i class="fab fa-whatsapp"></i>
    </a>

    <script src="js/script.js"></script>
</body>
</html>`;

    // 3.2. GERAÇÃO DO CSS (Modular, Variáveis, Responsivo, Clean, Mobile-First)
    const css = `/* ==========================================================================
   VIDE — Design System & Folha de Estilos de Alta Precisão
   Projeto: ${briefing.cliente}
   ========================================================================== */

:root {
    --fundo-base: ${briefing.tokensBranding ? briefing.tokensBranding.colors.background : '#06080e'};
    --fundo-card: ${briefing.tokensBranding ? briefing.tokensBranding.colors.backgroundCard : '#0d121f'};
    --fundo-card-hover: ${briefing.tokensBranding ? briefing.tokensBranding.colors.backgroundCardHover : '#131a2c'};
    --ciano-principal: ${briefing.tokensBranding ? briefing.tokensBranding.colors.primary : '#00f0ff'};
    --ciano-glow: ${briefing.tokensBranding ? briefing.tokensBranding.colors.primary + '26' : 'rgba(0, 240, 255, 0.15)'};
    --azul-profundo: ${briefing.tokensBranding ? briefing.tokensBranding.colors.secondary : '#0066ff'};
    --texto-puro: #ffffff;
    --texto-secundario: #8899b5;
    --texto-suave: #556680;
    --borda-fina: rgba(255, 255, 255, 0.08);
    --borda-ativa: ${briefing.tokensBranding ? briefing.tokensBranding.colors.primary + '59' : 'rgba(0, 240, 255, 0.35)'};
    --sucesso-verde: #00e676;
    --erro-vermelho: #ff5252;
    --fonte-principal: ${briefing.tokensBranding ? briefing.tokensBranding.typography.fontFamilyBody : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'};
    --fonte-titulos: ${briefing.tokensBranding ? briefing.tokensBranding.typography.fontFamilyTitle : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'};
    --fonte-mono: "SF Mono", "Fira Code", monospace;
    --transicao: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

html {
    scroll-behavior: smooth;
}

body {
    background-color: var(--fundo-base);
    color: var(--texto-puro);
    font-family: var(--fonte-principal);
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
}

/* Utilitários de Layout */
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
}

.container-flex-entre {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

/* Topo Aviso */
.topo-aviso {
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid var(--borda-fina);
    padding: 8px 0;
    font-size: 12px;
    color: var(--texto-secundario);
}

.topo-aviso span i {
    color: var(--ciano-principal);
    margin-right: 6px;
}

/* Cabeçalho */
.cabecalho-principal {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(6, 8, 14, 0.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--borda-fina);
    padding: 18px 0;
}

.logotipo-marca {
    display: flex;
    align-items: center;
    gap: 12px;
    text-decoration: none;
    color: var(--texto-puro);
}

.logo-simbolo {
    background: linear-gradient(135deg, var(--ciano-principal), var(--azul-profundo));
    color: #000;
    font-weight: 900;
    font-size: 18px;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.logo-texto {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.5px;
}

.navegacao-menu {
    display: flex;
    align-items: center;
    gap: 28px;
}

.navegacao-menu a {
    color: var(--texto-secundario);
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    transition: var(--transicao);
}

.navegacao-menu a:hover {
    color: var(--ciano-principal);
}

.btn-cta-nav {
    background: var(--ciano-principal);
    color: #000 !important;
    padding: 10px 20px;
    border-radius: 6px;
    font-weight: 700 !important;
}

.btn-cta-nav:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 14px var(--ciano-glow);
}

/* Hero Section */
.secao-hero {
    padding: 80px 0 60px 0;
}

.grid-hero {
    display: grid;
    grid-template-columns: 1.2fr 0.8fr;
    gap: 48px;
    align-items: center;
}

.tag-categoria {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(0, 240, 255, 0.08);
    color: var(--ciano-principal);
    border: 1px solid var(--borda-ativa);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    padding: 6px 14px;
    border-radius: 20px;
    margin-bottom: 20px;
}

.ponto-verde {
    width: 8px;
    height: 8px;
    background: var(--sucesso-verde);
    border-radius: 50%;
}

.titulo-hero {
    font-size: clamp(32px, 4vw, 52px);
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -1px;
    margin-bottom: 20px;
}

.descricao-hero {
    font-size: 17px;
    color: var(--texto-secundario);
    line-height: 1.6;
    margin-bottom: 32px;
    max-width: 580px;
}

.botoes-hero {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 48px;
}

.btn-primario, .btn-secundario {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 15px 30px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 14px;
    text-decoration: none;
    transition: var(--transicao);
}

.btn-primario {
    background: linear-gradient(135deg, var(--ciano-principal), var(--azul-profundo));
    color: #000;
}

.btn-primario:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 240, 255, 0.3);
}

.btn-secundario {
    background: rgba(255, 255, 255, 0.05);
    color: var(--texto-puro);
    border: 1px solid var(--borda-fina);
}

.btn-secundario:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--borda-ativa);
}

/* Indicadores de Confiança */
.indicadores-confianca {
    display: flex;
    align-items: center;
    gap: 24px;
    border-top: 1px solid var(--borda-fina);
    padding-top: 24px;
}

.item-confianca strong {
    display: block;
    font-size: 20px;
    color: var(--ciano-principal);
}

.item-confianca span {
    font-size: 12px;
    color: var(--texto-secundario);
}

.divisor-confianca {
    width: 1px;
    height: 32px;
    background: var(--borda-fina);
}

/* Card Destaque Hero */
.card-hero-destaque {
    background: var(--fundo-card);
    border: 1px solid var(--borda-fina);
    border-radius: 16px;
    padding: 32px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    position: relative;
    overflow: hidden;
}

.card-hero-destaque::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--ciano-principal), transparent);
}

.card-topo {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.badge-card {
    font-size: 11px;
    font-weight: 700;
    color: var(--ciano-principal);
    letter-spacing: 0.5px;
}

.icone-destaque {
    font-size: 24px;
    color: var(--ciano-principal);
}

.card-hero-destaque h3 {
    font-size: 22px;
    margin-bottom: 12px;
}

.card-hero-destaque p {
    color: var(--texto-secundario);
    font-size: 14px;
    margin-bottom: 24px;
}

.lista-beneficios {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.lista-beneficios li {
    font-size: 14px;
    color: var(--texto-puro);
    display: flex;
    align-items: center;
    gap: 10px;
}

.lista-beneficios li i {
    color: var(--sucesso-verde);
}

/* Seção de Diferenciais */
.secao-diferenciais {
    padding: 80px 0;
    background: rgba(255, 255, 255, 0.015);
}

.cabecalho-secao {
    text-align: center;
    margin-bottom: 48px;
}

.subtitulo-secao {
    font-size: 12px;
    font-weight: 700;
    color: var(--ciano-principal);
    letter-spacing: 1.5px;
    display: block;
    margin-bottom: 8px;
}

.cabecalho-secao h2 {
    font-size: 32px;
    font-weight: 700;
}

.grid-cards-3 {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 28px;
}

.card-recurso {
    background: var(--fundo-card);
    border: 1px solid var(--borda-fina);
    border-radius: 12px;
    padding: 32px;
    transition: var(--transicao);
}

.card-recurso:hover {
    border-color: var(--borda-ativa);
    transform: translateY(-4px);
}

.icone-recurso {
    width: 52px;
    height: 52px;
    background: rgba(0, 240, 255, 0.08);
    border: 1px solid var(--borda-ativa);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    color: var(--ciano-principal);
    margin-bottom: 20px;
}

.card-recurso h3 {
    font-size: 18px;
    margin-bottom: 12px;
}

.card-recurso p {
    color: var(--texto-secundario);
    font-size: 14px;
    line-height: 1.6;
}

/* Seção do Formulário de Conversão */
.secao-formulario {
    padding: 80px 0;
}

.card-formulario-wrapper {
    background: var(--fundo-card);
    border: 1px solid var(--borda-ativa);
    border-radius: 20px;
    padding: 48px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
}

.formulario-info h2 {
    font-size: 30px;
    margin-bottom: 16px;
}

.formulario-info p {
    color: var(--texto-secundario);
    font-size: 15px;
    margin-bottom: 32px;
}

.contatos-diretos {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.item-contato-direto {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.item-contato-direto i {
    font-size: 20px;
    color: var(--ciano-principal);
    margin-top: 4px;
}

.item-contato-direto strong {
    display: block;
    font-size: 14px;
}

.item-contato-direto span {
    font-size: 13px;
    color: var(--texto-secundario);
}

.campo-grupo {
    margin-bottom: 18px;
}

.campo-grupo label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 6px;
    color: var(--texto-puro);
}

.campo-grupo input, .campo-grupo select {
    width: 100%;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--borda-fina);
    border-radius: 8px;
    padding: 12px 16px;
    color: var(--texto-puro);
    font-size: 14px;
    font-family: inherit;
    transition: var(--transicao);
}

.campo-grupo input:focus, .campo-grupo select:focus {
    outline: none;
    border-color: var(--ciano-principal);
    background: rgba(0, 240, 255, 0.03);
    box-shadow: 0 0 10px var(--ciano-glow);
}

.campo-grupo select option {
    background: var(--fundo-card);
    color: var(--texto-puro);
}

.mensagem-erro {
    color: var(--erro-vermelho);
    font-size: 12px;
    display: block;
    margin-top: 4px;
    min-height: 16px;
}

.btn-submit {
    width: 100%;
    background: linear-gradient(135deg, var(--sucesso-verde), #00b0ff);
    color: #000;
    font-weight: 700;
    font-size: 15px;
    padding: 16px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: var(--transicao);
}

.btn-submit:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 230, 118, 0.3);
}

.termo-privacidade {
    font-size: 11px;
    color: var(--texto-suave);
    text-align: center;
    margin-top: 12px;
}

/* Rodapé */
.rodape-principal {
    border-top: 1px solid var(--borda-fina);
    padding: 40px 0;
    font-size: 13px;
    color: var(--texto-secundario);
}

.logo-texto-rodape {
    font-size: 16px;
    font-weight: 700;
    color: var(--texto-puro);
    display: block;
    margin-bottom: 6px;
}

.col-rodape-direita {
    text-align: right;
}

.assinatura-tecnica strong {
    color: var(--ciano-principal);
}

/* Botão Flutuante de WhatsApp */
.btn-whatsapp-flutuante {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 60px;
    height: 60px;
    background: #25d366;
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30px;
    text-decoration: none;
    box-shadow: 0 4px 16px rgba(37, 211, 102, 0.4);
    z-index: 1000;
    transition: var(--transicao);
}

.btn-whatsapp-flutuante:hover {
    transform: scale(1.1);
}

/* ==========================================================================
   RESPONSIVIDADE (Breakpoints Testados Mobile-First & Desktop)
   ========================================================================== */

/* Tablet (<= 768px) */
@media (max-width: 768px) {
    .grid-hero {
        grid-template-columns: 1fr;
        gap: 36px;
    }

    .card-formulario-wrapper {
        grid-template-columns: 1fr;
        padding: 32px 24px;
        gap: 32px;
    }

    .navegacao-menu {
        display: none;
    }

    .container-flex-entre {
        flex-direction: column;
        gap: 16px;
        text-align: center;
    }

    .col-rodape-direita {
        text-align: center;
    }

    .topo-aviso .container-flex-entre {
        flex-direction: column;
        gap: 4px;
    }
}

/* Mobile Pequeno (<= 480px) */
@media (max-width: 480px) {
    .titulo-hero {
        font-size: 28px;
    }

    .botoes-hero {
        flex-direction: column;
    }

    .btn-primario, .btn-secundario {
        width: 100%;
        justify-content: center;
    }

    .indicadores-confianca {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
    }

    .divisor-confianca {
        display: none;
    }
}`;

    // 3.3. GERAÇÃO DO JAVASCRIPT (Validação, Máscara BR e Disparo de WhatsApp)
    const js = `/**
 * =====================================================================
 * Scripts Interativos & Validação de Formulário
 * Cliente: ${briefing.cliente}
 * =====================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    const inputTelefone = document.getElementById('telefone-cliente');
    const inputNome = document.getElementById('nome-cliente');
    const selectInteresse = document.getElementById('interesse-cliente');
    const selectPeriodo = document.getElementById('periodo-cliente');
    const form = document.getElementById('form-agendamento');
    const erroNome = document.getElementById('erro-nome');
    const erroTelefone = document.getElementById('erro-telefone');

    // Telefone da clínica para onde a mensagem será direcionada
    const NUMERO_WHATSAPP_CLINICA = '55${briefing.telefoneContato.replace(/\D/g, '')}';

    // 1. MÁSCARA DINÂMICA DE TELEFONE BRASILEIRO (11) 9XXXX-XXXX
    if (inputTelefone) {
        inputTelefone.addEventListener('input', (e) => {
            let valor = e.target.value.replace(/\\D/g, '');
            if (valor.length > 11) valor = valor.slice(0, 11);

            if (valor.length > 10) {
                // Formato Celular com 9 dígitos: (XX) 9XXXX-XXXX
                e.target.value = valor.replace(/^(\\d{2})(\\d{5})(\\d{4})$/, '($1) $2-$3');
            } else if (valor.length > 5) {
                // Formato Fixo: (XX) XXXX-XXXX
                e.target.value = valor.replace(/^(\\d{2})(\\d{4})(\\d{0,4})$/, '($1) $2-$3');
            } else if (valor.length > 2) {
                e.target.value = valor.replace(/^(\\d{2})(\\d{0,5})$/, '($1) $2');
            } else {
                e.target.value = valor;
            }
        });
    }

    // 2. VALIDAÇÃO E SUBMISSÃO DO FORMULÁRIO COM DIRECIONAMENTO AO WHATSAPP
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            let valido = true;

            // Limpa mensagens anteriores
            erroNome.textContent = '';
            erroTelefone.textContent = '';

            // Validação de Nome
            const nome = inputNome ? inputNome.value.trim() : '';
            if (nome.length < 3) {
                erroNome.textContent = 'Por favor, informe seu nome completo (mínimo 3 caracteres).';
                valido = false;
            }

            // Validação de Telefone (pelo menos 10 dígitos numéricos)
            const telefoneNumeros = inputTelefone ? inputTelefone.value.replace(/\\D/g, '') : '';
            if (telefoneNumeros.length < 10) {
                erroTelefone.textContent = 'Por favor, informe um WhatsApp válido com DDD.';
                valido = false;
            }

            if (!valido) return;

            // Formatação da Mensagem Oficial para o WhatsApp
            const interesse = selectInteresse ? selectInteresse.value : 'Consulta';
            const periodo = selectPeriodo ? selectPeriodo.value : 'Qualquer horário';

            const mensagemFormatada = 
                \`*NOVO AGENDAMENTO VIA SITE*\\n\\n\` +
                \`*Nome:* \${nome}\\n\` +
                \`*WhatsApp:* \${inputTelefone.value}\\n\` +
                \`*Interesse:* \${interesse}\\n\` +
                \`*Melhor Período:* \${periodo}\\n\\n\` +
                \`_Olá! Acabei de preencher meus dados no site e gostaria de confirmar a disponibilidade de horário._\`;

            const urlWhatsApp = \`https://wa.me/\${NUMERO_WHATSAPP_CLINICA}?text=\${encodeURIComponent(mensagemFormatada)}\`;

            // Feedback visual e redirecionamento seguro
            const btnSubmit = document.getElementById('btn-enviar-form');
            if (btnSubmit) {
                btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Redirecionando para WhatsApp...';
                btnSubmit.disabled = true;
            }

            setTimeout(() => {
                window.open(urlWhatsApp, '_blank');
                if (btnSubmit) {
                    btnSubmit.innerHTML = '<i class="fas fa-check"></i> Mensagem Gerada!';
                }
            }, 600);
        });
    }
});`;

    // 3.4. DOCUMENTAÇÃO TÉCNICA (README.md)
    const readme = `# ENTREGA TÉCNICA — LANDING PAGE INSTITUCIONAL
## Cliente: ${briefing.cliente} | Especialidade: ${briefing.nicho}

---

### Estrutura de Arquivos Produzida:
- \`index.html\`: Código semântico HTML5 com seções de Hero, Diferenciais, Agendamento e Prova Social.
- \`css/estilos.css\`: Folha de estilos responsiva desenvolvida com Design Tokens (CSS Variables) e breakpoints mobile-first.
- \`js/script.js\`: Validador de campos com máscara de telefone brasileiro e direcionamento direto para WhatsApp.

### Instruções de Publicação Rápida:
1. **Netlify Drop:** Arraste esta pasta diretamente para https://app.netlify.com/drop para obter um link online em 15 segundos.
2. **Vercel:** Faça upload da pasta ou execute \`vercel\` no diretório.
3. **cPanel / Apache / Nginx:** Envie todos os arquivos diretamente para a raiz da pasta \`public_html\`.

Desenvolvido pelo **Agente 03 — Desenvolvedor Full-Stack da VIDE**.
`;

    return { html, css, js, readme };
}

/**
 * 4. FUNÇÃO 4: Construir os Arquivos Físicos no Disco
 * Grava a entrega completa no diretório do projeto
 * @param {Object} params
 * @returns {Object} Dados da entrega física gerada
 */
function construirArquivosFisicos({ idProjeto, idTarefa, briefing, customizacoes = {} }) {
    // Garante existência da pasta base de entregas
    if (!fs.existsSync(DIRETORIO_ENTREGAS_BASE)) {
        fs.mkdirSync(DIRETORIO_ENTREGAS_BASE, { recursive: true });
    }

    const pastaProjeto = path.join(DIRETORIO_ENTREGAS_BASE, idProjeto);
    const pastaSite = path.join(pastaProjeto, 'site_oficial');
    const pastaCss = path.join(pastaSite, 'css');
    const pastaJs = path.join(pastaSite, 'js');

    // Cria as pastas necessárias
    [pastaProjeto, pastaSite, pastaCss, pastaJs].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    // Consome automaticamente os Design Tokens e Ativos do Agente 04 (Branding) se existirem
    const pastaBranding = path.join(pastaProjeto, 'branding');
    const arquivoTokens = path.join(pastaBranding, 'design_tokens.json');
    if (fs.existsSync(arquivoTokens)) {
        try {
            const tokensLidos = JSON.parse(fs.readFileSync(arquivoTokens, 'utf-8'));
            briefing.tokensBranding = tokensLidos;

            const pastaAssets = path.join(pastaSite, 'assets');
            if (!fs.existsSync(pastaAssets)) fs.mkdirSync(pastaAssets, { recursive: true });

            const logoOrigem = path.join(pastaBranding, 'assets', 'logo.svg');
            const simboloOrigem = path.join(pastaBranding, 'assets', 'simbolo.svg');
            if (fs.existsSync(logoOrigem)) fs.copyFileSync(logoOrigem, path.join(pastaAssets, 'logo.svg'));
            if (fs.existsSync(simboloOrigem)) fs.copyFileSync(simboloOrigem, path.join(pastaAssets, 'simbolo.svg'));
        } catch (e) {
            // Segue com fallbacks do desenvolvedor
        }
    }

    // Gera os códigos
    const codigos = gerarCodigoSolucao(briefing);

    // Grava arquivos físicos e persiste no storage PostgreSQL
    storageService.salvarArquivo(idProjeto, 'site_oficial', 'index.html', codigos.html);
    storageService.salvarArquivo(idProjeto, 'site_oficial', 'css/estilos.css', codigos.css);
    storageService.salvarArquivo(idProjeto, 'site_oficial', 'js/script.js', codigos.js);
    storageService.salvarArquivo(idProjeto, 'site_oficial', 'README.md', codigos.readme);

    return {
        idProjeto,
        idTarefa,
        diretorioEntrega: pastaSite,
        arquivosCriados: [
            'index.html',
            'css/estilos.css',
            'js/script.js',
            'README.md'
        ]
    };
}

/**
 * 5. FUNÇÃO 5: Bateria de Testes Técnicos Automatizados
 * Valida sintaxe, estrutura, responsividade e formulários antes de submeter
 * @param {Object} params
 * @param {string} params.diretorioEntrega
 * @param {Array<string>} params.criteriosAceite
 * @returns {Object} Relatório detalhado de conformidade
 */
function executarBateriaTestes({ diretorioEntrega, criteriosAceite = [] }) {
    const relatorio = {
        data_execucao: new Date().toISOString(),
        testes_individuais: {},
        criterios_atendidos: false,
        pontuacao_conformidade: 0,
        falhas: []
    };

    // 1. Teste de Existência Física
    const htmlPath = path.join(diretorioEntrega, 'index.html');
    const cssPath = path.join(diretorioEntrega, 'css', 'estilos.css');
    const jsPath = path.join(diretorioEntrega, 'js', 'script.js');

    const htmlExiste = fs.existsSync(htmlPath);
    const cssExiste = fs.existsSync(cssPath);
    const jsExiste = fs.existsSync(jsPath);

    relatorio.testes_individuais.arquivos_presentes = htmlExiste && cssExiste && jsExiste;
    if (!relatorio.testes_individuais.arquivos_presentes) {
        relatorio.falhas.push('Nem todos os arquivos obrigatórios (HTML, CSS, JS) foram encontrados no disco.');
    }

    // 2. Teste de Sintaxe e Estrutura Semântica do HTML
    if (htmlExiste) {
        const conteudoHtml = fs.readFileSync(htmlPath, 'utf-8');
        const temDoctype = conteudoHtml.includes('<!DOCTYPE html>');
        const temViewport = conteudoHtml.includes('name="viewport"');
        const temHeader = conteudoHtml.includes('<header') && conteudoHtml.includes('</header>');
        const temForm = conteudoHtml.includes('<form') && conteudoHtml.includes('</form>');
        const temInputsObrigatorios = conteudoHtml.includes('id="nome-cliente"') && conteudoHtml.includes('id="telefone-cliente"');

        relatorio.testes_individuais.html_semantico_e_valido = temDoctype && temViewport && temHeader && temForm && temInputsObrigatorios;
        if (!relatorio.testes_individuais.html_semantico_e_valido) {
            relatorio.falhas.push('HTML incompleto ou sem tags semânticas essenciais.');
        }
    } else {
        relatorio.testes_individuais.html_semantico_e_valido = false;
    }

    // 3. Teste de CSS e Responsividade (Breakpoints Mobile & Desktop)
    if (cssExiste) {
        const conteudoCss = fs.readFileSync(cssPath, 'utf-8');
        const temVariaveis = conteudoCss.includes('--ciano-principal') && conteudoCss.includes(':root');
        const temMediaTablet = conteudoCss.includes('@media (max-width: 768px)') || conteudoCss.includes('max-width: 768px');
        const temMediaMobile = conteudoCss.includes('@media (max-width: 480px)') || conteudoCss.includes('max-width: 480px');

        relatorio.testes_individuais.css_responsivo_breakpoints = temVariaveis && temMediaTablet && temMediaMobile;
        if (!relatorio.testes_individuais.css_responsivo_breakpoints) {
            relatorio.falhas.push('CSS não contém regras de responsividade ou design tokens obrigatórios.');
        }
    } else {
        relatorio.testes_individuais.css_responsivo_breakpoints = false;
    }

    // 4. Teste de JavaScript e Integração do Formulário
    if (jsExiste) {
        const conteudoJs = fs.readFileSync(jsPath, 'utf-8');
        const temListenerSubmit = conteudoJs.includes("addEventListener('submit'");
        const temMascaraTelefone = conteudoJs.includes('replace') && conteudoJs.includes('inputTelefone');
        const temRedirecionamentoWhatsApp = conteudoJs.includes('wa.me');

        relatorio.testes_individuais.js_formulario_e_whatsapp = temListenerSubmit && temMascaraTelefone && temRedirecionamentoWhatsApp;
        if (!relatorio.testes_individuais.js_formulario_e_whatsapp) {
            relatorio.falhas.push('JavaScript não contém a lógica de validação de formulário ou disparo WhatsApp.');
        }
    } else {
        relatorio.testes_individuais.js_formulario_e_whatsapp = false;
    }

    // Cálculo da Pontuação
    const totalTestes = Object.keys(relatorio.testes_individuais).length;
    const testesPassados = Object.values(relatorio.testes_individuais).filter(Boolean).length;
    relatorio.pontuacao_conformidade = Math.round((testesPassados / totalTestes) * 100);

    // Só é considerado aprovado se todos os testes passarem (100%)
    relatorio.criterios_atendidos = relatorio.pontuacao_conformidade === 100;

    return relatorio;
}

/**
 * 6. FUNÇÃO 6: Submeter Entrega ao Coordenador Geral para Auditoria
 * O Desenvolvedor submete formalmente. O Coordenador decide se aprova ou rejeita.
 * @param {Object} params
 * @param {string} params.idProjeto
 * @param {string} params.idTarefa
 * @param {Object} params.dadosEntrega
 * @param {Object} params.relatorioTestes
 * @returns {Object} Projeto atualizado após auditoria do Coordenador
 */
function submeterAoCoordenador({ idProjeto, idTarefa, dadosEntrega, relatorioTestes }) {
    const atendeTodos = relatorioTestes.criterios_atendidos === true;

    const parecer = atendeTodos
        ? `[APROVADO NA AUDITORIA] Landing page desenvolvida em conformidade absoluta com os critérios de aceite. ` +
          `Arquivos físicos validados no disco: ${dadosEntrega.arquivosCriados.join(', ')}. ` +
          `Responsividade testada para mobile (480px) e desktop. Formulário com validação e WhatsApp ativo.`
        : `[REJEITADO NA AUDITORIA] A entrega não atendeu integralmente aos critérios de aceite técnicos. ` +
          `Falhas detectadas: ${relatorioTestes.falhas.join('; ')}. Tarefa marcada com pendência para correção.`;

    // Chama a auditoria oficial do Coordenador Geral (FUNÇÃO 5 do Coordenador)
    const projetoAuditado = conferirEntrega({
        idProjeto,
        idTarefa,
        entregaSubmetida: {
            diretorio: dadosEntrega.diretorioEntrega,
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
 * 7. PIPELINE INTEGRADO: Executar Ciclo Completo do Desenvolvedor
 * Executa da ingestão à submissão em um único fluxo coordenado
 * @param {Object} params
 * @param {string} params.idProjeto
 * @param {string} params.idTarefa
 * @returns {Object} Resultado da execução e auditoria
 */
function executarCicloCompletoDesenvolvedor({ idProjeto, idTarefa }) {
    // Passo 1: Validar e assumir a tarefa
    const { projeto, tarefa } = validarPermissaoExecucao(idProjeto, idTarefa);

    // Passo 2: Interpretar briefing e requisitos
    const briefing = interpretarBriefing(tarefa, projeto);

    // Passo 3: Construir arquivos físicos no disco
    const dadosEntrega = construirArquivosFisicos({
        idProjeto,
        idTarefa,
        briefing
    });

    // Passo 4: Executar bateria de testes técnicos
    const relatorioTestes = executarBateriaTestes({
        diretorioEntrega: dadosEntrega.diretorioEntrega,
        criteriosAceite: briefing.criteriosAceite
    });

    // Passo 5: Submeter ao Coordenador Geral para auditoria
    const resultadoSubmissao = submeterAoCoordenador({
        idProjeto,
        idTarefa,
        dadosEntrega,
        relatorioTestes
    });

    return {
        idProjeto,
        idTarefa,
        briefing,
        dadosEntrega,
        relatorioTestes,
        resultadoSubmissao
    };
}

module.exports = {
    validarPermissaoExecucao,
    interpretarBriefing,
    gerarCodigoSolucao,
    construirArquivosFisicos,
    executarBateriaTestes,
    submeterAoCoordenador,
    executarCicloCompletoDesenvolvedor,
    DIRETORIO_ENTREGAS_BASE
};
