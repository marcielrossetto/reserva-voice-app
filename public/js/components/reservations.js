// ============================================
// reservas.js - Gerenciar Reservas
// ============================================

const API_RESERVAS = 'http://localhost:3001/api/reservas';

/**
 * Editar reserva
 */
function editarReserva(id) {
    console.log('✏️ Editar reserva:', id);
    alert('Função editar em desenvolvimento');
}

/**
 * Deletar reserva
 */
async function deletarReserva(id) {
    console.log('🗑️ Deletar reserva:', id);
    
    if (!confirm('Deseja deletar esta reserva?')) {
        return;
    }

    try {
        const res = await fetch(`${API_RESERVAS}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });

        const result = await res.json();

        if (result.sucesso) {
            alert('✅ Reserva deletada');
            calendarManager.render();
        } else {
            alert('❌ Erro ao deletar');
        }
    } catch (e) {
        console.error('❌ Erro:', e);
        alert('❌ Erro: ' + e.message);
    }
}

/**
 * Chamar via WhatsApp
 */
function chamarWhatsapp(nome, telefone, data, horario, pessoas) {
    console.log('💬 WhatsApp:', nome, telefone);

    const dataFormatada = new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
    const mensagem = `Olá ${nome}! Confirmamos sua reserva para ${dataFormatada} às ${horario} para ${pessoas} ${pessoas === 1 ? 'pessoa' : 'pessoas'}. 🍽️`;
    const telefoneClean = telefone.replace(/\D/g, '');
    const url = `https://wa.me/55${telefoneClean}?text=${encodeURIComponent(mensagem)}`;

    console.log('🔗 URL:', url);
    window.open(url, '_blank');
}

/**
 * Carregar e mostrar todas as reservas
 */
async function loadTodasReservas() {
    console.log('📋 Carregando todas as reservas');

    try {
        const res = await fetch(API_RESERVAS, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });

        const data = await res.json();
        console.log('✅ Reservas:', data.reservas?.length || 0);

        const tbody = document.querySelector('#reservasTable tbody');
        tbody.innerHTML = '';

        if (data.reservas && data.reservas.length > 0) {
            data.reservas.forEach(r => {
                const tr = document.createElement('tr');
                
                // Formatar data
                const data = new Date(r.data).toLocaleDateString('pt-BR');
                const horario = new Date(r.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                // Observações com scroll se muito grande
                let obsHtml = '-';
                if (r.observacoes) {
                    if (r.observacoes.length > 50) {
                        obsHtml = `
                            <div style="max-height: 80px; overflow-y: auto; background: #f5f5f5; padding: 8px; border-radius: 4px; font-size: 12px;">
                                ${r.observacoes}
                            </div>
                        `;
                    } else {
                        obsHtml = r.observacoes;
                    }
                }

                tr.innerHTML = `
                    <td>${r.nome}</td>
                    <td>${r.telefone}</td>
                    <td>${data}</td>
                    <td>${horario}</td>
                    <td>${r.numPessoas}</td>
                    <td>${r.tipoEvento || '-'}</td>
                    <td>${obsHtml}</td>
                    <td style="display: flex; gap: 5px;">
                        <button onclick="editarReserva(${r.id})" style="padding: 5px 10px; background: #3699ff; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">✏️</button>
                        <button onclick="deletarReserva(${r.id})" style="padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">🗑️</button>
                        <button onclick="chamarWhatsapp('${r.nome}', '${r.telefone}', '${r.data}', '${horario}', ${r.numPessoas})" style="padding: 5px 10px; background: #25d366; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">💬</button>
                    </td>
                `;
                
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #999;">Nenhuma reserva</td></tr>';
        }
    } catch (e) {
        console.error('❌ Erro:', e);
    }
}

// Carregar ao iniciar
document.addEventListener('DOMContentLoaded', () => {
    loadTodasReservas();
});