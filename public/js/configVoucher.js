(function () {
    const API = '/api/voucher';
    const TOKEN = localStorage.getItem('token');
    const HEADERS = {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
    };

    let vouchers = [];
    let modalVoucher = null;
    let modalDetalhes = null;

    // ========================================
    // INIT
    // ========================================
    document.addEventListener('DOMContentLoaded', () => {
        modalVoucher = new bootstrap.Modal(document.getElementById('modalVoucher'));
        modalDetalhes = new bootstrap.Modal(document.getElementById('modalDetalhes'));
        carregarVouchers();
    });

    // ========================================
    // API HELPER
    // ========================================
    async function apiFetch(url, opts = {}) {
        try {
            const res = await fetch(url, { ...opts, headers: HEADERS });
            const data = await res.json();
            if (!res.ok) throw new Error(data.erro || 'Erro na requisição');
            return data;
        } catch (e) {
            mostrarToast(e.message, 'error');
            throw e;
        }
    }

    // ========================================
    // CARREGAR VOUCHERS
    // ========================================
    async function carregarVouchers() {
        try {
            const status = document.getElementById('filtroStatus').value;
            const data = await apiFetch(`${API}/listar?status=${status}`);
            vouchers = data.vouchers || [];
            renderizarLista();
        } catch (e) { /* toast já mostrado */ }
    }

    // ========================================
    // RENDERIZAR LISTA
    // ========================================
    function renderizarLista() {
        const container = document.getElementById('listaVouchers');

        if (!vouchers.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-ticket-alt"></i>
                    <h5>Nenhum voucher encontrado</h5>
                    <p>Clique em "Novo Voucher" para criar o primeiro.</p>
                </div>`;
            return;
        }

        container.innerHTML = vouchers.map(v => {
            const estado = getEstado(v);
            const badgeClass = `badge-${estado}`;
            const validade = new Date(v.dataValidade).toLocaleDateString('pt-BR');
            const criado = new Date(v.dataCriacao).toLocaleDateString('pt-BR');
            const total = parseFloat(v.valorTotal || 0).toFixed(2);

            let clienteHtml = '';
            if (v.nomeCliente) {
                clienteHtml = `
                    <div class="cliente-info">
                        <i class="fas fa-user me-1"></i><strong>${esc(v.nomeCliente)}</strong>
                        ${v.telefoneCliente ? ` &bull; <i class="fas fa-phone me-1"></i>${esc(v.telefoneCliente)}` : ''}
                        ${v.cpfCliente ? ` &bull; <i class="fas fa-id-card me-1"></i>${esc(v.cpfCliente)}` : ''}
                        ${v.dataValidacao ? `<br><small>Validado em: ${new Date(v.dataValidacao).toLocaleString('pt-BR')}</small>` : ''}
                    </div>`;
            }

            let acoesHtml = '';
            if (estado === 'pendente') {
                acoesHtml = `
                    <button class="btn btn-outline-primary btn-sm" onclick="editarVoucher(${v.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>`;
            }
            if (estado === 'validado') {
                acoesHtml += `
                    <button class="btn btn-success btn-sm" onclick="resgatarVoucher(${v.id})" title="Marcar como resgatado">
                        <i class="fas fa-hand-holding-heart me-1"></i>Resgatar
                    </button>`;
            }
            acoesHtml += `
                <button class="btn btn-outline-secondary btn-sm" onclick="copiarLink('${v.codigoVoucher}', '${v.tokenSeguranca}')" title="Copiar link">
                    <i class="fas fa-link"></i>
                </button>
                <button class="btn btn-outline-info btn-sm" onclick="verDetalhes(${v.id})" title="Detalhes">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-outline-danger btn-sm" onclick="deletarVoucher(${v.id})" title="Remover">
                    <i class="fas fa-trash"></i>
                </button>`;

            return `
                <div class="voucher-card">
                    <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
                        <div>
                            <div class="voucher-code">${esc(v.codigoVoucher)}</div>
                            <div class="voucher-meta mt-1">
                                <span class="badge ${badgeClass} me-2">${estado.toUpperCase()}</span>
                                <i class="fas fa-tag"></i> ${esc(v.tipo)}
                                ${v.tipoRodizio ? ` &bull; ${esc(v.tipoRodizio)}` : ''}
                            </div>
                        </div>
                        <div class="text-end">
                            <div class="fw-bold" style="font-size:1.1rem;">R$ ${total}</div>
                            <div class="voucher-meta">
                                <i class="fas fa-calendar"></i> Validade: ${validade}
                            </div>
                        </div>
                    </div>

                    <div class="info-row">
                        ${v.possuiBebida ? `<span class="info-chip bebida"><i class="fas fa-wine-glass-alt me-1"></i>${v.qtdBebida}x ${esc(v.tipoBebida || 'Bebida')}</span>` : ''}
                        ${v.possuiSobremesa ? `<span class="info-chip sobremesa"><i class="fas fa-ice-cream me-1"></i>${v.qtdSobremesa}x ${esc(v.tipoSobremesa || 'Sobremesa')}</span>` : ''}
                        ${v.pago ? '<span class="info-chip pago"><i class="fas fa-check me-1"></i>Pago</span>' : ''}
                        ${v.formaPagamento ? `<span class="info-chip"><i class="fas fa-credit-card me-1"></i>${esc(v.formaPagamento)}</span>` : ''}
                    </div>

                    ${clienteHtml}

                    <div class="voucher-actions mt-3 d-flex gap-2 flex-wrap">
                        ${acoesHtml}
                    </div>
                </div>`;
        }).join('');
    }

    // ========================================
    // ESTADO DO VOUCHER
    // ========================================
    function getEstado(v) {
        if (v.status === 'resgatado') return 'resgatado';
        if (v.status === 'validado') return 'validado';
        if (new Date(v.dataValidade) < new Date(new Date().toDateString())) return 'expirado';
        return 'pendente';
    }

    // ========================================
    // MODAL CRIAR
    // ========================================
    function abrirModalCriar() {
        document.getElementById('modalVoucherTitulo').innerHTML = '<i class="fas fa-ticket-alt me-2"></i>Novo Voucher';
        document.getElementById('voucherId').value = '';
        limparModal();

        // Validade padrão: 30 dias
        const d = new Date();
        d.setDate(d.getDate() + 30);
        document.getElementById('vDataValidade').value = d.toISOString().split('T')[0];

        calcularTotal();
        modalVoucher.show();
    }

    // ========================================
    // EDITAR VOUCHER
    // ========================================
    async function editarVoucher(id) {
        try {
            const data = await apiFetch(`${API}/${id}`);
            const v = data.voucher;

            document.getElementById('modalVoucherTitulo').innerHTML = '<i class="fas fa-edit me-2"></i>Editar Voucher';
            document.getElementById('voucherId').value = v.id;
            document.getElementById('vTipo').value = v.tipo || 'Cortesia';
            document.getElementById('vTipoRodizio').value = v.tipoRodizio || '';
            document.getElementById('vValorRodizio').value = parseFloat(v.valorRodizio) || 0;
            document.getElementById('vDataValidade').value = v.dataValidade ? v.dataValidade.split('T')[0] : '';
            document.getElementById('vFormaPagamento').value = v.formaPagamento || '';
            document.getElementById('vPago').checked = v.pago;
            document.getElementById('vObservacoes').value = v.observacoes || '';

            document.getElementById('vPossuiBebida').checked = v.possuiBebida;
            toggleSection('bebida');
            document.getElementById('vTipoBebida').value = v.tipoBebida || '';
            document.getElementById('vQtdBebida').value = v.qtdBebida || 0;
            document.getElementById('vValorBebida').value = parseFloat(v.valorBebida) || 0;

            document.getElementById('vPossuiSobremesa').checked = v.possuiSobremesa;
            toggleSection('sobremesa');
            document.getElementById('vTipoSobremesa').value = v.tipoSobremesa || '';
            document.getElementById('vQtdSobremesa').value = v.qtdSobremesa || 0;
            document.getElementById('vValorSobremesa').value = parseFloat(v.valorSobremesa) || 0;

            calcularTotal();
            modalVoucher.show();
        } catch (e) { /* toast já mostrado */ }
    }

    // ========================================
    // SALVAR (CRIAR OU EDITAR)
    // ========================================
    async function salvarVoucher() {
        const id = document.getElementById('voucherId').value;
        const dataValidade = document.getElementById('vDataValidade').value;

        if (!dataValidade) {
            mostrarToast('Informe a data de validade', 'error');
            return;
        }

        const body = {
            tipo: document.getElementById('vTipo').value,
            tipoRodizio: document.getElementById('vTipoRodizio').value || null,
            valorRodizio: parseFloat(document.getElementById('vValorRodizio').value) || 0,
            dataValidade,
            formaPagamento: document.getElementById('vFormaPagamento').value || null,
            pago: document.getElementById('vPago').checked,
            observacoes: document.getElementById('vObservacoes').value || null,
            possuiBebida: document.getElementById('vPossuiBebida').checked,
            tipoBebida: document.getElementById('vTipoBebida').value || null,
            qtdBebida: parseInt(document.getElementById('vQtdBebida').value) || 0,
            valorBebida: parseFloat(document.getElementById('vValorBebida').value) || 0,
            possuiSobremesa: document.getElementById('vPossuiSobremesa').checked,
            tipoSobremesa: document.getElementById('vTipoSobremesa').value || null,
            qtdSobremesa: parseInt(document.getElementById('vQtdSobremesa').value) || 0,
            valorSobremesa: parseFloat(document.getElementById('vValorSobremesa').value) || 0
        };

        try {
            if (id) {
                await apiFetch(`${API}/${id}`, { method: 'PUT', body: JSON.stringify(body) });
                mostrarToast('Voucher atualizado!', 'success');
            } else {
                await apiFetch(`${API}/criar`, { method: 'POST', body: JSON.stringify(body) });
                mostrarToast('Voucher criado!', 'success');
            }
            modalVoucher.hide();
            carregarVouchers();
        } catch (e) { /* toast já mostrado */ }
    }

    // ========================================
    // RESGATAR
    // ========================================
    async function resgatarVoucher(id) {
        if (!confirm('Confirma o resgate deste voucher?')) return;
        try {
            await apiFetch(`${API}/${id}/resgatar`, { method: 'POST' });
            mostrarToast('Voucher resgatado!', 'success');
            carregarVouchers();
        } catch (e) { /* toast já mostrado */ }
    }

    // ========================================
    // DELETAR
    // ========================================
    async function deletarVoucher(id) {
        if (!confirm('Remover este voucher?')) return;
        try {
            await apiFetch(`${API}/${id}`, { method: 'DELETE' });
            mostrarToast('Voucher removido', 'success');
            carregarVouchers();
        } catch (e) { /* toast já mostrado */ }
    }

    // ========================================
    // VER DETALHES
    // ========================================
    async function verDetalhes(id) {
        try {
            const data = await apiFetch(`${API}/${id}`);
            const v = data.voucher;
            const estado = getEstado(v);

            let html = `
                <div class="text-center mb-3">
                    <div class="voucher-code" style="font-size:1.8rem;">${esc(v.codigoVoucher)}</div>
                    <span class="badge badge-${estado} mt-2" style="font-size:0.9rem;">${estado.toUpperCase()}</span>
                </div>
                <table class="table table-sm">
                    <tr><th>Tipo</th><td>${esc(v.tipo)}</td></tr>
                    ${v.tipoRodizio ? `<tr><th>Rodízio</th><td>${esc(v.tipoRodizio)} — R$ ${parseFloat(v.valorRodizio).toFixed(2)}</td></tr>` : ''}
                    ${v.possuiBebida ? `<tr><th>Bebida</th><td>${v.qtdBebida}x ${esc(v.tipoBebida || '—')} — R$ ${parseFloat(v.valorBebida).toFixed(2)}</td></tr>` : ''}
                    ${v.possuiSobremesa ? `<tr><th>Sobremesa</th><td>${v.qtdSobremesa}x ${esc(v.tipoSobremesa || '—')} — R$ ${parseFloat(v.valorSobremesa).toFixed(2)}</td></tr>` : ''}
                    <tr><th>Valor Total</th><td><strong>R$ ${parseFloat(v.valorTotal).toFixed(2)}</strong></td></tr>
                    <tr><th>Validade</th><td>${new Date(v.dataValidade).toLocaleDateString('pt-BR')}</td></tr>
                    <tr><th>Criado em</th><td>${new Date(v.dataCriacao).toLocaleDateString('pt-BR')}</td></tr>
                    <tr><th>Pago</th><td>${v.pago ? 'Sim' : 'Não'}${v.formaPagamento ? ` (${esc(v.formaPagamento)})` : ''}</td></tr>
                    ${v.observacoes ? `<tr><th>Obs.</th><td>${esc(v.observacoes)}</td></tr>` : ''}
                </table>`;

            if (v.nomeCliente) {
                html += `
                    <div class="cliente-info">
                        <strong>Dados do Cliente:</strong><br>
                        <i class="fas fa-user me-1"></i>${esc(v.nomeCliente)}<br>
                        ${v.telefoneCliente ? `<i class="fas fa-phone me-1"></i>${esc(v.telefoneCliente)}<br>` : ''}
                        ${v.cpfCliente ? `<i class="fas fa-id-card me-1"></i>${esc(v.cpfCliente)}<br>` : ''}
                        ${v.dataValidacao ? `<i class="fas fa-calendar-check me-1"></i>Validado: ${new Date(v.dataValidacao).toLocaleString('pt-BR')}<br>` : ''}
                        ${v.dataResgate ? `<i class="fas fa-hand-holding-heart me-1"></i>Resgatado: ${new Date(v.dataResgate).toLocaleString('pt-BR')}` : ''}
                    </div>`;
            }

            document.getElementById('detalhesConteudo').innerHTML = html;
            modalDetalhes.show();
        } catch (e) { /* toast já mostrado */ }
    }

    // ========================================
    // COPIAR LINK
    // ========================================
    function copiarLink(codigo, tokenSeg) {
        const url = `${window.location.origin}/voucher/${codigo}?token=${tokenSeg}`;
        navigator.clipboard.writeText(url).then(() => {
            mostrarToast('Link copiado!', 'success');
        }).catch(() => {
            prompt('Copie o link:', url);
        });
    }

    // ========================================
    // TOGGLE SECTIONS
    // ========================================
    function toggleSection(tipo) {
        if (tipo === 'bebida') {
            const el = document.getElementById('secaoBebida');
            el.classList.toggle('active', document.getElementById('vPossuiBebida').checked);
        } else {
            const el = document.getElementById('secaoSobremesa');
            el.classList.toggle('active', document.getElementById('vPossuiSobremesa').checked);
        }
        calcularTotal();
    }

    // ========================================
    // CALCULAR TOTAL
    // ========================================
    function calcularTotal() {
        const vr = parseFloat(document.getElementById('vValorRodizio').value) || 0;
        const vb = document.getElementById('vPossuiBebida').checked ? (parseFloat(document.getElementById('vValorBebida').value) || 0) : 0;
        const vs = document.getElementById('vPossuiSobremesa').checked ? (parseFloat(document.getElementById('vValorSobremesa').value) || 0) : 0;
        document.getElementById('vValorTotal').value = `R$ ${(vr + vb + vs).toFixed(2)}`;
    }

    // ========================================
    // LIMPAR MODAL
    // ========================================
    function limparModal() {
        document.getElementById('vTipo').value = 'Cortesia';
        document.getElementById('vTipoRodizio').value = '';
        document.getElementById('vValorRodizio').value = '0';
        document.getElementById('vDataValidade').value = '';
        document.getElementById('vFormaPagamento').value = '';
        document.getElementById('vPago').checked = false;
        document.getElementById('vObservacoes').value = '';
        document.getElementById('vPossuiBebida').checked = false;
        document.getElementById('vTipoBebida').value = '';
        document.getElementById('vQtdBebida').value = '0';
        document.getElementById('vValorBebida').value = '0';
        document.getElementById('vPossuiSobremesa').checked = false;
        document.getElementById('vTipoSobremesa').value = '';
        document.getElementById('vQtdSobremesa').value = '0';
        document.getElementById('vValorSobremesa').value = '0';
        document.getElementById('secaoBebida').classList.remove('active');
        document.getElementById('secaoSobremesa').classList.remove('active');
    }

    // ========================================
    // TOAST
    // ========================================
    function mostrarToast(msg, tipo = 'info') {
        const bg = tipo === 'success' ? '#198754' : tipo === 'error' ? '#dc3545' : '#0d6efd';
        const icon = tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-triangle' : 'info-circle';
        const el = document.createElement('div');
        el.className = 'toast show';
        el.setAttribute('role', 'alert');
        el.innerHTML = `
            <div class="toast-body d-flex align-items-center gap-2" style="background:${bg};color:#fff;border-radius:8px;padding:12px 16px;">
                <i class="fas fa-${icon}"></i>
                <span>${msg}</span>
            </div>`;
        document.getElementById('toastContainer').appendChild(el);
        setTimeout(() => el.remove(), 3500);
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
    globalThis.carregarVouchers = carregarVouchers;
    globalThis.abrirModalCriar = abrirModalCriar;
    globalThis.editarVoucher = editarVoucher;
    globalThis.salvarVoucher = salvarVoucher;
    globalThis.resgatarVoucher = resgatarVoucher;
    globalThis.deletarVoucher = deletarVoucher;
    globalThis.verDetalhes = verDetalhes;
    globalThis.copiarLink = copiarLink;
    globalThis.toggleSection = toggleSection;
    globalThis.calcularTotal = calcularTotal;
})();
