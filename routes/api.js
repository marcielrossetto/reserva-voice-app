const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");

/**
 * GET /api/user-info
 * Retorna informações do usuário logado
 */
router.get("/user-info", async (req, res) => {
  try {
    // Se você usar sessão, pegue do req.session
    // Se usar JWT, decodifique do token
    
    // Opção 1: Do localStorage (frontend envia empresa_id via header)
    const empresaId = req.headers["x-empresa-id"] || "1";
    
    // Opção 2: Do session (se estiver usando)
    if (req.session && req.session.userId) {
      const usuario = await prisma.login.findUnique({
        where: { id: req.session.userId },
        select: { id: true, nome: true, email: true, nomeEmpresa: true },
      });
      
      if (usuario) {
        return res.json({
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          empresa: usuario.nomeEmpresa,
        });
      }
    }
    
    // Fallback: retorna genérico
    res.json({
      id: 1,
      nome: "Usuário",
      email: "user@example.com",
      empresa: "Restaurante",
    });
  } catch (error) {
    console.error("Erro em GET /api/user-info:", error);
    res.status(500).json({ erro: error.message });
  }
});

/**
 * POST /api/logout
 * Faz logout do usuário
 */
router.post("/logout", (req, res) => {
  try {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error("Erro ao destruir sessão:", err);
          return res.status(500).json({ erro: "Erro ao fazer logout" });
        }
        res.clearCookie("connect.sid");
        res.json({ sucesso: true });
      });
    } else {
      res.json({ sucesso: true });
    }
  } catch (error) {
    console.error("Erro em POST /api/logout:", error);
    res.status(500).json({ erro: error.message });
  }
});

module.exports = router;