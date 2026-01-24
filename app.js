const express = require("express");
const cors = require("cors");
const path = require("node:path"); // SonarLint: node:path
require("dotenv").config();

const app = express();

// Caminhos úteis para evitar repetição e erros de digitação
const PATHS = {
    public: path.join(__dirname, "public"),
    html: path.join(__dirname, "public", "html")
};

/**
 * ==========================================================================
 * 1. MIDDLEWARES GLOBAIS
 * ==========================================================================
 */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * ==========================================================================
 * 2. ARQUIVOS ESTÁTICOS
 * ==========================================================================
 * Define a pasta raiz de assets. O navegador buscará /css/ ou /js/ aqui.
 */
app.use(express.static(PATHS.public));

/**
 * ==========================================================================
 * 3. ROTAS DA API
 * ==========================================================================
 */
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/reservations", require("./routes/reservation.routes"));
app.use("/api/calendar", require("./routes/calendar.routes"));
app.use("/api/admin", require("./routes/admin.routes"));

// Health Check com monitoramento básico
app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "Server is running",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development"
    });
});

/**
 * ==========================================================================
 * 4. TRATAMENTO DE ASSETS E FALLBACK (SPA)
 * ==========================================================================
 */

// PROTEÇÃO CRÍTICA: Se o navegador pedir um arquivo (ex: .js, .css) que não 
// existe fisicamente, o Express NÃO deve enviar o index.html (que gera erro de sintaxe)
app.use(['/js', '/css', '/assets'], (req, res) => {
    res.status(404).send("Static resource not found");
});

app.get("*", (req, res) => {
    // 1. Se for uma rota de API inexistente, retorna JSON 404 em vez de HTML
    if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ success: false, error: "API Route not found" });
    }

    // 2. Se o usuário tentar acessar o login diretamente pela URL
    if (req.path.includes("login.html")) {
        return res.sendFile(path.join(PATHS.html, "login.html"));
    }

    // 3. Fallback padrão para a página principal (SPA)
    // Como os arquivos estão em public/html/, enviamos o index.html de lá
    res.sendFile(path.join(PATHS.html, "index.html"));
});

/**
 * ==========================================================================
 * 5. TRATAMENTO GLOBAL DE ERROS
 * ==========================================================================
 */
app.use((err, req, res, next) => {
    const statusCode = err.status || 500;
    const message = err.message || "Internal Server Error";

    console.error(`❌ [Error ${statusCode}]: ${message}`);

    res.status(statusCode).json({
        success: false,
        error: message,
        // Exibe o stack trace apenas se estiver em ambiente de desenvolvimento
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
});

module.exports = app;