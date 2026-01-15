const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    const user = await prisma.usuario.findUnique({
      where: { email },
      include: { empresa: true }
    });

    if (!user) {
      return res.status(401).json({ message: "Usuário não encontrado" });
    }

    const senhaOk = await bcrypt.compare(senha, user.senha);
    if (!senhaOk) {
      return res.status(401).json({ message: "Senha inválida" });
    }

    // 🔒 Verifica validade da empresa
    if (
      user.empresa?.dataExpiracao &&
      new Date(user.empresa.dataExpiracao) < new Date()
    ) {
      return res.status(403).json({
        message: "Período de teste expirado. Entre em contato com o suporte."
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        empresaId: user.empresaId,
        nivel: user.nivel
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      user: {
        nome: user.nome,
        email: user.email,
        nivel: user.nivel
      }
    });
  } catch (err) {
    console.error("❌ ERRO LOGIN:", err);
    res.status(500).json({ message: "Erro interno no login" });
  }
});

module.exports = router;
