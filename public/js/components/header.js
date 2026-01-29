/**
 * public/js/components/header.js - REFATORADO
 * ✅ Validação segura de token
 * ✅ Tratamento de erro quando token inválido
 * ✅ Bloqueia acesso sem token válido
 */

(function() {
  // ========================= CONSTANTES =========================
  const TOKEN = localStorage.getItem("token");
  const EMAIL = localStorage.getItem("email");
  const EMPRESA_ID = localStorage.getItem("empresaId");
  const IS_LOGIN_PAGE = window.location.pathname.includes("login");

  // ========================= STATE GLOBAL =========================
  let tokenValidado = false;
  let tentativasValidacao = 0;
  const MAX_TENTATIVAS = 3;

  // ========================= VALIDAÇÃO DE TOKEN =========================
  /**
   * ✅ Valida token com o servidor
   * Se inválido, limpa localStorage e redireciona para login
   */
  async function validarTokenComServidor() {
    // ✅ Se já está na página de login, não valida
    if (IS_LOGIN_PAGE) {
      tokenValidado = true;
      return true;
    }

    // ❌ Se não tem token, redireciona para login
    if (!TOKEN) {
      console.warn("❌ Token não encontrado - redirecionando para login");
      redireccionarParaLogin("Token expirado. Faça login novamente.");
      return false;
    }

    try {
      console.log("🔍 Validando token com servidor...");
      
      const response = await fetch('/api/auth/validate', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      // ✅ Token válido
      if (response.ok) {
        console.log("✅ Token válido!");
        tokenValidado = true;
        return true;
      }

      // ❌ Token inválido (401/403)
      if (response.status === 401 || response.status === 403) {
        console.error("❌ Token inválido ou expirado");
        redireccionarParaLogin("Sua sessão expirou. Faça login novamente.");
        return false;
      }

      // ❌ Erro no servidor
      console.error("❌ Erro na validação:", response.status);
      redireccionarParaLogin("Erro ao validar sessão. Tente novamente.");
      return false;

    } catch (error) {
      tentativasValidacao++;
      
      // Se falhar 3x, assume que não tem conexão e bloqueia
      if (tentativasValidacao >= MAX_TENTATIVAS) {
        console.error("❌ Falha ao conectar ao servidor (tentativa", tentativasValidacao, ")");
        redireccionarParaLogin("Erro de conexão. Verifique sua internet.");
        return false;
      }

      console.warn("⚠️ Erro ao validar token:", error.message);
      
      // Na primeira falha, tenta novamente em 2s
      if (tentativasValidacao === 1) {
        console.log("🔄 Tentando novamente em 2s...");
        setTimeout(validarTokenComServidor, 2000);
        return false;
      }

      return false;
    }
  }

  // ========================= REDIRECIONAMENTO =========================
  /**
   * ✅ Redireciona para login com mensagem de erro
   */
  function redireccionarParaLogin(mensagem) {
    console.error("🚪 Redirecionando para login:", mensagem);
    
    // Limpar localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("empresaId");
    
    // Guardar mensagem no sessionStorage (para exibir no login)
    if (mensagem) {
      sessionStorage.setItem("loginMensagem", mensagem);
      sessionStorage.setItem("loginMensagemTipo", "danger");
    }

    // Redirecionar com replace (não mantém histórico)
    window.location.replace("/login.html");
  }

  // ========================= CARREGAMENTO DO HEADER =========================
  /**
   * ✅ Carrega HTML do header apenas se token válido
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

      console.log("✅ Header carregado com sucesso");
      console.log("📍 Empresa ID:", EMPRESA_ID);
      console.log("📧 Email:", EMAIL);
      
      // Inicializar eventos
      initHeaderEvents();
    } catch (error) {
      console.error('❌ Erro ao carregar header:', error);
      redireccionarParaLogin("Erro ao carregar interface.");
    }
  }

  // ========================= EVENTOS DO HEADER =========================
  /**
   * ✅ Inicializa eventos após carregar header
   */
  function initHeaderEvents() {
    // Logout
    const logoutBtn = document.getElementById('btnLogout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logout);
    }

    // Navegação
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

  // ========================= INICIALIZAÇÃO =========================
  /**
   * ✅ Inicia validação e carregamento
   */
  async function inicializar() {
    console.log("🚀 Inicializando Header...");

    // ✅ Validar token
    const tokenValido = await validarTokenComServidor();

    // ✅ Se token válido, carregar header
    if (tokenValido) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadHeader);
      } else {
        loadHeader();
      }
    }
    // ❌ Se inválido, já redireciona para login
  }

  // ========================= FUNÇÕES GLOBAIS =========================

  /**
   * ✅ Abre modal de nova reserva
   */
  globalThis.openReservationModal = function(e) {
    if (e) e.preventDefault();

    if (!EMPRESA_ID || !tokenValidado) {
      alert("❌ Sessão inválida. Faça login novamente.");
      redireccionarParaLogin("Sessão expirada.");
      return;
    }

    console.log("➕ Abrindo modal de reserva...");

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
      sessionStorage.clear();
      window.location.replace("/login.html");
    }
  };

  /**
   * ✅ Vai para página inicial (index.html)
   */
  globalThis.goToIndex = function(e) {
    if (e) e.preventDefault();

    if (!EMPRESA_ID || !tokenValidado) {
      alert("❌ Sessão inválida. Faça login novamente.");
      redireccionarParaLogin("Sessão expirada.");
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

    if (!EMPRESA_ID || !tokenValidado) {
      alert("❌ Sessão inválida. Faça login novamente.");
      redireccionarParaLogin("Sessão expirada.");
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

    if (!EMPRESA_ID || !tokenValidado) {
      alert("❌ Sessão inválida. Faça login novamente.");
      redireccionarParaLogin("Sessão expirada.");
      return;
    }

    console.log("🔍 Acessando busca");
    
    const searchInput = document.getElementById('filterBusca');
    if (searchInput) {
      searchInput.focus();
      return;
    }

    window.location.href = '/html/index.html';
  };

  /**
   * ✅ Carrega informações do usuário
   */
  globalThis.loadUserInfo = async function() {
    try {
      if (!tokenValidado) {
        console.warn("⚠️ Token não validado ainda");
        return;
      }

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

  // ========================= EXECUTAR =========================
  console.log("✅ header.js REFATORADO - iniciando...");
  inicializar();

  // Exportar para uso global
  globalThis.initHeaderEvents = initHeaderEvents;
  globalThis.loadHeader = loadHeader;

})();