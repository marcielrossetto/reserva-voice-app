/**
 * RESERVATION QUERY - Gerenciamento de reservas com cards
 */

let token = localStorage.getItem("token");
let periodSelected = "todos";

document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Iniciando Reservation Query...");
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('filterData').value = today;
    loadReservations();
});

async function loadReservations() {
    const data = document.getElementById('filterData').value;
    const busca = document.getElementById('filterBusca').value;
    const periodo = document.getElementById('filterPeriodo').value;
    const incluirCanceladas = document.getElementById('incluirCanceladas').checked;

    try {
        const query = new URLSearchParams({
            data,
            busca,
            periodo,
            incluirCanceladas
        });

        const res = await fetch(`/api/reservationQuery?${query}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        const { success, reservations, totals } = await res.json();

        if (!success) {
            console.error("❌ Erro ao carregar reservas");
            return;
        }

        renderCards(reservations, totals);
        updateTotals(data, totals);

    } catch (err) {
        console.error("❌ Erro:", err);
    }
}

function renderCards(reservations, totals) {
    const container = document.getElementById('reservationsContainer');
    container.innerHTML = '';

    if (reservations.length === 0) {
        container.innerHTML = '<div class="text-center text-muted mt-5">Nenhuma reserva encontrada</div>';
        return;
    }

    reservations.forEach(r => {
        const card = createCard(r);
        container.appendChild(card);
    });
}

function createCard(reservation) {
    const card = document.createElement('div');
    card.className = `reservation-card ${reservation.status ? '' : 'cancelled'}`;
    
    const reservationDate = new Date(reservation.data);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    reservationDate.setHours(0, 0, 0, 0);
    
    const canEdit = reservationDate > today || ['admin', 'master'].includes(getUserRole());
    
    const statusClass = reservation.status ? 'active' : 'cancelled';
    const statusText = reservation.status ? 'Ativa' : 'Cancelada';
    const confirmedClass = reservation.confirmado ? 'confirmed' : 'pending';
    const confirmedText = reservation.confirmado ? 'Confirmada' : 'Pendente';

    card.innerHTML = `
        <div class="card-header ${statusClass}">
            <div class="card-title-row">
                <h6 class="card-title">${reservation.nome} <span class="card-id">#${reservation.id}</span></h6>
                <span class="badge badge-${statusClass}">${statusText}</span>
            </div>
        </div>

        <div class="card-body">
            <div class="info-row">
                <div class="info-item">
                    <strong>👥 Pax:</strong> ${reservation.numPessoas}
                </div>
                <div class="info-item">
                    <strong>🕐 Horário:</strong> ${reservation.horario.substring(0, 5)}
                </div>
                <div class="info-item">
                    <strong>🪑 Mesa:</strong> ${reservation.numMesa || '--'}
                </div>
            </div>

            ${reservation.observacoes ? `
                <div class="obs-container">
                    <small><strong>📝 Obs:</strong></small>
                    <div class="obs-scroll">${reservation.observacoes}</div>
                </div>
            ` : ''}

            <div class="contact-row">
                <small><strong>📱 Tel:</strong> ${reservation.telefone || 'N/A'}</small>
            </div>

            <div class="confirmation-row">
                <span class="badge badge-${confirmedClass}">${confirmedText}</span>
            </div>
        </div>

        <div class="card-footer">
            ${reservation.status ? `
                ${!reservation.confirmado ? `
                    <button class="btn btn-sm btn-success" onclick="confirmReservation(${reservation.id})">
                        <i class="fab fa-whatsapp"></i> Confirmar
                    </button>
                ` : `
                    <button class="btn btn-sm btn-success" disabled>
                        <i class="fas fa-check"></i> Confirmada
                    </button>
                `}
            ` : ''}

            <button class="btn btn-sm btn-info" onclick="viewClientHistory('${reservation.telefone}')">
                <i class="fas fa-history"></i> Histórico
            </button>

            ${canEdit && reservation.status ? `
                <button class="btn btn-sm btn-warning" onclick="editReservation(${reservation.id})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-sm btn-danger" onclick="cancelReservation(${reservation.id})">
                    <i class="fas fa-times"></i> Cancelar
                </button>
            ` : `
                ${!canEdit ? '<small class="text-muted">Reserva passada</small>' : ''}
            `}
        </div>
    `;

    return card;
}

async function confirmReservation(id) {
    try {
        const res = await fetch(`/api/reservationQuery/${id}/confirm`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const { success } = await res.json();

        if (success) {
            showToast('✅ Reserva confirmada!', 'success');
            loadReservations();
        }
    } catch (err) {
        console.error("Erro ao confirmar:", err);
        showToast('❌ Erro ao confirmar', 'danger');
    }
}

async function editReservation(id) {
    try {
        const res = await fetch(`/api/reservationQuery/${id}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        const { success, reservation } = await res.json();

        if (success) {
            showEditModal(reservation);
        }
    } catch (err) {
        console.error("Erro ao carregar reserva:", err);
    }
}

async function cancelReservation(id) {
    const motivo = prompt("Motivo do cancelamento:");
    if (!motivo) return;

    try {
        const res = await fetch(`/api/reservationQuery/${id}/cancel`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reason: motivo })
        });

        const { success } = await res.json();

        if (success) {
            showToast('❌ Reserva cancelada', 'warning');
            loadReservations();
        }
    } catch (err) {
        console.error("Erro ao cancelar:", err);
    }
}

async function viewClientHistory(phone) {
    if (!phone) {
        showToast('Cliente sem telefone cadastrado', 'warning');
        return;
    }

    try {
        const res = await fetch(`/api/reservationQuery/client/${phone}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        const { success, client, reservations } = await res.json();

        if (success) {
            showClientHistory(client, reservations);
        }
    } catch (err) {
        console.error("Erro ao carregar histórico:", err);
    }
}

function setPeriodo(periodo, btn) {
    document.querySelectorAll('.btn-period').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('filterPeriodo').value = periodo;
    loadReservations();
}

function updateTotals(data, totals) {
    const dataDate = new Date(data + 'T00:00:00');
    const dataFormatada = dataDate.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        day: '2-digit', 
        month: '2-digit' 
    });

    document.getElementById('totalStatus').textContent = `📅 ${dataFormatada}`;
    document.getElementById('totalAtivos').textContent = totals.ativos;
    document.getElementById('totalQtd').textContent = totals.quantidade;

    if (totals.canceladas > 0) {
        document.getElementById('badgeCanceladas').style.display = 'inline-block';
        document.getElementById('totalCanceladas').textContent = totals.canceladas;
    } else {
        document.getElementById('badgeCanceladas').style.display = 'none';
    }
}

function showEditModal(reservation) {
    const html = `
        <div class="modal fade show d-block" style="background: rgba(0,0,0,0.6);">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Editar Reserva #${reservation.id}</h5>
                        <button type="button" class="close" onclick="closeEditModal()"><span>&times;</span></button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Nome:</label>
                            <input type="text" id="edit_nome" class="form-control" value="${reservation.nome}">
                        </div>
                        <div class="form-group">
                            <label>Pax:</label>
                            <input type="number" id="edit_pax" class="form-control" value="${reservation.numPessoas}">
                        </div>
                        <div class="form-group">
                            <label>Horário:</label>
                            <input type="time" id="edit_horario" class="form-control" value="${reservation.horario.substring(0, 5)}">
                        </div>
                        <div class="form-group">
                            <label>Mesa:</label>
                            <input type="text" id="edit_mesa" class="form-control" value="${reservation.numMesa || ''}">
                        </div>
                        <div class="form-group">
                            <label>Observações:</label>
                            <textarea id="edit_obs" class="form-control" rows="3">${reservation.observacoes || ''}</textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Cancelar</button>
                        <button type="button" class="btn btn-primary" onclick="saveEdit(${reservation.id})">Salvar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

async function saveEdit(id) {
    const horarioInput = document.getElementById('edit_horario').value;
    const horarioDb = horarioInput + ':00';

    const payload = {
        nome: document.getElementById('edit_nome').value,
        numPessoas: parseInt(document.getElementById('edit_pax').value),
        horario: horarioDb,
        numMesa: document.getElementById('edit_mesa').value,
        observacoes: document.getElementById('edit_obs').value
    };

    try {
        const res = await fetch(`/api/reservationQuery/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const { success } = await res.json();

        if (success) {
            showToast('✅ Reserva atualizada', 'success');
            closeEditModal();
            loadReservations();
        }
    } catch (err) {
        console.error("Erro ao salvar:", err);
    }
}

function closeEditModal() {
    const modal = document.querySelector('.modal.show');
    if (modal) modal.remove();
}

function showClientHistory(client, reservations) {
    const html = `
        <div class="modal fade show d-block" style="background: rgba(0,0,0,0.6); z-index: 9999;">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Histórico - ${client.nome}</h5>
                        <button type="button" class="close" onclick="this.closest('.modal').remove()"><span>&times;</span></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <p><strong>Total de Reservas:</strong> ${client.totalReservations}</p>
                                <p><strong>Confirmadas:</strong> ${client.confirmadas}</p>
                                <p><strong>Canceladas:</strong> ${client.canceladas}</p>
                            </div>
                            <div class="col-md-6">
                                <p><strong>Última Visita:</strong> ${new Date(client.ultimaVisita).toLocaleDateString('pt-BR')}</p>
                                <p><strong>Telefone:</strong> ${client.telefone}</p>
                            </div>
                        </div>
                        <hr>
                        <h6>Últimas Reservas:</h6>
                        <div style="max-height: 300px; overflow-y: auto;">
                            ${reservations.map(r => `
                                <div class="small border-bottom p-2">
                                    <strong>${new Date(r.data).toLocaleDateString('pt-BR')}</strong> - ${r.horario.substring(0, 5)} - 
                                    ${r.numPessoas} pax ${r.status ? '' : '(Cancelada)'} 
                                    ${r.confirmado ? '<span class="badge badge-success">Confirmada</span>' : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function showToast(msg, tipo) {
    const toast = document.createElement('div');
    toast.className = `toast alert alert-${tipo}`;
    toast.textContent = msg;
    toast.style.cssText = 'position:fixed; top:20px; right:20px; z-index:9999; min-width:300px;';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function getUserRole() {
    return 'user';
}

async function openReservationModal() {
    if (!document.getElementById('modalReserva')) {
        try {
            const response = await fetch('/html/reservation_modal.html');
            document.getElementById('modal-container').innerHTML = await response.text();
        } catch (err) {
            console.error("Erro ao carregar modal:", err);
        }
    }
    const myModal = new bootstrap.Modal(document.getElementById('modalReserva'));
    myModal.show();
}