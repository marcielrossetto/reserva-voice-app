const prisma = require("../lib/prisma");

module.exports = async (req, res, next) => {
  const { empresaId, nivel } = req.user;

  // MASTER sempre passa
  if (nivel === "master") return next();

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId }
  });

  if (!empresa) {
    return res.status(403).json({ message: "Empresa não encontrada" });
  }

  if (empresa.dataExpiracao < new Date()) {
    return res.status(403).json({
      message: "Período de teste expirado. Entre em contato para renovar."
    });
  }

  next();
};
