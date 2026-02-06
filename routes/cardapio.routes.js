/**
 * routes/cardapio.routes.js
 * CRUD completo do cardápio digital (menus, categorias, produtos)
 * Multi-tenant por empresaId
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ─── Middleware: apenas master ─────────────────────────────
function apenasMaster(req, res, next) {
    if (req.user.nivel !== 'master') {
        return res.status(403).json({ erro: 'Sem permissão. Apenas master pode gerenciar o cardápio.' });
    }
    next();
}

// ─── Multer: upload de fotos de produto ────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const empresaId = req.user.empresaId;
        const dir = `./uploads/cardapio/${empresaId}`;
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const prodId = req.params.id || 'novo';
        cb(null, `${prodId}_${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|webp|gif/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = allowed.test(file.mimetype);
        if (ext && mime) return cb(null, true);
        cb(new Error('Apenas imagens (jpg, png, webp, gif) são permitidas'));
    }
});

// ─── Helper: remover arquivo do disco ──────────────────────
function removerImagem(fotoCaminho) {
    if (!fotoCaminho) return;
    try {
        const relativePath = fotoCaminho.split('?')[0]; // remove ?t=timestamp
        const fullPath = path.join(__dirname, '..', relativePath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
    } catch (e) {
        console.warn('Aviso ao remover imagem:', e.message);
    }
}

// ═════════════════════════════════════════════════════════════
// ENDPOINT PÚBLICO (sem auth)
// ═════════════════════════════════════════════════════════════

/**
 * GET /api/cardapio/publico/:empresaId
 * Retorna cardápio completo para exibição pública
 */
router.get('/publico/:empresaId', async (req, res) => {
    try {
        const empresaId = parseInt(req.params.empresaId);

        const empresa = await prisma.empresa.findUnique({
            where: { id: empresaId },
            select: { id: true, nomeEmpresa: true, logoCaminho: true }
        });

        if (!empresa) {
            return res.status(404).json({ erro: 'Empresa não encontrada' });
        }

        const cardapios = await prisma.menuCardapio.findMany({
            where: { empresaId, status: true },
            orderBy: { ordem: 'asc' },
            include: {
                categorias: {
                    where: { status: true },
                    orderBy: { ordem: 'asc' },
                    include: {
                        produtos: {
                            where: { status: true },
                            orderBy: { ordem: 'asc' }
                        }
                    }
                }
            }
        });

        res.json({ success: true, empresa, cardapios });
    } catch (error) {
        console.error('❌ Erro ao buscar cardápio público:', error);
        res.status(500).json({ erro: error.message });
    }
});

// ═════════════════════════════════════════════════════════════
// ENDPOINTS PROTEGIDOS (auth + master)
// ═════════════════════════════════════════════════════════════

/**
 * GET /api/cardapio/listar
 * Lista todos os cardápios com categorias e produtos (nested)
 */
router.get('/listar', authMiddleware, apenasMaster, async (req, res) => {
    try {
        const cardapios = await prisma.menuCardapio.findMany({
            where: { empresaId: req.user.empresaId },
            orderBy: { ordem: 'asc' },
            include: {
                categorias: {
                    orderBy: { ordem: 'asc' },
                    include: {
                        produtos: {
                            orderBy: { ordem: 'asc' }
                        }
                    }
                }
            }
        });

        res.json({ success: true, cardapios });
    } catch (error) {
        console.error('❌ Erro ao listar cardápios:', error);
        res.status(500).json({ erro: error.message });
    }
});

// ─── CARDÁPIO CRUD ─────────────────────────────────────────

/**
 * POST /api/cardapio/cardapio
 * Criar novo cardápio
 */
router.post('/cardapio', authMiddleware, apenasMaster, async (req, res) => {
    try {
        const { nome } = req.body;
        if (!nome || !nome.trim()) {
            return res.status(400).json({ erro: 'Nome é obrigatório' });
        }

        // Próxima ordem
        const ultimo = await prisma.menuCardapio.findFirst({
            where: { empresaId: req.user.empresaId },
            orderBy: { ordem: 'desc' }
        });

        const cardapio = await prisma.menuCardapio.create({
            data: {
                nome: nome.trim(),
                empresaId: req.user.empresaId,
                ordem: (ultimo?.ordem || 0) + 1,
                status: true
            }
        });

        console.log(`✅ Cardápio criado: "${cardapio.nome}" por ${req.user.email}`);
        res.status(201).json({ success: true, cardapio });
    } catch (error) {
        console.error('❌ Erro ao criar cardápio:', error);
        res.status(500).json({ erro: error.message });
    }
});

/**
 * PUT /api/cardapio/cardapio/:id
 * Editar cardápio
 */
router.put('/cardapio/:id', authMiddleware, apenasMaster, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { nome, status } = req.body;

        const cardapio = await prisma.menuCardapio.findFirst({
            where: { id, empresaId: req.user.empresaId }
        });
        if (!cardapio) return res.status(404).json({ erro: 'Cardápio não encontrado' });

        const data = {};
        if (nome !== undefined) data.nome = nome.trim();
        if (status !== undefined) data.status = Boolean(status);

        const atualizado = await prisma.menuCardapio.update({
            where: { id },
            data
        });

        res.json({ success: true, cardapio: atualizado });
    } catch (error) {
        console.error('❌ Erro ao editar cardápio:', error);
        res.status(500).json({ erro: error.message });
    }
});

/**
 * DELETE /api/cardapio/cardapio/:id
 * Excluir cardápio + categorias + produtos + imagens do disco
 */
router.delete('/cardapio/:id', authMiddleware, apenasMaster, async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const cardapio = await prisma.menuCardapio.findFirst({
            where: { id, empresaId: req.user.empresaId },
            include: {
                categorias: {
                    include: { produtos: true }
                }
            }
        });
        if (!cardapio) return res.status(404).json({ erro: 'Cardápio não encontrado' });

        // Remover imagens do disco
        for (const cat of cardapio.categorias) {
            for (const prod of cat.produtos) {
                removerImagem(prod.fotoCaminho);
            }
        }

        // Cascade delete (categorias + produtos já deletam por onDelete: Cascade)
        await prisma.menuCardapio.delete({ where: { id } });

        console.log(`✅ Cardápio excluído: "${cardapio.nome}" por ${req.user.email}`);
        res.json({ success: true, mensagem: 'Cardápio excluído' });
    } catch (error) {
        console.error('❌ Erro ao excluir cardápio:', error);
        res.status(500).json({ erro: error.message });
    }
});

// ─── CATEGORIA CRUD ────────────────────────────────────────

/**
 * POST /api/cardapio/categoria
 * Criar categoria
 */
router.post('/categoria', authMiddleware, apenasMaster, async (req, res) => {
    try {
        const { cardapioId, nome, layoutTipo } = req.body;
        if (!cardapioId || !nome || !nome.trim()) {
            return res.status(400).json({ erro: 'cardapioId e nome são obrigatórios' });
        }

        // Verificar se cardápio pertence à empresa
        const cardapio = await prisma.menuCardapio.findFirst({
            where: { id: parseInt(cardapioId), empresaId: req.user.empresaId }
        });
        if (!cardapio) return res.status(404).json({ erro: 'Cardápio não encontrado' });

        const ultimo = await prisma.menuCategoria.findFirst({
            where: { cardapioId: parseInt(cardapioId) },
            orderBy: { ordem: 'desc' }
        });

        const categoria = await prisma.menuCategoria.create({
            data: {
                cardapioId: parseInt(cardapioId),
                nome: nome.trim(),
                layoutTipo: layoutTipo || 'vinho',
                ordem: (ultimo?.ordem || 0) + 1,
                status: true
            }
        });

        console.log(`✅ Categoria criada: "${categoria.nome}" por ${req.user.email}`);
        res.status(201).json({ success: true, categoria });
    } catch (error) {
        console.error('❌ Erro ao criar categoria:', error);
        res.status(500).json({ erro: error.message });
    }
});

/**
 * PUT /api/cardapio/categoria/:id
 * Editar categoria
 */
router.put('/categoria/:id', authMiddleware, apenasMaster, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { nome, layoutTipo, status } = req.body;

        // Verificar ownership via join
        const categoria = await prisma.menuCategoria.findFirst({
            where: { id },
            include: { cardapio: true }
        });
        if (!categoria || categoria.cardapio.empresaId !== req.user.empresaId) {
            return res.status(404).json({ erro: 'Categoria não encontrada' });
        }

        const data = {};
        if (nome !== undefined) data.nome = nome.trim();
        if (layoutTipo !== undefined) data.layoutTipo = layoutTipo;
        if (status !== undefined) data.status = Boolean(status);

        const atualizada = await prisma.menuCategoria.update({
            where: { id },
            data
        });

        res.json({ success: true, categoria: atualizada });
    } catch (error) {
        console.error('❌ Erro ao editar categoria:', error);
        res.status(500).json({ erro: error.message });
    }
});

/**
 * DELETE /api/cardapio/categoria/:id
 * Excluir categoria + produtos + imagens
 */
router.delete('/categoria/:id', authMiddleware, apenasMaster, async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const categoria = await prisma.menuCategoria.findFirst({
            where: { id },
            include: { cardapio: true, produtos: true }
        });
        if (!categoria || categoria.cardapio.empresaId !== req.user.empresaId) {
            return res.status(404).json({ erro: 'Categoria não encontrada' });
        }

        // Remover imagens
        for (const prod of categoria.produtos) {
            removerImagem(prod.fotoCaminho);
        }

        await prisma.menuCategoria.delete({ where: { id } });

        console.log(`✅ Categoria excluída: "${categoria.nome}" por ${req.user.email}`);
        res.json({ success: true, mensagem: 'Categoria excluída' });
    } catch (error) {
        console.error('❌ Erro ao excluir categoria:', error);
        res.status(500).json({ erro: error.message });
    }
});

// ─── PRODUTO CRUD ──────────────────────────────────────────

/**
 * POST /api/cardapio/produto
 * Criar produto (FormData com foto)
 */
router.post('/produto', authMiddleware, apenasMaster, upload.single('foto'), async (req, res) => {
    try {
        const { categoriaId, nome, descricao, preco, codPdv, origemPais, tipoUva, tamanhoDose, layoutTipo } = req.body;

        if (!categoriaId || !nome || !nome.trim()) {
            return res.status(400).json({ erro: 'categoriaId e nome são obrigatórios' });
        }

        // Verificar ownership
        const categoria = await prisma.menuCategoria.findFirst({
            where: { id: parseInt(categoriaId) },
            include: { cardapio: true }
        });
        if (!categoria || categoria.cardapio.empresaId !== req.user.empresaId) {
            return res.status(404).json({ erro: 'Categoria não encontrada' });
        }

        const ultimo = await prisma.menuProduto.findFirst({
            where: { categoriaId: parseInt(categoriaId) },
            orderBy: { ordem: 'desc' }
        });

        let fotoCaminho = null;
        if (req.file) {
            fotoCaminho = `/uploads/cardapio/${req.user.empresaId}/${req.file.filename}?t=${Date.now()}`;
        }

        const produto = await prisma.menuProduto.create({
            data: {
                categoriaId: parseInt(categoriaId),
                empresaId: req.user.empresaId,
                nome: nome.trim(),
                descricao: descricao || null,
                preco: preco ? parseFloat(preco) : 0,
                codPdv: codPdv || null,
                origemPais: origemPais || null,
                tipoUva: tipoUva || null,
                tamanhoDose: tamanhoDose || null,
                layoutTipo: layoutTipo || 'normal',
                fotoCaminho,
                ordem: (ultimo?.ordem || 0) + 1,
                status: true
            }
        });

        // Renomear arquivo com o ID real do produto
        if (req.file) {
            const ext = path.extname(req.file.originalname);
            const newName = `${produto.id}_${Date.now()}${ext}`;
            const oldPath = req.file.path;
            const newPath = path.join(path.dirname(oldPath), newName);
            fs.renameSync(oldPath, newPath);

            const novoFotoCaminho = `/uploads/cardapio/${req.user.empresaId}/${newName}?t=${Date.now()}`;
            await prisma.menuProduto.update({
                where: { id: produto.id },
                data: { fotoCaminho: novoFotoCaminho }
            });
            produto.fotoCaminho = novoFotoCaminho;
        }

        console.log(`✅ Produto criado: "${produto.nome}" por ${req.user.email}`);
        res.status(201).json({ success: true, produto });
    } catch (error) {
        console.error('❌ Erro ao criar produto:', error);
        res.status(500).json({ erro: error.message });
    }
});

/**
 * PUT /api/cardapio/produto/:id
 * Editar produto (FormData com foto opcional)
 */
router.put('/produto/:id', authMiddleware, apenasMaster, upload.single('foto'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { nome, descricao, preco, codPdv, origemPais, tipoUva, tamanhoDose, layoutTipo, categoriaId } = req.body;

        const produto = await prisma.menuProduto.findFirst({
            where: { id, empresaId: req.user.empresaId }
        });
        if (!produto) return res.status(404).json({ erro: 'Produto não encontrado' });

        const data = {};
        if (nome !== undefined) data.nome = nome.trim();
        if (descricao !== undefined) data.descricao = descricao || null;
        if (preco !== undefined) data.preco = parseFloat(preco);
        if (codPdv !== undefined) data.codPdv = codPdv || null;
        if (origemPais !== undefined) data.origemPais = origemPais || null;
        if (tipoUva !== undefined) data.tipoUva = tipoUva || null;
        if (tamanhoDose !== undefined) data.tamanhoDose = tamanhoDose || null;
        if (layoutTipo !== undefined) data.layoutTipo = layoutTipo;
        if (categoriaId !== undefined) data.categoriaId = parseInt(categoriaId);

        // Nova foto: remover antiga e salvar nova
        if (req.file) {
            removerImagem(produto.fotoCaminho);

            const ext = path.extname(req.file.originalname);
            const newName = `${id}_${Date.now()}${ext}`;
            const oldPath = req.file.path;
            const newPath = path.join(path.dirname(oldPath), newName);
            fs.renameSync(oldPath, newPath);

            data.fotoCaminho = `/uploads/cardapio/${req.user.empresaId}/${newName}?t=${Date.now()}`;
        }

        const atualizado = await prisma.menuProduto.update({
            where: { id },
            data
        });

        res.json({ success: true, produto: atualizado });
    } catch (error) {
        console.error('❌ Erro ao editar produto:', error);
        res.status(500).json({ erro: error.message });
    }
});

/**
 * DELETE /api/cardapio/produto/:id
 * Excluir produto + imagem do disco
 */
router.delete('/produto/:id', authMiddleware, apenasMaster, async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const produto = await prisma.menuProduto.findFirst({
            where: { id, empresaId: req.user.empresaId }
        });
        if (!produto) return res.status(404).json({ erro: 'Produto não encontrado' });

        removerImagem(produto.fotoCaminho);

        await prisma.menuProduto.delete({ where: { id } });

        console.log(`✅ Produto excluído: "${produto.nome}" por ${req.user.email}`);
        res.json({ success: true, mensagem: 'Produto excluído' });
    } catch (error) {
        console.error('❌ Erro ao excluir produto:', error);
        res.status(500).json({ erro: error.message });
    }
});

/**
 * PUT /api/cardapio/produto/:id/status
 * Pausar/ativar produto
 */
router.put('/produto/:id/status', authMiddleware, apenasMaster, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status } = req.body;

        const produto = await prisma.menuProduto.findFirst({
            where: { id, empresaId: req.user.empresaId }
        });
        if (!produto) return res.status(404).json({ erro: 'Produto não encontrado' });

        const atualizado = await prisma.menuProduto.update({
            where: { id },
            data: { status: Boolean(status) }
        });

        const acao = atualizado.status ? 'ativado' : 'pausado';
        res.json({ success: true, produto: atualizado, mensagem: `Produto ${acao}` });
    } catch (error) {
        console.error('❌ Erro ao alterar status do produto:', error);
        res.status(500).json({ erro: error.message });
    }
});

/**
 * POST /api/cardapio/produto/:id/duplicar
 * Duplicar produto + copiar imagem
 */
router.post('/produto/:id/duplicar', authMiddleware, apenasMaster, async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const original = await prisma.menuProduto.findFirst({
            where: { id, empresaId: req.user.empresaId }
        });
        if (!original) return res.status(404).json({ erro: 'Produto não encontrado' });

        // Copiar imagem se existir
        let novoFotoCaminho = null;
        if (original.fotoCaminho) {
            try {
                const origRelPath = original.fotoCaminho.split('?')[0];
                const origFullPath = path.join(__dirname, '..', origRelPath);
                if (fs.existsSync(origFullPath)) {
                    const ext = path.extname(origFullPath);
                    const newName = `copia_${Date.now()}${ext}`;
                    const newFullPath = path.join(path.dirname(origFullPath), newName);
                    fs.copyFileSync(origFullPath, newFullPath);
                    novoFotoCaminho = `/uploads/cardapio/${req.user.empresaId}/${newName}?t=${Date.now()}`;
                }
            } catch (e) {
                console.warn('Aviso ao copiar imagem:', e.message);
            }
        }

        const ultimo = await prisma.menuProduto.findFirst({
            where: { categoriaId: original.categoriaId },
            orderBy: { ordem: 'desc' }
        });

        const duplicado = await prisma.menuProduto.create({
            data: {
                categoriaId: original.categoriaId,
                empresaId: req.user.empresaId,
                nome: `${original.nome} (cópia)`,
                descricao: original.descricao,
                preco: original.preco,
                codPdv: original.codPdv,
                origemPais: original.origemPais,
                tipoUva: original.tipoUva,
                tamanhoDose: original.tamanhoDose,
                layoutTipo: original.layoutTipo,
                fotoCaminho: novoFotoCaminho,
                ordem: (ultimo?.ordem || 0) + 1,
                status: true
            }
        });

        // Renomear com ID correto
        if (novoFotoCaminho) {
            const copiaRelPath = novoFotoCaminho.split('?')[0];
            const copiaFullPath = path.join(__dirname, '..', copiaRelPath);
            if (fs.existsSync(copiaFullPath)) {
                const ext = path.extname(copiaFullPath);
                const finalName = `${duplicado.id}_${Date.now()}${ext}`;
                const finalPath = path.join(path.dirname(copiaFullPath), finalName);
                fs.renameSync(copiaFullPath, finalPath);
                const finalCaminho = `/uploads/cardapio/${req.user.empresaId}/${finalName}?t=${Date.now()}`;
                await prisma.menuProduto.update({
                    where: { id: duplicado.id },
                    data: { fotoCaminho: finalCaminho }
                });
                duplicado.fotoCaminho = finalCaminho;
            }
        }

        console.log(`✅ Produto duplicado: "${duplicado.nome}" por ${req.user.email}`);
        res.status(201).json({ success: true, produto: duplicado });
    } catch (error) {
        console.error('❌ Erro ao duplicar produto:', error);
        res.status(500).json({ erro: error.message });
    }
});

// ─── REORDENAR ─────────────────────────────────────────────

/**
 * PUT /api/cardapio/reordenar
 * Reordenar itens { tipo: "cardapio"|"categoria"|"produto", itens: [{id, ordem}] }
 */
router.put('/reordenar', authMiddleware, apenasMaster, async (req, res) => {
    try {
        const { tipo, itens } = req.body;

        if (!tipo || !itens || !Array.isArray(itens)) {
            return res.status(400).json({ erro: 'tipo e itens são obrigatórios' });
        }

        const modelMap = {
            cardapio: prisma.menuCardapio,
            categoria: prisma.menuCategoria,
            produto: prisma.menuProduto
        };

        const model = modelMap[tipo];
        if (!model) return res.status(400).json({ erro: 'Tipo inválido' });

        // Atualizar ordens em transação
        await prisma.$transaction(
            itens.map(item =>
                model.update({
                    where: { id: parseInt(item.id) },
                    data: { ordem: parseInt(item.ordem) }
                })
            )
        );

        res.json({ success: true, mensagem: 'Ordem atualizada' });
    } catch (error) {
        console.error('❌ Erro ao reordenar:', error);
        res.status(500).json({ erro: error.message });
    }
});

module.exports = router;
