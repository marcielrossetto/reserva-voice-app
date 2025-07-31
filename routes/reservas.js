const express = require("express");
const router = express.Router();
const Reserva = require("../models/Reserva");
const { determineIntentAndExtractData } = require("../utils/nluService");
const { parseISO, isValid } = require("date-fns");
const authMiddleware = require("../middlewares/authMiddleware");

// Todas as rotas abaixo exigem autenticação
router.use(authMiddleware);

/**
 * ✅ 1. Criar reserva via IA (voz ou texto)
 * Endpoint: POST /api/process-reservation
 */
router.post("/process-reservation", async (req, res) => {
  const { userInputText } = req.body;
  console.log("\n--- BACKEND: Nova Requisição /process-reservation ---");
  console.log("Texto recebido:", userInputText);

  if (!userInputText || userInputText.trim() === "") {
    return res.status(400).json({ message: "O texto para análise não foi fornecido." });
  }

  try {
    const nluResult = await determineIntentAndExtractData(userInputText);
    console.log("Resultado do NLU:", nluResult);

    if (nluResult.intent !== "fazer_reserva") {
      return res.status(400).json({
        message: `Não foi possível criar uma reserva. Intenção reconhecida como '${nluResult.intent}'.`
      });
    }

    const { data } = nluResult;
    const camposObrigatorios = ["nome", "telefone", "data", "horario", "numPessoas"];
    const faltantes = camposObrigatorios.filter(campo => !data[campo]);

    if (faltantes.length > 0) {
      return res.status(400).json({
        message: `Faltam informações: ${faltantes.join(", ")}.`
      });
    }

    const reservaDate = parseISO(data.data);
    if (!isValid(reservaDate)) {
      return res.status(400).json({ message: `Data inválida: ${data.data}` });
    }

    const novaReserva = new Reserva({
      ...data,
      data: reservaDate,
      userId: req.userId // VINCULA AO USUÁRIO LOGADO
    });

    const reservaSalva = await novaReserva.save();
    console.log("Reserva salva com ID:", reservaSalva._id);

    return res.status(201).json({
      message: "Reserva criada com sucesso!",
      reservation: reservaSalva
    });

  } catch (err) {
    console.error("Erro no processamento:", err);
    return res.status(500).json({ message: "Erro interno ao processar a reserva." });
  }
});

/**
 * ✅ 2. Listar reservas do usuário logado
 * Endpoint: GET /api/reservas
 */
router.get("/", async (req, res) => {
  try {
    const reservas = await Reserva.find({ userId: req.userId }).sort({ data: -1 });
    return res.status(200).json(reservas);
  } catch (err) {
    console.error("Erro ao buscar reservas:", err);
    return res.status(500).json({ message: "Erro ao buscar reservas." });
  }
});

/**
 * ✅ 3. Filtrar reservas por intervalo de datas (somente do usuário)
 * Endpoint: GET /api/filter-reservations?start=2025-07-27&end=2025-07-30
 */
router.get("/filter-reservations", async (req, res) => {
  try {
    const { start, end, horario } = req.query;
    let filtro = { userId: req.userId };

    if (start && end) {
      const dataInicio = new Date(start);
      const dataFim = new Date(end);
      dataFim.setHours(23, 59, 59, 999);
      filtro.data = { $gte: dataInicio, $lte: dataFim };
    } else if (start) {
      filtro.data = { $gte: new Date(start) };
    } else if (end) {
      const dataFim = new Date(end);
      dataFim.setHours(23, 59, 59, 999);
      filtro.data = { $lte: dataFim };
    }

    if (horario) filtro.horario = horario;

    const reservas = await Reserva.find(filtro).sort({ data: 1, horario: 1 });
    if (reservas.length === 0) {
      return res.status(404).json({ message: "Nenhuma reserva encontrada para o período selecionado." });
    }

    return res.status(200).json(reservas);
  } catch (err) {
    console.error("Erro no filtro:", err);
    return res.status(500).json({ message: "Erro ao filtrar reservas." });
  }
});

module.exports = router;
