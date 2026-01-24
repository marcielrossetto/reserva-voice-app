/**
 * Normaliza telefone brasileiro
 * (11) 91122-3344 -> 11911223344
 */
function normalizePhone(phone) {
    const cleaned = String(phone).replaceAll(/\D/g, '');
    // Valida: 2 dígitos + 9 + 8 dígitos
    if (/^[1-9]{2}9\d{8}$/.test(cleaned)) {
        return cleaned;
    }
    return null;
}

/**
 * Normaliza data para YYYY-MM-DD
 * Aceita: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, hoje, amanha
 */
function normalizeDate(dateStr, hoje = new Date()) {
    const lower = String(dateStr).toLowerCase().trim();
    
    if (lower === 'hoje') {
        return hoje.toISOString().split('T')[0];
    }
    
    if (lower === 'amanha' || lower === 'amanhã') {
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);
        return amanha.toISOString().split('T')[0];
    }
    
    // DD/MM/YYYY, DD-MM-YYYY ou DD.MM.YYYY (com ponto)
    const match = dateStr.match(/(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?/);
    if (match) {
        let [, day, month, year] = match;
        
        day = String(day).padStart(2, '0');
        month = String(month).padStart(2, '0');
        
        if (!year) {
            year = hoje.getFullYear();
        } else if (year.length === 2) {
            year = '20' + year;
        }
        
        return `${year}-${month}-${day}`;
    }
    
    return null;
}

/**
 * Normaliza horário para HH:MM
 * Aceita: 19, 19:30, 19h30, 19h, 19 horas, 21 horas
 */
function normalizeHour(hourStr) {
    const match = String(hourStr).match(/(\d{1,2})(?:[:.,](\d{2}))?/);
    if (!match) return null;
    
    let hour = String(match[1]).padStart(2, '0');
    let min = match[2] ? String(match[2]).padStart(2, '0') : '00';
    
    if (Number(hour) > 23) return null;
    if (Number(min) > 59) return null;
    
    return `${hour}:${min}`;
}

/**
 * Parse inteligente de reserva via WhatsApp
 */
function parseReserva(texto) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const resultado = {
        nome: { value: null, score: 0 },
        telefone: { value: null, score: 0 },
        data: { value: null, score: 0 },
        horario: { value: null, score: 0 },
        pessoas: { value: null, score: 0 },
        pagamento: { value: null, score: 0 },
        mesa: { value: null, score: 0 },
        observacoes: { value: null, score: 1 }
    };
    
    const lower = texto.toLowerCase();
    let textoLimpo = texto;
    
    // 👤 NOME - PRIMEIRO (antes de quebrar o texto)
    const nomeMatch = texto.match(/^([a-záàâãéèêíïóôõöúçñ\s]+?)(?:\n|:)/i);
    if (nomeMatch && nomeMatch[1].trim().length > 2) {
        const nome = nomeMatch[1].trim();
        resultado.nome.value = nome;
        resultado.nome.score = 0.95;
        textoLimpo = textoLimpo.replace(nome, '');
    }
    
    // 📞 TELEFONE
    const telMatch = texto.match(/Telefone:\s*([0-9\/\-\(\)\s]+)/i);
    if (telMatch) {
        const telRaw = telMatch[1].trim();
        const telefone = normalizePhone(telRaw);
        if (telefone) {
            resultado.telefone.value = telefone;
            resultado.telefone.score = 0.95;
        }
    }
    
    // 📅 DATA - FORMATO ESPECÍFICO
    const dataMatch = texto.match(/Data:\s*(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4})/i);
    if (dataMatch) {
        const dataRaw = dataMatch[1].trim();
        const data = normalizeDate(dataRaw, hoje);
        if (data) {
            resultado.data.value = data;
            resultado.data.score = 0.95;
        }
    }
    
    // ⏰ HORÁRIO
    const horaMatch = texto.match(/Horário:\s*(\d{1,2})\s*(?:h|horas)?/i);
    if (horaMatch) {
        const horaRaw = horaMatch[1];
        const horario = normalizeHour(horaRaw + ':00');
        if (horario) {
            resultado.horario.value = horario;
            resultado.horario.score = 0.95;
        }
    }
    
    // 👥 PESSOAS
    const pessoasMatch = texto.match(/Pessoas:\s*(\d+)/i);
    if (pessoasMatch) {
        const num = Number(pessoasMatch[1]);
        if (num > 0 && num <= 200) {
            resultado.pessoas.value = num;
            resultado.pessoas.score = 0.95;
        }
    }
    
    // 💳 PAGAMENTO
    const pagamentoMatch = texto.match(/Pagamento:\s*([^\n]+)/i);
    if (pagamentoMatch) {
        const pag = pagamentoMatch[1].toLowerCase();
        if (pag.includes('unica') || pag.includes('única')) {
            resultado.pagamento.value = 'unica';
        } else if (pag.includes('individual')) {
            resultado.pagamento.value = 'individual';
        } else {
            resultado.pagamento.value = pag.trim();
        }
        resultado.pagamento.score = 0.9;
    }
    
    // 🪑 MESA
    const mesaMatch = texto.match(/Mesa:\s*(\d+|[a-z0-9\s]+)/i);
    if (mesaMatch) {
        resultado.mesa.value = mesaMatch[1].trim();
        resultado.mesa.score = 0.9;
    }
    
    // 📝 OBSERVAÇÕES
    const obsMatch = texto.match(/Observações?:\s*([^\n]+)/i);
    if (obsMatch) {
        resultado.observacoes.value = obsMatch[1].trim();
        resultado.observacoes.score = 0.9;
    }
    
    return resultado;
}
    // 📝 OBSERVAÇÕES
    resultado.observacoes.value = textoLimpo
        .replace(/unica|única|individual/gi, '')
        .replace(/mesa|salao|salão|pista/gi, '')
        .replace(/pax|pessoas|para/gi, '')
        .replace(/h(?:oras)?/gi, '')
        .trim() || null;
    
    return resultado;
}

module.exports = {
    normalizePhone,
    normalizeDate,
    normalizeHour,
    parseReserva
};