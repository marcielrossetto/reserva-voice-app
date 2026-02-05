/**
 * routes/relatorio-fila.routes.js
 * API de relatório completo da fila de espera
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const auth = require('../middlewares/authMiddleware');

/**
 * GET /api/relatorio-fila?dataInicio=&dataFim=&horaInicio=&horaFim=
 * Retorna métricas completas da fila para o período
 */
router.get('/', auth, async (req, res) => {
    try {
        const empresaId = req.user.empresaId;
        const { dataInicio, dataFim, horaInicio, horaFim } = req.query;

        // Datas padrão: últimos 30 dias
        let start, end;
        if (dataInicio && dataFim) {
            start = new Date(dataInicio + 'T00:00:00');
            end = new Date(dataFim + 'T23:59:59');
        } else {
            end = new Date();
            start = new Date();
            start.setDate(start.getDate() - 30);
            start.setHours(0, 0, 0, 0);
        }

        // Buscar todos os registros da fila no período
        const filaRegistros = await prisma.filaEspera.findMany({
            where: {
                empresaId,
                dataCriacao: { gte: start, lte: end }
            },
            orderBy: { dataCriacao: 'asc' }
        });

        // Filtrar por horário se especificado
        let registrosFiltrados = filaRegistros;
        if (horaInicio && horaFim) {
            const [hiH, hiM] = horaInicio.split(':').map(Number);
            const [hfH, hfM] = horaFim.split(':').map(Number);
            const horaInicioMin = hiH * 60 + hiM;
            const horaFimMin = hfH * 60 + hfM;

            registrosFiltrados = filaRegistros.filter(r => {
                const h = r.dataCriacao.getHours();
                const m = r.dataCriacao.getMinutes();
                const minutos = h * 60 + m;
                return minutos >= horaInicioMin && minutos <= horaFimMin;
            });
        }

        // Separar por status
        const atendidos = registrosFiltrados.filter(r => r.status === 1);
        const cancelados = registrosFiltrados.filter(r => r.status === 2);
        const aguardando = registrosFiltrados.filter(r => r.status === 0);

        // KPIs de pessoas
        const totalPessoasAtendidas = atendidos.reduce((s, r) => s + r.numPessoas, 0);
        const totalPessoasCanceladas = cancelados.reduce((s, r) => s + r.numPessoas, 0);
        const totalPessoasAguardando = aguardando.reduce((s, r) => s + r.numPessoas, 0);
        const totalEntradas = registrosFiltrados.length;

        // Taxa de atendimento
        const totalFinalizados = atendidos.length + cancelados.length;
        const taxaAtendimento = totalFinalizados > 0
            ? Math.round((atendidos.length / totalFinalizados) * 100)
            : 0;

        // Tempo médio de espera (em minutos)
        const temposEspera = atendidos
            .filter(r => r.horaSentado)
            .map(r => (new Date(r.horaSentado) - new Date(r.dataCriacao)) / 60000);
        const tempoMedioEspera = temposEspera.length > 0
            ? Math.round(temposEspera.reduce((a, b) => a + b, 0) / temposEspera.length)
            : 0;

        // Buscar bebidas no período
        const bebidas = await prisma.filaBebidas.findMany({
            where: {
                empresaId,
                dataCriacao: { gte: start, lte: end }
            },
            include: {
                fila: { select: { nome: true } }
            }
        });

        // Filtrar bebidas por horário se especificado
        let bebidasFiltradas = bebidas;
        if (horaInicio && horaFim) {
            const [hiH, hiM] = horaInicio.split(':').map(Number);
            const [hfH, hfM] = horaFim.split(':').map(Number);
            const horaInicioMin = hiH * 60 + hiM;
            const horaFimMin = hfH * 60 + hfM;

            bebidasFiltradas = bebidas.filter(b => {
                const h = b.dataCriacao.getHours();
                const m = b.dataCriacao.getMinutes();
                const minutos = h * 60 + m;
                return minutos >= horaInicioMin && minutos <= horaFimMin;
            });
        }

        const totalBebidas = bebidasFiltradas.length;
        const totalVendasBruto = bebidasFiltradas.reduce((s, b) => s + (b.valor || 0), 0);
        const totalVendas = totalVendasBruto * 1.12; // +12% taxa

        // Top bebidas vendidas
        const bebidasMap = {};
        bebidasFiltradas.forEach(b => {
            const nome = b.bebida || 'Outros';
            if (!bebidasMap[nome]) bebidasMap[nome] = { qtd: 0, valor: 0 };
            bebidasMap[nome].qtd++;
            bebidasMap[nome].valor += (b.valor || 0);
        });
        const topBebidas = Object.entries(bebidasMap)
            .map(([nome, data]) => ({ nome, ...data }))
            .sort((a, b) => b.qtd - a.qtd)
            .slice(0, 10);

        // Série temporal: pessoas e bebidas por dia
        const porDiaMap = {};
        registrosFiltrados.forEach(r => {
            const dia = r.dataCriacao.toISOString().split('T')[0];
            if (!porDiaMap[dia]) porDiaMap[dia] = { pessoas: 0, atendidos: 0, cancelados: 0, bebidas: 0, vendas: 0 };
            porDiaMap[dia].pessoas += r.numPessoas;
            if (r.status === 1) porDiaMap[dia].atendidos += r.numPessoas;
            if (r.status === 2) porDiaMap[dia].cancelados += r.numPessoas;
        });

        bebidasFiltradas.forEach(b => {
            const dia = b.dataCriacao.toISOString().split('T')[0];
            if (!porDiaMap[dia]) porDiaMap[dia] = { pessoas: 0, atendidos: 0, cancelados: 0, bebidas: 0, vendas: 0 };
            porDiaMap[dia].bebidas++;
            porDiaMap[dia].vendas += (b.valor || 0);
        });

        const diasOrdenados = Object.keys(porDiaMap).sort();
        const serieTemporal = {
            labels: diasOrdenados.map(d => {
                const [, m, day] = d.split('-');
                return `${day}/${m}`;
            }),
            pessoas: diasOrdenados.map(d => porDiaMap[d].pessoas),
            atendidos: diasOrdenados.map(d => porDiaMap[d].atendidos),
            cancelados: diasOrdenados.map(d => porDiaMap[d].cancelados),
            bebidas: diasOrdenados.map(d => porDiaMap[d].bebidas),
            vendas: diasOrdenados.map(d => porDiaMap[d].vendas)
        };

        // Distribuição por tamanho de grupo
        const tamanhoGrupos = { 'Até 2': 0, '3-4': 0, '5-6': 0, '7-8': 0, '9+': 0 };
        atendidos.forEach(r => {
            const p = r.numPessoas;
            if (p <= 2) tamanhoGrupos['Até 2']++;
            else if (p <= 4) tamanhoGrupos['3-4']++;
            else if (p <= 6) tamanhoGrupos['5-6']++;
            else if (p <= 8) tamanhoGrupos['7-8']++;
            else tamanhoGrupos['9+']++;
        });

        // Distribuição por prioridade
        const prioridadeMap = {};
        registrosFiltrados.filter(r => r.prioridade && r.prioMotivo).forEach(r => {
            const motivo = r.prioMotivo;
            prioridadeMap[motivo] = (prioridadeMap[motivo] || 0) + 1;
        });

        // Distribuição por horário (manhã/tarde/noite)
        const horarioDistrib = { 'Manhã (6h-12h)': 0, 'Tarde (12h-18h)': 0, 'Noite (18h-0h)': 0 };
        atendidos.forEach(r => {
            const h = r.dataCriacao.getHours();
            if (h >= 6 && h < 12) horarioDistrib['Manhã (6h-12h)']++;
            else if (h >= 12 && h < 18) horarioDistrib['Tarde (12h-18h)']++;
            else horarioDistrib['Noite (18h-0h)']++;
        });

        res.json({
            success: true,
            periodo: {
                dataInicio: start.toISOString().split('T')[0],
                dataFim: end.toISOString().split('T')[0],
                horaInicio: horaInicio || null,
                horaFim: horaFim || null
            },
            kpis: {
                totalPessoasAtendidas,
                totalPessoasCanceladas,
                totalPessoasAguardando,
                totalEntradas,
                taxaAtendimento,
                tempoMedioEspera,
                totalBebidas,
                totalVendas: Math.round(totalVendas * 100) / 100
            },
            serieTemporal,
            topBebidas: {
                labels: topBebidas.map(b => b.nome),
                dados: topBebidas.map(b => b.qtd),
                valores: topBebidas.map(b => b.valor)
            },
            tamanhoGrupos: {
                labels: Object.keys(tamanhoGrupos),
                dados: Object.values(tamanhoGrupos)
            },
            prioridades: {
                labels: Object.keys(prioridadeMap),
                dados: Object.values(prioridadeMap)
            },
            horarioDistrib: {
                labels: Object.keys(horarioDistrib),
                dados: Object.values(horarioDistrib)
            }
        });

    } catch (err) {
        console.error('❌ Erro relatório fila:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
