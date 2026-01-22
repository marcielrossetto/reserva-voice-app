// ============================================
// auth.js - Autenticação
// ============================================

/**
 * Fazer logout
 */
function logout() {
    console.log('🚪 Fazendo logout...');
    
    if (confirm('Deseja sair?')) {
        localStorage.clear();
        console.log('✅ Logout realizado');
        location.href = 'login.html';
    }
}