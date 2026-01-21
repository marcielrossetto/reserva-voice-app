const token = localStorage.getItem("token");
if (!token) {
    window.location.href = "login.html";
}

const username = localStorage.getItem("username");
if (username) {
    document.getElementById("userName").textContent = `Olá, ${username}`;
}

// Inicializar calendário
calendar = new Calendar(token);

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    window.location.href = "login.html";
});

// Mensagens
function showMessage(text, type) {
    const msg = document.getElementById("apiMessage");
    msg.textContent = text;
    msg.className = `message-container message ${type}`;
}

// Enviar Reserva
document.getElementById("submitTextBtn").addEventListener("click", async () => {
    const texto = document.getElementById("textInputArea").value.trim();
    if (!texto) {
        showMessage("Escreva uma mensagem", "error");
        return;
    }

    showMessage("Processando...", "loading");
    const btn = event.target;
    btn.disabled = true;

    try {
        const res = await fetch("http://localhost:3001/api/reservas/process-reservation", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ mensagem: texto })
        });

        const data = await res.json();

        if (!res.ok) {
            showMessage(`❌ ${data.erro || data.message}`, "error");
            btn.disabled = false;
            return;
        }

        showMessage("✅ Reserva criada!", "success");
        document.getElementById("textInputArea").value = "";
        carregarReservas();
        calendar.render();

    } catch (e) {
        showMessage(`❌ Erro: ${e.message}`, "error");
        btn.disabled = false;
    }
});

// Carregar Reservas
async function carregarReservas() {
    try {
        const res = await fetch("http://localhost:3001/api/reservas", {
            headers: { "Authorization": `Bearer ${token}` }
        });

        const data = await res.json();
        const tbody = document.querySelector("#reservasTable tbody");
        tbody.innerHTML = "";

        if (data.reservas && data.reservas.length > 0) {
            data.reservas.forEach(r => {
                const row = `
                    <tr>
                        <td>${r.nome}</td>
                        <td>${r.telefone}</td>
                        <td>${r.data}</td>
                        <td>${r.horario}</td>
                        <td>${r.numPessoas}</td>
                        <td>${r.tipoEvento || "-"}</td>
                        <td>${r.observacoes || "-"}</td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });
        } else {
            tbody.innerHTML = "<tr><td colspan='7' style='text-align:center'>Nenhuma reserva</td></tr>";
        }
    } catch (e) {
        console.error("Erro:", e);
    }
}

// Filtrar Reservas
document.getElementById("filterBtn").addEventListener("click", async () => {
    const startDate = document.getElementById("filterStartDate").value;
    const endDate = document.getElementById("filterEndDate").value;

    if (!startDate || !endDate) {
        showMessage("Selecione ambas as datas", "error");
        return;
    }

    try {
        const res = await fetch("http://localhost:3001/api/reservas", {
            headers: { "Authorization": `Bearer ${token}` }
        });

        const data = await res.json();
        const tbody = document.querySelector("#reservasTable tbody");
        tbody.innerHTML = "";

        const filtered = data.reservas.filter(r => {
            const rData = new Date(r.data);
            const start = new Date(startDate);
            const end = new Date(endDate);
            return rData >= start && rData <= end;
        });

        if (filtered.length > 0) {
            filtered.forEach(r => {
                const row = `
                    <tr>
                        <td>${r.nome}</td>
                        <td>${r.telefone}</td>
                        <td>${r.data}</td>
                        <td>${r.horario}</td>
                        <td>${r.numPessoas}</td>
                        <td>${r.tipoEvento || "-"}</td>
                        <td>${r.observacoes || "-"}</td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });
        } else {
            tbody.innerHTML = "<tr><td colspan='7' style='text-align:center'>Nenhuma reserva no período</td></tr>";
        }
    } catch (e) {
        console.error("Erro:", e);
    }
});

// Limpar Filtro
document.getElementById("clearFilterBtn").addEventListener("click", () => {
    document.getElementById("filterStartDate").value = "";
    document.getElementById("filterEndDate").value = "";
    carregarReservas();
});

carregarReservas();