document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
  }

  // Logout
  const logoutBtn = document.createElement("button");
  logoutBtn.textContent = "Sair";
  logoutBtn.style = "position:fixed; top:10px; right:10px; background:#d33; color:white; padding:8px; border:none; cursor:pointer;";
  document.body.appendChild(logoutBtn);

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "login.html";
  });

  // UI Elements
  const submitTextBtn = document.getElementById("submitTextBtn");
  const textInputArea = document.getElementById("textInputArea");
  const apiMessage = document.getElementById("apiMessage");
  const reservasTableBody = document.querySelector("#reservasTable tbody");
  const userName = localStorage.getItem("username");
  const userNameElem = document.getElementById("userName");

  if (userNameElem && userName) {
    userNameElem.textContent = `Olá, ${userName}`;
  }

  function displayMessage(text, type) {
    apiMessage.textContent = text;
    apiMessage.className = `message ${type}`;
  }

  // Enviar reserva
  submitTextBtn.addEventListener("click", async () => {
    const texto = textInputArea.value.trim();
    if (!texto) {
      displayMessage("Escreva uma mensagem", "error");
      return;
    }

    displayMessage("Processando...", "loading");
    submitTextBtn.disabled = true;

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
        displayMessage(`❌ ${data.erro || data.message}`, "error");
        return;
      }

      displayMessage("✅ Reserva criada!", "success");
      textInputArea.value = "";
      carregarReservas();

    } catch (e) {
      displayMessage(`❌ Erro: ${e.message}`, "error");
    } finally {
      submitTextBtn.disabled = false;
    }
  });

  // Carregar reservas
  async function carregarReservas() {
    try {
      const res = await fetch("http://localhost:3001/api/reservas", {
        headers: { "Authorization": `Bearer ${token}` }
      });

      const data = await res.json();

      if (data.reservas) {
        reservasTableBody.innerHTML = "";
        data.reservas.forEach(r => {
          const row = `
            <tr>
              <td>${r.nome}</td>
              <td>${r.telefone}</td>
              <td>${r.data}</td>
              <td>${r.horario}</td>
              <td>${r.numPessoas}</td>
              <td>${r.observacoes || ""}</td>
            </tr>
          `;
          reservasTableBody.innerHTML += row;
        });
      }
    } catch (e) {
      console.error("Erro ao carregar:", e);
    }
  }

  carregarReservas();
});