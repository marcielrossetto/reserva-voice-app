// routes/reservas.js
const express = require("express");
const router = express.Router();
const Reserva = require("../models/Reserva");
const { determineIntentAndExtractData } = require("../utils/nluService");
const { parseISO, isValid, startOfDay, endOfDay } = require("date-fns");

// Função auxiliar para construir queries de data
function buildDateQuery(dateString) {
    if (!dateString) return null;
    const dateObject = parseISO(dateString + "T00:00:00.000Z");
    if (!isValid(dateObject)) return null;
    return {
        $gte: startOfDay(dateObject),
        $lte: endOfDay(dateObject)
    };
}

// Rota principal para comandos de voz
router.post("/voice-command", async (req, res) => {
    console.log("\n--- BACKEND: Nova Requisição /voice-command ---");
    const { commandText } = req.body;
    console.log("BACKEND (1): commandText recebido:", commandText);

    if (!commandText || commandText.trim() === "") {
        console.log("BACKEND (Error 1.1): commandText vazio. Retornando 400.");
        return res.status(400).json({
            intent: "INVALID_INPUT",
            message: "Comando de voz não fornecido ou vazio.",
            originalCommand: commandText || ""
        });
    }

    try {
        console.log("BACKEND (2): Chamando determineIntentAndExtractData...");
        const nluResult = await determineIntentAndExtractData(commandText);
        console.log("BACKEND (3): Resultado bruto do NLU:", JSON.stringify(nluResult, null, 2));

        let responsePayload = {
            intent: nluResult.intent,
            data: nluResult.data,
            message: "",
            originalCommand: commandText
        };

        if (nluResult.intent && nluResult.intent.startsWith("ERROR_NLU")) { // Trata ERROR_NLU_PARSE, ERROR_NLU_API_CALL, etc.
            console.log("BACKEND (Error 3.1): NLU Service retornou um erro:", nluResult.error, "Raw:", nluResult.rawResponse);
            responsePayload.message = nluResult.error || "Erro durante o processamento da linguagem natural.";
            if (nluResult.rawResponse) responsePayload.rawResponse = nluResult.rawResponse; // Para depuração no frontend
            return res.status(500).json(responsePayload);
        }

        console.log("BACKEND (4): Processando intenção:", nluResult.intent);

        switch (nluResult.intent) {
            case "fazer_reserva": { // <<<<---- NOME DA INTENÇÃO CORRIGIDO
                console.log("BACKEND (4.1 - FAZER_RESERVA): Dados NLU:", JSON.stringify(nluResult.data, null, 2));
                
                if (!nluResult.data) { // Segurança extra: se nluResult.data for undefined/null
                    responsePayload.message = "Nenhum dado foi extraído pela NLU para a reserva.";
                    console.log("BACKEND (Error 4.1.0 - FAZER_RESERVA): nluResult.data está nulo/undefined.");
                    return res.status(400).json(responsePayload);
                }

                const { nome, telefone, data: dataStringNLU, horario, numPessoas } = nluResult.data;

                const camposObrigatorios = ['nome', 'telefone', 'data', 'horario', 'numPessoas'];
                const camposFaltantes = [];
                for (const campo of camposObrigatorios) {
                    if (!nluResult.data[campo]) { // Verifica null, undefined, string vazia
                        camposFaltantes.push(campo);
                    }
                }

                if (camposFaltantes.length > 0) {
                    responsePayload.message = `Informações insuficientes. Campos faltando: ${camposFaltantes.join(', ')}.`;
                    responsePayload.missingFields = camposFaltantes;
                    console.log("BACKEND (Error 4.1.1 - FAZER_RESERVA):", responsePayload.message);
                    return res.status(400).json(responsePayload);
                }

                // Validação e conversão da data (dataStringNLU é o campo 'data' do NLU)
                const reservaDateObject = parseISO(dataStringNLU + "T00:00:00.000Z");
                if (!isValid(reservaDateObject)) {
                    responsePayload.message = `Data fornecida ('${dataStringNLU}') é inválida. Use o formato AAAA-MM-DD.`;
                    console.log("BACKEND (Error 4.1.2 - FAZER_RESERVA):", responsePayload.message);
                    return res.status(400).json(responsePayload);
                }

                const dadosParaSalvar = {
                    nome: nome,
                    telefone: telefone,
                    data: reservaDateObject,
                    horario: horario,
                    numPessoas: numPessoas,
                    // Adiciona campos opcionais apenas se existirem e tiverem valor
                    ...(nluResult.data.telefoneAlternativo && { telefoneAlternativo: nluResult.data.telefoneAlternativo }),
                    ...(nluResult.data.formaPagamento && { formaPagamento: nluResult.data.formaPagamento }),
                    ...(nluResult.data.tipoEvento && { tipoEvento: nluResult.data.tipoEvento }),
                    ...(nluResult.data.valorRodizio && { valorRodizio: nluResult.data.valorRodizio }),
                    ...(nluResult.data.numeroMesa && { numeroMesa: nluResult.data.numeroMesa }),
                    ...(nluResult.data.observacoes && { observacoes: nluResult.data.observacoes }),
                };
                
                try {
                    const novaReserva = new Reserva(dadosParaSalvar);
                    const reservaSalva = await novaReserva.save();

                    responsePayload.message = "Reserva criada com sucesso!";
                    responsePayload.reservaSalva = reservaSalva; // Para o frontend
                    console.log("BACKEND (Success 4.1.3 - FAZER_RESERVA): Reserva salva:", reservaSalva._id);
                    return res.status(201).json(responsePayload);

                } catch (saveError) {
                    console.error("BACKEND (Erro MongoDB 4.1.4 - FAZER_RESERVA):", saveError.message);
                    if (saveError.name === 'ValidationError') {
                        const errors = Object.values(saveError.errors).map(err => err.message);
                        responsePayload.message = "Erro de validação ao salvar a reserva.";
                        responsePayload.errors = errors;
                        return res.status(400).json(responsePayload);
                    }
                    responsePayload.message = "Erro interno ao tentar salvar a reserva.";
                    responsePayload.error = saveError.message; // Mensagem mais genérica
                    return res.status(500).json(responsePayload);
                }
            }

            case "FILTER_RESERVATIONS": { // Mantido como estava, parece razoável
                console.log("BACKEND (4.2 - FILTER): Critérios:", JSON.stringify(nluResult.data, null, 2));
                const query = {};
                const filterData = nluResult.data || {};

                switch (filterData.filterType) {
                    case "BY_NAME":
                        if (!filterData.nome) {
                            responsePayload.message = "Nome para filtro 'BY_NAME' não fornecido.";
                            return res.status(400).json(responsePayload);
                        }
                        query.nome = new RegExp(filterData.nome, 'i');
                        break;
                    case "BY_PHONE":
                        if (!filterData.telefone) {
                            responsePayload.message = "Telefone para filtro 'BY_PHONE' não fornecido.";
                            return res.status(400).json(responsePayload);
                        }
                        query.telefone = new RegExp(filterData.telefone, 'i'); // Busca parcial e case-insensitive
                        break;
                    case "BY_DATE":
                        if (!filterData.data) {
                            responsePayload.message = "Data para filtro 'BY_DATE' não fornecida.";
                            return res.status(400).json(responsePayload);
                        }
                        const dateQuery = buildDateQuery(filterData.data);
                        if (!dateQuery) {
                            responsePayload.message = `Data inválida ('${filterData.data}') para filtro 'BY_DATE'.`;
                            return res.status(400).json(responsePayload);
                        }
                        query.data = dateQuery;
                        break;
                    case "ALL":
                        console.log("BACKEND (4.2.5 - FILTER): Tipo ALL.");
                        break;
                    default:
                        if (filterData.filterType) {
                           responsePayload.message = `Tipo de filtro '${filterData.filterType}' não implementado.`;
                           return res.status(400).json(responsePayload);
                        }
                        console.log("BACKEND (4.2.7 - FILTER): filterType não especificado, buscando todas as reservas.");
                }

                const sortOptions = { data: 1, horario: 1 };
                const limit = parseInt(process.env.DEFAULT_QUERY_LIMIT) || 50;
                const foundReservas = await Reserva.find(query).sort(sortOptions).limit(limit);

                responsePayload.message = `${foundReservas.length} reserva(s) encontrada(s).`;
                responsePayload.data = foundReservas; // Sobrescreve nluResult.data com as reservas encontradas
                console.log("BACKEND (Success 4.2.9 - FILTER): Encontradas:", foundReservas.length);
                return res.status(200).json(responsePayload); // 200 OK para busca
            }

            // Intenção para quando o NLU só extrai dados mas não é uma ação de reserva imediata
            // O frontend usará isso para preencher o formulário.
            case "GET_FORM_DATA": // Se seu NLU retornar essa intenção
            case "intencao_incompleta": // Se seu NLU retornar essa intenção
                console.log("BACKEND (4.3 - DADOS_NLU_PARA_FORM): Dados:", JSON.stringify(nluResult.data, null, 2));
                responsePayload.message = "Dados extraídos. Por favor, complete e confirme a reserva.";
                // responsePayload.data já contém nluResult.data
                return res.status(200).json(responsePayload); // 200 OK

            case "consultar_informacao":
            case "geral_dialogo":
                console.log(`BACKEND (4.X - ${nluResult.intent}):`, JSON.stringify(nluResult.data, null, 2));
                responsePayload.message = `Recebi sua intenção de '${nluResult.intent}'. Como posso ajudar especificamente? (Lógica a ser implementada)`;
                // Aqui você poderia ter mais lógica para responder a essas intenções
                return res.status(200).json(responsePayload);

            case "intencao_desconhecida": // Intenção explicitamente marcada como desconhecida pelo NLU
            default:                     // Qualquer outra intenção não tratada
                responsePayload.intent = nluResult.intent || "UNKNOWN_FALLBACK";
                responsePayload.message = "Não foi possível entender completamente o seu pedido. Pode tentar de outra forma?";
                console.log("BACKEND (Error 4.4 - UNKNOWN/DEFAULT):", responsePayload.message, "NLU:", JSON.stringify(nluResult, null, 2));
                return res.status(400).json(responsePayload); // 400 Bad Request
        }
    } catch (err) {
        console.error("BACKEND (Error CATCH GERAL - /voice-command):", err.message, err.stack);
        const isNluRelatedError = err.message && (err.message.includes("Gemini API") || err.message.includes("NLU Service"));
        
        res.status(500).json({
            intent: "ERROR_ENDPOINT_UNHANDLED",
            message: isNluRelatedError ? err.message : "Ocorreu um erro interno inesperado no servidor.",
            originalCommand: commandText,
            // Em desenvolvimento, você pode querer vazar mais detalhes:
            // error: process.env.NODE_ENV === 'development' ? { message: err.message, stack: err.stack } : undefined
        });
    }
});

// Rota GET para listar todas as reservas
router.get("/", async (req, res) => {
    console.log("\n--- BACKEND: Nova Requisição GET / ---");
    try {
        const limit = parseInt(req.query.limit) || 20;
        const todasAsReservas = await Reserva.find().sort({ criadoEm: -1 }).limit(limit); // Ordena pelas mais recentes
        console.log(`BACKEND (GET /): Encontradas ${todasAsReservas.length} reservas.`);
        res.status(200).json({
            intent: "MANUAL_GET_ALL",
            message: `Retornando até ${limit} reservas.`,
            data: todasAsReservas,
            count: todasAsReservas.length
        });
    } catch (err) {
        console.error("BACKEND (Error CATCH GET /):", err.message);
        res.status(500).json({
            intent: "ERROR_ENDPOINT_GET_ALL",
            message: "Erro ao buscar todas as reservas.",
            error: err.message
        });
    }
});

module.exports = router;