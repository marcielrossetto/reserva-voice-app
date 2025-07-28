// routes/reservas.js
const express = require("express");
const router = express.Router();
const Reserva = require("../models/Reserva"); // Assumindo que seu modelo Mongoose está aqui
const { determineIntentAndExtractData } = require("../utils/nluService"); // A mágica da IA acontece aqui
const { parseISO, isValid } = require("date-fns");

/**
 * ROTA UNIFICADA PARA PROCESSAR RESERVAS (VOZ OU TEXTO)
 * Endpoint: POST /api/process-reservation
 * Recebe: { userInputText: "..." }
 * Responde: { message: "...", reservation: {...} } em caso de sucesso
 *           ou { message: "..." } em caso de erro/intenção incompleta.
 */
router.post("/process-reservation", async (req, res) => {
    // MUDANÇA 1: O nome do campo agora é 'userInputText'
    const { userInputText } = req.body;
    console.log("\n--- BACKEND: Nova Requisição /process-reservation ---");
    console.log("BACKEND (1): Texto recebido:", userInputText);

    if (!userInputText || userInputText.trim() === "") {
        return res.status(400).json({ message: "O texto para análise não foi fornecido." });
    }

    try {
        // MUDANÇA 2: A chamada ao serviço de NLU continua a mesma, mas agora ele usa o prompt híbrido
        console.log("BACKEND (2): Chamando o serviço NLU...");
        const nluResult = await determineIntentAndExtractData(userInputText);
        console.log("BACKEND (3): Resultado do NLU:", JSON.stringify(nluResult, null, 2));

        // MUDANÇA 3: A lógica do switch é simplificada para focar na ação principal
        switch (nluResult.intent) {
            case "fazer_reserva": {
                const { data } = nluResult;
                const camposObrigatorios = ['nome', 'telefone', 'data', 'horario', 'numPessoas'];
                const camposFaltantes = camposObrigatorios.filter(campo => !data[campo]);

                if (camposFaltantes.length > 0) {
                    const message = `Informações insuficientes. Por favor, forneça: ${camposFaltantes.join(', ')}.`;
                    console.log("BACKEND (ERRO 4.1):", message);
                    return res.status(400).json({ message });
                }
                
                const reservaDateObject = parseISO(data.data);
                if (!isValid(reservaDateObject)) {
                    const message = `A data extraída ('${data.data}') é inválida. Tente novamente.`;
                    return res.status(400).json({ message });
                }

                const dadosParaSalvar = { ...data, data: reservaDateObject };
                const novaReserva = new Reserva(dadosParaSalvar);
                const reservaSalva = await novaReserva.save();
                
                console.log("BACKEND (SUCESSO 4.2): Reserva salva com ID:", reservaSalva._id);

                // MUDANÇA 4: A resposta de sucesso agora corresponde EXATAMENTE ao que o frontend espera
                return res.status(201).json({
                    message: "Reserva criada com sucesso!",
                    reservation: reservaSalva // A chave é 'reservation'
                });
            }

            case "intencao_incompleta":
            case "consultar_informacao":
            case "geral_dialogo":
            case "intencao_desconhecida":
                console.log(`BACKEND (INFO 4.3): Intenção '${nluResult.intent}' recebida.`);
                return res.status(400).json({ 
                    message: `Não foi possível criar uma reserva. A intenção foi reconhecida como '${nluResult.intent}'. Tente ser mais específico com os dados da reserva.` 
                });

            // Erro vindo diretamente do serviço de NLU (ex: falha na API da IA)
            default: // Inclui casos de ERROR_NLU_*
                console.error("BACKEND (ERRO 4.4): Erro do serviço NLU ou intenção não tratada.", nluResult.error);
                return res.status(500).json({ message: nluResult.error || "Ocorreu um erro ao processar sua solicitação." });
        }
    } catch (err) {
        console.error("BACKEND (ERRO CATCH GERAL):", err);
        res.status(500).json({ message: "Ocorreu um erro interno inesperado no servidor." });
    }
});


// Rota GET para listar reservas (pode ser mantida para depuração ou um painel admin)
router.get("/", async (req, res) => {
    try {
        const todasAsReservas = await Reserva.find().sort({ data: -1 }).limit(50);
        res.status(200).json(todasAsReservas);
    } catch (err) {
        res.status(500).json({ message: "Erro ao buscar reservas." });
    }
});

module.exports = router;