/**
 * WhatsAppParser - Parser regex para mensagens de reserva
 * Integra direto com seu sistema
 */

class WhatsAppParser {
  static parse(texto) {
    const text = texto.toLowerCase().trim();

    return {
      nome: this.extrairNome(text),
      telefone: this.extrairTelefone(text),
      data: this.extrairData(text),
      horario: this.extrairHorario(text),
      numPessoas: this.extrairPessoas(text),
      tipoEvento: this.extrairEvento(text),
      numeroMesa: this.extrairMesa(text),
      observacoes: this.extrairObservacoes(text),
    };
  }

  static validar(dados) {
    const erros = [];

    if (!dados.nome || dados.nome.length < 2) {
      erros.push("Nome inválido");
    }
    if (!dados.telefone || dados.telefone.length < 10) {
      erros.push("Telefone inválido");
    }
    if (!dados.data) {
      erros.push("Data não encontrada");
    }
    if (!dados.horario) {
      erros.push("Horário não encontrado");
    }
    if (!dados.numPessoas || dados.numPessoas < 1) {
      erros.push("Número de pessoas inválido");
    }

    return {
      valido: erros.length === 0,
      erros,
    };
  }

  static extrairNome(text) {
    // Tenta vários padrões
    const patterns = [
      /(?:sou|meu nome é|eu sou)\s+([a-záéíóúãõç]+(?:\s+[a-záéíóúãõç]+)?)/i,
      /^([a-záéíóúãõç]+(?:\s+[a-záéíóúãõç]+)?)\s*[,.]?\s+(?:quero|gostaria|preciso)/i,
      /(?:olá|oi|oiee)\s+([a-záéíóúãõç]+(?:\s+[a-záéíóúãõç]+)?)/i,
    ];

    for (let pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim().replace(/\s+/g, " ");
      }
    }
    return null;
  }

  static extrairTelefone(text) {
    const patterns = [
      /(?:\+?55\s?)?(?:\(?\d{2}\)?[\s-]?)?9?\d{4}[-\s]?\d{4}/g,
      /\b\d{10,11}\b/g,
    ];

    for (let pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        return matches[0].replace(/\D/g, "").slice(-11);
      }
    }
    return null;
  }

  static extrairData(text) {
    const hoje = new Date();
    const hoje_str = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

    // Relativas
    if (/amanhã/.test(text)) {
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);
      return `${amanha.getFullYear()}-${String(amanha.getMonth() + 1).padStart(2, "0")}-${String(amanha.getDate()).padStart(2, "0")}`;
    }

    if (/depois de amanhã/.test(text)) {
      const depoois = new Date(hoje);
      depoois.setDate(depoois.getDate() + 2);
      return `${depoois.getFullYear()}-${String(depoois.getMonth() + 1).padStart(2, "0")}-${String(depoois.getDate()).padStart(2, "0")}`;
    }

    // Explícita: DD/MM/YYYY
    const match = text.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
    if (match) {
      let day = String(match[1]).padStart(2, "0");
      let month = String(match[2]).padStart(2, "0");
      let year = match[3].length === 2 ? "20" + match[3] : match[3];
      return `${year}-${month}-${day}`;
    }

    // Formato: "dia 25 de maio"
    const meses = {
      janeiro: "01", fevereiro: "02", março: "03", abril: "04",
      maio: "05", junho: "06", julho: "07", agosto: "08",
      setembro: "09", outubro: "10", novembro: "11", dezembro: "12",
    };

    const dayMonth = text.match(/(?:dia\s+)?(\d{1,2})\s+(?:de\s+)?([a-záéíóúãõç]+)/);
    if (dayMonth) {
      const dia = String(dayMonth[1]).padStart(2, "0");
      const mes = meses[dayMonth[2].toLowerCase()];
      if (mes) {
        return `${hoje.getFullYear()}-${mes}-${dia}`;
      }
    }

    return null;
  }

 static extrairHorario(text) {
  // Números por extenso (completo)
  const numerosExtensos = {
    'zero': '0', 'um': '1', 'uma': '1', 'dois': '2', 'duas': '2', 'três': '3', 'trés': '3', 'quatro': '4',
    'cinco': '5', 'seis': '6', 'sete': '7', 'oito': '8', 'nove': '9', 'dez': '10',
    'onze': '11', 'doze': '12', 'treze': '13', 'quatorze': '14', 'quinze': '15',
    'dezesseis': '16', 'dezessete': '17', 'dezoito': '18', 'dezenove': '19',
    'vinte': '20', 'vinte e um': '21', 'vinte e dois': '22', 'vinte e três': '23', 'vinte e trés': '23',
    'trinta': '30', 'quarenta': '40', 'cinquenta': '50'
  };

  let textProcessado = text;
  
  // Converter "treze e trinta" para "13:30"
  const horaComMinutos = textProcessado.match(/(\w+)\s+e\s+(\w+)\s+(?:hs|horas|h)?/i);
  if (horaComMinutos) {
    const horaStr = numerosExtensos[horaComMinutos[1].toLowerCase()];
    const minStr = numerosExtensos[horaComMinutos[2].toLowerCase()];
    
    if (horaStr && minStr) {
      const hora = parseInt(horaStr);
      const min = parseInt(minStr);
      
      if (hora >= 0 && hora <= 23 && min >= 0 && min <= 59) {
        return `${String(hora).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
      }
    }
  }

  // Converter números por extenso isolados
  for (let [extenso, digito] of Object.entries(numerosExtensos)) {
    textProcessado = textProcessado.replace(new RegExp(`\\b${extenso}\\b`, 'gi'), digito);
  }

  const patterns = [
    /às\s+(\d{1,2})\s*(?:h|horas|:)?\s*(\d{2})?/i,  // "às 19 horas", "às 19h"
    /(\d{1,2})\s*(?:h|horas)\s*(\d{2})?(?=\s+para|$)/i,  // "19 horas para"
  ];

  for (let pattern of patterns) {
    const match = textProcessado.match(pattern);
    if (match) {
      const hora = parseInt(match[1]);
      if (hora >= 0 && hora <= 23) {
        const h = String(hora).padStart(2, "0");
        const m = match[2] ? String(match[2]).padStart(2, "0") : "00";
        return `${h}:${m}`;
      }
    }
  }
  return null;
}

  static extrairPessoas(text) {
    const patterns = [
      /(?:para|somos|com)\s+(\d+)\s+(?:pessoas|pax|pessoa)/,
      /(\d+)\s+(?:pessoas|pax)/,
    ];
    
    for (let pattern of patterns) {
      const match = text.match(pattern);
      if (match) return parseInt(match[1]);
    }
    return null;
  }

  static extrairEvento(text) {
    const eventos = {
      aniversario: /aniversário|birthday/,
      casamento: /casamento|wedding/,
      corporativo: /corporativo|empresa/,
      encontro: /encontro|date/,
      familia: /família|familiar/,
      amigos: /amigos|turma/,
    };

    for (let [tipo, regex] of Object.entries(eventos)) {
      if (regex.test(text)) return tipo;
    }
    return null;
  }

  static extrairMesa(text) {
    const match = text.match(/mesa\s+(?:número|n°|n)\s*(\d+)/i);
    return match ? parseInt(match[1]) : null;
  }

  static extrairObservacoes(text) {
    const match = text.match(/(?:obs(?:ervação)?|preferência|alergia|restrição)[^.]*?:?\s*([^\n.]{10,})/i);
    return match ? match[1].trim() : null;
  }
}

module.exports = WhatsAppParser;