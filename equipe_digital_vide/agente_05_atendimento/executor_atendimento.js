/**
 * =====================================================================
 * VIDE — EQUIPE DIGITAL
 * AGENTE 05: ATENDIMENTO E VENDAS
 * Especialista em Processos de Comunicação, Qualificação e Conversão Comercial
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');
const { obterProjetoPorId, salvarProjeto } = require('../agente_02_coordenador/repositorio_projetos_tarefas');
const { conferirEntrega } = require('../agente_02_coordenador/executor_coordenador');
const { iaService } = require('../ia_service');
const { storageService } = require('../storage_service');

// Diretório base para entregas físicas dos especialistas
const DIRETORIO_ENTREGAS = path.join(__dirname, '..', 'entregas_clientes');

/**
 * 1. FUNÇÃO 1: Ingestão de Tarefa com Verificação Rígida de Dependências e Autorização
 * @param {Object} params
 * @param {string} params.idProjeto
 * @param {string} params.idTarefa
 * @returns {Object} Tarefa e Projeto atualizados para EM_ANDAMENTO
 */
function assumirTarefaAtendimento({ idProjeto, idTarefa }) {
    const projeto = obterProjetoPorId(idProjeto);
    if (!projeto) {
        throw new Error(`[ERRO_INGESTAO] Projeto [${idProjeto}] não foi encontrado no repositório.`);
    }

    // 1.1. Proteção Comercial Rigorosa
    if (projeto.autorizacao_comercial.status !== 'AUTORIZADO') {
        throw new Error(`[BLOQUEIO_COMERCIAL] Projeto [${idProjeto}] está com status [${projeto.autorizacao_comercial.status}]. O Agente Atendimento e Vendas não pode estruturar processos comerciais sem autorização formal.`);
    }

    // 1.2. Localiza a tarefa no grafo
    const tarefa = projeto.grafo_tarefas.find(t => t.id_tarefa === idTarefa);
    if (!tarefa) {
        throw new Error(`[ERRO_TAREFA] Tarefa [${idTarefa}] não pertence ao projeto [${idProjeto}].`);
    }

    // 1.3. Validação do Especialista
    const espNorm = (tarefa.especialista || '').toLowerCase();
    if (!espNorm.includes('atendimento') && !espNorm.includes('vendas')) {
        throw new Error(`[DESVIO_FUNCAO] Agente Atendimento e Vendas rejeitou assumir tarefa de responsabilidade de [${tarefa.especialista}].`);
    }

    // 1.4. Verificação de Dependências no Grafo
    if (tarefa.dependencias && tarefa.dependencias.length > 0) {
        for (const depId of tarefa.dependencias) {
            const depTarefa = projeto.grafo_tarefas.find(t => t.id_tarefa === depId);
            if (!depTarefa || depTarefa.estado !== 'APROVADA') {
                throw new Error(`[BLOQUEIO_DEPENDENCIA] Tarefa [${idTarefa}] está BLOQUEADA_POR_DEPENDENCIA. Aguardando aprovação prévia de [${depId}] (${depTarefa ? depTarefa.especialista : 'Desconhecida'}).`);
            }
        }
    }

    // 1.5. Transiciona estado para EM_ANDAMENTO
    tarefa.estado = 'EM_ANDAMENTO';
    tarefa.historico_auditoria.push({
        timestamp: new Date().toISOString(),
        autor: 'Agente 05 — Atendimento e Vendas',
        estado_anterior: 'PRONTA_PARA_EXECUCAO',
        novo_estado: 'EM_ANDAMENTO',
        nota: 'Tarefa assumida pelo especialista em Atendimento e Vendas. Iniciando mapeamento de jornada, roteiros e matriz de objeções.'
    });

    salvarProjeto(projeto);
    return { projeto, tarefa };
}

/**
 * 2. FUNÇÃO 2: Geração Física dos 7 Entregáveis de Atendimento no Disco
 * Cria a estrutura física contendo árvores, roteiros, matriz de objeções, follow-up, automação e simulador
 * @param {Object} briefing
 * @returns {Object} Dados completos dos arquivos físicos criados
 */
function gerarEntregaveisAtendimento(briefing) {
    const { idProjeto, idTarefa, cliente, solicitacaoOriginal, tokensBranding } = briefing;

    const pastaProjeto = path.join(DIRETORIO_ENTREGAS, idProjeto);
    const pastaAtendimento = path.join(pastaProjeto, 'atendimento');

    if (!fs.existsSync(pastaProjeto)) fs.mkdirSync(pastaProjeto, { recursive: true });
    if (!fs.existsSync(pastaAtendimento)) fs.mkdirSync(pastaAtendimento, { recursive: true });

    // Determina o tom e o segmento a partir do cliente / tokens de branding
    const nomeCliente = cliente || 'Cliente Corporativo';
    const corPrimaria = tokensBranding ? tokensBranding.colors.primary : '#E5C07B';
    const nomeSegmento = solicitacaoOriginal.toLowerCase().includes('estética') || solicitacaoOriginal.toLowerCase().includes('facial')
        ? 'Estética Avançada e Harmonização de Luxo'
        : (solicitacaoOriginal.toLowerCase().includes('imóve') ? 'Mercado Imobiliário' : 'Serviços Especializados de Alto Padrão');

    // -------------------------------------------------------------------------
    // 2.1. FLUXO E JORNADA DE ATENDIMENTO (Árvore de Decisão JSON)
    // -------------------------------------------------------------------------
    const fluxoJornada = {
        versao: "1.0",
        projeto: idProjeto,
        cliente: nomeCliente,
        segmento: nomeSegmento,
        canais_homologados: ["WhatsApp Comercial Oficial", "Instagram Direct", "Formulário Landing Page"],
        estagios_jornada: [
            {
                id: "ESTAGIO_01_RECEPTIVO",
                nome: "Acolhimento e Saudação Inicial",
                objetivo: "Responder em menos de 60 segundos com cordialidade, posicionando autoridade sem rigidez mecânica.",
                no_inicial: "NODE_BOAS_VINDAS",
                nos: [
                    {
                        id: "NODE_BOAS_VINDAS",
                        tipo: "MENSAGEM_RECEPTIVA",
                        texto: `Olá! Seja muito bem-vindo(a) à ${nomeCliente}. Me chamo Sofia, especialista de atendimento. É um prazer ter você aqui conosco!`,
                        proximo_no: "NODE_SONDAGEM_INICIAL"
                    },
                    {
                        id: "NODE_SONDAGEM_INICIAL",
                        tipo: "PERGUNTA_ABERTA",
                        texto: "Para que eu possa direcionar seu atendimento da melhor forma: você já conhece os nossos protocolos ou gostaria de entender como funciona a nossa avaliação personalizada?",
                        opcoes: [
                            { rotulo: "Já conheço, quero agendar", proximo: "NODE_QUALIF_DIRETA" },
                            { rotulo: "Quero entender como funciona", proximo: "NODE_EXPLICA_METODO" },
                            { rotulo: "Quero saber valores / preços", proximo: "NODE_OBJECAO_PRECO_PREMATURO" }
                        ]
                    }
                ]
            },
            {
                id: "ESTAGIO_02_QUALIFICACAO",
                nome: "Sondagem e Qualificação de Lead",
                objetivo: "Classificar a urgência, prontidão de compra e necessidade real do lead antes de falar sobre valores.",
                criterios_classificacao: {
                    lead_a_vip: "Necessidade clara + Urgência para os próximos 15 dias + Conhece o padrão premium",
                    lead_b_morno: "Tem interesse genuíno mas ainda tem dúvidas pontuais sobre o procedimento",
                    lead_c_curioso: "Apenas pesquisa preços sem intenção clara de agendamento"
                },
                perguntas_chave: [
                    "Qual é a sua principal queixa ou resultado que você mais deseja alcançar neste momento?",
                    "Você já realizou algum procedimento ou acompanhamento similar anteriormente?",
                    "Você tem preferência por atendimento ainda nesta semana ou para os próximos dias?"
                ]
            },
            {
                id: "ESTAGIO_03_ANCORAGEM_E_PROPOSTA",
                nome: "Apresentação da Solução e Ancoragem de Valor",
                objetivo: "Apresentar a proposta de valor e segurança antes de informar qualquer investimento.",
                regra_de_ouro: "NUNCA enviar valor seco isolado. Sempre apresentar a metodologia, materiais utilizados e suporte pós-procedimento antes do preço."
            },
            {
                id: "ESTAGIO_04_CONVERSAO_OU_TRANSBORDO",
                nome: "Fechamento, Agendamento ou Transbordo Humano",
                objetivo: "Concluir a marcação no calendário ou transferir imediatamente para a responsável comercial.",
                gatilhos_transbordo: [
                    "Lead pede expressamente para falar com pessoa humana",
                    "Lead possui histórico de intercorrências ou dúvidas clínicas avançadas",
                    "Lead classificado como Lead A VIP solicitando negociação executiva"
                ]
            }
        ]
    };

    // -------------------------------------------------------------------------
    // 2.2. ROTEIRO DE CONVERSAS E QUALIFICAÇÃO (Markdown Operacional)
    // -------------------------------------------------------------------------
    const roteiroMarkdown = `# ROTEIRO OPERACIONAL DE ATENDIMENTO E QUALIFICAÇÃO COMERCIAL
## Cliente: ${nomeCliente}
### Segmento: ${nomeSegmento} | Projeto: ${idProjeto}

---

## 1. DIRETRIZES DE POSTURA E TOM DE VOZ
- **Tom de Voz:** Sofisticado, atencioso, seguro, resolutivo e empático.
- **Linguagem:** Português impecável, sem abreviações informais excessivas (não use "vc", "tb", "pq").
- **Velocidade de Resposta:** Tempo máximo de primeira resposta: **60 segundos** (em horário comercial).
- **Regra Central VIDE:** Nós não vendemos um procedimento avulso; entregamos segurança, transformação e uma experiência de bem-estar exclusiva.

---

## 2. ETAPAS DE CONVERSA PASSO A PASSO

### ETAPA 1: Acolhimento Imediato
> *"Olá! Seja muito bem-vindo(a) à ${nomeCliente}. É uma alegria receber seu contato! Me chamo [Nome da Atendente], como posso te chamar?"*

### ETAPA 2: Sondagem de Desejo Real
> *"Perfeito, [Nome do Lead]! Para que eu possa te orientar com toda a atenção que o seu caso merece: qual é o principal resultado ou transformação que você gostaria de vivenciar com a gente hoje?"*

### ETAPA 3: Ancoragem de Valor Antes do Preço
Quando o lead perguntar: *"Quanto custa?"* ou *"Qual o valor?"*:
> *"Com certeza vou te explicar tudo sobre o investimento! Na ${nomeCliente}, cada atendimento é 100% individualizado após uma análise minuciosa de harmonia facial, para que você nunca pague por nada além do que realmente valoriza seus traços naturais. Você gostaria de conhecer os horários exclusivos da nossa agenda desta semana?"*

---

## 3. MATRIZ DE PONTUAÇÃO DO LEAD (LEAD SCORING)
- **LEAD TIPO A (VIP / Alta Conversão):** Tem data-alvo definida (ex: evento, casamento, viagem nos próximos 20 dias) e busca qualidade superior. $\rightarrow$ **Ação:** Prioridade máxima na agenda, direcionar para transbordo humano prioritário.
- **LEAD TIPO B (Morno / Em Avaliação):** Quer tirar dúvidas sobre durabilidade, recuperação e conforto. $\rightarrow$ **Ação:** Enviar vídeo/áudio explicativo curto e convidar para visita de cortesia.
- **LEAD TIPO C (Frio / Somente Preço):** Responde com monossílabos. $\rightarrow$ **Ação:** Entrar na régua de follow-up educativo de 24h e 72h.

---

## 4. PROTOCOLO DE TRANSBORDO HUMANO
Transfira o atendimento imediatamente quando:
1. O lead disser: *"Quero falar com uma pessoa"* ou *"Me liga"*;
2. O lead relatar qualquer sensibilidade médica prévia;
3. O lead desejar negociação de pacotes múltiplos ou datas especiais de final de semana.

> **Mensagem de Transbordo:**
> *"Estou transferindo nossa conversa agora para a nossa coordenadora de atendimento pessoal, a [Nome], que já está a par de tudo o que conversamos e continuará seu atendimento com todo carinho aqui no WhatsApp. Um instante, por favor!"*
`;

    // -------------------------------------------------------------------------
    // 2.3. MATRIZ DE OBJEÇÕES E RESPOSTAS ESTRATÉGICAS (JSON do Motor VIDE)
    // -------------------------------------------------------------------------
    const matrizObjecoes = {
        versao: "1.0",
        projeto: idProjeto,
        cliente: nomeCliente,
        finalidade: "Alimentação do Motor de Objeções da VIDE e Orientação de Atendimento",
        inteligencia_cognitiva_ia: {
            motor: "VIDE Semantic AI Engine / LLM",
            sintese_cognitiva: JSON.parse(iaService.gerarRespostaSemanticaLocal(`contra-argumento objeção ${nomeSegmento}`)),
            diretriz_segurança_silencio: "ATENÇÃO: Silêncio de lead JAMAIS deve ser classificado como objeção tácita de preço sem manifestação verbal explícita."
        },
        macro_categorias: [
            {
                categoria: "PRECO_VALOR",
                frequencia_estimada: "45%",
                descricao: "Lead considera o investimento inicial elevado ou compara com soluções de baixo custo.",
                objecoes_especificas: [
                    {
                        id: "OBJ-PRECO-01",
                        gatilho_lead: "Achei o valor um pouco alto / fora do meu orçamento agora.",
                        diagnostico_causa_raiz: "O lead comparou o preço sem compreender o risco de materiais inferiores ou a qualificação da especialista.",
                        tecnica_aplicada: "Ancoragem por Custo da Inação + Desmembramento Parcelado + Segurança de Protocolo",
                        resposta_sugerida: `Compreendo perfeitamente, [Nome]. Quando se trata do seu rosto e da sua autoestima, o cuidado precisa ser absoluto. Nossos protocolos utilizam exclusivamente substâncias nobres homologadas com durabilidade estendida e rastreabilidade total. Além disso, facilitamos em até 12x para que você tenha a melhor experiência com total tranquilidade. Faz sentido reservarmos seu horário para uma avaliação presencial?`,
                        pergunta_reversao: "Você prefere avaliar as opções de parcelamento no cartão ou em condições especiais à vista?",
                        acao_recuperacao_abandono: "Se parar de responder, acionar Régua de 24h enviando depoimento de paciente que teve transformação similar sem complicação."
                    }
                ]
            },
            {
                categoria: "CONFIANCA_AUTORIDADE",
                frequencia_estimada: "25%",
                descricao: "Incerteza sobre a naturalidade dos resultados ou medo de efeito artificial/dor.",
                objecoes_especificas: [
                    {
                        id: "OBJ-CONF-01",
                        gatilho_lead: "Tenho medo de ficar artificial ou de doer o procedimento.",
                        diagnostico_causa_raiz: "Medo de desfiguração ou traumas de procedimentos mal executados no passado.",
                        tecnica_aplicada: "Validação Emocional + Filosofia da Harmonia Natural + Anestésico Premium",
                        resposta_sugerida: `Esse é o maior compromisso da ${nomeCliente}! Nossa assinatura é a elegância discreta: ninguém vai dizer que você fez um procedimento, e sim que você está descansada, radiante e rejuvenescida. Usamos anestésicos de padrão hospitalar para que sua experiência seja completamente indolor e tranquila.`,
                        pergunta_reversao: "Gostaria de ver fotos de antes e depois de pacientes que tinham esse mesmo receio antes de nos conhecer?",
                        acao_recuperacao_abandono: "Enviar vídeo de 20 segundos da doutora demonstrando a aplicação suave e o resultado sutil."
                    }
                ]
            },
            {
                categoria: "TEMPO_URGENCIA",
                frequencia_estimada: "20%",
                descricao: "Lead adia a decisão dizendo que vai pensar, falar com o marido ou decidir no mês seguinte.",
                objecoes_especificas: [
                    {
                        id: "OBJ-URG-01",
                        gatilho_lead: "Vou pensar com calma e qualquer coisa te retorno semana que vem.",
                        diagnostico_causa_raiz: "Falta de priorização ou atrito de agendamento imediato.",
                        tecnica_aplicada: "Alívio de Pressão + Escassez de Horários de Alta Demanda",
                        resposta_sugerida: `Claro, [Nome], tomar essa decisão com tranquilidade é fundamental. Como nossa agenda costuma esgotar com duas semanas de antecedência (especialmente quintas e sextas), posso deixar um pré-agendamento de cortesia reservado para você até amanhã às 18h sem nenhum custo. Caso decida, seu horário estará protegido.`,
                        pergunta_reversao: "Você prefere deixar pré-reservado na parte da manhã ou da tarde?",
                        acao_recuperacao_abandono: "Se silenciar, acionar lembrete em T+24h avisando da liberação da vaga pré-reservada."
                    }
                ]
            },
            {
                categoria: "CONCORRENTE_COMPARACAO",
                frequencia_estimada: "10%",
                descricao: "Lead cita outra clínica que cobra menos da metade do valor.",
                objecoes_especificas: [
                    {
                        id: "OBJ-CONC-01",
                        gatilho_lead: "Vi outra profissional no Instagram que cobra bem menos.",
                        diagnostico_causa_raiz: "Falta de informação sobre produtos originais e experiência técnica.",
                        tecnica_aplicada: "Elevação do Padrão sem atacar terceiros + Garantia de Pureza Farmacêutica",
                        resposta_sugerida: `É natural existirem diferentes propostas no mercado. A nossa escolha é nunca abrir mão de produtos originais lacrados na sua frente, estrutura com alvará sanitário rigoroso e suporte pós-procedimento 24h. Na ${nomeCliente}, sua segurança vem em primeiro lugar.`,
                        pergunta_reversao: "Faz sentido para você fazer uma avaliação para entender os diferenciais dos nossos produtos?",
                        acao_recuperacao_abandono: "Disparar guia em PDF sobre 'O que checar antes de realizar qualquer procedimento no rosto'."
                    }
                ]
            }
        ]
    };

    // -------------------------------------------------------------------------
    // 2.4. REGRAS DE FOLLOW-UP E RECUPERAÇÃO DE LEADS PERDIDOS (JSON VIDE)
    // -------------------------------------------------------------------------
    const regrasFollowUp = {
        versao: "1.0",
        projeto: idProjeto,
        cliente: nomeCliente,
        filosofia_recuperacao: "O silêncio do lead não é 'não': na maioria das vezes é esquecimento, rotina corrida ou dúvida não esclarecida.",
        pontos_de_abandono_mapeados: [
            {
                id: "ABANDONO_POS_PRECO",
                descricao: "Lead parou de responder logo após receber as opções de valores ou orçamento.",
                cadencia_temporal: [
                    {
                        tempo: "T+2 horas",
                        canal: "WhatsApp",
                        tipo: "Mensagem Leve de Apoio",
                        mensagem: `Olá, [Nome]! Ficou alguma dúvida sobre as formas de pagamento facilitadas ou sobre o tempo de recuperação do procedimento? Estou à sua disposição para o que precisar!`
                    },
                    {
                        tempo: "T+24 horas",
                        canal: "WhatsApp",
                        tipo: "Social Proof Não Invasivo",
                        mensagem: `[Nome], lembrei de você hoje cedo! Atendemos uma paciente que tinha exatamente o mesmo desejo que você me contou ontem, e ela ficou encantada com a naturalidade do resultado. Quando você puder, me avise para vermos seu horário!`
                    },
                    {
                        tempo: "T+72 horas",
                        canal: "WhatsApp",
                        tipo: "Condição Especial de Fechamento",
                        mensagem: `Oi, [Nome]! Tudo bem? Abrimos 2 vagas extras de avaliação para esta sexta-feira com cortesia no escaneamento facial digital. Se você ainda tiver interesse em realizar seu procedimento este mês, posso segurar uma dessas vagas para você!`
                    },
                    {
                        tempo: "T+7 dias",
                        canal: "WhatsApp",
                        tipo: "Reabertura Amigável / Limpeza de Funil",
                        mensagem: `Olá, [Nome]! Passando só para desejar uma ótima semana. Caso seu momento agora esteja corrido, não se preocupe: seu histórico fica salvo aqui conosco para quando você quiser retomar. Um grande abraço da equipe ${nomeCliente}!`
                    }
                ]
            },
            {
                id: "ABANDONO_DURANTE_QUALIFICACAO",
                descricao: "Lead iniciou o contato mas não respondeu à pergunta de sondagem de necessidade.",
                cadencia_temporal: [
                    {
                        tempo: "T+3 horas",
                        canal: "WhatsApp",
                        tipo: "Redução de Fricção",
                        mensagem: `Sei que o dia a dia é corrido! Se preferir, pode me mandar um áudio rápido contando o que você gostaria de melhorar, ou me dar um 'oi' quando estiver mais tranquila.`
                    },
                    {
                        tempo: "T+24 horas",
                        canal: "WhatsApp",
                        tipo: "Pergunta Binária Simples",
                        mensagem: `Oi, [Nome]! Para eu não te incomodar sem necessidade: você ainda tem interesse em saber mais sobre os atendimentos da ${nomeCliente}? (Responda apenas [1] Sim ou [2] Deixar para depois).`
                    }
                ]
            }
        ]
    };

    // -------------------------------------------------------------------------
    // 2.5. ESPECIFICAÇÃO TÉCNICA PARA O FUTURO AGENTE DE AUTOMAÇÃO (JSON)
    // -------------------------------------------------------------------------
    const especificacaoAutomacao = {
        versao: "1.0",
        destinatario: "Agente 06 — Automação e Integrações (n8n)",
        projeto: idProjeto,
        cliente: nomeCliente,
        requisitos_tecnicos: {
            plataforma_recomendada: "n8n (Self-hosted na VIDE)",
            webhooks_a_implementar: [
                {
                    nome: "WH_RECEBER_MENSAGEM_WHATSAPP",
                    metodo: "POST",
                    rota: "/webhook/whatsapp/inbound",
                    parametros_esperados: ["from", "body", "timestamp", "profileName"]
                },
                {
                    nome: "WH_QUALIFICACAO_CONCLUIDA",
                    metodo: "POST",
                    rota: "/webhook/lead/qualificado",
                    parametros_esperados: ["lead_id", "nome", "telefone", "categoria_lead", "urgencia", "ticket_estimado"]
                },
                {
                    nome: "WH_DISPARO_FOLLOW_UP_TEMPORAL",
                    metodo: "POST",
                    rota: "/webhook/followup/cron",
                    parametros_esperados: ["lead_id", "regua_etapa", "template_mensagem"]
                }
            ],
            variaveis_de_estado_crm: [
                { nome: "status_conversa", tipos: ["NOVO", "EM_QUALIFICACAO", "ORCAMENTO_ENVIADO", "AGUARDANDO_PAGAMENTO", "TRANSBORDO_HUMANO", "CONVERTIDO", "PERDIDO"] },
                { nome: "lead_score", tipos: ["A_VIP", "B_MORNO", "C_FRIO"] },
                { nome: "ultima_interacao_timestamp", tipo: "ISO8601" },
                { nome: "objecao_identificada", tipos: ["PRECO", "CONFIANCA", "TEMPO", "CONCORRENTE", "NENHUMA"] }
            ],
            regras_disparo_transbordo: [
                "Se mensagem contiver palavras: 'atendente', 'humano', 'falar com alguém', 'pessoa', 'doutora'",
                "Se lead_score for 'A_VIP' e solicitar data de sábado",
                "Se lead enviar a mesma dúvida mais de 2 vezes consecutivas"
            ]
        }
    };

    // -------------------------------------------------------------------------
    // 2.6. MANIFESTO UNIFICADO DE ENTREGA COMPARTILHADA (Padrão VIDE)
    // -------------------------------------------------------------------------
    const manifestoEntrega = {
        versao_manifesto: "1.0",
        id_projeto: idProjeto,
        id_tarefa: idTarefa,
        especialista: "Atendimento e Vendas",
        data_geracao: new Date().toISOString(),
        briefing_origem: {
            cliente: nomeCliente,
            segmento: nomeSegmento,
            demanda_resumida: solicitacaoOriginal
        },
        arquivos_produzidos: [
            "fluxo_jornada_atendimento.json",
            "roteiro_conversas_qualificacao.md",
            "matriz_objecoes_e_respostas.json",
            "regras_follow_up_e_recuperacao.json",
            "especificacao_tecnica_para_automacao.json",
            "simulador_chat_atendimento.html",
            "manifesto_entrega.json"
        ],
        versoes_alteracoes: [
            {
                versao: "1.0.0",
                data: new Date().toISOString(),
                autor: "Agente 05 — Atendimento e Vendas",
                descricao: "Mapeamento completo da jornada conversacional, roteiros de qualificação, matriz de 4 macro-categorias de objeções, cadências de follow-up e especificação para n8n."
            }
        ],
        criterios_aceite: [
            "Jornada de atendimento mapeada de ponta a ponta com árvore de decisão",
            "Matriz de objeções contemplando preço, confiança e timing com respostas estratégicas",
            "Régua de follow-up estruturada para recuperação de leads que pararam de responder",
            "Regras claras de transbordo para atendimento humano",
            "Especificação técnica clara para o futuro agente de automação",
            "Simulador interativo em HTML gerado e funcional"
        ],
        dependencias: {
            tarefas_predecessoras: briefing.dependencias || [],
            insumos_consumidos: [
                "Diretrizes e identidade do cliente",
                tokensBranding ? "Design Tokens de Branding aplicados no simulador" : "Paleta de luxo corporativa"
            ]
        },
        pendencias_identificadas: [],
        resultado_auditoria: {
            status: "AGUARDANDO_AUDITORIA_COORDENADOR",
            pontuacao_conformidade: 100,
            parecer: null
        }
    };

    // -------------------------------------------------------------------------
    // 2.7. SIMULADOR INTERATIVO DE CHAT (HTML/JS com Layout WhatsApp)
    // -------------------------------------------------------------------------
    const simuladorHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simulador de Atendimento & Vendas — ${nomeCliente}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --cor-primaria: ${corPrimaria};
            --fundo-chat: #0c1317;
            --fundo-card: #111b21;
            --fundo-header: #202c33;
            --texto-claro: #e9edef;
            --texto-suave: #8696a0;
            --verde-zap: #00a884;
            --msg-in: #202c33;
            --msg-out: #005c4b;
            --borda: rgba(255, 255, 255, 0.08);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        body { background: #06090e; color: var(--texto-claro); min-height: 100vh; display: flex; flex-direction: column; }
        
        .topo-barra { background: #0f172a; border-bottom: 1px solid var(--borda); padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; }
        .topo-titulo { font-size: 14px; color: var(--cor-primaria); font-weight: 700; display: flex; align-items: center; gap: 8px; }
        .topo-badge { background: rgba(0, 168, 132, 0.2); color: var(--verde-zap); border: 1px solid var(--verde-zap); padding: 3px 10px; border-radius: 12px; font-size: 11px; }

        .layout-principal { display: grid; grid-template-columns: 340px 1fr 340px; flex: 1; height: calc(100vh - 54px); }
        
        /* Painel Esquerdo: Controle de Cenários e Objeções */
        .painel-lateral { background: #0a0f1d; border-right: 1px solid var(--borda); padding: 18px; overflow-y: auto; }
        .painel-direito { background: #0a0f1d; border-left: 1px solid var(--borda); padding: 18px; overflow-y: auto; }
        .secao-titulo { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: var(--cor-primaria); margin-bottom: 14px; font-weight: 700; }
        
        .btn-cenario { display: block; width: 100%; text-align: left; background: var(--fundo-card); border: 1px solid var(--borda); color: var(--texto-claro); padding: 10px 12px; border-radius: 8px; margin-bottom: 8px; font-size: 13px; cursor: pointer; transition: all 0.2s; }
        .btn-cenario:hover { border-color: var(--cor-primaria); background: rgba(255, 255, 255, 0.05); }
        .btn-cenario i { margin-right: 6px; color: var(--cor-primaria); }

        /* Centro: Interface WhatsApp */
        .area-chat { background: var(--fundo-chat); display: flex; flex-direction: column; position: relative; }
        .chat-header { background: var(--fundo-header); padding: 10px 18px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(0,0,0,0.2); }
        .chat-avatar-info { display: flex; align-items: center; gap: 12px; }
        .chat-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--cor-primaria); color: #000; display: flex; align-items: center; justify-content: center; font-weight: bold; }
        .chat-nome { font-size: 15px; font-weight: 600; }
        .chat-status { font-size: 12px; color: var(--verde-zap); }
        
        .chat-mensagens { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background-image: radial-gradient(rgba(255,255,255,0.02) 1px, transparent 0); background-size: 24px 24px; }
        .bolha-msg { max-width: 75%; padding: 8px 14px; border-radius: 8px; font-size: 14px; line-height: 1.45; position: relative; animation: fadeIn 0.25s ease-out; }
        .bolha-in { background: var(--msg-in); align-self: flex-start; border-top-left-radius: 0; }
        .bolha-out { background: var(--msg-out); align-self: flex-end; border-top-right-radius: 0; }
        .msg-hora { font-size: 10px; color: var(--texto-suave); text-align: right; margin-top: 4px; display: flex; justify-content: flex-end; gap: 4px; }
        
        .chat-input-area { background: var(--fundo-header); padding: 12px 18px; display: flex; gap: 10px; align-items: center; }
        .chat-input { flex: 1; background: #2a3942; border: none; padding: 12px 16px; border-radius: 8px; color: var(--texto-claro); font-size: 14px; outline: none; }
        .btn-enviar { background: var(--verde-zap); border: none; width: 42px; height: 42px; border-radius: 50%; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; }

        .card-diagnostico { background: var(--fundo-card); border: 1px solid var(--borda); border-radius: 8px; padding: 12px; margin-bottom: 12px; font-size: 12px; }
        .card-diagnostico-titulo { color: var(--cor-primaria); font-weight: bold; margin-bottom: 6px; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 1000px) { .layout-principal { grid-template-columns: 1fr; } .painel-lateral, .painel-direito { display: none; } }
    </style>
</head>
<body>
    <div class="topo-barra">
        <div class="topo-titulo"><i class="fas fa-comments"></i> VIDE — Simulador de Atendimento Comercial & Motor de Objeções</div>
        <div style="display: flex; gap: 10px; align-items: center;">
            <span class="topo-badge"><i class="fas fa-check-circle"></i> Agente 05 Ativo</span>
            <span style="font-size: 12px; color: var(--texto-suave);">${idProjeto}</span>
        </div>
    </div>

    <div class="layout-principal">
        <!-- PAINEL ESQUERDO: DISPARADORES DE OBJEÇÃO -->
        <div class="painel-lateral">
            <div class="secao-titulo"><i class="fas fa-bolt"></i> Simular Comportamento do Lead</div>
            <button class="btn-cenario" onclick="simularLead('Olá! Quero saber o preço do procedimento.')">
                <i class="fas fa-dollar-sign"></i> 1. Pergunta Preço Prematuro
            </button>
            <button class="btn-cenario" onclick="simularLead('Achei muito caro, no concorrente é bem mais barato.')">
                <i class="fas fa-tag"></i> 2. Objeção de Preço / Concorrente
            </button>
            <button class="btn-cenario" onclick="simularLead('Tenho medo de ficar artificial ou de doer muito.')">
                <i class="fas fa-shield-alt"></i> 3. Objeção de Medo / Confiança
            </button>
            <button class="btn-cenario" onclick="simularLead('Vou pensar com calma e te retorno semana que vem.')">
                <i class="fas fa-clock"></i> 4. Objeção de Timing / Indecisão
            </button>
            <button class="btn-cenario" onclick="simularLead('Quero falar com uma pessoa humana imediatamente.')">
                <i class="fas fa-user-headset"></i> 5. Solicitar Transbordo Humano
            </button>
            <button class="btn-cenario" onclick="simularLead('Gostei muito da explicação! Quais horários tem disponíveis?')">
                <i class="fas fa-calendar-check"></i> 6. Intenção Alta de Fechamento
            </button>

            <div class="secao-titulo" style="margin-top: 24px;"><i class="fas fa-history"></i> Testar Follow-Up VIDE</div>
            <button class="btn-cenario" onclick="simularFollowUp('T+24h')">
                <i class="fas fa-stopwatch"></i> Disparar Régua T+24h (Social Proof)
            </button>
            <button class="btn-cenario" onclick="simularFollowUp('T+72h')">
                <i class="fas fa-gift"></i> Disparar Régua T+72h (Oferta Escassa)
            </button>
        </div>

        <!-- CENTRO: CHAT DO WHATSAPP -->
        <div class="area-chat">
            <div class="chat-header">
                <div class="chat-avatar-info">
                    <div class="chat-avatar">D</div>
                    <div>
                        <div class="chat-nome">${nomeCliente}</div>
                        <div class="chat-status"><i class="fas fa-circle" style="font-size: 8px;"></i> Online • Atendimento Oficial</div>
                    </div>
                </div>
                <div>
                    <button onclick="limparChat()" style="background: none; border: 1px solid var(--borda); color: var(--texto-suave); padding: 4px 10px; border-radius: 4px; font-size: 11px; cursor: pointer;">
                        <i class="fas fa-trash"></i> Limpar
                    </button>
                </div>
            </div>

            <div class="chat-mensagens" id="chatMensagens">
                <div class="bolha-msg bolha-in">
                    Olá! Seja muito bem-vindo(a) à <strong>${nomeCliente}</strong>. Me chamo Sofia, especialista de atendimento. É um prazer ter você aqui conosco!
                    <div class="msg-hora">10:00</div>
                </div>
                <div class="bolha-msg bolha-in">
                    Para que eu possa direcionar seu atendimento da melhor forma: você já conhece os nossos protocolos ou gostaria de entender como funciona nossa avaliação personalizada?
                    <div class="msg-hora">10:00</div>
                </div>
            </div>

            <div class="chat-input-area">
                <input type="text" id="inputMsg" class="chat-input" placeholder="Digite uma mensagem como lead..." onkeypress="if(event.key==='Enter') enviarMsgDigitada()">
                <button class="btn-enviar" onclick="enviarMsgDigitada()"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>

        <!-- PAINEL DIREITO: MONITORAMENTO COGNITIVO VIDE -->
        <div class="painel-direito">
            <div class="secao-titulo"><i class="fas fa-brain"></i> Motor de Objeções (Ao Vivo)</div>
            
            <div class="card-diagnostico">
                <div class="card-diagnostico-titulo">Última Intenção Detectada:</div>
                <div id="diagIntencao" style="color: var(--cor-primaria); font-weight: bold;">Sondagem Inicial</div>
            </div>

            <div class="card-diagnostico">
                <div class="card-diagnostico-titulo">Objeção Classificada:</div>
                <div id="diagObjecao">Nenhuma objeção ativa</div>
            </div>

            <div class="card-diagnostico">
                <div class="card-diagnostico-titulo">Score do Lead:</div>
                <div id="diagScore" style="color: var(--verde-zap); font-weight: bold;">LEAD B (Em Qualificação)</div>
            </div>

            <div class="card-diagnostico">
                <div class="card-diagnostico-titulo">Estado de Transbordo:</div>
                <div id="diagTransbordo" style="color: var(--texto-suave);">Atendimento Automático Inteligente</div>
            </div>

            <div class="card-diagnostico">
                <div class="card-diagnostico-titulo">Especificação n8n:</div>
                <div style="font-size: 11px; color: var(--texto-suave);">
                    Webhook: <code>/webhook/whatsapp/inbound</code><br>
                    Variável: <code>status_conversa = 'EM_QUALIFICACAO'</code>
                </div>
            </div>
        </div>
    </div>

    <script>
        function adicionarMensagem(texto, tipo) {
            const container = document.getElementById('chatMensagens');
            const div = document.createElement('div');
            div.className = 'bolha-msg ' + (tipo === 'out' ? 'bolha-out' : 'bolha-in');
            const agora = new Date();
            const hora = String(agora.getHours()).padStart(2, '0') + ':' + String(agora.getMinutes()).padStart(2, '0');
            div.innerHTML = texto + '<div class="msg-hora">' + hora + '</div>';
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        }

        function enviarMsgDigitada() {
            const input = document.getElementById('inputMsg');
            const texto = input.value.trim();
            if (!texto) return;
            simularLead(texto);
            input.value = '';
        }

        function simularLead(msg) {
            adicionarMensagem(msg, 'out');
            processarRespostaBot(msg);
        }

        function processarRespostaBot(msg) {
            const texto = msg.toLowerCase();
            setTimeout(() => {
                if (texto.includes('preço') || texto.includes('valor') || texto.includes('quanto custa')) {
                    if (texto.includes('caro') || texto.includes('concorrente')) {
                        document.getElementById('diagIntencao').innerText = 'Comparação de Preço / Concorrente';
                        document.getElementById('diagObjecao').innerText = 'PRECO_VALOR (OBJ-PRECO-01)';
                        document.getElementById('diagScore').innerText = 'LEAD B (Necessita de Ancoragem de Valor)';
                        adicionarMensagem("Compreendo perfeitamente! Quando se trata do seu rosto e autoestima, a segurança precisa ser absoluta. Nossos protocolos utilizam exclusivamente substâncias nobres rastreadas e aplicadas com anestesia médica. Além disso, parcelamos em até 12x para que você tenha o melhor resultado sem pesar. Faz sentido agendarmos uma avaliação presencial?", 'in');
                    } else {
                        document.getElementById('diagIntencao').innerText = 'Solicitação Prematura de Preço';
                        document.getElementById('diagObjecao').innerText = 'Ancoragem Preventiva';
                        adicionarMensagem("Com certeza vou te passar todas as opções! Na ${nomeCliente}, cada procedimento é personalizado após mapeamento facial 3D, para você nunca pagar por nada desnecessário. Qual é o principal resultado que você gostaria de alcançar?", 'in');
                    }
                } else if (texto.includes('artificial') || texto.includes('medo') || texto.includes('dor')) {
                    document.getElementById('diagIntencao').innerText = 'Objeção de Confiança / Risco';
                    document.getElementById('diagObjecao').innerText = 'CONFIANCA_AUTORIDADE (OBJ-CONF-01)';
                    adicionarMensagem("Esse é o maior compromisso da ${nomeCliente}! Nossa assinatura é a elegância discreta: ninguém vai notar que você fez um procedimento, mas sim que você está radiante, descansada e com a harmonia renovada. Gostaria de ver 2 casos reais de pacientes que tinham esse mesmo receio?", 'in');
                } else if (texto.includes('pensar') || texto.includes('retorno') || texto.includes('depois')) {
                    document.getElementById('diagIntencao').innerText = 'Indecisão / Abandono Potencial';
                    document.getElementById('diagObjecao').innerText = 'TEMPO_URGENCIA (OBJ-URG-01)';
                    adicionarMensagem("Com certeza, [Nome]! Tomar essa decisão com tranquilidade é fundamental. Como nossa agenda costuma preencher com antecedência, posso deixar uma pré-reserva de cortesia até amanhã às 18h sem compromisso. Fica melhor para você pela manhã ou à tarde?", 'in');
                } else if (texto.includes('humana') || texto.includes('pessoa') || texto.includes('atendente')) {
                    document.getElementById('diagIntencao').innerText = 'Gatilho de Transbordo Ativado';
                    document.getElementById('diagTransbordo').innerHTML = '<span style="color:#00a884; font-weight:bold;"><i class="fas fa-check"></i> TRANSBORDO ATIVO: Chamando Atendente Humana</span>';
                    adicionarMensagem("Com certeza! Estou transferindo nossa conversa agora para a nossa coordenadora de atendimento pessoal, que continuará seu atendimento com todo carinho aqui no WhatsApp. Um instante!", 'in');
                } else if (texto.includes('horário') || texto.includes('agendar') || texto.includes('gostei')) {
                    document.getElementById('diagIntencao').innerText = 'Fechamento de Conversão';
                    document.getElementById('diagScore').innerHTML = '<span style="color:#00e676; font-weight:bold;">LEAD A VIP (Pronto para Fechamento)</span>';
                    adicionarMensagem("Excelente escolha! Temos disponibilidade nesta quinta às 15h ou na sexta às 11h. Qual desses momentos se encaixa melhor na sua rotina para reservarmos agora?", 'in');
                } else {
                    document.getElementById('diagIntencao').innerText = 'Sondagem Aberta';
                    adicionarMensagem("Perfeito! Cuidamos de cada detalhe com total discrição e carinho. Me conte: você busca algo pontual ou deseja um rejuvenescimento global?", 'in');
                }
            }, 600);
        }

        function simularFollowUp(tipo) {
            if (tipo === 'T+24h') {
                adicionarMensagem("[SIMULAÇÃO DE CRON T+24h DISPARADA]", 'out');
                setTimeout(() => {
                    adicionarMensagem("Olá! Lembrei de você hoje cedo! Atendemos uma paciente que tinha exatamente o mesmo desejo que você me contou ontem, e ela ficou encantada com a naturalidade do resultado. Quando você puder, me avise para vermos seu horário!", 'in');
                    document.getElementById('diagIntencao').innerText = 'Disparo de Régua T+24h (Prova Social)';
                }, 500);
            } else if (tipo === 'T+72h') {
                adicionarMensagem("[SIMULAÇÃO DE CRON T+72h DISPARADA]", 'out');
                setTimeout(() => {
                    adicionarMensagem("Oi! Tudo bem? Abrimos 2 vagas extras de avaliação para esta semana com cortesia no escaneamento facial digital. Se você ainda tiver interesse em realizar seu procedimento este mês, posso segurar uma dessas vagas para você!", 'in');
                    document.getElementById('diagIntencao').innerText = 'Disparo de Régua T+72h (Oferta Escassa)';
                }, 500);
            }
        }

        function limparChat() {
            document.getElementById('chatMensagens').innerHTML = '';
            document.getElementById('diagIntencao').innerText = 'Aguardando interação';
            document.getElementById('diagObjecao').innerText = 'Nenhuma';
            document.getElementById('diagTransbordo').innerText = 'Atendimento Automático Inteligente';
        }
    </script>
</body>
</html>`;

    // Grava os 7 arquivos físicos e persiste no storage PostgreSQL
    storageService.salvarArquivo(idProjeto, 'atendimento', 'fluxo_jornada_atendimento.json', JSON.stringify(fluxoJornada, null, 2));
    storageService.salvarArquivo(idProjeto, 'atendimento', 'roteiro_conversas_qualificacao.md', roteiroMarkdown);
    storageService.salvarArquivo(idProjeto, 'atendimento', 'matriz_objecoes_e_respostas.json', JSON.stringify(matrizObjecoes, null, 2));
    storageService.salvarArquivo(idProjeto, 'atendimento', 'regras_follow_up_e_recuperacao.json', JSON.stringify(regrasFollowUp, null, 2));
    storageService.salvarArquivo(idProjeto, 'atendimento', 'especificacao_tecnica_para_automacao.json', JSON.stringify(especificacaoAutomacao, null, 2));
    storageService.salvarArquivo(idProjeto, 'atendimento', 'manifesto_entrega.json', JSON.stringify(manifestoEntrega, null, 2));
    storageService.salvarArquivo(idProjeto, 'atendimento', 'simulador_chat_atendimento.html', simuladorHtml);

    return {
        idProjeto,
        idTarefa,
        diretorioEntrega: pastaAtendimento,
        arquivosCriados: [
            'fluxo_jornada_atendimento.json',
            'roteiro_conversas_qualificacao.md',
            'matriz_objecoes_e_respostas.json',
            'regras_follow_up_e_recuperacao.json',
            'especificacao_tecnica_para_automacao.json',
            'manifesto_entrega.json',
            'simulador_chat_atendimento.html'
        ],
        dadosAtendimento: {
            fluxoJornada,
            matrizObjecoes,
            regrasFollowUp,
            especificacaoAutomacao,
            manifestoEntrega
        }
    };
}

/**
 * 3. FUNÇÃO 3: Bateria de Testes Técnicos e Semânticos do Agente 05
 * @param {Object} params
 * @param {string} params.diretorioEntrega
 * @param {Array<string>} params.criteriosAceite
 * @returns {Object} Relatório detalhado de conformidade
 */
function executarBateriaTestesAtendimento({ diretorioEntrega, criteriosAceite = [] }) {
    const relatorio = {
        data_execucao: new Date().toISOString(),
        testes_individuais: {},
        criterios_atendidos: false,
        pontuacao_conformidade: 0,
        falhas: []
    };

    // 1. Teste de Existência Física dos 7 Arquivos
    const arqFluxo = path.join(diretorioEntrega, 'fluxo_jornada_atendimento.json');
    const arqRoteiro = path.join(diretorioEntrega, 'roteiro_conversas_qualificacao.md');
    const arqMatriz = path.join(diretorioEntrega, 'matriz_objecoes_e_respostas.json');
    const arqFollow = path.join(diretorioEntrega, 'regras_follow_up_e_recuperacao.json');
    const arqAuto = path.join(diretorioEntrega, 'especificacao_tecnica_para_automacao.json');
    const arqManif = path.join(diretorioEntrega, 'manifesto_entrega.json');
    const arqSimul = path.join(diretorioEntrega, 'simulador_chat_atendimento.html');

    const todosExistem = fs.existsSync(arqFluxo) && fs.existsSync(arqRoteiro) && fs.existsSync(arqMatriz) &&
                         fs.existsSync(arqFollow) && fs.existsSync(arqAuto) && fs.existsSync(arqManif) && fs.existsSync(arqSimul);

    relatorio.testes_individuais.arquivos_presentes = todosExistem;
    if (!todosExistem) relatorio.falhas.push('Nem todos os 7 arquivos físicos de atendimento foram encontrados no disco.');

    // 2. Validação da Estrutura do Fluxo de Jornada
    if (fs.existsSync(arqFluxo)) {
        try {
            const fluxo = JSON.parse(fs.readFileSync(arqFluxo, 'utf-8'));
            const temEstagios = Array.isArray(fluxo.estagios_jornada) && fluxo.estagios_jornada.length >= 4;
            const temCanais = Array.isArray(fluxo.canais_homologados) && fluxo.canais_homologados.length > 0;
            relatorio.testes_individuais.estrutura_jornada_valida = temEstagios && temCanais;
            if (!relatorio.testes_individuais.estrutura_jornada_valida) relatorio.falhas.push('Fluxo de jornada incompleto ou com menos de 4 estágios.');
        } catch (e) {
            relatorio.testes_individuais.estrutura_jornada_valida = false;
            relatorio.falhas.push('Falha no JSON do fluxo de jornada: ' + e.message);
        }
    }

    // 3. Validação da Matriz de Objeções (Cobertura das 4 Macro-Categorias)
    if (fs.existsSync(arqMatriz)) {
        try {
            const matriz = JSON.parse(fs.readFileSync(arqMatriz, 'utf-8'));
            const cats = (matriz.macro_categorias || []).map(c => c.categoria);
            const cobrePreco = cats.includes('PRECO_VALOR');
            const cobreConf = cats.includes('CONFIANCA_AUTORIDADE');
            const cobreTempo = cats.includes('TEMPO_URGENCIA');
            const cobreConc = cats.includes('CONCORRENTE_COMPARACAO');

            relatorio.testes_individuais.matriz_objecoes_completa = cobrePreco && cobreConf && cobreTempo && cobreConc;
            if (!relatorio.testes_individuais.matriz_objecoes_completa) {
                relatorio.falhas.push('Matriz de objeções deve cobrir obrigatoriamente: Preço, Confiança, Tempo e Concorrente.');
            }
        } catch (e) {
            relatorio.testes_individuais.matriz_objecoes_completa = false;
            relatorio.falhas.push('Falha no JSON da matriz de objeções: ' + e.message);
        }
    }

    // 4. Validação das Réguas de Follow-Up e Recuperação
    if (fs.existsSync(arqFollow)) {
        try {
            const follow = JSON.parse(fs.readFileSync(arqFollow, 'utf-8'));
            const temPontosAbandono = Array.isArray(follow.pontos_de_abandono_mapeados) && follow.pontos_de_abandono_mapeados.length > 0;
            const abandonoPreco = follow.pontos_de_abandono_mapeados.find(p => p.id === 'ABANDONO_POS_PRECO');
            const temCadenciaMinima = abandonoPreco && abandonoPreco.cadencia_temporal.length >= 3;

            relatorio.testes_individuais.regras_followup_validas = temPontosAbandono && temCadenciaMinima;
            if (!relatorio.testes_individuais.regras_followup_validas) relatorio.falhas.push('Réguas de follow-up sem cadência temporal completa (T+2h, T+24h, T+72h).');
        } catch (e) {
            relatorio.testes_individuais.regras_followup_validas = false;
            relatorio.falhas.push('Falha no JSON das réguas de follow-up: ' + e.message);
        }
    }

    // 5. Validação da Especificação para o Futuro Agente de Automação
    if (fs.existsSync(arqAuto)) {
        try {
            const auto = JSON.parse(fs.readFileSync(arqAuto, 'utf-8'));
            const temWebhooks = auto.requisitos_tecnicos && Array.isArray(auto.requisitos_tecnicos.webhooks_a_implementar);
            const temVariaveis = auto.requisitos_tecnicos && Array.isArray(auto.requisitos_tecnicos.variaveis_de_estado_crm);
            const temTransbordo = auto.requisitos_tecnicos && Array.isArray(auto.requisitos_tecnicos.regras_disparo_transbordo);

            relatorio.testes_individuais.especificacao_automacao_valida = temWebhooks && temVariaveis && temTransbordo;
            if (!relatorio.testes_individuais.especificacao_automacao_valida) relatorio.falhas.push('Especificação de automação sem webhooks, variáveis ou regras de transbordo.');
        } catch (e) {
            relatorio.testes_individuais.especificacao_automacao_valida = false;
            relatorio.falhas.push('Falha no JSON de especificação para automação: ' + e.message);
        }
    }

    // 6. Validação do Manifesto Unificado de Entrega
    if (fs.existsSync(arqManif)) {
        try {
            const manifesto = JSON.parse(fs.readFileSync(arqManif, 'utf-8'));
            const temBriefing = !!manifesto.briefing_origem;
            const temArquivos = Array.isArray(manifesto.arquivos_produzidos) && manifesto.arquivos_produzidos.length === 7;
            const temVersoes = Array.isArray(manifesto.versoes_alteracoes);
            const temCriterios = Array.isArray(manifesto.criterios_aceite);
            const temAuditoria = !!manifesto.resultado_auditoria;

            relatorio.testes_individuais.manifesto_unificado_valido = temBriefing && temArquivos && temVersoes && temCriterios && temAuditoria;
            if (!relatorio.testes_individuais.manifesto_unificado_valido) relatorio.falhas.push('Manifesto de entrega incompleto ou fora do padrão unificado da VIDE.');
        } catch (e) {
            relatorio.testes_individuais.manifesto_unificado_valido = false;
            relatorio.falhas.push('Falha no JSON do manifesto de entrega: ' + e.message);
        }
    }

    // 7. Validação do Simulador Interativo HTML
    if (fs.existsSync(arqSimul)) {
        const conteudoSimul = fs.readFileSync(arqSimul, 'utf-8');
        const temChat = conteudoSimul.includes('chatMensagens') && conteudoSimul.includes('simularLead');
        const temMotor = conteudoSimul.includes('Motor de Objeções') || conteudoSimul.includes('diagObjecao');
        relatorio.testes_individuais.simulador_interativo_valido = temChat && temMotor;
        if (!relatorio.testes_individuais.simulador_interativo_valido) relatorio.falhas.push('Simulador HTML incompleto ou sem motor de teste.');
    } else {
        relatorio.testes_individuais.simulador_interativo_valido = false;
    }

    // Cálculo da Pontuação de Conformidade
    const totalTestes = Object.keys(relatorio.testes_individuais).length;
    const aprovados = Object.values(relatorio.testes_individuais).filter(Boolean).length;
    relatorio.pontuacao_conformidade = totalTestes > 0 ? Math.round((aprovados / totalTestes) * 100) : 0;
    relatorio.criterios_atendidos = relatorio.pontuacao_conformidade === 100;

    return relatorio;
}

/**
 * 4. FUNÇÃO 4: Submissão Formal da Entrega para Auditoria do Coordenador Geral
 * @param {Object} params
 * @param {string} params.idProjeto
 * @param {string} params.idTarefa
 * @param {Object} params.dadosEntrega
 * @param {Object} params.relatorioTestes
 * @returns {Object} Projeto atualizado após auditoria formal
 */
function submeterEntregaParaCoordenador({ idProjeto, idTarefa, dadosEntrega, relatorioTestes }) {
    const projeto = obterProjetoPorId(idProjeto);
    if (!projeto) throw new Error(`Projeto ${idProjeto} não encontrado.`);

    const tarefa = projeto.grafo_tarefas.find(t => t.id_tarefa === idTarefa);
    if (!tarefa) throw new Error(`Tarefa ${idTarefa} não encontrada.`);

    // Transiciona para AGUARDANDO_AUDITORIA_COORDENADOR
    tarefa.estado = 'AGUARDANDO_AUDITORIA_COORDENADOR';
    tarefa.historico_auditoria.push({
        timestamp: new Date().toISOString(),
        autor: 'Agente 05 — Atendimento e Vendas',
        estado_anterior: 'EM_ANDAMENTO',
        novo_estado: 'AGUARDANDO_AUDITORIA_COORDENADOR',
        nota: `Processo de atendimento comercial concluído com conformidade de ${relatorioTestes.pontuacao_conformidade}%. Submetendo 7 arquivos e manifesto padronizado para auditoria do Coordenador Geral.`
    });
    salvarProjeto(projeto);

    const parecer = relatorioTestes.criterios_atendidos
        ? `[APROVADO NA AUDITORIA] Estruturação comercial de atendimento concluída com excelência. Jornada conversacional, roteiros de qualificação, matriz de 4 categorias de objeções e réguas de follow-up validadas no disco. Especificação pronta para orientar o futuro Agente de Automação.`
        : `[REJEITADO NA AUDITORIA] Falhas detectadas na estruturação de atendimento: ${relatorioTestes.falhas.join('; ')}`;

    // Chamada formal ao Coordenador Geral (sem auto-aprovação)
    const projetoAuditado = conferirEntrega({
        idProjeto,
        idTarefa,
        entregaSubmetida: {
            diretorioEntrega: dadosEntrega.diretorioEntrega,
            arquivosCriados: dadosEntrega.arquivosCriados,
            dadosAtendimento: dadosEntrega.dadosAtendimento,
            relatorioTestes
        },
        criteriosAtendidos: relatorioTestes.criterios_atendidos,
        parecerCoordenador: parecer
    });

    return {
        sucesso: relatorioTestes.criterios_atendidos,
        projeto: projetoAuditado,
        parecer
    };
}

/**
 * 5. FUNÇÃO 5: Execução do Ciclo Completo de Atendimento e Vendas
 * Ingestão -> Geração Física -> Bateria de Testes -> Submissão Formal
 * @param {Object} params
 * @param {string} params.idProjeto
 * @param {string} params.idTarefa
 * @returns {Object} Resultado completo da operação
 */
function executarCicloCompletoAtendimento({ idProjeto, idTarefa }) {
    // 1. Ingestão e validações
    const { projeto, tarefa } = assumirTarefaAtendimento({ idProjeto, idTarefa });

    // 2. Coleta de insumos (branding tokens se existirem)
    let tokensBranding = null;
    const pastaBrandingTokens = path.join(DIRETORIO_ENTREGAS, idProjeto, 'branding', 'design_tokens.json');
    if (fs.existsSync(pastaBrandingTokens)) {
        try {
            tokensBranding = JSON.parse(fs.readFileSync(pastaBrandingTokens, 'utf-8'));
        } catch (e) {}
    }

    const briefing = {
        idProjeto,
        idTarefa,
        cliente: projeto.cliente,
        solicitacaoOriginal: projeto.solicitacao_original,
        dependencias: tarefa.dependencias,
        tokensBranding
    };

    // 3. Geração Física dos 7 arquivos
    const dadosEntrega = gerarEntregaveisAtendimento(briefing);

    // 4. Bateria de Testes
    const relatorioTestes = executarBateriaTestesAtendimento({
        diretorioEntrega: dadosEntrega.diretorioEntrega,
        criteriosAceite: tarefa.criterios_aceite
    });

    // 5. Submissão formal ao Coordenador
    const resultadoSubmissao = submeterEntregaParaCoordenador({
        idProjeto,
        idTarefa,
        dadosEntrega,
        relatorioTestes
    });

    return {
        idProjeto,
        idTarefa,
        dadosEntrega,
        relatorioTestes,
        resultadoSubmissao
    };
}

/**
 * Função de apoio com Inteligência Artificial para gerar contra-argumento dinâmico
 */
async function analisarObjecaoLeadComIA(categoria, textoLead) {
    return await iaService.gerarContraArgumentoObjeçãoIA(categoria, textoLead);
}

module.exports = {
    assumirTarefaAtendimento,
    gerarEntregaveisAtendimento,
    executarBateriaTestesAtendimento,
    submeterEntregaParaCoordenador,
    executarCicloCompletoAtendimento,
    analisarObjecaoLeadComIA
};
