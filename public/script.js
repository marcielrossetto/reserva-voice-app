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
