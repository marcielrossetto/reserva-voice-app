/**
 * RESERVATION QUERY - iOS Style FINAL v7
 * Canceladas vermelhas, obs vazio com ..., alinhamento vertical, reativar
 */

document.addEventListener("DOMContentLoaded", () => {
  // Auth já verificada pelo config.js - não duplicar
  if (!localStorage.getItem("token")) return;
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("filterData").value = today;
  loadReservations();
  document.addEventListener("click", closeMenusOnClickOutside);
});

async function loadReservations() {
  const data = document.getElementById("filterData").value;
  const busca = document.getElementById("filterBusca").value;
  const periodo = document.getElementById("filterPeriodo").value;
  const incluirCanceladas =
    document.getElementById("incluirCanceladas").checked;

  try {
    const query = new URLSearchParams({
      data,
      busca,
      periodo,
      incluirCanceladas,
    });
    const res = await fetch(`/api/reservationQuery?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json();

    if (!json.success) {
      document.getElementById("reservationsContainer").innerHTML =
        '<div class="text-center text-muted p-4">Erro ao carregar</div>';
      return;
    }

    renderCards(json.reservations, json.totals);
    updateTotals(data, json.totals);
  } catch (err) {
    console.error("Erro:", err);
  }
}

function renderCards(reservations, totals) {
  const container = document.getElementById("reservationsContainer");
  container.innerHTML = "";

  if (reservations.length === 0) {
    container.innerHTML =
      '<div class="text-center text-muted p-4">Nenhuma reserva encontrada</div>';
    return;
  }

  reservations.forEach((r) => {
    const card = createCard(r);
    container.appendChild(card);
  });
}

function formatarData(dataString) {
  try {
    const [ano, mes, dia] = dataString.split("-");
    const dataObj = new Date(ano, parseInt(mes) - 1, parseInt(dia));
    return dataObj.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch (e) {
    return dataString;
  }
}

function createCard(reservation) {
  const card = document.createElement("div");
  const statusClass = reservation.confirmado
    ? "confirmed"
    : reservation.status
      ? "pending"
      : "cancelled";
  card.className = `reservation-card ${statusClass}`;

  const mesaDisplay = reservation.numMesa ? reservation.numMesa : "N/D";
  const phone = reservation.telefone
    ? reservation.telefone.replace(/\D/g, "")
    : "";
  const nomeDisplay =
    reservation.nome.length > 12
      ? reservation.nome.substring(0, 12) + "..."
      : reservation.nome;
  const nomeClass = reservation.nome.length > 12 ? "truncated" : "";

  card.innerHTML = `
        <div class="card-content">
            <!-- ID + HISTORY -->
            <div class="card-id-box">
                <div class="card-id-number">${reservation.id}</div>
                <div class="card-id-label">ID</div>
                <button class="card-history-btn" onclick="viewReservationHistory(${reservation.id})" title="Historico da reserva">
                    <i class="fas fa-file-alt"></i>
                </button>
            </div>

            <!-- NOME + TELEFONE -->
            <div class="card-main">
                <div class="card-name ${nomeClass}" title="${reservation.nome}">${nomeDisplay}</div>
                <a href="javascript:void(0)" onclick="openWhatsAppModal(${reservation.id}, '${reservation.nome}', '${reservation.data}', '${reservation.horario}', ${reservation.numPessoas}, '${phone}')" class="card-phone" title="Enviar WhatsApp">
                    <i class="fab fa-whatsapp"></i> ${reservation.telefone || "N/A"}
                </a>
            </div>

            <!-- PAX + HORARIO + MESA -->
            <div class="card-center">
                <div class="card-stat" onclick="openEditModal(${reservation.id})" title="Clique para editar">
                    <span class="card-stat-value">${reservation.numPessoas}</span>
                    <span class="card-stat-label">pax</span>
                </div>

                <div class="card-time">
                    <span class="card-time-value">${reservation.horario.substring(0, 5)}</span>
                    <span class="card-time-label">hora</span>
                </div>

                <div class="card-mesa-box">
                    <span class="card-mesa-value">${mesaDisplay}</span>
                    <span class="card-mesa-label">mesa</span>
                </div>
            </div>

            <!-- OBS COM SCROLL (PENULTIMO) -->
            ${
              reservation.observacoes
                ? `
                <div class="card-obs" title="${reservation.observacoes}">
                    ${reservation.observacoes}
                </div>
            `
                : `
                <div class="card-obs-empty">...</div>
            `
            }

            <!-- BOLINHA STATUS -->
            <div class="card-status-dot ${statusClass}" onclick="openStatusModal(${reservation.id}, '${statusClass}')" title="${statusClass === "confirmed" ? "Confirmada" : statusClass === "pending" ? "Pendente" : "Cancelada"}"></div>

            <!-- MENU iOS (3 PONTOS) -->
            <div class="card-menu" id="menu-container-${reservation.id}">
                <button class="btn-menu-ios" onclick="toggleMenu(event, ${reservation.id})">⋮</button>
                <div class="menu-dropdown" id="menu-${reservation.id}">
                    ${
                      !reservation.confirmado && reservation.status
                        ? `
                        <button class="menu-item" onclick="openWhatsAppConfirmation(${reservation.id}, '${reservation.nome}', '${reservation.data}', '${reservation.horario}', ${reservation.numPessoas})">
                            <i class="fab fa-whatsapp"></i>
                            <span>Confirmar</span>
                        </button>
                    `
                        : ""
                    }
                    
                    <button class="menu-item" onclick="viewClientHistory('${reservation.telefone}')">
                        <i class="fas fa-users"></i>
                        <span>Clientes</span>
                    </button>

                    ${
                      reservation.status
                        ? `
                        <button class="menu-item" onclick="editReservationFull(${reservation.id})">
                            <i class="fas fa-edit"></i>
                            <span>Editar</span>
                        </button>
                    `
                        : ""
                    }
                </div>
            </div>
        </div>
    `;

  return card;
}

function toggleMenu(event, reservationId) {
  event.stopPropagation();
  const btn = event.target.closest(".btn-menu-ios");
  const menu = document.getElementById(`menu-${reservationId}`);
  const cardRect = btn.closest(".reservation-card").getBoundingClientRect();

  document.querySelectorAll(".menu-dropdown").forEach((m) => {
    if (m !== menu) m.classList.remove("show");
  });

  if (menu.classList.contains("show")) {
    menu.classList.remove("show");
  } else {
    menu.classList.add("show");
    menu.style.top = cardRect.bottom + 5 + "px";
    menu.style.right = window.innerWidth - cardRect.right + "px";
  }
}

function closeMenusOnClickOutside(event) {
  if (!event.target.closest(".card-menu")) {
    document
      .querySelectorAll(".menu-dropdown")
      .forEach((m) => m.classList.remove("show"));
  }
}

/**
 * MODAL DE STATUS - Bolinha interativa
 * Se vermelho, pergunta se quer reativar
 */
function openStatusModal(id, currentStatus) {
  let titulo = "Alterar Status";
  let botoes = `
        <button class="btn btn-outline-warning btn-sm" onclick="changeStatus(${id}, 'pending', this.closest('.modal'))">
            <i class="fas fa-circle" style="color: #ff9800;"></i> Pendente
        </button>
        <button class="btn btn-outline-success btn-sm" onclick="changeStatus(${id}, 'confirmed', this.closest('.modal'))">
            <i class="fas fa-circle" style="color: #28a745;"></i> Confirmada
        </button>
        <button class="btn btn-outline-danger btn-sm" onclick="openCancelModal(${id}, this.closest('.modal'))">
            <i class="fas fa-circle" style="color: #dc3545;"></i> Cancelada
        </button>
    `;

  if (currentStatus === "cancelled") {
    titulo = "Reativar Reserva?";
    botoes += `
            <button class="btn btn-outline-info btn-sm" onclick="changeStatus(${id}, 'reactivate', this.closest('.modal'))">
                <i class="fas fa-redo"></i> Sim, Reativar
            </button>
        `;
  }

  const html = `
        <div class="modal fade show d-block" style="background: rgba(0,0,0,0.6); z-index: 10000;">
            <div class="modal-dialog modal-dialog-centered modal-sm">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header bg-info text-white border-0">
                        <h5 class="modal-title fw-bold">${titulo}</h5>
                        <button type="button" class="btn-close btn-close-white" onclick="this.closest('.modal').remove()"></button>
                    </div>
                    <div class="modal-body pt-4">
                        <div class="d-flex flex-column gap-2">
                            ${botoes}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

  document.body.insertAdjacentHTML("beforeend", html);
}

function openCancelModal(id, parentModal) {
  parentModal.remove();

  const html = `
        <div class="modal fade show d-block" style="background: rgba(0,0,0,0.6); z-index: 10001;">
            <div class="modal-dialog modal-dialog-centered modal-sm">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header bg-danger text-white border-0">
                        <h5 class="modal-title fw-bold">Cancelar Reserva</h5>
                        <button type="button" class="btn-close btn-close-white" onclick="this.closest('.modal').remove()"></button>
                    </div>
                    <div class="modal-body pt-4">
                        <div class="form-group">
                            <label class="fw-bold mb-2">Motivo do cancelamento:</label>
                            <textarea id="cancel_reason" class="form-control" rows="3" placeholder="Digite o motivo..."></textarea>
                        </div>
                    </div>
                    <div class="modal-footer border-top-0">
                        <button type="button" class="btn btn-secondary btn-sm" onclick="this.closest('.modal').remove()">Fechar</button>
                        <button type="button" class="btn btn-danger btn-sm" onclick="changeStatus(${id}, 'cancelled', this.closest('.modal'))">Cancelar</button>
                    </div>
                </div>
            </div>
        </div>
    `;

  document.body.insertAdjacentHTML("beforeend", html);
}

async function changeStatus(id, status, modal) {
  const reason =
    status === "cancelled"
      ? document.getElementById("cancel_reason")?.value || ""
      : null;

  try {
    const endpoint =
      status === "confirmed"
        ? `/api/reservationQuery/${id}/confirm`
        : status === "cancelled"
          ? `/api/reservationQuery/${id}/cancel`
          : status === "reactivate"
            ? `/api/reservationQuery/${id}/reactivate`
            : `/api/reservationQuery/${id}/status`;

    const payload = status === "cancelled" ? { reason } : { status };

    const res = await fetch(endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      modal.remove();
      showToast("Status alterado!", "success");
      loadReservations();
    } else {
      showToast("Erro ao alterar status", "danger");
    }
  } catch (err) {
    showToast("Erro ao alterar status", "danger");
  }
}

function openWhatsAppModal(id, nome, data, horario, pax, phone) {
  const dataFormatada = formatarData(data);
  const horarioFormatado = horario.substring(0, 5);

  const mensagem = `Ola ${nome}! Estamos entrando em contato para confirmar sua reserva para ${pax} pessoas as ${horarioFormatado}hs no dia ${dataFormatada}. Podemos confirmar?`;

  const html = `
        <div class="modal fade show d-block" style="background: rgba(0,0,0,0.6); z-index: 10000;">
            <div class="modal-dialog modal-dialog-centered modal-sm">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header bg-success text-white border-0">
                        <h5 class="modal-title fw-bold">WhatsApp</h5>
                        <button type="button" class="btn-close btn-close-white" onclick="this.closest('.modal').remove()"></button>
                    </div>
                    <div class="modal-body pt-4">
                        <div class="alert alert-light border-start border-4 border-success mb-3" role="alert">
                            <strong class="text-dark">${nome}</strong>
                            <div class="small text-muted mt-2">
                                <div class="mb-1">${pax} pessoas</div>
                                <div class="mb-1">${horarioFormatado}</div>
                                <div>${dataFormatada}</div>
                            </div>
                        </div>
                        <div class="mb-3">
                            <small class="text-muted d-block mb-2">Mensagem:</small>
                            <div class="bg-light p-3 rounded" style="font-size: 0.85rem; line-height: 1.6; max-height: 200px; overflow-y: auto; white-space: pre-wrap; word-wrap: break-word;">${mensagem}</div>
                        </div>
                    </div>
                    <div class="modal-footer border-top-0 bg-light pt-3">
                        <button type="button" class="btn btn-outline-secondary btn-sm" onclick="this.closest('.modal').remove()">Cancelar</button>
                        <button type="button" class="btn btn-success btn-sm" onclick="sendWhatsApp('${phone}', '${encodeURIComponent(mensagem)}', this.closest('.modal'))">
                            Enviar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

  document.body.insertAdjacentHTML("beforeend", html);
}

function sendWhatsApp(phone, message, modal) {
  if (!phone) {
    showToast("Telefone nao disponivel", "warning");
    return;
  }

  const url = `https://wa.me/${phone}?text=${message}`;
  window.open(url, "_blank");

  setTimeout(() => {
    modal.remove();
  }, 500);
}

function openWhatsAppConfirmation(id, nome, data, horario, pax) {
  document
    .querySelectorAll(".menu-dropdown")
    .forEach((m) => m.classList.remove("show"));

  const dataFormatada = formatarData(data);
  const horarioFormatado = horario.substring(0, 5);
  const mensagem = `Ola ${nome}! Sua reserva foi confirmada! Data: ${dataFormatada} Horario: ${horarioFormatado} Pessoas: ${pax}. Aguardamos sua visita!`;

  const html = `
        <div class="modal fade show d-block" style="background: rgba(0,0,0,0.6); z-index: 10000;">
            <div class="modal-dialog modal-dialog-centered modal-sm">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header bg-success text-white border-0">
                        <h5 class="modal-title fw-bold">Confirmar Reserva</h5>
                        <button type="button" class="btn-close btn-close-white" onclick="this.closest('.modal').remove()"></button>
                    </div>
                    <div class="modal-body pt-4">
                        <div class="alert alert-light border-start border-4 border-success mb-3" role="alert">
                            <strong class="text-dark">${nome}</strong>
                            <span class="badge bg-secondary float-end">${id}</span>
                            <div class="small text-muted mt-2">
                                <div class="mb-1">${dataFormatada}</div>
                                <div class="mb-1">${horarioFormatado}</div>
                                <div>${pax} ${pax === 1 ? "pessoa" : "pessoas"}</div>
                            </div>
                        </div>
                        <div class="mb-3">
                            <small class="text-muted d-block mb-2">Mensagem WhatsApp:</small>
                            <div class="bg-light p-3 rounded" style="font-size: 0.85rem; line-height: 1.6; max-height: 200px; overflow-y: auto; white-space: pre-wrap; word-wrap: break-word;">${mensagem}</div>
                        </div>
                    </div>
                    <div class="modal-footer border-top-0 bg-light pt-3">
                        <button type="button" class="btn btn-outline-secondary btn-sm" onclick="this.closest('.modal').remove()">Cancelar</button>
                        <button type="button" class="btn btn-success btn-sm" onclick="sendWhatsAppConfirmation(${id}, this.closest('.modal'))">
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

  document.body.insertAdjacentHTML("beforeend", html);
}

async function sendWhatsAppConfirmation(id, modal) {
  try {
    const res = await fetch(`/api/reservationQuery/${id}/confirm`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      modal.remove();
      showToast("Reserva confirmada!", "success");
      loadReservations();
    }
  } catch (err) {
    showToast("Erro ao confirmar", "danger");
  }
}

async function openEditModal(id) {
  await abrirEditarReserva(id);
}

function showEditModal(reservation) {
  // Formatar data para input date (YYYY-MM-DD)
  let dataFormatada = '';
  if (reservation.data) {
    const d = new Date(reservation.data);
    dataFormatada = d.toISOString().split('T')[0];
  }

  const html = `
        <div class="modal fade show d-block" style="background: rgba(0,0,0,0.6); z-index: 10000;">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header border-0 bg-light">
                        <h5 class="modal-title fw-bold">Editar Reserva ${reservation.id}</h5>
                        <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editForm">
                            <div class="form-group mb-2">
                                <label class="fw-bold">Nome</label>
                                <input type="text" id="edit_nome" class="form-control" value="${reservation.nome}" required>
                            </div>
                            <div class="row">
                                <div class="col-md-4">
                                    <div class="form-group mb-2">
                                        <label class="fw-bold">Data</label>
                                        <input type="date" id="edit_data" class="form-control" value="${dataFormatada}" required>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="form-group mb-2">
                                        <label class="fw-bold">Horario</label>
                                        <input type="time" id="edit_horario" class="form-control" value="${reservation.horario.substring(0, 5)}" required>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="form-group mb-2">
                                        <label class="fw-bold">Pessoas</label>
                                        <input type="number" id="edit_pax" class="form-control" value="${reservation.numPessoas}" min="1" required>
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label class="fw-bold">Telefone</label>
                                        <input type="tel" id="edit_telefone" class="form-control" value="${reservation.telefone || ""}" placeholder="(11) 99999-9999">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-2">
                                        <label class="fw-bold">Mesa</label>
                                        <input type="text" id="edit_mesa" class="form-control" value="${reservation.numMesa || ""}">
                                    </div>
                                </div>
                            </div>
                            <div class="form-group mb-2">
                                <label class="fw-bold">Observacoes</label>
                                <textarea id="edit_obs" class="form-control" rows="2">${reservation.observacoes || ""}</textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer border-top-0">
                        <button type="button" class="btn btn-secondary btn-sm" onclick="this.closest('.modal').remove()">Cancelar</button>
                        <button type="button" class="btn btn-primary btn-sm" onclick="saveEdit(${reservation.id})">Salvar Alteracoes</button>
                    </div>
                </div>
            </div>
        </div>
    `;
  document.body.insertAdjacentHTML("beforeend", html);
}

async function saveEdit(id) {
  const payload = {
    nome: document.getElementById("edit_nome").value,
    data: document.getElementById("edit_data").value,
    numPessoas: parseInt(document.getElementById("edit_pax").value),
    horario: document.getElementById("edit_horario").value + ":00",
    telefone: document.getElementById("edit_telefone").value || null,
    numMesa: document.getElementById("edit_mesa").value || null,
    observacoes: document.getElementById("edit_obs").value || null,
  };

  try {
    const tkn = localStorage.getItem("token");
    const res = await fetch(`/api/reservationQuery/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tkn}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (data.success) {
      document.querySelector(".modal").remove();
      showToast("Reserva atualizada", "success");
      loadReservations();
    } else {
      showToast(data.error || "Erro ao salvar", "danger");
    }
  } catch (err) {
    showToast("Erro ao salvar", "danger");
  }
}

/**
 * HISTORICO DE CLIENTE
 */
async function viewClientHistory(phone) {
  if (!phone) {
    showToast("Cliente sem telefone", "warning");
    return;
  }

  try {
    const res = await fetch(`/api/reservationQuery/client/${phone}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { success, client, reservations } = await res.json();

    if (success) {
      showClientHistory(client, reservations);
    }
  } catch (err) {
    console.error("Erro:", err);
  }
}

function showClientHistory(client, reservations) {
  const html = `
        <div class="modal fade show d-block" style="background: rgba(0,0,0,0.6); z-index: 9999;">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content">
                    <div class="modal-header border-0 bg-light">
                        <h5 class="modal-title fw-bold">Historico do Cliente - ${client.nome}</h5>
                        <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row mb-4 g-2">
                            <div class="col-3 text-center">
                                <small class="text-muted d-block">Total</small>
                                <h6 class="fw-bold">${client.totalReservations}</h6>
                            </div>
                            <div class="col-3 text-center">
                                <small class="text-muted d-block">Confirmadas</small>
                                <h6 class="fw-bold text-success">${client.confirmadas}</h6>
                            </div>
                            <div class="col-3 text-center">
                                <small class="text-muted d-block">Canceladas</small>
                                <h6 class="fw-bold text-danger">${client.canceladas}</h6>
                            </div>
                            <div class="col-3 text-center">
                                <small class="text-muted d-block">Telefone</small>
                                <h6 class="fw-bold">${client.telefone || "N/A"}</h6>
                            </div>
                        </div>
                        <hr>
                        <h6 class="fw-bold mb-3">Ultimas Reservas</h6>
                        <div style="max-height: 400px; overflow-y: auto;">
                            <table class="table table-sm table-striped">
                                <thead class="table-light">
                                    <tr style="font-size: 0.85rem;">
                                        <th>Data</th>
                                        <th>Horario</th>
                                        <th>Pessoas</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${reservations
                                      .slice(0, 20)
                                      .map(
                                        (r) => `
                                        <tr style="font-size: 0.85rem;">
                                            <td>${new Date(r.data).toLocaleDateString("pt-BR")}</td>
                                            <td>${r.horario.substring(0, 5)}</td>
                                            <td>${r.numPessoas}p</td>
                                            <td>
                                                <span class="badge ${r.confirmado ? "bg-success" : r.status ? "bg-warning" : "bg-danger"}" style="font-size: 0.7rem;">
                                                    ${r.confirmado ? "Confirmada" : r.status ? "Pendente" : "Cancelada"}
                                                </span>
                                            </td>
                                        </tr>
                                    `,
                                      )
                                      .join("")}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
  document.body.insertAdjacentHTML("beforeend", html);
}

/**
 * HISTORICO DE ALTERACOES
 */
async function viewReservationHistory(id) {
  try {
    const tkn = localStorage.getItem("token");
    const res = await fetch(`/api/reservationQuery/${id}/history`, {
      headers: { Authorization: `Bearer ${tkn}` },
    });

    if (!res.ok) {
      console.error("Erro ao buscar historico:", res.status);
      showToast("Erro ao buscar historico", "danger");
      return;
    }

    const json = await res.json();

    // Mostra modal sempre - com ou sem alteracoes
    showReservationHistory(id, json.changes || []);
  } catch (err) {
    console.error("Erro ao buscar historico:", err);
    showToast("Erro ao buscar historico", "danger");
  }
}

// Mapa de nomes amigaveis para campos do banco
const CAMPOS_LABELS = {
  nome: 'Nome',
  numPessoas: 'Qtd. Pessoas',
  horario: 'Horario',
  numMesa: 'Mesa',
  observacoes: 'Observacoes',
  telefone: 'Telefone',
  telefone2: 'Telefone 2',
  confirmado: 'Confirmada',
  status: 'Status',
  motivoCancelamento: 'Motivo Cancelamento',
  formaPagamento: 'Forma Pagamento',
  tipoEvento: 'Tipo Evento',
  valorRodizio: 'Valor Rodizio',
  data: 'Data'
};

function traduzirCampo(campo) {
  return CAMPOS_LABELS[campo] || campo;
}

function traduzirValor(campo, valor) {
  if (valor === 'true' || valor === true) return 'Sim';
  if (valor === 'false' || valor === false) return 'Nao';
  if (!valor || valor === 'null' || valor === 'undefined') return '-';
  return valor;
}

function showReservationHistory(id, changes) {
  const html = `
        <div class="modal fade show d-block" style="background: rgba(0,0,0,0.6); z-index: 9999;">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content">
                    <div class="modal-header border-0 bg-light">
                        <h5 class="modal-title fw-bold">Historico de Alteracoes - Reserva #${id}</h5>
                        <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
                    </div>
                    <div class="modal-body">
                        ${
                          changes && changes.length > 0
                            ? `
                            <div style="max-height: 500px; overflow-y: auto;">
                                <table class="table table-sm table-striped">
                                    <thead class="table-light">
                                        <tr style="font-size: 0.85rem;">
                                            <th>Campo</th>
                                            <th>Anterior</th>
                                            <th>Novo</th>
                                            <th>Alterado por</th>
                                            <th>Data/Hora</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${changes
                                          .map(
                                            (c) => `
                                            <tr style="font-size: 0.8rem;">
                                                <td><strong>${traduzirCampo(c.campo)}</strong></td>
                                                <td><code>${traduzirValor(c.campo, c.valorAnterior)}</code></td>
                                                <td><code style="color: green;">${traduzirValor(c.campo, c.valorNovo)}</code></td>
                                                <td>${c.usuarioNome || '<span class="text-muted">-</span>'}</td>
                                                <td>${new Date(c.dataAlteracao).toLocaleString("pt-BR")}</td>
                                            </tr>
                                        `,
                                          )
                                          .join("")}
                                    </tbody>
                                </table>
                            </div>
                        `
                            : `
                            <p class="text-muted text-center py-4">Nenhuma alteracao registrada</p>
                        `
                        }
                    </div>
                </div>
            </div>
        </div>
    `;
  document.body.insertAdjacentHTML("beforeend", html);
}

function setPeriodo(periodo, btn) {
  document
    .querySelectorAll(".btn-period")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById("filterPeriodo").value = periodo;
  loadReservations();
}

function updateTotals(data, totals) {
  const dataDate = new Date(data + "T00:00:00");
  const dataFormatada = dataDate.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });

  document.getElementById("totalStatus").textContent = dataFormatada;
  document.getElementById("totalAtivos").textContent = totals.ativos;
  document.getElementById("totalQtd").textContent = totals.quantidade;

  if (totals.canceladas > 0) {
    document.getElementById("badgeCanceladas").style.display = "inline-block";
    document.getElementById("totalCanceladas").textContent = totals.canceladas;
  } else {
    document.getElementById("badgeCanceladas").style.display = "none";
  }
}

function showToast(msg, tipo) {
  const toast = document.createElement("div");
  toast.className = `alert alert-${tipo === "danger" ? "danger" : tipo === "warning" ? "warning" : tipo === "info" ? "info" : "success"}`;
  toast.innerHTML = msg;
  toast.style.cssText =
    "position:fixed; top:20px; right:20px; z-index:10001; min-width:300px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ========================= MODAL RESERVA - FORMULÁRIO COMPLETO =========================

// Helper para compatibilidade Bootstrap 4 e 5
function bsModalShow(el) {
  try {
    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      new bootstrap.Modal(el).show();
    } else if (typeof $ !== 'undefined') {
      $(el).modal('show');
    }
  } catch (e) {
    console.warn('bsModalShow fallback:', e);
    if (el) { el.classList.add('show'); el.style.display = 'block'; }
  }
}
function bsModalHide(el) {
  try {
    if (typeof $ !== 'undefined' && $.fn && $.fn.modal) {
      $(el).modal('hide');
    } else if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      const inst = bootstrap.Modal.getInstance(el) || bootstrap.Modal.getOrCreateInstance(el);
      if (inst) inst.hide();
    }
  } catch (e) {
    console.warn('bsModalHide fallback:', e);
    if (el) { el.classList.remove('show'); el.style.display = 'none'; }
    // Remover backdrop manualmente
    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
  }
}

// Fechar modal reserva (botao X)
function fecharModalReserva() {
  bsModalHide(document.getElementById('modalReserva'));
}

const TELEFONE_REGEX = /^[1-9]{2}9\d{8}$/;

function maskPhoneReserva(input) {
  let v = input.value.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length <= 10) {
    v = v.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else {
    v = v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  input.value = v;
}

// --- TOGGLE TELEFONE ---
function toggleTelefone(checkbox) {
  const tel = document.getElementById('res_telefone');
  const card = document.getElementById('card-perfil-cliente');
  const divNome = document.getElementById('div-input-nome');

  if (checkbox.checked) {
    tel.disabled = true;
    tel.value = '';
    tel.style.backgroundColor = '#e9ecef';
    card.style.display = 'none';
    divNome.style.display = 'block';
  } else {
    tel.disabled = false;
    tel.style.backgroundColor = '#f9f9fb';
  }
}

// --- BUSCAR PERFIL CLIENTE ---
async function buscarTelefone() {
  const telefone = document.getElementById('res_telefone').value.replace(/\D/g, '');
  if (telefone.length < 10) return;

  try {
    const res = await requisicaoAutenticada(`${API_CONFIG.BASE_URL}/api/reservations/profile/${telefone}`);
    const data = await res.json();

    if (data.found) {
      const p = data.profile;
      document.getElementById('card-nome-display').textContent = p.nome;
      document.getElementById('card-telefone-display').textContent = document.getElementById('res_telefone').value;
      document.getElementById('card-ultima').textContent = p.ultima_visita_data || '--';
      document.getElementById('card-tempo').textContent = p.tempo_atras || '--';
      document.getElementById('card-historico').textContent = p.historico_recente || '--';
      document.getElementById('stat-reservas').textContent = p.total_reservas || 0;
      document.getElementById('stat-cancelada').textContent = p.canceladas || 0;

      const areaObs = document.getElementById('area-obs-db');
      if (p.obs_cliente) {
        document.getElementById('txt-obs-db').textContent = p.obs_cliente;
        areaObs.style.display = 'block';
      } else {
        areaObs.style.display = 'none';
      }

      document.getElementById('res_nome').value = p.nome;
      document.getElementById('card-perfil-cliente').style.display = 'block';
      document.getElementById('div-input-nome').style.display = 'none';
    } else {
      document.getElementById('card-perfil-cliente').style.display = 'none';
      document.getElementById('div-input-nome').style.display = 'block';
    }
  } catch (err) {
    console.log('Cliente nao encontrado');
  }
}

// --- TROCAR / EDITAR CLIENTE ---
function trocarCliente() {
  document.getElementById('res_telefone').value = '';
  document.getElementById('res_nome').value = '';
  document.getElementById('card-perfil-cliente').style.display = 'none';
  document.getElementById('div-input-nome').style.display = 'block';
  document.getElementById('sem_telefone').checked = false;
  const tel = document.getElementById('res_telefone');
  tel.disabled = false;
  tel.style.backgroundColor = '#f9f9fb';
}

function editarCliente() {
  document.getElementById('input-edit-nome').value = document.getElementById('card-nome-display').textContent;
  document.getElementById('card-nome-display').style.display = 'none';
  document.getElementById('edit-name-container').style.display = 'flex';
}

function cancelarEdicaoNome() {
  document.getElementById('card-nome-display').style.display = 'block';
  document.getElementById('edit-name-container').style.display = 'none';
}

async function salvarNomeCliente() {
  const novoNome = document.getElementById('input-edit-nome').value.trim();
  const telefone = document.getElementById('res_telefone').value.replace(/\D/g, '');
  if (!novoNome || !telefone) return;

  try {
    const res = await requisicaoAutenticada(`${API_CONFIG.BASE_URL}/api/reservations/update-client-name`, {
      method: 'POST',
      body: JSON.stringify({ telefone, nome: novoNome })
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('card-nome-display').textContent = novoNome;
      document.getElementById('res_nome').value = novoNome;
      cancelarEdicaoNome();
    }
  } catch (err) {
    console.error('Erro ao atualizar nome:', err);
  }
}

// --- VALIDACAO E ENVIO ---
async function verificarEEnviar() {
  const semTel = document.getElementById('sem_telefone').checked;
  const tel = document.getElementById('res_telefone').value.replace(/\D/g, '');
  const nome = document.getElementById('res_nome').value.trim();
  const data = document.getElementById('res_data').value;
  const horario = document.getElementById('res_horario').value;
  const numPessoas = parseInt(document.getElementById('res_num_pessoas').value);
  const btn = document.getElementById('btnSalvarManual');

  // Campos obrigatorios
  if (!nome || !data || !horario || !numPessoas || numPessoas <= 0) {
    showToast('Preencha todos os campos obrigatorios (Nome, Data, Horario, Pax)', 'warning');
    return;
  }

  // Data anterior a hoje
  const hoje = new Date().toISOString().split('T')[0];
  if (data < hoje) {
    showToast('A data da reserva nao pode ser anterior a hoje.', 'danger');
    return;
  }

  // Validar telefone se preenchido
  if (!semTel && tel.length > 0 && !TELEFONE_REGEX.test(tel)) {
    showToast('Telefone invalido. Use formato: (XX) 9XXXX-XXXX', 'danger');
    return;
  }

  if (!semTel && tel.length > 0 && tel.length < 10) {
    showToast('Telefone invalido ou incompleto.', 'danger');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Verificando...';

  // Sem telefone - pula duplicidade
  if (semTel || !tel) {
    await enviarReservaAjax();
    return;
  }

  // Checar duplicidade
  try {
    const res = await requisicaoAutenticada(
      `${API_CONFIG.BASE_URL}/api/reservations/check-duplicate?phone=${tel}&date=${data}&name=${encodeURIComponent(nome)}`
    );
    const resp = await res.json();

    if (resp.erro_data) {
      showToast(resp.msg, 'danger');
      btn.disabled = false;
      btn.textContent = 'Cadastrar reserva';
      return;
    }

    if (resp.exists) {
      if (confirm(`Ja existe uma reserva para ${nome} nesta data. Deseja duplicar?`)) {
        await enviarReservaAjax();
      } else {
        btn.disabled = false;
        btn.textContent = 'Cadastrar reserva';
      }
    } else {
      await enviarReservaAjax();
    }
  } catch (err) {
    console.error('Erro na verificacao:', err);
    showToast('Erro ao verificar duplicidade.', 'danger');
    btn.disabled = false;
    btn.textContent = 'Cadastrar reserva';
  }
}

async function enviarReservaAjax() {
  const btn = document.getElementById('btnSalvarManual');
  btn.disabled = true;
  btn.textContent = 'Salvando...';

  const nome = document.getElementById('res_nome').value.trim();
  const dataVal = document.getElementById('res_data').value;
  const horarioVal = document.getElementById('res_horario').value;
  const numPessoasVal = parseInt(document.getElementById('res_num_pessoas').value);

  const payload = {
    nome,
    data: dataVal,
    horario: horarioVal + ':00',
    numPessoas: numPessoasVal,
    telefone: document.getElementById('res_telefone').value || null,
    telefone2: document.getElementById('res_telefone2').value || null,
    formaPagamento: document.getElementById('res_forma_pagamento').value,
    numMesa: document.getElementById('res_num_mesa').value || null,
    tipoEvento: document.getElementById('res_tipo_evento').value,
    valorRodizio: document.getElementById('res_valor_rodizio').value || null,
    observacoes: document.getElementById('res_observacoes').value || null,
    tortaTermoVela: document.getElementById('torta').checked,
    churrascaria: document.getElementById('churras').checked,
    executivo: document.getElementById('exec').checked
  };

  try {
    const res = await requisicaoAutenticada(`${API_CONFIG.BASE_URL}/api/reservations`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showToast(data.error || 'Erro ao salvar reserva.', 'danger');
      btn.disabled = false;
      btn.textContent = 'Cadastrar Reserva';
      return;
    }

    // Fechar modal de reserva
    bsModalHide(document.getElementById('modalReserva'));

    // Montar resumo da reserva
    const dataFormatada = dataVal.split('-').reverse().join('/');
    const resumoDiv = document.getElementById('rm-confirm-resumo');
    resumoDiv.innerHTML = `
      <strong>${nome}</strong><br>
      ${dataFormatada} as ${horarioVal} - ${numPessoasVal} pessoa(s)
    `;

    // Montar botoes de confirmacao
    const btnsDiv = document.getElementById('confirmacao-btns');
    let html = '';
    if (data.waLink) {
      html += `<button class="rm-btn-wa" onclick="window.open('${data.waLink}', '_blank')">Confirmar via WhatsApp</button>`;
    }
    html += `<button class="rm-btn-close-confirm" onclick="fecharModalConfirmacao()">Fechar</button>`;
    html += `<button class="rm-btn-close-confirm" onclick="fecharModalConfirmacaoENova()">Nova Reserva</button>`;
    btnsDiv.innerHTML = html;

    // Aviso de capacidade excedida
    if (data.avisoCapacidade) {
      showToast(data.avisoCapacidade, 'warning');
    }

    // Mostrar overlay de confirmacao
    document.getElementById('rm-confirmacao-overlay').style.display = 'flex';

    // Atualizar listas se existir
    if (typeof loadReservations === 'function') loadReservations();

  } catch (err) {
    console.error('Erro ao salvar:', err);
    showToast('Erro de conexao ao salvar.', 'danger');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Cadastrar Reserva';
  }
}

function fecharModalConfirmacao() {
  document.getElementById('rm-confirmacao-overlay').style.display = 'none';
}

function fecharModalConfirmacaoENova() {
  document.getElementById('rm-confirmacao-overlay').style.display = 'none';

  // Reset form
  const form = document.getElementById('formManual');
  if (form) form.reset();
  const whats = document.getElementById('whats_dados');
  if (whats) whats.value = '';
  trocarCliente();

  // Reabrir modal de reserva
  bsModalShow(document.getElementById('modalReserva'));

  // Setar data de hoje
  const dataInput = document.getElementById('res_data');
  if (dataInput && !dataInput.value) {
    dataInput.value = new Date().toISOString().split('T')[0];
  }
}

// --- IMPORTACAO WHATSAPP ---
function importarWhatsParaFormulario() {
  const texto = document.getElementById('whats_dados').value.trim();
  if (!texto) return;

  const linhas = texto.split('\n');
  linhas.forEach(linha => {
    const partes = linha.split(':');
    if (partes.length < 2) return;

    const chave = partes[0].trim().toLowerCase();
    const valor = partes.slice(1).join(':').trim();

    if (chave.includes('nome')) {
      document.getElementById('res_nome').value = valor;
    }
    if (chave.includes('telefone') && !chave.includes('alt')) {
      document.getElementById('res_telefone').value = valor.replace(/\D/g, '');
      maskPhoneReserva(document.getElementById('res_telefone'));
      buscarTelefone();
    }
    if (chave.includes('data')) {
      if (valor.includes('/')) {
        const p = valor.split('/');
        if (p.length === 3) {
          const ano = p[2].length === 2 ? '20' + p[2] : p[2];
          document.getElementById('res_data').value = `${ano}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
        }
      } else {
        document.getElementById('res_data').value = valor;
      }
    }
    if (chave.includes('hor')) {
      const h = valor.replace(/[;.]/g, ':').substring(0, 5);
      const select = document.getElementById('res_horario');
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === h) { select.selectedIndex = i; break; }
      }
    }
    if (chave.includes('pessoas') || chave.includes('pax')) {
      document.getElementById('res_num_pessoas').value = valor.replace(/\D/g, '');
    }
    if (chave.includes('pagamento')) {
      document.getElementById('res_forma_pagamento').value = valor;
    }
    if (chave.includes('mesa') || chave.includes('sal')) {
      const sel = document.getElementById('res_num_mesa');
      for (let i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === valor || sel.options[i].text.toLowerCase().includes(valor.toLowerCase())) {
          sel.selectedIndex = i; break;
        }
      }
    }
    if (chave.includes('observa') || chave.includes('obs')) {
      document.getElementById('res_observacoes').value = valor;
    }
    if (chave.includes('valor') || chave.includes('rodiz')) {
      document.getElementById('res_valor_rodizio').value = valor;
    }
  });

  showToast('Dados importados para o formulario!', 'info');
}

async function analisarSalvarDireto() {
  const texto = document.getElementById('whats_dados').value.trim();
  if (!texto) { showToast('Cole o texto do WhatsApp primeiro.', 'warning'); return; }

  const btn = document.getElementById('btnSalvarDireto');
  btn.textContent = 'Processando...';
  btn.disabled = true;

  try {
    const res = await requisicaoAutenticada(`${API_CONFIG.BASE_URL}/api/reservations/analyze-whatsapp`, {
      method: 'POST',
      body: JSON.stringify({ whatsText: texto })
    });
    const data = await res.json();

    if (!data.success || !data.lista || data.lista.length === 0) {
      showToast(data.error || 'Nenhuma reserva encontrada no texto.', 'warning');
      btn.textContent = 'Salvar Direto';
      btn.disabled = false;
      return;
    }

    const listaParaSalvar = [];
    for (const item of data.lista) {
      if (!item.valido) {
        showToast(`${item.dados.nome}: ${item.erros.join(', ')}`, 'danger');
        continue;
      }
      if (item.duplicado) {
        if (!confirm(`Duplicidade: ${item.dados.nome} ja existe nesta data. Salvar mesmo assim?`)) continue;
      }
      listaParaSalvar.push(item.dados);
    }

    if (listaParaSalvar.length === 0) {
      showToast('Nenhuma reserva valida para salvar.', 'warning');
      btn.textContent = 'Salvar Direto';
      btn.disabled = false;
      return;
    }

    const saveRes = await requisicaoAutenticada(`${API_CONFIG.BASE_URL}/api/reservations/save-whatsapp-list`, {
      method: 'POST',
      body: JSON.stringify({ listaJson: JSON.stringify(listaParaSalvar) })
    });
    const saveData = await saveRes.json();

    if (saveData.success) {
      const linksHtml = (saveData.links || []).map(l =>
        l.link ? `<a href="${l.link}" target="_blank" class="btn btn-sm btn-success rounded-pill mb-1">${l.nome} - WhatsApp</a>` : `<span class="text-muted small">${l.nome} (sem tel)</span>`
      ).join('<br>');

      showToast(`${saveData.salvos} reserva(s) salva(s)!`, 'success');
      document.getElementById('whats_dados').value = '';

      if (typeof loadReservations === 'function') loadReservations();
    } else {
      showToast('Erro ao salvar lista.', 'danger');
    }
  } catch (err) {
    console.error('Erro:', err);
    showToast('Erro de conexao.', 'danger');
  } finally {
    btn.textContent = 'Salvar Direto';
    btn.disabled = false;
  }
}

console.log("Reservation Modal v8 carregado - validacoes completas");
