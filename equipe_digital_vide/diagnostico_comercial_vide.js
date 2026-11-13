/**
 * =====================================================================
 * VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
 * MÓDULO OFICIAL: DIAGNÓSTICO COMERCIAL VIDE
 * Versão 1.0 — Implementação dos 10 Passos Oficiais da VIDE
 * Governança Executiva: Douglas Paz (Diretor Executivo)
 * =====================================================================
 */

const { obterProjetoPorId, salvarProjeto, registrarEvento } = require('./agente_02_coordenador/repositorio_projetos_tarefas');
const { classificarNoCatalogo, SOLUCOES_COMERCIAIS, DIRETRIZES_PRECIFICACAO } = require('./catalogo_solucoes_comerciais');
const { storageService } = require('./storage_service');
const { iaService } = require('./ia_service');

/**
 * Executa o Diagnóstico Comercial VIDE em 10 etapas oficiais
 * @param {Object} params
 * @param {string} params.idProjeto - ID do projeto (ex: 'PRJ-2026-XXXX')
 * @param {Object} [params.dadosNegocio] - Informações fornecidas sobre o cliente
 * @returns {Promise<Object>} Resultado estruturado do diagnóstico
 */
async function executarDiagnosticoComercialVIDE({ idProjeto, dadosNegocio = {} }) {
    const projeto = obterProjetoPorId(idProjeto);
    if (!projeto) {
        throw new Error(`[ERRO_DIAGNOSTICO] Projeto [${idProjeto}] não encontrado no repositório.`);
    }

    const cliente = dadosNegocio.cliente || projeto.cliente || 'Cliente Sem Nome';
    const solicitacao = dadosNegocio.solicitacao || projeto.solicitacao_original || '';
    const segmento = dadosNegocio.segmento || dadosNegocio.nicho || 'Pequeno Negócio / Varejo / Serviços';
    const materiaisAnexados = projeto.materiais_anexados || [];
    const briefingTexto = dadosNegocio.briefing || projeto.briefing_diretoria || '';

    // =========================================================================
    // ETAPA 1 & 2: DADOS INICIAIS, ORGANIZAÇÃO E IDENTIFICAÇÃO DE DADOS AUSENTES
    // =========================================================================
    const textoAnalise = (solicitacao + ' ' + briefingTexto).toLowerCase();
    
    const fatosComprovados = [];
    const informacoesAusentes = [];

    if (solicitacao) {
        fatosComprovados.push(`Demanda inicial declarada pelo cliente: "${solicitacao}".`);
    }
    if (briefingTexto) {
        fatosComprovados.push(`Diretrizes de briefing fornecidas pela Diretoria: "${briefingTexto.substring(0, 150)}...".`);
    }
    if (materiaisAnexados.length > 0) {
        fatosComprovados.push(`${materiaisAnexados.length} materiais/arquivos de referência anexados no storage do projeto.`);
    }

    // Identificação de canais mencionados
    if (textoAnalise.includes('instagram')) fatosComprovados.push('Canal de atração ativo identificado: Instagram (Direct/Stories/Feed).');
    if (textoAnalise.includes('whatsapp')) fatosComprovados.push('Canal de conversão e atendimento ativo identificado: WhatsApp.');
    if (textoAnalise.includes('loja') || textoAnalise.includes('roupa') || textoAnalise.includes('moda')) {
        fatosComprovados.push(`Segmento operacional caracterizado: Comércio Varejista / Moda / Vestuário.`);
    }

    // Mapeamento rigoroso de informações que FALTAM para o dimensionamento
    if (!textoAnalise.includes('ticket') && !textoAnalise.includes('preço') && !textoAnalise.includes('preco') && !textoAnalise.includes('valor')) {
        informacoesAusentes.push('Ticket médio exato das peças/produtos e faturamento mensal estimado.');
    }
    if (!textoAnalise.includes('volume') && !textoAnalise.includes('contatos por dia') && !textoAnalise.includes('leads')) {
        informacoesAusentes.push('Volume diário ou semanal médio de mensagens recebidas no WhatsApp e Instagram.');
    }
    if (!textoAnalise.includes('equipe') && !textoAnalise.includes('atendente') && !textoAnalise.includes('vendedor')) {
        informacoesAusentes.push('Estrutura de atendimento atual: se é conduzido pelo próprio empresário ou equipe dedicada.');
    }
    if (!textoAnalise.includes('catálogo') && !textoAnalise.includes('catalogo') && !textoAnalise.includes('estoque')) {
        informacoesAusentes.push('Existência de catálogo digital organizado de produtos e controle de estoque.');
    }
    if (!textoAnalise.includes('site') && !textoAnalise.includes('landing') && !textoAnalise.includes('domínio')) {
        informacoesAusentes.push('Existência de domínio próprio ou presença web estruturada além das redes sociais.');
    }

    // =========================================================================
    // ETAPA 3: PERGUNTAS COMPLEMENTARES CIRÚRGICAS
    // =========================================================================
    const perguntasComplementares = [
        "1. Quantos novos contatos a loja recebe em média por dia somando Direct do Instagram e WhatsApp?",
        "2. Hoje o atendimento é feito pelo próprio proprietário ou há atendentes/vendedores dedicados?",
        "3. Em qual momento da conversa o cliente costuma parar de responder (ao saber o preço, ao consultar frete ou no momento do pagamento)?",
        "4. A loja já possui fotos profissionais das peças e identidade visual (logotipo vetorizado e paleta de cores)?",
        "5. Qual é o ticket médio das vendas e a meta de crescimento desejada com a VIDE?"
    ];

    // =========================================================================
    // ETAPA 4, 5 & 6: ANÁLISE DAS 4 FRENTES, GARGALOS, PERDAS E FATOS VS HIPÓTESES
    // =========================================================================
    const analisePresencaDigital = {
        diagnostico: textoAnalise.includes('site') || textoAnalise.includes('landing')
            ? "Empresa busca presença web estruturada para centralizar o portfólio."
            : "Dependência excessiva de redes sociais de terceiros (Instagram/WhatsApp) sem ponto de ancoragem próprio e sem página de alta conversão.",
        oportunidade: "Criação de Landing Page de alta velocidade e contraste premium para apresentar coleções e direcionar compras com botão direto para WhatsApp qualificado."
    };

    const analiseAtendimentoProcessos = {
        diagnostico: "Atendimento comercial não estruturado: demora nas respostas, ausência de qualificação inicial de tamanho/gosto e perda de clientes que pedem preço e não recebem acompanhamento.",
        oportunidade: "Implementação de roteiro consultivo de acolhimento rápido, matriz de combate à objeção de preço e régua de follow-up para reengajamento de contatos frios."
    };

    const analiseAutomacaoIntegracoes = {
        diagnostico: "Atividades repetitivas executadas manualmente (envio de fotos repetidas, digitação de dados bancários/PIX, anotação de pedidos soltos).",
        oportunidade: "Fluxo automatizado em n8n conectando formulário/botão da página, triagem com auto-resposta acolhedora, notificação de pedidos e transbordo para humano."
    };

    const analiseInteligenciaDados = {
        diagnostico: "Invisibilidade total de métricas: a loja não sabe quantos leads entraram, quantos desistiram por preço e quanto faturamento foi perdido no mês.",
        oportunidade: "Dashboard executivo centralizando volume de contatos acolhidos, taxa de conversão e valor de receita recuperada."
    };

    const gargalosOperacionais = [
        "Demora no tempo de resposta: leads do Instagram esfriam enquanto aguardam resposta manual.",
        "Falta de processo de follow-up: clientes que perguntam 'qual o valor?' e somem nunca mais são contactados.",
        "Ausência de canal próprio de conversão: falta de uma Landing Page rápida que mostre os diferenciais e gere desejo antes de abrir o chat."
    ];

    const hipotesesPreliminares = [
        "Hipótese A: Pelo menos 40% a 60% dos contatos que não compram estão abandonando a conversa por falta de resposta imediata ou ausência de follow-up estruturado.",
        "Hipótese B: A apresentação precoce do preço antes de gerar percepção de valor diminui a taxa de fechamento em até 35% no varejo de moda.",
        "Hipótese C: Um canal de captação estruturado (Landing Page responsiva) aumentará a qualificação dos clientes antes de chegarem ao WhatsApp."
    ];

    // =========================================================================
    // ETAPA 7: ACIONAMENTO DOS ESPECIALISTAS NECESSÁRIOS
    // =========================================================================
    const especialistasMobilizados = [
        { agente: 'Agente 01', nome: 'Triagem Comercial', papel: 'Acolhimento da demanda e triagem de qualificação' },
        { agente: 'Agente 02', nome: 'Coordenador Geral', papel: 'Governança, planejamento do DAG e auditoria' },
        { agente: 'Agente 04', nome: 'Branding e Design', papel: 'Padronização visual, Design Tokens e identidade' },
        { agente: 'Agente 03', nome: 'Desenvolvedor Full-Stack', papel: 'Landing Page institucional responsiva de alta conversão' },
        { agente: 'Agente 05', nome: 'Atendimento e Vendas', papel: 'Roteiros de qualificação, matriz de objeções e follow-up' },
        { agente: 'Agente 06', nome: 'Automação e Integrações', papel: 'Workflows n8n, webhooks e alertas de novos pedidos' },
        { agente: 'Agente 07', nome: 'Inteligência Comercial', papel: 'Dashboard analítico de conversão e perdas' }
    ];

    // =========================================================================
    // ETAPA 8 & 9: ENQUADRAMENTO NO CATÁLOGO OFICIAL VIDE
    // =========================================================================
    const enquadramento = classificarNoCatalogo(solicitacao + ' ' + briefingTexto);
    const solucaoRecomendada = enquadramento.solucao;

    // =========================================================================
    // ETAPA 10: PROPOSTA COMERCIAL PRELIMINAR COM REGRA DE DIMENSIONAMENTO
    // =========================================================================
    const propostaComercial = {
        cliente,
        solucao_catalogo: solucaoRecomendada.nome,
        subtitulo: solucaoRecomendada.subtitulo,
        resumo_escopo: [
            "Fase 1: Estruturação da Presença Digital com Landing Page responsiva orientada à conversão e alinhamento de branding.",
            "Fase 2: Estruturação dos Roteiros de Atendimento para WhatsApp com matriz das 4 macro-objeções e réguas de follow-up.",
            "Fase 3: Implementação técnica dos fluxos de automação no n8n (alertas de pedidos, auto-resposta acolhedora, transbordo humano).",
            "Fase 4: Implantação de Dashboard de Acompanhamento de Oportunidades e Conversão."
        ],
        entregaveis_oficiais: solucaoRecomendada.entregaveis,
        cronograma_estimado: "Estimativa preliminar: 10 a 15 dias úteis (conforme liberação de acessos e homologação das dependências DAG).",
        diretrizes_investimento: {
            referencia_presenca_digital: DIRETRIZES_PRECIFICACAO.referencia_landing_page,
            regra_automacao_dados: "Sem preço fixo antecipado para automações e dashboards. O investimento total da solução integrada requer dimensionamento prévio das integrações de CRM, volume de mensagens e complexidade técnica.",
            observacao_governanca: "Nenhum trabalho técnico é iniciado antes da aprovação comercial formal expressa da Diretoria Executiva da VIDE e do Cliente."
        }
    };

    // =========================================================================
    // SÍNTESE COM IA GEMINI (SE DISPONÍVEL) PARA PARECER EXECUTIVO REFINADO
    // =========================================================================
    let parecerIaGemini = null;
    try {
        const promptDiagnostico = `Como Coordenador Geral da VIDE, elabore o parecer executivo do Diagnóstico Comercial da VIDE para o cliente "${cliente}" (Segmento: ${segmento}):
Demanda relatada: "${solicitacao}"
Briefing: "${briefingTexto}"
Solução do Catálogo recomendada: "${solucaoRecomendada.nome}" (${solucaoRecomendada.subtitulo})

Forneça:
1. Síntese do Diagnóstico Operacional (gargalos identificados)
2. Separação rigorosa entre Fatos Relatados e Hipóteses a Comprovar
3. Recomendação Estratégica da Solução Integrada VIDE
4. Alinhamento de Governança para a Diretoria Executiva (Douglas)`;

        const resIa = await iaService.gerarTextoIA(
            promptDiagnostico,
            'Você é o Agente 02 (Coordenador Geral) da VIDE — Sistemas de Crescimento Comercial. Rigor executivo, precisão técnica e governança comercial estrita.',
            'COORDENADOR'
        );
        parecerIaGemini = resIa.texto;
    } catch (_) {}

    // =========================================================================
    // GERAÇÃO DOS ARTEFATOS FÍSICOS NO STORAGE DO PROJETO
    // =========================================================================
    const relatorioMd = `# DIAGNÓSTICO COMERCIAL VIDE
## RELATÓRIO EXECUTIVO DE AUDITORIA & OPORTUNIDADES
**Cliente:** ${cliente}  
**Segmento:** ${segmento}  
**Projeto:** [${idProjeto}]  
**Data:** ${new Date().toLocaleDateString('pt-BR')}  
**Coordenação Geral:** Equipe Digital VIDE  
**Governança:** Douglas Paz (Diretor Executivo)  

---

### 1. FATOS COMPROVADOS VS. HIPÓTESES PRELIMINARES

#### Fatos Comprovados (Declarados pelo Cliente/Diretoria)
${fatosComprovados.map(f => `• ${f}`).join('\n')}

#### Informações Ausentes (Pendentes para Dimensionamento Técnico)
${informacoesAusentes.map(i => `• ${i}`).join('\n')}

#### Hipóteses a Validar em Campo
${hipotesesPreliminares.map(h => `• ${h}`).join('\n')}

---

### 2. GARGALOS OPERACIONAIS E PONTOS DE PERDA IDENTIFICADOS
${gargalosOperacionais.map((g, i) => `${i + 1}. **${g}**`).join('\n')}

---

### 3. AVALIAÇÃO DAS 4 FRENTES OPERACIONAIS

* **Presença Digital:** ${analisePresencaDigital.diagnostico}
  * *Oportunidade:* ${analisePresencaDigital.oportunidade}

* **Atendimento e Vendas:** ${analiseAtendimentoProcessos.diagnostico}
  * *Oportunidade:* ${analiseAtendimentoProcessos.oportunidade}

* **Automação e Integrações:** ${analiseAutomacaoIntegracoes.diagnostico}
  * *Oportunidade:* ${analiseAutomacaoIntegracoes.oportunidade}

* **Inteligência Comercial e Dados:** ${analiseInteligenciaDados.diagnostico}
  * *Oportunidade:* ${analiseInteligenciaDados.oportunidade}

---

### 4. PERGUNTAS COMPLEMENTARES DE ALINHAMENTO
${perguntasComplementares.join('\n')}

---

### 5. PARECER DO COORDENADOR GERAL (IA GENERATIVA)
${parecerIaGemini || 'Diagnóstico operacional estruturado com base nos dados do projeto e ativos anexados.'}

---

### 6. RECOMENDAÇÃO OFICIAL DO CATÁLOGO VIDE
* **Solução Recomendada:** **${solucaoRecomendada.nome}** (${solucaoRecomendada.subtitulo})
* **Justificativa:** ${enquadramento.justificativa}
* **Governança:** A esteira técnica dos 7 especialistas permanece em estado **AGUARDANDO_AUTORIZACAO_COMERCIAL** até deliberação e aprovação formal expressa da Diretoria Executiva da VIDE.
`;

    const propostaMd = `# PROPOSTA COMERCIAL PRELIMINAR — VIDE
**Cliente:** ${cliente}  
**Solução:** ${solucaoRecomendada.nome} (${solucaoRecomendada.subtitulo})  
**Projeto:** [${idProjeto}]  
**Validade:** 15 dias  

---

### 1. ESCOPO DA PROPOSTA
${propostaComercial.resumo_escopo.map(e => `• ${e}`).join('\n')}

---

### 2. ENTREGÁVEIS OFICIAIS
${propostaComercial.entregaveis_oficiais.map(ent => `• ${ent}`).join('\n')}

---

### 3. CRONOGRAMA DE EXECUÇÃO
${propostaComercial.cronograma_estimado}

---

### 4. DIRETRIZES DE INVESTIMENTO
* **Presença Digital (Landing Page):** ${DIRETRIZES_PRECIFICACAO.referencia_landing_page}
* **Automação Comercial, Dados e Integrações:** ${propostaComercial.diretrizes_investimento.regra_automacao_dados}
* **Regra de Governança:** ${propostaComercial.diretrizes_investimento.observacao_governanca}
`;

    // Gravação física no storage durável
    storageService.salvarArquivo(idProjeto, 'diagnostico_comercial', 'DIAGNOSTICO_COMERCIAL_VIDE.md', relatorioMd);
    storageService.salvarArquivo(idProjeto, 'diagnostico_comercial', 'PROPOSTA_COMERCIAL_PRELIMINAR.md', propostaMd);

    // Atualização do Projeto
    projeto.diagnostico_comercial = {
        concluido: true,
        data_diagnostico: new Date().toISOString(),
        solucao_recomendada: solucaoRecomendada.nome,
        solucao_codigo: solucaoRecomendada.codigo,
        fatos_comprovados: fatosComprovados,
        informacoes_ausentes: informacoesAusentes,
        perguntas_complementares: perguntasComplementares,
        gargalos_identificados: gargalosOperacionais,
        proposta_comercial: propostaComercial,
        arquivos_gerados: [
            'diagnostico_comercial/DIAGNOSTICO_COMERCIAL_VIDE.md',
            'diagnostico_comercial/PROPOSTA_COMERCIAL_PRELIMINAR.md'
        ]
    };

    salvarProjeto(projeto);
    registrarEvento(idProjeto, `Diagnóstico Comercial VIDE concluído com sucesso pelo Coordenador Geral. Solução recomendada: ${solucaoRecomendada.nome}.`);

    return {
        sucesso: true,
        id_projeto: idProjeto,
        cliente,
        solucao_recomendada: solucaoRecomendada.nome,
        fatos_comprovados: fatosComprovados,
        informacoes_ausentes: informacoesAusentes,
        perguntas_complementares: perguntasComplementares,
        gargalos_identificados: gargalosOperacionais,
        proposta_comercial: propostaComercial,
        parecer_coordenador: parecerIaGemini,
        arquivos_gerados: [
            'diagnostico_comercial/DIAGNOSTICO_COMERCIAL_VIDE.md',
            'diagnostico_comercial/PROPOSTA_COMERCIAL_PRELIMINAR.md'
        ]
    };
}

module.exports = {
    executarDiagnosticoComercialVIDE
};
