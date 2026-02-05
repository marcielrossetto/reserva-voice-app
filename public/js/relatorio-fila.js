/**
 * relatorio-fila.js - Relatório Completo da Fila de Espera
 * Gráficos Chart.js com filtros por data e horário
 */

let charts = {};

const CORES = {
    verde: '#1e8e3e',
    vermelho: '#d93025',
    azul: '#1a73e8',
    laranja: '#e37400',
    roxo: '#8430ce',
    verdeClaro: '#34a853',
    paleta: ['#6a5af9', '#1a73e8', '#1e8e3e', '#e37400', '#d93025', '#8430ce', '#00acc1', '#f4511e', '#43a047', '#5c6bc0']
};

document.addEventListener("DOMContentLoaded", () => {
    if (!localStorage.getItem("token")) {
        window.location.href = '/login.html';
        return;
    }

    // Datas padrão: últimos 30 dias
    const hoje = new Date();
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - 30);

    document.getElementById('dataInicio').value = inicio.toISOString().split('T')[0];
    document.getElementById('dataFim').value = hoje.toISOString().split('T')[0];

    carregarRelatorio();
});

function filtrar() {
    const dataInicio = document.getElementById('dataInicio').value;
    const dataFim = document.getElementById('dataFim').value;

    if (!dataInicio || !dataFim) {
        showToast('Selecione data de início e fim', 'warning');
        return;
    }

    if (dataInicio > dataFim) {
        showToast('Data início deve ser anterior a data fim', 'warning');
        return;
    }

    carregarRelatorio();
}

function limparFiltros() {
    const hoje = new Date();
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - 30);

    document.getElementById('dataInicio').value = inicio.toISOString().split('T')[0];
    document.getElementById('dataFim').value = hoje.toISOString().split('T')[0];
    document.getElementById('horaInicio').value = '';
    document.getElementById('horaFim').value = '';

    carregarRelatorio();
}

async function carregarRelatorio() {
    document.getElementById('loadingRelatorio').style.display = 'block';
    document.getElementById('relatorioContent').style.display = 'none';

    try {
        const dataInicio = document.getElementById('dataInicio').value;
        const dataFim = document.getElementById('dataFim').value;
        const horaInicio = document.getElementById('horaInicio').value;
        const horaFim = document.getElementById('horaFim').value;

        let url = `/api/relatorio-fila?dataInicio=${dataInicio}&dataFim=${dataFim}`;
        if (horaInicio && horaFim) {
            url += `&horaInicio=${horaInicio}&horaFim=${horaFim}`;
        }

        const res = await requisicaoAutenticada(url);
        const data = await res.json();

        if (!data.success) {
            showToast(data.error || 'Erro ao carregar relatório', 'danger');
            document.getElementById('loadingRelatorio').style.display = 'none';
            return;
        }

        renderKPIs(data.kpis);
        renderCharts(data);

        document.getElementById('loadingRelatorio').style.display = 'none';
        document.getElementById('relatorioContent').style.display = 'block';

    } catch (err) {
        console.error('Erro relatório:', err);
        showToast('Erro ao carregar relatório', 'danger');
        document.getElementById('loadingRelatorio').style.display = 'none';
    }
}

// ========== KPIs ==========
function renderKPIs(kpis) {
    document.getElementById('kpiAtendidos').textContent = kpis.totalPessoasAtendidas;
    document.getElementById('kpiCancelados').textContent = kpis.totalPessoasCanceladas;
    document.getElementById('kpiBebidas').textContent = kpis.totalBebidas;
    document.getElementById('kpiReceita').textContent = 'R$ ' + kpis.totalVendas.toFixed(2);
    document.getElementById('kpiTempo').textContent = kpis.tempoMedioEspera + ' min';
    document.getElementById('kpiTaxa').textContent = kpis.taxaAtendimento + '%';
}

// ========== GRÁFICOS ==========
function renderCharts(data) {
    // Destruir gráficos anteriores
    Object.values(charts).forEach(c => { try { c.destroy(); } catch(e) {} });
    charts = {};

    charts.pessoas = criarGraficoPessoas(data.serieTemporal);
    charts.grupos = criarGraficoGrupos(data.tamanhoGrupos);
    charts.bebidas = criarGraficoBebidas(data.serieTemporal);
    charts.topBebidas = criarGraficoTopBebidas(data.topBebidas);
    charts.horario = criarGraficoHorario(data.horarioDistrib);
    charts.prioridade = criarGraficoPrioridade(data.prioridades);
}

function criarGraficoPessoas(serie) {
    const ctx = document.getElementById('chartPessoas').getContext('2d');
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: serie.labels,
            datasets: [
                {
                    label: 'Atendidos',
                    data: serie.atendidos,
                    backgroundColor: CORES.verde + 'cc',
                    borderColor: CORES.verde,
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Cancelados',
                    data: serie.cancelados,
                    backgroundColor: CORES.vermelho + '99',
                    borderColor: CORES.vermelho,
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } },
            scales: {
                y: { beginAtZero: true, stacked: false },
                x: { stacked: false }
            }
        }
    });
}

function criarGraficoGrupos(grupos) {
    const ctx = document.getElementById('chartGrupos').getContext('2d');
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: grupos.labels,
            datasets: [{
                data: grupos.dados,
                backgroundColor: CORES.paleta.slice(0, grupos.labels.length),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' },
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

function criarGraficoBebidas(serie) {
    const ctx = document.getElementById('chartBebidas').getContext('2d');
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: serie.labels,
            datasets: [{
                label: 'Bebidas Vendidas',
                data: serie.bebidas,
                backgroundColor: CORES.roxo + 'cc',
                borderColor: CORES.roxo,
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

function criarGraficoTopBebidas(top) {
    const ctx = document.getElementById('chartTopBebidas').getContext('2d');
    const hasData = top.labels && top.labels.length > 0;

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hasData ? top.labels : ['Sem dados'],
            datasets: [{
                label: 'Quantidade',
                data: hasData ? top.dados : [0],
                backgroundColor: CORES.laranja + '99',
                borderColor: CORES.laranja,
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

function criarGraficoHorario(horario) {
    const ctx = document.getElementById('chartHorario').getContext('2d');
    return new Chart(ctx, {
        type: 'pie',
        data: {
            labels: horario.labels,
            datasets: [{
                data: horario.dados,
                backgroundColor: [CORES.laranja, CORES.azul, CORES.roxo],
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

function criarGraficoPrioridade(prio) {
    const ctx = document.getElementById('chartPrioridade').getContext('2d');
    const hasData = prio.labels && prio.labels.length > 0;

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hasData ? prio.labels : ['Sem prioridades'],
            datasets: [{
                label: 'Atendimentos',
                data: hasData ? prio.dados : [0],
                backgroundColor: CORES.paleta,
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

console.log('relatorio-fila.js carregado');
