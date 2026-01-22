/**
 * main.js - Arquivo principal
 */

console.log("🚀 Iniciando aplicação...");

// Verificar token
const TOKEN = localStorage.getItem("token");
if (!TOKEN) {
    window.location.href = "/login.html";
}

// Inicializar quando documento estiver pronto
document.addEventListener("DOMContentLoaded", async () => {
    console.log("✅ DOM carregado");
    
    // Carregar dados iniciais
    await initApp();
});

async function initApp() {
    try {
        console.log("🔄 Inicializando app...");
        
        // 1. Renderizar calendário
        renderCalendar();
        console.log("✅ Calendário renderizado");
        
        // 2. Carregar reservas
        const reservas = await loadTodasReservas();
        console.log(`✅ ${reservas.length} reservas carregadas`);
        
        // 3. Preparar interface
        console.log("✅ Interface pronta");
        
    } catch (e) {
        console.error("❌ Erro ao inicializar:", e);
        showMessage("❌ Erro ao inicializar aplicação", "error");
    }
}

// Função para mostrar mensagens
function showMessage(text, type = "info") {
    const container = document.getElementById("messageContainer");
    if (!container) return;
    
    container.textContent = text;
    container.className = `message-container ${type}`;
    container.style.display = "block";
    
    setTimeout(() => {
        container.style.display = "none";
    }, 3000);
}

// Função para ocultar/mostrar sidebar
function toggleSidebar() {
    const sidebar = document.getElementById("sidebarLeft");
    if (!sidebar) return;
    
    sidebar.classList.toggle("hidden");
    console.log("🔄 Sidebar toggleado");
}

// Log final
console.log("✅ main.js carregado");