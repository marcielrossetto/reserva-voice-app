/**
 * public/js/config.js
 * 
 * Configuração centralizada de URLs
 * Funciona automaticamente em localhost e no Render
 * 
 * Carregue SEMPRE este arquivo PRIMEIRO no seu HTML:
 * <script src="/js/config.js"></script>
 */

// ========================= DETECÇÃO AUTOMÁTICA DE AMBIENTE =========================
// Define a URL base da API automaticamente conforme o ambiente

const API_CONFIG = {
    // Detecta se está em localhost (desenvolvimento) ou produção (Render)
    BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : 'https://reserva-voice-app-1.onrender.com',
    
    // Endpoints principais
    get AUTH() { return `${this.BASE_URL}/api/auth`; },
    get RESERVATIONS() { return `${this.BASE_URL}/api/reservations`; },
    get RESERVAS() { return `${this.BASE_URL}/api/reservas`; },
    get CALENDAR() { return `${this.BASE_URL}/api/calendar`; },
    get ADMIN() { return `${this.BASE_URL}/api/admin`; },
};

// Expor globalmente para uso em todos os arquivos
globalThis.API_CONFIG = API_CONFIG;
globalThis.API_BASE_URL = API_CONFIG.BASE_URL;

// Log para debug
console.log('🔗 API Config iniciado');
console.log('🌍 Ambiente:', window.location.hostname === 'localhost' ? 'DESENVOLVIMENTO' : 'PRODUÇÃO');
console.log('📍 Base URL:', API_CONFIG.BASE_URL);

// ========================= ALIAS PARA COMPATIBILIDADE =========================
// Para código legado que usa essas variáveis
globalThis.API_RESERVAS = API_CONFIG.RESERVAS;
globalThis.API_BASE = API_CONFIG.BASE_URL;

// ========================= FUNÇÕES AUXILIARES =========================

/**
 * Fazer fetch com autenticação automática
 * Uso: apiFetch('/api/reservations', { method: 'POST', body: ... })
 */
globalThis.apiFetch = async function(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Se o endpoint for relativo, usar base URL
    const url = endpoint.startsWith('http') 
        ? endpoint 
        : `${API_CONFIG.BASE_URL}${endpoint}`;
    
    return fetch(url, {
        ...options,
        headers
    });
};

console.log('✅ Config.js carregado com sucesso');