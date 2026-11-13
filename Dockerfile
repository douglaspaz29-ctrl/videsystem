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

# Instala dependências de produção (pg para PostgreSQL)
RUN npm install pg --omit=dev

# Cria diretórios essenciais de persistência e garante permissões
RUN mkdir -p /app/equipe_digital_vide/dados_persistencia \
    && mkdir -p /app/equipe_digital_vide/entregas_clientes \
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
  CMD curl -f http://localhost:3000/api/status/infraestrutura || exit 1

# Comando de inicialização autônomo (Independe do Antigravity)
CMD ["node", "servidor_local.js"]
