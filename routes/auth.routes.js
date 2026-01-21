const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: { empresa: true }
    });

    if (!usuario) {
      return res.status(401).json({ message: "Usuário não encontrado" });
    }

    const senhaOk = await bcrypt.compare(senha, usuario.senha);
    if (!senhaOk) {
      return res.status(401).json({ message: "Senha inválida" });
    }

    const token = jwt.sign(
      {
        userId: usuario.id,
        empresaId: usuario.empresaId,
        nivel: usuario.nivel
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      user: {
        nome: usuario.nome,
        email: usuario.email,
        nivel: usuario.nivel
      }
    });
  } catch (err) {
    console.error("❌ ERRO LOGIN:", err);
    res.status(500).json({ message: "Erro interno" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { email, senha, nome } = req.body;

    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe) {
      return res.status(400).json({ message: "Email já cadastrado" });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    // Criar empresa padrão
    const empresa = await prisma.empresa.create({
      data: {
        nomeEmpresa: nome,
        dataInicioTeste: new Date(),
        dataExpiracao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
        statusPagamento: 0
      }
    });

    const usuario = await prisma.usuario.create({
      data: {
        email,
        senha: senhaHash,
        nome,
        nivel: "admin",
        empresaId: empresa.id
      }
    });

    const token = jwt.sign(
      { userId: usuario.id, empresaId: usuario.empresaId, nivel: usuario.nivel },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      user: { nome: usuario.nome, email: usuario.email, nivel: usuario.nivel }
    });
  } catch (err) {
    console.error("❌ ERRO REGISTER:", err);
    res.status(500).json({ message: "Erro ao cadastrar" });
  }
});

module.exports = router;