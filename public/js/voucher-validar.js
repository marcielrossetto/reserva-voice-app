(function () {
    // Extrair código da URL: /voucher/CODIGO
    const pathParts = window.location.pathname.split('/');
    const codigo = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];
    const params = new URLSearchParams(window.location.search);
    const tokenSeg = params.get('token');

    const headerEl = document.getElementById('cardHeader');
    const loadingEl = document.getElementById('loading');
    const conteudoEl = document.getElementById('conteudo');

    // ========================================
    // INIT
    // ========================================
    document.addEventListener('DOMContentLoaded', async () => {
        if (!codigo || !tokenSeg) {
            mostrarLinkInvalido();
            return;
        }
        await carregarVoucher();
    });

    // ========================================
    // CARREGAR VOUCHER
    // ========================================
    async function carregarVoucher() {
        loadingEl.classList.add('active');
        conteudoEl.style.display = 'none';

        try {
            const res = await fetch(`/api/voucher/publico/${encodeURIComponent(codigo)}?token=${encodeURIComponent(tokenSeg)}`);
            const data = await res.json();

            loadingEl.classList.remove('active');
            conteudoEl.style.display = 'block';

            if (!res.ok) {
                mostrarErro(data.erro || 'Voucher não encontrado');
                return;
            }

            const v = data.voucher;

            // Atualizar header com logo e nome
            atualizarHeader(v.nomeEmpresa, v.logoCaminho);

            // Renderizar por estado
            switch (v.estado) {
                case 'pendente':
                    mostrarFormulario(v);
                    break;
                case 'validado':
                case 'resgatado':
                    mostrarJaValidado(v);
                    break;
                case 'expirado':
                    mostrarExpirado(v);
                    break;
                case 'cancelado':
                    mostrarCancelado();
                    break;
                default:
                    mostrarErro('Estado desconhecido');
            }
        } catch (e) {
            loadingEl.classList.remove('active');
            conteudoEl.style.display = 'block';
            mostrarErro('Erro ao carregar voucher. Tente novamente.');
        }
    }

    // ========================================
    // HEADER COM LOGO
    // ========================================
    function atualizarHeader(nome, logoCaminho) {
        let logoHtml = '';
        if (logoCaminho) {
            logoHtml = `<img src="${esc(logoCaminho)}" alt="Logo" class="logo">`;
        }
        headerEl.innerHTML = `
            ${logoHtml}
            <h5 class="mb-0 mt-2">${esc(nome)}</h5>`;
    }

    // ========================================
    // FORMULÁRIO DE VALIDAÇÃO
    // ========================================
    function mostrarFormulario(v) {
        const validade = new Date(v.dataValidade).toLocaleDateString('pt-BR');

        conteudoEl.innerHTML = `
            <i class="fas fa-ticket-alt status-icon icon-form"></i>
            <h4 class="mb-3">Validar Voucher</h4>
            <div class="voucher-code">${esc(v.codigoVoucher)}</div>
            <div class="validade-info">
                <i class="fas fa-calendar-check me-2"></i>
                Válido até: ${validade}
            </div>

            <form id="formValidar" onsubmit="return false;">
                <div class="form-group">
                    <label for="nome_cliente">
                        <i class="fas fa-user me-2"></i>Seu Nome Completo *
                    </label>
                    <input type="text" class="form-control" id="nome_cliente" placeholder="Digite seu nome completo" required autofocus>
                </div>
                <div class="form-group">
                    <label for="telefone_cliente">
                        <i class="fas fa-phone me-2"></i>Seu Telefone/WhatsApp *
                    </label>
                    <input type="tel" class="form-control" id="telefone_cliente" placeholder="(00) 00000-0000" required>
                </div>
                <div class="form-group">
                    <label for="cpf_cliente">
                        <i class="fas fa-id-card me-2"></i>Seu CPF *
                    </label>
                    <input type="text" class="form-control" id="cpf_cliente" placeholder="000.000.000-00" maxlength="14" required>
                </div>
                <div class="info-box">
                    <small>
                        <i class="fas fa-exclamation-circle me-2"></i>
                        <strong>Atenção:</strong> Ao validar, este voucher será ativado e não poderá ser validado novamente.
                    </small>
                </div>
                <button type="button" class="btn-validar" id="btnValidar" onclick="enviarValidacao()">
                    <i class="fas fa-check-circle me-2"></i>Validar Voucher
                </button>
            </form>`;

        // Máscaras
        configurarMascaras();
    }

    // ========================================
    // ENVIAR VALIDAÇÃO
    // ========================================
    async function enviarValidacao() {
        const nome = document.getElementById('nome_cliente').value.trim();
        const telefone = document.getElementById('telefone_cliente').value.trim();
        const cpf = document.getElementById('cpf_cliente').value.trim();

        if (!nome || !telefone || !cpf) {
            alert('Por favor, preencha todos os campos!');
            return;
        }

        const btn = document.getElementById('btnValidar');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Validando...';

        try {
            const res = await fetch('/api/voucher/publico/validar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codigo, token: tokenSeg, nome, telefone, cpf })
            });
            const data = await res.json();

            if (!res.ok) {
                alert(data.erro || 'Erro ao validar');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-check-circle me-2"></i>Validar Voucher';
                return;
            }

            // Recarregar para mostrar estado de sucesso
            await carregarVoucherSucesso();
        } catch (e) {
            alert('Erro de conexão. Tente novamente.');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check-circle me-2"></i>Validar Voucher';
        }
    }

    async function carregarVoucherSucesso() {
        try {
            const res = await fetch(`/api/voucher/publico/${encodeURIComponent(codigo)}?token=${encodeURIComponent(tokenSeg)}`);
            const data = await res.json();
            if (res.ok) {
                const v = data.voucher;
                const validade = new Date(v.dataValidade).toLocaleDateString('pt-BR');
                conteudoEl.innerHTML = `
                    <i class="fas fa-check-circle status-icon icon-success"></i>
                    <div class="success-message">
                        <h3><i class="fas fa-check-double me-2"></i>Voucher Validado!</h3>
                        <p class="mb-0">Seu voucher foi validado com sucesso.</p>
                    </div>
                    <div class="voucher-code">${esc(v.codigoVoucher)}</div>
                    <div class="info-box">
                        <strong><i class="fas fa-info-circle me-2"></i>Próximos Passos:</strong>
                        <p class="mb-0 mt-2 small">
                            Apresente este código no estabelecimento para utilizar seu voucher.
                            Válido até ${validade}.
                        </p>
                    </div>`;
            }
        } catch (e) {
            conteudoEl.innerHTML = `
                <i class="fas fa-check-circle status-icon icon-success"></i>
                <div class="success-message">
                    <h3><i class="fas fa-check-double me-2"></i>Voucher Validado!</h3>
                    <p class="mb-0">Seu voucher foi validado com sucesso.</p>
                </div>`;
        }
    }

    // ========================================
    // ESTADOS DE ERRO
    // ========================================
    function mostrarJaValidado(v) {
        let dataStr = '';
        const d = v.dataValidacao || v.dataResgate;
        if (d) {
            dataStr = new Date(d).toLocaleDateString('pt-BR') + ' às ' +
                new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }

        conteudoEl.innerHTML = `
            <i class="fas fa-times-circle status-icon icon-error"></i>
            <div class="message msg-error">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Este voucher já foi validado${dataStr ? ` em ${dataStr}` : ''}
                ${v.nomeCliente ? `\nCliente: ${esc(v.nomeCliente)}` : ''}
            </div>
            <div class="voucher-code error">${esc(v.codigoVoucher)}</div>
            <div class="info-box">
                <strong><i class="fas fa-lightbulb me-2"></i>O que fazer?</strong>
                <ul class="mt-2 mb-0 small">
                    <li>Este voucher já foi validado anteriormente</li>
                    <li>Não é possível validar o mesmo voucher duas vezes</li>
                    <li>Entre em contato com o estabelecimento se houver algum erro</li>
                </ul>
            </div>`;
    }

    function mostrarExpirado(v) {
        conteudoEl.innerHTML = `
            <i class="fas fa-times-circle status-icon icon-error"></i>
            <div class="message msg-error">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Este voucher está vencido!
            </div>
            <div class="voucher-code error">${esc(v.codigoVoucher)}</div>
            <div class="info-box">
                <strong><i class="fas fa-lightbulb me-2"></i>O que fazer?</strong>
                <ul class="mt-2 mb-0 small">
                    <li>A validade deste voucher expirou</li>
                    <li>Entre em contato com o estabelecimento</li>
                </ul>
            </div>`;
    }

    function mostrarCancelado() {
        conteudoEl.innerHTML = `
            <i class="fas fa-times-circle status-icon icon-error"></i>
            <div class="message msg-error">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Este voucher foi cancelado.
            </div>
            <div class="info-box">
                <strong><i class="fas fa-lightbulb me-2"></i>O que fazer?</strong>
                <ul class="mt-2 mb-0 small">
                    <li>Entre em contato com o estabelecimento</li>
                </ul>
            </div>`;
    }

    function mostrarErro(msg) {
        conteudoEl.innerHTML = `
            <i class="fas fa-times-circle status-icon icon-error"></i>
            <div class="message msg-error">
                <i class="fas fa-exclamation-triangle me-2"></i>${esc(msg)}
            </div>
            <div class="info-box">
                <p class="mb-0 small">Verifique se o link está correto ou entre em contato com o estabelecimento.</p>
            </div>`;
    }

    function mostrarLinkInvalido() {
        loadingEl.classList.remove('active');
        conteudoEl.style.display = 'block';
        conteudoEl.innerHTML = `
            <i class="fas fa-exclamation-triangle status-icon" style="color: #ffc107;"></i>
            <div class="message" style="background: #fff3cd; color: #856404;">
                <i class="fas fa-link me-2"></i>Link inválido ou incompleto
            </div>
            <div class="info-box">
                <p class="mb-0 small">
                    Por favor, use o link completo enviado por email ou WhatsApp.
                </p>
            </div>`;
    }

    // ========================================
    // MÁSCARAS
    // ========================================
    function configurarMascaras() {
        const tel = document.getElementById('telefone_cliente');
        if (tel) {
            tel.addEventListener('input', function (e) {
                let v = e.target.value.replace(/\D/g, '');
                if (v.length <= 11) {
                    v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
                    v = v.replace(/(\d)(\d{4})$/, '$1-$2');
                }
                e.target.value = v;
            });
        }

        const cpf = document.getElementById('cpf_cliente');
        if (cpf) {
            cpf.addEventListener('input', function (e) {
                let v = e.target.value.replace(/\D/g, '');
                if (v.length <= 11) {
                    v = v.replace(/(\d{3})(\d)/, '$1.$2');
                    v = v.replace(/(\d{3})(\d)/, '$1.$2');
                    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                }
                e.target.value = v;
            });
        }
    }

    // ========================================
    // ESCAPE HTML
    // ========================================
    function esc(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    // ========================================
    // EXPOR GLOBAIS
    // ========================================
    globalThis.enviarValidacao = enviarValidacao;
})();
