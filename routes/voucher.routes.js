const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const crypto = require("crypto");
const authMiddleware = require("../middlewares/authMiddleware");

// ============================================================
// MIDDLEWARE: apenas master
// ============================================================
function apenasMaster(req, res, next) {
    if (req.user.nivel !== "master") {
        return res.status(403).json({ erro: "Sem permissão. Apenas master." });
    }
    next();
}

// ============================================================
// HELPERS
// ============================================================
function gerarCodigo() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

// ============================================================
// ENDPOINTS PÚBLICOS (sem auth)
// ============================================================

// GET /api/voucher/publico/:codigo?token=XXX
router.get("/publico/:codigo", async (req, res) => {
    try {
        const { codigo } = req.params;
        const { token } = req.query;

        if (!codigo || !token) {
            return res.status(400).json({ erro: "Código e token obrigatórios" });
        }

        const voucher = await prisma.voucher.findFirst({
            where: { codigoVoucher: codigo, tokenSeguranca: token },
            include: { empresa: { select: { nomeEmpresa: true, logoCaminho: true } } }
        });

        if (!voucher) {
            return res.status(404).json({ erro: "Voucher não encontrado" });
        }

        // Determinar estado
        let estado = "pendente";
        if (voucher.isDeleted) {
            estado = "cancelado";
        } else if (voucher.status === "validado" || voucher.status === "resgatado") {
            estado = voucher.status;
        } else if (new Date(voucher.dataValidade) < new Date(new Date().toDateString())) {
            estado = "expirado";
        }

        res.json({
            success: true,
            voucher: {
                codigoVoucher: voucher.codigoVoucher,
                tipo: voucher.tipo,
                tipoRodizio: voucher.tipoRodizio,
                valorRodizio: voucher.valorRodizio,
                possuiBebida: voucher.possuiBebida,
                tipoBebida: voucher.tipoBebida,
                qtdBebida: voucher.qtdBebida,
                possuiSobremesa: voucher.possuiSobremesa,
                tipoSobremesa: voucher.tipoSobremesa,
                qtdSobremesa: voucher.qtdSobremesa,
                valorTotal: voucher.valorTotal,
                dataValidade: voucher.dataValidade,
                status: voucher.status,
                estado,
                nomeCliente: voucher.nomeCliente,
                dataValidacao: voucher.dataValidacao,
                dataResgate: voucher.dataResgate,
                nomeEmpresa: voucher.empresa.nomeEmpresa,
                logoCaminho: voucher.empresa.logoCaminho
            }
        });
    } catch (e) {
        console.error("Erro ao buscar voucher público:", e);
        res.status(500).json({ erro: "Erro interno" });
    }
});

// POST /api/voucher/publico/validar
router.post("/publico/validar", async (req, res) => {
    try {
        const { codigo, token, nome, telefone, cpf } = req.body;

        if (!codigo || !token || !nome || !telefone || !cpf) {
            return res.status(400).json({ erro: "Todos os campos são obrigatórios" });
        }

        const voucher = await prisma.voucher.findFirst({
            where: { codigoVoucher: codigo, tokenSeguranca: token }
        });

        if (!voucher) {
            return res.status(404).json({ erro: "Voucher não encontrado" });
        }
        if (voucher.isDeleted) {
            return res.status(400).json({ erro: "Este voucher foi cancelado." });
        }
        if (voucher.status === "validado" || voucher.status === "resgatado") {
            const data = voucher.dataValidacao || voucher.dataResgate;
            let msg = "Este voucher já foi validado";
            if (data) {
                msg += ` em ${new Date(data).toLocaleDateString("pt-BR")} às ${new Date(data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
            }
            if (voucher.nomeCliente) msg += `. Cliente: ${voucher.nomeCliente}`;
            return res.status(400).json({ erro: msg });
        }
        if (new Date(voucher.dataValidade) < new Date(new Date().toDateString())) {
            return res.status(400).json({ erro: "Este voucher está vencido!" });
        }

        const atualizado = await prisma.voucher.update({
            where: { id: voucher.id },
            data: {
                status: "validado",
                dataValidacao: new Date(),
                nomeCliente: nome,
                telefoneCliente: telefone,
                cpfCliente: cpf
            }
        });

        res.json({ success: true, mensagem: "Voucher validado com sucesso!" });
    } catch (e) {
        console.error("Erro ao validar voucher:", e);
        res.status(500).json({ erro: "Erro ao validar. Tente novamente." });
    }
});

// ============================================================
// ENDPOINTS PROTEGIDOS (master-only)
// ============================================================

// GET /api/voucher/listar?status=pendente
router.get("/listar", authMiddleware, apenasMaster, async (req, res) => {
    try {
        const empresaId = req.user.empresaId;
        const { status } = req.query;

        const where = { empresaId, isDeleted: false };
        if (status && status !== "todos") where.status = status;

        const vouchers = await prisma.voucher.findMany({
            where,
            orderBy: { dataCriacao: "desc" }
        });

        res.json({ success: true, vouchers });
    } catch (e) {
        console.error("Erro ao listar vouchers:", e);
        res.status(500).json({ erro: "Erro ao listar vouchers" });
    }
});

// GET /api/voucher/:id
router.get("/:id", authMiddleware, apenasMaster, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const voucher = await prisma.voucher.findFirst({
            where: { id, empresaId: req.user.empresaId }
        });

        if (!voucher) return res.status(404).json({ erro: "Voucher não encontrado" });

        res.json({ success: true, voucher });
    } catch (e) {
        console.error("Erro ao buscar voucher:", e);
        res.status(500).json({ erro: "Erro ao buscar voucher" });
    }
});

// POST /api/voucher/criar
router.post("/criar", authMiddleware, apenasMaster, async (req, res) => {
    try {
        const empresaId = req.user.empresaId;
        const {
            tipo, tipoRodizio, valorRodizio,
            possuiBebida, valorBebida, qtdBebida, tipoBebida,
            possuiSobremesa, valorSobremesa, qtdSobremesa, tipoSobremesa,
            dataValidade, observacoes, pago, formaPagamento
        } = req.body;

        if (!dataValidade) {
            return res.status(400).json({ erro: "Data de validade obrigatória" });
        }

        // Gerar código único
        let codigoVoucher;
        let existe = true;
        while (existe) {
            codigoVoucher = gerarCodigo();
            existe = await prisma.voucher.findUnique({ where: { codigoVoucher } });
        }

        const tokenSeguranca = crypto.randomUUID();

        const vRodizio = parseFloat(valorRodizio) || 0;
        const vBebida = parseFloat(valorBebida) || 0;
        const vSobremesa = parseFloat(valorSobremesa) || 0;
        const subtotal = vRodizio + vBebida + vSobremesa;

        const voucher = await prisma.voucher.create({
            data: {
                empresaId,
                codigoVoucher,
                tokenSeguranca,
                tipo: tipo || "Cortesia",
                tipoRodizio: tipoRodizio || null,
                valorRodizio: vRodizio,
                possuiBebida: !!possuiBebida,
                valorBebida: vBebida,
                qtdBebida: parseInt(qtdBebida) || 0,
                tipoBebida: tipoBebida || null,
                possuiSobremesa: !!possuiSobremesa,
                valorSobremesa: vSobremesa,
                qtdSobremesa: parseInt(qtdSobremesa) || 0,
                tipoSobremesa: tipoSobremesa || null,
                subtotal,
                valorTotal: subtotal,
                dataValidade: new Date(dataValidade),
                observacoes: observacoes || null,
                pago: !!pago,
                formaPagamento: formaPagamento || null
            }
        });

        res.json({ success: true, voucher });
    } catch (e) {
        console.error("Erro ao criar voucher:", e);
        res.status(500).json({ erro: "Erro ao criar voucher" });
    }
});

// PUT /api/voucher/:id
router.put("/:id", authMiddleware, apenasMaster, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const existente = await prisma.voucher.findFirst({
            where: { id, empresaId: req.user.empresaId }
        });

        if (!existente) return res.status(404).json({ erro: "Voucher não encontrado" });
        if (existente.status !== "pendente") {
            return res.status(400).json({ erro: "Só é possível editar vouchers pendentes" });
        }

        const {
            tipo, tipoRodizio, valorRodizio,
            possuiBebida, valorBebida, qtdBebida, tipoBebida,
            possuiSobremesa, valorSobremesa, qtdSobremesa, tipoSobremesa,
            dataValidade, observacoes, pago, formaPagamento
        } = req.body;

        const vRodizio = parseFloat(valorRodizio) || 0;
        const vBebida = parseFloat(valorBebida) || 0;
        const vSobremesa = parseFloat(valorSobremesa) || 0;
        const subtotal = vRodizio + vBebida + vSobremesa;

        const voucher = await prisma.voucher.update({
            where: { id },
            data: {
                tipo: tipo || existente.tipo,
                tipoRodizio: tipoRodizio !== undefined ? tipoRodizio : existente.tipoRodizio,
                valorRodizio: vRodizio,
                possuiBebida: possuiBebida !== undefined ? !!possuiBebida : existente.possuiBebida,
                valorBebida: vBebida,
                qtdBebida: parseInt(qtdBebida) || 0,
                tipoBebida: tipoBebida !== undefined ? tipoBebida : existente.tipoBebida,
                possuiSobremesa: possuiSobremesa !== undefined ? !!possuiSobremesa : existente.possuiSobremesa,
                valorSobremesa: vSobremesa,
                qtdSobremesa: parseInt(qtdSobremesa) || 0,
                tipoSobremesa: tipoSobremesa !== undefined ? tipoSobremesa : existente.tipoSobremesa,
                subtotal,
                valorTotal: subtotal,
                dataValidade: dataValidade ? new Date(dataValidade) : existente.dataValidade,
                observacoes: observacoes !== undefined ? observacoes : existente.observacoes,
                pago: pago !== undefined ? !!pago : existente.pago,
                formaPagamento: formaPagamento !== undefined ? formaPagamento : existente.formaPagamento
            }
        });

        res.json({ success: true, voucher });
    } catch (e) {
        console.error("Erro ao editar voucher:", e);
        res.status(500).json({ erro: "Erro ao editar voucher" });
    }
});

// POST /api/voucher/:id/resgatar
router.post("/:id/resgatar", authMiddleware, apenasMaster, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const voucher = await prisma.voucher.findFirst({
            where: { id, empresaId: req.user.empresaId }
        });

        if (!voucher) return res.status(404).json({ erro: "Voucher não encontrado" });
        if (voucher.status !== "validado") {
            return res.status(400).json({ erro: "Só é possível resgatar vouchers validados" });
        }

        const atualizado = await prisma.voucher.update({
            where: { id },
            data: { status: "resgatado", dataResgate: new Date() }
        });

        res.json({ success: true, voucher: atualizado });
    } catch (e) {
        console.error("Erro ao resgatar voucher:", e);
        res.status(500).json({ erro: "Erro ao resgatar voucher" });
    }
});

// DELETE /api/voucher/:id (soft delete)
router.delete("/:id", authMiddleware, apenasMaster, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const voucher = await prisma.voucher.findFirst({
            where: { id, empresaId: req.user.empresaId }
        });

        if (!voucher) return res.status(404).json({ erro: "Voucher não encontrado" });

        await prisma.voucher.update({
            where: { id },
            data: { isDeleted: true }
        });

        res.json({ success: true, mensagem: "Voucher removido" });
    } catch (e) {
        console.error("Erro ao deletar voucher:", e);
        res.status(500).json({ erro: "Erro ao deletar voucher" });
    }
});

module.exports = router;
