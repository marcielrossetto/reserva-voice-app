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


// Funções de Máscara
function maskPhone(input) {
    let v = input.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length <= 10) {
        v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
        v = v.replace(/(\d{4})(\d)/, "$1-$2");
    } else {
        v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
        v = v.replace(/(\d{5})(\d)/, "$1-$2");
    }
    input.value = v;
}

// Busca Perfil ao digitar Telefone
async function checkClientProfile(el) {
    const phone = el.value.replace(/\D/g, "");
    if (phone.length < 10) return;

    try {
        const res = await fetch(`/api/reservations/profile/${phone}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();

        if (data.found) {
            document.getElementById('res_name').value = data.profile.name;
            document.getElementById('client_info_card').innerHTML = `
                <div class="alert alert-success mt-2 small">
                    <strong>Cliente VIP:</strong> ${data.profile.name}<br>
                    Última visita: ${data.profile.last_visit_date} (${data.profile.time_ago})<br>
                    Reservas: ${data.profile.total_reservations} | Canceladas: ${data.profile.cancelled_count}
                </div>`;
        }
    } catch (e) { console.error(e); }
}

// Importar do WhatsApp (Regex Parser)
function importFromWhatsApp() {
    const text = document.getElementById('wa_import_area').value;
    const lines = text.split('\n');
    lines.forEach(line => {
        const [key, ...val] = line.split(':');
        if (!key) return;
        const value = val.join(':').trim();
        const k = key.toLowerCase();

        if (k.includes('nome')) document.getElementById('res_name').value = value;
        if (k.includes('telefone')) {
            document.getElementById('res_phone').value = value;
            maskPhone(document.getElementById('res_phone'));
            checkClientProfile(document.getElementById('res_phone'));
        }
        if (k.includes('data')) {
            if(value.includes('/')) {
                const [d,m,y] = value.split('/');
                document.getElementById('res_date').value = `${y}-${m}-${d}`;
            }
        }
        if (k.includes('hor')) document.getElementById('res_time').value = value;
        if (k.includes('pessoas')) document.getElementById('res_pax').value = value;
    });
}

// Salvar via Node API
async function submitNewReservation() {
    const btn = document.getElementById('btnSaveRes');
    btn.disabled = true;

    const payload = {
        name: document.getElementById('res_name').value,
        phone: document.getElementById('res_phone').value,
        date: document.getElementById('res_date').value,
        time: document.getElementById('res_time').value,
        guestCount: document.getElementById('res_pax').value,
        notes: document.getElementById('res_notes').value,
        cakeService: document.getElementById('chk_cake').checked,
        isSteakhouse: document.getElementById('chk_steak').checked,
        isExecutive: document.getElementById('chk_exec').checked
    };

    try {
        const res = await fetch('/api/reservations', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (result.success) {
            alert('Reserva Salva!');
            if (result.waLink) window.open(result.waLink, '_blank');
            location.reload();
        } else {
            alert('Erro: ' + result.error);
        }
    } catch (e) { alert('Erro de conexão'); }
    finally { btn.disabled = false; }
}

// public/js/components/reservations.js

// 1. Função para carregar o modal e abrir
window.openReservationModal = async function() {
    // Verifica se o modal já existe na página para não carregar duas vezes
    if (!document.getElementById('modalReserva')) {
        try {
            const response = await fetch('html/reservation_modal.html');
            const html = await response.text();
            document.body.insertAdjacentHTML('beforeend', html);
        } catch (error) {
            console.error('Erro ao carregar o arquivo do modal:', error);
            return;
        }
    }

    // Reseta campos
    document.getElementById('wa_import_area').value = '';
    document.getElementById('res_phone').value = '';
    document.getElementById('res_name').value = '';
    // ... resetar outros campos se desejar ...

    // Abre o modal (Bootstrap 4 usa jQuery)
    $('#modalReserva').modal('show');
};

// 2. Coloque aqui todas as outras funções (Importantes)
// Função de máscara
window.maskPhone = function(input) {
    let v = input.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length <= 10) {
        v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
        v = v.replace(/(\d{4})(\d)/, "$1-$2");
    } else {
        v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
        v = v.replace(/(\d{5})(\d)/, "$1-$2");
    }
    input.value = v;
};

// Função de busca de perfil
window.checkClientProfile = async function(el) {
    const phone = el.value.replace(/\D/g, "");
    if (phone.length < 10) return;

    const res = await fetch(`/api/reservations/profile/${phone}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    if (data.found) {
        document.getElementById('res_name').value = data.profile.name;
        document.getElementById('client_info_card').innerHTML = `
            <div class="alert alert-info py-2 small">
                Visitas: ${data.profile.total_reservations} | Cancelamentos: ${data.profile.cancelled_count}
            </div>`;
    }
};

// Função de salvar (Envio para o Node.js)
window.submitNewReservation = async function() {
    const payload = {
        name: document.getElementById('res_name').value,
        phone: document.getElementById('res_phone').value,
        date: document.getElementById('res_date').value,
        time: document.getElementById('res_time').value,
        guestCount: document.getElementById('res_pax').value,
        notes: document.getElementById('res_notes').value,
        cakeService: document.getElementById('chk_cake').checked,
        isSteakhouse: document.getElementById('chk_steak').checked,
        isExecutive: document.getElementById('chk_exec').checked
    };

    const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.success) {
        $('#modalReserva').modal('hide');
        alert("Reserva Salva com Sucesso!");
        if (result.waLink) window.open(result.waLink, '_blank');
        location.reload();
    } else {
        alert("Erro: " + result.error);
    }
};
// Carregar ao iniciar
document.addEventListener('DOMContentLoaded', () => {
    loadTodasReservas();
});