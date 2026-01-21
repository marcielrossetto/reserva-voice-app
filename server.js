const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ✅ ROTAS CORRETAS
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/reservas", require("./routes/reservation.routes")); // ← CORRETO
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/calendar", require("./routes/calendar.routes"));

// Fallback para login
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});