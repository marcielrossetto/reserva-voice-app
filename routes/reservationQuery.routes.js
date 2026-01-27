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

// ========================= ENDPOINTS =========================

/**
 * 1. GET RESERVATIONS WITH FILTERS (Date, Search, Period, Status)
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

/**
 * 2. GET CLIENT HISTORY (by phone)
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
 * 3. GET ONE RESERVATION
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

/**
 * 4. UPDATE RESERVATION (with edit history)
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

        // Track changes
        const changes = [];
        const updatableFields = ['nome', 'numPessoas', 'horario', 'numMesa', 'observacoes', 'confirmado', 'status'];

        for (const field of updatableFields) {
            if (d[field] !== undefined && d[field] !== reservationCurrent[field]) {
                changes.push({
                    field,
                    previousValue: String(reservationCurrent[field]),
                    newValue: String(d[field]),
                    userId: usuarioId,
                    changeDate: new Date()
                });
            }
        }

        // Update reservation
        const reservationUpdated = await prisma.cliente.update({
            where: { id: parseInt(id) },
            data: {
                nome: d.nome !== undefined ? d.nome : reservationCurrent.nome,
                numPessoas: d.numPessoas !== undefined ? d.numPessoas : reservationCurrent.numPessoas,
                horario: d.horario !== undefined ? d.horario : reservationCurrent.horario,
                numMesa: d.numMesa !== undefined ? d.numMesa : reservationCurrent.numMesa,
                observacoes: d.observacoes !== undefined ? d.observacoes : reservationCurrent.observacoes,
                confirmado: d.confirmado !== undefined ? d.confirmado : reservationCurrent.confirmado,
                status: d.status !== undefined ? d.status : reservationCurrent.status
            }
        });

        // Save history (if there are changes)
        if (changes.length > 0) {
            console.log(`📝 Changes in reservation ${id}:`, changes);
            // Here you can save in an audit table if desired
        }

        res.json({
            success: true,
            reservation: reservationUpdated,
            changes
        });

    } catch (err) {
        console.error("❌ Error updating reservation:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 5. CANCEL RESERVATION (only changes status)
 */
router.put("/:id/cancel", auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const empresaId = req.user.empresaId;

        const reservation = await prisma.cliente.update({
            where: { id: parseInt(id) },
            data: {
                status: false,
                motivoCancelamento: reason || "Cancelled by system"
            }
        });

        console.log(`❌ Reservation ${id} cancelled. Reason: ${reason}`);

        res.json({
            success: true,
            message: "Reservation cancelled successfully",
            reservation
        });

    } catch (err) {
        console.error("❌ Error cancelling reservation:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 6. CONFIRM RESERVATION (WhatsApp)
 */
router.put("/:id/confirm", auth, async (req, res) => {
    try {
        const { id } = req.params;
        const empresaId = req.user.empresaId;

        const reservation = await prisma.cliente.update({
            where: { id: parseInt(id) },
            data: {
                confirmado: true
            }
        });

        console.log(`✅ Reservation ${id} confirmed`);

        res.json({
            success: true,
            message: "Reservation confirmed successfully",
            reservation
        });

    } catch (err) {
        console.error("❌ Error confirming reservation:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;