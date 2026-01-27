const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");

// Middleware de autenticação
const authMiddleware = (req, res, next) => {
  const empresaId = req.headers["x-empresa-id"] || "1";
  console.log("🔐 Auth - empresa_id:", empresaId);
  
  if (!req.session) req.session = {};
  req.session.empresa_id = parseInt(empresaId);
  
  next();
};

/**
 * GET /search
 * Renderiza página de pesquisa com filtros
 */
router.get("/search", authMiddleware, async (req, res) => {
  try {
    const empresaId = req.session.empresa_id;
    const { data_inicio, data_fim, busca, canceladas } = req.query;

    let where = { empresaId: empresaId };

    if (data_inicio && data_fim) {
      where.data = {
        gte: new Date(data_inicio),
        lte: new Date(data_fim),
      };
    }

    if (busca) {
      where.OR = [
        { nome: { contains: busca, mode: "insensitive" } },
        { telefone: { contains: busca, mode: "insensitive" } },
        { id: isNaN(parseInt(busca)) ? undefined : parseInt(busca) },
      ];
    }

    if (canceladas === "1") {
      where.status = false;
      var tituloPagina = "Canceladas";
      var corBadge = "#fee2e2";
      var corTexto = "#991b1b";
    } else {
      where.status = true;
      var tituloPagina = "Ativas";
      var corBadge = "#dbeafe";
      var corTexto = "#1e40af";
    }

    const reservas = await prisma.cliente.findMany({
      where,
      include: {
        empresa: {
          select: { nomeEmpresa: true },
        },
      },
      orderBy: { id: "desc" },
    });

    const totalPessoasResult = await prisma.cliente.aggregate({
      where,
      _sum: { numPessoas: true },
    });

    const totalPessoasFiltro = totalPessoasResult._sum.numPessoas || 0;

    const reservasFormatadas = reservas.map((r) => ({
      ...r,
      nome_empresa: r.empresa?.nomeEmpresa || "N/A",
    }));

    res.render("search", {
      reservas: reservasFormatadas,
      totalPessoasFiltro,
      tituloPagina,
      corBadge,
      corTexto,
      verCanceladas: canceladas === "1",
      data_inicio: data_inicio || "",
      data_fim: data_fim || "",
      busca: busca || "",
    });
  } catch (error) {
    console.error("Erro em GET /search:", error);
    res.status(500).json({ erro: error.message });
  }
});

/**
 * GET /api/reservas/:id
 */
router.get("/api/reservas/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.session.empresa_id;

    const reserva = await prisma.cliente.findFirst({
      where: {
        id: parseInt(id),
        empresaId: empresaId,
      },
      include: {
        empresa: { select: { nomeEmpresa: true } },
      },
    });

    if (!reserva) {
      return res.status(404).json({ erro: "Reserva não encontrada" });
    }

    res.json(reserva);
  } catch (error) {
    console.error("Erro em GET /api/reservas/:id:", error);
    res.status(500).json({ erro: error.message });
  }
});

/**
 * PUT /api/reservas/:id
 */
router.put("/api/reservas/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.session.empresa_id;
    const {
      nome,
      data,
      horario,
      telefone,
      numPessoas,
      numMesa,
      obsCliente,
      observacoes,
    } = req.body;

    const reserva = await prisma.cliente.findFirst({
      where: {
        id: parseInt(id),
        empresaId: empresaId,
      },
    });

    if (!reserva) {
      return res.status(404).json({ erro: "Reserva não encontrada" });
    }

    const atualizada = await prisma.cliente.update({
      where: { id: parseInt(id) },
      data: {
        nome: nome?.trim(),
        data: new Date(data),
        horario,
        telefone: telefone?.replace(/\D/g, ""),
        numPessoas: parseInt(numPessoas),
        numMesa: numMesa?.trim(),
        obsCliente: obsCliente?.trim(),
        observacoes: observacoes?.trim(),
      },
    });

    res.json({ sucesso: true, dados: atualizada });
  } catch (error) {
    console.error("Erro em PUT /api/reservas/:id:", error);
    res.status(500).json({ erro: error.message });
  }
});

/**
 * PUT /api/reservas/:id/obs
 */
router.put("/api/reservas/:id/obs", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.session.empresa_id;
    const { obsCliente } = req.body;

    const reserva = await prisma.cliente.findFirst({
      where: {
        id: parseInt(id),
        empresaId: empresaId,
      },
    });

    if (!reserva) {
      return res.status(404).json({ erro: "Reserva não encontrada" });
    }

    const atualizada = await prisma.cliente.update({
      where: { id: parseInt(id) },
      data: {
        obsCliente: obsCliente?.trim(),
      },
    });

    res.json({ sucesso: true, dados: atualizada });
  } catch (error) {
    console.error("Erro em PUT /api/reservas/:id/obs:", error);
    res.status(500).json({ erro: error.message });
  }
});

/**
 * PUT /api/reservas/:id/cancelar
 */
router.put("/api/reservas/:id/cancelar", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.session.empresa_id;
    const { motivoCancelamento } = req.body;

    const reserva = await prisma.cliente.findFirst({
      where: {
        id: parseInt(id),
        empresaId: empresaId,
      },
    });

    if (!reserva) {
      return res.status(404).json({ erro: "Reserva não encontrada" });
    }

    const atualizada = await prisma.cliente.update({
      where: { id: parseInt(id) },
      data: {
        status: false,
        motivoCancelamento: motivoCancelamento || "Não informado",
      },
    });

    res.json({ sucesso: true, dados: atualizada });
  } catch (error) {
    console.error("Erro em PUT /api/reservas/:id/cancelar:", error);
    res.status(500).json({ erro: error.message });
  }
});

/**
 * PUT /api/reservas/:id/reativar
 */
router.put("/api/reservas/:id/reativar", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.session.empresa_id;

    const reserva = await prisma.cliente.findFirst({
      where: {
        id: parseInt(id),
        empresaId: empresaId,
      },
    });

    if (!reserva) {
      return res.status(404).json({ erro: "Reserva não encontrada" });
    }

    const atualizada = await prisma.cliente.update({
      where: { id: parseInt(id) },
      data: {
        status: true,
        motivoCancelamento: null,
      },
    });

    res.json({ sucesso: true, dados: atualizada });
  } catch (error) {
    console.error("Erro em PUT /api/reservas/:id/reativar:", error);
    res.status(500).json({ erro: error.message });
  }
});

module.exports = router;