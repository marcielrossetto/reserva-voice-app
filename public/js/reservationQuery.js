/**
 * RESERVATION QUERY - iOS Style FINAL
 */

let token = localStorage.getItem("token");

document.addEventListener("DOMContentLoaded", () => {
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

function createCard(reservation) {
  const card = document.createElement("div");
  card.className = `reservation-card ${reservation.status ? "" : "cancelled"}`;

  const confirmedClass = reservation.confirmado ? "confirmed" : "pending";
  const confirmedText = reservation.confirmado ? "Confirmada" : "Pendente";
  const mesaDisplay = reservation.numMesa ? reservation.numMesa : "N/D";

  card.innerHTML = `
        <div class="card-content">
            <!-- ID + HISTORY -->
            <div class="card-id-box">
                <div class="card-id-number">${reservation.id}</div>
                <div class="card-id-label">ID</div>
                <button class="card-history-btn" onclick="viewReservationHistory(${reservation.id})" title="Histórico da reserva">
                    <i class="fas fa-file-alt"></i>
                </button>
            </div>

            <!-- NOME + TELEFONE -->
            <div class="card-main">
                <div class="card-name">${reservation.nome}</div>
                <a href="https://wa.me/${reservation.telefone.replace(/\D/g, "")}" target="_blank" class="card-phone" title="Abrir WhatsApp">
                    <i class="fab fa-whatsapp"></i> ${reservation.telefone || "N/A"}
                </a>
            </div>

            <!-- OBS COM SCROLL -->
            ${
              reservation.observacoes
                ? `
                <div class="card-obs" title="${reservation.observacoes}">
                    ${reservation.observacoes}
                </div>
            `
                : ""
            }

            <!-- PAX + HORÁRIO + MESA -->
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

                <span class="badge-status badge-${confirmedClass}">${confirmedText}</span>
            </div>

            <!-- MENU iOS -->
            <div class="card-menu">
                <button class="btn-menu-ios" onclick="toggleMenu(event)">⋮</button>
                <div class="menu-dropdown" id="menu-${reservation.id}">
                    ${
                      !reservation.confirmado && reservation.status
                        ? `
                        <button class="menu-item" onclick="openConfirmationModal(${reservation.id}, '${reservation.nome}', '${reservation.data}', '${reservation.horario}', ${reservation.numPessoas})">
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
                        <button class="menu-item danger" onclick="cancelReservation(${reservation.id})">
                            <i class="fas fa-trash"></i>
                            <span>Cancelar</span>
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

function toggleMenu(event) {
  event.stopPropagation();
  const btn = event.target.closest(".btn-menu-ios");
  const menu = btn.nextElementSibling;

  document.querySelectorAll(".menu-dropdown").forEach((m) => {
    if (m !== menu) m.classList.remove("show");
  });

  menu.classList.toggle("show");
}

function closeMenusOnClickOutside(event) {
  if (!event.target.closest(".card-menu")) {
    document
      .querySelectorAll(".menu-dropdown")
      .forEach((m) => m.classList.remove("show"));
  }
}

function openConfirmationModal(id, nome, data, horario, pax) {
  document
    .querySelectorAll(".menu-dropdown")
    .forEach((m) => m.classList.remove("show"));

  const dataObj = new Date(data + "T00:00:00");
  const dataFormatada = dataObj.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const horarioFormatado = horario.substring(0, 5);
  const mensagem = `Olá ${nome}! 👋\n\nSua reserva foi confirmada! ✅\n\n📅 Data: ${dataFormatada}\n🕐 Horário: ${horarioFormatado}\n👥 Pessoas: ${pax}\n\nAguardamos sua visita! 😊`;

  const html = `
        <div class="modal fade show d-block" style="background: rgba(0,0,0,0.6); z-index: 10000;">
            <div class="modal-dialog modal-dialog-centered modal-sm">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header bg-success text-white border-0">
                        <h5 class="modal-title fw-bold">✓ Confirmar Reserva</h5>
                        <button type="button" class="btn-close btn-close-white" onclick="this.closest('.modal').remove()"></button>
                    </div>
                    <div class="modal-body pt-4">
                        <div class="alert alert-light border-start border-4 border-success mb-3" role="alert">
                            <div class="mb-2">
                                <strong class="text-dark">${nome}</strong>
                                <span class="badge bg-secondary float-end">#${id}</span>
                            </div>
                            <div class="small text-muted">
                                <div class="mb-1"><i class="fas fa-calendar-alt"></i> ${dataFormatada}</div>
                                <div class="mb-1"><i class="fas fa-clock"></i> ${horarioFormatado}</div>
                                <div><i class="fas fa-users"></i> ${pax} ${pax === 1 ? "pessoa" : "pessoas"}</div>
                            </div>
                        </div>
                        <div class="mb-3">
                            <small class="text-muted d-block mb-2">📱 Mensagem WhatsApp:</small>
                            <div class="bg-light p-3 rounded" style="font-size: 0.85rem; line-height: 1.6; max-height: 200px; overflow-y: auto; white-space: pre-wrap; word-wrap: break-word;">${mensagem}</div>
                        </div>
                    </div>
                    <div class="modal-footer border-top-0 bg-light pt-3">
                        <button type="button" class="btn btn-outline-secondary btn-sm" onclick="this.closest('.modal').remove()">Cancelar</button>
                        <button type="button" class="btn btn-success btn-sm" onclick="sendWhatsAppConfirmation(${id}, this.closest('.modal'))">
                            <i class="fab fa-whatsapp"></i> Enviar
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
      showToast("✅ Reserva confirmada!", "success");
      loadReservations();
    }
  } catch (err) {
    showToast("❌ Erro ao confirmar", "danger");
  }
}

async function openEditModal(id) {
  try {
    const res = await fetch(`/api/reservationQuery/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { success, reservation } = await res.json();

    if (success) {
      showEditModal(reservation);
    }
  } catch (err) {
    console.error("Erro:", err);
  }
}

async function editReservationFull(id) {
  await openEditModal(id);
}

function showEditModal(reservation) {
  const html = `
        <div class="modal fade show d-block" style="background: rgba(0,0,0,0.6); z-index: 10000;">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header border-0 bg-light">
                        <h5 class="modal-title fw-bold">Editar Reserva #${reservation.id}</h5>
                        <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editForm">
                            <div class="form-group">
                                <label class="fw-bold">Nome</label>
                                <input type="text" id="edit_nome" class="form-control" value="${reservation.nome}" required>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label class="fw-bold">Pessoas</label>
                                        <input type="number" id="edit_pax" class="form-control" value="${reservation.numPessoas}" min="1" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label class="fw-bold">Horário</label>
                                        <input type="time" id="edit_horario" class="form-control" value="${reservation.horario.substring(0, 5)}" required>
                                    </div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="fw-bold">Telefone</label>
                                <input type="tel" id="edit_telefone" class="form-control" value="${reservation.telefone || ""}" placeholder="(11) 99999-9999">
                            </div>
                            <div class="form-group">
                                <label class="fw-bold">Mesa</label>
                                <input type="text" id="edit_mesa" class="form-control" value="${reservation.numMesa || ""}">
                            </div>
                            <div class="form-group">
                                <label class="fw-bold">Observações</label>
                                <textarea id="edit_obs" class="form-control" rows="3">${reservation.observacoes || ""}</textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer border-top-0">
                        <button type="button" class="btn btn-secondary btn-sm" onclick="this.closest('.modal').remove()">Cancelar</button>
                        <button type="button" class="btn btn-primary btn-sm" onclick="saveEdit(${reservation.id})">Salvar Alterações</button>
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
    numPessoas: parseInt(document.getElementById("edit_pax").value),
    horario: document.getElementById("edit_horario").value + ":00",
    telefone: document.getElementById("edit_telefone").value || null,
    numMesa: document.getElementById("edit_mesa").value || null,
    observacoes: document.getElementById("edit_obs").value || null,
  };

  try {
    const res = await fetch(`/api/reservationQuery/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      document.querySelector(".modal").remove();
      showToast("✅ Reserva atualizada", "success");
      loadReservations();
    }
  } catch (err) {
    showToast("❌ Erro ao salvar", "danger");
  }
}

async function cancelReservation(id) {
  const motivo = prompt("Motivo da cancelação:");
  if (!motivo) return;

  try {
    const res = await fetch(`/api/reservationQuery/${id}/cancel`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason: motivo }),
    });

    if (res.ok) {
      showToast("❌ Reserva cancelada", "warning");
      loadReservations();
    }
  } catch (err) {
    showToast("❌ Erro ao cancelar", "danger");
  }
}

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
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header border-0 bg-light">
                        <h5 class="modal-title fw-bold">${client.nome}</h5>
                        <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row mb-3 g-2">
                            <div class="col-4 text-center">
                                <small class="text-muted d-block">Total</small>
                                <strong class="h6">${client.totalReservations}</strong>
                            </div>
                            <div class="col-4 text-center">
                                <small class="text-muted d-block">Confirmadas</small>
                                <strong class="h6 text-success">${client.confirmadas}</strong>
                            </div>
                            <div class="col-4 text-center">
                                <small class="text-muted d-block">Canceladas</small>
                                <strong class="h6 text-danger">${client.canceladas}</strong>
                            </div>
                        </div>
                        <hr>
                        <small class="text-muted d-block mb-2">Últimas Reservas:</small>
                        <div style="max-height: 300px; overflow-y: auto;">
                            ${reservations
                              .slice(0, 10)
                              .map(
                                (r) => `
                                <div class="py-2 px-2 border-bottom" style="font-size: 0.85rem;">
                                    <strong>${new Date(r.data).toLocaleDateString("pt-BR")}</strong> 
                                    • ${r.horario.substring(0, 5)} 
                                    • ${r.numPessoas}p
                                    <span class="badge ${r.confirmado ? "bg-success" : "bg-warning"} float-end" style="font-size: 0.7rem;">
                                        ${r.confirmado ? "✓" : "pendente"}
                                    </span>
                                </div>
                            `,
                              )
                              .join("")}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
  document.body.insertAdjacentHTML("beforeend", html);
}

async function viewReservationHistory(id) {
  try {
    const res = await fetch(`/api/reservationQuery/${id}/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { success, changes } = await res.json();

    if (success) {
      showReservationHistory(id, changes);
    } else {
      showToast("Nenhuma alteração registrada", "info");
    }
  } catch (err) {
    showToast("Erro ao carregar histórico", "danger");
  }
}

function showReservationHistory(id, changes) {
  const html = `
        <div class="modal fade show d-block" style="background: rgba(0,0,0,0.6); z-index: 9999;">
            <div class="modal-dialog modal-dialog-centered modal-sm">
                <div class="modal-content">
                    <div class="modal-header border-0 bg-light">
                        <h5 class="modal-title fw-bold">Histórico #${id}</h5>
                        <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
                    </div>
                    <div class="modal-body">
                        ${
                          changes && changes.length > 0
                            ? `
                            <div style="max-height: 400px; overflow-y: auto;">
                                ${changes
                                  .map(
                                    (c, i) => `
                                    <div class="py-2 px-2 border-bottom" style="font-size: 0.85rem;">
                                        <strong>${c.campo}</strong><br>
                                        <small class="text-muted">De: ${c.valorAnterior || "—"}</small><br>
                                        <small class="text-success">Para: ${c.valorNovo || "—"}</small><br>
                                        <small class="text-secondary">${new Date(c.dataAlteracao).toLocaleString("pt-BR")}</small>
                                    </div>
                                `,
                                  )
                                  .join("")}
                            </div>
                        `
                            : `
                            <p class="text-muted text-center py-4">Nenhuma alteração registrada</p>
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

  document.getElementById("totalStatus").textContent = `📅 ${dataFormatada}`;
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

async function openReservationModal() {
  if (!document.getElementById("modalReserva")) {
    try {
      const response = await fetch("/html/reservation_modal.html");
      document.getElementById("modal-container").innerHTML =
        await response.text();
    } catch (err) {
      console.error("Erro:", err);
    }
  }
  const myModal = new bootstrap.Modal(document.getElementById("modalReserva"));
  myModal.show();
}

console.log("✓ Reservation Query FINAL carregado");
