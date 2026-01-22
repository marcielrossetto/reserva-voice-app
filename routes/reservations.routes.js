// routes/reservations.js - COM VALIDAÇÕES COMPLETAS

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const auth = require("../middlewares/authMiddleware");
const WhatsAppParser = require("../utils/whatsappParserRegex");

const router = express.Router();
const prisma = new PrismaClient();

// ========================= FUNÇÕES AUXILIARES DE VALIDAÇÃO =========================

function validarTelefone(telefone) {
  const tel = String(telefone).replace(/\D/g, '');
  return /^[1-9]{2}9\d{8}$/.test(tel);
}

function validarData(data) {
  data = String(data).trim();
  if (data === '') return false;

  if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return true;

  if (!/^(0?[1-9]|[12][0-9]|3[01])[\/-](0?[1-9]|1[0-2])[\/-](\d{2}|\d{4})$/.test(data)) {
    return false;
  }

  return true;
}

function normalizarDataParaBanco(data) {
  data = String(data).trim();
  if (data === '') return false;

  if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;

  data = data.replace(/-/g, '/');
  const partes = data.split('/');
  if (partes.length !== 3) return false;

  let [dia, mes, ano] = partes;
  dia = String(dia).padStart(2, '0');
  mes = String(mes).padStart(2, '0');

  if (ano.length === 2) {
    ano = '20' + ano;
  }

  return `${ano}-${mes}-${dia}`;
}

function validarHorario(horario) {
  horario = String(horario).trim();
  if (horario === '') return false;
  return /^([01]\d|2[0-3])[:.;]([0-5]\d)$/.test(horario);
}

function normalizarHorarioParaBanco(horario) {
  horario = String(horario).trim();
  if (horario === '') return false;

  horario = horario.replace(/[;.]/g, ':');

  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(horario)) {
    return false;
  }

  return horario + ':00';
}

function validarHorarioFuncionamento(horarioBanco) {
  const inicio = "11:00:00";
  const fim = "23:59:59";

  if (horarioBanco < inicio) {
    return "Horário antes das 11:00 — fora do horário de funcionamento.";
  }

  if (horarioBanco > fim) {
    return "Horário após 23:59 — fora do horário de funcionamento.";
  }

  return true;
}

function tempoAtras(data) {
  const dt = new Date(data);
  const now = new Date();

  dt.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  if (dt > now) return "Reserva Futura";

  const diff = (now - dt) / (1000 * 60 * 60 * 24);

  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  if (diff < 30) return `${Math.floor(diff)} dias atrás`;
  if (diff < 365) return `${Math.floor(diff / 30)} meses atrás`;
  
  return `${Math.floor(diff / 365)} anos atrás`;
}

// ✅ DEBUG: Log todas as requisições
router.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  console.log("Headers:", req.headers);
  next();
});

// ✅ POST /api/reservas/process-reservation
router.post("/process-reservation", auth, async (req, res) => {
  try {
    console.log("✅ Entrou em process-reservation");
    console.log("📥 user:", req.user);
    console.log("📥 body:", req.body);

    const { mensagem } = req.body;

    if (!mensagem || mensagem.trim().length < 5) {
      return res.status(400).json({
        sucesso: false,
        erro: "Mensagem muito curta"
      });
    }

    console.log("🔍 Fazendo parse...");
    const dados = WhatsAppParser.parse(mensagem);
    console.log("✅ Parse OK:", dados);

    const validacao = WhatsAppParser.validar(dados);
    console.log("✅ Validação:", validacao);

    if (!validacao.valido) {
      return res.status(400).json({
        sucesso: false,
        erro: "Dados incompletos",
        detalhes: validacao.erros
      });
    }

    // ========================= VALIDAÇÕES ADICIONAIS =========================
    
    // Validar telefone
    if (!validarTelefone(dados.telefone)) {
      return res.status(400).json({
        sucesso: false,
        erro: "Telefone inválido"
      });
    }

    // Validar data
    if (!validarData(dados.data)) {
      return res.status(400).json({
        sucesso: false,
        erro: "Data inválida"
      });
    }

    const dataBanco = normalizarDataParaBanco(dados.data);
    const hoje = new Date().toISOString().split('T')[0];

    if (dataBanco < hoje) {
      return res.status(400).json({
        sucesso: false,
        erro: "Data anterior a hoje não é permitida"
      });
    }

    // Validar horário
    if (!validarHorario(dados.horario)) {
      return res.status(400).json({
        sucesso: false,
        erro: "Horário inválido"
      });
    }

    const horarioBanco = normalizarHorarioParaBanco(dados.horario);
    const validaHora = validarHorarioFuncionamento(horarioBanco);

    if (validaHora !== true) {
      return res.status(400).json({
        sucesso: false,
        erro: validaHora
      });
    }

    // ========================= VERIFICAR DUPLICIDADE =========================

    const duplicata = await prisma.cliente.findFirst({
      where: {
        nome: dados.nome,
        telefone: dados.telefone,
        data: new Date(dataBanco),
        empresaId: req.user.empresaId
      }
    });

    if (duplicata) {
      return res.status(400).json({
        sucesso: false,
        erro: "Duplicidade",
        detalhes: "Já existe uma reserva para este cliente nesta data"
      });
    }

    // ========================= SALVAR NO BANCO =========================

    console.log("💾 Salvando no banco...");
    const [year, month, day] = dataBanco.split("-").map(Number);
    const dataObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

    const cliente = await prisma.cliente.create({
      data: {
        nome: dados.nome,
        telefone: dados.telefone,
        data: dataObj,
        horario: horarioBanco,
        numPessoas: dados.numPessoas,
        tipoEvento: dados.tipoEvento || "Texto",
        formaPagamento: dados.formaPagamento || "Não definido",
        numMesa: dados.numeroMesa || null,
        observacoes: dados.observacoes || null,
        empresaId: req.user.empresaId,
        usuarioId: req.user.id,
        confirmado: false,
        status: true
      }
    });

    console.log("✅ Reserva criada:", cliente.id);

    // ========================= GERAR LINK WHATSAPP =========================

    const dataBr = new Date(dataObj).toLocaleDateString('pt-BR');
    const horaCurta = horarioBanco.substring(0, 5);
    const mensagemWhatsApp = `Olá, ${dados.nome}. Sua reserva para ${dataBr} às ${horaCurta} para ${dados.numPessoas} pessoas foi confirmada.`;
    const linkWhatsApp = `https://wa.me/55${dados.telefone}?text=${encodeURIComponent(mensagemWhatsApp)}`;

    res.status(201).json({
      sucesso: true,
      mensagem: "Reserva criada!",
      linkWhatsApp,
      reserva: {
        id: cliente.id,
        nome: cliente.nome,
        telefone: cliente.telefone,
        data: cliente.data.toISOString().split('T')[0],
        horario: horarioBanco,
        numPessoas: cliente.numPessoas,
        tipoEvento: cliente.tipoEvento
      }
    });

  } catch (err) {
    console.error("❌ ERRO NO PROCESS-RESERVATION:", err);
    res.status(500).json({ 
      sucesso: false,
      erro: err.message,
      stack: err.stack 
    });
  }
});

// ✅ POST /api/reservas - SALVAR MANUAL COM VALIDAÇÕES
router.post("/", auth, async (req, res) => {
  try {
    console.log("✅ Salvando reserva manual");
    console.log("📥 body:", req.body);

    const {
      nome,
      telefone,
      data,
      horario,
      numPessoas,
      tipoEvento,
      formaPagamento,
      valorRodizio,
      numMesa,
      observacoes,
      torta_termo_vela,
      churrascaria,
      executivo
    } = req.body;

    // ========================= VALIDAÇÕES =========================

    if (!nome || !telefone || !data || !horario || !numPessoas) {
      return res.status(400).json({
        sucesso: false,
        erro: "Campos obrigatórios não preenchidos"
      });
    }

    // Validar telefone
    if (!validarTelefone(telefone)) {
      return res.status(400).json({
        sucesso: false,
        erro: "Telefone inválido"
      });
    }

    // Validar data
    if (!validarData(data)) {
      return res.status(400).json({
        sucesso: false,
        erro: "Data inválida"
      });
    }

    const dataBanco = normalizarDataParaBanco(data);
    const hoje = new Date().toISOString().split('T')[0];

    if (dataBanco < hoje) {
      return res.status(400).json({
        sucesso: false,
        erro: "Data anterior a hoje não é permitida"
      });
    }

    // Validar horário
    if (!validarHorario(horario)) {
      return res.status(400).json({
        sucesso: false,
        erro: "Horário inválido"
      });
    }

    const horarioBanco = normalizarHorarioParaBanco(horario);
    const validaHora = validarHorarioFuncionamento(horarioBanco);

    if (validaHora !== true) {
      return res.status(400).json({
        sucesso: false,
        erro: validaHora
      });
    }

    // ========================= VERIFICAR DUPLICIDADE =========================

    const duplicata = await prisma.cliente.findFirst({
      where: {
        nome,
        telefone,
        data: new Date(dataBanco),
        empresaId: req.user.empresaId
      }
    });

    if (duplicata) {
      return res.status(400).json({
        sucesso: false,
        erro: "Duplicidade",
        detalhes: "Já existe uma reserva para este cliente nesta data"
      });
    }

    // ========================= SALVAR NO BANCO =========================

    const [year, month, day] = dataBanco.split("-").map(Number);
    const dataObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

    const cliente = await prisma.cliente.create({
      data: {
        nome,
        telefone,
        data: dataObj,
        horario: horarioBanco,
        numPessoas: parseInt(numPessoas),
        tipoEvento: tipoEvento || "Manual",
        formaPagamento: formaPagamento || "Não definido",
        valorRodizio: valorRodizio ? parseFloat(valorRodizio) : null,
        numMesa: numMesa || null,
        observacoes: observacoes || null,
        empresaId: req.user.empresaId,
        usuarioId: req.user.id,
        confirmado: false,
        status: true,
        tortaTermo: torta_termo_vela ? true : false,
        churrascaria: churrascaria ? true : false,
        executivo: executivo ? true : false
      }
    });

    // ========================= GERAR LINK WHATSAPP =========================

    const dataBr = new Date(dataObj).toLocaleDateString('pt-BR');
    const horaCurta = horarioBanco.substring(0, 5);
    const mensagemWhatsApp = `Olá, ${nome}. Sua reserva para ${dataBr} às ${horaCurta} para ${numPessoas} pessoas foi confirmada.`;
    const linkWhatsApp = `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagemWhatsApp)}`;

    res.status(201).json({
      sucesso: true,
      mensagem: "Reserva criada com sucesso!",
      linkWhatsApp,
      reserva: {
        id: cliente.id,
        nome: cliente.nome,
        telefone: cliente.telefone,
        data: cliente.data.toISOString().split('T')[0],
        horario: horarioBanco,
        numPessoas: cliente.numPessoas
      }
    });

  } catch (err) {
    console.error("❌ ERRO AO SALVAR RESERVA:", err);
    res.status(500).json({
      sucesso: false,
      erro: err.message
    });
  }
});

// ✅ GET /api/reservas
router.get("/", auth, async (req, res) => {
  try {
    console.log("📥 Listando reservas para empresa:", req.user.empresaId);

    const clientes = await prisma.cliente.findMany({
      where: { 
        empresaId: req.user.empresaId,
        usuarioId: req.user.id
      },
      orderBy: { data: 'desc' }
    });

    res.json({
      sucesso: true,
      total: clientes.length,
      reservas: clientes.map(c => ({
        id: c.id,
        nome: c.nome,
        telefone: c.telefone,
        data: c.data.toISOString().split('T')[0],
        horario: c.horario,
        numPessoas: c.numPessoas,
        tipoEvento: c.tipoEvento,
        numeroMesa: c.numMesa,
        observacoes: c.observacoes,
        confirmado: c.confirmado,
        status: c.status
      }))
    });
  } catch (err) {
    console.error("❌ ERRO NO GET:", err);
    res.status(500).json({ 
      sucesso: false,
      erro: err.message 
    });
  }
});

// ✅ GET /api/reservas/:id - BUSCAR PERFIL DO CLIENTE
router.get("/perfil/:telefone", auth, async (req, res) => {
  try {
    const { telefone } = req.params;
    const tel = telefone.replace(/\D/g, '');

    const clientes = await prisma.cliente.findMany({
      where: {
        telefone: tel,
        empresaId: req.user.empresaId
      },
      orderBy: { data: 'desc' },
      take: 50
    });

    if (clientes.length === 0) {
      return res.json({ encontrado: false });
    }

    const ultimo = clientes[0];
    const total = clientes.length;
    let canceladas = 0;
    const ultimasDatas = [];

    clientes.forEach((c, i) => {
      if (!c.status) canceladas++;
      if (i < 4) {
        ultimasDatas.push(c.data.toLocaleDateString('pt-BR'));
      }
    });

    const perfil = {
      id: ultimo.id,
      nome: ultimo.nome,
      telefone: ultimo.telefone,
      ultima_visita_data: ultimo.data.toLocaleDateString('pt-BR'),
      tempo_atras: tempoAtras(ultimo.data),
      historico_recente: ultimasDatas.join(", "),
      total_reservas: total,
      canceladas
    };

    res.json({ encontrado: true, perfil });

  } catch (err) {
    console.error("❌ ERRO AO BUSCAR PERFIL:", err);
    res.status(500).json({ 
      sucesso: false,
      erro: err.message 
    });
  }
});

// ✅ PUT /api/reservas/:id - ATUALIZAR RESERVA
router.put("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const cliente = await prisma.cliente.update({
      where: { id: parseInt(id) },
      data: updates
    });

    res.json({
      sucesso: true,
      mensagem: "Reserva atualizada",
      reserva: cliente
    });

  } catch (err) {
    console.error("❌ ERRO AO ATUALIZAR:", err);
    res.status(500).json({ 
      sucesso: false,
      erro: err.message 
    });
  }
});

// ✅ DELETE /api/reservas/:id - DELETAR RESERVA
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.cliente.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      sucesso: true,
      mensagem: "Reserva deletada"
    });

  } catch (err) {
    console.error("❌ ERRO AO DELETAR:", err);
    res.status(500).json({ 
      sucesso: false,
      erro: err.message 
    });
  }
});

module.exports = router;