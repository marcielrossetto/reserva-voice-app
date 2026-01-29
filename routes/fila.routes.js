/**
 * routes/fila.routes.js
 * Gerenciamento completo de fila de espera
 * ✅ COM WEBSOCKET PARA TEMPO REAL
 * ✅ SEM RELOAD - Browser escuta WebSocket
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const autenticar = require('../middlewares/authMiddleware');
const { notificarFilaAlterada } = require('./websocket');

// ========================= HELPERS =========================

function obterIdVirtualDiario(id, numeroInicial = 1) {
  // Calcula ID virtual baseado na sequência do dia
  return numeroInicial + (id % 1000);
}

function formatarTempoPHP(segundos) {
  if (segundos >= 3600) {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    return `${h}hs ${String(m).padStart(2, '0')}m`;
  }
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ========================= ROTAS AJAX =========================

/**
 * POST /api/fila/sentar
 * Move cliente para sentado (status 1)
 */
router.post('/sentar', autenticar, async (req, res) => {
  try {
    const { id, mesa } = req.body;
    const empresaId = req.user.empresaId;

    // Busca posição atual na fila
    const clienteAtual = await prisma.filaEspera.findUnique({
      where: { id: parseInt(id) }
    });

    const posicao = await prisma.filaEspera.count({
      where: {
        empresaId,
        status: 0,
        dataCriacao: {
          lt: clienteAtual.dataCriacao
        }
      }
    }) + 1;

    // Atualiza status para sentado
    await prisma.filaEspera.update({
      where: { id: parseInt(id) },
      data: {
        status: 1,
        numMesa: mesa || null,
        horaSentado: new Date(),
        posicaoFila: posicao
      }
    });

    // ✅ NOTIFICAR VIA WEBSOCKET
    notificarFilaAlterada(empresaId, 'sentou', { id, nome: clienteAtual.nome, mesa });

    res.json({ success: true });
  } catch (error) {
    console.error('❌ ERRO SENTAR:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/fila/:id
 * Edita cliente na fila
 */
router.put('/:id', autenticar, async (req, res) => {
  try {
    const { nome, numPessoas, telefone } = req.body;
    const empresaId = req.user.empresaId;
    const id = parseInt(req.params.id);

    const clienteAtual = await prisma.filaEspera.findUnique({
      where: { id }
    });

    await prisma.filaEspera.update({
      where: { id },
      data: {
        nome,
        numPessoas: parseInt(numPessoas),
        telefone
      }
    });

    // ✅ NOTIFICAR VIA WEBSOCKET
    notificarFilaAlterada(empresaId, 'editou', { id, nome });

    res.json({ success: true });
  } catch (error) {
    console.error('❌ ERRO EDITAR:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/fila/:id/cancelar
 * Cancela cliente (status 2)
 */
router.post('/:id/cancelar', autenticar, async (req, res) => {
  try {
    const empresaId = req.user.empresaId;
    const id = parseInt(req.params.id);

    const clienteAtual = await prisma.filaEspera.findUnique({
      where: { id }
    });

    const posicao = await prisma.filaEspera.count({
      where: {
        empresaId,
        status: 0,
        dataCriacao: {
          lt: clienteAtual.dataCriacao
        }
      }
    }) + 1;

    await prisma.filaEspera.update({
      where: { id },
      data: {
        status: 2,
        horaSentado: new Date(),
        posicaoFila: posicao
      }
    });

    // ✅ NOTIFICAR VIA WEBSOCKET
    notificarFilaAlterada(empresaId, 'cancelou', { id, nome: clienteAtual.nome });

    res.json({ success: true });
  } catch (error) {
    console.error('❌ ERRO CANCELAR:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/fila/:id/voltar
 * Retorna cliente para fila (status 0)
 */
router.post('/:id/voltar', autenticar, async (req, res) => {
  try {
    const empresaId = req.user.empresaId;
    const id = parseInt(req.params.id);

    const clienteAtual = await prisma.filaEspera.findUnique({
      where: { id }
    });

    await prisma.filaEspera.update({
      where: { id },
      data: {
        status: 0,
        numMesa: null,
        horaSentado: null,
        posicaoFila: null
      }
    });

    // ✅ NOTIFICAR VIA WEBSOCKET
    notificarFilaAlterada(empresaId, 'voltou', { id, nome: clienteAtual.nome });

    res.json({ success: true });
  } catch (error) {
    console.error('❌ ERRO VOLTAR:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/fila/:id/bebida
 * Adiciona bebida ao cliente
 */
router.post('/:id/bebida', autenticar, async (req, res) => {
  try {
    const { nomeBebida, preco } = req.body;
    const empresaId = req.user.empresaId;
    const filaId = parseInt(req.params.id);

    const bebida = await prisma.filaBebidas.create({
      data: {
        filaId,
        empresaId,
        bebida: nomeBebida,
        valor: parseFloat(preco) || 0,
        dataCriacao: new Date()
      }
    });

    // ✅ NOTIFICAR VIA WEBSOCKET
    notificarFilaAlterada(empresaId, 'bebida', { id: filaId, bebida: nomeBebida });

    res.json({ success: true, bebida });
  } catch (error) {
    console.error('❌ ERRO BEBIDA:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/fila/:id/consumo
 * Busca consumo detalhado de um cliente
 */
router.get('/:id/consumo', autenticar, async (req, res) => {
  try {
    const empresaId = req.user.empresaId;
    const filaId = parseInt(req.params.id);

    const bebidas = await prisma.filaBebidas.findMany({
      where: { filaId, empresaId },
      orderBy: { dataCriacao: 'asc' }
    });

    const subtotal = bebidas.reduce((acc, b) => acc + b.valor, 0);
    const total = subtotal * 1.12; // +12%

    res.json({
      success: true,
      itens: bebidas,
      subtotal,
      total,
      qtd: bebidas.length
    });
  } catch (error) {
    console.error('❌ ERRO CONSUMO:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/fila/dia/:data
 * Busca todas as filas do dia
 */
router.get('/dia/:data', autenticar, async (req, res) => {
  try {
    const empresaId = req.user.empresaId;
    const dataStr = req.params.data; // formato: YYYY-MM-DD

    const dataInicio = new Date(`${dataStr}T00:00:00`);
    const dataFim = new Date(`${dataStr}T23:59:59`);

    // Fila de espera (status 0)
    const espera = await prisma.filaEspera.findMany({
      where: {
        empresaId,
        status: 0,
        dataCriacao: {
          gte: dataInicio,
          lte: dataFim
        }
      },
      orderBy: { dataCriacao: 'asc' }
    });

    // Histórico (atendidos + cancelados)
    const historico = await prisma.filaEspera.findMany({
      where: {
        empresaId,
        status: { in: [1, 2] },
        dataCriacao: {
          gte: dataInicio,
          lte: dataFim
        }
      },
      orderBy: { horaSentado: 'desc' }
    });

    // Bebidas do dia
    const bebidasDia = await prisma.filaBebidas.findMany({
      where: {
        empresaId,
        dataCriacao: {
          gte: dataInicio,
          lte: dataFim
        }
      }
    });

    const totalBebidas = bebidasDia.length;
    const totalVendas = bebidasDia.reduce((acc, b) => acc + b.valor, 0) * 1.12;

    // Config do dia
    const config = await prisma.filaConfigDia.findFirst({
      where: {
        empresaId,
        dataConfig: new Date(dataStr)
      }
    });

    const numeroInicial = config?.numeroInicial || 1;

    res.json({
      success: true,
      espera,
      historico,
      bebidasDia,
      totalBebidas,
      totalVendas,
      numeroInicial
    });
  } catch (error) {
    console.error('❌ ERRO DIA:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/fila
 * Cria novo cliente na fila
 */
router.post('/', autenticar, async (req, res) => {
  try {
    const { nome, telefone, numPessoas, prioMotivo } = req.body;
    const empresaId = req.user.empresaId;

    const telefoneLimpo = (telefone || '').replace(/\D/g, '');

    const cliente = await prisma.filaEspera.create({
      data: {
        empresaId,
        nome,
        telefone: telefoneLimpo,
        numPessoas: parseInt(numPessoas),
        prioridade: !!prioMotivo,
        prioMotivo: prioMotivo || '',
        status: 0,
        dataCriacao: new Date()
      }
    });

    // ✅ NOTIFICAR VIA WEBSOCKET
    notificarFilaAlterada(empresaId, 'adicionou', { id: cliente.id, nome: cliente.nome });

    res.json({ success: true, cliente });
  } catch (error) {
    console.error('❌ ERRO INSERT:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/fila/config/numero-inicial
 * Salva número inicial do dia
 */
router.post('/config/numero-inicial', autenticar, async (req, res) => {
  try {
    const { numeroInicial, data } = req.body;
    const empresaId = req.user.empresaId;

    const dataConfig = new Date(data);

    const existe = await prisma.filaConfigDia.findFirst({
      where: {
        empresaId,
        dataConfig
      }
    });

    if (existe) {
      await prisma.filaConfigDia.update({
        where: { id: existe.id },
        data: { numeroInicial: parseInt(numeroInicial) }
      });
    } else {
      await prisma.filaConfigDia.create({
        data: {
          empresaId,
          dataConfig,
          numeroInicial: parseInt(numeroInicial)
        }
      });
    }

    // ✅ NOTIFICAR VIA WEBSOCKET
    notificarFilaAlterada(empresaId, 'config', { numeroInicial });

    res.json({ success: true });
  } catch (error) {
    console.error('❌ ERRO CONFIG:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/fila/todas-bebidas/:data
 * Busca todas as bebidas vendidas no dia
 */
router.get('/todas-bebidas/:data', autenticar, async (req, res) => {
  try {
    const empresaId = req.user.empresaId;
    const dataStr = req.params.data;

    const dataInicio = new Date(`${dataStr}T00:00:00`);
    const dataFim = new Date(`${dataStr}T23:59:59`);

    const bebidas = await prisma.filaBebidas.findMany({
      where: {
        empresaId,
        dataCriacao: {
          gte: dataInicio,
          lte: dataFim
        }
      },
      include: {
        fila: {
          select: { nome: true, id: true }
        }
      },
      orderBy: { dataCriacao: 'desc' }
    });

    res.json({ success: true, bebidas });
  } catch (error) {
    console.error('❌ ERRO TODAS BEBIDAS:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;