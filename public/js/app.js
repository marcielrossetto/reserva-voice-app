/**
 * public/js/app.js
 */
const TOKEN = localStorage.getItem("token");

// 1. FUNÇÃO DE FILTRO DE PERÍODO (ÍCONES)
globalThis.setPeriodo = function(valor, btn) {
    document.querySelectorAll('.btn-period').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    const periodoInput = document.getElementById('filterPeriodo');
    if (periodoInput) {
        periodoInput.value = valor;
        globalThis.carregarReservas();
    }
};

// 2. FUNÇÃO PRINCIPAL DE CARREGAMENTO (A QUERY)
globalThis.carregarReservas = async function() {
    const dataInput = document.getElementById('filterStartDate');
    const tbody = document.querySelector("#reservasTable tbody");
    const totalAtivos = document.getElementById("totalAtivos");
    const statusDataDisplay = document.getElementById('statusDataDisplay');
    const buscaInput = document.getElementById('searchInput');
    const periodoInput = document.getElementById('filterPeriodo');

    if (!tbody || !dataInput || !TOKEN) return;

    const dataValue = dataInput.value;

    // Reset visual imediato
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><i class="fas fa-spinner fa-spin"></i></td></tr>';
    
    if (statusDataDisplay && dataValue) {
        const [ano, mes, dia] = dataValue.split('-');
        statusDataDisplay.textContent = `${dia}/${mes}`;
    }

    try {
        const res = await fetch(`/api/reservations?date=${dataValue}`, {
            headers: { "Authorization": `Bearer ${TOKEN}` }
        });
        const data = await res.json();
        const reservas = data.reservations || [];

        const busca = buscaInput?.value.toLowerCase() || "";
        const periodo = periodoInput?.value || "todos";

        // Filtro local (Busca e Período)
        const filtradas = reservas.filter(r => {
            const matchesBusca = r.nome.toLowerCase().includes(busca) || (r.telefone && r.telefone.includes(busca));
            const hora = Number.parseInt(r.horario.split(':')[0], 10);
            const matchesPeriodo = periodo === 'todos' || (periodo === 'almoco' ? hora < 18 : hora >= 18);
            return matchesBusca && matchesPeriodo;
        });

        if (totalAtivos) totalAtivos.textContent = filtradas.length;

        if (filtradas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-muted">Nenhuma reserva para este dia.</td></tr>';
            return;
        }

   tbody.innerHTML = filtradas.map(r => {
    // Formata o horário para não aparecer o ano
    const horaFormatada = new Date(r.horario).toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit', 
        timeZone: 'UTC' 
    });

    return `
        <tr>
            <td style="border-left: 4px solid ..."><b>${r.nome}</b></td>
            <td>${r.telefone || '-'}</td>
            <td><span class="badge ...">${horaFormatada}</span></td>
            <td>${r.numPessoas}</td> <!-- <--- CAMPO CORRIGIDO AQUI -->
            <td class="small">${r.observacoes || '-'}</td>
            <td class="text-center"><i class="fas fa-check-circle text-success"></i></td>
        </tr>`;
}).join('');
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Erro ao carregar.</td></tr>';
    }
};

document.addEventListener("DOMContentLoaded", () => {
    if (!TOKEN) { window.location.replace("/html/login.html"); return; }
    
    // Inicia data com hoje se estiver vazio
    const input = document.getElementById('filterStartDate');
    if (input && !input.value) {
        input.value = new Date().toISOString().split('T')[0];
    }

    // Inicializa componentes
    if (typeof Calendar === 'function') globalThis.calendar = new Calendar(TOKEN);
    globalThis.carregarReservas();
});

// Exemplo no app.js
async function carregarComponentes() {
    const res = await fetch('/html/header.html');
    document.querySelector('header').innerHTML = await res.text();
    
    // AGORA QUE O HTML CHEGOU, CHAMA A FUNÇÃO DO HEADER.JS
    if (globalThis.initHeader) globalThis.initHeader();
}