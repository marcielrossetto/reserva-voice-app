const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ✅ Rotas
app.use("/api/auth", require("./routes/auth"));  // ROTAS DE LOGIN/CADASTRO
app.use("/api", require("./routes/reservas"));   // ROTAS DE RESERVAS

// Rota para frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB conectado"))
  .catch(err => console.error("Erro MongoDB:", err));

app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
