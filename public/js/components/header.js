/**
 * header.js - Funções do header
 */

const TOKEN = localStorage.getItem("token");
const USERNAME = localStorage.getItem("username");
const USER_LEVEL = localStorage.getItem("userLevel") || "Admin";

if (!TOKEN) {
    window.location.href = "/login.html";
}

// Preencher dados do usuário
document.addEventListener("DOMContentLoaded", () => {
    if (USERNAME) {
        document.getElementById("userName").textContent = `Olá, ${USERNAME}`;
    }
    document.getElementById("userLevel").textContent = USER_LEVEL;
});

// ========================= FUNÇÕES DO MENU =========================

function novaReserva() {
    console.log("📝 Nova reserva");
    showMessage("Função em desenvolvimento", "info");
}

function relatorios() {
    console.log("📊 Relatórios");
    showMessage("Função em desenvolvimento", "info");
}

function configuracoes() {
    console.log("⚙️ Configurações");
    showMessage("Função em desenvolvimento", "info");
}

function logout() {
    if (confirm("Deseja sair?")) {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        localStorage.removeItem("userLevel");
        window.location.href = "/login.html";
    }
}

// ========================= MENU MOBILE =========================

function toggleMobileMenu() {
    const headerCenter = document.querySelector(".header-center");
    if (headerCenter) {
        headerCenter.style.display = headerCenter.style.display === "flex" ? "none" : "flex";
    }
}

// ========================= MOSTRAR MENSAGEM =========================

function showMessage(text, type = "info") {
    // Usar a função do main.js se disponível
    if (typeof window.showMsg === 'function') {
        window.showMsg(text, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${text}`);
    }
}

console.log("✅ header.js carregado");