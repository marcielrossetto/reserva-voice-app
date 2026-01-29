/**
 * public/js/components/header.js
 * Gerencia o carregamento e funcionalidades do header
 */
(function() {
  // ========================= CONSTANTES =========================
  const TOKEN = localStorage.getItem("token");
  const EMAIL = localStorage.getItem("email");
  const EMPRESA_ID = localStorage.getItem("empresaId");

  // ========================= SEGURANÇA =========================
  /**
   * Verifica se usuário está autenticado
   * Se não, redireciona para login
   */
  if (!TOKEN && !window.location.pathname.includes("login")) {
    console.warn("❌ Sem token - redirecionando para login");
    window.location.replace("/login.html");
    return;
  }

  // ========================= FUNÇÕES PRIVADAS =========================
  /**
   * Carrega o HTML do header e injeta no DOM
   */
  async function loadHeader() {
    const headerContainer = document.getElementById('header-container') || 
                           document.getElementById('main-header');
    if (!headerContainer) {
      console.warn("⚠️ Elemento header-container não encontrado");
      return;
    }

    try {
      const response = await fetch('/html/header.html');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const html = await response.text();
      headerContainer.innerHTML = html;

      // ✅ Preencher dados do usuário
      const emailEl = document.getElementById("userEmail");
      if (emailEl && EMAIL) {
        emailEl.textContent = EMAIL;
      }

      console.log("✅ Header carregado");
      console.log("📍 Empresa ID:", EMPRESA_ID);
      console.log("📧 Email:", EMAIL);
      
      // Inicializar eventos do header
      initHeaderEvents();
    } catch (error) {
      console.error('❌ Erro ao carregar header:', error);
    }
  }

  /**
   * Inicializa eventos do header após carregar
   */
  function initHeaderEvents() {
    // ✅ Botão de logout
    const logoutBtn = document.getElementById('btnLogout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logout);
    }

    // ✅ Botões de navegação
    const btnIndex = document.getElementById('btnIndex');
    if (btnIndex) {
      btnIndex.addEventListener('click', () => goToIndex());
    }

    const btnFila = document.getElementById('btnFila');
    if (btnFila) {
      btnFila.addEventListener('click', () => goToQueue());
    }

    const btnNovaReserva = document.getElementById('btnNovaReserva');
    if (btnNovaReserva) {
      btnNovaReserva.addEventListener('click', openReservationModal);
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
   * ✅ Abre modal de nova reserva
   */
  globalThis.openReservationModal = function(e) {
    if (e) e.preventDefault();

    if (!EMPRESA_ID) {
      alert("❌ Erro: empresa não encontrada. Faça login novamente.");
      window.location.href = '/login.html';
      return;
    }

    console.log("➕ Abrindo modal de reserva...");

    // Tenta abrir modal do Bootstrap
    const modalElement = document.getElementById('modalEditarReserva') || 
                        document.getElementById('modalReserva');
    
    if (modalElement) {
      try {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        console.log("✅ Modal aberto");
      } catch (error) {
        console.error("❌ Erro ao abrir modal:", error);
        alert("❌ Erro ao abrir modal de reserva");
      }
    } else {
      console.warn("⚠️ Modal não encontrado no DOM");
      alert("⚠️ Modal de reserva não disponível");
    }
  };

  /**
   * ✅ Faz logout do usuário
   */
  globalThis.logout = function(e) {
    if (e) e.preventDefault();

    if (confirm("🚪 Deseja realmente sair?")) {
      console.log("🚪 Fazendo logout...");
      localStorage.clear();
      window.location.replace("/login.html");
    }
  };

  /**
   * ✅ Vai para página inicial (index.html)
   */
  globalThis.goToIndex = function(e) {
    if (e) e.preventDefault();

    if (!EMPRESA_ID) {
      alert("❌ Erro: empresa não encontrada. Faça login novamente.");
      window.location.href = '/login.html';
      return;
    }

    console.log("📊 Acessando índice");
    window.location.href = '/html/index.html';
  };

  /**
   * ✅ Vai para fila de espera
   */
  globalThis.goToQueue = function(e) {
    if (e) e.preventDefault();

    if (!EMPRESA_ID) {
      alert("❌ Erro: empresa não encontrada. Faça login novamente.");
      window.location.href = '/login.html';
      return;
    }

    console.log("📋 Acessando fila");
    window.location.href = '/html/fila.html';
  };

  /**
   * ✅ Abre busca/filtro de reservas
   */
  globalThis.goToSearch = function(e) {
    if (e) e.preventDefault();

    if (!EMPRESA_ID) {
      alert("❌ Erro: empresa não encontrada. Faça login novamente.");
      window.location.href = '/login.html';
      return;
    }

    console.log("🔍 Acessando busca");
    
    // Se está em index.html, focus no input de busca
    const searchInput = document.getElementById('filterBusca');
    if (searchInput) {
      searchInput.focus();
      return;
    }

    // Senão, vai para index.html
    window.location.href = '/html/index.html';
  };

  /**
   * ✅ Carrega e exibe informações do usuário
   */
  globalThis.loadUserInfo = async function() {
    try {
      const emailEl = document.getElementById("userEmail");
      
      if (emailEl && EMAIL) {
        emailEl.textContent = EMAIL;
        console.log("✅ Informações do usuário carregadas");
      }
    } catch (error) {
      console.error('❌ Erro ao carregar usuário:', error);
    }
  };

  /**
   * ✅ Exibe/esconde menu de usuário
   */
  globalThis.toggleUserMenu = function(e) {
    if (e) e.stopPropagation();

    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
      userMenu.classList.toggle('show');
    }
  };

  /**
   * ✅ Fecha menu ao clicar fora
   */
  document.addEventListener('click', function(e) {
    const userMenu = document.getElementById('userMenu');
    const userBtn = document.getElementById('btnUser');
    
    if (userMenu && !userMenu.contains(e.target) && !userBtn?.contains(e.target)) {
      userMenu.classList.remove('show');
    }
  });

  // ========================= INICIALIZAÇÃO =========================
  console.log("🚀 Inicializando Header...");
  initHeader();

  // Exportar para uso global
  globalThis.initHeaderEvents = initHeaderEvents;
  globalThis.loadHeader = loadHeader;

  console.log("✅ header.js REFATORADO carregado!");

})();