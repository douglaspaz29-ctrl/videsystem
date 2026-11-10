# =====================================================================
# VIDE — SISTEMAS DE CRESCIMENTO COMERCIAL
# DOCKERFILE OFICIAL DE PRODUÇÃO (CONTAINER INDEPENDENTE 24/7)
# =====================================================================

FROM node:20-alpine

# Instala curl para healthcheck
RUN apk add --no-cache curl tzdata

# Configura fuso horário para Brasília
ENV TZ=America/Sao_Paulo

WORKDIR /app

# Copia package.json
COPY package.json ./

# Copia código-fonte completo da operação VIDE
COPY . .

# Cria diretórios essenciais de persistência e garante permissões
RUN mkdir -p /app/03_AGENTES_DE_IA_E_TRIAGEM/dados_persistencia \
    && mkdir -p /app/03_AGENTES_DE_IA_E_TRIAGEM/entregas_clientes \
    && chown -R node:node /app

# Usuário não-root para máxima segurança (OWASP)
USER node

# Portas operacionais
EXPOSE 3000

# Variáveis padrão de ambiente em nuvem
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Healthcheck nativo para orquestradores em nuvem (Railway, Render, AWS ECS, K8s)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/projetos || exit 1

# Comando de inicialização autônomo (Independe do Antigravity)
CMD ["node", "servidor_local.js"]
