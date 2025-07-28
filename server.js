// server.js
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middlewares ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- Conexão com o Banco de Dados ---
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Conectado com sucesso."))
  .catch((err) => console.error("Erro na conexão com o MongoDB:", err));

// --- Roteamento da API ---
// <<< MUDANÇA PRINCIPAL AQUI >>>
// Em vez de usar o prefixo "/api/reservas", vamos usar um prefixo mais genérico "/api".
// Isso faz com que a rota "/process-reservation" dentro do seu arquivo de rotas
// seja mapeada para a URL final "/api/process-reservation", que é o que o frontend está chamando.
app.use("/api", require("./routes/reservas"));

// --- Rota "Catch-All" para servir o Frontend ---
// Qualquer requisição GET que não corresponda a uma rota da API acima, servirá o index.html.
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- Iniciar o Servidor ---
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});