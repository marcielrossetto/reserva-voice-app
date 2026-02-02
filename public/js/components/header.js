/**
 * header.js - Versão SaaS Robusta
 */

(function() {
    const API_BASE = window.location.origin.includes('localhost') ? "http://localhost:3001/api" : "/api";
    const AUTH = {
        token: localStorage.getItem("token"),
        email: localStorage.getItem("email"),
        empresaId: localStorage.getItem("empresaId"),
        role: localStorage.getItem("userRole"),
        nome: localStorage.getItem("userName")
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
        let formatted = '';

        if (AUTH.nome) {
            formatted = AUTH.nome;
        } else if (AUTH.email) {
            const namePart = AUTH.email.split('@')[0];
            formatted = namePart.split(/[\._-]/)
                .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join(' ');
        }

        const desk = document.getElementById('userNameHeader');
        const mob = document.getElementById('userNameMobile');
        if (desk) desk.innerText = formatted || 'Usuário';
        if (mob) mob.innerText = formatted || 'Usuário';

        if (AUTH.role === 'admin' || AUTH.role === 'master') {
            const adm = document.getElementById('adminMenu');
            if (adm) adm.style.display = 'block';
        }
    }

    // 2. BUSCA LOGO NO BANCO (ID DA EMPRESA)
   async function loadCompanyLogo() {
    const logoImg = document.getElementById('headerLogo');

    if (!AUTH.empresaId) return;

    try {
        const res = await fetch(`${API_BASE}/empresa/${AUTH.empresaId}/path`, {
            headers: { 'Authorization': `Bearer ${AUTH.token}` }
        });

        const data = await res.json();

    } catch (e) {
        console.warn("Logo não carregada:", e);
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

    globalThis.toggleMobileMenu = () => {
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

    globalThis.openReservationModal = async () => {
        document.getElementById('mobileSidebar')?.classList.remove('open');

        if (!document.getElementById('modalReserva')) {
            try {
                const res = await fetch('/html/reservation_modal.html');
                const html = await res.text();
                let container = document.getElementById('modal-container');
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'modal-container';
                    document.body.appendChild(container);
                }
                container.innerHTML = html;

                // Carregar JS do modal se nao estiver carregado
                if (typeof verificarEEnviar !== 'function') {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = '/js/components/reservation_modal.js';
                        script.onload = resolve;
                        script.onerror = reject;
                        document.body.appendChild(script);
                    });
                }
            } catch (err) {
                console.error('Erro ao carregar modal de reserva:', err);
                return;
            }
        }

        // Setar data de hoje como padrao
        const dataInput = document.getElementById('res_data');
        if (dataInput && !dataInput.value) {
            dataInput.value = new Date().toISOString().split('T')[0];
        }

        const m = document.getElementById('modalReserva');
        if (m) {
            if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                new bootstrap.Modal(m).show();
            } else if (typeof $ !== 'undefined') {
                $(m).modal('show');
            }
        }
    };

    // MODAL PERFIL
    globalThis.openProfileModal = async () => {
        const overlay = document.getElementById('profileModalOverlay');
        if (!overlay) return;

        // Fecha sidebar mobile se aberto
        document.getElementById('mobileSidebar')?.classList.remove('open');

        overlay.classList.add('active');

        try {
            const res = await fetch(`${API_BASE}/auth/me`, {
                headers: { 'Authorization': `Bearer ${AUTH.token}` }
            });
            if (!res.ok) throw new Error('Erro ao buscar perfil');
            const u = await res.json();

            document.getElementById('profileNome').textContent = u.nome || '—';
            document.getElementById('profileEmail').textContent = u.email || '—';
            document.getElementById('profileEmpresa').textContent = u.empresa?.nomeEmpresa || '—';
            document.getElementById('profileNivel').textContent = (u.nivel || '—').charAt(0).toUpperCase() + (u.nivel || '').slice(1);
            document.getElementById('profileDesde').textContent = u.dataEmissao ? new Date(u.dataEmissao).toLocaleDateString('pt-BR') : '—';
            document.getElementById('profileAcesso').textContent = u.ultimoAcesso ? new Date(u.ultimoAcesso).toLocaleString('pt-BR') : '—';
        } catch (e) {
            console.error('Erro ao carregar perfil:', e);
            document.getElementById('profileNome').textContent = 'Erro ao carregar';
        }
    };

    globalThis.closeProfileModal = () => {
        document.getElementById('profileModalOverlay')?.classList.remove('active');
    };

    // Fechar modal clicando fora
    document.addEventListener('click', (e) => {
        const overlay = document.getElementById('profileModalOverlay');
        if (overlay && e.target === overlay) overlay.classList.remove('active');
    });

    // Fechar modal com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('profileModalOverlay')?.classList.remove('active');
        }
    });

    globalThis.goToIndex = () => window.location.href = '/html/index.html';
    globalThis.goToQueue = () => window.location.href = '/html/fila.html';
    globalThis.goToSearch = () => window.location.href = '/search';

    init();
})();