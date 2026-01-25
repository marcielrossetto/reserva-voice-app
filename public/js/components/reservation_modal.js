// ===== MÓDULO DE RESERVAS - v3.0 =====
// Com parsing inteligente e modal de confirmação
globalThis.maskPhone = function(input) {
    let v = input.value.replaceAll(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    
    if (v.length <= 10) {
        v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
        v = v.replace(/(\d{4})(\d)/, "$1-$2");
    } else {
        v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
        v = v.replace(/(\d{5})(\d)/, "$1-$2");
    }
    
    input.value = v;
};

globalThis.toggleTelefone = function(checkbox) {
    const telInput = document.getElementById('res_telefone');
    const divNome = document.getElementById('div-input-nome');
    const cardPerfil = document.getElementById('card-perfil-cliente');
    
    if (checkbox.checked) {
        telInput.required = false;
        telInput.value = '';
        telInput.disabled = true;
        telInput.style.backgroundColor = '#e9ecef';
        cardPerfil.style.display = 'none';
        divNome.style.display = 'block';
    } else {
        telInput.required = true;
        telInput.disabled = false;
        telInput.style.backgroundColor = '#fff';
    }
};

globalThis.trocarCliente = function() {
    document.getElementById('formManual').reset();
    document.getElementById('card-perfil-cliente').style.display = 'none';
    document.getElementById('div-input-nome').style.display = 'block';
    document.getElementById('res_telefone').disabled = false;
    document.getElementById('sem_telefone').checked = false;
    document.getElementById('mesa-warning').style.display = 'none';
};

globalThis.buscarTelefone = async function() {
    const tel = document.getElementById('res_telefone').value.replaceAll(/\D/g, "");
    if (tel.length < 10) return;
    
    try {
        const res = await fetch(`/api/reservations/profile/${tel}`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });
        const data = await res.json();
        
        if (data.found) {
            const p = data.profile;
            document.getElementById('card-nome-display').innerText = p.nome;
            document.getElementById('card-telefone-display').innerText = p.telefone;
            document.getElementById('card-ultima').innerText = p.ultima_visita_data;
            document.getElementById('card-tempo').innerText = p.tempo_atras;
            document.getElementById('stat-reservas').innerText = p.total_reservas;
            document.getElementById('stat-cancelada').innerText = p.canceladas;
            
            document.getElementById('res_nome').value = p.nome;
            document.getElementById('card-perfil-cliente').style.display = 'block';
            document.getElementById('div-input-nome').style.display = 'none';
            
            if (p.obs_cliente) {
                document.getElementById('txt-obs-db').innerText = p.obs_cliente;
                document.getElementById('area-obs-db').style.display = 'block';
            }
        } else {
            document.getElementById('card-perfil-cliente').style.display = 'none';
            document.getElementById('div-input-nome').style.display = 'block';
        }
    } catch (err) {
        console.error("Erro ao buscar telefone:", err);
    }
};

/**
 * VALIDAÇÃO DE MESA
 */
globalThis.validarMesa = async function(mesa, data, horario) {
    if (!mesa || !data || !horario) return { valid: true };
    
    try {
        const res = await fetch(`/api/reservations/check-table?table=${encodeURIComponent(mesa)}&date=${data}&time=${horario}`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });
        const mesaData = await res.json();
        return { valid: !mesaData.exists, exists: mesaData.exists };
    } catch (err) {
        console.error("Erro ao validar mesa:", err);
        return { valid: true };
    }
};

/**
 * VERIFICAR E ENVIAR - Formulário Manual
 */
globalThis.verificarEEnviar = async function() {
    const btn = document.getElementById('btnSalvarManual');
    const semTel = document.getElementById('sem_telefone').checked;
    const telefone = document.getElementById('res_telefone').value.replaceAll(/\D/g, "");
    const data = document.getElementById('res_data').value;
    const nome = document.getElementById('res_nome').value.trim();
    const numPessoas = document.getElementById('res_num_pessoas').value;
    const mesa = document.getElementById('res_num_mesa').value.trim();
    const horario = document.getElementById('res_horario').value;
    
    const resetarBotao = () => {
        btn.disabled = false;
        btn.innerHTML = 'Salvar Reserva';
    };
    
    // ===== VALIDAÇÕES =====
    const hoje = new Date().toISOString().split('T')[0];
    if (data < hoje) {
        mostrarToast('Data não pode ser anterior a hoje', 'warning');
        resetarBotao();
        return;
    }
    
    if (!semTel && telefone.length < 10) {
        mostrarToast('Telefone inválido', 'warning');
        resetarBotao();
        return;
    }
    
    if (!nome || !data || !numPessoas || !horario) {
        mostrarToast('Preencha Nome, Data, Horário e Pessoas', 'warning');
        resetarBotao();
        return;
    }
    
    const pax = Number.parseInt(numPessoas, 10);
    if (pax <= 0) {
        mostrarToast('Pessoas deve ser > 0', 'warning');
        resetarBotao();
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Verificando...';
    
    try {
        // ===== VALIDAR MESA =====
        if (mesa && data && horario) {
            const mesaCheck = await validarMesa(mesa, data, horario);
            
            if (mesaCheck.exists) {
                const continua = confirm(`Mesa "${mesa}" já ocupada. Continuar?`);
                if (!continua) {
                    resetarBotao();
                    return;
                }
            }
        }
        
        // ===== CHECAR DUPLICIDADE =====
        if (!semTel && telefone) {
            try {
                const checkRes = await fetch(
                    `/api/reservations/check-duplicate?phone=${telefone}&date=${data}&name=${encodeURIComponent(nome)}`,
                    { headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` } }
                );
                const checkData = await checkRes.json();
                
                if (checkData.exists) {
                    const confirma = confirm(`Reserva existe para ${nome} nesta data. Continuar?`);
                    if (!confirma) {
                        resetarBotao();
                        return;
                    }
                }
            } catch (err) {
                console.warn("Erro ao checar duplicidade:", err);
                // Continua mesmo com erro
            }
        }
        
        // ===== PREPARAR PAYLOAD =====
        const form = document.getElementById('formManual');
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());
        
        payload.numPessoas = pax;
        payload.tortaTermoVela = document.getElementById('torta')?.checked || false;
        payload.churrascaria = document.getElementById('churras')?.checked || false;
        payload.executivo = document.getElementById('exec')?.checked || false;
        
        if (!payload.telefone) payload.telefone = null;
        
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...';
        
        // ===== ENVIAR =====
        const saveRes = await fetch('/api/reservations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify(payload)
        });
        
        if (!saveRes.ok) {
            throw new Error(`HTTP ${saveRes.status}: ${saveRes.statusText}`);
        }
        
        const result = await saveRes.json();
        
        if (result.success) {
            mostrarToast(`✓ Reserva de ${nome} salva!`, 'success');
            exibirSucesso(nome, result.waLink);
            if (globalThis.carregarReservas) globalThis.carregarReservas();
            if (globalThis.calendar) globalThis.calendar.render();
        } else {
            throw new Error(result.error || result.message || "Erro desconhecido");
        }
        
    } catch (err) {
        console.error("Erro:", err);
        mostrarToast(`Erro: ${err.message}`, 'danger');
        resetarBotao();
    }
};
/**
 * Exibir modal de sucesso
 */
function exibirSucesso(nome, waLink) {
    // Fechar modal de reserva SEM usar Bootstrap
    const modalReserva = document.getElementById('modalReserva');
    if (modalReserva) {
        // Remove a classe show e backdrop
        modalReserva.classList.remove('show');
        modalReserva.style.display = 'none';
        
        // Remove backdrop se existir
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) backdrop.remove();
    }
    
    // Mostrar modal de sucesso
    setTimeout(() => {
        const btnZap = waLink 
            ? `<button class="btn btn-success w-100 mb-2" onclick="window.open('${waLink}', '_blank')">✓ WhatsApp</button>` 
            : '';
        
        const html = `
            <div id="modalSucesso" class="modal fade show d-block" style="background: rgba(0,0,0,0.5);">
                <div class="modal-dialog modal-sm modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-body text-center py-4">
                            <h5 class="text-success fw-bold mb-2">✓ Salvo!</h5>
                            <p class="text-muted mb-3">${nome}</p>
                            ${btnZap}
                            <button class="btn btn-outline-secondary w-100" onclick="fecharModalSucesso()">Fechar</button>
                        </div>
                    </div>
                </div>
            </div>`;
        
        document.body.insertAdjacentHTML('beforeend', html);
    }, 300);
}
/**
 * Fechar modal de sucesso
 */
globalThis.fecharModalSucesso = function() {
    const modal = document.getElementById('modalSucesso');
    if (modal) modal.remove();
    
    // Atualizar dados
    if (globalThis.carregarReservas) globalThis.carregarReservas();
    if (globalThis.calendar) globalThis.calendar.render();
    
    mostrarToast('✓ Reserva criada!', 'success');
};
/**
 * Importar WhatsApp para formulário
 */
globalThis.importarWhatsParaFormulario = function() {
    const texto = document.getElementById('whats_dados').value;
    if (!texto.trim()) return;
    
    const linhas = texto.split('\n');
    
    linhas.forEach(linha => {
        if (!linha.includes(':')) return;
        const [chave, ...valor] = linha.split(':');
        const k = chave.trim().toLowerCase();
        const v = valor.join(':').trim();
        
        if (k.includes('nome')) document.getElementById('res_nome').value = v;
        if (k.includes('telefone') && !k.includes('alt')) {
            document.getElementById('res_telefone').value = v;
            maskPhone(document.getElementById('res_telefone'));
            buscarTelefone();
        }
        if (k.includes('data')) {
            if (v.includes('/')) {
                const [d, m, a] = v.split('/');
                document.getElementById('res_data').value = `${a}-${m}-${d}`;
            }
        }
        if (k.includes('hor')) {
            document.getElementById('res_horario').value = v.substring(0, 5);
        }
        if (k.includes('pess')) {
            document.getElementById('res_num_pessoas').value = v.replaceAll(/\D/g, "");
        }
        if (k.includes('mesa')) {
            document.getElementById('res_num_mesa').value = v;
        }
        if (k.includes('obs')) {
            document.getElementById('res_observacoes').value = v;
        }
    });
};

/**
 * SALVAR DIRETO - Com parsing inteligente e modal de confirmação
 */
globalThis.analisarSalvarDireto = async function() {
    const texto = document.getElementById('whats_dados').value.trim();
    if (!texto) {
        alert("Cole o texto do WhatsApp.");
        return;
    }
    
    const btn = event.target;
    btn.innerText = "Processando...";
    btn.disabled = true;
    
    try {
        // Parse local (sem backend por enquanto)
        // Você pode integrar parseReserva aqui depois
        const analyzeRes = await fetch('/api/reservations/analyze-whatsapp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ whatsText: texto })
        });
        
        const analyzeData = await analyzeRes.json();
        btn.innerText = "Salvar Direto";
        btn.disabled = false;
        
        if (!analyzeData.success) {
            alert("Erro ao analisar: " + analyzeData.error);
            return;
        }
        
        // Exibir modal de confirmação com dados extraídos
        await exibirModalConfirmacao(analyzeData.lista);
        
    } catch (err) {
        console.error("Erro:", err);
        alert("Erro de conexão.");
        btn.innerText = "Salvar Direto";
        btn.disabled = false;
    }
};

/**
 * MODAL DE CONFIRMAÇÃO - Mostra dados extraídos antes de salvar
 */
async function exibirModalConfirmacao(listaItems) {
    let itemSelecionado = -1;
    
    const cardsHtml = listaItems.map((item, idx) => {
        const erros = item.erros.map(e => `<span class="badge bg-danger">${e}</span>`).join(' ');
        const classes = item.valido 
            ? (item.duplicado ? 'item-duplicado' : 'item-valido')
            : 'item-invalido';
        
        return `
            <div class="confirmation-item ${classes}" onclick="selecionarItem(${idx})">
                <div class="item-header">
                    <h6>${item.dados.nome || 'Sem nome'}</h6>
                    ${item.valido ? '<span class="badge bg-success">✓ Válido</span>' : ''}
                    ${item.duplicado ? '<span class="badge bg-warning">⚠ Duplicado</span>' : ''}
                    ${item.erros.length > 0 ? '<span class="badge bg-danger">✗ Erros</span>' : ''}
                </div>
                <div class="item-data">
                    <p><strong>📅</strong> ${item.dados.data || '--'} ${item.dados.horario || '--'}</p>
                    <p><strong>👥</strong> ${item.dados.numPessoas || '--'} pessoas</p>
                    <p><strong>📱</strong> ${item.dados.telefone || 'Sem telefone'}</p>
                    <p><strong>🪑</strong> ${item.dados.numMesa || 'Sem mesa'}</p>
                    ${item.dados.observacoes ? `<p><strong>📝</strong> ${item.dados.observacoes}</p>` : ''}
                </div>
                ${erros ? `<div class="item-errors">${erros}</div>` : ''}
            </div>`;
    }).join('');
    
    const html = `
        <div id="modalConfirmacao" class="modal fade show d-block" style="background: rgba(0,0,0,0.6);">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title fw-bold">Confirmar Reservas Extraídas</h5>
                        <button type="button" class="btn-close" onclick="fecharConfirmacao()"></button>
                    </div>
                    <div class="modal-body" style="max-height: 500px; overflow-y: auto;">
                        <div class="confirmation-list">
                            ${cardsHtml}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="fecharConfirmacao()">Cancelar</button>
                        <button class="btn btn-primary" onclick="confirmarESalvar(${JSON.stringify(listaItems).replace(/"/g, '&quot;')})">
                            Salvar Selecionadas
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <style>
            .confirmation-list {
                display: grid;
                gap: 1rem;
            }
            
            .confirmation-item {
                border: 2px solid #dee2e6;
                border-radius: 8px;
                padding: 1rem;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .confirmation-item:hover {
                border-color: #007bff;
                background: #f0f7ff;
            }
            
            .confirmation-item.item-valido {
                border-left: 4px solid #28a745;
            }
            
            .confirmation-item.item-duplicado {
                border-left: 4px solid #ffc107;
                opacity: 0.8;
            }
            
            .confirmation-item.item-invalido {
                border-left: 4px solid #dc3545;
                opacity: 0.6;
            }
            
            .item-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.75rem;
                padding-bottom: 0.75rem;
                border-bottom: 1px solid #dee2e6;
            }
            
            .item-header h6 {
                margin: 0;
                font-weight: 700;
            }
            
            .item-data {
                font-size: 0.9rem;
                color: #666;
            }
            
            .item-data p {
                margin: 0.25rem 0;
            }
            
            .item-errors {
                margin-top: 0.75rem;
                padding-top: 0.75rem;
                border-top: 1px solid #fee;
            }
        </style>`;
    
    document.body.insertAdjacentHTML('beforeend', html);
    
    // Função global para selecionar item
    window.selecionarItem = function(idx) {
        const items = document.querySelectorAll('.confirmation-item');
        items.forEach((item, i) => {
            item.style.boxShadow = i === idx ? '0 0 10px rgba(0,123,255,0.5)' : 'none';
        });
    };
}

/**
 * Fechar modal de confirmação
 */
globalThis.fecharConfirmacao = function() {
    const modal = document.getElementById('modalConfirmacao');
    if (modal) modal.remove();
};

/**
 * Confirmar e salvar reservas
 */
globalThis.confirmarESalvar = async function(listaItems) {
    // Filtrar válidas e não inválidas
    const listaParaSalvar = listaItems.filter(item => item.valido);
    
    if (listaParaSalvar.length === 0) {
        alert("Nenhuma reserva válida para salvar.");
        return;
    }
    
    // Validar mesas
    for (const item of listaParaSalvar) {
        if (item.dados.numMesa && item.dados.data && item.dados.horario) {
            const mesaCheck = await validarMesa(item.dados.numMesa, item.dados.data, item.dados.horario);
            
            if (mesaCheck.exists) {
                const continua = confirm(`Mesa "${item.dados.numMesa}" já está ocupada em ${item.dados.data} ${item.dados.horario}. Salvar mesmo assim?`);
                if (!continua) {
                    fecharConfirmacao();
                    return;
                }
            }
        }
    }
    
    // Salvar
    await salvarListaFinal(listaParaSalvar);
    fecharConfirmacao();
};

/**
 * Salvar lista final
 */
async function salvarListaFinal(lista) {
    try {
        const saveRes = await fetch('/api/reservations/save-whatsapp-list', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ listaJson: JSON.stringify(lista) })
        });
        
        const result = await saveRes.json();
        
        if (result.success) {
            exibirResultado(result.salvos, result.links);
            if (globalThis.carregarReservas) globalThis.carregarReservas();
        } else {
            alert("Erro: " + result.error);
        }
    } catch (err) {
        console.error("Erro ao salvar:", err);
        alert("Erro de conexão.");
    }
}

/**
 * Exibir resultado
 */
function exibirResultado(salvos, links) {
    const linksHtml = links
        .map(l => `<li class="mb-2">${l.nome}: <a href="${l.link}" target="_blank" class="btn btn-sm btn-success">WhatsApp</a></li>`)
        .join('');
    
    const html = `
        <div id="modalResultado" class="modal fade show d-block" style="background: rgba(0,0,0,0.5);">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-body">
                        <h5 class="text-success fw-bold">✓ ${salvos} reserva${salvos !== 1 ? 's' : ''} criada${salvos !== 1 ? 's' : ''}</h5>
                        <ul class="mt-3">${linksHtml}</ul>
                        <button class="btn btn-secondary w-100 mt-3" onclick="document.getElementById('modalResultado').remove(); fecharModalSucesso()">Fechar</button>
                    </div>
                </div>
            </div>
        </div>`;
    
    document.body.insertAdjacentHTML('beforeend', html);
}

/**
 * Abrir modal
 */
globalThis.openReservationModal = async function() {
    const container = document.getElementById('modal-container');
    
    if (!document.getElementById('modalReserva')) {
        try {
            const response = await fetch('/html/reservation_modal.html');
            container.innerHTML = await response.text();
        } catch (err) {
            console.error("Erro ao carregar modal:", err);
            alert("Erro ao abrir modal.");
            return;
        }
    }
    
    const myModal = new bootstrap.Modal(document.getElementById('modalReserva'));
    myModal.show();
};
// No final do arquivo modal-reservation-v3.js

/**
 * Toast moderno - Notificação flutuante
 */
function mostrarToast(mensagem, tipo = 'info') {
    const toastId = 'toast-' + Date.now();
    
    const cores = {
        success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724', icon: '✓' },
        warning: { bg: '#fff3cd', border: '#ffeeba', text: '#856404', icon: '⚠' },
        danger: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24', icon: '✕' },
        info: { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460', icon: 'ℹ' }
    };
    
    const cor = cores[tipo] || cores.info;
    
    const html = `
        <div id="${toastId}" class="toast-notification" style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${cor.bg};
            border: 2px solid ${cor.border};
            color: ${cor.text};
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-weight: 600;
            font-size: 0.95rem;
            z-index: 9999;
            animation: slideIn 0.3s ease;
            max-width: 400px;
            display: flex;
            align-items: center;
            gap: 12px;
        ">
            <span style="font-size: 1.2rem;">${cor.icon}</span>
            <span>${mensagem}</span>
            <button onclick="document.getElementById('${toastId}').remove()" style="
                background: none;
                border: none;
                color: ${cor.text};
                cursor: pointer;
                font-size: 1.2rem;
                margin-left: auto;
            ">×</button>
        </div>
        <style>
            @keyframes slideIn {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(400px); opacity: 0; }
            }
        </style>`;
    
    document.body.insertAdjacentHTML('beforeend', html);
    setTimeout(() => {
        const toast = document.getElementById(toastId);
        if (toast) {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
}

globalThis.fecharModalSucesso = function() {
    const modal = document.getElementById('modalSucesso');
    if (modal) modal.remove();
    
    // Atualizar dados
    if (globalThis.carregarReservas) globalThis.carregarReservas();
    if (globalThis.calendar) globalThis.calendar.render();
    
    mostrarToast('✓ Reserva criada com sucesso!', 'success');
};

/**
 * Limpar form após salvar
 */
/**
 * Limpar form após salvar
 */
globalThis.limparFormulario = function() {
    const form = document.getElementById('formManual');
    if (form) form.reset();
    
    // Resetar campos visuais - com verificação
    const cardPerfil = document.getElementById('card-perfil-cliente');
    const divNome = document.getElementById('div-input-nome');
    const telInput = document.getElementById('res_telefone');
    const semTel = document.getElementById('sem_telefone');
    const mesaWarning = document.getElementById('mesa-warning');
    const whatsArea = document.getElementById('whats_dados');
    
    if (cardPerfil) cardPerfil.style.display = 'none';
    if (divNome) divNome.style.display = 'block';
    if (telInput) telInput.disabled = false;
    if (semTel) semTel.checked = false;
    if (mesaWarning) mesaWarning.style.display = 'none';
    if (whatsArea) whatsArea.value = '';
};

/**
 * Fechar modal de sucesso com limpeza
 */
globalThis.fecharModalSucesso = function() {
    const modal = document.getElementById('modalSucesso');
    if (modal) modal.remove();
    
    // Limpar formulário com segurança
    try {
        limparFormulario();
    } catch (err) {
        console.warn("Erro ao limpar formulário:", err);
    }
    
    // Fechar modal de reserva
    const modalReserva = document.getElementById('modalReserva');
    if (modalReserva) {
        modalReserva.classList.remove('show');
        modalReserva.style.display = 'none';
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) backdrop.remove();
    }
    
    // Atualizar dados
    if (globalThis.carregarReservas) {
        try {
            globalThis.carregarReservas();
        } catch (err) {
            console.warn("Erro ao carregar reservas:", err);
        }
    }
    if (globalThis.calendar) {
        try {
            globalThis.calendar.render();
        } catch (err) {
            console.warn("Erro ao renderizar calendário:", err);
        }
    }
    
    mostrarToast('✓ Pronto para nova reserva!', 'success');
};
/**
 * Modal de confirmação melhorado - Mostra dados extraídos
 */
async function exibirModalConfirmacao(listaItems) {
    const cardsHtml = listaItems.map((item, idx) => {
        const erros = item.erros.map(e => `<span class="badge bg-danger">${e}</span>`).join(' ');
        const classes = item.valido 
            ? (item.duplicado ? 'item-duplicado' : 'item-valido')
            : 'item-invalido';
        
        // Botões condicionales
        let botoes = '';
        if (!item.valido) {
            // Se inválido - mostrar opções de editar/transferir
            botoes = `
                <div class="mt-2 d-flex gap-2">
                    <button class="btn btn-sm btn-warning flex-grow-1" onclick="transferirParaFormulario(${idx})">
                        📋 Transferir p/ Formulário
                    </button>
                    <button class="btn btn-sm btn-info flex-grow-1" onclick="editarItem(${idx})">
                        ✏️ Editar
                    </button>
                </div>`;
        }
        
        return `
            <div class="confirmation-item ${classes}" id="item-${idx}">
                <div class="item-header">
                    <h6>${item.dados.nome || 'Sem nome'}</h6>
                    ${item.valido ? '<span class="badge bg-success">✓ Válido</span>' : ''}
                    ${item.duplicado ? '<span class="badge bg-warning">⚠ Duplicado</span>' : ''}
                    ${item.erros.length > 0 ? '<span class="badge bg-danger">✗ Erros</span>' : ''}
                </div>
                <div class="item-data">
                    <p><strong>📅</strong> ${item.dados.data || '--'} ${item.dados.horario || '--'}</p>
                    <p><strong>👥</strong> ${item.dados.numPessoas || '--'} pessoas</p>
                    <p><strong>📱</strong> ${item.dados.telefone || 'Sem telefone'}</p>
                    <p><strong>🪑</strong> ${item.dados.numMesa || 'Sem mesa'}</p>
                    ${item.dados.observacoes ? `<p><strong>📝</strong> ${item.dados.observacoes}</p>` : ''}
                </div>
                ${erros ? `<div class="item-errors">${erros}</div>` : ''}
                ${botoes}
            </div>`;
    }).join('');
    
    const html = `
        <div id="modalConfirmacao" class="modal fade show d-block" style="background: rgba(0,0,0,0.6);">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title fw-bold">Confirmar Reservas Extraídas</h5>
                        <button type="button" class="btn-close" onclick="fecharConfirmacao()"></button>
                    </div>
                    <div class="modal-body" style="max-height: 500px; overflow-y: auto;">
                        <div class="confirmation-list">
                            ${cardsHtml}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="fecharConfirmacao()">Cancelar</button>
                        <button class="btn btn-primary" onclick="confirmarESalvar(${JSON.stringify(listaItems).replace(/"/g, '&quot;')})">
                            Salvar Válidas
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <style>
            .confirmation-list { display: grid; gap: 1rem; }
            .confirmation-item { border: 2px solid #dee2e6; border-radius: 8px; padding: 1rem; cursor: pointer; transition: all 0.3s; }
            .confirmation-item:hover { border-color: #007bff; background: #f0f7ff; }
            .confirmation-item.item-valido { border-left: 4px solid #28a745; }
            .confirmation-item.item-duplicado { border-left: 4px solid #ffc107; opacity: 0.8; }
            .confirmation-item.item-invalido { border-left: 4px solid #dc3545; opacity: 0.6; }
            .item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid #dee2e6; }
            .item-header h6 { margin: 0; font-weight: 700; }
            .item-data { font-size: 0.9rem; color: #666; }
            .item-data p { margin: 0.25rem 0; }
            .item-errors { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #fee; }
        </style>`;
    
    document.body.insertAdjacentHTML('beforeend', html);
}

/**
 * Transferir item inválido para formulário
 */
globalThis.transferirParaFormulario = function(idx) {
    // Fecha modal de confirmação
    fecharConfirmacao();
    
    // Limpa form
    limparFormulario();
    
    // Volta para aba de formulário manual
    document.getElementById('tab-manual').click();
    
    mostrarToast('Transfira os dados para o formulário e tente novamente', 'info');
};

/**
 * Editar item
 */
globalThis.editarItem = function(idx) {
    mostrarToast('Função de edição em desenvolvimento', 'info');
};

/**
 * Fechar modal de sucesso com limpeza
 */
globalThis.fecharModalSucesso = function() {
    const modal = document.getElementById('modalSucesso');
    if (modal) modal.remove();
    
    // Limpar formulário
    limparFormulario();
    
    // Atualizar dados
    if (globalThis.carregarReservas) globalThis.carregarReservas();
    if (globalThis.calendar) globalThis.calendar.render();
    
    mostrarToast('✓ Pronto para nova reserva!', 'success');
};

// ===== FIX: Prevenir erro de listener assíncrono =====
if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        // Responde imediatamente para evitar timeout
        sendResponse({ received: true });
        return false; // Não indica resposta assíncrona
    });
}

// ===== FIX: Garantir que fetch não gera warning =====
globalThis.fetch = (function() {
    const originalFetch = window.fetch;
    return function(...args) {
        return originalFetch.apply(this, args).catch(err => {
            if (err.message && err.message.includes('message channel closed')) {
                console.warn('Chrome extension message channel closed (ignorado)');
                return Promise.resolve({ ok: false });
            }
            throw err;
        });
    };
})();

console.log("✓ Módulo de Reservas v3.0 carregado com sucesso");
console.log("✓ Módulo de Reservas v3.0 carregado");