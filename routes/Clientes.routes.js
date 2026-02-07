// routes/clientes.routes.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const auth = require("../middlewares/authMiddleware");

const router = express.Router();
const prisma = new PrismaClient();

// ========================= FUNÇÕES AUXILIARES =========================
function validarTelefone(telefone) {
    const tel = telefone.replace(/\D/g, '');
    return /^[1-9]{2}9\d{8}$/.test(tel);
}

function validarData(data) {
    if (!data || data.trim() === '') return false;
    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return true;
    return /^(0?[1-9]|[12][0-9]|3[01])[\/-](0?[1-9]|1[0-2])[\/-](\d{2}|\d{4})$/.test(data);
}

function normalizarDataParaBanco(data) {
    if (!data || data.trim() === '') return false;
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;
    
    data = data.replace(/-/g, '/');
    const partes = data.split('/');
    if (partes.length !== 3) return false;
    
    let [dia, mes, ano] = partes;
    dia = String(dia).padStart(2, '0');
    mes = String(mes).padStart(2, '0');
    
    if (ano.length === 2) ano = '20' + ano;
    
    return `${ano}-${mes}-${dia}`;
}

function validarHorario(horario) {
    const h = horario.trim();
    if (!h) return false;
    return /^([01]\d|2[0-3])[:.;]([0-5]\d)$/.test(h);
}

function normalizarHorarioParaBanco(horario) {
    let h = horario.trim().replace(/[;.]/g, ':');
    
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(h)) {
        return false;
    }
    
    return h + ':00';
}

function tempoAtras(data) {
    const dt = new Date(data);
    const now = new Date();

    dt.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    if (dt > now) return "Reserva Futura";

    const diff = Math.floor((now - dt) / (1000 * 60 * 60 * 24));

    if (diff === 0) return "Hoje";
    if (diff === 1) return "Ontem";
    if (diff < 30) return `${diff} dias atrás`;
    if (diff < 365) return `${Math.floor(diff / 30)} meses atrás`;
    
    return `${Math.floor(diff / 365)} anos atrás`;
}

// ========================= GET: BUSCAR PERFIL =========================
router.get("/perfil", auth, async (req, res) => {
    try {
        const telefone = req.query.telefone.replace(/\D/g, '');
        const empresaId = req.user.empresaId;

        const historico = await prisma.cliente.findMany({
            where: {
                telefone,
                empresaId,
                status: true
            },
            orderBy: [{ data: 'desc' }, { horario: 'desc' }],
            take: 10
        });

        if (historico.length > 0) {
            const ultimo = historico[0];
            const total = await prisma.cliente.count({
                where: { telefone, empresaId }
            });

            const canceladas = await prisma.cliente.count({
                where: {
                    telefone,
                    empresaId,
                    status: false
                }
            });

            const ultimasDatas = historico.slice(0, 4).map(h => 
                new Date(h.data).toLocaleDateString('pt-BR')
            );

            const perfil = {
                id: ultimo.id,
                nome: ultimo.nome,
                telefone: ultimo.telefone,
                ultima_visita_data: new Date(ultimo.data).toLocaleDateString('pt-BR'),
                tempo_atras: tempoAtras(ultimo.data),
                historico_recente: ultimasDatas.join(", "),
                total_reservas: total,
                obs_cliente: ultimo.obsCliente || null,
                canceladas
            };

            res.json({ encontrado: true, perfil });
        } else {
            res.json({ encontrado: false });
        }
    } catch (err) {
        console.error("❌ Erro em /perfil:", err);
        res.status(500).json({ erro: err.message });
    }
});

// ========================= GET: CHECAR DUPLICIDADE =========================
router.get("/duplicidade", auth, async (req, res) => {
    try {
        const telefone = req.query.telefone.replace(/\D/g, '');
        const data = normalizarDataParaBanco(req.query.data);
        const nome = req.query.nome;
        const empresaId = req.user.empresaId;

        if (data < new Date().toISOString().split('T')[0]) {
            return res.json({ erro_data: true, msg: 'Data anterior a hoje' });
        }

        const existe = await prisma.cliente.findFirst({
            where: {
                telefone,
                data: new Date(data),
                nome,
                empresaId
            }
        });

        res.json({ existe: !!existe });
    } catch (err) {
        console.error("❌ Erro em /duplicidade:", err);
        res.status(500).json({ erro: err.message });
    }
});

// ========================= POST: CRIAR RESERVA MANUAL =========================
router.post("/criar", auth, async (req, res) => {
    try {
        const usuario_id = req.user.id;
        const empresaId = req.user.empresaId;

        const nome = req.body.nome?.trim() || '';
        const data = normalizarDataParaBanco(req.body.data);
        const num_pessoas = parseInt(req.body.num_pessoas) || 0;
        const horario = normalizarHorarioParaBanco(req.body.horario);
        const telefone = req.body.telefone?.replace(/\D/g, '') || null;
        const telefone2 = req.body.telefone2?.replace(/\D/g, '') || null;
        const tipo_evento = req.body.tipo_evento?.trim() || '';
        const forma_pagamento = req.body.forma_pagamento?.trim() || '';
        const valor_rodizio = req.body.valor_rodizio?.trim() || null;
        const num_mesa = req.body.num_mesa?.trim() || '';
        const observacoes = req.body.observacoes?.trim() || '';

        const torta = req.body.torta_termo_vela ? 1 : 0;
        const churrascaria = req.body.churrascaria ? 1 : 0;
        const executivo = req.body.executivo ? 1 : 0;

        // Validações
        if (!nome) {
            return res.json({ success: false, message: 'Nome é obrigatório' });
        }

        if (!data || data < new Date().toISOString().split('T')[0]) {
            return res.json({ success: false, message: 'Data inválida ou anterior a hoje' });
        }

        if (!horario) {
            return res.json({ success: false, message: 'Horário inválido' });
        }

        // Criar reserva
        const cliente = await prisma.cliente.create({
            data: {
                empresaId,
                nome,
                data: new Date(data),
                numPessoas: num_pessoas,
                horario: new Date(`${data}T${horario}`),
                telefone: telefone || null,
                telefone2: telefone2 || null,
                tipoEvento: tipo_evento,
                formaPagamento: forma_pagamento,
                valorRodizio: valor_rodizio ? parseInt(valor_rodizio) : null,
                numMesa: num_mesa,
                observacoes,
                tortaTermoVela: torta === 1,
                churrascaria: churrascaria === 1,
                executivo: executivo === 1,
                status: true,
                usuarioId: usuario_id
            }
        });

        let link_wpp = '';
        if (telefone) {
            const dataBr = new Date(data).toLocaleDateString('pt-BR');
            const horaCurta = horario.substring(0, 5);
            const msg = `Olá ${nome}. Sua reserva para ${dataBr} às ${horaCurta} para ${num_pessoas} pessoas foi confirmada.`;
            link_wpp = `https://wa.me/55${telefone}?text=${encodeURIComponent(msg)}`;
        }

        // Verificar capacidade diária
        let avisoCapacidade = null;
        try {
            const empresa = await prisma.empresa.findUnique({
                where: { id: empresaId },
                select: { capacidadeAlmoco: true, capacidadeJanta: true }
            });

            const isAlmoco = horario <= '15:00:00';
            const capacidade = isAlmoco ? empresa.capacidadeAlmoco : empresa.capacidadeJanta;
            const periodo = isAlmoco ? 'almoço' : 'jantar';

            if (capacidade) {
                const totalReservado = await prisma.cliente.aggregate({
                    where: {
                        empresaId,
                        data: new Date(data),
                        status: true,
                        horario: isAlmoco ? { lte: new Date(`${data}T15:00:00`) } : { gt: new Date(`${data}T15:00:00`) }
                    },
                    _sum: { numPessoas: true }
                });

                const total = totalReservado._sum.numPessoas || 0;
                if (total > capacidade) {
                    avisoCapacidade = `Atenção: a capacidade do ${periodo} (${capacidade} pessoas) foi excedida. Total reservado: ${total} pessoas.`;
                }
            }
        } catch (capErr) { console.error('Erro ao verificar capacidade:', capErr); }

        res.json({ success: true, link_wpp, avisoCapacidade });
    } catch (err) {
        console.error("❌ Erro em POST /criar:", err);
        res.status(500).json({ success: false, message: 'Erro ao salvar' });
    }
});

// ========================= POST: ANALISAR WHATSAPP =========================
router.post("/analisar-whats", auth, async (req, res) => {
    try {
        const texto = req.body.whats_text?.trim() || '';
        const empresaId = req.user.empresaId;

        if (!texto) {
            return res.json({ success: false, message: 'Texto vazio' });
        }

        // Dividir por "Nome:"
        const blocos = texto.split(/(?=Nome:)/i);
        const listaProcessada = [];

        for (const bloco of blocos) {
            const linhas = bloco.split('\n');
            const dados = {};

            for (const linha of linhas) {
                const partes = linha.split(':');
                if (partes.length === 2) {
                    const chave = partes[0].trim().toLowerCase();
                    const valor = partes[1].trim();
                    dados[chave] = valor;
                }
            }

            const nome = dados.nome?.trim() || '';
            if (!nome) continue;

            const telefoneRaw = dados.telefone?.replace(/\D/g, '') || '';
            const dataRaw = dados.data?.trim() || '';
            const horarioRaw = dados.horário?.trim() || dados.horario?.trim() || '';
            const num_pessoas = dados['nº de pessoas']?.trim() || dados['nº pessoas']?.trim() || dados.pessoas?.trim() || '';
            const telefone2 = dados['telefone alternativo']?.replace(/\D/g, '') || null;
            const tipo_evento = dados['tipo de evento']?.trim() || '';
            const forma_pagamento = dados['forma de pagamento']?.trim() || dados.pagamento?.trim() || '';
            const valor_rodizio = dados['valor do rodízio']?.trim() || '';
            const num_mesa = dados.mesa?.trim() || '';
            const observacoes = dados.observações?.trim() || dados.observacao?.trim() || dados.obs?.trim() || '';

            const erros = [];
            let dataBanco = null;
            let horarioBanco = null;

            if (!telefoneRaw || !validarTelefone(telefoneRaw)) {
                erros.push("Telefone inválido");
            }

            if (!dataRaw || !validarData(dataRaw)) {
                erros.push("Data inválida");
            } else {
                dataBanco = normalizarDataParaBanco(dataRaw);
                if (dataBanco < new Date().toISOString().split('T')[0]) {
                    erros.push("Data antiga");
                }
            }

            if (!horarioRaw || !validarHorario(horarioRaw)) {
                erros.push("Horário inválido");
            } else {
                horarioBanco = normalizarHorarioParaBanco(horarioRaw);
            }

            let duplicado = false;
            if (erros.length === 0) {
                const existe = await prisma.cliente.findFirst({
                    where: {
                        nome,
                        data: new Date(dataBanco),
                        horario: new Date(`${dataBanco}T${horarioBanco}`),
                        numPessoas: parseInt(num_pessoas),
                        empresaId
                    }
                });
                duplicado = !!existe;
            }

            listaProcessada.push({
                valido: erros.length === 0,
                erros,
                duplicado,
                dados: {
                    nome,
                    data: dataBanco,
                    horario: horarioBanco,
                    num_pessoas: parseInt(num_pessoas),
                    telefone: telefoneRaw,
                    telefone2,
                    tipo_evento,
                    forma_pagamento,
                    valor_rodizio,
                    num_mesa,
                    observacoes
                }
            });
        }

        res.json({ success: true, lista: listaProcessada });
    } catch (err) {
        console.error("❌ Erro em /analisar-whats:", err);
        res.status(500).json({ success: false, message: 'Erro ao processar' });
    }
});

// ========================= POST: SALVAR LISTA FINAL =========================
router.post("/salvar-lista", auth, async (req, res) => {
    try {
        const usuario_id = req.user.id;
        const empresaId = req.user.empresaId;
        const lista = JSON.parse(req.body.lista_json || '[]');

        let sucessos = 0;
        const links = [];

        for (const item of lista) {
            try {
                const cliente = await prisma.cliente.create({
                    data: {
                        empresaId,
                        nome: item.nome,
                        data: new Date(item.data),
                        numPessoas: parseInt(item.num_pessoas),
                        horario: new Date(`${item.data}T${item.horario}`),
                        telefone: item.telefone || null,
                        telefone2: item.telefone2,
                        tipoEvento: item.tipo_evento,
                        formaPagamento: item.forma_pagamento,
                        valorRodizio: item.valor_rodizio ? parseInt(item.valor_rodizio) : null,
                        numMesa: item.num_mesa,
                        observacoes: item.observacoes,
                        status: true,
                        usuarioId: usuario_id
                    }
                });

                if (item.telefone) {
                    const dataBr = new Date(item.data).toLocaleDateString('pt-BR');
                    const horaCurta = item.horario.substring(0, 5);
                    const msg = `Olá ${item.nome}. Sua reserva para ${dataBr} às ${horaCurta} para ${item.num_pessoas} pessoas foi confirmada.`;
                    const link = `https://wa.me/55${item.telefone}?text=${encodeURIComponent(msg)}`;
                    links.push({ nome: item.nome, link });
                }

                sucessos++;
            } catch (e) {
                console.error(`Erro ao salvar ${item.nome}:`, e);
            }
        }

        res.json({ success: true, salvos: sucessos, links });
    } catch (err) {
        console.error("❌ Erro em /salvar-lista:", err);
        res.status(500).json({ success: false, message: 'Erro ao processar lista' });
    }
});

module.exports = router;