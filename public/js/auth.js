/**
 * routes/auth.js
 * 
 * Sistema de autenticação COMPLETO:
 * - Login com email/senha + PIN por email (2FA)
 * - Registrar usuário e criar empresa
 * - Recuperar senha com PIN
 * - Redefinir senha
 */

const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const JWT_SECRET = process.env.JWT_SECRET || "sua-chave-super-secreta-aqui";
const SALT_ROUNDS = 10;

// ========== CONFIGURAR EMAIL ==========

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "seu-email@gmail.com",
    pass: process.env.EMAIL_PASSWORD || "sua-senha-app",
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Erro na conexão de email:", error);
  } else {
    console.log("✅ Email configurado com sucesso!");
  }
});

// ========== FUNÇÕES UTILITÁRIAS ==========

function gerarPin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function validarForcaSenha(senha) {
  const requisitos = {
    maiuscula: /[A-Z]/.test(senha),
    minuscula: /[a-z]/.test(senha),
    numero: /[0-9]/.test(senha),
    especial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha),
    comprimento: senha.length >= 8,
  };

  return {
    valida: Object.values(requisitos).every(Boolean),
    requisitos,
  };
}

function gerarToken(usuario) {
  return jwt.sign(
    {
      userId: usuario.id,
      email: usuario.email,
      empresaId: usuario.empresaId,
      nivel: usuario.nivel,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function verificarToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ erro: "Token não fornecido", redirect: true });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    res.status(401).json({ erro: "Token inválido ou expirado", redirect: true });
  }
}

async function enviarPinEmail(email, pin, tipo = "login") {
  const assunto =
    tipo === "login"
      ? "🔐 Código de Verificação - Reserva Voice"
      : "🔑 Código para Redefinir Senha - Reserva Voice";

  const html =
    tipo === "login"
      ? `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #667eea;">Código de Verificação</h2>
      <p>Você solicitou fazer login em sua conta.</p>
      <p>Use o código abaixo para continuar:</p>
      <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; text-align: center;">
        <h1 style="color: #667eea; letter-spacing: 5px; margin: 0;">${pin}</h1>
      </div>
      <p><strong>⏰ Este código expira em 10 minutos</strong></p>
      <p style="color: #999; font-size: 12px;">
        Se não solicitou este código, ignore este email.
      </p>
    </div>
  `
      : `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #667eea;">Redefinir Senha</h2>
      <p>Você solicitou redefinir sua senha.</p>
      <p>Use o código abaixo para criar uma nova senha:</p>
      <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; text-align: center;">
        <h1 style="color: #667eea; letter-spacing: 5px; margin: 0;">${pin}</h1>
      </div>
      <p><strong>⏰ Este código expira em 15 minutos</strong></p>
      <p style="color: #999; font-size: 12px;">
        Se não solicitou este código, ignore este email.
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER || "seu-email@gmail.com",
      to: email,
      subject: assunto,
      html: html,
    });

    console.log(`✅ Email enviado para ${email}`);
    return true;
  } catch (error) {
    console.error("❌ Erro ao enviar email:", error);
    return false;
  }
}

// ========== ROTAS DE AUTENTICAÇÃO ==========

/**
 * POST /api/auth/login
 * Login com email/senha → envia PIN por email
 */
router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: "Email e senha obrigatórios" });
    }

    const usuario = await prisma.usuario.findFirst({
      where: { email: email.toLowerCase() },
      include: { empresa: true },
    });

    if (!usuario) {
      return res.status(401).json({ erro: "Email ou senha incorretos" });
    }

    if (!usuario.status) {
      return res.status(403).json({ erro: "Usuário desativado" });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ erro: "Email ou senha incorretos" });
    }

    if (
      usuario.empresa.dataExpiracao &&
      new Date() > new Date(usuario.empresa.dataExpiracao)
    ) {
      return res.status(403).json({
        erro: "Assinatura expirada. Renove para continuar.",
      });
    }

    const pin = gerarPin();
    const pinExpiracao = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        pinVerificacao: pin,
        pinExpiracao,
      },
    });

    const emailEnviado = await enviarPinEmail(usuario.email, pin, "login");

    if (!emailEnviado) {
      return res.status(500).json({ erro: "Erro ao enviar email" });
    }

    console.log(`✅ Login iniciado: ${usuario.email}`);

    res.json({
      sucesso: true,
      mensagem: `✅ PIN enviado para ${usuario.email}`,
      usuarioId: usuario.id,
      email: usuario.email,
    });
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    res.status(500).json({ erro: error.message });
  }
});

/**
 * POST /api/auth/verificar-pin
 * Verifica PIN e retorna token
 */
router.post("/verificar-pin", async (req, res) => {
  try {
    const { usuarioId, pin } = req.body;

    if (!usuarioId || !pin) {
      return res.status(400).json({ erro: "Usuário e PIN obrigatórios" });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { empresa: true },
    });

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    if (!usuario.pinVerificacao || usuario.pinVerificacao !== pin) {
      return res.status(401).json({ erro: "PIN incorreto" });
    }

    if (new Date() > new Date(usuario.pinExpiracao)) {
      return res.status(401).json({ erro: "PIN expirado" });
    }

    const token = gerarToken(usuario);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        pinVerificacao: null,
        pinExpiracao: null,
        ultimoAcesso: new Date(),
      },
    });

    console.log(`✅ PIN verificado: ${usuario.email}`);

    res.json({
      sucesso: true,
      mensagem: "Autenticado com sucesso!",
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        nivel: usuario.nivel,
        empresaId: usuario.empresaId,
      },
    });
  } catch (error) {
    console.error("Erro ao verificar PIN:", error);
    res.status(500).json({ erro: error.message });
  }
});

/**
 * POST /api/auth/registrar
 * Registra novo usuário MASTER
 */
router.post("/registrar", async (req, res) => {
  try {
    const { email, senha, empresaId } = req.body;

    if (!email || !senha || !empresaId) {
      return res.status(400).json({ erro: "Dados incompletos" });
    }

    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
    });

    if (!empresa) {
      return res.status(404).json({ erro: "Empresa não encontrada" });
    }

    if (
      empresa.dataExpiracao &&
      new Date() > new Date(empresa.dataExpiracao)
    ) {
      return res
        .status(403)
        .json({ erro: "Assinatura expirada. Renove para usar." });
    }

    const usuarioExistente = await prisma.usuario.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (usuarioExistente) {
      return res.status(400).json({ erro: "Email já cadastrado" });
    }

    const validacao = validarForcaSenha(senha);
    if (!validacao.valida) {
      return res.status(400).json({
        erro: "Senha fraca",
        requisitos: validacao.requisitos,
      });
    }

    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

    const usuario = await prisma.usuario.create({
      data: {
        email: email.toLowerCase(),
        senha: senhaHash,
        nome: email.split("@")[0],
        empresaId,
        nivel: "master",
        status: true,
      },
    });

    const token = gerarToken(usuario);

    console.log(`✅ Usuário criado: ${usuario.email}`);

    res.json({
      sucesso: true,
      mensagem: "Usuário criado com sucesso!",
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        nivel: usuario.nivel,
        empresaId: usuario.empresaId,
      },
    });
  } catch (error) {
    console.error("Erro ao registrar:", error);
    res.status(500).json({ erro: error.message });
  }
});

/**
 * POST /api/auth/criar-empresa
 * Cria empresa com trial de 7 dias
 */
router.post("/criar-empresa", async (req, res) => {
  try {
    const { nomeEmpresa } = req.body;

    if (!nomeEmpresa || nomeEmpresa.trim().length < 3) {
      return res.status(400).json({ erro: "Nome da empresa inválido" });
    }

    const empresaExistente = await prisma.empresa.findFirst({
      where: { nomeEmpresa: nomeEmpresa.trim() },
    });

    if (empresaExistente) {
      return res.status(400).json({ erro: "Empresa já cadastrada" });
    }

    const dataExpiracao = new Date();
    dataExpiracao.setDate(dataExpiracao.getDate() + 7);

    const empresa = await prisma.empresa.create({
      data: {
        nomeEmpresa: nomeEmpresa.trim(),
        dataExpiracao,
        status: "trial",
      },
    });

    console.log(`✅ Empresa criada: ${empresa.nomeEmpresa}`);

    res.json({
      sucesso: true,
      mensagem: "Empresa criada com sucesso! Trial de 7 dias ativado.",
      empresa: {
        id: empresa.id,
        nome: empresa.nomeEmpresa,
        dataExpiracao: empresa.dataExpiracao,
      },
    });
  } catch (error) {
    console.error("Erro ao criar empresa:", error);
    res.status(500).json({ erro: error.message });
  }
});

/**
 * POST /api/auth/recuperar-senha
 * Inicia recuperação → envia PIN por email
 */
router.post("/recuperar-senha", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ erro: "Email obrigatório" });
    }

    const usuario = await prisma.usuario.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (!usuario) {
      return res.json({
        sucesso: true,
        mensagem:
          "Se o email existe, você receberá um código de recuperação",
      });
    }

    const pin = gerarPin();
    const pinExpiracao = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        pinRecuperacao: pin,
        pinExpiracao,
      },
    });

    const emailEnviado = await enviarPinEmail(
      usuario.email,
      pin,
      "recuperar"
    );

    if (!emailEnviado) {
      return res.status(500).json({ erro: "Erro ao enviar email" });
    }

    console.log(`🔑 PIN de recuperação enviado para ${usuario.email}`);

    res.json({
      sucesso: true,
      mensagem: "Se o email existe, você receberá um código de recuperação",
      usuarioId: usuario.id,
    });
  } catch (error) {
    console.error("Erro ao recuperar senha:", error);
    res.status(500).json({ erro: error.message });
  }
});

/**
 * POST /api/auth/redefinir-senha
 */
router.post("/redefinir-senha", async (req, res) => {
  try {
    const { usuarioId, pin, novaSenha } = req.body;

    if (!usuarioId || !pin || !novaSenha) {
      return res.status(400).json({ erro: "Dados incompletos" });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    if (!usuario.pinRecuperacao || usuario.pinRecuperacao !== pin) {
      return res.status(401).json({ erro: "PIN incorreto" });
    }

    if (new Date() > new Date(usuario.pinExpiracao)) {
      return res.status(401).json({ erro: "PIN expirado" });
    }

    const validacao = validarForcaSenha(novaSenha);
    if (!validacao.valida) {
      return res.status(400).json({
        erro: "Senha fraca",
        requisitos: validacao.requisitos,
      });
    }

    const senhaHash = await bcrypt.hash(novaSenha, SALT_ROUNDS);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        senha: senhaHash,
        pinRecuperacao: null,
        pinExpiracao: null,
      },
    });

    console.log(`✅ Senha redefinida: ${usuario.email}`);

    res.json({
      sucesso: true,
      mensagem: "Senha redefinida! Faça login com a nova senha.",
    });
  } catch (error) {
    console.error("Erro ao redefinir senha:", error);
    res.status(500).json({ erro: error.message });
  }
});

/**
 * GET /api/auth/me
 * Retorna dados do usuário logado
 */
router.get("/me", verificarToken, async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.userId },
      include: { empresa: true },
    });

    res.json({
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        nivel: usuario.nivel,
        empresaId: usuario.empresaId,
        empresa: usuario.empresa.nomeEmpresa,
      },
    });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

/**
 * POST /api/auth/logout
 */
router.post("/logout", verificarToken, (req, res) => {
  res.json({ sucesso: true, mensagem: "Logout realizado" });
});

module.exports = router;
module.exports.verificarToken = verificarToken;
module.exports.validarForcaSenha = validarForcaSenha;