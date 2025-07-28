document.addEventListener("DOMContentLoaded", () => {
  // --- Elementos da UI ---
  const startVoiceCmdBtn = document.getElementById("startVoiceCmdBtn");
  const voiceStatus = document.getElementById("voiceStatus");
  const transcribedTextElem = document.getElementById("transcribedText");
  const textInputArea = document.getElementById("textInputArea");
  const submitTextBtn = document.getElementById("submitTextBtn");
  const apiMessage = document.getElementById("apiMessage");
  const reservasTableBody = document.querySelector("#reservasTable tbody");

  // Elementos do filtro por intervalo de datas
  const filterBtn = document.getElementById("filterBtn");
  const filterStartDate = document.getElementById("filterStartDate");
  const filterEndDate = document.getElementById("filterEndDate");

  // Função para exibir mensagens
  function displayMessage(text, type) {
    apiMessage.textContent = text;
    apiMessage.className = `message ${type}`;
  }

  // Função para formatar data
  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString("pt-BR");
  };

  // Função para adicionar reserva na tabela
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
      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok) {
        reservasTableBody.innerHTML = "";
        displayMessage(result.message || "Nenhuma reserva encontrada.", "error");
        return;
      }

      reservasTableBody.innerHTML = "";
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
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      voiceStatus.textContent = "Ouvindo...";
      startVoiceCmdBtn.disabled = true;
      submitTextBtn.disabled = true;
      transcribedTextElem.textContent = "...";
      apiMessage.textContent = "";
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      transcribedTextElem.textContent = transcript;
      if (transcript) {
        voiceStatus.textContent = "Processando sua fala...";
        processAndSaveReservation(transcript);
      }
    };

    recognition.onerror = (event) => {
      let userMessage = `Erro no reconhecimento: ${event.error}.`;
      if (event.error === "no-speech") userMessage = "Nenhuma fala foi detectada.";
      if (event.error === "audio-capture") userMessage = "Problema na captura de áudio.";
      if (event.error === "not-allowed") userMessage = "Permissão para usar o microfone foi negada.";
      voiceStatus.textContent = userMessage;
      transcribedTextElem.textContent = "(Erro)";
    };

    recognition.onend = () => {
      startVoiceCmdBtn.disabled = false;
      submitTextBtn.disabled = false;
      if (voiceStatus.textContent === "Ouvindo..." || voiceStatus.textContent === "Processando sua fala...") {
        voiceStatus.textContent = "Pronto para um novo comando.";
      }
    };

    startVoiceCmdBtn.addEventListener("click", () => {
      try {
        recognition.start();
      } catch (err) {
        voiceStatus.textContent = `Erro ao iniciar: ${err.message}.`;
      }
    });
  } else {
    startVoiceCmdBtn.disabled = true;
    voiceStatus.textContent = "Seu navegador não suporta reconhecimento de voz.";
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInputText: inputText }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Ocorreu um erro no servidor.");
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
