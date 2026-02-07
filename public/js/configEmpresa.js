/**
 * configEmpresa.js
 * Página de configurações da empresa (master-only)
 */
(function () {
    const API = '/api/empresa-config';
    const TOKEN = localStorage.getItem('token');
    const HEADERS = {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
    };

    let configAtual = {};
    let logoAlterada = false;

    // ─── INIT ──────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', carregarConfig);

    // ─── CARREGAR CONFIG ────────────────────────────────────
    async function carregarConfig() {
        try {
            const res = await fetch(API, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.erro || 'Erro ao carregar configurações');
            }

            configAtual = data.config;

            // Logo
            if (configAtual.logoCaminho) {
                const img = document.getElementById('logoPreview');
                img.src = configAtual.logoCaminho;
                img.style.display = 'block';
                document.getElementById('logoPlaceholder').style.display = 'none';
                document.getElementById('btnRemoverLogo').style.display = '';
            }

            // Capacidade
            if (configAtual.capacidadeAlmoco) {
                document.getElementById('capacidadeAlmoco').value = configAtual.capacidadeAlmoco;
            }
            if (configAtual.capacidadeJanta) {
                document.getElementById('capacidadeJanta').value = configAtual.capacidadeJanta;
            }

        } catch (e) {
            console.error('Erro ao carregar config:', e);
            mostrarToast(e.message || 'Erro ao carregar', 'error');
        }
    }

    // ─── PREVIEW LOGO ───────────────────────────────────────
    globalThis.previewLogo = (input) => {
        if (!input.files[0]) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.getElementById('logoPreview');
            img.src = e.target.result;
            img.style.display = 'block';
            document.getElementById('logoPlaceholder').style.display = 'none';
            document.getElementById('btnRemoverLogo').style.display = '';
            logoAlterada = true;
        };
        reader.readAsDataURL(input.files[0]);
    };

    globalThis.removerLogoPreview = () => {
        document.getElementById('logoPreview').style.display = 'none';
        document.getElementById('logoPlaceholder').style.display = '';
        document.getElementById('btnRemoverLogo').style.display = 'none';
        document.getElementById('logoInput').value = '';
        logoAlterada = false;
    };

    // ─── SALVAR CONFIG ──────────────────────────────────────
    globalThis.salvarConfig = async () => {
        const btn = document.getElementById('btnSalvar');
        const textoOriginal = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

        try {
            const fd = new FormData();

            // Logo (se alterada)
            const logoFile = document.getElementById('logoInput').files[0];
            if (logoFile) {
                fd.append('logo', logoFile);
            }

            // Capacidade
            fd.append('capacidadeAlmoco', document.getElementById('capacidadeAlmoco').value || '');
            fd.append('capacidadeJanta', document.getElementById('capacidadeJanta').value || '');

            const res = await fetch(API, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${TOKEN}` },
                body: fd
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.erro || 'Erro ao salvar');
            }

            configAtual = data.config;
            logoAlterada = false;

            // Atualizar preview com caminho do servidor
            if (configAtual.logoCaminho) {
                const img = document.getElementById('logoPreview');
                img.src = configAtual.logoCaminho;
                img.style.display = 'block';
                document.getElementById('logoPlaceholder').style.display = 'none';
                document.getElementById('btnRemoverLogo').style.display = '';
            }

            mostrarToast('Configurações salvas com sucesso!', 'success');

        } catch (e) {
            console.error('Erro ao salvar config:', e);
            mostrarToast(e.message || 'Erro ao salvar', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = textoOriginal;
        }
    };

    // ─── TOAST ──────────────────────────────────────────────
    function mostrarToast(msg, tipo = 'success') {
        const el = document.getElementById('toastConfig');
        const icon = document.getElementById('toastIcon');
        const texto = document.getElementById('toastMsg');

        texto.textContent = msg;

        if (tipo === 'success') {
            icon.className = 'fas fa-check-circle text-success';
            el.classList.remove('bg-danger', 'bg-warning');
            el.classList.add('bg-white');
        } else if (tipo === 'warning') {
            icon.className = 'fas fa-exclamation-triangle text-warning';
            el.classList.remove('bg-danger', 'bg-white');
            el.classList.add('bg-warning', 'bg-opacity-10');
        } else {
            icon.className = 'fas fa-exclamation-circle text-danger';
            el.classList.remove('bg-warning', 'bg-white');
            el.classList.add('bg-white');
        }

        const toast = bootstrap.Toast.getOrCreateInstance(el, { delay: 3000 });
        toast.show();
    }

})();
