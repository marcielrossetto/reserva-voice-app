// routes/reservas.js
const express = require("express");
const router = express.Router(); // Boa prática: definir router primeiro
const Reserva = require("../models/Reserva");
const { determineIntentAndExtractData } = require("../utils/nluService");
const { parseISO, isValid, startOfDay, endOfDay } = require("date-fns"); // Funções específicas usadas

// Função auxiliar para construir queries de data
function buildDateQuery(dateString) {
    if (!dateString) return null;
    // Adicionar T00:00:00.000Z para garantir que parseISO trate como início do dia em UTC
    const dateObject = parseISO(dateString + "T00:00:00.000Z");
    if (!isValid(dateObject)) return null;
    return {
        $gte: startOfDay(dateObject), // startOfDay já considera o fuso horário do objeto Date
        $lte: endOfDay(dateObject)   // endOfDay também
    };
}

// Rota principal para comandos de voz
router.post("/voice-command", async (req, res) => {
    console.log("\n--- BACKEND: Nova Requisição /voice-command ---"); // Log de início de requisição
    const { commandText } = req.body;
    console.log("BACKEND (1): commandText recebido:", commandText);

    if (!commandText || commandText.trim() === "") {
        console.log("BACKEND (Error 1.1): commandText está vazio ou faltando. Retornando 400.");
        return res.status(400).json({
            intent: "INVALID_INPUT",
            message: "Comando de voz não fornecido ou vazio.",
            originalCommand: commandText
        });
    }

    try {
        console.log("BACKEND (2): Chamando determineIntentAndExtractData...");
        const nluResult = await determineIntentAndExtractData(commandText);
        console.log("BACKEND (3): Resultado bruto do NLU:", JSON.stringify(nluResult, null, 2));

        // Estrutura de payload padrão para a resposta
        let responsePayload = {
            intent: nluResult.intent,
            data: nluResult.data, // Pode ser null ou conter dados/erros do NLU
            message: "", // Será preenchida por cada case
            originalCommand: commandText
        };

        // Tratamento de erro vindo diretamente do NLU Service
        if (nluResult.intent === "ERROR_NLU" || nluResult.intent === "ERROR") {
            console.log("BACKEND (Error 3.1): NLU Service retornou um erro explícito:", nluResult.data?.message);
            responsePayload.message = nluResult.data?.message || "Erro durante o processamento da linguagem natural.";
            return res.status(500).json(responsePayload); // Erro do NLU é um erro de servidor aqui
        }

        console.log("BACKEND (4): Processando intenção:", nluResult.intent);

        switch (nluResult.intent) {
            case "CREATE_RESERVATION": {
                console.log("BACKEND (4.1 - CREATE): Dados recebidos para criação:", JSON.stringify(nluResult.data, null, 2));
                const { nome, telefone, data: dataString, horario, numPessoas } = nluResult.data || {}; // Garante que data é um objeto

                if (!nome || !telefone || !dataString || !horario || !numPessoas) {
                    responsePayload.message = "Informações insuficientes para criar reserva (nome, telefone, data, horário, ou nº de pessoas faltando).";
                    console.log("BACKEND (Error 4.1.1 - CREATE):", responsePayload.message, "Detalhes:", nluResult.data);
                    return res.status(400).json(responsePayload);
                }

                const reservaDateObject = parseISO(dataString + "T00:00:00.000Z");
                if (!isValid(reservaDateObject)) {
                    responsePayload.message = `Data fornecida ('${dataString}') é inválida. Use o formato YYYY-MM-DD.`;
                    console.log("BACKEND (Error 4.1.2 - CREATE):", responsePayload.message);
                    return res.status(400).json(responsePayload);
                }

                // Usar nluResult.data diretamente, mas sobrescrever 'data' com o objeto Date
                const dadosParaSalvar = { ...nluResult.data, data: reservaDateObject };
                const novaReserva = new Reserva(dadosParaSalvar);
                await novaReserva.save();

                responsePayload.message = "Reserva criada com sucesso!";
                responsePayload.data = novaReserva; // Retorna a reserva completa com _id, etc.
                console.log("BACKEND (Success 4.1.3 - CREATE): Reserva salva:", JSON.stringify(novaReserva, null, 2));
                return res.status(201).json(responsePayload);
            }

            case "FILTER_RESERVATIONS": {
                console.log("BACKEND (4.2 - FILTER): Critérios de filtro recebidos:", JSON.stringify(nluResult.data, null, 2));
                const query = {};
                const filterData = nluResult.data || {};

                switch (filterData.filterType) {
                    case "BY_NAME":
                        if (!filterData.nome) {
                            responsePayload.message = "Nome para filtro 'BY_NAME' não fornecido.";
                            console.log("BACKEND (Error 4.2.1 - FILTER):", responsePayload.message);
                            return res.status(400).json(responsePayload);
                        }
                        query.nome = new RegExp(filterData.nome, 'i');
                        break;
                    case "BY_PHONE":
                        if (!filterData.telefone) {
                            responsePayload.message = "Telefone para filtro 'BY_PHONE' não fornecido.";
                             console.log("BACKEND (Error 4.2.2 - FILTER):", responsePayload.message);
                            return res.status(400).json(responsePayload);
                        }
                        query.telefone = new RegExp(filterData.telefone, 'i');
                        break;
                    case "BY_DATE":
                        if (!filterData.data) {
                            responsePayload.message = "Data para filtro 'BY_DATE' não fornecida.";
                            console.log("BACKEND (Error 4.2.3 - FILTER):", responsePayload.message);
                            return res.status(400).json(responsePayload);
                        }
                        const dateQuery = buildDateQuery(filterData.data);
                        if (!dateQuery) {
                            responsePayload.message = `Data inválida ('${filterData.data}') para filtro 'BY_DATE'.`;
                            console.log("BACKEND (Error 4.2.4 - FILTER):", responsePayload.message);
                            return res.status(400).json(responsePayload);
                        }
                        query.data = dateQuery;
                        break;
                    // Adicionar mais cases para BY_DATE_RANGE, BY_DATETIME, ALL aqui...
                    // Exemplo para ALL:
                    case "ALL":
                        // Nenhum filtro específico, apenas busca tudo
                        console.log("BACKEND (4.2.5 - FILTER): Tipo de filtro ALL.");
                        break;
                    default:
                        // Se filterType for desconhecido ou não fornecido, mas a intenção é FILTER_RESERVATIONS
                        // pode-se optar por retornar todas ou um erro.
                        // Por agora, vamos assumir que se filterType não for reconhecido, é um erro.
                        if (filterData.filterType) {
                           responsePayload.message = `Tipo de filtro '${filterData.filterType}' não implementado.`;
                           console.log("BACKEND (Error 4.2.6 - FILTER):", responsePayload.message);
                           return res.status(400).json(responsePayload);
                        }
                        // Se não houver filterType, mas a intenção é filtrar, talvez listar todas?
                        // Ou considerar um erro. Por agora, se não tiver filterType, pode buscar todas.
                        console.log("BACKEND (4.2.7 - FILTER): filterType não especificado, buscando todas.");
                }

                const sortOptions = { data: 1, horario: 1 };
                const limit = 50;
                console.log("BACKEND (4.2.8 - FILTER): Executando query no MongoDB:", JSON.stringify(query), "Sort:", sortOptions, "Limit:", limit);
                const foundReservas = await Reserva.find(query).sort(sortOptions).limit(limit);

                responsePayload.message = `${foundReservas.length} reserva(s) encontrada(s).`;
                responsePayload.data = foundReservas;
                console.log("BACKEND (Success 4.2.9 - FILTER): Reservas encontradas:", foundReservas.length);
                return res.json(responsePayload);
            }

            case "GET_FORM_DATA":
                console.log("BACKEND (4.3 - GET_FORM_DATA): Dados recebidos:", JSON.stringify(nluResult.data, null, 2));
                responsePayload.message = "Dados parciais do formulário extraídos pela NLU.";
                // responsePayload.data já contém nluResult.data
                return res.json(responsePayload);

            case "UNKNOWN": // Intenção explicitamente marcada como UNKNOWN pelo NLU
            default:      // Qualquer outra intenção não tratada
                responsePayload.intent = nluResult.intent || "UNKNOWN_FALLBACK"; // Garante que intent seja definido
                responsePayload.message = "Não foi possível entender o comando ou a intenção não é suportada.";
                console.log("BACKEND (Error 4.4 - UNKNOWN/DEFAULT):", responsePayload.message, "NLU Result:", JSON.stringify(nluResult, null, 2));
                return res.status(400).json(responsePayload);
        }
    } catch (err) {
        console.error("BACKEND (Error CATCH GERAL - /voice-command):", err.message, err.stack);
        // Evita vazar detalhes do erro para o cliente, a menos que seja um erro específico da NLU já tratado
        const isNluError = err.message.includes("Gemini API") || err.message.includes("NLU");
        res.status(500).json({
            intent: "ERROR_ENDPOINT_UNHANDLED",
            message: isNluError ? err.message : "Ocorreu um erro interno inesperado ao processar seu comando.",
            originalCommand: commandText,
            // errorDetails: process.env.NODE_ENV === 'development' ? err.message : undefined // Opcional: mostrar detalhes do erro em dev
        });
    }
});

// Rota GET para listar todas as reservas (para debug ou uso manual)
router.get("/", async (req, res) => {
    console.log("\n--- BACKEND: Nova Requisição GET / ---");
    try {
        const todasAsReservas = await Reserva.find().sort({ data: 1, horario: 1 }).limit(20);
        console.log(`BACKEND (GET /): Encontradas ${todasAsReservas.length} reservas.`);
        res.json({
            intent: "MANUAL_GET_ALL",
            message: `Retornando até 20 reservas (total: ${todasAsReservas.length}).`,
            data: todasAsReservas
        });
    } catch (err) {
        console.error("BACKEND (Error CATCH GET /):", err.message, err.stack);
        res.status(500).json({
            intent: "ERROR_ENDPOINT_GET_ALL",
            message: "Erro ao buscar todas as reservas.",
            error: err.message
        });
    }
});

module.exports = router;