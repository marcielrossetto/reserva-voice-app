/**
 * server.js - Iniciar o servidor
 * Local: Raiz do projeto
 */

require("dotenv").config();
const app = require("./app");

//const PORT = process.env.PORT || 3001;
//const HOST = process.env.HOST || "localhost";
const PORT = process.env.PORT || 3001;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

app.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
});
// ========================= INICIAR SERVIDOR =========================

const server = app.listen(PORT, HOST, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  🚀 SERVIDOR RODANDO COM SUCESSO                         ║
║                                                            ║
║  📍 URL: http://${HOST}:${PORT}                           ║
║  🔌 Porta: ${PORT}                                         ║
║  ⏰ Horário: ${new Date().toLocaleTimeString("pt-BR")}     ║
║  🌍 Ambiente: ${process.env.NODE_ENV || "development"}    ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);

  console.log("📚 Rotas disponíveis:");
  console.log("  ✅ POST   /api/auth/login");
  console.log("  ✅ POST   /api/reservas/process-reservation");
  console.log("  ✅ GET    /api/reservas");
  console.log("  ✅ GET    /api/health");
  console.log("");
  console.log("💾 Pressione Ctrl+C para parar o servidor\n");
});

// ========================= GRACEFUL SHUTDOWN =========================

process.on("SIGINT", () => {
  console.log("\n\n⚠️  Encerrando servidor...");
  server.close(() => {
    console.log("✅ Servidor parado com sucesso");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("\n\n⚠️  Encerrando servidor (SIGTERM)...");
  server.close(() => {
    console.log("✅ Servidor parado");
    process.exit(0);
  });
});

// ========================= ERROR HANDLING =========================

process.on("uncaughtException", (err) => {
  console.error("❌ Erro não capturado:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Promise rejeitada não tratada:", reason);
  process.exit(1);
});