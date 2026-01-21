// routes/calendar.routes.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const auth = require("../middlewares/authMiddleware");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/calendar/data
router.get("/data", auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    const empresaId = req.user.empresaId;
    const m = parseInt(month);
    const y = parseInt(year);

    console.log(`📅 Calendar request: ${m}/${y} - Empresa: ${empresaId}`);

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    const data = await prisma.cliente.findMany({
      where: {
        empresaId,
        status: true,
        data: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    console.log(`✅ Encontradas ${data.length} reservas`);

    const mapa = {};
    data.forEach(r => {
      const dataISO = r.data.toISOString().split('T')[0];
      const hora = new Date(r.horario).getHours();
      
      if (!mapa[dataISO]) {
        mapa[dataISO] = { almoco: 0, jantar: 0 };
      }
      
      if (hora < 18) {
        mapa[dataISO].almoco += r.numPessoas;
      } else {
        mapa[dataISO].jantar += r.numPessoas;
      }
    });

    const totalPax = data.reduce((sum, r) => sum + r.numPessoas, 0);
    const totalRes = data.length;

    res.json({
      mapa,
      totalPax,
      totalRes
    });
  } catch (err) {
    console.error("❌ Erro em /api/calendar/data:", err);
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/calendar/reservas-dia
router.get("/reservas-dia", auth, async (req, res) => {
  try {
    const { data, periodo } = req.query;
    const empresaId = req.user.empresaId;

    const dataDate = new Date(data);
    const startOfDay = new Date(dataDate.getFullYear(), dataDate.getMonth(), dataDate.getDate());
    const endOfDay = new Date(dataDate.getFullYear(), dataDate.getMonth(), dataDate.getDate() + 1);

    let reservas = await prisma.cliente.findMany({
      where: {
        empresaId,
        status: true,
        data: {
          gte: startOfDay,
          lt: endOfDay
        }
      },
      orderBy: { horario: 'asc' }
    });

    if (periodo === "almoco") {
      reservas = reservas.filter(r => {
        const hora = new Date(r.horario).getHours();
        return hora < 18;
      });
    } else if (periodo === "jantar") {
      reservas = reservas.filter(r => {
        const hora = new Date(r.horario).getHours();
        return hora >= 18;
      });
    }

    const totalPax = reservas.reduce((sum, r) => sum + r.numPessoas, 0);

    res.json({
      reservas,
      resumo: {
        total: totalPax,
        quantidade: reservas.length
      }
    });
  } catch (err) {
    console.error("❌ Erro em /api/calendar/reservas-dia:", err);
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;