(function() {
  const getAuth = () => ({
    token: localStorage.getItem("token"),
    email: localStorage.getItem("email"),
    role: localStorage.getItem("userRole")
  });

  let lastScroll = 0;

  async function initHeader() {
    if (window.location.pathname.includes("login")) return;

    const auth = getAuth();
    if (!auth.token) {
        window.location.replace("/login.html");
        return;
    }

    const container = document.getElementById('header-container') || document.getElementById('main-header');
    if (!container) return;

    try {
      const resp = await fetch('/html/header.html');
      container.innerHTML = await resp.text();
      
      // Aplicar Nome do Usuário Real
      if (auth.email) {
        const namePart = auth.email.split('@')[0];
        const formatted = namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
        document.getElementById('userNameHeader').textContent = formatted;
      }

      // Check Admin
      if (auth.role === 'admin' || auth.role === 'master') {
        const adm = document.getElementById('adminMenu');
        if (adm) adm.style.display = 'block';
      }

      setupScroll();
      initManualDropdowns(); // Força o clique a funcionar
    } catch (e) { console.error("Erro no header:", e); }
  }

  // FUNÇÃO PARA GARANTIR QUE OS MENUS ABRAM
  function initManualDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown-toggle');
    
    dropdowns.forEach(toggle => {
      toggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const menu = this.nextElementSibling;
        
        // Fecha outros abertos
        document.querySelectorAll('.dropdown-menu.show').forEach(m => {
          if (m !== menu) m.classList.remove('show');
        });

        // Abre o atual
        menu.classList.toggle('show');
      });
    });

    // Fecha ao clicar fora
    document.addEventListener('click', () => {
      document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
    });
  }

  function setupScroll() {
    const header = document.getElementById('mainHeader');
    window.addEventListener('scroll', () => {
      const current = window.pageYOffset;
      if (current <= 70) { header.classList.remove('header-hidden'); return; }
      if (current > lastScroll) header.classList.add('header-hidden');
      else header.classList.remove('header-hidden');
      lastScroll = current;
    }, { passive: true });
  }

  // Funções Globais
  globalThis.toggleMobileMenu = () => {
    document.getElementById('mobileSidebar').classList.toggle('open');
  };

  globalThis.logout = () => {
    if (confirm("Deseja realmente sair?")) {
      localStorage.clear();
      window.location.replace("/login.html");
    }
  };

  globalThis.goToIndex = () => window.location.href = '/html/index.html';
  globalThis.goToQueue = () => window.location.href = '/html/fila.html';
  globalThis.goToSearch = () => window.location.href = '/search';
  
  globalThis.openReservationModal = () => {
    const m = document.getElementById('modalReserva');
    if (m && typeof bootstrap !== 'undefined') new bootstrap.Modal(m).show();
    else alert("Abrindo modal de reserva...");
  };

  initHeader();
})();