/**
 * dashboard.js - Dashboard BI Intelligence
 * Graficos Chart.js com dados reais
 */

let charts = {};
let periodoAtual = '30d';

const CORES = {
    primaria: '#6a5af9',
    secundaria: '#3d2d43',
    verde: '#1e8e3e',
    vermelho: '#d93025',
    azul: '#1a73e8',
    laranja: '#e37400',
    roxo: '#8430ce',
    paleta: ['#6a5af9', '#1a73e8', '#1e8e3e', '#e37400', '#d93025', '#8430ce', '#00acc1', '#f4511e', '#43a047', '#5c6bc0']
};

document.addEventListener("DOMContentLoaded", () => {
    if (!localStorage.getItem("token")) return;
    carregarDashboard(periodoAtual);
});

function trocarPeriodo(periodo, btn) {
    periodoAtual = periodo;
    document.querySelectorAll('#periodoBtns .btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    carregarDashboard(periodo);
}

async function carregarDashboard(periodo) {
    document.getElementById('loadingDash').style.display = 'block';
    document.getElementById('dashContent').style.display = 'none';

    try {
        const res = await requisicaoAutenticada(`/api/dashboard/metricas?periodo=${periodo}`);
        const data = await res.json();

        if (!data.success) {
            showToast(data.error || 'Erro ao carregar metricas', 'danger');
            return;
        }

        renderKPIs(data.kpis);
        renderCharts(data);

        document.getElementById('loadingDash').style.display = 'none';
        document.getElementById('dashContent').style.display = 'block';
    } catch (err) {
        console.error('Erro dashboard:', err);
        showToast('Erro ao carregar dashboard', 'danger');
    }
}

// ========== KPIs ==========
function renderKPIs(kpis) {
    setKPI('kpiReservas', kpis.totalReservas.valor, 'kpiReservasVar', kpis.totalReservas.variacao);
    setKPI('kpiPax', kpis.totalPax.valor, 'kpiPaxVar', kpis.totalPax.variacao);
    setKPI('kpiCancelamento', kpis.taxaCancelamento.valor + '%', 'kpiCancelVar', kpis.taxaCancelamento.variacao, true);
    setKPI('kpiConfirmacao', kpis.taxaConfirmacao.valor + '%', 'kpiConfirmVar', kpis.taxaConfirmacao.variacao);
    setKPI('kpiTicket', 'R$ ' + kpis.ticketMedio.valor, 'kpiTicketVar', kpis.ticketMedio.variacao);
    setKPI('kpiMediaPax', kpis.mediaPax.valor, 'kpiMediaVar', kpis.mediaPax.variacao);
}

function setKPI(valId, valor, varId, variacao, inverso) {
    document.getElementById(valId).textContent = valor;
    const el = document.getElementById(varId);
    if (!variacao || variacao === 0) {
        el.innerHTML = '<span class="text-muted">--</span>';
        return;
    }
    // Para cancelamento, subir e ruim (inverso)
    const positivo = inverso ? variacao < 0 : variacao > 0;
    const cor = positivo ? CORES.verde : CORES.vermelho;
    const seta = variacao > 0 ? '&#9650;' : '&#9660;';
    el.innerHTML = `<span style="color:${cor}">${seta} ${Math.abs(variacao)}%</span>`;
}

// ========== GRAFICOS ==========
function renderCharts(data) {
    // Destruir graficos anteriores
    Object.values(charts).forEach(c => c.destroy());
    charts = {};

    charts.evolucao = criarGraficoEvolucao(data.serieTemporal);
    charts.periodo = criarGraficoPeriodo(data.periodos);
    charts.diaSemana = criarGraficoDiaSemana(data.diaSemana);
    charts.topClientes = criarGraficoTopClientes(data.topClientes);
    charts.pagamento = criarGraficoPagamento(data.formaPagamento);
    charts.cancelamento = criarGraficoCancelamento(data.motivosCancelamento);
}

function criarGraficoEvolucao(serie) {
    const ctx = document.getElementById('chartEvolucao').getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: serie.labels,
            datasets: [
                {
                    label: 'Reservas',
                    data: serie.reservas,
                    borderColor: CORES.primaria,
                    backgroundColor: CORES.primaria + '20',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3
                },
                {
                    label: 'Pessoas (Pax)',
                    data: serie.pax,
                    borderColor: CORES.verde,
                    backgroundColor: CORES.verde + '20',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function criarGraficoPeriodo(periodos) {
    const ctx = document.getElementById('chartPeriodo').getContext('2d');
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Almoco', 'Jantar'],
            datasets: [{
                data: [periodos.almoco, periodos.jantar],
                backgroundColor: [CORES.laranja, CORES.azul],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
                            return `${ctx.label}: ${ctx.parsed} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

function criarGraficoDiaSemana(dia) {
    const ctx = document.getElementById('chartDiaSemana').getContext('2d');
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dia.labels,
            datasets: [{
                label: 'Reservas',
                data: dia.dados,
                backgroundColor: dia.dados.map((_, i) => CORES.paleta[i % CORES.paleta.length]),
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function criarGraficoTopClientes(top) {
    const ctx = document.getElementById('chartTopClientes').getContext('2d');
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: top.labels.length > 0 ? top.labels : ['Sem dados'],
            datasets: [{
                label: 'Visitas',
                data: top.dados.length > 0 ? top.dados : [0],
                backgroundColor: CORES.primaria + '99',
                borderColor: CORES.primaria,
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true } }
        }
    });
}

function criarGraficoPagamento(pgto) {
    const ctx = document.getElementById('chartPagamento').getContext('2d');
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: pgto.labels.length > 0 ? pgto.labels : ['Sem dados'],
            datasets: [{
                data: pgto.dados.length > 0 ? pgto.dados : [1],
                backgroundColor: CORES.paleta,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function criarGraficoCancelamento(motivos) {
    const ctx = document.getElementById('chartCancelamento').getContext('2d');
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: motivos.labels.length > 0 ? motivos.labels : ['Sem cancelamentos'],
            datasets: [{
                label: 'Quantidade',
                data: motivos.dados.length > 0 ? motivos.dados : [0],
                backgroundColor: CORES.vermelho + '80',
                borderColor: CORES.vermelho,
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

console.log('dashboard.js carregado');
