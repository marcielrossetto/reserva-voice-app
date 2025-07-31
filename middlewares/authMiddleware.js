const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "chave-secreta-super-segura";

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Token não fornecido. Faça login primeiro." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido ou expirado." });
  }
}

module.exports = authMiddleware;
