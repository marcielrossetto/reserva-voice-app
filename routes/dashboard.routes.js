const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const auth = require("../middlewares/authMiddleware");

router.get("/stats", auth, async (req, res) => {
    try {
        const empresaId = req.user.empresaId;
        const { start, end } = req.query;

        const dateFilter = {
            gte: new Date(`${start}T00:00:00Z`),
            lte: new Date(`${end}T23:59:59Z`)
        };

        // 1. KPIs GERAIS DE RESERVAS
        const kpisReserva = await prisma.cliente.aggregate({
            where: { empresaId, data: dateFilter },
            _count: { id: true },
            _sum: { numPessoas: true },
        });

        const canceladas = await prisma.cliente.aggregate({
            where: { empresaId, data: dateFilter, status: false },
            _count: { id: true },
            _sum: { numPessoas: true }
        });

        // 2. MÉTRICAS DA FILA DE ESPERA
        const kpisFila = await prisma.filaEspera.groupBy({
            by: ['status'],
            where: { empresaId, dataCriacao: dateFilter },
            _count: { id: true },
            _sum: { numPessoas: true }
        });

        // Organiza dados da fila (0=espera, 1=sentado, 2=desistiu)
        const filaStats = {
            seated: kpisFila.find(f => f.status === 1) || { _count: { id: 0 }, _sum: { numPessoas: 0 } },
            gaveUp: kpisFila.find(f => f.status === 2) || { _count: { id: 0 }, _sum: { numPessoas: 0 } }
        };

        // 3. RANKING DE CLIENTES FIÉIS (VIPs)
        const topClients = await prisma.cliente.groupBy({
            by: ['nome', 'telefone'],
            where: { empresaId, status: true },
            _count: { id: true },
            _sum: { numPessoas: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10
        });

        // 4. PRODUTIVIDADE DA EQUIPE (QUEM MAIS LANÇA)
        const teamProductivity = await prisma.cliente.groupBy({
            by: ['usuarioId'],
            where: { empresaId, data: dateFilter },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } }
        });

        // Busca nomes dos usuários para o ranking
        const users = await prisma.usuario.findMany({
            where: { empresaId },
            select: { id: true, nome: true }
        });

        const teamStats = teamProductivity.map(tp => ({
            nome: users.find(u => u.id === tp.usuarioId)?.nome || "Sistema",
            qtd: tp._count.id
        }));

        // 5. PERFIL DE GRUPOS (PAX)
        const allRes = await prisma.cliente.findMany({
            where: { empresaId, data: dateFilter, status: true },
            select: { numPessoas: true }
        });

        const ranges = { "2-4": 0, "5-8": 0, "10-15": 0, "20+": 0 };
        allRes.forEach(r => {
            if (r.numPessoas <= 4) ranges["2-4"]++;
            else if (r.numPessoas <= 8) ranges["5-8"]++;
            else if (r.numPessoas <= 15) ranges["10-15"]++;
            else ranges["20+"]++;
        });

        res.json({
            success: true,
            kpis: {
                totalPax: kpisReserva._sum.numPessoas || 0,
                totalRes: kpisReserva._count.id,
                lostPax: canceladas._sum.numPessoas || 0,
                lostRes: canceladas._count.id,
                seatedPax: filaStats.seated._sum.numPessoas || 0,
                seatedRes: filaStats.seated._count.id,
                gaveUpRes: filaStats.gaveUp._count.id
            },
            topClients,
            teamStats,
            ranges
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;