/* public/js/header.js */

/**
 * Carrega o header dinamicamente
 * Use em seus arquivos HTML: loadHeader()
 * 
 * 
 */

const originalFetch = window.fetch;
window.fetch = function(...args) {
  const empresaId = localStorage.getItem("empresa_id") || "1";
  const init = args[1] || {};
  init.headers = init.headers || {};
  init.headers['x-empresa-id'] = empresaId;
  args[1] = init;
  console.log('📤 Header x-empresa-id adicionado:', empresaId);
  return originalFetch.apply(this, args);
};
function loadHeader() {
  fetch('/html/header.html')
    .then(response => {
      if (!response.ok) throw new Error('Erro ao carregar header');
      return response.text();
    })
    .then(html => {
      const headerContainer = document.getElementById('headerContainer') || 
                            document.querySelector('header') || 
                            document.querySelector('[data-header]');
      
      if (headerContainer) {
        headerContainer.innerHTML = html;
        initHeaderEvents();
        loadUserInfo();
      }
    })
    .catch(error => console.error('Erro ao carregar header:', error));
}

/**
 * Inicializa eventos do header
 */
function initHeaderEvents() {
  // Busca ao pressionar Enter
  const searchInput = document.querySelector('.search-input');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const form = e.target.closest('.search-form');
        if (form) form.submit();
      }
    });
  }

  // Botão de busca
  const searchBtn = document.querySelector('.btn-search');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const form = document.querySelector('.search-form');
      if (form) form.submit();
    });
  }

  // Botão de logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
}

/**
 * Carrega informações do usuário
 */
async function loadUserInfo() {
  try {
    const response = await fetch('/api/user-info');
    if (!response.ok) throw new Error('Erro ao carregar info do usuário');
    
    const data = await response.json();
    const userNameSpan = document.getElementById('userName');
    
    if (userNameSpan && data.nome) {
      userNameSpan.textContent = data.nome;
    }
  } catch (error) {
    console.error('Erro:', error);
  }
}

/**
 * Faz logout do usuário
 */
function logout() {
  if (confirm('Tem certeza que deseja sair?')) {
    fetch('/api/logout', { method: 'POST' })
      .then(() => {
        window.location.href = '/login';
      })
      .catch(error => {
        console.error('Erro ao fazer logout:', error);
        window.location.href = '/login';
      });
  }
}

/**
 * Abre o modal de nova reserva
 */
function openReservationModal() {
  // Se você tiver um modal de reserva, abra aqui
  if (typeof modalManager !== 'undefined' && modalManager.addModal) {
    modalManager.show(modalManager.addModal);
  } else {
    // Ou redirecione para página de adicionar
    window.location.href = '/adicionar-reserva';
  }
}

/**
 * Realiza busca de reservas
 * @param {string} query - Termo de busca
 */
function searchReservations(query) {
  if (!query.trim()) {
    alert('Digite algo para buscar');
    return;
  }
  window.location.href = `/search?busca=${encodeURIComponent(query)}`;
}

/**
 * Limpa a busca
 */
function clearSearch() {
  const searchInput = document.querySelector('.search-input');
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
  }
}

// Inicializa header quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', loadHeader);

// Função auxiliar para redirecionar para fila
function goToQueue() {
  window.location.href = '/html/fila.html';
}