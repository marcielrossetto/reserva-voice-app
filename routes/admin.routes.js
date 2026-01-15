const express = require("express");
const prisma = require("../lib/prisma");
const auth = require("../middlewares/authMiddleware");

const router = express.Router();

router.put("/empresa/:id/validade", auth, async (req, res) => {
  if (req.user.nivel !== "master") {
    return res.status(403).json({ message: "Acesso negado" });
  }

  const { id } = req.params;
  const { novaData } = req.body;

  const empresa = await prisma.empresa.update({
    where: { id: Number(id) },
    data: {
      dataExpiracao: new Date(novaData)
    }
  });

  res.json({
    message: "Validade atualizada",
    empresa
  });
});

module.exports = router;
