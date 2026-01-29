/**
 * middlewares/authMiddleware.js - CORRIGIDO PARA EMPRESA
 */

const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

async function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ erro: 'Token não fornecido', redirect: true });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Token validado:", decoded);

    // ✅ BUSCAR EMPRESA (não usuario)
    const empresa = await prisma.empresa.findUnique({
      where: { id: decoded.empresaId }
    });

    if (!empresa) {
      return res.status(401).json({ erro: 'Empresa não encontrada', redirect: true });
    }

    // ✅ Salvar empresa no request
    req.user = empresa;
    req.empresaId = empresa.id;
    
    next();
  } catch (error) {
    console.error('❌ Erro auth:', error.message);
    res.status(401).json({ erro: 'Token inválido', redirect: true });
  }
}

module.exports = authMiddleware;