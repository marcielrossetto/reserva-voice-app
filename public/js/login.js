const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001' 
  : 'https://reserva-voice-app-1.onrender.com';

if (localStorage.getItem("token")) {
  setTimeout(() => { window.location.href = "index.html"; }, 500);
}

let isRegister = false;

function toggleForm() {
  isRegister = !isRegister;
  document.getElementById("nome").classList.toggle("hidden");
  document.getElementById("empresa").classList.toggle("hidden");
  document.getElementById("title").innerText = isRegister ? "Criar conta" : "Entrar";
  document.getElementById("subtitle").innerText = isRegister ? "Crie sua conta no sistema" : "Acesse sua conta";
  document.querySelector("button").innerText = isRegister ? "Cadastrar" : "Entrar";
  document.querySelector(".toggle").innerText = isRegister ? "Já tenho conta" : "Criar conta grátis";
}

async function submitForm() {
  const btn = document.querySelector("button");
  btn.disabled = true;

  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();
  const nome = document.getElementById("nome").value.trim();

  if (!email || !senha) {
    document.getElementById("msg").style.color = "red";
    document.getElementById("msg").innerText = "Preencha email e senha";
    btn.disabled = false;
    return;
  }

  const payload = { nome, email, senha };
  const url = isRegister 
    ? `${API_BASE_URL}/api/auth/register` 
    : `${API_BASE_URL}/api/auth/login`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      document.getElementById("msg").style.color = "red";
      document.getElementById("msg").innerText = data.message || "Erro ao processar";
      btn.disabled = false;
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("usuario", data.user.nome);
    localStorage.setItem("empresa_id", data.user.empresa_id || "1");

    setTimeout(() => {
      window.location.href = "index.html";
    }, 300);

  } catch (e) {
    document.getElementById("msg").style.color = "red";
    document.getElementById("msg").innerText = "Erro de conexão: " + e.message;
    btn.disabled = false;
  }
}