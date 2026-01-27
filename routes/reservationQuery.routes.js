const express = require("express");
const { PrismaClient } = require("@prisma/client");
const auth = require("../middlewares/authMiddleware");

const router = express.Router();
const prisma = new PrismaClient();

// ========================= HELPER FUNCTIONS =========================

function normalizeDateForDb(date) {
    if (!date) return "";
    const d = String(date).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const match = d.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
    if (!match) return "";
    let [, day, month, year] = match;
    if (year.length === 2) year = `20${year}`;
    if (year.length === 4) {
        const finalMonth = String(month).padStart(2, "0");
        const finalDay = String(day).padStart(2, "0");
        return `${year}-${finalMonth}-${finalDay}`;
    }
    return "";
}

/**
 * Registrar alteração no histórico
 */
async function registrarAlteracao(clienteId, campo, valorAnterior, valorNovo) {
    try {
        if (valorAnterior !== valorNovo) {
            await prisma.clienteAlteracao.create({
                data: {
                    clienteId,
                    campo,
                    valorAnterior: String(valorAnterior || ''),
                    valorNovo: String(valorNovo || '')
                }
            });
        }
    } catch (err) {
        console.error('Erro ao registrar alteração:', err);
    }
}

// ========================= PUT ESPECÍFICAS (ANTES das genéricas) =========================

/**
 * PUT /api/reservationQuery/:id/status
 * Alterar status (pendente/confirmada)
 */
router.put("/:id/status", auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const empresaId = req.user.empresaId;

        const anterior = await prisma.cliente.findFirst({
            where: { id: parseInt(id), empresaId }
        });

        if (!anterior) {
            return res.json({ success: false, error: "Reservation not found" });
        }

        const atualizado = await prisma.cliente.update({
            where: { id: parseInt(id) },
            data: { confirmado: status === 'confirmed' }
        });

        // Registrar alteração
        await registrarAlteracao(
            id,
            'confirmado',
            anterior.confirmado,
            status === 'confirmed'
        );

        res.json({ success: true, reservation: atualizado });
    } catch (err) {
        console.error("❌ Error updating status:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * PUT /api/reservationQuery/:id/reactivate
 * Reativar reserva cancelada
 */
router.put("/:id/reactivate", auth, async (req, res) => {
    try {
        const { id } = req.params;
        const empresaId = req.user.empresaId;

        const anterior = await prisma.cliente.findFirst({
            where: { id: parseInt(id), empresaId }
        });

        if (!anterior) {
            return res.json({ success: false, error: "Reservation not found" });
        }

        const atualizado = await prisma.cliente.update({
            where: { id: parseInt(id) },
            data: {
                status: true,
                confirmado: false,
                motivoCancelamento: null
            }
        });

        // Registrar alterações
        await registrarAlteracao(id, 'status', false, true);
        await registrarAlteracao(id, 'confirmado', anterior.confirmado, false);

        console.log(`✅ Reservation ${id} reactivated`);

        res.json({ success: true, reservation: atualizado });
    } catch (err) {
        console.error("❌ Error reactivating reservation:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * PUT /api/reservationQuery/:id/cancel
 * Cancelar com motivo
 */
router.put("/:id/cancel", auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const empresaId = req.user.empresaId;

        const anterior = await prisma.cliente.findFirst({
            where: { id: parseInt(id), empresaId }
        });

        if (!anterior) {
            return res.json({ success: false, error: "Reservation not found" });
        }

        const atualizado = await prisma.cliente.update({
            where: { id: parseInt(id) },
            data: {
                status: false,
                motivoCancelamento: reason || "Cancelled by user"
            }
        });

        // Registrar alterações
        await registrarAlteracao(id, 'status', true, false);
        await registrarAlteracao(
            id,
            'motivoCancelamento',
            anterior.motivoCancelamento,
            reason || "Cancelled by user"
        );

        console.log(`❌ Reservation ${id} cancelled. Reason: ${reason}`);

        res.json({ success: true, reservation: atualizado });
    } catch (err) {
        console.error("❌ Error cancelling reservation:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * PUT /api/reservationQuery/:id/confirm
 * Confirmar reserva
 */
router.put("/:id/confirm", auth, async (req, res) => {
    try {
        const { id } = req.params;
        const empresaId = req.user.empresaId;

        const anterior = await prisma.cliente.findFirst({
            where: { id: parseInt(id), empresaId }
        });

        if (!anterior) {
            return res.json({ success: false, error: "Reservation not found" });
        }

        const atualizado = await prisma.cliente.update({
            where: { id: parseInt(id) },
            data: {
                confirmado: true,
                status: true
            }
        });

        // Registrar alteração
        await registrarAlteracao(id, 'confirmado', anterior.confirmado, true);

        console.log(`✅ Reservation ${id} confirmed`);

        res.json({ success: true, reservation: atualizado });
    } catch (err) {
        console.error("❌ Error confirming reservation:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ========================= GET ESPECÍFICAS (ANTES das genéricas) =========================

/**
 * GET /api/reservationQuery/client/:phone
 * Histórico completo do cliente
 */
router.get("/client/:phone", auth, async (req, res) => {
    try {
        const { phone } = req.params;
        const empresaId = req.user.empresaId;

        const phoneClean = String(phone).replaceAll(/\D/g, "");

        const reservations = await prisma.cliente.findMany({
            where: {
                empresaId,
                telefone: phoneClean
            },
            orderBy: { data: 'desc' }
        });

        if (reservations.length === 0) {
            return res.json({ success: false, error: "Client not found" });
        }

        const cliente = reservations[0];
        const totalReservations = reservations.length;
        const confirmadas = reservations.filter(r => r.confirmado).length;
        const canceladas = reservations.filter(r => !r.status).length;

        res.json({
            success: true,
            client: {
                nome: cliente.nome,
                telefone: cliente.telefone,
                totalReservations,
                confirmadas,
                canceladas,
                ultimaVisita: cliente.data
            },
            reservations
        });

    } catch (err) {
        console.error("❌ Error fetching client history:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/reservationQuery/:id/history
 * Histórico de alterações
 */
router.get("/:id/history", auth, async (req, res) => {
    try {
        const { id } = req.params;

        const changes = await prisma.clienteAlteracao.findMany({
            where: { clienteId: parseInt(id) },
            orderBy: { dataAlteracao: 'desc' }
        });

        res.json({
            success: true,
            changes: changes || [],
            total: changes.length
        });

    } catch (err) {
        console.error("❌ Error fetching history:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ========================= GET GENÉRICA =========================

/**
 * GET /api/reservationQuery
 * Listar com filtros (data, busca, período, status)
 */
router.get("/", auth, async (req, res) => {
    try {
        const { data, busca, periodo, incluirCanceladas } = req.query;
        const empresaId = req.user.empresaId;

        const where = { empresaId };

        // Filter by date
        if (data) {
            const dataDb = normalizeDateForDb(data);
            if (dataDb) {
                const dataDate = new Date(dataDb);
                const startOfDay = new Date(dataDate.getFullYear(), dataDate.getMonth(), dataDate.getDate());
                const endOfDay = new Date(dataDate.getFullYear(), dataDate.getMonth(), dataDate.getDate() + 1);
                where.data = { gte: startOfDay, lt: endOfDay };
            }
        }

        // Filter by status
        if (incluirCanceladas !== "true") {
            where.status = true;
        }

        // Get all reservations with filter
        let reservations = await prisma.cliente.findMany({
            where,
            orderBy: { horario: 'asc' }
        });

        // Filter by period (lunch/dinner)
        if (periodo === "almoco") {
            reservations = reservations.filter(r => {
                const [hh] = r.horario.split(':');
                return parseInt(hh, 10) < 18;
            });
        } else if (periodo === "jantar") {
            reservations = reservations.filter(r => {
                const [hh] = r.horario.split(':');
                return parseInt(hh, 10) >= 18;
            });
        }

        // Filter by search (name/phone)
        if (busca) {
            const searchLower = busca.toLowerCase();
            reservations = reservations.filter(r =>
                r.nome.toLowerCase().includes(searchLower) ||
                (r.telefone && r.telefone.includes(busca))
            );
        }

        // Calculate totals
        const totalAtivos = reservations.filter(r => r.status).reduce((sum, r) => sum + r.numPessoas, 0);
        const totalCanceladas = reservations.filter(r => !r.status).length;

        res.json({
            success: true,
            reservations,
            totals: {
                ativos: totalAtivos,
                quantidade: reservations.filter(r => r.status).length,
                canceladas: totalCanceladas
            }
        });

    } catch (err) {
        console.error("❌ Error listing reservations:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ========================= GET ESPECÍFICA (ANTES da PUT genérica) =========================

/**
 * GET /api/reservationQuery/:id
 * Uma reserva específica
 */
router.get("/:id", auth, async (req, res) => {
    try {
        const { id } = req.params;
        const empresaId = req.user.empresaId;

        const reservation = await prisma.cliente.findFirst({
            where: {
                id: parseInt(id),
                empresaId
            }
        });

        if (!reservation) {
            return res.json({ success: false, error: "Reservation not found" });
        }

        res.json({ success: true, reservation });

    } catch (err) {
        console.error("❌ Error fetching reservation:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ========================= POST CRIAR RESERVA =========================

/**
 * POST /api/reservationQuery
 * Criar nova reserva
 */
router.post("/", auth, async (req, res) => {
    try {
        const empresaId = req.user.empresaId;
        const {
            nome,
            data,
            horario,
            numPessoas,
            telefone,
            telefone2,
            formaPagamento,
            numMesa,
            tipoEvento,
            valorRodizio,
            observacoes,
            tortaTermoVela,
            churrascaria,
            executivo
        } = req.body;

        // Validações
        if (!nome || !data || !horario || !numPessoas) {
            return res.json({ success: false, error: "Campos obrigatórios faltando" });
        }

        const novaReserva = await prisma.cliente.create({
            data: {
                empresaId,
                nome,
                data: new Date(data),
                horario,
                numPessoas: parseInt(numPessoas),
                telefone: telefone || null,
                telefone2: telefone2 || null,
                formaPagamento: formaPagamento || null,
                numMesa: numMesa || null,
                tipoEvento: tipoEvento || "Manual",
                valorRodizio: valorRodizio ? parseInt(valorRodizio) : null,
                observacoes: observacoes || null,
                tortaTermoVela: tortaTermoVela || false,
                churrascaria: churrascaria || false,
                executivo: executivo || false,
                status: true,
                confirmado: false
            }
        });

        console.log(`✅ Reservation ${novaReserva.id} created`);

        res.json({
            success: true,
            reservation: novaReserva,
            message: "Reserva criada com sucesso"
        });

    } catch (err) {
        console.error("❌ Error creating reservation:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ========================= PUT GENÉRICA (POR ÚLTIMO) =========================

/**
 * PUT /api/reservationQuery/:id
 * Atualizar reserva (genérico, com histórico)
 */
router.put("/:id", auth, async (req, res) => {
    try {
        const { id } = req.params;
        const empresaId = req.user.empresaId;
        const usuarioId = req.user.id;
        const d = req.body;

        const reservationCurrent = await prisma.cliente.findFirst({
            where: {
                id: parseInt(id),
                empresaId
            }
        });

        if (!reservationCurrent) {
            return res.json({ success: false, error: "Reservation not found" });
        }

        // Check if can edit (date not passed or admin)
        const today = new Date();
        const reservationDate = new Date(reservationCurrent.data);
        const canEdit = reservationDate > today || ['admin', 'master'].includes(req.user.role);

        if (!canEdit) {
            return res.json({ success: false, error: "Cannot edit past reservations" });
        }

        // Campos atualizáveis
        const updatableFields = ['nome', 'numPessoas', 'horario', 'numMesa', 'observacoes', 'confirmado', 'status', 'telefone'];

        // Construir objeto de update
        const updateData = {};
        for (const field of updatableFields) {
            if (d[field] !== undefined && d[field] !== null) {
                updateData[field] = d[field];
            }
        }

        // Update reservation
        const reservationUpdated = await prisma.cliente.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        // Registrar alterações
        for (const field of updatableFields) {
            if (d[field] !== undefined && d[field] !== reservationCurrent[field]) {
                await registrarAlteracao(
                    id,
                    field,
                    reservationCurrent[field],
                    d[field]
                );
            }
        }

        res.json({
            success: true,
            reservation: reservationUpdated
        });

    } catch (err) {
        console.error("❌ Error updating reservation:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;