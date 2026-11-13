/**
 * =====================================================================
 * VIDE — SERVIÇO DE ARMAZENAMENTO PERSISTENTE (STORAGE SERVICE)
 * Garante que arquivos de clientes não sejam perdidos em containers efêmeros
 * Suporta Armazenamento Durável no PostgreSQL (Free) e Cache Local em Disco
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');
const CONFIG = require('./config_ambiente');
const { db } = require('./banco_dados');

class ServicoArmazenamentoVIDE {
    constructor() {
        this.diretorioBase = process.env.STORAGE_DIR || process.env.ENTREGAS_DIR || path.join(__dirname, 'entregas_clientes');
        this.garantirDiretorioBase();
    }

    garantirDiretorioBase() {
        if (!fs.existsSync(this.diretorioBase)) {
            try {
                fs.mkdirSync(this.diretorioBase, { recursive: true });
            } catch (e) {
                console.error('[ERRO_STORAGE] Falha ao criar diretório base de entregas:', e.message);
            }
        }
    }

    /**
     * Salva um arquivo físico de cliente garantindo diretórios pais e sincronizando com PostgreSQL durável
     * @param {string} idProjeto - Ex: 'PRJ-2026-C34061'
     * @param {string} especialista - Ex: 'branding', 'site_oficial', 'atendimento'
     * @param {string} nomeArquivo - Ex: 'design_tokens.json'
     * @param {string|Buffer} conteudo - Conteúdo do arquivo
     * @returns {string} Caminho físico gravado
     */
    salvarArquivo(idProjeto, especialista, nomeArquivo, conteudo) {
        const caminhoCompleto = path.join(this.diretorioBase, idProjeto, especialista, nomeArquivo);
        const pastaDestino = path.dirname(caminhoCompleto);
        if (!fs.existsSync(pastaDestino)) {
            fs.mkdirSync(pastaDestino, { recursive: true });
        }

        if (Buffer.isBuffer(conteudo)) {
            fs.writeFileSync(caminhoCompleto, conteudo);
        } else {
            fs.writeFileSync(caminhoCompleto, conteudo, 'utf-8');
        }

        // Persistência durável em PostgreSQL (sobrevive a novos deploys e reinicializações de container)
        const caminhoRel = `${idProjeto}/${especialista}/${nomeArquivo}`.replace(/\\/g, '/');
        const ext = path.extname(nomeArquivo).toLowerCase();
        let mimetype = 'text/plain; charset=utf-8';
        if (ext === '.json') mimetype = 'application/json; charset=utf-8';
        else if (ext === '.html') mimetype = 'text/html; charset=utf-8';
        else if (ext === '.css') mimetype = 'text/css; charset=utf-8';
        else if (ext === '.md') mimetype = 'text/markdown; charset=utf-8';
        else if (ext === '.svg') mimetype = 'image/svg+xml';
        else if (ext === '.js') mimetype = 'application/javascript; charset=utf-8';
        else if (ext === '.pdf') mimetype = 'application/pdf';
        else if (ext === '.png') mimetype = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') mimetype = 'image/jpeg';
        else if (ext === '.webp') mimetype = 'image/webp';
        else if (ext === '.txt') mimetype = 'text/plain; charset=utf-8';

        const conteudoDb = Buffer.isBuffer(conteudo)
            ? (mimetype.startsWith('image/') || mimetype === 'application/pdf' ? conteudo.toString('base64') : conteudo.toString('utf-8'))
            : String(conteudo);

        db.salvarArquivoStorage({
            idProjeto,
            especialista,
            nomeArquivo,
            caminhoRelativo: caminhoRel,
            conteudo: conteudoDb,
            mimetype
        }).catch(err => console.warn('[STORAGE] Falha assíncrona ao persistir arquivo no PostgreSQL:', err.message));

        return caminhoCompleto;
    }

    /**
     * Retorna o conteúdo de um arquivo de cliente, restaurando do PostgreSQL se necessário (cache miss pós-deploy)
     */
    async obterConteudoArquivo(idProjeto, especialista, nomeArquivo) {
        const caminhoCompleto = path.join(this.diretorioBase, idProjeto, especialista, nomeArquivo);
        if (fs.existsSync(caminhoCompleto)) {
            const ext = path.extname(nomeArquivo).toLowerCase();
            const ehBinario = ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.pdf' || ext === '.webp' || ext === '.ico';
            return ehBinario ? fs.readFileSync(caminhoCompleto) : fs.readFileSync(caminhoCompleto, 'utf-8');
        }

        // Cache miss local: busca no PostgreSQL durável (reidratação automática após novo deploy)
        const arqPg = await db.obterArquivoStorage(idProjeto, especialista, nomeArquivo);
        if (arqPg && arqPg.conteudo) {
            try {
                const pastaDestino = path.dirname(caminhoCompleto);
                if (!fs.existsSync(pastaDestino)) fs.mkdirSync(pastaDestino, { recursive: true });
                const ext = path.extname(nomeArquivo).toLowerCase();
                const ehBinario = ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.pdf' || ext === '.webp' || ext === '.ico';
                const dadosGravar = ehBinario && typeof arqPg.conteudo === 'string'
                    ? Buffer.from(arqPg.conteudo, 'base64')
                    : arqPg.conteudo;
                fs.writeFileSync(caminhoCompleto, dadosGravar);
                return dadosGravar;
            } catch (_) {}
            return arqPg.conteudo;
        }

        return null;
    }

    /**
     * Retorna o caminho de um arquivo de cliente
     */
    obterCaminhoArquivo(idProjeto, especialista, nomeArquivo) {
        return path.join(this.diretorioBase, idProjeto, especialista, nomeArquivo);
    }

    /**
     * Lista arquivos de uma entrega
     */
    listarArquivosProjeto(idProjeto) {
        const pastaProjeto = path.join(this.diretorioBase, idProjeto);
        const resultados = new Set();

        if (fs.existsSync(pastaProjeto)) {
            const lerPastaRecursiva = (dir, prefixo = '') => {
                const itens = fs.readdirSync(dir, { withFileTypes: true });
                for (const item of itens) {
                    const caminhoRel = path.join(prefixo, item.name);
                    if (item.isDirectory()) {
                        lerPastaRecursiva(path.join(dir, item.name), caminhoRel);
                    } else {
                        resultados.add(caminhoRel.replace(/\\/g, '/'));
                    }
                }
            };
            lerPastaRecursiva(pastaProjeto);
        }

        return Array.from(resultados);
    }

    /**
     * Status de diagnóstico do storage
     */
    obterDiagnostico() {
        const temPgAtivo = db.modoRemoto && !!db.pgPool;
        const ehVolumeFisico = !!process.env.STORAGE_DIR || !!process.env.RAILWAY_VOLUME_MOUNT_PATH;
        const ehAmbienteDevLocal = CONFIG.NODE_ENV !== 'production' && CONFIG.NODE_ENV !== 'staging';
        const persistente = temPgAtivo || ehVolumeFisico || ehAmbienteDevLocal;

        return {
            tipo_storage: temPgAtivo 
                ? 'POSTGRESQL_DURAVEL' 
                : (ehVolumeFisico ? 'VOLUME_PERSISTENTE' : (ehAmbienteDevLocal ? 'DISCO_LOCAL_DEV' : 'SISTEMA_ARQUIVOS_LOCAL')),
            diretorio_base: this.diretorioBase,
            volume_persistente_configurado: persistente,
            detalhes: temPgAtivo 
                ? 'Armazenamento durável ativo via PostgreSQL gerenciado (vide-homologacao-db). Entregáveis e arquivos persistem integralmente mesmo em novos deploys e containers efêmeros sem custo adicional.'
                : (ehVolumeFisico ? 'Volume persistente montado no container.' : 'Armazenamento com persistência local e fallback ativo.')
        };
    }
}

const storageService = new ServicoArmazenamentoVIDE();

module.exports = {
    ServicoArmazenamentoVIDE,
    storageService
};
