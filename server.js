/**
 * server.js - Iniciar o servidor
 * Local: Raiz do projeto
 */

require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 3001;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

// ========================= INICIAR SERVIDOR =========================

// Função para encontrar porta livre
function findFreePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = require('http').createServer();
    
    server.listen(startPort, HOST, () => {
      const port = server.address().port;
      server.close();
      resolve(port);
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Porta ocupada, tenta a próxima
        resolve(findFreePort(startPort + 1));
      } else {
        reject(err);
      }
    });
  });
}

// Inicia servidor na primeira porta livre
findFreePort(PORT).then(freePort => {
  const server = app.listen(freePort, HOST, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  🚀 SERVIDOR RODANDO COM SUCESSO                         ║
║                                                            ║
║  📍 URL: http://${HOST}:${freePort}                       ║
║  🔌 Porta: ${freePort}                                     ║
║  ⏰ Horário: ${new Date().toLocaleTimeString("pt-BR")}     ║
║  🌍 Ambiente: ${process.env.NODE_ENV || "development"}    ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);

    console.log("📚 Rotas disponíveis:");
    console.log("  ✅ GET    /search                    - Página de pesquisa");
    console.log("  ✅ GET    /api/reservas/:id          - Obter reserva");
    console.log("  ✅ PUT    /api/reservas/:id          - Atualizar reserva");
    console.log("  ✅ PUT    /api/reservas/:id/obs      - Atualizar observação");
    console.log("  ✅ PUT    /api/reservas/:id/cancelar - Cancelar reserva");
    console.log("  ✅ PUT    /api/reservas/:id/reativar - Reativar reserva");
    console.log("  ✅ POST   /api/auth/login             - Login");
    console.log("  ✅ GET    /api/health                 - Health check");
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
}).catch(err => {
  console.error("❌ Erro ao iniciar servidor:", err);
  process.exit(1);
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