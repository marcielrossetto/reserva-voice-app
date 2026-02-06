const express = require("express");
const cors = require("cors");
const path = require("node:path");
const fs = require("node:fs");
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const logoRoutes = require('./routes/empresa-logo');
require("dotenv").config();

const app = express();

const PATHS = {
    public: path.join(__dirname, "public"),
    html: path.join(__dirname, "public", "html"),
    views: path.join(__dirname, "public", "html")
};

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', PATHS.views);

app.use(express.static(PATHS.public));

/**
 * ROTAS DA API
 */
// Permite acessar as imagens via URL (ex: http://localhost:3001/uploads/logos/1/logo.png)
app.use('/api/usuario', require('./routes/usuario.routes'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/empresa', logoRoutes);
app.use('/api/auth', authRoutes);  // ✅ ÚNICA ROTA AUTH
app.use('/api', apiRoutes);
app.use("/api/fila", require("./routes/fila.routes"));
app.use("/api/reservations", require("./routes/reservation.routes"));
app.use("/api/reservationQuery", require("./routes/reservationQuery.routes"));
app.use("/api/calendar", require("./routes/calendar.routes"));
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/dashboard", require("./routes/dashboard.routes"));
app.use("/api/relatorio-fila", require("./routes/relatorio-fila.routes"));
app.use("/api/cardapio", require("./routes/cardapio.routes"));

app.use("/", require("./routes/search"));

app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "Server is running",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development"
    });
});

/**
 * ROTAS DE PÁGINAS
 */
app.get("/reservationQuery", (req, res) => {
    res.render("reservationQuery");
});


// app.js
app.get("/stats", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "html", "stats.html"));
});
// No seu app.js (raiz), adicione esta rota antes do fallback (*)
app.get("/dashboard", (req, res) => {
    // Certifique-se que o nome do arquivo na pasta public/html é dashboard.html
    res.sendFile(path.join(__dirname, "public", "html", "dashboard.html"));
});
// app.js
app.get("/support", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "html", "support.html"));
});
// app.js

app.get("/privacy", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "html", "privacy.html"));
});

// Cardápio público (sem login) - rota amigável para QR Code
app.get("/cardapio/:empresaId", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "html", "cardapio-publico.html"));
});
/**
 * TRATAMENTO DE ASSETS E FALLBACK
 */
app.use(['/js', '/css', '/assets'], (req, res) => {
    res.status(404).send("Static resource not found");
});

app.get("*", (req, res) => {
    if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ success: false, error: "API Route not found" });
    }

    if (req.path.endsWith('.html')) {
        // 1. Tenta em public/ (ex: /html/index.html → public/html/index.html)
        const inPublic = path.join(PATHS.public, req.path);
        if (fs.existsSync(inPublic)) {
            return res.sendFile(inPublic);
        }

        // 2. Tenta em public/html/ (ex: /login.html → public/html/login.html)
        const inHtml = path.join(PATHS.html, path.basename(req.path));
        if (fs.existsSync(inHtml)) {
            return res.sendFile(inHtml);
        }
    }

    // Fallback: index.html
    res.sendFile(path.join(PATHS.html, "index.html"));
});

/**
 * TRATAMENTO GLOBAL DE ERROS
 */
app.use((err, req, res, next) => {
    const statusCode = err.status || 500;
    const message = err.message || "Internal Server Error";

    console.error(`❌ [Error ${statusCode}]: ${message}`);

    res.status(statusCode).json({
        success: false,
        error: message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
});

module.exports = app;