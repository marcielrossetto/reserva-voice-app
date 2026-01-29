/**
 * public/js/login.js
 * 
 * Sistema de login simples:
 * - Login básico
 * - Cadastro de empresa
 * - Recuperação de senha
 * - Validação de senha forte
 */

const API_URL = "http://localhost:3001/api";
let emailRecuperacaoGlobal = null;
let tokenRecuperacaoGlobal = null;

// ========== REDIRECION AUTOMÁTICO SE JÁ LOGADO ==========
if (localStorage.getItem("token")) {
  window.location.href = "/html/index.html";
}

// ========== VALIDAÇÃO DE SENHA ==========
function validarSenha() {
  const senha = document.getElementById("senhaCadastro").value;
  const container = document.getElementById("requisitosContainer");

  if (senha.length > 0) {
    container.style.display = "block";
  }

  const maius = /[A-Z]/.test(senha);
  const minus = /[a-z]/.test(senha);
  const numero = /[0-9]/.test(senha);
  const especial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha);
  const comprimento = senha.length >= 8;

  atualizarRequisito("maius", maius);
  atualizarRequisito("minus", minus);
  atualizarRequisito("numero", numero);
  atualizarRequisito("especial", especial);
  atualizarRequisito("comprimento", comprimento);
}

function validarSenhaRecuperacao() {
  const senha = document.getElementById("novaSenhaEsqueceu").value;
  const container = document.getElementById("requisitosRecuperacao");

  if (senha.length > 0) {
    container.style.display = "block";
  }

  const maius = /[A-Z]/.test(senha);
  const minus = /[a-z]/.test(senha);
  const numero = /[0-9]/.test(senha);
  const especial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha);
  const comprimento = senha.length >= 8;

  atualizarRequisito("maiusRec", maius);
  atualizarRequisito("minusRec", minus);
  atualizarRequisito("numeroRec", numero);
  atualizarRequisito("especialRec", especial);
  atualizarRequisito("comprimentoRec", comprimento);
}

function atualizarRequisito(id, valido) {
  const el = document.getElementById(id);
  if (valido) {
    el.innerHTML = "✅";
    el.className = "requisito-icon requisito-ok";
  } else {
    el.innerHTML = "⭕";
    el.className = "requisito-icon requisito-no";
  }
}

function senhaValida(senha) {
  return (
    /[A-Z]/.test(senha) &&
    /[a-z]/.test(senha) &&
    /[0-9]/.test(senha) &&
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha) &&
    senha.length >= 8
  );
}

// ========== NAVEGAÇÃO ==========
function abrirTelaCadastro() {
  document.getElementById("telaLogin").classList.add("hidden");
  document.getElementById("telaCadastro").classList.remove("hidden");
  document.getElementById("telaEsqueceuSenha").classList.add("hidden");
}

function voltarTelaLogin() {
  document.getElementById("telaLogin").classList.remove("hidden");
  document.getElementById("telaCadastro").classList.add("hidden");
  document.getElementById("telaEsqueceuSenha").classList.add("hidden");
  resetarFormularios();
}

function abrirTelaEsqueceuSenha() {
  document.getElementById("telaLogin").classList.add("hidden");
  document.getElementById("telaCadastro").classList.add("hidden");
  document.getElementById("telaEsqueceuSenha").classList.remove("hidden");
  resetarEtapasEsqueceu();
}

// ========== LOGIN ==========
async function fazerLogin(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const senha = document.getElementById("loginSenha").value.trim();

  mostrarCarregamento("btnLoginSpinner", "btnLoginText");

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });

    const data = await response.json();

    if (!response.ok) {
      mostrarAlerta(
        "alertaLogin",
        data.erro || "Erro ao fazer login",
        "danger",
      );
      esconderCarregamento("btnLoginSpinner", "btnLoginText", "Entrar");
      return;
    }

    // ✅ Salvar dados
    localStorage.setItem("token", data.token);
    localStorage.setItem("empresaId", data.empresaId);
    localStorage.setItem("email", email);

    mostrarAlerta("alertaLogin", "✅ Login realizado!", "success");
    
    // ✅ Redirecionar para index.html
    setTimeout(() => {
      window.location.href = "/html/index.html";
    }, 1500);
  } catch (error) {
    mostrarAlerta(
      "alertaLogin",
      "Erro ao conectar: " + error.message,
      "danger",
    );
    esconderCarregamento("btnLoginSpinner", "btnLoginText", "Entrar");
  }
}

// ========== CADASTRO ==========
async function fazerCadastro(e) {
  e.preventDefault();
  const nomeEmpresa = document.getElementById("nomeEmpresa").value.trim();
  const telefone = document.getElementById("telefoneCadastro").value.trim();
  const cnpjCpf = document.getElementById("cnpjCpf").value.trim();
  const email = document.getElementById("emailCadastro").value.trim();
  const senha = document.getElementById("senhaCadastro").value.trim();

  if (!senhaValida(senha)) {
    mostrarAlerta(
      "alertaCadastro",
      "❌ Senha não atende aos requisitos",
      "danger",
    );
    return;
  }

  mostrarCarregamento("btnCadastroSpinner", "btnCadastroText");

  try {
    const response = await fetch(`${API_URL}/auth/cadastro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nomeEmpresa,
        telefone,
        cnpjCpf,
        email,
        senha,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      mostrarAlerta(
        "alertaCadastro",
        data.erro || "Erro ao cadastrar",
        "danger",
      );
      esconderCarregamento(
        "btnCadastroSpinner",
        "btnCadastroText",
        "Cadastrar",
      );
      return;
    }

    // ✅ Salvar dados
    localStorage.setItem("token", data.token);
    localStorage.setItem("empresaId", data.empresaId);
    localStorage.setItem("email", email);

    mostrarAlerta(
      "alertaCadastro",
      `✅ Empresa cadastrada com sucesso!\n\nRedirecionando...`,
      "success",
    );

    // ✅ Redirecionar para index.html
    setTimeout(() => {
      window.location.href = "/html/index.html";
    }, 2000);
  } catch (error) {
    mostrarAlerta(
      "alertaCadastro",
      "Erro ao conectar: " + error.message,
      "danger",
    );
    esconderCarregamento(
      "btnCadastroSpinner",
      "btnCadastroText",
      "Cadastrar",
    );
  }
}

// ========== RECUPERAR SENHA ==========
async function solicitarTokenSenha(e) {
  e.preventDefault();
  emailRecuperacaoGlobal = document.getElementById("emailSenha").value.trim();

  mostrarCarregamento("btnEmailSpinner", "btnEmailText");

  try {
    const response = await fetch(`${API_URL}/auth/solicitar-token-senha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailRecuperacaoGlobal }),
    });

    const data = await response.json();

    if (!response.ok) {
      mostrarAlerta(
        "alertaEsqueceu",
        data.erro || "E-mail não encontrado",
        "danger",
      );
      esconderCarregamento(
        "btnEmailSpinner",
        "btnEmailText",
        "Enviar Código",
      );
      return;
    }

    document.getElementById("etapa1EmailEsqueceu").classList.add("hidden");
    document.getElementById("etapa2TokenEsqueceu").classList.remove("hidden");
    document.getElementById("emailRecuperacao").textContent =
      emailRecuperacaoGlobal;

    mostrarAlerta("alertaEsqueceu", "✅ Código enviado por e-mail!", "success");
  } catch (error) {
    mostrarAlerta("alertaEsqueceu", "Erro: " + error.message, "danger");
  } finally {
    esconderCarregamento("btnEmailSpinner", "btnEmailText", "Enviar Código");
  }
}

async function verificarTokenSenha(e) {
  e.preventDefault();
  const token = document.getElementById("tokenVerificacao").value.trim();

  mostrarCarregamento("btnTokenSpinner", "btnTokenText");

  try {
    const response = await fetch(`${API_URL}/auth/verificar-token-senha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailRecuperacaoGlobal, token }),
    });

    const data = await response.json();

    if (!response.ok) {
      mostrarAlerta(
        "alertaEsqueceu",
        data.erro || "Token inválido",
        "danger",
      );
      esconderCarregamento("btnTokenSpinner", "btnTokenText", "Verificar");
      return;
    }

    tokenRecuperacaoGlobal = token;

    document.getElementById("etapa2TokenEsqueceu").classList.add("hidden");
    document.getElementById("etapa3NovaSenhaEsqueceu").classList.remove("hidden");
    mostrarAlerta("alertaEsqueceu", "✅ Token verificado!", "success");
  } catch (error) {
    mostrarAlerta("alertaEsqueceu", "Erro: " + error.message, "danger");
  } finally {
    esconderCarregamento("btnTokenSpinner", "btnTokenText", "Verificar");
  }
}

async function atualizarSenhaEsquecida(e) {
  e.preventDefault();
  const novaSenha = document.getElementById("novaSenhaEsqueceu").value.trim();
  const confirmarSenha = document
    .getElementById("confirmarSenhaEsqueceu")
    .value.trim();

  if (novaSenha !== confirmarSenha) {
    mostrarAlerta("alertaEsqueceu", "❌ As senhas não conferem", "danger");
    return;
  }

  if (!senhaValida(novaSenha)) {
    mostrarAlerta(
      "alertaEsqueceu",
      "❌ Senha não atende aos requisitos",
      "danger",
    );
    return;
  }

  mostrarCarregamento("btnSenhaSpinner", "btnSenhaText");

  try {
    const response = await fetch(`${API_URL}/auth/atualizar-senha-esquecida`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailRecuperacaoGlobal,
        token: tokenRecuperacaoGlobal,
        novaSenha,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      mostrarAlerta(
        "alertaEsqueceu",
        data.erro || "Erro ao atualizar",
        "danger",
      );
      esconderCarregamento("btnSenhaSpinner", "btnSenhaText", "Atualizar Senha");
      return;
    }

    mostrarAlerta(
      "alertaEsqueceu",
      "✅ Senha atualizada com sucesso!",
      "success",
    );

    setTimeout(() => {
      voltarTelaLogin();
    }, 2000);
  } catch (error) {
    mostrarAlerta("alertaEsqueceu", "Erro: " + error.message, "danger");
  } finally {
    esconderCarregamento("btnSenhaSpinner", "btnSenhaText", "Atualizar Senha");
  }
}

// ========== UTILITÁRIOS ==========
function mostrarAlerta(elementId, mensagem, tipo) {
  const alertElement = document.getElementById(elementId);
  alertElement.innerHTML = `<div class="alert alert-${tipo}">${mensagem.replace(
    /\n/g,
    "<br>",
  )}</div>`;
}

function mostrarCarregamento(spinnerId, textId) {
  document.getElementById(spinnerId).classList.remove("hidden");
  document.getElementById(textId).classList.add("hidden");
}

function esconderCarregamento(spinnerId, textId, texto) {
  document.getElementById(spinnerId).classList.add("hidden");
  document.getElementById(textId).classList.remove("hidden");
  document.getElementById(textId).textContent = texto;
}

function voltarSolicitarEmail() {
  document
    .getElementById("etapa1EmailEsqueceu")
    .classList.remove("hidden");
  document.getElementById("etapa2TokenEsqueceu").classList.add("hidden");
  document.getElementById("emailSenha").value = "";
}

function resetarEtapasEsqueceu() {
  document.getElementById("etapa1EmailEsqueceu").classList.remove("hidden");
  document.getElementById("etapa2TokenEsqueceu").classList.add("hidden");
  document.getElementById("etapa3NovaSenhaEsqueceu").classList.add("hidden");
  document.getElementById("alertaEsqueceu").innerHTML = "";
}

function resetarFormularios() {
  document.getElementById("formLogin").reset();
  document.getElementById("formCadastro").reset();
  document.getElementById("alertaLogin").innerHTML = "";
  document.getElementById("alertaCadastro").innerHTML = "";
}

console.log("✅ login.js carregado");