// Em seu routes/reservations.js, NO INÍCIO do arquivo

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const auth = require("../middlewares/authMiddleware");
const WhatsAppParser = require("../utils/whatsappParserRegex");

const router = express.Router();
const prisma = new PrismaClient();

// ✅ DEBUG: Log todas as requisições
router.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  console.log("Headers:", req.headers);
  next();
});

// ✅ POST /api/reservas/process-reservation
router.post("/process-reservation", auth, async (req, res) => {
  try {
    console.log("✅ Entrou em process-reservation");
    console.log("📥 user:", req.user);
    console.log("📥 body:", req.body);

    const { mensagem } = req.body;

    if (!mensagem || mensagem.trim().length < 5) {
      return res.status(400).json({
        sucesso: false,
        erro: "Mensagem muito curta"
      });
    }

    console.log("🔍 Fazendo parse...");
    const dados = WhatsAppParser.parse(mensagem);
    console.log("✅ Parse OK:", dados);

    const validacao = WhatsAppParser.validar(dados);
    console.log("✅ Validação:", validacao);

    if (!validacao.valido) {
      return res.status(400).json({
        sucesso: false,
        erro: "Dados incompletos",
        detalhes: validacao.erros
      });
    }

    // ... resto do código
    const [year, month, day] = dados.data.split("-").map(Number);
    const dataBanco = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

    console.log("💾 Salvando no banco...");
    const cliente = await prisma.cliente.create({
      data: {
        nome: dados.nome,
        telefone: dados.telefone,
        data: dataBanco,
        horario: dataBanco,
        numPessoas: dados.numPessoas,
        tipoEvento: dados.tipoEvento || "Texto",
        formaPagamento: "Não definido",
        numMesa: dados.numeroMesa || null,
        observacoes: dados.observacoes,
        empresaId: req.user.empresaId,
        usuarioId: req.user.id,
        confirmado: false,
        status: true
      }
    });

    console.log("✅ Reserva criada:", cliente.id);

    res.status(201).json({
      sucesso: true,
      mensagem: "Reserva criada!",
      reserva: {
        id: cliente.id,
        nome: cliente.nome,
        telefone: cliente.telefone,
        data: cliente.data.toISOString().split('T')[0],
        horario: cliente.horario,
        numPessoas: cliente.numPessoas,
        tipoEvento: cliente.tipoEvento
      }
    });

  } catch (err) {
    console.error("❌ ERRO NO PROCESS-RESERVATION:", err);
    res.status(500).json({ 
      erro: err.message,
      stack: err.stack 
    });
  }
});

// ✅ GET /api/reservas
router.get("/", auth, async (req, res) => {
  try {
    console.log("📥 Listando reservas para empresa:", req.user.empresaId);

    const clientes = await prisma.cliente.findMany({
      where: { 
        empresaId: req.user.empresaId,
        usuarioId: req.user.id
      },
      orderBy: { data: 'desc' }
    });

    res.json({
      sucesso: true,
      total: clientes.length,
      reservas: clientes.map(c => ({
        id: c.id,
        nome: c.nome,
        telefone: c.telefone,
        data: c.data.toISOString().split('T')[0],
        horario: c.horario,
        numPessoas: c.numPessoas,
        tipoEvento: c.tipoEvento,
        numeroMesa: c.numeroMesa,
        observacoes: c.observacoes
      }))
    });
  } catch (err) {
    console.error("❌ ERRO NO GET:", err);
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;