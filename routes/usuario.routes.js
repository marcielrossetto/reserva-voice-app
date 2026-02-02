/**
 * routes/usuario.routes.js
 * Endpoints de usuário
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../middlewares/authMiddleware');

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
                criadoEm: true,
                role: true,
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

module.exports = router;