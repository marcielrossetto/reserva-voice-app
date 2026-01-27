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
 * CORRIGIDO: Agora captura data com PONTO também!
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
    
    // DD/MM/YYYY, DD-MM-YYYY ou DD.MM.YYYY (COM PONTO!)
    const match = String(dateStr).match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
    if (match) {
        let [, day, month, year] = match;
        
        day = String(day).padStart(2, '0');
        month = String(month).padStart(2, '0');
        
        if (year.length === 2) {
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
 * ORIGINAL - apenas corrigido para pegar data com ponto
 */
function parseReserva(texto) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const resultado = {
        nome: null,
        telefone: null,
        data: null,
        horario: null,
        numPessoas: null,
        numMesa: null,
        observacoes: null,
        erros: [],
        valido: true
    };
    
    const lower = texto.toLowerCase();
    let textoLimpo = texto;
    
    // 👤 NOME - PRIMEIRO
    const nomeMatch = texto.match(/^([a-záàâãéèêíïóôõöúçñ\s]+?)(?:\n|:)/i);
    if (nomeMatch && nomeMatch[1].trim().length > 2) {
        const nome = nomeMatch[1].trim();
        resultado.nome = nome;
        textoLimpo = textoLimpo.replace(nome, '');
    }
    
    // 📞 TELEFONE
    const telMatch = texto.match(/Telefone:\s*([0-9\/\-\(\)\s]+)/i);
    if (telMatch) {
        const telRaw = telMatch[1].trim();
        const telefone = normalizePhone(telRaw);
        if (telefone) {
            resultado.telefone = telefone;
        }
    }
    
    // 📅 DATA - CORRIGIDO: Agora pega também com PONTO
    const dataMatch = texto.match(/Data:\s*(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4})/i);
    if (dataMatch) {
        const dataRaw = dataMatch[1].trim();
        const data = normalizeDate(dataRaw, hoje);
        if (data) {
            resultado.data = data;
        }
    }
    
    // ⏰ HORÁRIO
    const horaMatch = texto.match(/Horário:\s*(\d{1,2})\s*(?:h|horas)?/i);
    if (horaMatch) {
        const horaRaw = horaMatch[1];
        const horario = normalizeHour(horaRaw + ':00');
        if (horario) {
            resultado.horario = horario;
        }
    }
    
    // 👥 PESSOAS
    const pessoasMatch = texto.match(/Pessoas:\s*(\d+)/i);
    if (pessoasMatch) {
        const num = Number(pessoasMatch[1]);
        if (num > 0 && num <= 200) {
            resultado.numPessoas = num;
        }
    }
    
    // 🪑 MESA
    const mesaMatch = texto.match(/Mesa:\s*(\d+|[a-z0-9\s]+)/i);
    if (mesaMatch) {
        resultado.numMesa = mesaMatch[1].trim();
    }
    
    // 📝 OBSERVAÇÕES
    const obsMatch = texto.match(/Observações?:\s*([^\n]+)/i);
    if (obsMatch) {
        resultado.observacoes = obsMatch[1].trim();
    }
    
    // Validação
    if (!resultado.nome) resultado.erros.push('Nome obrigatório');
    if (!resultado.data) resultado.erros.push('Data obrigatória');
    if (!resultado.horario) resultado.erros.push('Horário obrigatório');
    if (!resultado.numPessoas) resultado.erros.push('Nº de pessoas obrigatório');
    
    resultado.valido = resultado.erros.length === 0;
    
    return resultado;
}

/**
 * Parse de múltiplas reservas
 */
function parseMultiplasReservas(texto) {
    const blocos = texto.split(/\n\n+/).filter(b => b.trim());
    
    if (blocos.length > 1) {
        return blocos.map(bloco => parseReserva(bloco)).filter(r => r.nome);
    }
    
    const resultado = parseReserva(texto);
    return resultado.nome ? [resultado] : [];
}

module.exports = {
    normalizePhone,
    normalizeDate,
    normalizeHour,
    parseReserva,
    parseMultiplasReservas
};