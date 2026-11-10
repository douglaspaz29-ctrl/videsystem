/**
 * =====================================================================
 * VIDE — SERVIÇO DE ARMAZENAMENTO PERSISTENTE (STORAGE SERVICE)
 * Garante que arquivos de clientes não sejam perdidos em containers efêmeros
 * Suporta Volume Persistente (Docker/Railway) e S3/Supabase Storage
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');
const CONFIG = require('./config_ambiente');

class ServicoArmazenamentoVIDE {
    constructor() {
        // Se houver volume persistente montado na nuvem (ex: Railway Volume em /data ou STORAGE_DIR)
        this.diretorioBase = process.env.STORAGE_DIR || process.env.ENTREGAS_DIR || path.join(__dirname, 'entregas_clientes');
        this.tipoStorage = process.env.STORAGE_TYPE || 'VOLUME_PERSISTENTE';
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
     * Salva um arquivo físico de cliente garantindo diretórios pais
     * @param {string} idProjeto - Ex: 'PRJ-2026-C34061'
     * @param {string} especialista - Ex: 'branding', 'site_oficial', 'atendimento'
     * @param {string} nomeArquivo - Ex: 'design_tokens.json'
     * @param {string|Buffer} conteudo - Conteúdo do arquivo
     * @returns {string} Caminho físico gravado
     */
    salvarArquivo(idProjeto, especialista, nomeArquivo, conteudo) {
        const pastaDestino = path.join(this.diretorioBase, idProjeto, especialista);
        if (!fs.existsSync(pastaDestino)) {
            fs.mkdirSync(pastaDestino, { recursive: true });
        }

        const caminhoCompleto = path.join(pastaDestino, nomeArquivo);
        fs.writeFileSync(caminhoCompleto, conteudo, 'utf-8');
        return caminhoCompleto;
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
        if (!fs.existsSync(pastaProjeto)) return [];

        const resultados = [];
        const lerPastaRecursiva = (dir, prefixo = '') => {
            const itens = fs.readdirSync(dir, { withFileTypes: true });
            for (const item of itens) {
                const caminhoRel = path.join(prefixo, item.name);
                if (item.isDirectory()) {
                    lerPastaRecursiva(path.join(dir, item.name), caminhoRel);
                } else {
                    resultados.push(caminhoRel.replace(/\\/g, '/'));
                }
            }
        };

        lerPastaRecursiva(pastaProjeto);
        return resultados;
    }

    /**
     * Status de diagnóstico do storage
     */
    obterDiagnostico() {
        const ehVolumeEfêmero = !process.env.STORAGE_DIR && !process.env.RAILWAY_VOLUME_MOUNT_PATH;
        return {
            tipo_storage: this.tipoStorage,
            diretorio_base: this.diretorioBase,
            volume_persistente_configurado: !ehVolumeEfêmero,
            aviso_efemero: ehVolumeEfêmero 
                ? 'AVISO: Rodando em sistema de arquivos local ou container sem volume persistente. Em plataformas como Railway ou Render, configure um Volume Persistente para que os arquivos não desapareçam em novos deploys.'
                : 'Volume persistente detectado.'
        };
    }
}

const storageService = new ServicoArmazenamentoVIDE();

module.exports = {
    ServicoArmazenamentoVIDE,
    storageService
};
