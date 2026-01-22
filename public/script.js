/**
 * Lógica Principal de Reservas
 */

// Função para gerenciar os botões de período (Ícones Sol/Lua)
window.setPeriodo = function(valor, btn) {
    // Remove classe ativa de todos e adiciona no clicado
    document.querySelectorAll('.btn-period').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Atualiza o valor no input oculto e recarrega
    const hiddenInput = document.getElementById('filterPeriodo');
    if (hiddenInput) {
        hiddenInput.value = valor;
        window.carregarReservas();
    }
};

window.carregarReservas = async function() {
    const token = localStorage.getItem("token");
    const dataInput = document.getElementById('filterStartDate');
    const tbody = document.querySelector("#reservasTable tbody");
    const totalAtivos = document.getElementById("totalAtivos");
    const statusDataDisplay = document.getElementById('statusDataDisplay');
    const buscaInput = document.getElementById('searchInput');
    const periodoInput = document.getElementById('filterPeriodo');

    if (!tbody || !dataInput) return;

    // --- 1. RESET IMEDIATO DO ESTADO (Resolve o bug do segundo clique) ---
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><i class="fas fa-spinner fa-spin"></i> Buscando...</td></tr>';
    if (totalAtivos) totalAtivos.textContent = "0";

    const dataValue = dataInput.value;
    if (statusDataDisplay && dataValue) {
        const [ano, mes, dia] = dataValue.split('-');
        statusDataDisplay.textContent = `${dia}/${mes}`;
    }

    try {
        const res = await fetch(`http://localhost:3001/api/reservas?data=${dataValue}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error("Erro na requisição");
        
        const data = await res.json();
        const reservas = data.reservas || [];

        // --- 2. FILTRAGEM ---
        const busca = buscaInput?.value.toLowerCase() || "";
        const periodo = periodoInput?.value || "todos";

        const filtradas = reservas.filter(r => {
            const matchesBusca = r.nome.toLowerCase().includes(busca) || r.telefone.includes(busca);
            const hora = parseInt(r.horario.split(':')[0]);
            const matchesPeriodo = periodo === 'todos' || (periodo === 'almoco' ? hora < 18 : hora >= 18);
            return matchesBusca && matchesPeriodo;
        });

        // --- 3. ATUALIZAÇÃO DO CONTADOR REAL ---
        if (totalAtivos) totalAtivos.textContent = filtradas.length;

        // --- 4. TRATAMENTO DE ESTADO VAZIO ---
        if (filtradas.length === 0) {
            const dataBr = dataValue.split('-').reverse().join('/');
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5">
                        <div class="text-muted">
                            <i class="fas fa-calendar-times d-block mb-3" style="font-size: 2.5rem; opacity:0.2;"></i>
                            <h5 class="mb-1">Nenhuma reserva encontrada</h5>
                            <p class="small">Para o dia ${dataBr}${periodo !== 'todos' ? ' no período selecionado' : ''}</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        // --- 5. RENDERIZAÇÃO ---
        tbody.innerHTML = filtradas.map(r => {
            const isAlmoco = parseInt(r.horario.split(':')[0]) < 18;
            return `
                <tr>
                    <td style="border-left: 4px solid ${isAlmoco ? '#f1c40f' : '#3699ff'}"><b>${r.nome}</b></td>
                    <td>${r.telefone}</td>
                    <td><span class="badge ${isAlmoco ? 'badge-warning' : 'badge-primary'}">${r.horario}</span></td>
                    <td>${r.numPessoas}</td>
                    <td class="small text-muted">${r.observacoes || '-'}</td>
                    <td class="text-center"><i class="fas fa-check-circle text-success"></i></td>
                </tr>`;
        }).join('');

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Erro ao carregar dados do servidor.</td></tr>';
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "login.html"; return; }

    // Inicialização
    if (typeof Calendar === 'function') window.calendar = new Calendar(token);

    // Eventos de Logout
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "login.html";
    });

    // Evento de busca em tempo real
    document.getElementById("searchInput")?.addEventListener("keyup", window.carregarReservas);

    // Carregamento Inicial
    const inputData = document.getElementById('filterStartDate');
    if (inputData && !inputData.value) {
        inputData.value = new Date().toISOString().split('T')[0];
    }
    window.carregarReservas();
});