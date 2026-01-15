function extrairDadosTexto(texto) {
  const t = texto.toLowerCase();

  const dados = {
    nome: extrair(/(?:nome|para)\s*[:\-]?\s*([a-z\s]+)/i, texto),
    telefone: extrair(/(\d{10,11})/, texto),
    data: extrair(/(\d{2}\/\d{2}\/\d{4})/, texto),
    horario: extrair(/(\d{1,2}[:h]\d{2})/, texto),
    numPessoas: extrair(/(\d+)\s*(pessoas|pax)/, texto),
    tipoEvento: extrair(/(anivers[aá]rio|casamento|formatura|confraterniza[cç][aã]o)/, t),
    observacoes: texto
  };

  const faltando = [];

  if (!dados.nome) faltando.push("nome");
  if (!dados.telefone) faltando.push("telefone");
  if (!dados.data) faltando.push("data");
  if (!dados.horario) faltando.push("horário");
  if (!dados.numPessoas) faltando.push("nº de pessoas");

  if (dados.data) {
    const [d, m, y] = dados.data.split("/");
    dados.data = `${y}-${m}-${d}`;
  }

  if (dados.horario) {
    dados.horario = dados.horario.replace("h", ":");
  }

  dados.numPessoas = dados.numPessoas
    ? Number(dados.numPessoas)
    : null;

  return { dados, faltando };
}

function extrair(regex, texto) {
  const m = texto.match(regex);
  return m ? m[1].trim() : null;
}
