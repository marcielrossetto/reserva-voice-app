/**
 * public/js/components/header.js
 * Gerencia o carregamento e funcionalidades do header
 */
(function() {
  // ========================= CONSTANTES =========================
  const TOKEN = localStorage.getItem("token");
  const USERNAME = localStorage.getItem("username");
  const EMPRESA_ID = localStorage.getItem("empresa_id");

  // ========================= SEGURANÇA =========================
  /**
   * Verifica se usuário está autenticado
   * Se não, redireciona para login
   */
  if (!TOKEN && !window.location.pathname.includes("login.html")) {
    window.location.replace("/html/login.html");
    return;
  }

  // ========================= INTERCEPTAR FETCH =========================
  /**
   * Adiciona empresa_id em TODAS as requisições fetch
   * Garante que o backend receba o x-empresa-id header
   */
  if (EMPRESA_ID) {
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const init = args[1] || {};
      init.headers = init.headers || {};
      init.headers['x-empresa-id'] = EMPRESA_ID;
      args[1] = init;
      return originalFetch.apply(this, args);
    };
  }

  // ========================= FUNÇÕES PRIVADAS =========================
  /**
   * Carrega o HTML do header e injeta no DOM
   */
  async function loadHeader() {
    const headerContainer = document.getElementById('main-header');
    if (!headerContainer) return;

    try {
      const response = await fetch('/html/header.html');
      if (!response.ok) throw new Error("Falha ao carregar header");
      
      const html = await response.text();
      headerContainer.innerHTML = html;

      // Preencher nome do usuário
      const nameEl = document.getElementById("userName");
      if (nameEl && USERNAME) {
        nameEl.textContent = `Olá, ${USERNAME}`;
      }
      
      console.log("✅ Header carregado");
      console.log("📍 Empresa:", EMPRESA_ID);
    } catch (error) {
      console.error('❌ Erro ao carregar header:', error);
    }
  }

  /**
   * Inicializa o carregamento do header
   * Executa quando o DOM está pronto
   */
  function initHeader() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', loadHeader);
    } else {
      loadHeader();
    }
  }

  // ========================= FUNÇÕES GLOBAIS =========================
  /**
   * Vai para página de pesquisa de reservas
   */
  globalThis.goToSearch = function() {
    if (!EMPRESA_ID) {
      alert("❌ Erro: empresa não encontrada. Faça login novamente.");
      window.location.href = '/html/login.html';
      return;
    }
    
    console.log("🔍 Acessando busca");
    window.location.href = '/search';
  };

  /**
   * Faz logout do usuário
   */
  globalThis.logout = function() {
    if (confirm("Deseja realmente sair?")) {
      localStorage.clear();
      window.location.replace("/html/login.html");
    }
  };

  /**
   * Abre página de nova reserva
   */
  globalThis.openReservationModal = function() {
    if (!EMPRESA_ID) {
      alert("❌ Erro: empresa não encontrada. Faça login novamente.");
      window.location.href = '/html/login.html';
      return;
    }
    window.location.href = '/adicionar-reserva';
  };

  /**
   * Carrega e exibe informações do usuário
   */
  globalThis.loadUserInfo = async function() {
    try {
      const response = await fetch('/api/user-info', {
        headers: { 'x-empresa-id': EMPRESA_ID || '' }
      });
      
      if (!response.ok) return;
      
      const data = await response.json();
      const userNameSpan = document.getElementById('userName');
      
      if (userNameSpan && data.nome) {
        userNameSpan.textContent = `Olá, ${data.nome}`;
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
    }
  };

  /**
   * Redireciona para fila de espera
   */
  globalThis.goToQueue = function() {
    window.location.href = '/html/fila.html';
  };

  // ========================= INICIALIZAÇÃO =========================
  initHeader();

})();