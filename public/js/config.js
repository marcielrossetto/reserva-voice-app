/**
 * public/js/config.js
 *
 * Configuração ÚNICA e COMPLETA
 * - Gerencia token e autenticação
 * - Intercepta requisições automaticamente
 * - Redireciona para login se token expirar
 * - Carregue SEMPRE este arquivo PRIMEIRO
 */

// ========================= DETECÇÃO AUTOMÁTICA DE AMBIENTE =========================

const API_CONFIG = {
  BASE_URL: window.location.origin,

  get AUTH() {
    return `${this.BASE_URL}/api/auth`;
  },
  get RESERVATIONS() {
    return `${this.BASE_URL}/api/reservationQuery`;
  },
  get RESERVAS() {
    return `${this.BASE_URL}/api/reservas`;
  },
  get CALENDAR() {
    return `${this.BASE_URL}/api/calendar`;
  },
  get ADMIN() {
    return `${this.BASE_URL}/api/admin`;
  },
};

// ========================= TOKEN GLOBAL (ÚNICO) =========================

// ✅ SEM let/const - deixar global!
let token = localStorage.getItem("token");

// ========================= CONTROLE DE REDIRECIONAMENTO =========================

let _redirecionando = false;

function redirecionarParaLogin() {
  if (_redirecionando) return;
  _redirecionando = true;
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = "/login.html";
}

// ========================= INTERCEPTAR FETCH - TOKEN EXPIRADO =========================

/**
 * Intercepta TODAS as requisições
 * Se token expirar (401) → Redireciona para login
 */
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  let response = await originalFetch.apply(this, args);

  // Não interceptar se já está na página de login
  if (window.location.pathname.includes("login")) {
    return response;
  }

  // ✅ Se status 401 (não autorizado/token expirado)
  if (response.status === 401) {
    try {
      const cloned = response.clone();
      const data = await cloned.json();

      // Se backend indicou que é token expirado
      if (data.redirect || data.erro?.includes("expirado")) {
        console.warn("⚠️ SESSÃO EXPIRADA! Redirecionando para login...");
        alert("⏰ Sua sessão expirou!\nPor favor, faça login novamente.");
        redirecionarParaLogin();
        return response;
      }
    } catch (e) {
      console.error("Erro ao processar resposta 401:", e);
    }
  }

  return response;
};

// ========================= FUNÇÕES DE AUTENTICAÇÃO =========================

/**
 * Verificar se usuário está autenticado ao carregar página
 */
function verificarAutenticacao() {
  const tokenAtual = localStorage.getItem("token");

  // Se não tem token → vai para login
  if (!tokenAtual) {
    console.log("❌ Sem token. Redirecionando para login...");
    redirecionarParaLogin();
    return false;
  }

  // Token existe, verificar se é válido
  verificarTokenValido(tokenAtual);
  return true;
}

/**
 * Verificar se token é válido (verificação LOCAL)
 * ✅ Não faz chamada ao backend
 */
function verificarTokenValido(tokenParam) {
  // Token vazio = inválido
  if (!tokenParam) {
    console.warn("⚠️ Token inválido!");
    redirecionarParaLogin();
    return false;
  }

  // Token existe = válido
  console.log("✅ Token validado localmente");
  return true;
}

/**
 * Atualizar token no localStorage
 */
function atualizarToken(novoToken) {
  token = novoToken;
  localStorage.setItem("token", novoToken);
  console.log("✅ Token atualizado");
}

/**
 * Logout - remover token e redirecionar
 */
function fazerLogout() {
  console.log("🚪 Fazendo logout...");
  token = null;
  redirecionarParaLogin();
}

// ========================= REQUISIÇÕES AUTENTICADAS =========================

/**
 * Fazer requisição com token automaticamente
 * Uso: requisicaoAutenticada('/api/reservationQuery', { method: 'GET' })
 */
async function requisicaoAutenticada(endpoint, options = {}) {
  const tokenAtual = localStorage.getItem("token");

  if (!tokenAtual) {
    throw new Error("Token não encontrado. Faça login novamente.");
  }

  const defaultHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokenAtual}`,
  };

  const mergedOptions = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_CONFIG.BASE_URL}${endpoint}`;

  const response = await fetch(url, mergedOptions);

  // Interceptor de 401 já trata isso, mas deixamos aqui como backup
  if (response.status === 401) {
    fazerLogout();
  }

  return response;
}

/**
 * Compatibilidade com função antiga
 * Alias para requisicaoAutenticada
 */
async function apiFetch(endpoint, options = {}) {
  return requisicaoAutenticada(endpoint, options);
}

// ========================= UTILITÁRIOS =========================

/**
 * Exibir notificação de toast
 */
function showToast(msg, tipo = "info") {
  const toast = document.createElement("div");
  const tipoClasse =
    tipo === "danger"
      ? "danger"
      : tipo === "warning"
        ? "warning"
        : tipo === "info"
          ? "info"
          : "success";

  toast.className = `alert alert-${tipoClasse}`;
  toast.innerHTML = msg;
  toast.style.cssText = `
        position: fixed; 
        top: 20px; 
        right: 20px; 
        z-index: 10001; 
        min-width: 300px; 
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/**
 * Formatar data
 */
function formatarData(dataString) {
  try {
    const [ano, mes, dia] = dataString.split("-");
    const dataObj = new Date(ano, parseInt(mes) - 1, parseInt(dia));
    return dataObj.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch (e) {
    return dataString;
  }
}

// ========================= ENDPOINTS CENTRALIZADOS =========================

const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: `${API_CONFIG.BASE_URL}/api/auth/login`,
  AUTH_VERIFICAR_PIN: `${API_CONFIG.BASE_URL}/api/auth/verificar-pin`,
  AUTH_REGISTRAR: `${API_CONFIG.BASE_URL}/api/auth/registrar`,
  AUTH_RECUPERAR_SENHA: `${API_CONFIG.BASE_URL}/api/auth/recuperar-senha`,
  AUTH_REDEFINIR_SENHA: `${API_CONFIG.BASE_URL}/api/auth/redefinir-senha`,
  AUTH_ME: `${API_CONFIG.BASE_URL}/api/auth/me`,
  AUTH_LOGOUT: `${API_CONFIG.BASE_URL}/api/auth/logout`,

  // Reservations
  RESERVATIONS: `${API_CONFIG.BASE_URL}/api/reservationQuery`,
  RESERVATION_GET: (id) => `${API_CONFIG.BASE_URL}/api/reservationQuery/${id}`,
  RESERVATION_HISTORY: (id) =>
    `${API_CONFIG.BASE_URL}/api/reservationQuery/${id}/history`,
  RESERVATION_CLIENT: (phone) =>
    `${API_CONFIG.BASE_URL}/api/reservationQuery/client/${phone}`,
  RESERVATION_CONFIRM: (id) =>
    `${API_CONFIG.BASE_URL}/api/reservationQuery/${id}/confirm`,
  RESERVATION_CANCEL: (id) =>
    `${API_CONFIG.BASE_URL}/api/reservationQuery/${id}/cancel`,
  RESERVATION_STATUS: (id) =>
    `${API_CONFIG.BASE_URL}/api/reservationQuery/${id}/status`,
  RESERVATION_REACTIVATE: (id) =>
    `${API_CONFIG.BASE_URL}/api/reservationQuery/${id}/reactivate`,
};

// ========================= EXPORTAR GLOBALMENTE =========================

// Legado (compatibilidade)
globalThis.API_BASE_URL = API_CONFIG.BASE_URL;
globalThis.API_RESERVAS = API_CONFIG.RESERVAS;
globalThis.API_BASE = API_CONFIG.BASE_URL;

// ✅ NOVOS - Exportar token globalmente
globalThis.token = token;
globalThis.empresaId = localStorage.getItem("empresaId");
globalThis.email = localStorage.getItem("email");

globalThis.API_CONFIG = API_CONFIG;
globalThis.API_ENDPOINTS = API_ENDPOINTS;
globalThis.apiFetch = apiFetch;
globalThis.requisicaoAutenticada = requisicaoAutenticada;
globalThis.verificarAutenticacao = verificarAutenticacao;
globalThis.verificarTokenValido = verificarTokenValido;
globalThis.atualizarToken = atualizarToken;
globalThis.fazerLogout = fazerLogout;
globalThis.redirecionarParaLogin = redirecionarParaLogin;
globalThis.showToast = showToast;
globalThis.formatarData = formatarData;

// ========================= INICIALIZAR =========================

console.log("✅ Config.js carregado com TODAS as funcionalidades");
console.log(
  "🌍 Ambiente:",
  window.location.hostname === "localhost" ? "DESENVOLVIMENTO" : "PRODUÇÃO",
);
console.log("📍 Base URL:", API_CONFIG.BASE_URL);
console.log("🔐 Token Global:", token ? "✅ Presente" : "❌ Não encontrado");
console.log("🔄 Interceptação de token expirado: ATIVA");
console.log("✅ Variáveis globais:", {
  token: token ? "✅ OK" : "❌",
  empresaId: globalThis.empresaId,
  email: globalThis.email,
});

// ========================= VERIFICAR AUTENTICAÇÃO AO CARREGAR =========================

document.addEventListener("DOMContentLoaded", () => {
  const currentPage = window.location.pathname;
  const tokenLocal = localStorage.getItem("token");
  const usuario = localStorage.getItem("userName");

  console.log("📄 Página:", currentPage);
  console.log("🔐 Token:", tokenLocal ? "✅ OK" : "❌ Não encontrado");

  // ✅ Se está em login.html ou raiz, deixa carregar
  if (currentPage.includes("login") || currentPage === "/") {
    console.log("📄 Página de login/home - permitido");
    return;
  }

  // ✅ Se não tem token e NÃO está em login, redireciona
  if (!tokenLocal) {
    console.log("❌ Sem token! Redirecionando para login...");
    redirecionarParaLogin();
    return;
  }

  // ✅ Token existe, carregar usuário
  console.log("✅ Autenticado como:", usuario);

  // Exibir usuário no header
  const userDisplay = document.getElementById("userDisplay");
  if (userDisplay && usuario) {
    userDisplay.textContent = `Usuário: ${usuario}`;
  }
});