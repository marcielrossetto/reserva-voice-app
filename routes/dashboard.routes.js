/**
 * routes/dashboard.routes.js
 * API de metricas agregadas para Dashboard BI
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const auth = require('../middlewares/authMiddleware');

/**
 * Calcula range de datas por periodo OU por datas customizadas
 */
function calcRange(periodo, dataInicio, dataFim) {
    // Se tem datas customizadas, usa elas
    if (dataInicio && dataFim) {
        const start = new Date(dataInicio + 'T00:00:00');
        const end = new Date(dataFim + 'T00:00:00');
        // end + 1 dia para incluir o ultimo dia inteiro
        const endPlusOne = new Date(end);
        endPlusOne.setDate(endPlusOne.getDate() + 1);

        // Periodo anterior = mesma duracao antes do inicio
        const diffMs = end.getTime() - start.getTime() + 86400000; // +1 dia em ms
        const prevEnd = new Date(start);
        const prevStart = new Date(start.getTime() - diffMs);

        return { start, end: endPlusOne, prevStart, prevEnd };
    }

    // Range por periodo
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    let start, prevStart, prevEnd;

    switch (periodo) {
        case '7d':
            start = new Date(end); start.setDate(start.getDate() - 7);
            prevEnd = new Date(start);
            prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - 7);
            break;
        case '90d':
            start = new Date(end); start.setDate(start.getDate() - 90);
            prevEnd = new Date(start);
            prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - 90);
            break;
        case '12m':
            start = new Date(end); start.setFullYear(start.getFullYear() - 1);
            prevEnd = new Date(start);
            prevStart = new Date(prevEnd); prevStart.setFullYear(prevStart.getFullYear() - 1);
            break;
        default: // 30d
            start = new Date(end); start.setDate(start.getDate() - 30);
            prevEnd = new Date(start);
            prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - 30);
    }
    return { start, end, prevStart, prevEnd };
}

function calcVariacao(atual, anterior) {
    if (!anterior || anterior === 0) return atual > 0 ? 100 : 0;
    return Math.round(((atual - anterior) / anterior) * 100);
}

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];

/**
 * GET /api/dashboard/metricas?periodo=7d|30d|90d|12m
 * GET /api/dashboard/metricas?dataInicio=2025-01-01&dataFim=2025-01-31
 */
router.get('/metricas', auth, async (req, res) => {
    try {
        const empresaId = req.user.empresaId;
        const periodo = req.query.periodo || '30d';
        const dataInicio = req.query.dataInicio || null;
        const dataFim = req.query.dataFim || null;

        const { start, end, prevStart, prevEnd } = calcRange(periodo, dataInicio, dataFim);

        // ===== QUERIES PARALELAS =====
        const [
            reservasAtual,
            reservasPrev,
            canceladasAtual,
            canceladasPrev,
            confirmadasAtual
        ] = await Promise.all([
            // Reservas periodo atual (ativas + canceladas)
            prisma.cliente.findMany({
                where: { empresaId, data: { gte: start, lt: end } },
                select: {
                    id: true, data: true, numPessoas: true, horario: true,
                    telefone: true, nome: true, status: true, confirmado: true,
                    formaPagamento: true, valorRodizio: true, motivoCancelamento: true
                }
            }),
            // Reservas periodo anterior
            prisma.cliente.findMany({
                where: { empresaId, data: { gte: prevStart, lt: prevEnd } },
                select: { id: true, numPessoas: true, status: true, confirmado: true, valorRodizio: true }
            }),
            // Canceladas atual
            prisma.cliente.count({
                where: { empresaId, data: { gte: start, lt: end }, status: false }
            }),
            // Canceladas anterior
            prisma.cliente.count({
                where: { empresaId, data: { gte: prevStart, lt: prevEnd }, status: false }
            }),
            // Confirmadas atual
            prisma.cliente.count({
                where: { empresaId, data: { gte: start, lt: end }, confirmado: true }
            })
        ]);

        const totalAtual = reservasAtual.length;
        const totalPrev = reservasPrev.length;
        const paxAtual = reservasAtual.reduce((s, r) => s + r.numPessoas, 0);
        const paxPrev = reservasPrev.reduce((s, r) => s + r.numPessoas, 0);
        const ativasAtual = reservasAtual.filter(r => r.status).length;

        // KPIs
        const taxaCancelamento = totalAtual > 0 ? Math.round((canceladasAtual / totalAtual) * 100) : 0;
        const taxaCancelPrev = totalPrev > 0 ? Math.round((canceladasPrev / totalPrev) * 100) : 0;
        const taxaConfirmacao = ativasAtual > 0 ? Math.round((confirmadasAtual / ativasAtual) * 100) : 0;
        const mediaPax = ativasAtual > 0 ? (paxAtual / ativasAtual).toFixed(1) : 0;

        const somaRodizio = reservasAtual.filter(r => r.status && r.valorRodizio).reduce((s, r) => s + (r.valorRodizio || 0), 0);
        const somaRodizioPrev = reservasPrev.filter(r => r.status && r.valorRodizio).reduce((s, r) => s + (r.valorRodizio || 0), 0);
        const ativasPrev = reservasPrev.filter(r => r.status).length;
        const ticketMedio = ativasAtual > 0 ? Math.round(somaRodizio / ativasAtual) : 0;
        const ticketMedioPrev = ativasPrev > 0 ? Math.round(somaRodizioPrev / ativasPrev) : 0;

        // ===== SERIE TEMPORAL =====
        const serieMap = {};
        reservasAtual.forEach(r => {
            const dia = new Date(r.data).toISOString().split('T')[0];
            if (!serieMap[dia]) serieMap[dia] = { reservas: 0, pax: 0 };
            serieMap[dia].reservas++;
            if (r.status) serieMap[dia].pax += r.numPessoas;
        });

        const labels = Object.keys(serieMap).sort();
        const serieTemporal = {
            labels: labels.map(d => {
                const [, m, day] = d.split('-');
                return `${day}/${m}`;
            }),
            reservas: labels.map(d => serieMap[d].reservas),
            pax: labels.map(d => serieMap[d].pax)
        };

        // ===== ALMOCO vs JANTAR =====
        let almoco = 0, jantar = 0;
        reservasAtual.filter(r => r.status).forEach(r => {
            const h = parseInt(r.horario.split(':')[0], 10);
            if (h < 18) almoco++; else jantar++;
        });

        // ===== DIA DA SEMANA =====
        const diaSemana = [0, 0, 0, 0, 0, 0, 0];
        reservasAtual.filter(r => r.status).forEach(r => {
            const dow = new Date(r.data).getDay();
            diaSemana[dow]++;
        });

        // ===== TOP 10 CLIENTES =====
        const clienteMap = {};
        reservasAtual.filter(r => r.status && r.telefone).forEach(r => {
            const key = r.telefone;
            if (!clienteMap[key]) clienteMap[key] = { nome: r.nome, qtd: 0 };
            clienteMap[key].qtd++;
        });
        const topClientes = Object.values(clienteMap)
            .sort((a, b) => b.qtd - a.qtd)
            .slice(0, 10);

        // ===== FORMA PAGAMENTO =====
        const pgtoMap = {};
        reservasAtual.filter(r => r.status && r.formaPagamento).forEach(r => {
            const fp = r.formaPagamento;
            pgtoMap[fp] = (pgtoMap[fp] || 0) + 1;
        });

        // ===== MOTIVOS CANCELAMENTO =====
        const cancelMap = {};
        reservasAtual.filter(r => !r.status && r.motivoCancelamento).forEach(r => {
            const m = r.motivoCancelamento.substring(0, 40);
            cancelMap[m] = (cancelMap[m] || 0) + 1;
        });
        const motivosCancelamento = Object.entries(cancelMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        res.json({
            success: true,
            periodo: dataInicio ? `${dataInicio} a ${dataFim}` : periodo,
            kpis: {
                totalReservas: { valor: totalAtual, variacao: calcVariacao(totalAtual, totalPrev) },
                totalPax: { valor: paxAtual, variacao: calcVariacao(paxAtual, paxPrev) },
                taxaCancelamento: { valor: taxaCancelamento, variacao: calcVariacao(taxaCancelamento, taxaCancelPrev) },
                taxaConfirmacao: { valor: taxaConfirmacao, variacao: 0 },
                ticketMedio: { valor: ticketMedio, variacao: calcVariacao(ticketMedio, ticketMedioPrev) },
                mediaPax: { valor: parseFloat(mediaPax), variacao: 0 }
            },
            serieTemporal,
            periodos: { almoco, jantar },
            diaSemana: { labels: DIAS_SEMANA, dados: diaSemana },
            topClientes: {
                labels: topClientes.map(c => c.nome),
                dados: topClientes.map(c => c.qtd)
            },
            formaPagamento: {
                labels: Object.keys(pgtoMap),
                dados: Object.values(pgtoMap)
            },
            motivosCancelamento: {
                labels: motivosCancelamento.map(m => m[0]),
                dados: motivosCancelamento.map(m => m[1])
            }
        });

    } catch (err) {
        console.error('❌ Erro dashboard metricas:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
