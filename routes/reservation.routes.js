const express = require("express");
const { PrismaClient } = require("@prisma/client");
const auth = require("../middlewares/authMiddleware");

const router = express.Router();
const prisma = new PrismaClient();

// ========================= HELPER FUNCTIONS =========================

/**
 * Valida formato de telefone brasileiro
 * Esperado: (XX) 9XXXX-XXXX ou 11911223344 ou variações
 */
function validatePhone(phone) {
    if (!phone) return false;
    const tel = String(phone).replaceAll(/\D/g, "");
    // Formato: 2 dígitos + 9 + 8 dígitos = 11 dígitos
    return /^[1-9]{2}9\d{8}$/.test(tel);
}

/**
 * Normaliza data para formato ISO (YYYY-MM-DD)
 * Aceita: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
 */
function normalizeDateForDb(date) {
    if (!date) return "";
    
    const d = String(date).trim();
    
    // Se já está em ISO, retorna
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    
    // Trata separadores
    const cleanDate = d.replaceAll("-", "/");
    const parts = cleanDate.split("/");
    
    if (parts.length !== 3) return "";
    
    let [day, month, year] = parts;
    
    // Ajusta se for ano de 2 dígitos
    if (year.length === 2) year = `20${year}`;
    
    // Valida se é DD/MM/YYYY ou YY/MM/DD (depende do tamanho do primeiro)
    let finalYear, finalMonth, finalDay;
    
    if (year.length === 4) {
        finalYear = year;
        finalMonth = String(month).padStart(2, "0");
        finalDay = String(day).padStart(2, "0");
    } else {
        return ""; // Formato inválido
    }
    
    return `${finalYear}-${finalMonth}-${finalDay}`;
}

/**
 * Normaliza horário para HH:MM:SS
 * Aceita: 14:30, 14;30, 14.30 -> 14:30:00
 */
function normalizeTimeForDb(time) {
    const t = String(time).trim().replaceAll(/[;.]/g, ":");
    
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(t)) {
        return "12:00:00"; // Fallback
    }
    
    return t.length === 5 ? `${t}:00` : t;
}

/**
 * Valida se o horário está dentro do funcionamento
 */
function validateBusinessHours(timeDb) {
    const start = "11:00:00";
    const end = "23:59:59";
    
    if (timeDb < start || timeDb > end) {
        return {
            valid: false,
            message: "Restaurante fechado neste horário (Funcionamento: 11:00 - 23:59)"
        };
    }
    
    return { valid: true };
}

/**
 * Valida estrutura de dados de reserva
 */
function validateReservationData(data) {
    const errors = [];
    
    // Nome obrigatório
    if (!data.nome || String(data.nome).trim() === "") {
        errors.push("Nome é obrigatório");
    }
    
    // Data obrigatória
    if (!data.data || String(data.data).trim() === "") {
        errors.push("Data é obrigatória");
    }
    
    // Número de pessoas obrigatório
    const numPessoas = Number.parseInt(data.numPessoas || data.num_pessoas || 0, 10);
    if (numPessoas <= 0) {
        errors.push("Número de pessoas deve ser maior que 0");
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Calcula tempo decorrido desde uma data
 */
function timeAgo(date) {
    const dt = new Date(date);
    const now = new Date();
    
    dt.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    
    const diff = Math.floor((now - dt) / (1000 * 60 * 60 * 24));
    
    if (diff < 0) return "Reserva Futura";
    if (diff === 0) return "Hoje";
    if (diff === 1) return "Ontem";
    if (diff < 30) return `${diff} dias atrás`;
    if (diff < 365) return `${Math.floor(diff / 30)} meses atrás`;
    
    return `${Math.floor(diff / 365)} anos atrás`;
}

/**
 * Formata histórico recente (últimas 4 datas)
 */
function formatRecentHistory(reservations) {
    const dates = new Set();
    
    for (const res of reservations) {
        if (dates.size >= 4) break;
        dates.add(new Date(res.data).toLocaleDateString('pt-BR'));
    }
    
    return Array.from(dates).join(", ");
}

// ========================= ENDPOINTS =========================

/**
 * 1. LIST RESERVATIONS
 * GET /api/reservations?date=YYYY-MM-DD
 */
router.get("/", auth, async (req, res) => {
    try {
        const { date } = req.query;
        const filter = { empresaId: req.user.empresaId };
        
        if (date) {
            const dateDb = normalizeDateForDb(date);
            if (dateDb) {
                filter.data = new Date(dateDb);
            }
        }
        
        const reservations = await prisma.cliente.findMany({
            where: filter,
            orderBy: { horario: 'asc' }
        });
        
        res.json({ success: true, reservations });
    } catch (err) {
        console.error("Erro ao listar reservas:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 2. CREATE RESERVATION (Manual/Modal)
 * POST /api/reservations
 * Body: {
 *   nome, telefone, data, horario, numPessoas,
 *   telefone2, formaPagamento, tipoEvento, valorRodizio,
 *   numMesa, observacoes, tortaTermoVela, churrascaria, executivo
 * }
 */
router.post("/", auth, async (req, res) => {
    try {
        const d = req.body;
        const empresaId = req.user.empresaId;
        const usuarioId = req.user.id;
        
        // ===== NORMALIZAÇÃO DE INPUTS =====
        const nome = String(d.nome || "").trim();
        const telefone = String(d.telefone || "").replaceAll(/\D/g, "");
        const dataBruto = String(d.data || "").trim();
        const horarioBruto = String(d.horario || "").trim();
        const numPessoas = Number.parseInt(d.numPessoas || d.num_pessoas || 0, 10);
        
        // ===== VALIDAÇÕES =====
        const dataValidation = validateReservationData({
            nome,
            data: dataBruto,
            numPessoas
        });
        
        if (!dataValidation.valid) {
            return res.status(400).json({
                success: false,
                error: "Validação falhou",
                details: dataValidation.errors
            });
        }
        
        // Normaliza data
        const dataDb = normalizeDateForDb(dataBruto);
        if (!dataDb) {
            return res.status(400).json({
                success: false,
                error: "Formato de data inválido. Use DD/MM/YYYY ou YYYY-MM-DD"
            });
        }
        
        // Valida se data não é anterior a hoje
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const dataSelecionada = new Date(dataDb);
        dataSelecionada.setHours(0, 0, 0, 0);
        
        if (dataSelecionada < hoje) {
            return res.status(400).json({
                success: false,
                error: "Erro: A data da reserva não pode ser anterior a hoje."
            });
        }
        
        // Normaliza horário
        const horarioDb = normalizeTimeForDb(horarioBruto);
        
        // Valida horário de funcionamento
        const hourValidation = validateBusinessHours(horarioDb);
        if (!hourValidation.valid) {
            return res.status(400).json({
                success: false,
                error: hourValidation.message
            });
        }
        
        // Valida telefone se fornecido
        if (telefone && !validatePhone(telefone)) {
            return res.status(400).json({
                success: false,
                error: "Formato de telefone inválido"
            });
        }
        
        // ===== CRIAR DATA COMPLETA (data + horário) =====
        const horarioCompleto = new Date(`${dataDb}T${horarioDb}`);
        
        // ===== SALVAR NO BANCO =====
        const reservation = await prisma.cliente.create({
            data: {
                empresaId,
                usuarioId,
                nome,
                data: new Date(dataDb), // Apenas data
                horario: horarioCompleto, // Data + Horário
                numPessoas, // Campo EXATO do schema
                telefone: telefone || null,
                telefone2: String(d.telefone2 || "").replaceAll(/\D/g, "") || null,
                tipoEvento: String(d.tipoEvento || d.tipo_evento || "Manual").trim(),
                formaPagamento: String(d.formaPagamento || d.forma_pagamento || "Não definido").trim(),
                valorRodizio: d.valorRodizio ? Number.parseFloat(d.valorRodizio) : null,
                numMesa: String(d.numMesa || d.num_mesa || "").trim(),
                observacoes: String(d.observacoes || "").trim(),
                tortaTermoVela: d.tortaTermoVela === true || d.torta_termo_vela === true,
                churrascaria: d.churrascaria === true || d.churrascaria === true,
                executivo: d.executivo === true || d.executivo === true
            }
        });
        
        // ===== GERAR LINK WHATSAPP =====
        let waLink = "";
        if (telefone) {
            const dataBr = new Date(dataDb).toLocaleDateString('pt-BR');
            const horaCurta = horarioDb.substring(0, 5);
            const msg = `Olá, ${nome}. Sua reserva para ${dataBr} às ${horaCurta} para ${numPessoas} pessoas foi confirmada!`;
            waLink = `https://wa.me/55${telefone}?text=${encodeURIComponent(msg)}`;
        }
        
        res.status(201).json({
            success: true,
            waLink,
            reservation
        });
        
    } catch (err) {
        console.error("Erro ao criar reserva:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 3. CLIENT PROFILE (History)
 * GET /api/reservations/profile/:phone
 */
router.get("/profile/:phone", auth, async (req, res) => {
    try {
        const phone = req.params.phone.replaceAll(/\D/g, "");
        
        const reservations = await prisma.cliente.findMany({
            where: {
                telefone: phone,
                empresaId: req.user.empresaId
            },
            orderBy: { data: 'desc' },
            take: 10
        });
        
        if (reservations.length === 0) {
            return res.json({ found: false });
        }
        
        const last = reservations[0];
        const cancelledCount = reservations.filter(c => c.status === false).length;
        
        res.json({
            found: true,
            profile: {
                id: last.id,
                nome: last.nome,
                telefone: last.telefone,
                ultima_visita_data: new Date(last.data).toLocaleDateString('pt-BR'),
                tempo_atras: timeAgo(last.data),
                historico_recente: formatRecentHistory(reservations),
                total_reservas: reservations.length,
                obs_cliente: last.obsCliente || last.observacoes || null,
                canceladas: cancelledCount
            }
        });
        
    } catch (err) {
        console.error("Erro ao buscar perfil:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 4. CHECK DUPLICATE
 * GET /api/reservations/check-duplicate?phone=&date=&name=
 */
router.get("/check-duplicate", auth, async (req, res) => {
    try {
        const { phone, date, name } = req.query;
        
        if (!phone || !date || !name) {
            return res.json({ exists: false });
        }
        
        const dateDb = normalizeDateForDb(date);
        if (!dateDb) {
            return res.json({ exists: false });
        }
        
        // Valida se data não é anterior a hoje
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const dataSelecionada = new Date(dateDb);
        dataSelecionada.setHours(0, 0, 0, 0);
        
        if (dataSelecionada < hoje) {
            return res.json({
                erro_data: true,
                msg: "A data selecionada é anterior à data de hoje."
            });
        }
        
        const exists = await prisma.cliente.findFirst({
            where: {
                empresaId: req.user.empresaId,
                nome: String(name).trim(),
                data: dataSelecionada,
                telefone: phone.replaceAll(/\D/g, "")
            }
        });
        
        res.json({ exists: !!exists });
        
    } catch (err) {
        console.error("Erro ao verificar duplicidade:", err);
        res.status(500).json({ exists: false, error: err.message });
    }
});

/**
 * 5. UPDATE CLIENT NAME
 * POST /api/reservations/update-client-name
 * Body: { telefone, nome }
 */
router.post("/update-client-name", auth, async (req, res) => {
    try {
        const { telefone, nome } = req.body;
        
        if (!telefone || !nome) {
            return res.status(400).json({
                success: false,
                error: "Telefone e nome são obrigatórios"
            });
        }
        
        const telNormalizado = String(telefone).replaceAll(/\D/g, "");
        const nomeNormalizado = String(nome).trim();
        
        // Atualiza todas as reservas deste cliente
        const updated = await prisma.cliente.updateMany({
            where: {
                empresaId: req.user.empresaId,
                telefone: telNormalizado
            },
            data: {
                nome: nomeNormalizado
            }
        });
        
        res.json({
            success: true,
            updatedCount: updated.count
        });
        
    } catch (err) {
        console.error("Erro ao atualizar nome:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 6. ANALYZE AND PROCESS WHATSAPP TEXT
 * POST /api/reservations/analyze-whatsapp
 * Body: { whatsText }
 * Retorna lista de reservas extraídas com validações
 */
router.post("/analyze-whatsapp", auth, async (req, res) => {
    try {
        const { whatsText } = req.body;
        
        if (!whatsText || whatsText.trim().length < 5) {
            return res.status(400).json({
                success: false,
                error: "Texto vazio ou muito curto"
            });
        }
        
        // Divide por blocos iniciados com "Nome:"
        const blocos = whatsText.split(/(?=Nome:)/i);
        const listaProcessada = [];
        
        for (const bloco of blocos) {
            if (!bloco.trim()) continue;
            
            const linhas = bloco.split("\n");
            const dados = {};
            
            // Parse das linhas
            for (const linha of linhas) {
                const partes = linha.split(":");
                if (partes.length < 2) continue;
                
                const chave = partes[0].trim().toLowerCase();
                const valor = partes.slice(1).join(":").trim();
                
                dados[chave] = valor;
            }
            
            const nome = (dados.nome || "").trim();
            if (!nome) continue;
            
            // Extrai e normaliza campos
            const telefoneRaw = (dados.telefone || "").replaceAll(/\D/g, "");
            const dataRaw = dados.data || "";
            const horarioRaw = dados.horário || dados.horario || "";
            const numPessoasRaw = dados["nº de pessoas"] || dados["nº pessoas"] || dados.pessoas || "0";
            const telefone2Raw = (dados["telefone alternativo"] || "").replaceAll(/\D/g, "");
            const tipoEvento = (dados["tipo de evento"] || "").trim();
            const formaPagamento = dados["forma de pagamento"] || dados.pagamento || "";
            const valorRodizio = (dados["valor do rodízio"] || "").trim();
            const numMesa = (dados.mesa || "").trim();
            const observacoes = dados.observações || dados.observacao || dados.obs || "";
            
            // Validações
            const erros = [];
            let dataDb = null;
            let horarioDb = null;
            
            // Valida telefone
            if (!telefoneRaw || !validatePhone(telefoneRaw)) {
                erros.push("Telefone inválido");
            }
            
            // Valida data
            if (!dataRaw) {
                erros.push("Data ausente");
            } else {
                dataDb = normalizeDateForDb(dataRaw);
                if (!dataDb) {
                    erros.push("Data inválida");
                } else {
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    const dataSel = new Date(dataDb);
                    dataSel.setHours(0, 0, 0, 0);
                    
                    if (dataSel < hoje) {
                        erros.push("Data antiga (Anterior a hoje)");
                    }
                }
            }
            
            // Valida horário
            if (!horarioRaw) {
                erros.push("Horário ausente");
            } else {
                horarioDb = normalizeTimeForDb(horarioRaw);
                const hourCheck = validateBusinessHours(horarioDb);
                if (!hourCheck.valid) {
                    erros.push(hourCheck.message);
                }
            }
            
            // Valida número de pessoas
            const numPessoas = Number.parseInt(numPessoasRaw, 10);
            if (numPessoas <= 0) {
                erros.push("Número de pessoas inválido");
            }
            
            // Verifica duplicidade
            let duplicado = false;
            if (erros.length === 0) {
                duplicado = !!(await prisma.cliente.findFirst({
                    where: {
                        empresaId: req.user.empresaId,
                        nome,
                        data: new Date(dataDb),
                        horario: new Date(`${dataDb}T${horarioDb}`),
                        numPessoas,
                        telefone: telefoneRaw
                    }
                }));
            }
            
            listaProcessada.push({
                valido: erros.length === 0,
                erros,
                duplicado,
                dados: {
                    nome,
                    data: dataDb,
                    horario: horarioDb,
                    numPessoas,
                    telefone: telefoneRaw,
                    telefone2: telefone2Raw || null,
                    tipoEvento,
                    formaPagamento,
                    valorRodizio,
                    numMesa,
                    observacoes
                }
            });
        }
        
        res.json({ success: true, lista: listaProcessada });
        
    } catch (err) {
        console.error("Erro ao analisar WhatsApp:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 7. SAVE FINAL LIST FROM WHATSAPP
 * POST /api/reservations/save-whatsapp-list
 * Body: { listaJson }
 */
router.post("/save-whatsapp-list", auth, async (req, res) => {
    try {
        const { listaJson } = req.body;
        const empresaId = req.user.empresaId;
        const usuarioId = req.user.id;
        
        if (!listaJson) {
            return res.status(400).json({ success: false, error: "Lista vazia" });
        }
        
        const lista = JSON.parse(listaJson);
        if (!Array.isArray(lista)) {
            return res.status(400).json({ success: false, error: "Formato inválido" });
        }
        
        const sucessos = [];
        const erros = [];
        
        for (const item of lista) {
            try {
                const horarioCompleto = new Date(`${item.data}T${item.horario}`);
                
                const reservation = await prisma.cliente.create({
                    data: {
                        empresaId,
                        usuarioId,
                        nome: item.nome,
                        data: new Date(item.data),
                        horario: horarioCompleto,
                        numPessoas: item.numPessoas,
                        telefone: item.telefone || null,
                        telefone2: item.telefone2 || null,
                        tipoEvento: item.tipoEvento || "WhatsApp",
                        formaPagamento: item.formaPagamento || "Não definido",
                        valorRodizio: item.valorRodizio ? Number.parseFloat(item.valorRodizio) : null,
                        numMesa: item.numMesa || "",
                        observacoes: item.observacoes || "Importado via WhatsApp"
                    }
                });
                
                // Gera link WhatsApp
                const dataBr = new Date(item.data).toLocaleDateString('pt-BR');
                const horaCurta = item.horario.substring(0, 5);
                const msg = `Olá, ${item.nome}. Sua reserva para ${dataBr} às ${horaCurta} para ${item.numPessoas} pessoas foi confirmada!`;
                const waLink = `https://wa.me/55${item.telefone}?text=${encodeURIComponent(msg)}`;
                
                sucessos.push({
                    nome: item.nome,
                    link: waLink
                });
                
            } catch (err) {
                erros.push({
                    nome: item.nome,
                    error: err.message
                });
            }
        }
        
        res.json({
            success: true,
            salvos: sucessos.length,
            erros: erros.length > 0 ? erros : undefined,
            links: sucessos
        });
        
    } catch (err) {
        console.error("Erro ao salvar lista:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 5B. CHECK TABLE - Verifica se mesa está ocupada na mesma data/hora
 * GET /api/reservations/check-table?table=&date=&time=
 */
router.get("/check-table", auth, async (req, res) => {
    try {
        const { table, date, time } = req.query;
        
        if (!table || !date || !time) {
            return res.json({ exists: false });
        }
        
        const dateDb = normalizeDateForDb(date);
        const timeDb = normalizeTimeForDb(time);
        
        if (!dateDb) {
            return res.json({ exists: false });
        }
        
        const horarioCompleto = new Date(`${dateDb}T${timeDb}`);
        
        const exists = await prisma.cliente.findFirst({
            where: {
                empresaId: req.user.empresaId,
                numMesa: String(table).trim(),
                data: new Date(dateDb),
                horario: horarioCompleto
            }
        });
        
        res.json({ exists: !!exists });
        
    } catch (err) {
        console.error("Erro ao verificar mesa:", err);
        res.status(500).json({ exists: false, error: err.message });
    }
});

module.exports = router;