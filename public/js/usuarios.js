/**
 * usuarios.js - CRUD de usuarios da empresa
 */

let todosUsuarios = [];

document.addEventListener("DOMContentLoaded", () => {
    if (!localStorage.getItem("token")) return;

    // Verificar se é master
    const role = localStorage.getItem("userRole");
    if (role !== "master") {
        document.querySelector(".container-fluid").innerHTML =
            '<div class="text-center text-danger py-5"><h5>Sem permissao</h5><p>Apenas usuarios master podem acessar esta pagina.</p><a href="/html/index.html">Voltar ao Dashboard</a></div>';
        return;
    }

    listarUsuarios();
});

// ========== LISTAR ==========
async function listarUsuarios() {
    try {
        const res = await requisicaoAutenticada("/api/usuario/listar");
        const data = await res.json();

        if (!data.success) {
            showToast(data.erro || "Erro ao listar", "danger");
            return;
        }

        todosUsuarios = data.usuarios;
        renderTabela(todosUsuarios);
    } catch (err) {
        console.error("Erro:", err);
        showToast("Erro ao carregar usuarios", "danger");
    }
}

function renderTabela(usuarios) {
    const corpo = document.getElementById("corpoTabela");
    document.getElementById("totalUsuarios").textContent = usuarios.length;

    if (usuarios.length === 0) {
        corpo.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Nenhum usuario encontrado</td></tr>';
        return;
    }

    corpo.innerHTML = usuarios.map(u => {
        const statusClass = u.status ? "bg-success" : "bg-danger";
        const statusText = u.status ? "Ativo" : "Inativo";
        const nivelBadge = u.nivel === "master" ? "bg-dark" : u.nivel === "admin" ? "bg-info" : "bg-secondary";
        const acesso = u.ultimoAcesso ? new Date(u.ultimoAcesso).toLocaleString("pt-BR") : "Nunca";

        return `<tr>
            <td class="fw-bold">${u.nome}</td>
            <td class="text-muted small">${u.email}</td>
            <td><span class="badge ${nivelBadge}">${u.nivel}</span></td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
            <td class="d-none d-md-table-cell small text-muted">${acesso}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="abrirModalEditar(${u.id})" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-outline-warning" onclick="abrirModalSenha(${u.id}, '${u.nome.replace(/'/g, "\\'")}')" title="Senha"><i class="fas fa-key"></i></button>
                    <button class="btn btn-outline-${u.status ? 'danger' : 'success'}" onclick="alterarStatus(${u.id}, ${!u.status})" title="${u.status ? 'Desativar' : 'Ativar'}">
                        <i class="fas fa-${u.status ? 'ban' : 'check'}"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join("");
}

// ========== FILTRAR ==========
function filtrarTabela() {
    const busca = document.getElementById("buscaUsuario").value.toLowerCase();
    const filtrados = todosUsuarios.filter(u =>
        u.nome.toLowerCase().includes(busca) || u.email.toLowerCase().includes(busca)
    );
    renderTabela(filtrados);
}

// ========== CRIAR ==========
function abrirModalCriar() {
    document.getElementById("modalTitulo").textContent = "Novo Usuario";
    document.getElementById("usuarioId").value = "";
    document.getElementById("inputNome").value = "";
    document.getElementById("inputEmail").value = "";
    document.getElementById("inputSenha").value = "";
    document.getElementById("inputNivel").value = "usuario";
    document.getElementById("grupoSenha").style.display = "block";
    document.getElementById("inputSenha").required = true;
    resetRequisitos();
    new bootstrap.Modal(document.getElementById("modalUsuario")).show();
}

// ========== EDITAR ==========
async function abrirModalEditar(id) {
    try {
        const res = await requisicaoAutenticada(`/api/usuario/${id}`);
        const data = await res.json();

        if (!data.success) {
            showToast(data.erro || "Erro ao buscar", "danger");
            return;
        }

        const u = data.usuario;
        document.getElementById("modalTitulo").textContent = "Editar Usuario";
        document.getElementById("usuarioId").value = u.id;
        document.getElementById("inputNome").value = u.nome;
        document.getElementById("inputEmail").value = u.email;
        document.getElementById("inputSenha").value = "";
        document.getElementById("inputNivel").value = u.nivel;
        document.getElementById("grupoSenha").style.display = "none";
        document.getElementById("inputSenha").required = false;

        new bootstrap.Modal(document.getElementById("modalUsuario")).show();
    } catch (err) {
        showToast("Erro ao buscar usuario", "danger");
    }
}

// ========== SALVAR (CRIAR OU EDITAR) ==========
async function salvarUsuario() {
    const id = document.getElementById("usuarioId").value;
    const nome = document.getElementById("inputNome").value.trim();
    const email = document.getElementById("inputEmail").value.trim();
    const senha = document.getElementById("inputSenha").value;
    const nivel = document.getElementById("inputNivel").value;

    if (!nome || !email) {
        showToast("Nome e email sao obrigatorios", "warning");
        return;
    }

    const btn = document.getElementById("btnSalvar");
    btn.disabled = true;
    btn.textContent = "Salvando...";

    try {
        let res;
        if (id) {
            // Editar
            res = await requisicaoAutenticada(`/api/usuario/${id}`, {
                method: "PUT",
                body: JSON.stringify({ nome, email, nivel })
            });
        } else {
            // Criar
            if (!senha) {
                showToast("Senha e obrigatoria para novo usuario", "warning");
                btn.disabled = false;
                btn.textContent = "Salvar";
                return;
            }
            res = await requisicaoAutenticada("/api/usuario", {
                method: "POST",
                body: JSON.stringify({ nome, email, senha, nivel })
            });
        }

        const data = await res.json();

        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById("modalUsuario")).hide();
            showToast(id ? "Usuario atualizado" : "Usuario criado", "success");
            listarUsuarios();
        } else {
            showToast(data.erro || "Erro ao salvar", "danger");
        }
    } catch (err) {
        showToast("Erro de conexao", "danger");
    } finally {
        btn.disabled = false;
        btn.textContent = "Salvar";
    }
}

// ========== ALTERAR STATUS ==========
async function alterarStatus(id, novoStatus) {
    const acao = novoStatus ? "ativar" : "desativar";
    if (!confirm(`Deseja ${acao} este usuario?`)) return;

    try {
        const res = await requisicaoAutenticada(`/api/usuario/${id}/status`, {
            method: "PUT",
            body: JSON.stringify({ status: novoStatus })
        });

        const data = await res.json();

        if (data.success) {
            showToast(data.mensagem, "success");
            listarUsuarios();
        } else {
            showToast(data.erro || "Erro ao alterar status", "danger");
        }
    } catch (err) {
        showToast("Erro de conexao", "danger");
    }
}

// ========== ALTERAR SENHA ==========
function abrirModalSenha(id, nome) {
    document.getElementById("senhaUsuarioId").value = id;
    document.getElementById("senhaUsuarioNome").textContent = nome;
    document.getElementById("inputNovaSenha").value = "";
    resetRequisitosNovaSenha();
    new bootstrap.Modal(document.getElementById("modalSenha")).show();
}

async function salvarNovaSenha() {
    const id = document.getElementById("senhaUsuarioId").value;
    const novaSenha = document.getElementById("inputNovaSenha").value;

    if (!novaSenha) {
        showToast("Digite a nova senha", "warning");
        return;
    }

    try {
        const res = await requisicaoAutenticada(`/api/usuario/${id}/senha`, {
            method: "PUT",
            body: JSON.stringify({ novaSenha })
        });

        const data = await res.json();

        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById("modalSenha")).hide();
            showToast("Senha alterada com sucesso", "success");
        } else {
            showToast(data.erro || "Erro ao alterar senha", "danger");
        }
    } catch (err) {
        showToast("Erro de conexao", "danger");
    }
}

// ========== VALIDACAO DE SENHA ==========
function validarSenhaForm() {
    const s = document.getElementById("inputSenha").value;
    atualizarReq("reqMaius", /[A-Z]/.test(s));
    atualizarReq("reqMinus", /[a-z]/.test(s));
    atualizarReq("reqNum", /[0-9]/.test(s));
    atualizarReq("reqEsp", /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(s));
    atualizarReq("reqLen", s.length >= 8);
}

function validarNovaSenhaForm() {
    const s = document.getElementById("inputNovaSenha").value;
    atualizarReq("reqMaius2", /[A-Z]/.test(s));
    atualizarReq("reqMinus2", /[a-z]/.test(s));
    atualizarReq("reqNum2", /[0-9]/.test(s));
    atualizarReq("reqEsp2", /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(s));
    atualizarReq("reqLen2", s.length >= 8);
}

function atualizarReq(id, ok) {
    const el = document.getElementById(id);
    el.classList.toggle("req-ok", ok);
    el.classList.toggle("req-no", !ok);
}

function resetRequisitos() {
    ["reqMaius", "reqMinus", "reqNum", "reqEsp", "reqLen"].forEach(id => {
        const el = document.getElementById(id);
        el.classList.remove("req-ok");
        el.classList.add("req-no");
    });
}

function resetRequisitosNovaSenha() {
    ["reqMaius2", "reqMinus2", "reqNum2", "reqEsp2", "reqLen2"].forEach(id => {
        const el = document.getElementById(id);
        el.classList.remove("req-ok");
        el.classList.add("req-no");
    });
}

console.log("usuarios.js carregado");
