// models/Reserva.js
const mongoose = require("mongoose");

const ReservaSchema = new mongoose.Schema({
  telefone: { type: String, required: true, trim: true },
  nome: { type: String, required: true, trim: true },
  data: { type: Date, required: true },
  horario: { type: String, required: true, trim: true },
  numPessoas: { type: Number, required: true, min: 1 },
  telefoneAlternativo: { type: String, trim: true },
  formaPagamento: { type: String, trim: true },
  tipoEvento: { type: String, trim: true },
  valorRodizio: { type: String, trim: true },
  numeroMesa: { type: String, trim: true },
  observacoes: { type: String, trim: true },
  criadoEm: { type: Date, default: Date.now },
});

ReservaSchema.index({ data: 1, horario: 1 });
ReservaSchema.index({ nome: "text" });

module.exports = mongoose.model("Reserva", ReservaSchema);
