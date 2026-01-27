// ===== MÓDULO DE RESERVAS - v3.2 =====
// Sem erros de Bootstrap Modal

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
 * VERIFICAR E ENVIAR - VERSÃO SIMPLIFICADA
 */
globalThis.verificarEEnviar = async function(event) {
    if (event && event.preventDefault) event.preventDefault();
    
    try {
        const btn = document.getElementById('btnSalvarManual');
        const semTel = document.getElementById('sem_telefone').checked;
        const telefone = document.getElementById('res_telefone').value.replaceAll(/\D/g, "");
        const data = document.getElementById('res_data').value;
        const nome = document.getElementById('res_nome').value.trim();
        const numPessoas = document.getElementById('res_num_pessoas').value;
        const mesa = document.getElementById('res_num_mesa').value.trim();
        const horarioInput = document.getElementById('res_horario').value;
        
        console.log('📝 Validando formulário...');
        
        const resetarBotao = () => {
            btn.disabled = false;
            btn.innerHTML = 'Cadastrar reserva';
        };
        
        const hoje = new Date().toISOString().split('T')[0];
        if (data < hoje) {
            mostrarToast('Data não pode ser anterior a hoje', 'warning');
            resetarBotao();
            return;
        }
        
        if (!data) {
            mostrarToast('Data é obrigatória', 'warning');
            resetarBotao();
            return;
        }
        
        if (!semTel && telefone.length < 10) {
            mostrarToast('Telefone inválido', 'warning');
            resetarBotao();
            return;
        }
        
        if (!nome) {
            mostrarToast('Nome é obrigatório', 'warning');
            resetarBotao();
            return;
        }
        
        if (!numPessoas) {
            mostrarToast('Número de pessoas é obrigatório', 'warning');
            resetarBotao();
            return;
        }
        
        if (!horarioInput) {
            mostrarToast('Horário é obrigatório', 'warning');
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
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...';
        
        const [hh, mm] = horarioInput.split(':');
        const horarioNum = parseInt(hh) * 60 + parseInt(mm);
        const inicio = 11 * 60;
        const fim = 23 * 60 + 59;
        
        if (horarioNum < inicio || horarioNum > fim) {
            mostrarToast('Restaurante funciona de 11:00 às 23:59', 'warning');
            resetarBotao();
            return;
        }
        
        const horarioDb = horarioInput + ':00';
        
        const payload = {
            nome,
            data,
            horario: horarioDb,
            numPessoas: pax,
            telefone: telefone || null,
            telefone2: (document.getElementById('res_telefone2').value.replaceAll(/\D/g, "")) || null,
            formaPagamento: document.getElementById('res_forma_pagamento').value || 'Não definido',
            numMesa: mesa || null,
            tipoEvento: document.getElementById('res_tipo_evento').value || 'Manual',
            valorRodizio: (document.getElementById('res_valor_rodizio').value) || null,
            observacoes: (document.getElementById('res_observacoes').value) || null,
            tortaTermoVela: document.getElementById('torta')?.checked || false,
            churrascaria: document.getElementById('churras')?.checked || false,
            executivo: document.getElementById('exec')?.checked || false
        };
        
        console.log('📤 Enviando:', payload);
        
        const saveRes = await fetch('/api/reservations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify(payload)
        });
        
        if (!saveRes.ok) throw new Error(`HTTP ${saveRes.status}`);
        
        const result = await saveRes.json();
        console.log('✅ Sucesso:', result);
        
        if (result.success) {
            // FECHAR MODAL
            const modalEl = document.getElementById('modalReserva');
            if (modalEl) {
                modalEl.classList.remove('show');
                modalEl.style.display = 'none';
                document.body.style.overflow = 'auto';
                document.body.classList.remove('modal-open');
            }
            
            // REMOVER BACKDROP
            document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
            
            // LIMPAR
            document.getElementById('formManual').reset();
            globalThis.limparFormulario?.();
            
            // MOSTRAR CONFIRMAÇÃO
            exibirConfirmacaoWhatsApp(nome, result.waLink);
            
            // RECARREGAR
            setTimeout(() => {
                globalThis.loadReservations?.();
                globalThis.calendar?.render?.();
            }, 800);
            
        } else {
            throw new Error(result.error || "Erro desconhecido");
        }
        
    } catch (err) {
        console.error("❌ ERRO:", err);
        mostrarToast(`Erro: ${err.message}`, 'danger');
        const btn = document.getElementById('btnSalvarManual');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Cadastrar reserva';
        }
    }
};

/**
 * CONFIRMAÇÃO COM WHATSAPP
 */
function exibirConfirmacaoWhatsApp(nome, waLink) {
    const html = `
        <div id="modalConfirmacaoWA" class="modal fade show d-block" style="background: rgba(0,0,0,0.6); z-index: 9999;">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header border-0 bg-light">
                        <h5 class="modal-title fw-bold">✓ Reserva Salva</h5>
                        <button type="button" class="btn-close" onclick="fecharConfirmacaoWA()"></button>
                    </div>
                    <div class="modal-body text-center py-4">
                        <h6 class="text-success fw-bold mb-3">${nome}</h6>
                        ${waLink ? `<a href="${waLink}" target="_blank" class="btn btn-success btn-lg w-100 mb-2"><i class="fab fa-whatsapp"></i> Enviar WhatsApp</a>` : ''}
                        <button type="button" class="btn btn-outline-secondary w-100" onclick="fecharConfirmacaoWA()">Fechar</button>
                    </div>
                </div>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    mostrarToast(`✓ Reserva de ${nome} criada!`, 'success');
}

globalThis.fecharConfirmacaoWA = function() {
    const modal = document.getElementById('modalConfirmacaoWA');
    if (modal) modal.remove();
};

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
            let match = v.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
            if (match) {
                let [, d, m, a] = match;
                d = String(d).padStart(2, '0');
                m = String(m).padStart(2, '0');
                if (a.length === 2) a = '20' + a;
                document.getElementById('res_data').value = `${a}-${m}-${d}`;
            }
        }
        if (k.includes('hor')) document.getElementById('res_horario').value = v.substring(0, 5);
        if (k.includes('pess')) document.getElementById('res_num_pessoas').value = v.replaceAll(/\D/g, "");
        if (k.includes('mesa')) document.getElementById('res_num_mesa').value = v;
        if (k.includes('obs')) document.getElementById('res_observacoes').value = v;
    });
};

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
        await exibirModalConfirmacao(analyzeData.lista);
    } catch (err) {
        console.error("Erro:", err);
        alert("Erro de conexão.");
        btn.innerText = "Salvar Direto";
        btn.disabled = false;
    }
};

async function exibirModalConfirmacao(listaItems) {
    const cardsHtml = listaItems.map((item, idx) => {
        const erros = item.erros.map(e => `<span class="badge bg-danger">${e}</span>`).join(' ');
        const classes = item.valido ? (item.duplicado ? 'item-duplicado' : 'item-valido') : 'item-invalido';
        return `
            <div class="confirmation-item ${classes}" onclick="selecionarItem(${idx})">
                <div class="item-header">
                    <h6>${item.dados.nome || 'Sem nome'}</h6>
                    ${item.valido ? '<span class="badge bg-success">✓</span>' : ''}
                    ${item.duplicado ? '<span class="badge bg-warning">⚠</span>' : ''}
                    ${item.erros.length > 0 ? '<span class="badge bg-danger">✗</span>' : ''}
                </div>
                <div class="item-data">
                    <p><strong>📅</strong> ${item.dados.data || '--'} ${item.dados.horario || '--'}</p>
                    <p><strong>👥</strong> ${item.dados.numPessoas || '--'} pax</p>
                    <p><strong>📱</strong> ${item.dados.telefone || 'Sem tel'}</p>
                </div>
                ${erros ? `<div class="item-errors">${erros}</div>` : ''}
            </div>`;
    }).join('');
    const html = `
        <div id="modalConfirmacao" class="modal fade show d-block" style="background: rgba(0,0,0,0.6);">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title fw-bold">Confirmar Reservas</h5>
                        <button type="button" class="btn-close" onclick="fecharConfirmacao()"></button>
                    </div>
                    <div class="modal-body" style="max-height: 500px; overflow-y: auto;">
                        <div class="confirmation-list">${cardsHtml}</div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="fecharConfirmacao()">Cancelar</button>
                        <button class="btn btn-primary" onclick="confirmarESalvar('${JSON.stringify(listaItems).replace(/'/g, "&#39;")}')">Salvar</button>
                    </div>
                </div>
            </div>
        </div>
        <style>
            .confirmation-list { display: grid; gap: 1rem; }
            .confirmation-item { border: 2px solid #dee2e6; border-radius: 8px; padding: 1rem; cursor: pointer; }
            .confirmation-item.item-valido { border-left: 4px solid #28a745; }
            .confirmation-item.item-duplicado { border-left: 4px solid #ffc107; opacity: 0.8; }
            .confirmation-item.item-invalido { border-left: 4px solid #dc3545; opacity: 0.6; }
            .item-header { display: flex; justify-content: space-between; margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid #dee2e6; }
            .item-header h6 { margin: 0; font-weight: 700; }
            .item-data { font-size: 0.9rem; color: #666; }
            .item-data p { margin: 0.25rem 0; }
        </style>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

globalThis.fecharConfirmacao = function() {
    const modal = document.getElementById('modalConfirmacao');
    if (modal) modal.remove();
};

globalThis.confirmarESalvar = async function(listaJson) {
    const listaItems = JSON.parse(listaJson);
    const listaParaSalvar = listaItems.filter(item => item.valido === true).map(item => item.dados);
    if (listaParaSalvar.length === 0) {
        mostrarToast("Nenhuma reserva válida.", 'warning');
        return;
    }
    await salvarListaFinal(listaParaSalvar);
    fecharConfirmacao();
};

async function salvarListaFinal(lista) {
    try {
        const payload = { listaJson: JSON.stringify(lista) };
        const saveRes = await fetch('/api/reservations/save-whatsapp-list', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify(payload)
        });
        const result = await saveRes.json();
        if (result.success) {
            mostrarToast(`✅ ${result.salvos} criada(s)!`, 'success');
            setTimeout(() => {
                globalThis.loadReservations?.();
                globalThis.calendar?.render?.();
            }, 600);
        } else {
            mostrarToast("Erro: " + (result.error || 'Desconhecido'), 'danger');
        }
    } catch (err) {
        console.error("Erro:", err);
        mostrarToast("Erro: " + err.message, 'danger');
    }
}

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
        <div id="${toastId}" style="position: fixed; top: 20px; right: 20px; background: ${cor.bg}; border: 2px solid ${cor.border}; color: ${cor.text}; padding: 16px 20px; border-radius: 8px; font-weight: 600; z-index: 9999; display: flex; align-items: center; gap: 12px; max-width: 400px;">
            <span>${cor.icon}</span>
            <span>${mensagem}</span>
            <button onclick="document.getElementById('${toastId}').remove()" style="background: none; border: none; color: ${cor.text}; cursor: pointer; margin-left: auto;">×</button>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    setTimeout(() => {
        const toast = document.getElementById(toastId);
        if (toast) toast.remove();
    }, 4000);
}

globalThis.limparFormulario = function() {
    const form = document.getElementById('formManual');
    if (form) form.reset();
    const cardPerfil = document.getElementById('card-perfil-cliente');
    const divNome = document.getElementById('div-input-nome');
    if (cardPerfil) cardPerfil.style.display = 'none';
    if (divNome) divNome.style.display = 'block';
};

globalThis.openReservationModal = async function() {
    const container = document.getElementById('modal-container');
    if (!document.getElementById('modalReserva')) {
        try {
            const response = await fetch('/html/reservation_modal.html');
            container.innerHTML = await response.text();
        } catch (err) {
            console.error("Erro ao carregar modal:", err);
            mostrarToast("Erro ao abrir modal", 'danger');
            return;
        }
    }
    const myModal = new bootstrap.Modal(document.getElementById('modalReserva'));
    myModal.show();
};

console.log("✓ v3.2 carregado");