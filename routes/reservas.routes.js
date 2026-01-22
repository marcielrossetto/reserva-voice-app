// routes/reservas.js - API de Reservas com validações

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// Funções auxiliares (mesma lógica do PHP)

function validarTelefone(telefone) {
    const tel = telefone.replace(/\D/g, '');
    return /^[1-9]{2}9\d{8}$/.test(tel);
}

function validarData(data) {
    data = data.trim();
    if (data === '') return false;

    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return true;

    if (!/^(0?[1-9]|[12][0-9]|3[01])[\/-](0?[1-9]|1[0-2])[\/-](\d{2}|\d{4})$/.test(data)) {
        return false;
    }

    return true;
}

function normalizarDataParaBanco(data) {
    data = data.trim();
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
    horario = horario.trim();
    if (horario === '') return false;
    return /^([01]\d|2[0-3])[:.;]([0-5]\d)$/.test(horario);
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

function normalizarHorarioParaBanco(horario) {
    horario = horario.trim();
    if (horario === '') return false;

    horario = horario.replace(/[;.]/g, ':');

    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(horario)) {
        return false;
    }

    return horario + ':00';
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

// ========================= ENDPOINTS =========================

// 1. ANÁLISE DE WHATSAPP
router.post('/analisar-whats', authMiddleware, async (req, res) => {
    const { whats_text } = req.body;
    const textoCompleto = (whats_text || '').trim();

    if (!textoCompleto) {
        return res.json({ success: false, message: 'Texto vazio.' });
    }

    const blocos = textoCompleto.split(/(?=Nome:)/i);
    const listaProcessada = [];

    for (const bloco of blocos) {
        const linhas = bloco.split('\n');
        const dados = {};

        for (const linha of linhas) {
            const [chave, ...valor] = linha.split(':');
            if (chave && valor.length > 0) {
                dados[chave.trim().toLowerCase()] = valor.join(':').trim();
            }
        }

        const nome = dados['nome'] || '';
        if (!nome) continue;

        const telefoneRaw = dados['telefone'] ? dados['telefone'].replace(/\D/g, '') : '';
        const dataRaw = dados['data'] || '';
        const horarioRaw = dados['horário'] || dados['horario'] || '';
        const num_pessoas = dados['nº de pessoas'] || dados['nº pessoas'] || dados['pessoas'] || '';
        const telefone2 = dados['telefone alternativo'] ? dados['telefone alternativo'].replace(/\D/g, '') : null;
        const tipo_evento = dados['tipo de evento'] || '';
        const forma_pagamento = dados['forma de pagamento'] || dados['pagamento'] || '';
        const valor_rodizio = dados['valor do rodízio'] || '';
        const num_mesa = dados['mesa'] || '';
        const observacoes = dados['observações'] || dados['observacao'] || dados['obs'] || '';

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
                erros.push("Data antiga (Anterior a hoje)");
            }
        }

        if (!horarioRaw || !validarHorario(horarioRaw)) {
            erros.push("Horário inválido");
        } else {
            horarioBanco = normalizarHorarioParaBanco(horarioRaw);
        }

        listaProcessada.push({
            valido: erros.length === 0,
            erros,
            dados: {
                nome,
                data: dataBanco,
                horario: horarioBanco,
                num_pessoas,
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
});

// 2. BUSCAR PERFIL POR TELEFONE
router.get('/perfil/:telefone', authMiddleware, async (req, res) => {
    const telefone = req.params.telefone.replace(/\D/g, '');
    const empresa_id = req.userData.empresa_id;

    try {
        const db = require('../config/db');
        const query = `
            SELECT * FROM clientes 
            WHERE telefone = $1 AND empresa_id = $2
            ORDER BY data DESC, horario DESC
            LIMIT 50
        `;
        
        const result = await db.query(query, [telefone, empresa_id]);
        const historico = result.rows || [];

        if (historico.length > 0) {
            const ultimo = historico[0];
            const total = historico.length;
            let canceladas = 0;
            let obsClienteEncontrada = null;
            const ultimasDatas = [];
            let contadorRecentes = 0;

            for (const h of historico) {
                if (h.status === 0) canceladas++;
                if (!obsClienteEncontrada && h.obscliente) {
                    obsClienteEncontrada = h.obscliente;
                }
                if (contadorRecentes < 4) {
                    ultimasDatas.push(new Date(h.data).toLocaleDateString('pt-BR'));
                    contadorRecentes++;
                }
            }

            const perfil = {
                id: ultimo.id,
                nome: ultimo.nome,
                telefone: ultimo.telefone,
                ultima_visita_data: new Date(ultimo.data).toLocaleDateString('pt-BR'),
                tempo_atras: tempoAtras(ultimo.data),
                historico_recente: ultimasDatas.join(", "),
                total_reservas: total,
                obs_cliente: obsClienteEncontrada,
                canceladas
            };

            return res.json({ encontrado: true, perfil });
        }

        res.json({ encontrado: false });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
});

// 3. SALVAR RESERVA MANUAL
router.post('/salvar', authMiddleware, async (req, res) => {
    const usuario_id = req.userData.user_id;
    const empresa_id = req.userData.empresa_id;

    const {
        nome,
        data,
        num_pessoas,
        horario,
        telefone,
        telefone2,
        tipo_evento,
        forma_pagamento,
        valor_rodizio,
        num_mesa,
        observacoes,
        torta_termo_vela,
        churrascaria,
        executivo
    } = req.body;

    try {
        const dataBanco = normalizarDataParaBanco(data);
        const horarioBanco = normalizarHorarioParaBanco(horario);
        const validaHora = validarHorarioFuncionamento(horarioBanco);
        const hoje = new Date().toISOString().split('T')[0];

        if (validaHora !== true) {
            return res.json({ success: false, message: validaHora });
        }

        if (dataBanco < hoje) {
            return res.json({ success: false, message: 'Erro: A data da reserva não pode ser anterior a hoje.' });
        }

        const db = require('../config/db');
        const query = `
            INSERT INTO clientes 
            (usuario_id, empresa_id, nome, data, num_pessoas, horario, telefone, telefone2, tipo_evento, forma_pagamento, valor_rodizio, num_mesa, torta_termo_vela, churrascaria, executivo, observacoes) 
            VALUES 
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING id
        `;

        const result = await db.query(query, [
            usuario_id, empresa_id, nome, dataBanco, num_pessoas, horarioBanco,
            telefone || null, telefone2 || null, tipo_evento, forma_pagamento,
            valor_rodizio, num_mesa, torta_termo_vela ? 1 : 0, churrascaria ? 1 : 0, executivo ? 1 : 0, observacoes
        ]);

        let link_wpp = '';
        if (telefone) {
            const dataBr = new Date(dataBanco).toLocaleDateString('pt-BR');
            const horaCurta = horarioBanco.substring(0, 5);
            const msg = `Olá, ${nome}. Sua reserva para ${dataBr} às ${horaCurta} para ${num_pessoas} pessoas foi confirmada.`;
            link_wpp = `https://wa.me/55${telefone}?text=${encodeURIComponent(msg)}`;
        }

        res.json({ success: true, link_wpp });

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: 'Erro ao salvar no banco de dados.' });
    }
});

// 4. VERIFICAR DUPLICIDADE
router.get('/checar-duplicidade', authMiddleware, async (req, res) => {
    const { telefone, data, nome } = req.query;
    const empresa_id = req.userData.empresa_id;

    try {
        const dataBanco = normalizarDataParaBanco(data);
        const hoje = new Date().toISOString().split('T')[0];

        if (dataBanco < hoje) {
            return res.json({ erro_data: true, msg: 'A data selecionada é anterior à data de hoje.' });
        }

        const db = require('../config/db');
        const query = `
            SELECT id FROM clientes 
            WHERE telefone = $1 AND data = $2 AND nome = $3 AND empresa_id = $4
            LIMIT 1
        `;

        const result = await db.query(query, [telefone, dataBanco, nome, empresa_id]);
        res.json({ existe: result.rows.length > 0 });

    } catch (error) {
        console.error(error);
        res.json({ existe: false });
    }
});

// 5. ATUALIZAR NOME CLIENTE
router.post('/atualizar-nome', authMiddleware, async (req, res) => {
    const { nome, telefone } = req.body;
    const empresa_id = req.userData.empresa_id;

    if (!nome || !telefone) {
        return res.json({ success: false, message: 'Nome ou telefone inválido.' });
    }

    try {
        const db = require('../config/db');
        const query = `
            UPDATE clientes 
            SET nome = $1 
            WHERE telefone = $2 AND empresa_id = $3
        `;

        await db.query(query, [nome, telefone, empresa_id]);
        res.json({ success: true });

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: 'Erro ao atualizar.' });
    }
});

// 6. LISTAR RESERVAS
router.get('/', authMiddleware, async (req, res) => {
    const empresa_id = req.userData.empresa_id;

    try {
        const db = require('../config/db');
        const query = `
            SELECT * FROM clientes 
            WHERE empresa_id = $1
            ORDER BY data DESC
            LIMIT 100
        `;

        const result = await db.query(query, [empresa_id]);
        res.json({ reservas: result.rows });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao listar reservas' });
    }
});

module.exports = router;