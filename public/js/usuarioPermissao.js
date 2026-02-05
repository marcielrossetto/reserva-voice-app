/**
 * Lógica de Gestão de Usuários (SaaS)
 */
const TOKEN = localStorage.getItem("token");

async function apiRequest(url, method = 'GET', body = null) {
    const config = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`
        }
    };
    if (body) config.body = JSON.stringify(body);
    const response = await fetch(url, config);
    if (response.status === 401) window.location.href = '/html/login.html';
    return response.json();
}

// 1. CARREGAR LISTA DE FUNCIONÁRIOS DA MINHA EMPRESA
globalThis.carregarLista = async function() {
    const tbody = document.getElementById('corpoTabela');
    if (!tbody) return;

    try {
        const data = await apiRequest('/api/usuarios/listar');
        if (data.success) {
            tbody.innerHTML = data.usuarios.map(u => `
                <tr>
                    <td><strong>${u.nome}</strong></td>
                    <td>${u.email}</td>
                    <td>${u.funcao}</td>
                    <td><span class="badge ${u.role === 'admin' ? 'bg-danger' : 'bg-info'}">${u.role.toUpperCase()}</span></td>
                    <td><span class="badge ${u.ativo ? 'bg-success' : 'bg-secondary'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger" onclick="excluirUsuario(${u.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (e) { console.error(e); }
};

// 2. CRIAR NOVO FUNCIONÁRIO COM SENHA DEFINIDA
globalThis.criarNovoUsuario = async function() {
    const payload = {
        nome: document.getElementById('novoNome').value,
        email: document.getElementById('novoEmail').value,
        senha: document.getElementById('novoSenha').value, // Senha definida por você
        funcao: document.getElementById('novoFuncao').value,
        role: document.getElementById('novoIsAdmin').checked ? 'admin' : 'funcionario'
    };

    if (payload.senha.length < 6) return alert("Senha muito curta!");

    const res = await apiRequest('/api/usuarios/cadastrar', 'POST', payload);
    if (res.success) {
        alert("Funcionário cadastrado!");
        location.reload();
    } else {
        alert("Erro: " + res.error);
    }
};

// 3. CARREGAR "MEUS DADOS"
async function carregarMeusDados() {
    const user = await apiRequest('/api/auth/me');
    document.getElementById('meuNome').value = user.nome;
    document.getElementById('meuEmail').value = user.email;
}

document.addEventListener("DOMContentLoaded", () => {
    globalThis.carregarLista();
    carregarMeusDados();
});