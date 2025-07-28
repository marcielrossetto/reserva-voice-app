// public/script.js
document.addEventListener("DOMContentLoaded", () => {
  // --- Elementos da UI ---
  const startVoiceCmdBtn = document.getElementById("startVoiceCmdBtn");
  const voiceStatus = document.getElementById("voiceStatus");
  const transcribedTextElem = document.getElementById("transcribedText");
  
  const textInputArea = document.getElementById("textInputArea");
  const submitTextBtn = document.getElementById("submitTextBtn");
  
  const apiMessage = document.getElementById("apiMessage");
  const reservasTableBody = document.querySelector("#reservasTable tbody");

  // --- Configuração do Reconhecimento de Voz ---
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;

    // --- Eventos de Reconhecimento de Voz ---
    recognition.onstart = () => {
      voiceStatus.textContent = "Ouvindo...";
      startVoiceCmdBtn.disabled = true;
      submitTextBtn.disabled = true; // Desabilita ambos os botões
      transcribedTextElem.textContent = '...';
      apiMessage.textContent = '';
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      transcribedTextElem.textContent = transcript;
      if (transcript) {
        voiceStatus.textContent = "Processando sua fala...";
        // Chama a função centralizada
        processAndSaveReservation(transcript); 
      }
    };

    recognition.onerror = (event) => {
      let userMessage = `Erro no reconhecimento: ${event.error}.`;
      if (event.error === 'no-speech') userMessage = "Nenhuma fala foi detectada.";
      if (event.error === 'audio-capture') userMessage = "Problema na captura de áudio. Verifique seu microfone.";
      if (event.error === 'not-allowed') userMessage = "Permissão para usar o microfone foi negada.";
      voiceStatus.textContent = userMessage;
      transcribedTextElem.textContent = '(Erro)';
    };

    recognition.onend = () => {
      startVoiceCmdBtn.disabled = false;
      submitTextBtn.disabled = false;
      // Atualiza o status apenas se nenhuma outra mensagem (sucesso/erro) já foi colocada
      if (voiceStatus.textContent === 'Ouvindo...' || voiceStatus.textContent === 'Processando sua fala...') {
          voiceStatus.textContent = "Pronto para um novo comando.";
      }
    };

    // --- Listeners dos Botões ---
    startVoiceCmdBtn.addEventListener("click", () => {
      try {
        recognition.start();
      } catch (err) {
        voiceStatus.textContent = `Erro ao iniciar: ${err.message}.`;
      }
    });

  } else {
    // Se não houver suporte, desabilita a parte de voz
    startVoiceCmdBtn.disabled = true;
    voiceStatus.textContent = "Seu navegador não suporta reconhecimento de voz.";
  }
  
  // Listener para o botão de envio de texto
  submitTextBtn.addEventListener("click", () => {
    const userInputText = textInputArea.value;
    if (!userInputText.trim()) {
      displayMessage('Por favor, insira o texto da reserva.', 'error');
      return;
    }
    // Chama a mesma função centralizada
    processAndSaveReservation(userInputText);
  });

  // =======================================================================
  // FUNÇÃO CENTRAL PARA PROCESSAR O TEXTO E SALVAR A RESERVA
  // Esta função é chamada tanto pela voz quanto pelo texto.
  // =======================================================================
  async function processAndSaveReservation(inputText) {
    displayMessage('Analisando e processando a reserva...', 'loading');
    startVoiceCmdBtn.disabled = true;
    submitTextBtn.disabled = true;

    try {
      // Usa o endpoint unificado '/api/process-reservation'
      const response = await fetch('/api/process-reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInputText: inputText }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Ocorreu um erro no servidor.');
      }
      
      // Se a IA retornou uma reserva válida, adicione à tabela
      if (result.reservation && result.intent === 'fazer_reserva') {
        addReservationToTable(result.reservation);
        displayMessage('Reserva salva com sucesso!', 'success');
        textInputArea.value = ''; // Limpa a área de texto
      } else {
        // Se a intenção for incompleta ou outra coisa
        displayMessage(`Status da IA: ${result.message}`, 'error');
      }

    } catch (error) {
      console.error('Erro ao processar reserva:', error);
      displayMessage(`Erro na comunicação: ${error.message}`, 'error');
    } finally {
      startVoiceCmdBtn.disabled = false;
      submitTextBtn.disabled = false;
      voiceStatus.textContent = 'Pronto.';
    }
  }

  /**
   * Adiciona uma nova linha na tabela de reservas na interface.
   * @param {object} reservationData - O objeto de dados da reserva.
   */
  function addReservationToTable(data) {
    const row = document.createElement('tr');
    
    const observacoes = data.tipoEvento ? `${data.tipoEvento}. ${data.observacoes || ''}`.trim() : data.observacoes || '';

    row.innerHTML = `
      <td>${data.nome || 'N/A'}</td>
      <td>${data.telefone || 'N/A'}</td>
      <td>${data.data || 'N/A'}</td>
      <td>${data.horario || 'N/A'}</td>
      <td>${data.numPessoas || 'N/A'}</td>
      <td>${observacoes}</td>
    `;
    reservasTableBody.appendChild(row);
  }

  /**
   * Exibe uma mensagem de status para o usuário.
   * @param {string} text - O texto da mensagem.
   * @param {'success'|'error'|'loading'} type - O tipo de mensagem para estilização.
   */
  function displayMessage(text, type) {
    apiMessage.textContent = text;
    apiMessage.className = `message ${type}`; // Use CSS para estilizar .message.error, .message.success
  }
});