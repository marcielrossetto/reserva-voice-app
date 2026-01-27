const express = require("express");
const { PrismaClient } = require("@prisma/client");
const auth = require("../middlewares/authMiddleware");

const router = express.Router();
const prisma = new PrismaClient();

// ========================= HELPER FUNCTIONS =========================

function validatePhone(phone) {
    if (!phone) return false;
    const tel = String(phone).replaceAll(/\D/g, "");
    return /^[1-9]{2}9\d{8}$/.test(tel);
}

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

function normalizeTimeForDb(time) {
    let t = String(time).trim().toLowerCase();
    
    t = t.replace(/\s*horas?\s*/g, '').trim();
    t = t.replaceAll(/[;.]/g, ":");
    
    const match = t.match(/(\d{1,2}):?(\d{2})?/);
    if (!match) return "12:00:00";
    
    let hour = String(match[1]).padStart(2, '0');
    let min = match[2] ? String(match[2]).padStart(2, '0') : '00';
    
    if (Number(hour) > 23 || Number(min) > 59) {
        return "12:00:00";
    }
    
    return `${hour}:${min}:00`;
}

function validateBusinessHours(timeDb) {
    const start = "11:00:00";
    const end = "23:59:59";
    
    if (timeDb < start || timeDb > end) {
        return {
            valid: false,
            message: "Restaurante fechado neste horário (11:00 - 23:59)"
        };
    }
    
    return { valid: true };
}

function validateReservationData(data) {
    const errors = [];
    
    if (!data.nome || String(data.nome).trim() === "") {
        errors.push("Nome é obrigatório");
    }
    
    if (!data.data || String(data.data).trim() === "") {
        errors.push("Data é obrigatória");
    }
    
    const numPessoas = Number.parseInt(data.numPessoas || data.num_pessoas || 0, 10);
    if (numPessoas <= 0) {
        errors.push("Número de pessoas deve ser maior que 0");
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

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
 */
router.post("/", auth, async (req, res) => {
    try {
        const d = req.body;
        const empresaId = req.user.empresaId;
        const usuarioId = req.user.id;
        
        const nome = String(d.nome || "").trim();
        const telefone = String(d.telefone || "").replaceAll(/\D/g, "");
        const dataBruto = String(d.data || "").trim();
        const horarioBruto = String(d.horario || "").trim();
        const numPessoas = Number.parseInt(d.numPessoas || d.num_pessoas || 0, 10);
        
        console.log('📝 CREATE RESERVATION:', {dataBruto, horarioBruto, nome});
        
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
        
        const dataDb = normalizeDateForDb(dataBruto);
        
        if (!dataDb) {
            return res.status(400).json({
                success: false,
                error: "Formato de data inválido"
            });
        }
        
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
        
        const horarioDb = normalizeTimeForDb(horarioBruto);
        
        const hourValidation = validateBusinessHours(horarioDb);
        if (!hourValidation.valid) {
            return res.status(400).json({
                success: false,
                error: hourValidation.message
            });
        }
        
        if (telefone && !validatePhone(telefone)) {
            return res.status(400).json({
                success: false,
                error: "Formato de telefone inválido"
            });
        }
        
        const dataObj = new Date(dataDb);
        
        const reservation = await prisma.cliente.create({
            data: {
                empresaId,
                usuarioId,
                nome,
                data: dataObj,
                horario: horarioDb,
                numPessoas,
                telefone: telefone || null,
                telefone2: String(d.telefone2 || "").replaceAll(/\D/g, "") || null,
                tipoEvento: String(d.tipoEvento || d.tipo_evento || "Manual").trim(),
                formaPagamento: String(d.formaPagamento || d.forma_pagamento || "Não definido").trim(),
                valorRodizio: d.valorRodizio ? Number.parseFloat(d.valorRodizio) : null,
                numMesa: String(d.numMesa || d.num_mesa || "").trim(),
                observacoes: String(d.observacoes || "").trim(),
                tortaTermoVela: d.tortaTermoVela === true || d.torta_termo_vela === true,
                churrascaria: d.churrascaria === true,
                executivo: d.executivo === true
            }
        });
        
        console.log(`✅ Salvo: data=${reservation.data}, horario=${reservation.horario}`);
        
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
        console.error("❌ Erro ao criar reserva:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 3. CLIENT PROFILE
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
                canceladas: cancelledCount,
                ultimas_reservas: reservations.slice(0, 5).map(r => ({
                    data: new Date(r.data).toLocaleDateString('pt-BR'),
                    horario: r.horario ? r.horario.substring(0, 5) : '--',
                    numPessoas: r.numPessoas
                }))
            }
        });
        
    } catch (err) {
        console.error("Erro ao buscar perfil:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 4. CHECK DUPLICATE
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
 * 6. ANALYZE WHATSAPP
 */
router.post("/analyze-whatsapp", auth, async (req, res) => {
    try {
        const { whatsText } = req.body;
        
        console.log('🔍 Analisando WhatsApp');
        
        if (!whatsText || whatsText.trim().length < 5) {
            return res.json({
                success: false,
                error: "Texto vazio"
            });
        }
        
        const blocos = whatsText.split(/\n\n+/).filter(b => b.trim());
        const blocosParaProcessar = blocos.length > 1 ? blocos : [whatsText];
        
        const listaProcessada = [];
        
        for (const bloco of blocosParaProcessar) {
            const linhas = bloco.split("\n");
            const dados = {};
            
            for (const linha of linhas) {
                if (!linha.includes(":")) continue;
                
                const [chave, ...resto] = linha.split(":");
                const key = chave.trim().toLowerCase();
                const val = resto.join(":").trim();
                
                if (!val) continue;
                dados[key] = val;
            }
            
            const nome = (dados.nome || "").trim();
            if (!nome) continue;
            
            const telefoneRaw = (dados.telefone || dados.tel || "").replaceAll(/\D/g, "");
            const dataRaw = dados.data || dados.date || "";
            const horarioRaw = dados.horário || dados.horario || dados.hora || "";
            const numPessoasRaw = (dados.pessoas || dados.pax || dados["nº de pessoas"] || "0").replaceAll(/\D/g, "");
            const numMesa = (dados.mesa || dados.salao || "").trim();
            const observacoes = (dados.obs || dados.observação || dados.observacoes || "").trim();
            
            const erros = [];
            let dataDb = null;
            let horarioDb = null;
            
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
                        erros.push("Data anterior a hoje");
                    }
                }
            }
            
            if (!horarioRaw) {
                erros.push("Horário ausente");
            } else {
                horarioDb = normalizeTimeForDb(horarioRaw);
                if (!/^\d{2}:\d{2}:\d{2}$/.test(horarioDb)) {
                    erros.push("Horário inválido");
                } else {
                    const hourCheck = validateBusinessHours(horarioDb);
                    if (!hourCheck.valid) {
                        erros.push("Fora do horário");
                    }
                }
            }
            
            const numPessoas = Number.parseInt(numPessoasRaw, 10);
            if (numPessoas <= 0) {
                erros.push("Nº pessoas inválido");
            }
            
            if (telefoneRaw && !validatePhone(telefoneRaw)) {
                erros.push("Telefone inválido");
            }
            
            let duplicado = false;
            if (erros.length === 0 && dataDb && horarioDb) {
                try {
                    const existe = await prisma.cliente.findFirst({
                        where: {
                            empresaId: req.user.empresaId,
                            nome,
                            data: new Date(dataDb)
                        }
                    });
                    duplicado = !!existe;
                } catch (err) {
                    console.warn("Erro ao verificar duplicidade:", err);
                }
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
                    telefone: telefoneRaw || null,
                    telefone2: null,
                    tipoEvento: "WhatsApp",
                    formaPagamento: "Não definido",
                    valorRodizio: null,
                    numMesa: numMesa || null,
                    observacoes: observacoes || null
                }
            });
        }
        
        console.log(`✅ ${listaProcessada.length} reserva(s) extraída(s)`);
        
        if (listaProcessada.length === 0) {
            return res.json({ 
                success: false, 
                error: "Nenhuma reserva encontrada" 
            });
        }
        
        res.json({ success: true, lista: listaProcessada });
        
    } catch (err) {
        console.error("❌ Erro ao analisar WhatsApp:", err);
        res.json({ success: false, error: err.message });
    }
});

/**
 * 7. SAVE WHATSAPP LIST
 */
router.post("/save-whatsapp-list", auth, async (req, res) => {
    try {
        const { listaJson } = req.body;
        const empresaId = req.user.empresaId;
        const usuarioId = req.user.id;
        
        console.log('💾 Salvando lista WhatsApp');
        
        if (!listaJson) {
            return res.json({ success: false, error: "Lista vazia" });
        }
        
        let lista;
        try {
            lista = JSON.parse(listaJson);
        } catch (err) {
            console.error('❌ Erro ao fazer parse do JSON:', err);
            return res.json({ success: false, error: "JSON inválido" });
        }
        
        if (!Array.isArray(lista)) {
            lista = [lista];
        }
        
        const sucessos = [];
        const erros = [];
        
        for (const item of lista) {
            try {
                console.log(`📝 Processando: ${item.nome}, data=${item.data}, horario=${item.horario}`);
                
                if (!item.data || !item.horario) {
                    erros.push({
                        nome: item.nome,
                        error: "Data ou horário faltando"
                    });
                    continue;
                }
                
                const dataObj = new Date(item.data);
                
                const reservation = await prisma.cliente.create({
                    data: {
                        empresaId,
                        usuarioId,
                        nome: item.nome,
                        data: dataObj,
                        horario: item.horario,
                        numPessoas: parseInt(item.numPessoas, 10) || 1,
                        telefone: item.telefone || null,
                        telefone2: item.telefone2 || null,
                        tipoEvento: item.tipoEvento || "WhatsApp",
                        formaPagamento: item.formaPagamento || "Não definido",
                        valorRodizio: item.valorRodizio ? parseFloat(item.valorRodizio) : null,
                        numMesa: item.numMesa || null,
                        observacoes: item.observacoes || "Importado via WhatsApp"
                    }
                });
                
                console.log(`✅ Salvo: ID=${reservation.id}, horario=${reservation.horario}`);
                
                let link = null;
                if (item.telefone) {
                    const dataBr = new Date(item.data).toLocaleDateString('pt-BR');
                    const horaCurta = item.horario.substring(0, 5);
                    const msg = `Olá, ${item.nome}. Sua reserva para ${dataBr} às ${horaCurta} para ${item.numPessoas} pessoas foi confirmada!`;
                    link = `https://wa.me/55${item.telefone}?text=${encodeURIComponent(msg)}`;
                }
                
                sucessos.push({
                    nome: item.nome,
                    link: link
                });
                
            } catch (err) {
                console.error(`❌ Erro ao salvar ${item.nome}:`, err.message);
                erros.push({
                    nome: item.nome,
                    error: err.message
                });
            }
        }
        
        console.log(`🎯 Total: ${sucessos.length} salvas, ${erros.length} erros`);
        
        res.json({
            success: sucessos.length > 0,
            salvos: sucessos.length,
            erros: erros.length > 0 ? erros : undefined,
            links: sucessos
        });
        
    } catch (err) {
        console.error("❌ Erro geral ao salvar lista:", err);
        res.json({ success: false, error: err.message });
    }
});

/**
 * 8. CHECK TABLE
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
        
        const exists = await prisma.cliente.findFirst({
            where: {
                empresaId: req.user.empresaId,
                numMesa: String(table).trim(),
                data: new Date(dateDb),
                horario: timeDb
            }
        });
        
        res.json({ exists: !!exists });
        
    } catch (err) {
        console.error("Erro ao verificar mesa:", err);
        res.status(500).json({ exists: false, error: err.message });
    }
});

module.exports = router;