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
  // ... (outros elementos)

  let recognition;
  let recognizing = false;
  let finalTranscript = '';

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true; // Mantenha true para melhor feedback

    recognition.onstart = () => {
      console.log("🔊 recognition.onstart");
      recognizing = true;
      voiceStatus.textContent = "Ouvindo... Fale e clique em 'Parar' ou aguarde o silêncio."; // Atualizar instrução
      startVoiceCmdBtn.textContent = "Parar de Ouvir";
      startVoiceCmdBtn.disabled = false;
      finalTranscript = '';
      transcribedTextElem.textContent = '...'; // Indicação visual que está esperando
    };

    recognition.onresult = (event) => {
      console.log("🎙️ recognition.onresult - Evento recebido:", event); // Log mais detalhado
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          console.log("  -> Resultado Final:", transcriptPart);
          finalTranscript += transcriptPart + ' '; // Adiciona espaço entre segmentos finais
        } else {
          console.log("  -> Resultado Intermediário:", transcriptPart);
          interimTranscript += transcriptPart;
        }
      }
      transcribedTextElem.textContent = finalTranscript.trim() + interimTranscript;
      console.log("  Texto acumulado (final):", finalTranscript.trim());
      console.log("  Texto intermediário atual:", interimTranscript);

      // Opcional: lógica de timeout para parar automaticamente após silêncio
      // clearSpeechTimeout();
      // speechTimeout = setTimeout(() => {
      //   if (recognizing) {
      //     console.log("Timeout de silêncio atingido, parando reconhecimento.");
      //     recognition.stop();
      //   }
      // }, 3000); // Para após 3 segundos de silêncio (ajuste conforme necessário)
    };

    recognition.onerror = (event) => {
      // LOG MAIS DETALHADO DO ERRO
      console.error("⚠️ recognition.onerror - DETALHES DO ERRO:", event);
      console.error("   Tipo de Erro:", event.error);
      console.error("   Mensagem de Erro:", event.message);

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
      
      // Resetar estado se ocorrer um erro crítico
      if (recognizing) { // Só para se estava recognizing
          // Não chamar recognition.stop() aqui se o erro já o fez,
          // mas garantir que o estado da UI seja resetado.
          recognizing = false;
          startVoiceCmdBtn.textContent = "Iniciar Comando de Voz";
          startVoiceCmdBtn.disabled = false;
      }
    };

    recognition.onend = () => {
      console.log("⏹️ recognition.onend - Reconhecimento finalizado.");
      // clearSpeechTimeout(); // Limpa o timeout se estiver usando
      
      // Só processa se estava 'recognizing' e foi parado (seja por stop() ou naturalmente)
      // E se não foi um erro que já resetou 'recognizing'
      if (!recognizing && !startVoiceCmdBtn.disabled) { // Se já foi resetado por onerror, não faz nada
          console.log("   onend chamado após erro já tratado ou estado já resetado.");
          return;
      }

      recognizing = false; // Garante que está false
      startVoiceCmdBtn.textContent = "Iniciar Comando de Voz";
      startVoiceCmdBtn.disabled = false;

      const trimmedTranscript = finalTranscript.trim();
      if (trimmedTranscript) {
        console.log("   Texto final para processamento:", trimmedTranscript);
        transcribedTextElem.textContent = trimmedTranscript;
        voiceStatus.textContent = "Processando sua fala...";
        processVoiceCommand(trimmedTranscript);
      } else {
        console.log("   Nenhum texto final para processar.");
        // Não mostra "Nenhuma fala capturada" se já houve um erro com mensagem específica
        if (voiceStatus.textContent.startsWith("Ouvindo") || voiceStatus.textContent.startsWith("Processando")) {
             voiceStatus.textContent = "Nenhuma fala capturada para processar.";
        }
        transcribedTextElem.textContent = transcribedTextElem.textContent || "(Nenhuma fala)"; // Mantém o que foi exibido se houver algo
      }
    };

    startVoiceCmdBtn.addEventListener("click", () => {
      console.log("🚀 Botão clicado. Estado recognizing atual:", recognizing);
      if (recognizing) {
        console.log("   Usuário clicou para PARAR. Solicitando parada do reconhecimento...");
        recognition.stop();
      } else {
        clearAll();
        console.log("   Usuário clicou para INICIAR.");
        try {
          recognition.start();
        } catch (err) {
          console.error("❌ Erro ao chamar recognition.start():", err);
          voiceStatus.textContent = "Erro ao iniciar. Tente novamente.";
          // Não precisa mexer em recognizing ou no botão aqui, pois onstart/onerror cuidarão
        }
      }
    });

  } else {
    // ... (código para API não suportada)
  }

  // ... (funções processVoiceCommand, fillForm, clearAll, displayReservas, etc.)
  // Mantenha a função clearAll como estava para limpar os campos
  function clearAll() {
    reservaForm.reset();
    // ... (outros resets que você tinha)
    transcribedTextElem.textContent = "";
    recognizedIntentElem.textContent = "";
    apiMessage.textContent = "";
    if (!recognizing) { // Só reseta o status se não estiver ouvindo
        voiceStatus.textContent = "Ocioso (clique para falar)";
    }
  }

  // ... (resto do seu script.js)
});