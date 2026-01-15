const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Token não fornecido" });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      include: { empresa: true }
    });

    if (!usuario) {
      return res.status(401).json({ message: "Usuário não encontrado" });
    }

    req.user = {
      id: usuario.id,
      nome: usuario.nome,
      nivel: usuario.nivel,
      empresaId: usuario.empresaId
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Token inválido" });
  }
};
