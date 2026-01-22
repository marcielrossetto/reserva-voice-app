// ============================================
// table.js - Funções da Tabela
// ============================================

/**
 * Carregar reservas da API
 */
async function loadReservas() {
    console.log('📋 Carregando reservas...');
    
    try {
        const res = await fetch(API_BASE, {
            headers: { 'Authorization': 'Bearer ' + TOKEN }
        });
        
        const data = await res.json();
        console.log('✅ Reservas carregadas:', data.reservas?.length || 0);
        
        const tbody = document.querySelector('#table tbody');
        tbody.innerHTML = '';
        
        if (data.reservas && data.reservas.length > 0) {
            data.reservas.forEach(r => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${r.nome}</td>
                    <td>${r.telefone}</td>
                    <td>${r.data}</td>
                    <td>${r.horario || '--'}</td>
                    <td>${r.numPessoas}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: #999;">Nenhuma reserva</td></tr>';
        }
    } catch(e) {
        console.error('❌ Erro ao carregar:', e);
        const tbody = document.querySelector('#table tbody');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: #f00;">Erro ao carregar</td></tr>';
    }
}

/**
 * Atualizar tabela a cada 10 segundos
 */
document.addEventListener('DOMContentLoaded', () => {
    loadReservas();
    setInterval(loadReservas, 10000); // Recarregar a cada 10s
});