/**
 * public/js/config.js
 * 
 * Configuração centralizada - VERSÃO MELHORADA
 * Carregue SEMPRE este arquivo PRIMEIRO no seu HTML:
 * <script src="/js/config.js"></script>
 */

// ========================= DETECÇÃO AUTOMÁTICA DE AMBIENTE =========================

const API_CONFIG = {
    BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : 'https://reserva-voice-app-1.onrender.com',
    
    get AUTH() { return `${this.BASE_URL}/api/auth`; },
    get RESERVATIONS() { return `${this.BASE_URL}/api/reservationQuery`; },
    get RESERVAS() { return `${this.BASE_URL}/api/reservas`; },
    get CALENDAR() { return `${this.BASE_URL}/api/calendar`; },
    get ADMIN() { return `${this.BASE_URL}/api/admin`; },
};

// ========================= TOKEN GLOBAL (ÚNICO) =========================

let token = localStorage.getItem("token");

// ========================= FUNÇÕES DE AUTENTICAÇÃO =========================

/**
 * Verificar se usuário está autenticado
 */
function verificarAutenticacao() {
    if (!token) {
        console.warn("❌ Usuário não autenticado. Redirecionando...");
        window.location.href = '/login';
        return false;
    }
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
 * Logout - remover token
 */
function fazerLogout() {
    token = null;
    localStorage.removeItem("token");
    window.location.href = '/login';
}

// ========================= REQUISIÇÕES AUTENTICADAS =========================

/**
 * Fazer requisição autenticada
 * Uso: requisicaoAutenticada('/api/reservationQuery', { method: 'GET' })
 */
async function requisicaoAutenticada(endpoint, options = {}) {
    if (!token) {
        throw new Error("Token não encontrado. Faça login novamente.");
    }

    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const mergedOptions = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };

    const url = endpoint.startsWith('http') 
        ? endpoint 
        : `${API_CONFIG.BASE_URL}${endpoint}`;

    const response = await fetch(url, mergedOptions);

    // Se retornar 401, token expirou
    if (response.status === 401) {
        fazerLogout();
        throw new Error("Sessão expirada. Faça login novamente.");
    }

    return response;
}

/**
 * Fazer fetch com autenticação automática (compatibilidade com config antigo)
 */
async function apiFetch(endpoint, options = {}) {
    return requisicaoAutenticada(endpoint, options);
}

// ========================= UTILITÁRIOS =========================

/**
 * Exibir notificação de toast
 */
function showToast(msg, tipo = 'info') {
    const toast = document.createElement('div');
    const tipoClasse = tipo === 'danger' ? 'danger' : 
                       tipo === 'warning' ? 'warning' : 
                       tipo === 'info' ? 'info' : 'success';
    
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
        const [ano, mes, dia] = dataString.split('-');
        const dataObj = new Date(ano, parseInt(mes) - 1, parseInt(dia));
        return dataObj.toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric'
        });
    } catch (e) {
        return dataString;
    }
}

// ========================= ENDPOINTS CENTRALIZADOS =========================

const API_ENDPOINTS = {
    // Reservations
    RESERVATIONS: `${API_CONFIG.BASE_URL}/api/reservationQuery`,
    RESERVATION_GET: (id) => `${API_CONFIG.BASE_URL}/api/reservationQuery/${id}`,
    RESERVATION_HISTORY: (id) => `${API_CONFIG.BASE_URL}/api/reservationQuery/${id}/history`,
    RESERVATION_CLIENT: (phone) => `${API_CONFIG.BASE_URL}/api/reservationQuery/client/${phone}`,
    
    // Reservation Actions
    RESERVATION_CONFIRM: (id) => `${API_CONFIG.BASE_URL}/api/reservationQuery/${id}/confirm`,
    RESERVATION_CANCEL: (id) => `${API_CONFIG.BASE_URL}/api/reservationQuery/${id}/cancel`,
    RESERVATION_STATUS: (id) => `${API_CONFIG.BASE_URL}/api/reservationQuery/${id}/status`,
    RESERVATION_REACTIVATE: (id) => `${API_CONFIG.BASE_URL}/api/reservationQuery/${id}/reactivate`,
};

// ========================= EXPOR GLOBALMENTE =========================

// Legado
globalThis.API_CONFIG = API_CONFIG;
globalThis.API_BASE_URL = API_CONFIG.BASE_URL;
globalThis.API_RESERVAS = API_CONFIG.RESERVAS;
globalThis.API_BASE = API_CONFIG.BASE_URL;

// Novos
globalThis.API_ENDPOINTS = API_ENDPOINTS;
globalThis.apiFetch = apiFetch;
globalThis.requisicaoAutenticada = requisicaoAutenticada;
globalThis.verificarAutenticacao = verificarAutenticacao;
globalThis.atualizarToken = atualizarToken;
globalThis.fazerLogout = fazerLogout;
globalThis.showToast = showToast;
globalThis.formatarData = formatarData;

// ========================= LOGS =========================

console.log('🔗 API Config iniciado');
console.log('🌍 Ambiente:', window.location.hostname === 'localhost' ? 'DESENVOLVIMENTO' : 'PRODUÇÃO');
console.log('📍 Base URL:', API_CONFIG.BASE_URL);
console.log('✅ Token:', token ? '✅ Presente' : '❌ Não encontrado');
console.log('✅ Config.js carregado com sucesso');

// ========================= DISPLAY USUÁRIO =========================

document.addEventListener('DOMContentLoaded', () => {
    const userDisplay = document.getElementById('userDisplay');
    if (userDisplay && localStorage.getItem('usuario')) {
        userDisplay.textContent = `Usuário: ${localStorage.getItem('usuario')}`;
    }
});