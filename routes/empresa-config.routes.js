const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ─── Middleware: apenas master ───────────────────────────────────────
function apenasMaster(req, res, next) {
    if (req.user.nivel !== 'master') {
        return res.status(403).json({ erro: 'Apenas master pode fazer isso.' });
    }
    next();
}

// ─── Multer: upload de logo ──────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const empresaId = req.user.empresaId;
        const dir = `./uploads/logos/${empresaId}`;
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `logo${ext}`);
    }
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ═══════════════════════════════════════════════════════════════════════
// GET /  —  Buscar configurações da empresa
// ═══════════════════════════════════════════════════════════════════════
router.get('/', authMiddleware, apenasMaster, async (req, res) => {
    try {
        const empresaId = req.user.empresaId;

        const config = await prisma.empresa.findUnique({
            where: { id: empresaId },
            select: {
                nomeEmpresa: true,
                logoCaminho: true,
                email: true,
                telefone: true,
                cnpjCpf: true,
                capacidadeAlmoco: true,
                capacidadeJanta: true
            }
        });

        if (!config) {
            return res.status(404).json({ erro: 'Empresa não encontrada' });
        }

        res.json({ success: true, config });
    } catch (error) {
        console.error('Erro ao buscar config empresa:', error);
        res.status(500).json({ erro: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════
// PUT /  —  Atualizar configurações (com upload de logo opcional)
// ═══════════════════════════════════════════════════════════════════════
router.put('/', authMiddleware, apenasMaster, upload.single('logo'), async (req, res) => {
    try {
        const empresaId = req.user.empresaId;
        const { capacidadeAlmoco, capacidadeJanta } = req.body;
        const data = {};

        // Capacidade
        if (capacidadeAlmoco !== undefined && capacidadeAlmoco !== '') {
            data.capacidadeAlmoco = parseInt(capacidadeAlmoco) || null;
        } else if (capacidadeAlmoco === '') {
            data.capacidadeAlmoco = null;
        }

        if (capacidadeJanta !== undefined && capacidadeJanta !== '') {
            data.capacidadeJanta = parseInt(capacidadeJanta) || null;
        } else if (capacidadeJanta === '') {
            data.capacidadeJanta = null;
        }

        // Logo (se enviou arquivo)
        if (req.file) {
            data.logoCaminho = `/uploads/logos/${empresaId}/${req.file.filename}?t=${Date.now()}`;
        }

        const empresa = await prisma.empresa.update({
            where: { id: empresaId },
            data,
            select: {
                nomeEmpresa: true,
                logoCaminho: true,
                email: true,
                telefone: true,
                cnpjCpf: true,
                capacidadeAlmoco: true,
                capacidadeJanta: true
            }
        });

        res.json({ success: true, config: empresa });
    } catch (error) {
        console.error('Erro ao atualizar config empresa:', error);
        res.status(500).json({ erro: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════
// GET /capacidade/:data  —  Consultar capacidade e reservas do dia
// ═══════════════════════════════════════════════════════════════════════
router.get('/capacidade/:data', authMiddleware, async (req, res) => {
    try {
        const empresaId = req.user.empresaId;
        const dataParam = req.params.data; // YYYY-MM-DD

        // Buscar capacidade da empresa
        const empresa = await prisma.empresa.findUnique({
            where: { id: empresaId },
            select: { capacidadeAlmoco: true, capacidadeJanta: true }
        });

        if (!empresa) {
            return res.status(404).json({ erro: 'Empresa não encontrada' });
        }

        const dateObj = new Date(dataParam + 'T00:00:00.000Z');

        // Total reservado almoço (horário <= 15:00)
        const totalAlmoco = await prisma.cliente.aggregate({
            where: {
                empresaId,
                data: dateObj,
                status: true,
                horario: { lte: '15:00:00' }
            },
            _sum: { numPessoas: true }
        });

        // Total reservado janta (horário > 15:00)
        const totalJanta = await prisma.cliente.aggregate({
            where: {
                empresaId,
                data: dateObj,
                status: true,
                horario: { gt: '15:00:00' }
            },
            _sum: { numPessoas: true }
        });

        res.json({
            success: true,
            capacidadeAlmoco: empresa.capacidadeAlmoco,
            capacidadeJanta: empresa.capacidadeJanta,
            reservadoAlmoco: totalAlmoco._sum.numPessoas || 0,
            reservadoJanta: totalJanta._sum.numPessoas || 0
        });
    } catch (error) {
        console.error('Erro ao buscar capacidade:', error);
        res.status(500).json({ erro: error.message });
    }
});

module.exports = router;
