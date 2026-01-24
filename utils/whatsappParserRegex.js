/**
 * WhatsAppParser - Parser inteligente para mensagens de reserva.
 * Converte linguagem natural em dados estruturados para o sistema.
 */

// Mapeamento de números para normalização global (Ordenado do maior para o menor)
const NUMEROS_EXTENSOS = [
  { txt: 'vinte e três', v: '23' }, { txt: 'vinte e trés', v: '23' },
  { txt: 'vinte e dois', v: '22' }, { txt: 'vinte e um', v: '21' },
  { txt: 'dezessete', v: '17' }, { txt: 'dezesseis', v: '16' },
  { txt: 'quatorze', v: '14' }, { txt: 'quinze', v: '15' },
  { txt: 'treze', v: '13' }, { txt: 'doze', v: '12' },
  { txt: 'onze', v: '11' }, { txt: 'dez', v: '10' },
  { txt: 'nove', v: '9' }, { txt: 'oito', v: '8' },
  { txt: 'sete', v: '7' }, { txt: 'seis', v: '6' },
  { txt: 'cinco', v: '5' }, { txt: 'quatro', v: '4' },
  { txt: 'três', v: '3' }, { txt: 'trés', v: '3' },
  { txt: 'dois', v: '2' }, { txt: 'duas', v: '2' },
  { txt: 'um', v: '1' }, { txt: 'uma', v: '1' },
  { txt: 'vinte', v: '20' }, { txt: 'trinta', v: '30' }
];

const MESES_MAP = {
  janeiro: '01', fevereiro: '02', março: '03', abril: '04', maio: '05', junho: '06',
  julho: '07', agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12'
};

class WhatsAppParser {
  /**
   * Ponto de entrada: Prepara o texto e extrai os campos.
   */
  static parse(textoRaw) {
    if (!textoRaw) return null;

    // Normalização inicial: números por extenso para dígitos
    let text = textoRaw.toLowerCase().trim();
    for (const item of NUMEROS_EXTENSOS) {
      const regex = new RegExp(`\\b${item.txt}\\b`, 'gi');
      text = text.replaceAll(regex, item.v);
    }

    return {
      nome: this.extrairNome(text),
      telefone: this.extrairTelefone(text),
      data: this.extrairData(text),
      horario: this.extrairHorario(text),
      numPessoas: this.extrairPessoas(text),
      tipoEvento: this.extrairEvento(text),
      numeroMesa: this.extrairMesa(text),
      observacoes: this.extrairObservacoes(textoRaw), // Obs mantém camelCase original
    };
  }

  static validar(dados) {
    const erros = [];
    if (!dados.nome || dados.nome.length < 2) erros.push("Nome inválido");
    if (!dados.telefone || dados.telefone.length < 10) erros.push("Telefone inválido");
    if (!dados.data) erros.push("Data não encontrada");
    if (!dados.horario) erros.push("Horário não encontrado");
    if (!dados.numPessoas || dados.numPessoas < 1) erros.push("Número de pessoas inválido");

    return { valido: erros.length === 0, erros };
  }

  static extrairNome(text) {
    const patterns = [
      /(?:sou|meu nome é|eu sou|nome:)\s+([a-záéíóúãõç]+(?:\s+[a-záéíóúãõç]+)?)/i,
      /^([a-záéíóúãõç]+(?:\s+[a-záéíóúãõç]+)?)\s*[,.]?\s+(?:quero|gostaria|preciso)/i,
      /(?:olá|oi|oiee|falar com)\s+([a-záéíóúãõç]+(?:\s+[a-záéíóúãõç]+)?)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim().replaceAll(/\s+/g, " ");
    }
    return null;
  }

  static extrairTelefone(text) {
    const cleanDigits = text.replaceAll(/\D/g, "");
    // Busca padrão de 10 ou 11 dígitos (com ou sem 9)
    const match = cleanDigits.match(/\d{10,11}/);
    return match ? match[0].slice(-11) : null;
  }

  static extrairData(text) {
    const hoje = new Date();

    // 1. Datas Relativas
    if (text.includes("hoje")) return this.formatDate(hoje);
    if (text.includes("amanhã") || text.includes("amanha")) {
      const d = new Date(); d.setDate(hoje.getDate() + 1);
      return this.formatDate(d);
    }
    if (text.includes("depois de amanhã")) {
      const d = new Date(); d.setDate(hoje.getDate() + 2);
      return this.formatDate(d);
    }

    // 2. Formato DD/MM/YYYY ou DD/MM
    const dateMatch = text.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
    if (dateMatch) {
      const dia = dateMatch[1].padStart(2, "0");
      const mes = dateMatch[2].padStart(2, "0");
      const ano = dateMatch[3] 
        ? (dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3]) 
        : hoje.getFullYear();
      return `${ano}-${mes}-${dia}`;
    }

    // 3. Formato "25 de Maio"
    const longDateMatch = text.match(/(\d{1,2})\s+(?:de\s+)?([a-zçãõáéíóú]+)/);
    if (longDateMatch) {
      const dia = longDateMatch[1].padStart(2, "0");
      const mes = MESES_MAP[longDateMatch[2]];
      if (mes) return `${hoje.getFullYear()}-${mes}-${dia}`;
    }

    return null;
  }

  static extrairHorario(text) {
    // Procura padrões como "19:30", "19h30", "às 19", "às 7 da noite"
    const patterns = [
      /(\d{1,2})[:h\s](\d{2})/,             // 19:30, 19h30, 19 30
      /(?:às|as|pelas)\s+(\d{1,2})(?![\d/])/, // às 19, às 7
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let hora = Number.parseInt(match[1], 10);
        const min = match[2] ? match[2].padStart(2, "0") : "00";

        // Lógica simples para PM/Noite (se o usuário disser 7 e for tarde)
        if (hora < 12 && (text.includes("noite") || text.includes("tarde"))) {
          hora += 12;
        }

        if (hora >= 0 && hora <= 23) {
          return `${String(hora).padStart(2, "0")}:${min}`;
        }
      }
    }
    return null;
  }

  static extrairPessoas(text) {
    const match = text.match(/(\d+)\s*(?:pessoas|pax|lugares|pess|pesss)/) || 
                  text.match(/(?:para|somos|com)\s+(\d+)/);
    
    return match ? Number.parseInt(match[1], 10) : null;
  }

  static extrairEvento(text) {
    const tipos = {
      'Aniversário': /aniversário|niver|aniv|parabéns/i,
      'Casamento': /casamento|bodas|noivado/i,
      'Corporativo': /empresa|corporativo|reunião|trabalho/i,
      'Confraternização': /confraternização|confra|amigo oculto/i,
      'Família': /família|familiar/i
    };

    for (const [nome, regex] of Object.entries(tipos)) {
      if (regex.test(text)) return nome;
    }
    return "Reserva Comum";
  }

  static extrairMesa(text) {
    const match = text.match(/mesa\s*(?:n|n°|número)?\s*(\d+)/i);
    return match ? match[1] : null;
  }

  static extrairObservacoes(text) {
    const keywords = ["obs", "observação", "preferência", "alergia", "detalhe", "nota"];
    const lowerText = text.toLowerCase();

    for (const key of keywords) {
      if (lowerText.includes(key)) {
        // Pega tudo após a palavra-chave
        const parts = text.split(new RegExp(key, 'i'));
        return parts[1].replace(/^[:\-\s]+/, "").trim();
      }
    }
    return "";
  }

  // Helper privado para formatar YYYY-MM-DD
  static formatDate(date) {
    return date.toISOString().split('T')[0];
  }
}

module.exports = WhatsAppParser;