const express = require("express");
const cors = require("cors");
const path = require("node:path");
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
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
app.use('/api/auth', authRoutes);  // ✅ ÚNICA ROTA AUTH
app.use('/api', apiRoutes);
app.use("/api/fila", require("./routes/fila.routes"));
app.use("/api/reservations", require("./routes/reservation.routes"));
app.use("/api/reservationQuery", require("./routes/reservationQuery.routes"));
app.use("/api/calendar", require("./routes/calendar.routes"));
app.use("/api/admin", require("./routes/admin.routes"));

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

    if (req.path.includes("login.html")) {
        return res.sendFile(path.join(PATHS.html, "login.html"));
    }

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