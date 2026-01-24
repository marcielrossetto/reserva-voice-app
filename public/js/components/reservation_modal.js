// ===== MÓDULO DE RESERVAS MODAL - NODE.JS =====
// Todas as validações e regras do PHP migradas para JavaScript

// ========================= HELPER FUNCTIONS =========================

/**
 * Máscara de telefone brasileiro
 * Transforma: 11911223344 -> (11) 91122-3344
 */
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

/**
 * Toggle - ativa/desativa campo de telefone
 */
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
        telInput.style.backgroundColor = '#f9f9fb';
    }
};

/**
 * Limpa o formulário e retorna ao estado inicial
 */
globalThis.trocarCliente = function() {
    document.getElementById('formManual').reset();
    document.getElementById('card-perfil-cliente').style.display = 'none';
    document.getElementById('div-input-nome').style.display = 'block';
    document.getElementById('res_telefone').disabled = false;
    document.getElementById('sem_telefone').checked = false;
};

/**
 * Busca perfil do cliente por telefone
 * Retorna: histórico, última visita, observações, etc.
 */
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
            
            // Popula o card com dados do perfil
            document.getElementById('card-nome-display').innerText = p.nome;
            document.getElementById('card-telefone-display').innerText = p.telefone;
            document.getElementById('card-ultima').innerText = p.ultima_visita_data;
            document.getElementById('card-tempo').innerText = p.tempo_atras;
            document.getElementById('card-historico').innerText = p.historico_recente || "--";
            document.getElementById('stat-reservas').innerText = p.total_reservas;
            document.getElementById('stat-cancelada').innerText = p.canceladas;
            
            // Auto-preenche nome
            document.getElementById('res_nome').value = p.nome;
            
            // Exibe card e esconde input de nome
            document.getElementById('card-perfil-cliente').style.display = 'block';
            document.getElementById('div-input-nome').style.display = 'none';
            
            // Exibe observações se existirem
            if (p.obs_cliente && p.obs_cliente !== "No observations recorded.") {
                document.getElementById('txt-obs-db').innerText = p.obs_cliente;
                document.getElementById('area-obs-db').style.display = 'block';
            } else {
                document.getElementById('area-obs-db').style.display = 'none';
            }
        } else {
            // Não encontrou - retorna ao formulário vazio
            document.getElementById('card-perfil-cliente').style.display = 'none';
            document.getElementById('div-input-nome').style.display = 'block';
            document.getElementById('res_nome').value = '';
        }
    } catch (err) {
        console.error("Erro ao buscar telefone:", err);
        document.getElementById('card-perfil-cliente').style.display = 'none';
    }
};

/**
 * Edita nome do cliente no card
 */
globalThis.editarCliente = function() {
    alert("Função de edição será implementada em breve!");
};

/**
 * Importa dados do WhatsApp para o formulário
 * Formato esperado:
 * Nome: João
 * Telefone: (11) 91122-3344
 * Data: 25/01/2026
 * Horário: 19:30
 * Pessoas: 4
 */
globalThis.importarWhatsParaFormulario = function() {
    const texto = document.getElementById('whats_dados').value;
    if (!texto.trim()) return;
    
    const linhas = texto.split('\n');
    
    linhas.forEach(linha => {
        if (!linha.includes(':')) return;
        
        const [chave, ...valorParts] = linha.split(':');
        const k = chave.trim().toLowerCase();
        const v = valorParts.join(':').trim();
        
        // Mapeia cada campo
        if (k.includes('nome')) {
            document.getElementById('res_nome').value = v;
        }
        if (k.includes('telefone') && !k.includes('alt')) {
            document.getElementById('res_telefone').value = v;
            maskPhone(document.getElementById('res_telefone'));
            buscarTelefone();
        }
        if (k.includes('data')) {
            // Trata formatos: DD/MM/YYYY ou YYYY-MM-DD
            if (v.includes('/')) {
                const partes = v.split('/');
                if (partes.length === 3) {
                    document.getElementById('res_data').value = `${partes[2]}-${partes[1]}-${partes[0]}`;
                }
            } else {
                document.getElementById('res_data').value = v;
            }
        }
        if (k.includes('hor')) {
            document.getElementById('res_horario').value = v.substring(0, 5);
        }
        if (k.includes('pess') || k.includes('pessoas')) {
            const numPessoas = v.replaceAll(/\D/g, "");
            document.getElementById('res_num_pessoas').value = numPessoas;
        }
        if (k.includes('pagamento')) {
            document.getElementById('res_forma_pagamento').value = v;
        }
        if (k.includes('mesa')) {
            document.getElementById('res_num_mesa').value = v;
        }
        if (k.includes('observa')) {
            document.getElementById('res_observacoes').value = v;
        }
    });
};

/**
 * VERIFICAÇÃO E ENVIO - Principal
 * 1. Valida data (não anterior a hoje)
 * 2. Valida campos obrigatórios
 * 3. Checa duplicidade
 * 4. Envia para API
 */
globalThis.verificarEEnviar = async function() {
    const btn = document.getElementById('btnSalvarManual');
    const semTel = document.getElementById('sem_telefone').checked;
    const telefone = document.getElementById('res_telefone').value.replaceAll(/\D/g, "");
    const data = document.getElementById('res_data').value;
    const nome = document.getElementById('res_nome').value.trim();
    const numPessoas = document.getElementById('res_num_pessoas').value;
    
    // ===== HELPER PARA RESETAR BOTÃO =====
    const resetarBotao = () => {
        btn.disabled = false;
        btn.innerText = "Cadastrar reserva";
    };
    
    // ===== VALIDAÇÃO 1: DATA ANTERIOR A HOJE =====
    const hoje = new Date().toISOString().split('T')[0];
    if (data < hoje) {
        alert("Atenção: A data da reserva não pode ser anterior a hoje.");
        resetarBotao();
        return;
    }
    
    // ===== VALIDAÇÃO 2: TELEFONE (se não marcado "sem telefone") =====
    if (!semTel && telefone.length < 10) {
        alert('Por favor, insira um telefone válido ou marque a opção "Não possuo número".');
        resetarBotao();
        return;
    }
    
    // ===== VALIDAÇÃO 3: CAMPOS OBRIGATÓRIOS =====
    if (!nome || !data || !numPessoas) {
        alert('Preencha os campos obrigatórios (Nome, Data e Pax).');
        resetarBotao();
        return;
    }
    
    // ===== VALIDAÇÃO 4: NÚMERO DE PESSOAS > 0 =====
    const pax = Number.parseInt(numPessoas, 10);
    if (pax <= 0) {
        alert("Número de pessoas deve ser maior que 0.");
        resetarBotao();
        return;
    }
    
    // ===== INICIAR PROCESSAMENTO =====
    btn.disabled = true;
    btn.innerText = "Verificando...";
    
    try {
        // ===== PASSO 1: CHECAR DUPLICIDADE (se tiver telefone) =====
        if (!semTel && telefone) {
            try {
                const checkRes = await fetch(
                    `/api/reservations/check-duplicate?phone=${telefone}&date=${data}&name=${encodeURIComponent(nome)}`,
                    { 
                        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
                        timeout: 10000
                    }
                );
                
                if (!checkRes.ok) {
                    console.error("Erro na verificação:", checkRes.status);
                    alert("Erro ao verificar duplicidade. Continuando com salvamento...");
                } else {
                    const checkData = await checkRes.json();
                    
                    // Verifica erro de data
                    if (checkData.erro_data) {
                        alert(checkData.msg);
                        resetarBotao();
                        return;
                    }
                    
                    // Verifica duplicidade
                    if (checkData.exists) {
                        const confirma = confirm(
                            `Atenção: Já existe uma reserva para ${nome} nesta data. Deseja duplicar mesmo assim?`
                        );
                        
                        if (!confirma) {
                            resetarBotao();
                            return;
                        }
                    }
                }
            } catch (checkErr) {
                console.error("Erro ao checar duplicidade:", checkErr);
                alert("Erro ao verificar duplicidade. Continuando com salvamento...");
            }
        }
        
        // ===== PASSO 2: PREPARAR PAYLOAD =====
        const form = document.getElementById('formManual');
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());
        
        // Garante que numPessoas é número
        payload.numPessoas = pax;
        
        // Normaliza checkboxes (FormData às vezes ignora unchecked)
        payload.tortaTermoVela = document.getElementById('torta').checked;
        payload.churrascaria = document.getElementById('churras').checked;
        payload.executivo = document.getElementById('exec').checked;
        
        // Remove telefone se estiver vazio
        if (!payload.telefone) {
            payload.telefone = null;
        }
        
        // ===== PASSO 3: ENVIAR PARA API =====
        const saveRes = await fetch('/api/reservations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify(payload)
        });
        
        if (!saveRes.ok) {
            throw new Error(`Erro HTTP ${saveRes.status}: ${saveRes.statusText}`);
        }
        
        const result = await saveRes.json();
        
        if (result.success) {
            // Sucesso!
            btn.disabled = false;
            btn.innerText = "Cadastrar reserva";
            exibirModalSucesso(nome, result.waLink);
            
            // Atualiza lista de reservas e calendário
            if (globalThis.carregarReservas) {
                setTimeout(() => globalThis.carregarReservas(), 500);
            }
            if (globalThis.calendar) {
                setTimeout(() => globalThis.calendar.render(), 500);
            }
        } else {
            console.error("Erro na resposta:", result);
            alert("Erro ao salvar: " + (result.error || result.details?.join(", ") || "Erro desconhecido"));
            resetarBotao();
        }
        
    } catch (err) {
        console.error("Erro na requisição:", err);
        alert("Erro de conexão com o servidor: " + err.message);
        resetarBotao();
    }
};

/**
 * Exibe modal de sucesso após salvar reserva
 */
function exibirModalSucesso(nome, waLink) {
    const btn = document.getElementById('btnSalvarManual');
    if (btn) {
        btn.disabled = false;
        btn.innerText = "Cadastrar reserva";
    }
    
    const btnZapHtml = waLink
        ? `<button onclick="window.open('${waLink}', '_blank')" class="btn btn-success w-100 mb-2">
               ✓ Confirmar via WhatsApp
           </button>`
        : '';
    
    const modalHtml = `
        <div id="modalSucesso" class="modal fade show" tabindex="-1" style="display: block; background: rgba(0,0,0,0.5);">
            <div class="modal-dialog modal-sm modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-body text-center py-4">
                        <div style="font-size: 60px; color: #28a745; margin-bottom: 15px;">
                            ✓
                        </div>
                        <h5 class="fw-bold mb-2">Reserva Salva!</h5>
                        <p class="text-muted mb-0">A reserva de <strong>${nome}</strong> foi registrada com sucesso.</p>
                        <div class="mt-3">
                            ${btnZapHtml}
                            <button class="btn btn-outline-secondary w-100" onclick="fecharModalEAtualizar()">
                                Fechar e Nova Reserva
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    
    // Remove modal anterior se existir
    const modalAnterior = document.getElementById('modalSucesso');
    if (modalAnterior) modalAnterior.remove();
    
    // Insere novo modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Fecha o modal de reserva após delay
    setTimeout(() => {
        const modalReserva = bootstrap.Modal.getInstance(document.getElementById('modalReserva'));
        if (modalReserva) modalReserva.hide();
    }, 500);
}

/**
 * Fecha modal de sucesso e atualiza formulário
 */
globalThis.fecharModalEAtualizar = function() {
    const modal = document.getElementById('modalSucesso');
    if (modal) modal.remove();
    
    document.getElementById('formManual').reset();
    document.getElementById('whats_dados').value = '';
    trocarCliente();
};

// ========================= WHATSAPP DIRETO =========================

/**
 * Analisa e salva múltiplas reservas do WhatsApp em uma só ação
 */
globalThis.analisarSalvarDireto = async function() {
    const texto = document.getElementById('whats_dados').value.trim();
    if (!texto) {
        alert("Cole o texto do WhatsApp primeiro.");
        return;
    }
    
    const btn = event.target;
    btn.innerText = "Processando...";
    btn.disabled = true;
    
    try {
        // ===== PASSO 1: ANALISAR =====
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
        
        // ===== PASSO 2: FILTRAR VÁLIDAS E DUPLICADAS =====
        const listaParaSalvar = [];
        
        for (const item of analyzeData.lista) {
            // Pula inválidas automaticamente
            if (!item.valido) {
                console.warn("Item inválido:", item.dados.nome, item.erros);
                continue;
            }
            
            // Pergunta sobre duplicidades
            if (item.duplicado) {
                const confirma = confirm(
                    `Duplicidade detectada: ${item.dados.nome}. Deseja salvar mesmo assim?`
                );
                if (!confirma) continue;
            }
            
            listaParaSalvar.push(item.dados);
        }
        
        if (listaParaSalvar.length === 0) {
            alert("Nenhuma reserva válida para salvar.");
            return;
        }
        
        // ===== PASSO 3: SALVAR LISTA =====
        await salvarListaFinal(listaParaSalvar);
        
    } catch (err) {
        console.error("Erro:", err);
        alert("Erro de conexão com o servidor.");
        btn.innerText = "Salvar Direto";
        btn.disabled = false;
    }
};

/**
 * Salva lista final no banco de dados
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
            exibirModalResultado(result.salvos, result.links);
            
            // Atualiza dados
            if (globalThis.carregarReservas) {
                globalThis.carregarReservas();
            }
        } else {
            alert("Erro ao salvar lista: " + result.error);
        }
        
    } catch (err) {
        console.error("Erro ao salvar:", err);
        alert("Erro de conexão.");
    }
}

/**
 * Exibe resultado do processamento em lote
 */
function exibirModalResultado(salvos, links) {
    const linksHtml = links
        .map(l => `<li>${l.nome}: <a href="${l.link}" target="_blank" class="btn btn-sm btn-success">WhatsApp</a></li>`)
        .join('');
    
    const modalHtml = `
        <div id="modalResultado" class="modal fade show" tabindex="-1" style="display: block; background: rgba(0,0,0,0.5);">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header border-0">
                        <h5 class="modal-title fw-bold">Processamento Concluído</h5>
                        <button type="button" class="btn-close" onclick="document.getElementById('modalResultado').remove()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-success mb-3">
                            <strong>${salvos} reserva${salvos !== 1 ? 's' : ''} criada${salvos !== 1 ? 's' : ''}</strong>
                        </div>
                        <ul class="list-unstyled" style="max-height: 300px; overflow-y: auto;">
                            ${linksHtml}
                        </ul>
                    </div>
                    <div class="modal-footer border-0">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('modalResultado').remove(); fecharModalEAtualizar()">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// ========================= ABERTURA DO MODAL =========================

/**
 * Abre o modal de reserva
 * Carrega HTML do modal se ainda não carregado
 */
globalThis.openReservationModal = async function() {
    const container = document.getElementById('modal-container');
    
    // Carrega HTML do modal se ainda não foi carregado
    if (!document.getElementById('modalReserva')) {
        try {
            const response = await fetch('/html/reservation_modal.html');
            const html = await response.text();
            container.innerHTML = html;
        } catch (err) {
            console.error("Erro ao carregar modal:", err);
            alert("Erro ao abrir modal de reserva.");
            return;
        }
    }
    
    // Abre com Bootstrap
    const modalElement = document.getElementById('modalReserva');
    const myModal = new bootstrap.Modal(modalElement);
    myModal.show();
};

// ========================= INICIALIZAÇÃO =========================

// Garante que funções estão disponíveis globalmente
if (typeof window !== 'undefined') {
    // As funções já estão em globalThis, então estão prontas
    console.log("✓ Módulo de Reservas carregado com sucesso");
}