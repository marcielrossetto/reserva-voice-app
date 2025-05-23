// public/script.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("🟢 script.js carregado");
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  console.log("SpeechRecognition suportado?", !!SpeechRecognition);

  const startVoiceCmdBtn = document.getElementById("startVoiceCmdBtn");
  const voiceStatus = document.getElementById("voiceStatus");
  const transcribedTextElem = document.getElementById("transcribedText");
  const recognizedIntentElem = document.getElementById("recognizedIntent");
  const apiMessage = document.getElementById("apiMessage");
  const reservaForm = document.getElementById("reservaForm");

  let recognition;
  let recognizing = false; // Para controlar o estado do botão
  // Não precisamos de 'finalTranscriptAcumulado' se continuous = false

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = false; // <<-- Importante: para após a primeira fala/pausa
    recognition.interimResults = false; // <<-- Simplifica o onresult

    recognition.onstart = () => {
      console.log("🔊 recognition.onstart");
      recognizing = true;
      voiceStatus.textContent = "Ouvindo...";
      startVoiceCmdBtn.textContent = "Processando..."; // Ou "Ouvindo..."
      startVoiceCmdBtn.disabled = true; // Desabilita enquanto ouve/processa
      transcribedTextElem.textContent = '...';
      if (apiMessage) apiMessage.textContent = '';
    };

    recognition.onresult = (event) => {
      console.log("🎙️ recognition.onresult - Evento recebido:", event);
      const transcript = event.results[0][0].transcript.trim();
      console.log("  Texto reconhecido (final):", transcript);
      transcribedTextElem.textContent = transcript;

      // CHAMA O PROCESSAMENTO DIRETAMENTE AQUI!
      if (transcript) {
        voiceStatus.textContent = "Processando sua fala...";
        processVoiceCommand(transcript); // <<--- CHAMADA CORRETA AQUI
      } else {
        voiceStatus.textContent = "Nenhuma fala detectada.";
        // O onend será chamado, e lá resetamos o botão
      }
    };

    recognition.onerror = (event) => {
      console.error("⚠️ recognition.onerror - DETALHES DO ERRO:", event);
      // ... (seu código de tratamento de erro detalhado aqui - MANTENHA-O) ...
      let userMessage = `Erro no reconhecimento: ${event.error}.`;
      if (event.error === 'no-speech') {
        userMessage = "Nenhuma fala foi detectada. Tente falar mais alto ou verifique o microfone.";
      } else if (event.error === 'audio-capture') {
        userMessage = "Problema na captura de áudio. Verifique seu microfone e as permissões.";
      } else if (event.error === 'not-allowed') {
        userMessage = "Permissão para usar o microfone foi negada ou não concedida.";
      } else if (event.error === 'network') {
        userMessage = "Erro de rede durante o reconhecimento. Verifique sua conexão.";
      }
      voiceStatus.textContent = userMessage;
      transcribedTextElem.textContent = '(Erro)';
      // O 'onend' será chamado automaticamente após um erro,
      // então o botão será resetado lá.
    };

    recognition.onend = () => {
      console.log("⏹️ recognition.onend - Reconhecimento finalizado.");
      recognizing = false;
      startVoiceCmdBtn.textContent = "Iniciar Comando de Voz";
      startVoiceCmdBtn.disabled = false; // Reabilita o botão
      
      // Se o voiceStatus ainda estiver "Processando sua fala...",
      // significa que o processVoiceCommand foi chamado mas ainda não retornou
      // ou já atualizou o status.
      // Se o transcribedTextElem ainda for '...' e não houve erro,
      // pode significar que onresult não pegou nada.
      if (transcribedTextElem.textContent === '...' && !voiceStatus.textContent.includes("Erro")) {
          voiceStatus.textContent = "Nenhuma fala capturada.";
          transcribedTextElem.textContent = "(Nenhuma fala)";
      }
    };

    startVoiceCmdBtn.addEventListener("click", () => {
      console.log("🚀 Botão clicado. Estado recognizing atual:", recognizing);
      if (recognizing) {
        // Com continuous = false, o usuário não precisa clicar para parar.
        // O reconhecimento para sozinho. O botão já está desabilitado.
        // Se você quiser permitir um "cancelar", poderia chamar recognition.abort()
        // mas a lógica do botão "Processando..." já cobre isso.
        console.log("   Reconhecimento em progresso, botão de parada não aplicável com continuous=false e botão desabilitado.");
      } else {
        clearDisplayFields(); // Limpa apenas os campos de feedback
        voiceStatus.textContent = "Aguardando para iniciar...";
        transcribedTextElem.textContent = '...';
        console.log("   Usuário clicou para INICIAR.");
        try {
          recognition.start();
        } catch (err) {
          console.error("❌ Erro ao chamar recognition.start():", err);
          voiceStatus.textContent = `Erro ao iniciar: ${err.message}. Tente novamente.`;
          recognizing = false;
          startVoiceCmdBtn.textContent = "Iniciar Comando de Voz";
          startVoiceCmdBtn.disabled = false;
        }
      }
    });

  } else {
    voiceStatus.textContent = "Seu navegador não suporta reconhecimento de voz.";
    if(startVoiceCmdBtn) startVoiceCmdBtn.disabled = true;
  }

  function clearDisplayFields() {
    transcribedTextElem.textContent = "";
    if (recognizedIntentElem) recognizedIntentElem.textContent = "";
    if (apiMessage) apiMessage.textContent = "";
  }
  
  function clearForm() {
      if (reservaForm) reservaForm.reset();
  }

  // =======================================================================
  // DEFINIÇÃO DA FUNÇÃO processVoiceCommand (COLOQUE-A AQUI NO ESCOPO GLOBAL)
  // =======================================================================
  async function processVoiceCommand(commandText) {
    console.log('Enviando para o backend:', commandText);
    // O voiceStatus já foi atualizado para "Processando sua fala..." em onresult
    // O botão startVoiceCmdBtn já está desabilitado desde onstart

    try {
      const response = await fetch('/api/reservas/voice-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ commandText: commandText }),
      });

      const result = await response.json(); 

      if (!response.ok) {
        console.error('Erro do servidor:', response.status, result);
        voiceStatus.textContent = `Erro do servidor: ${result.message || response.statusText}`;
        if (apiMessage) apiMessage.textContent = `Detalhe: ${result.error || result.rawResponse || JSON.stringify(result.data) || 'Nenhum detalhe adicional.'}`;
      } else {
        console.log('Resposta do backend:', result);
        voiceStatus.textContent = "Comando processado!"; // Atualiza o status
        if (apiMessage) apiMessage.textContent = result.message || "Sucesso!";

        if (result.intent === "fazer_reserva" && result.data) {
          fillFormWithNLUData(result.data);
           if (result.message && result.message !== "Sucesso!") { 
             voiceStatus.textContent = result.message;
          } else {
             voiceStatus.textContent = "Dados da reserva preenchidos. Verifique e confirme.";
          }
        } else if (result.intent && result.intent.startsWith("ERROR_NLU")) {
            voiceStatus.textContent = `Erro no NLU: ${result.data?.message || result.error || "Não foi possível processar."}`;
            if (result.rawResponse && apiMessage) {
                apiMessage.textContent = "Resposta bruta da IA: " + result.rawResponse.substring(0, 100) + "...";
            }
        } else {
            voiceStatus.textContent = result.message || "Intenção não reconhecida ou dados incompletos.";
            if (apiMessage && result.data) apiMessage.textContent = JSON.stringify(result.data);
        }
      }
    } catch (error) {
      console.error('Erro de rede ou ao fazer fetch para /voice-command:', error);
      voiceStatus.textContent = 'Erro de comunicação ao processar seu comando.';
      if (apiMessage) apiMessage.textContent = `Detalhe: ${error.message}`;
    }
    // O onend será chamado de qualquer forma, e lá o botão é reabilitado.
    // Não precisamos reabilitar o botão aqui explicitamente.
  }

  function fillFormWithNLUData(data) {
    if (!reservaForm) return;
    // ... (código da função fillFormWithNLUData como na resposta anterior)
    if (data.nome) reservaForm.elements.nome.value = data.nome;
    if (data.telefone) reservaForm.elements.telefone.value = data.telefone;
    if (data.data) reservaForm.elements.data.value = data.data;
    if (data.horario) reservaForm.elements.horario.value = data.horario;
    if (data.numPessoas) reservaForm.elements.numPessoas.value = data.numPessoas;
    if (data.telefoneAlternativo && reservaForm.elements.telefoneAlternativo) reservaForm.elements.telefoneAlternativo.value = data.telefoneAlternativo;
    if (data.formaPagamento && reservaForm.elements.formaPagamento) reservaForm.elements.formaPagamento.value = data.formaPagamento;
    if (data.tipoEvento && reservaForm.elements.tipoEvento) reservaForm.elements.tipoEvento.value = data.tipoEvento;
    if (data.valorRodizio && reservaForm.elements.valorRodizio) reservaForm.elements.valorRodizio.value = data.valorRodizio;
    if (data.numeroMesa && reservaForm.elements.numeroMesa) reservaForm.elements.numeroMesa.value = data.numeroMesa;
    if (data.observacoes && reservaForm.elements.observacoes) reservaForm.elements.observacoes.value = data.observacoes;
    console.log("Formulário preenchido com dados do NLU.");
  }

  const clearButton = document.getElementById('clearAllButton');
  if (clearButton) {
      clearButton.addEventListener('click', () => {
          clearDisplayFields();
          clearForm();
          voiceStatus.textContent = "Campos limpos. Clique para iniciar novo comando.";
      });
  }

});