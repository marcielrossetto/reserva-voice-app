/**
 * routes/usuario.routes.js
 * CRUD de usuários da empresa
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middlewares/authMiddleware');

// Middleware: apenas master pode gerenciar usuários
function apenasMaster(req, res, next) {
    if (req.user.nivel !== 'master') {
        return res.status(403).json({ erro: 'Sem permissão. Apenas master pode gerenciar usuários.' });
    }
    next();
}

const validarSenhaForte = (senha) => {
    return /[A-Z]/.test(senha) && /[a-z]/.test(senha) && /[0-9]/.test(senha) &&
           /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha) && senha.length >= 8;
};

/**
 * GET /api/usuario/perfil
 * Retorna dados do usuário autenticado
 */
router.get('/perfil', authMiddleware, async (req, res) => {
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                nome: true,
                email: true,
                nivel: true,
                status: true,
                dataEmissao: true,
                ultimoAcesso: true,
                empresaId: true
            }
        });

        if (!usuario) {
            return res.status(404).json({ erro: 'Usuário não encontrado' });
        }

        res.json(usuario);
    } catch (error) {
        console.error('❌ Erro ao buscar perfil:', error);
        res.status(500).json({ erro: error.message });
    }
});

/**
 * GET /api/usuario/listar
 * Lista todos os usuários da mesma empresa
 */
router.get('/listar', authMiddleware, apenasMaster, async (req, res) => {
    try {
        const usuarios = await prisma.usuario.findMany({
            where: { empresaId: req.user.empresaId },
            select: {
                id: true,
                nome: true,
                email: true,
                nivel: true,
                status: true,
                dataEmissao: true,
                ultimoAcesso: true
            },
            orderBy: { nome: 'asc' }
        });

        res.json({ success: true, usuarios });
    } catch (error) {
        console.error('❌ Erro ao listar usuários:', error);
        res.status(500).json({ erro: error.message });
    }
});

/**
 * GET /api/usuario/:id
 * Detalhe de um usuário (mesma empresa)
 */
router.get('/:id', authMiddleware, apenasMaster, async (req, res) => {
    try {
        const usuario = await prisma.usuario.findFirst({
            where: {
                id: parseInt(req.params.id),
                empresaId: req.user.empresaId
            },
            select: {
                id: true,
                nome: true,
                email: true,
                nivel: true,
                status: true,
                dataEmissao: true,
                ultimoAcesso: true
            }
        });

        if (!usuario) {
            return res.status(404).json({ erro: 'Usuário não encontrado' });
        }

        res.json({ success: true, usuario });
    } catch (error) {
        console.error('❌ Erro ao buscar usuário:', error);
        res.status(500).json({ erro: error.message });
    }
});

/**
 * POST /api/usuario
 * Criar novo usuário na empresa
 */
router.post('/', authMiddleware, apenasMaster, async (req, res) => {
    try {
        const { nome, email, senha, nivel } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
        }

        if (!validarSenhaForte(senha)) {
            return res.status(400).json({ erro: 'Senha deve ter 8+ caracteres, maiúscula, minúscula, número e caractere especial' });
        }

        const niveisPermitidos = ['master', 'admin', 'usuario'];
        const nivelFinal = niveisPermitidos.includes(nivel) ? nivel : 'usuario';

        const existente = await prisma.usuario.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (existente) {
            return res.status(409).json({ erro: 'Este email já está em uso' });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const novoUsuario = await prisma.usuario.create({
            data: {
                nome: nome.trim(),
                email: email.toLowerCase().trim(),
                senha: senhaHash,
                nivel: nivelFinal,
                empresaId: req.user.empresaId,
                status: true
            },
            select: {
                id: true,
                nome: true,
                email: true,
                nivel: true,
                status: true,
                dataEmissao: true
            }
        });

        console.log(`✅ Usuário criado: ${novoUsuario.email} por ${req.user.email}`);
        res.status(201).json({ success: true, usuario: novoUsuario });
    } catch (error) {
        console.error('❌ Erro ao criar usuário:', error);
        res.status(500).json({ erro: error.message });
    }
});

/**
 * PUT /api/usuario/:id
 * Editar usuário (nome, email, nivel)
 */
router.put('/:id', authMiddleware, apenasMaster, async (req, res) => {
    try {
        const { nome, email, nivel } = req.body;
        const id = parseInt(req.params.id);

        const usuario = await prisma.usuario.findFirst({
            where: { id, empresaId: req.user.empresaId }
        });

        if (!usuario) {
            return res.status(404).json({ erro: 'Usuário não encontrado' });
        }

        const dadosAtualizar = {};
        if (nome) dadosAtualizar.nome = nome.trim();
        if (nivel) {
            const niveisPermitidos = ['master', 'admin', 'usuario'];
            if (niveisPermitidos.includes(nivel)) {
                dadosAtualizar.nivel = nivel;
            }
        }
        if (email && email.toLowerCase() !== usuario.email) {
            const existente = await prisma.usuario.findUnique({
                where: { email: email.toLowerCase() }
            });
            if (existente) {
                return res.status(409).json({ erro: 'Este email já está em uso' });
            }
            dadosAtualizar.email = email.toLowerCase().trim();
        }

        const atualizado = await prisma.usuario.update({
            where: { id },
            data: dadosAtualizar,
            select: {
                id: true,
                nome: true,
                email: true,
                nivel: true,
                status: true,
                dataEmissao: true,
                ultimoAcesso: true
            }
        });

        console.log(`✅ Usuário editado: ${atualizado.email} por ${req.user.email}`);
        res.json({ success: true, usuario: atualizado });
    } catch (error) {
        console.error('❌ Erro ao editar usuário:', error);
        res.status(500).json({ erro: error.message });
    }
});

/**
 * PUT /api/usuario/:id/status
 * Ativar/desativar usuário
 */
router.put('/:id/status', authMiddleware, apenasMaster, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status } = req.body;

        if (id === req.user.id) {
            return res.status(400).json({ erro: 'Você não pode desativar sua própria conta' });
        }

        const usuario = await prisma.usuario.findFirst({
            where: { id, empresaId: req.user.empresaId }
        });

        if (!usuario) {
            return res.status(404).json({ erro: 'Usuário não encontrado' });
        }

        const atualizado = await prisma.usuario.update({
            where: { id },
            data: { status: Boolean(status) },
            select: { id: true, nome: true, status: true }
        });

        const acao = atualizado.status ? 'ativado' : 'desativado';
        console.log(`✅ Usuário ${acao}: ${atualizado.nome} por ${req.user.email}`);
        res.json({ success: true, usuario: atualizado, mensagem: `Usuário ${acao}` });
    } catch (error) {
        console.error('❌ Erro ao alterar status:', error);
        res.status(500).json({ erro: error.message });
    }
});

/**
 * PUT /api/usuario/:id/senha
 * Alterar senha de um usuário
 */
router.put('/:id/senha', authMiddleware, apenasMaster, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { novaSenha } = req.body;

        if (!novaSenha) {
            return res.status(400).json({ erro: 'Nova senha é obrigatória' });
        }

        if (!validarSenhaForte(novaSenha)) {
            return res.status(400).json({ erro: 'Senha deve ter 8+ caracteres, maiúscula, minúscula, número e caractere especial' });
        }

        const usuario = await prisma.usuario.findFirst({
            where: { id, empresaId: req.user.empresaId }
        });

        if (!usuario) {
            return res.status(404).json({ erro: 'Usuário não encontrado' });
        }

        const senhaHash = await bcrypt.hash(novaSenha, 10);

        await prisma.usuario.update({
            where: { id },
            data: { senha: senhaHash }
        });

        console.log(`✅ Senha alterada do usuário ${usuario.email} por ${req.user.email}`);
        res.json({ success: true, mensagem: 'Senha alterada com sucesso' });
    } catch (error) {
        console.error('❌ Erro ao alterar senha:', error);
        res.status(500).json({ erro: error.message });
    }
});

module.exports = router;
