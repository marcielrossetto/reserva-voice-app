// controller/reservaController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getPerfilCliente = async (req, res) => {
    try {
        const { telefone } = req.params;
        const empresaId = req.user.empresaId; // Vem do middleware de auth

        const historico = await prisma.cliente.findMany({
            where: { telefone, empresaId },
            orderBy: [{ data: 'desc' }, { horario: 'desc' }],
            take: 10
        });

        if (historico.length === 0) return res.json({ encontrado: false });

        const ultimo = historico[0];
        const canceladas = historico.filter(h => h.status === false).length;
        const obsCliente = historico.find(h => h.obsCliente)?.obsCliente;

        res.json({
            encontrado: true,
            perfil: {
                nome: ultimo.nome,
                telefone: ultimo.telefone,
                ultima_visita: ultimo.data,
                total_reservas: historico.length,
                canceladas,
                obs_cliente: obsCliente || "Nenhuma observação.",
                historico_recente: historico.slice(0, 4).map(h => h.data)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};