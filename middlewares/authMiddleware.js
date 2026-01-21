const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

// middlewares/authMiddleware.js

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Token não fornecido" });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Token validado:", decoded);

    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      include: { empresa: true }
    });

    if (!usuario) {
      console.log("❌ Usuário não encontrado:", decoded.userId);
      return res.status(401).json({ message: "Usuário não encontrado" });
    }

    console.log("✅ Usuário autenticado:", usuario.nome);

    req.user = {
      id: usuario.id,
      nome: usuario.nome,
      nivel: usuario.nivel,
      empresaId: usuario.empresaId
    };

    next();
  } catch (err) {
    console.log("❌ Token inválido:", err.message);
    return res.status(401).json({ message: "Token inválido" });
  }
};