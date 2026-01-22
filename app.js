/**
 * app.js - Configuração Express
 * Local: Raiz do projeto
 * 
 * Este arquivo configura todas as rotas e middlewares
 */

const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// ========================= MIDDLEWARES =========================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos (CSS, JS, HTML)
app.use(express.static(path.join(__dirname, "public")));

// ========================= ROTAS =========================

// ✅ Autenticação
app.use("/api/auth", require("./routes/auth.routes"));

// ✅ Reservas (PRINCIPAL)
app.use("/api/reservas", require("./routes/reservations.routes.js"));

// ✅ Calendário
app.use("/api/calendar", require("./routes/calendar.routes"));

// ✅ Admin (se houver)
app.use("/api/admin", require("./routes/admin.routes"));

// ========================= HEALTH CHECK =========================

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Servidor rodando" });
});

// ========================= FALLBACK PARA LOGIN =========================

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// ========================= ERROR HANDLING =========================

app.use((err, req, res, next) => {
  console.error("❌ Erro:", err);
  res.status(err.status || 500).json({
    sucesso: false,
    erro: err.message || "Erro interno do servidor"
  });
});

module.exports = app;

/**
 * DOCUMENTAÇÃO DAS ROTAS:
 * 
 * POST   /api/auth/login              - Login do usuário
 * POST   /api/auth/logout             - Logout
 * 
 * POST   /api/reservas/process-reservation  - Processar WhatsApp
 * POST   /api/reservas                      - Salvar reserva manual
 * GET    /api/reservas                      - Listar reservas
 * GET    /api/reservas/perfil/:telefone     - Buscar perfil cliente
 * PUT    /api/reservas/:id                  - Atualizar reserva
 * DELETE /api/reservas/:id                  - Deletar reserva
 * 
 * GET    /api/calendar                      - Dados calendário
 * 
 * GET    /api/health                        - Health check
 */