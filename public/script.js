// public/script.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("🟢 script.js carregado");
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  console.log("SpeechRecognition suportado?", !!SpeechRecognition);

  const startVoiceCmdBtn          = document.getElementById("startVoiceCmdBtn");
  const voiceStatus               = document.getElementById("voiceStatus");
  const transcribedTextElem       = document.getElementById("transcribedText");
  const recognizedIntentElem      = document.getElementById("recognizedIntent");
  const reservaForm               = document.getElementById("reservaForm");
  const reservasTableBody         = document.querySelector("#reservasTable tbody");
  const apiMessage                = document.getElementById("apiMessage");
  const newSearchOrReservationBtn = document.getElementById("newSearchOrReservationBtn");
  const manualSubmitBtn           = document.getElementById("manualSubmitBtn");

  let recognition;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log("🔊 recognition.onstart");
      voiceStatus.textContent = "Ouvindo...";
      startVoiceCmdBtn.disabled = true;
    };
    recognition.onresult = (e) => {
      console.log("🎙 recognition.onresult", e);
      const txt = e.results[0][0].transcript;
      transcribedTextElem.textContent = txt;
      processVoiceCommand(txt);
    };
    recognition.onerror = (e) => {
      console.log("⚠️ recognition.onerror", e);
      voiceStatus.textContent = `Erro: ${e.error}`;
      startVoiceCmdBtn.disabled = false;
    };
    recognition.onend = () => {
      console.log("⏹ recognition.onend");
      voiceStatus.textContent = "Ocioso (clique para falar)";
      startVoiceCmdBtn.disabled = false;
    };

    startVoiceCmdBtn.addEventListener("click", () => {
      console.log("🚀 Botão clicado");
      clearAll();
      try {
        recognition.start();
      } catch (err) {
        console.error("❌ recognition.start()", err);
        voiceStatus.textContent = "Ocioso (clique para falar)";
        startVoiceCmdBtn.disabled = false;
      }
    });
  } else {
    console.warn("❌ API de Reconhecimento de Voz não suportada");
    voiceStatus.textContent = "API de Reconhecimento de Voz não suportada.";
    startVoiceCmdBtn.disabled = true;
  }

  async function processVoiceCommand(cmd) {
    apiMessage.textContent = "Processando comando...";
    recognizedIntentElem.textContent = "Analisando...";
    reservasTableBody.innerHTML = "";

    try {
      const res = await fetch("/api/reservas/voice-command", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commandText: cmd }),
      });
      const json = await res.json();
      apiMessage.textContent = json.message || (res.ok ? "OK" : "Erro");
      recognizedIntentElem.textContent = json.intent || "N/A";

      if (!res.ok) {
        if (json.intent === "CREATE_RESERVATION" && json.data) fillForm(json.data);
        return;
      }
      switch (json.intent) {
        case "CREATE_RESERVATION":
          fillForm(json.data);
          displayReservas([json.data]);
          break;
        case "FILTER_RESERVATIONS":
          displayReservas(json.data);
          break;
        case "GET_FORM_DATA":
          fillForm(json.data, true);
          break;
      }
    } catch (err) {
      console.error("Frontend error:", err);
      apiMessage.textContent = `Erro: ${err.message}`;
    }
  }

  function fillForm(data, merge = false) {
    if (!merge) reservaForm.reset();
    Object.keys(data).forEach((k) => {
      const el = reservaForm.elements[k];
      if (!el) return;
      let v = data[k];
      if (k === "data" && v) v = v.split("T")[0];
      if (el.type === "checkbox") el.checked = !!v;
      else el.value = v ?? "";
    });
  }

  function clearAll() {
    reservaForm.reset();
    reservasTableBody.innerHTML = "";
    transcribedTextElem.textContent = "";
    recognizedIntentElem.textContent = "";
    apiMessage.textContent = "";
  }

  function displayReservas(list) {
    reservasTableBody.innerHTML = "";
    if (!list.length) {
      const r = reservasTableBody.insertRow();
      const c = r.insertCell();
      c.colSpan = 7;
      c.textContent = "Nenhuma reserva encontrada.";
      return;
    }
    list.forEach((r) => {
      const row = reservasTableBody.insertRow();
      row.insertCell().textContent = r.nome || "-";
      row.insertCell().textContent = r.telefone || "-";
      row.insertCell().textContent = r.data
        ? new Date(r.data).toLocaleDateString("pt-BR")
        : "-";
      row.insertCell().textContent = r.horario || "-";
      row.insertCell().textContent = r.numPessoas || "-";
      row.insertCell().textContent = r.observacoes || "-";
      row.insertCell().textContent = "...";
    });
  }

  newSearchOrReservationBtn.addEventListener("click", clearAll);

  manualSubmitBtn?.addEventListener("click", async () => {
    const fm = new FormData(reservaForm);
    const parts = [];
    fm.forEach((v, k) => v && parts.push(`${k} ${v}`));
    transcribedTextElem.textContent = `(Manual) ${parts.join(", ")}`;
    await processVoiceCommand(parts.join(" "));
  });
});
