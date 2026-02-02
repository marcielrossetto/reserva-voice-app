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
    console.log("✅ Token validado:", decoded);

    // ✅ BUSCAR EMPRESA (não usuario)
    const empresa = await prisma.empresa.findUnique({
      where: { id: decoded.empresaId }
    });

    if (!empresa) {
      console.log("❌ Empresa não encontrada:", decoded.empresaId);
      return res.status(401).json({ message: "Empresa não encontrada" });
    }

    console.log("✅ Empresa autenticada:", empresa.nomeEmpresa);

    req.user = {
      id: decoded.id,
      nomeEmpresa: empresa.nomeEmpresa,
      email: decoded.email,
      empresaId: empresa.id,
      nivel: decoded.nivel
    };

    next();
  } catch (err) {
    console.log("❌ Token inválido:", err.message);
    return res.status(401).json({ message: "Token inválido" });
  }
};