const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuração de armazenamento em DISCO
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const empresaId = req.params.empresaId;
    const dir = `./uploads/logos/${empresaId}`;
    
    // Cria a pasta se não existir
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Mantemos um nome fixo "logo" com a extensão original para facilitar a busca
    const ext = path.extname(file.originalname);
    cb(null, `logo${ext}`);
  }
});

const upload = multer({ storage });

// Endpoint de Upload
router.post('/:empresaId/logo/upload', upload.single('logo'), async (req, res) => {
  try {
    const empresaId = parseInt(req.params.empresaId);
    
    if (!req.file) return res.status(400).json({ erro: 'Arquivo não enviado' });

    // Caminho que será salvo no banco (URL acessível pelo navegador)
    const urlCaminho = `/uploads/logos/${empresaId}/${req.file.filename}?t=${Date.now()}`;

    // Salva o CAMINHO no banco de dados (campo logoCaminho)
    await prisma.empresa.update({
      where: { id: empresaId },
      data: { logoCaminho: urlCaminho }
    });

    res.json({ sucesso: true, caminho: urlCaminho });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// Endpoint para buscar o caminho da logo
router.get('/:empresaId/path', async (req, res) => {
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: parseInt(req.params.empresaId) },
      select: { logoCaminho: true }
    });
    res.json(empresa);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

module.exports = router;