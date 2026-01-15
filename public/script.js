document.addEventListener("DOMContentLoaded", () => {
  // ==========================
  // Verificação de login
  // ==========================
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
  }

  // Botão de logout
  const logoutBtn = document.createElement("button");
  logoutBtn.textContent = "Sair";
  logoutBtn.style = "position:fixed; top:10px; right:10px; background:#d33; color:white; padding:8px; border:none; cursor:pointer;";
  document.body.appendChild(logoutBtn);

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "login.html";
  });

  // ==========================
  // Elementos da UI
  // ==========================
  const startVoiceCmdBtn = document.getElementById("startVoiceCmdBtn");
  const voiceStatus = document.getElementById("voiceStatus");
  const transcribedTextElem = document.getElementById("transcribedText");
  const textInputArea = document.getElementById("textInputArea");
  const submitTextBtn = document.getElementById("submitTextBtn");
  const apiMessage = document.getElementById("apiMessage");
  const reservasTableBody = document.querySelector("#reservasTable tbody");
  const filterBtn = document.getElementById("filterBtn");
  const filterStartDate = document.getElementById("filterStartDate");
  const filterEndDate = document.getElementById("filterEndDate");

  function displayMessage(text, type) {
    apiMessage.textContent = text;
    apiMessage.className = `message ${type}`;
  }

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString("pt-BR");
  };

  function addReservationToTable(data) {
    const row = document.createElement("tr");
    const observacoes = data.tipoEvento
      ? `${data.tipoEvento}. ${data.observacoes || ""}`.trim()
      : data.observacoes || "";

    row.innerHTML = `
      <td>${data.nome || "N/A"}</td>
      <td>${data.telefone || "N/A"}</td>
      <td>${formatDate(data.data) || "N/A"}</td>
      <td>${data.horario || "N/A"}</td>
      <td>${data.numPessoas || "N/A"}</td>
      <td>${observacoes}</td>
    `;
    reservasTableBody.appendChild(row);
  }

  // ==========================
  // FILTRAR ENTRE DUAS DATAS
  // ==========================
  filterBtn.addEventListener("click", async () => {
    const startValue = filterStartDate.value;
    const endValue = filterEndDate.value;

    if (!startValue && !endValue) {
      displayMessage("Informe pelo menos uma data para filtrar.", "error");
      return;
    }

    let url = "/api/filter-reservations?";
    if (startValue) url += `start=${startValue}&`;
    if (endValue) url += `end=${endValue}`;

    try {
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const result = await response.json();

      reservasTableBody.innerHTML = "";

      if (!response.ok) {
        displayMessage(result.message || "Nenhuma reserva encontrada.", "error");
        return;
      }

      result.forEach(addReservationToTable);
      displayMessage("Filtro aplicado com sucesso!", "success");
    } catch (err) {
      console.error(err);
      displayMessage("Erro ao buscar reservas.", "error");
    }
  });

  // ==========================
  // RECONHECIMENTO DE VOZ
  // ==========================
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      voiceStatus.textContent = "🎤 Ouvindo...";
      startVoiceCmdBtn.disabled = true;
      submitTextBtn.disabled = true;
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      transcribedTextElem.textContent = transcript;
      voiceStatus.textContent = "Processando...";
      if (transcript) {
        processAndSaveReservation(transcript);
      }
    };

    recognition.onerror = (event) => {
      voiceStatus.textContent = "Erro: " + event.error;
    };

    recognition.onend = () => {
      startVoiceCmdBtn.disabled = false;
      submitTextBtn.disabled = false;
      voiceStatus.textContent = "Pronto para começar.";
    };

    startVoiceCmdBtn.addEventListener("click", () => {
      recognition.start();
    });
  } else {
    startVoiceCmdBtn.disabled = true;
    voiceStatus.textContent = "Seu navegador não suporta reconhecimento de voz.";
  }




const userInfoDiv = document.getElementById("userInfo");
const username = localStorage.getItem("username");

if (username) {
  userInfoDiv.innerHTML = `
    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&color=fff&rounded=true" alt="Avatar" />
    <span>${username}</span>
  `;
}
document.addEventListener("DOMContentLoaded", () => {
  const userNameElem = document.getElementById("userName");
  const userName = localStorage.getItem("username");
  if (userName) {
    userNameElem.textContent = `Olá, ${userName}`;
  }
});
const userNameElem = document.getElementById("userName");
const userName = localStorage.getItem("username");

if (userName) {
  userNameElem.textContent = `Olá, ${userName}`;
} else {
  userNameElem.textContent = "Olá, Usuário";
}
const modal = document.getElementById("calendarModal");
const openBtn = document.getElementById("openCalendarBtn");
const closeBtn = document.getElementById("closeModal");
const calendarGrid = document.getElementById("calendarGrid");
const calendarTitle = document.getElementById("calendarTitle");
const totalMonth = document.getElementById("totalMonth");

let currentMonth = new Date().getMonth() + 1;
let currentYear = new Date().getFullYear();

// Abrir modal
openBtn.addEventListener("click", () => {
  modal.style.display = "flex";
  loadCalendar(currentMonth, currentYear);
});

// Fechar modal
closeBtn.addEventListener("click", () => modal.style.display = "none");

// Navegação de meses
document.getElementById("prevMonth").addEventListener("click", () => {
  currentMonth--;
  if (currentMonth < 1) { currentMonth = 12; currentYear--; }
  loadCalendar(currentMonth, currentYear);
});

document.getElementById("nextMonth").addEventListener("click", () => {
  currentMonth++;
  if (currentMonth > 12) { currentMonth = 1; currentYear++; }
  loadCalendar(currentMonth, currentYear);
});

// Buscar dados do backend
async function loadCalendar(month, year) {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Sessão expirada. Faça login novamente.");
    window.location.href = "login.html";
    return;
  }

  try {
    const response = await fetch(`/api/calendar-reservas?month=${month}&year=${year}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) throw new Error(`Erro ${response.status}`);
    const data = await response.json();
    renderCalendar(data, month, year);
  } catch (err) {
    console.error("Erro ao carregar calendário:", err);
  }
}

// Renderizar o calendário
function renderCalendar(data, month, year) {
  calendarGrid.innerHTML = "";
  calendarTitle.textContent = `${new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`;

  let total = 0;
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  // Preenche espaços antes do primeiro dia
  for (let i = 0; i < firstDay; i++) {
    calendarGrid.innerHTML += `<div></div>`;
  }

  // Preenche dias com dados
  for (let d = 1; d <= daysInMonth; d++) {
    const dia = data[d] || { A: 0, J: 0 };
    total += dia.A + dia.J;
    calendarGrid.innerHTML += `
      <div class="calendar-day">
        <strong>${d}</strong>
        <div class="badgeA">A: ${dia.A}</div>
        <div class="badgeJ">J: ${dia.J}</div>
      </div>
    `;
  }

  totalMonth.textContent = `TOTAL = ${total}`;
}

  // ==========================
  // PROCESSAR RESERVA (VOZ OU TEXTO)
  // ==========================
  submitTextBtn.addEventListener("click", () => {
    const userInputText = textInputArea.value;
    if (!userInputText.trim()) {
      displayMessage("Por favor, insira o texto da reserva.", "error");
      return;
    }
    processAndSaveReservation(userInputText);
  });

  async function processAndSaveReservation(inputText) {
    displayMessage("Analisando e processando a reserva...", "loading");
    startVoiceCmdBtn.disabled = true;
    submitTextBtn.disabled = true;

    try {
      const response = await fetch("/api/process-reservation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ userInputText: inputText }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Erro no servidor.");
      }

      if (result.reservation) {
        addReservationToTable(result.reservation);
        displayMessage("Reserva salva com sucesso!", "success");
        textInputArea.value = "";
      } else {
        displayMessage(`Status da IA: ${result.message}`, "error");
      }
    } catch (error) {
      console.error("Erro ao processar reserva:", error);
      displayMessage(`Erro na comunicação: ${error.message}`, "error");
    } finally {
      startVoiceCmdBtn.disabled = false;
      submitTextBtn.disabled = false;
      voiceStatus.textContent = "Pronto.";
    }
  }
});
document.getElementById("submitTextBtn").addEventListener("click", async () => {
  const texto = document.getElementById("textInputArea").value;
  const msg = document.getElementById("apiMessage");

  msg.innerHTML = "⏳ Processando...";

  try {
    const res = await fetch("/api/reserva-texto/texto", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({ texto })
    });

    const data = await res.json();

    if (!res.ok) {
      msg.innerHTML = `❌ Faltando: ${data.faltando.join(", ")}`;
      return;
    }

    msg.innerHTML = "✅ Reserva salva com sucesso!";
    document.getElementById("textInputArea").value = "";

  } catch (e) {
    msg.innerHTML = "❌ Erro de conexão";
  }
});
async function analisarTexto() {
  const texto = document.getElementById("textInputArea").value;

  const res = await fetch("/api/reserva-texto/texto", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texto })
  });

  const data = await res.json();

  if (data.faltando) {
    alert("Faltando: " + data.faltando.join(", "));
  }

  const d = data.dadosExtraidos;

  document.getElementById("formEditar").style.display = "block";
  document.getElementById("nome").value = d.nome || "";
  document.getElementById("telefone").value = d.telefone || "";
  document.getElementById("data").value = d.data || "";
  document.getElementById("horario").value = d.horario || "";
  document.getElementById("numPessoas").value = d.numPessoas || "";
  document.getElementById("tipoEvento").value = d.tipoEvento || "";
  document.getElementById("formaPagamento").value = d.formaPagamento || "";
  document.getElementById("observacoes").value = d.observacoes || "";
}
