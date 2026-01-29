/**
 * server.js - Iniciar o servidor com WebSocket
 * Local: Raiz do projeto
 */

require("dotenv").config();
const app = require("./app");
const http = require('http');
const { inicializarWebSocket } = require("./routes/websocket");

const PORT = process.env.PORT || 3001;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

// ========================= ENCONTRAR PORTA LIVRE =========================

function findFreePort(startPort) {
  return new Promise((resolve, reject) => {
    const testServer = http.createServer();
    
    testServer.listen(startPort, HOST, () => {
      const port = testServer.address().port;
      testServer.close();
      resolve(port);
    });
    
    testServer.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Porta ocupada, tenta a próxima
        console.warn(`⚠️  Porta ${startPort} ocupada, tentando ${startPort + 1}...`);
        resolve(findFreePort(startPort + 1));
      } else {
        reject(err);
      }
    });
  });
}

// ========================= INICIAR SERVIDOR =========================

findFreePort(PORT).then(freePort => {
  // ✅ CRIAR SERVIDOR HTTP
  const server = http.createServer(app);

  // ✅ INICIALIZAR WEBSOCKET
  const wss = inicializarWebSocket(server);
  console.log("✅ WebSocket inicializado");

  // ✅ INICIAR SERVIDOR NA PORTA
  server.listen(freePort, HOST, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  🚀 SERVIDOR RODANDO COM SUCESSO                         ║
║                                                            ║
║  📍 URL: http://${HOST}:${freePort}                       ║
║  🔌 Porta: ${freePort}                                     ║
║  🔌 WebSocket: ws://${HOST}:${freePort}/api/calendar/ws   ║
║  ⏰ Horário: ${new Date().toLocaleTimeString("pt-BR")}    ║
║  🌍 Ambiente: ${process.env.NODE_ENV || "development"}   ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);

    console.log("📚 Rotas disponíveis:");
    console.log("  ✅ GET    /search                        - Página de pesquisa");
    console.log("  ✅ GET    /api/reservas/:id              - Obter reserva");
    console.log("  ✅ PUT    /api/reservas/:id              - Atualizar reserva");
    console.log("  ✅ PUT    /api/reservas/:id/obs          - Atualizar observação");
    console.log("  ✅ PUT    /api/reservas/:id/cancelar     - Cancelar reserva");
    console.log("  ✅ PUT    /api/reservas/:id/reativar     - Reativar reserva");
    console.log("  ✅ POST   /api/auth/login                - Login");
    console.log("  ✅ GET    /api/health                    - Health check");
    console.log("  ✅ WS     /api/calendar/ws               - WebSocket (tempo real)");
    console.log("");
    console.log("💾 Pressione Ctrl+C para parar o servidor\n");

    // Exportar wss para uso em rotas
    app.locals.wss = wss;
  });

  // ========================= GRACEFUL SHUTDOWN =========================

  process.on("SIGINT", () => {
    console.log("\n\n⚠️  Encerrando servidor...");
    
    // Fechar WebSocket primeiro
    console.log("🔌 Fechando WebSocket...");
    wss.clients.forEach((client) => {
      client.close();
    });
    
    // Depois o servidor HTTP
    server.close(() => {
      console.log("✅ Servidor parado com sucesso");
      process.exit(0);
    });

    // Forçar saída após 10 segundos
    setTimeout(() => {
      console.error("❌ Timeout ao encerrar servidor");
      process.exit(1);
    }, 10000);
  });

  process.on("SIGTERM", () => {
    console.log("\n\n⚠️  Encerrando servidor (SIGTERM)...");
    
    // Fechar WebSocket
    console.log("🔌 Fechando WebSocket...");
    wss.clients.forEach((client) => {
      client.close();
    });
    
    // Depois o servidor
    server.close(() => {
      console.log("✅ Servidor parado");
      process.exit(0);
    });

    setTimeout(() => {
      console.error("❌ Timeout ao encerrar servidor");
      process.exit(1);
    }, 10000);
  });

}).catch(err => {
  console.error("❌ Erro ao iniciar servidor:", err);
  process.exit(1);
});

// ========================= ERROR HANDLING =========================

process.on("uncaughtException", (err) => {
  console.error("❌ Erro não capturado:", err);
  console.error(err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Promise rejeitada não tratada:");
  console.error("Promise:", promise);
  console.error("Razão:", reason);
  process.exit(1);
});

// ========================= LOG DE PROCESSAMENTO =========================

console.log("📦 Carregando módulos...");
console.log("  ✅ Express");
console.log("  ✅ HTTP");
console.log("  ✅ WebSocket");
console.log("");