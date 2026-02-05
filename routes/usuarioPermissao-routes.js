const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');
const auth = require('../middlewares/authMiddleware');

// LISTAR (Filtrado por Empresa)
router.get('/listar', auth, async (req, res) => {
    try {
        const usuarios = await prisma.usuarioPermissao.findMany({
            where: { empresaId: req.user.empresaId }, // TRAVA NA EMPRESA
            orderBy: { criadoEm: 'desc' }
        });
        res.json({ success: true, usuarios });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// CADASTRAR COM SENHA
// Exemplo da Rota de Cadastro no Backend
router.post('/cadastrar', auth, async (req, res) => {
    const { nome, email, senha, funcao, role } = req.body;
    try {
        const passwordHash = await bcrypt.hash(senha, 10);
        const novoUsuario = await prisma.usuarioPermissao.create({
            data: {
                nome,
                email: email.toLowerCase(),
                senha: passwordHash,
                funcao,
                role,
                empresaId: req.user.empresaId, // TRAVA NA EMPRESA DO LOGADO
                ativo: true
            }
        });
        res.json({ success: true, usuario: novoUsuario });
    } catch (err) {
        res.status(400).json({ error: "E-mail já cadastrado nesta ou em outra empresa." });
    }
});

module.exports = router;