/**
 * header.js - Versão SaaS Robusta
 */

(function() {
    const API_BASE = window.location.origin.includes('localhost') ? "http://localhost:3001/api" : "/api";
    const AUTH = {
        token: localStorage.getItem("token"),
        email: localStorage.getItem("email"),
        empresaId: localStorage.getItem("empresaId"),
        role: localStorage.getItem("userRole")
    };

    async function init() {
        if (window.location.pathname.includes("login")) return;

        const container = document.getElementById('header-container');
        if (!container) return;

        try {
            const resp = await fetch('/html/header.html');
            container.innerHTML = await resp.text();
            
            formatUserName();
            loadCompanyLogo();
            initSmartScroll();
            setupOutsideClicks();
        } catch (e) { console.error("Erro ao carregar header:", e); }
    }

    // 1. FORMATA NOME DO USUÁRIO
    function formatUserName() {
        if (!AUTH.email) return;
        const namePart = AUTH.email.split('@')[0];
        const formatted = namePart.split(/[\._-]/)
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
        
        const desk = document.getElementById('userNameHeader');
        const mob = document.getElementById('userNameMobile');
        if (desk) desk.innerText = formatted;
        if (mob) mob.innerText = formatted;

        if (AUTH.role === 'admin' || AUTH.role === 'master') {
            const adm = document.getElementById('adminMenu');
            if (adm) adm.style.display = 'block';
        }
    }

    // 2. BUSCA LOGO NO BANCO (ID DA EMPRESA)
   async function loadCompanyLogo() {
    const logoImg = document.getElementById('headerLogo');
    if (!logoImg || !AUTH.empresaId) return;

    try {
        // Buscamos o caminho que está salvo no banco
        const res = await fetch(`${API_BASE}/empresa/${AUTH.empresaId}/path`, {
            headers: { 'Authorization': `Bearer ${AUTH.token}` }
        });
        
        const data = await res.json();
        
        if (data && data.logoCaminho) {
            // Se houver caminho, usamos a URL direta do servidor
            logoImg.src = data.logoCaminho;
        } else {
            // Logo padrão se estiver vazio
            logoImg.src = '/images/default-logo.png'; 
        }
    } catch (e) {
        console.warn("Logo não carregada");
    }
}

    // 3. SMART SCROLL
    let lastScroll = 0;
    function initSmartScroll() {
        const header = document.getElementById('mainHeader');
        window.addEventListener('scroll', () => {
            const current = window.pageYOffset;
            if (current <= 70) { header.classList.remove('header-hidden'); return; }
            if (current > lastScroll) header.classList.add('header-hidden');
            else header.classList.remove('header-hidden');
            lastScroll = current;
        }, { passive: true });
    }

    // 4. CLIQUE FORA PARA FECHAR DROPDOWNS
    function setupOutsideClicks() {
        document.addEventListener('click', (e) => {
            const popover = document.getElementById('userPopover');
            if (popover && !e.target.closest('.user-dropdown-desktop')) {
                popover.classList.remove('show');
            }
        });
    }

    // --- FUNÇÕES GLOBAIS ---
    globalThis.toggleUserDropdown = (e) => {
        e.stopPropagation();
        document.getElementById('userPopover').classList.toggle('show');
    };

    globalThis.toggleMobileSidebar = () => {
        document.getElementById('mobileSidebar').classList.toggle('open');
    };

    globalThis.logout = () => {
        if (confirm("Deseja sair do sistema?")) {
            localStorage.clear();
            window.location.replace("/login.html");
        }
    };

    globalThis.uploadLogo = async (input) => {
        if (!input.files[0]) return;
        const fd = new FormData();
        fd.append('logo', input.files[0]);

        const res = await fetch(`${API_BASE}/empresa/${AUTH.empresaId}/logo/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${AUTH.token}` },
            body: fd
        });
        if (res.ok) loadCompanyLogo();
    };

    globalThis.openReservationModal = () => {
        document.getElementById('mobileSidebar').classList.remove('open');
        const m = document.getElementById('modalReserva');
        if (m && typeof bootstrap !== 'undefined') new bootstrap.Modal(m).show();
    };

    globalThis.goToIndex = () => window.location.href = '/html/index.html';
    globalThis.goToQueue = () => window.location.href = '/html/fila.html';
    globalThis.goToSearch = () => window.location.href = '/search';

    init();
})();