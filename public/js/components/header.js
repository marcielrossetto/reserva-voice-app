/**
 * public/js/components/header.js
 */
(function() {
    const TOKEN = localStorage.getItem("token");
    const USERNAME = localStorage.getItem("username");

    // 1. SEGURANÇA: Se não estiver logado, expulsa antes de qualquer coisa
    if (!TOKEN && !window.location.pathname.includes("login.html")) {
        window.location.replace("/html/login.html");
        return;
    }

    /**
     * Função para carregar o HTML do Header e preencher os dados
     */
    async function loadHeader() {
        const headerContainer = document.getElementById('main-header');
        if (!headerContainer) return;

        try {
            // Busca o arquivo HTML separado
            const response = await fetch('/html/header.html');
            if (!response.ok) throw new Error("Não foi possível carregar o header.html");
            
            const html = await response.text();
            headerContainer.innerHTML = html;

            // Após injetar o HTML, preenche o nome do usuário
            const nameEl = document.getElementById("userName");
            if (nameEl && USERNAME) {
                nameEl.textContent = `Olá, ${USERNAME}`;
            }
            
            console.log("✅ Header carregado e renderizado.");
        } catch (error) {
            console.error('❌ Erro ao carregar header:', error);
        }
    }

    // ========================= FUNÇÕES GLOBAIS DO HEADER =========================

    globalThis.logout = function() {
        if (confirm("Deseja realmente sair?")) {
            localStorage.clear();
            window.location.replace("/html/login.html");
        }
    };

    // Inicializa o carregamento assim que o script rodar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadHeader);
    } else {
        loadHeader();
    }

})();