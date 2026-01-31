/**
 * routes/auth.js - REFATORADO
 * ✅ Suporte ao modelo Usuario (login)
 * ✅ Rota /me para Perfil do Header
 * ✅ Criptografia e JWT
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma'); // Ajuste o caminho conforme seu projeto
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-aqui';

// ========== CONFIGURAÇÃO NODEMAILER ==========
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// ========== AUXILIARES ==========
const gerarTokenPin = () => Math.floor(100000 + Math.random() * 900000).toString();

const validarSenhaForte = (senha) => {
    return /[A-Z]/.test(senha) && /[a-z]/.test(senha) && /[0-9]/.test(senha) && 
           /[!@#$%^&*()]/.test(senha) && senha.length >= 8;
};

const gerarJWT = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, empresaId: user.empresaId, nivel: user.nivel },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// ========== ROTAS PÚBLICAS ==========

/**
 * POST /api/auth/login
 * Realiza login e atualiza o último acesso
 */
router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) return res.status(400).json({ erro: 'E-mail e senha obrigatórios' });

        const usuario = await prisma.usuario.findUnique({
            where: { email: email.toLowerCase() },
            include: { empresa: true }
        });

        if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
            return res.status(401).json({ erro: 'E-mail ou senha incorretos' });
        }

        if (!usuario.status) return res.status(403).json({ erro: 'Usuário desativado' });

        // Verificar expiração da empresa
        if (usuario.empresa.dataExpiracao && new Date() > new Date(usuario.empresa.dataExpiracao)) {
            return res.status(403).json({ erro: 'Assinatura da empresa expirada' });
        }

        // Atualizar Último Acesso
        await prisma.usuario.update({
            where: { id: usuario.id },
            data: { ultimoAcesso: new Date() }
        });

        const token = gerarJWT(usuario);

        res.json({
            sucesso: true,
            token,
            empresaId: usuario.empresaId,
            nome: usuario.nome,
            email: usuario.email,
            nivel: usuario.nivel
        });
    } catch (error) {
        console.error('❌ Erro login:', error);
        res.status(500).json({ erro: 'Erro interno no login' });
    }
});

/**
 * POST /api/auth/cadastro
 * Cria Empresa e o Usuário Master (Admin)
 */
router.post('/cadastro', async (req, res) => {
    try {
        const { nomeEmpresa, telefone, cnpjCpf, email, senha } = req.body;

        if (!validarSenhaForte(senha)) return res.status(400).json({ erro: 'Senha não atende aos requisitos de segurança' });

        const usuarioExiste = await prisma.usuario.findUnique({ where: { email: email.toLowerCase() } });
        if (usuarioExiste) return res.status(400).json({ erro: 'E-mail já cadastrado' });

        const senhaHash = await bcrypt.hash(senha, 10);
        const dataExpiracao = new Date();
        dataExpiracao.setDate(dataExpiracao.getDate() + 7);

        // Transaction: Garante que cria ambos ou nenhum
        const resultado = await prisma.$transaction(async (tx) => {
            const novaEmpresa = await tx.empresa.create({
                data: {
                    nomeEmpresa: nomeEmpresa.trim(),
                    email: email.toLowerCase(),
                    telefone: telefone.trim(),
                    cnpjCpf: cnpjCpf.trim(),
                    dataExpiracao,
                    status: true
                }
            });

            const novoUsuario = await tx.usuario.create({
                data: {
                    empresaId: novaEmpresa.id,
                    nome: nomeEmpresa.trim(), // Ou nome do responsável
                    email: email.toLowerCase(),
                    senha: senhaHash,
                    nivel: 'master',
                    status: true
                }
            });

            return { novaEmpresa, novoUsuario };
        });

        const token = gerarJWT(resultado.novoUsuario);

        res.json({
            sucesso: true,
            token,
            empresaId: resultado.novaEmpresa.id,
            email: resultado.novoUsuario.email
        });
    } catch (error) {
        console.error('❌ Erro cadastro:', error);
        res.status(500).json({ erro: 'Erro ao processar cadastro' });
    }
});

// ========== ROTAS PROTEGIDAS (REQUEREM TOKEN) ==========

/**
 * GET /api/auth/me
 * Retorna dados do usuário logado para o Header
 */
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: req.user.id },
            select: {
                nome: true,
                email: true,
                nivel: true,
                dataEmissao: true,
                ultimoAcesso: true,
                empresa: { select: { nomeEmpresa: true } }
            }
        });

        if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });

        res.json(usuario);
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao buscar perfil' });
    }
});

/**
 * GET /api/auth/validate
 * Validação simples de token usada pelo header.js
 */
router.get('/validate', authMiddleware, (req, res) => {
    res.json({
        valido: true,
        id: req.user.id,
        email: req.user.email,
        empresaId: req.user.empresaId
    });
});

// ========== RECUPERAÇÃO DE SENHA ==========

router.post('/solicitar-token-senha', async (req, res) => {
    try {
        const { email } = req.body;
        const usuario = await prisma.usuario.findUnique({ where: { email: email.toLowerCase() } });

        if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });

        const pin = gerarTokenPin();
        const expiracao = new Date(Date.now() + 15 * 60 * 1000);

        await prisma.usuario.update({
            where: { id: usuario.id },
            data: {
                pinRecuperacao: pin,
                pinExpiracao: expiracao
            }
        });

        // Enviar e-mail (Lógica resumida)
        console.log(`🔐 PIN para ${email}: ${pin}`);
        
        res.json({ sucesso: true, mensagem: 'Código enviado para seu e-mail' });
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao solicitar recuperação' });
    }
});

router.post('/atualizar-senha-esquecida', async (req, res) => {
    try {
        const { email, token, novaSenha } = req.body;

        const usuario = await prisma.usuario.findUnique({ where: { email: email.toLowerCase() } });

        if (!usuario || usuario.pinRecuperacao !== token || new Date() > usuario.pinExpiracao) {
            return res.status(401).json({ erro: 'Código inválido ou expirado' });
        }

        if (!validarSenhaForte(novaSenha)) return res.status(400).json({ erro: 'Senha nova é fraca' });

        const novaSenhaHash = await bcrypt.hash(novaSenha, 10);

        await prisma.usuario.update({
            where: { id: usuario.id },
            data: {
                senha: novaSenhaHash,
                pinRecuperacao: null,
                pinExpiracao: null
            }
        });

        res.json({ sucesso: true, mensagem: 'Senha atualizada com sucesso' });
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao resetar senha' });
    }
});

module.exports = router;