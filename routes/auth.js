const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "chave-secreta-super-segura";

// Cadastro
router.post("/register", async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ message: "Todos os campos são obrigatórios." });
    }

    const userExist = await User.findOne({ email });
    if (userExist) return res.status(400).json({ message: "E-mail já cadastrado." });

    const hashedPassword = await bcrypt.hash(senha, 10);
    const newUser = new User({ nome, email, senha: hashedPassword });
    await newUser.save();

    return res.status(201).json({ message: "Usuário cadastrado com sucesso!" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao cadastrar usuário." });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Usuário não encontrado." });

    const isMatch = await bcrypt.compare(senha, user.senha);
    if (!isMatch) return res.status(401).json({ message: "Senha inválida." });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1d" });

    return res.json({ message: "Login bem-sucedido!", token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao fazer login." });
  }
});

module.exports = router;
