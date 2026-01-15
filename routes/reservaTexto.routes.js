const express = require("express");
const prisma = require("../lib/prisma");
const auth = require("../middlewares/authMiddleware");

const router = express.Router();

/**
 * POST /api/reserva-texto/texto
 */
router.post("/texto", auth, async (req, res) => {
  try {
    const { texto } = req.body;

    if (!texto || texto.trim().length < 10) {
      return res.status(400).json({
        message: "Texto inválido"
      });
    }

    // =========================
    // 🔍 EXTRAÇÃO ROBUSTA
    // =========================
    const nome =
      texto.match(/para\s+([A-Za-zÀ-ú\s]+)/i)?.[1]?.trim() ||
      texto.match(/nome[:\-]?\s*([A-Za-zÀ-ú\s]+)/i)?.[1]?.trim();

    const telefone =
      texto.match(/(telefone|celular|tel)[^\d]*(\d{10,11})/i)?.[2];

    const numPessoas =
      texto.match(/(\d+)\s*(pessoas|pessoa)/i)?.[1];

    const horario =
      texto.match(/(\d{1,2}[:h]\d{2})/i)?.[1]?.replace("h", ":");

    const data =
      texto.match(/(\d{2}\/\d{2}\/\d{4})/)?.[1];

    const faltando = [];
    if (!nome) faltando.push("Nome");
    if (!telefone) faltando.push("Telefone");
    if (!numPessoas) faltando.push("Número de pessoas");
    if (!data) faltando.push("Data");
    if (!horario) faltando.push("Horário");

    if (faltando.length > 0) {
      return res.status(400).json({ faltando });
    }

    // =========================
    // NORMALIZA
    // =========================
    const [dia, mes, ano] = data.split("/");
    const dataISO = new Date(`${ano}-${mes}-${dia}`);

    const horarioISO = new Date(
      `${ano}-${mes}-${dia}T${horario}:00`
    );

    // =========================
    // SALVA
    // =========================
    const reserva = await prisma.cliente.create({
      data: {
        empresaId: req.user.empresaId,
        usuarioId: req.user.userId,

        nome,
        telefone,
        data: dataISO,
        horario: horarioISO,
        numPessoas: Number(numPessoas),

        tipoEvento: "Texto",
        formaPagamento: "Não definido",
        observacoes: texto
      }
    });

    res.json({
      message: "Reserva criada com sucesso",
      reserva
    });

  } catch (err) {
    console.error("ERRO RESERVA TEXTO:", err);
    res.status(500).json({ message: "Erro interno" });
  }
});

module.exports = router;
