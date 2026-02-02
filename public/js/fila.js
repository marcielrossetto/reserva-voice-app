/**
 * public/js/fila.js - REFATORADO COMPLETO
 * 
 * ✅ ID da fila → histórico
 * ✅ Modal de mesas/prioridade com layout completo (editar, bebidas, WhatsApp, sentar, excluir)
 * ✅ Cronômetro preservado
 * ✅ Auto-refresh 3s
 */
// ✅ VERIFICAR TOKEN ANTES DE TUDO
const token = localStorage.getItem('token');

if (!token) {
    console.log('❌ Sem token em fila.js');
    window.location.href = '/login.html';
}

console.log('✅ Token OK em fila.js:', token.substring(0, 20) + '...');

let filaData = {
    espera: [],
    historico: [],
    bebidas: [],
    numeroInicial: 1
};

let tempId = null;
let wsFila = null;
let wsReconnectTimer = null;

document.addEventListener('DOMContentLoaded', inicializarFila);

async function inicializarFila() {
    console.log('✅ Inicializando Fila...');

    try {
        const elementos = {
            dataSelecionada: document.getElementById('dataSelecionada'),
            formAddCliente: document.getElementById('formAddCliente'),
            btnSalvarNumero: document.getElementById('btnSalvarNumero'),
            btnConfirmarEdicao: document.getElementById('btnConfirmarEdicao'),
            btnConfirmarBebida: document.getElementById('btnConfirmarBebida')
        };

        const hoje = new Date().toISOString().split('T')[0];
        elementos.dataSelecionada.value = hoje;

        await carregarDados(hoje);

        elementos.formAddCliente?.addEventListener('submit', adicionarCliente);
        elementos.btnSalvarNumero?.addEventListener('click', salvarNumeroInicial);
        elementos.dataSelecionada.addEventListener('change', (e) => carregarDados(e.target.value));
        elementos.btnConfirmarEdicao?.addEventListener('click', confirmarEdicao);
        elementos.btnConfirmarBebida?.addEventListener('click', confirmarBebida);

        document.getElementById('telefonePessoa')?.addEventListener('keyup', (e) => maskPhone(e.target));
        document.getElementById('edTel')?.addEventListener('keyup', (e) => maskPhone(e.target));

        inicializarWebSocketFila();
        setInterval(atualizarTimers, 1000);

        console.log('✅ Fila inicializada!');
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

function inicializarWebSocketFila() {
    const empresaId = localStorage.getItem('empresaId');
    if (!empresaId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/calendar/ws`;

    try {
        wsFila = new WebSocket(wsUrl);

        wsFila.onopen = () => {
            console.log("✅ WebSocket Fila conectado!");
            wsFila.send(JSON.stringify({
                type: 'subscribe',
                empresaId: empresaId,
                timestamp: new Date().toISOString()
            }));
        };

        wsFila.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === 'fila:alterada') {
                    console.log("📢 Fila alterada via WebSocket:", msg.dados?.tipo);
                    const data = document.getElementById('dataSelecionada').value;
                    if (data) carregarDadosSemZerar(data);
                }
            } catch (e) {
                console.error("❌ Erro ao processar mensagem WS:", e);
            }
        };

        wsFila.onerror = (error) => {
            console.error("❌ Erro WebSocket Fila:", error);
        };

        wsFila.onclose = () => {
            console.warn("⚠️ WebSocket Fila desconectado. Reconectando em 5s...");
            if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
            wsReconnectTimer = setTimeout(() => {
                if (!wsFila || wsFila.readyState === WebSocket.CLOSED) {
                    inicializarWebSocketFila();
                }
            }, 5000);
        };
    } catch (error) {
        console.error("❌ Erro ao inicializar WebSocket Fila:", error);
    }
}

function desconectarWebSocketFila() {
    if (wsReconnectTimer) {
        clearTimeout(wsReconnectTimer);
        wsReconnectTimer = null;
    }
    if (wsFila) {
        wsFila.onclose = null; // Evita reconexao ao fechar manualmente
        wsFila.close();
        wsFila = null;
    }
}

async function carregarDados(data) {
    try {
        if (!data) data = new Date().toISOString().split('T')[0];

        const url = `${API_CONFIG.BASE_URL}/api/fila/dia/${data}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.status === 401) {
            console.error("❌ Token expirado!");
            desconectarWebSocketFila();
            window.location.href = "/login.html";
            return;
        }

        if (!response.ok) throw new Error(`Erro ${response.status}`);

        const result = await response.json();

        filaData = {
            espera: result.espera || [],
            historico: result.historico || [],
            bebidas: result.bebidasDia || [],
            numeroInicial: result.numeroInicial || 1
        };

        const numInicialEl = document.getElementById('numeroInicial');
        if (numInicialEl) numInicialEl.value = filaData.numeroInicial;

        renderizar();
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
    }
}

async function carregarDadosSemZerar(data) {
    try {
        if (!data) data = new Date().toISOString().split('T')[0];

        const url = `${API_CONFIG.BASE_URL}/api/fila/dia/${data}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!response.ok) return;

        const result = await response.json();

        // ✅ GUARDAR TIMERS ANTIGOS
        const timersAntigos = {};
        document.querySelectorAll('.timer[data-start]').forEach(el => {
            timersAntigos[el.getAttribute('data-start')] = el.textContent;
        });

        filaData = {
            espera: result.espera || [],
            historico: result.historico || [],
            bebidas: result.bebidasDia || [],
            numeroInicial: result.numeroInicial || 1
        };

        const numInicialEl = document.getElementById('numeroInicial');
        if (numInicialEl) numInicialEl.value = filaData.numeroInicial;

        renderizarComTimersAntigos(timersAntigos);
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
    }
}

function renderizar() {
    renderizarFila();
    renderizarHistorico();
    atualizarTotais();
}

/**
 * ✅ RENDERIZAR FILA COM LAYOUT COMPLETO
 */
function renderizarFila() {
    const container = document.getElementById('listaEspera');
    if (!container) return;

    container.innerHTML = '';

    if (filaData.espera.length === 0) {
        container.innerHTML = '<p class="text-center text-muted py-4">Fila vazia</p>';
        renderizarFiltros({});
        return;
    }

    const mesas = contarMesas();
    renderizarFiltros(mesas);

    filaData.espera.forEach((cliente, index) => {
        const numVirtual = filaData.numeroInicial + index;
        const prioClass = getPrioridadeClass(cliente.prioMotivo);
        const qtdBebidas = filaData.bebidas.filter(b => b.filaId === cliente.id).length;
        const dataStart = Math.floor(new Date(cliente.dataCriacao).getTime() / 1000);

        // ✅ ID ORIGINAL VISÍVEL
        const html = `
            <div class="fila-item ${prioClass}" data-pax="${cliente.numPessoas}" data-id="${cliente.id}">
                ${cliente.prioMotivo ? `<span class="badge-prioridade ${cliente.prioMotivo.toLowerCase()}">${cliente.prioMotivo.toUpperCase()}</span>` : ''}
                
                <div class="pos-num">${numVirtual}<small>#${cliente.id}</small></div>
                
                <div class="nome-container">
                    <span class="res-nome">${cliente.nome}</span>
                    <div class="acoes-sub">
                        <button class="btn-icon" onclick="abrirEditar(event, ${cliente.id}, '${cliente.nome.replace(/'/g, "\\'")}', ${cliente.numPessoas}, '${cliente.telefone || ''}')" title="Editar">
                            <i class="material-icons">edit</i>
                        </button>
                        <button class="btn-icon" onclick="abrirAddBebida(event, ${cliente.id})" title="Adicionar Bebida">
                            <i class="material-icons">add</i>
                        </button>
                        ${cliente.telefone ? `
                            <button class="btn-icon" onclick="chamarClienteWhatsApp(event, '${cliente.telefone}', '${cliente.nome}')" title="WhatsApp">
                                <i class="material-icons" style="color: #25d366;">chat</i>
                            </button>
                        ` : ''}
                        <div class="total-bebidas-trigger" onclick="verConsumo(event, ${cliente.id})">
                            🍹 ${qtdBebidas}
                        </div>
                    </div>
                </div>
                
                <div class="pax-focus"><strong>${cliente.numPessoas}</strong><small>Pax</small></div>
                <div class="timer" data-start="${dataStart}">00:00</div>
                
                <div class="btn-sentar-group">
                    <button class="btn-circle btn-seat" onclick="abrirSentar(${cliente.id})" title="Sentar"><i class="material-icons">event_seat</i></button>
                    <button class="btn-circle btn-close" onclick="cancelarFila(${cliente.id})" title="Cancelar"><i class="material-icons">close</i></button>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', html);
    });
}

function renderizarComTimersAntigos(timersAntigos) {
    const container = document.getElementById('listaEspera');
    if (!container) return;

    container.innerHTML = '';

    if (filaData.espera.length === 0) {
        container.innerHTML = '<p class="text-center text-muted py-4">Fila vazia</p>';
        renderizarFiltros({});
        return;
    }

    const mesas = contarMesas();
    renderizarFiltros(mesas);

    filaData.espera.forEach((cliente, index) => {
        const numVirtual = filaData.numeroInicial + index;
        const prioClass = getPrioridadeClass(cliente.prioMotivo);
        const qtdBebidas = filaData.bebidas.filter(b => b.filaId === cliente.id).length;
        const dataStart = Math.floor(new Date(cliente.dataCriacao).getTime() / 1000);
        const timerAnterior = timersAntigos[dataStart] || '00:00';

        const html = `
            <div class="fila-item ${prioClass}" data-pax="${cliente.numPessoas}" data-id="${cliente.id}">
                ${cliente.prioMotivo ? `<span class="badge-prioridade ${cliente.prioMotivo.toLowerCase()}">${cliente.prioMotivo.toUpperCase()}</span>` : ''}
                
                <div class="pos-num">${numVirtual}<small>#${cliente.id}</small></div>
                
                <div class="nome-container">
                    <span class="res-nome">${cliente.nome}</span>
                    <div class="acoes-sub">
                        <button class="btn-icon" onclick="abrirEditar(event, ${cliente.id}, '${cliente.nome.replace(/'/g, "\\'")}', ${cliente.numPessoas}, '${cliente.telefone || ''}')" title="Editar">
                            <i class="material-icons">edit</i>
                        </button>
                        <button class="btn-icon" onclick="abrirAddBebida(event, ${cliente.id})" title="Adicionar Bebida">
                            <i class="material-icons">add</i>
                        </button>
                        ${cliente.telefone ? `
                            <button class="btn-icon" onclick="chamarClienteWhatsApp(event, '${cliente.telefone}', '${cliente.nome}')" title="WhatsApp">
                                <i class="material-icons" style="color: #25d366;">chat</i>
                            </button>
                        ` : ''}
                        <div class="total-bebidas-trigger" onclick="verConsumo(event, ${cliente.id})">
                            🍹 ${qtdBebidas}
                        </div>
                    </div>
                </div>
                
                <div class="pax-focus"><strong>${cliente.numPessoas}</strong><small>Pax</small></div>
                <div class="timer" data-start="${dataStart}">${timerAnterior}</div>
                
                <div class="btn-sentar-group">
                    <button class="btn-circle btn-seat" onclick="abrirSentar(${cliente.id})" title="Sentar"><i class="material-icons">event_seat</i></button>
                    <button class="btn-circle btn-close" onclick="cancelarFila(${cliente.id})" title="Cancelar"><i class="material-icons">close</i></button>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', html);
    });

    renderizarHistorico();
    atualizarTotais();
}

function renderizarFiltros(mesas) {
    const filtrosHTML = `
        <div class="mesa-badge text-primary border-primary" onclick="abrirModalFiltrar('ate2')">
            <span>${mesas.ate2 || 0}</span><small class="d-block" style="font-size:8px">Até 2</small>
        </div>
        <div class="mesa-badge text-success border-success" onclick="abrirModalFiltrar('3a4')">
            <span>${mesas['3a4'] || 0}</span><small class="d-block" style="font-size:8px">3-4</small>
        </div>
        <div class="mesa-badge text-warning border-warning" onclick="abrirModalFiltrar('5a6')">
            <span>${mesas['5a6'] || 0}</span><small class="d-block" style="font-size:8px">5-6</small>
        </div>
        <div class="mesa-badge text-danger border-danger" onclick="abrirModalFiltrar('7a8')">
            <span>${mesas['7a8'] || 0}</span><small class="d-block" style="font-size:8px">7-8</small>
        </div>
        <div class="mesa-badge text-dark border-dark" onclick="abrirModalFiltrar('9mais')">
            <span>${mesas['9mais'] || 0}</span><small class="d-block" style="font-size:8px">9+</small>
        </div>
        <div class="mesa-badge text-info border-info" onclick="abrirModalFiltrarPrioridade()">
            <span>⭐</span><small class="d-block" style="font-size:8px">Prior.</small>
        </div>
    `;
    document.getElementById('filtrosMesas').innerHTML = filtrosHTML;
}

/**
 * ✅ HISTÓRICO COM ID ORIGINAL
 */
function renderizarHistorico() {
    const container = document.getElementById('listaHistorico');
    if (!container) return;

    container.innerHTML = '';

    if (filaData.historico.length === 0) {
        container.innerHTML = '<p class="text-center text-muted py-4">Sem histórico</p>';
        return;
    }

    filaData.historico.forEach((cliente) => {
        const isDesistencia = cliente.status === 2;
        const tempoEspera = Math.floor(new Date(cliente.horaSentado).getTime() / 1000) - Math.floor(new Date(cliente.dataCriacao).getTime() / 1000);
        const tempoFormatado = formatarTempo(tempoEspera);
        const qtdBebidas = filaData.bebidas.filter(b => b.filaId === cliente.id).length;
        
        // ✅ ID ORIGINAL (NÃO MUDA)
        const idOriginal = cliente.id;
        const posicaoAnterior = cliente.posicao || '?';
        const statusLabel = isDesistencia ? '❌ Cancel' : '✅ Sentou';

        const html = `
            <div class="fila-item ${isDesistencia ? 'desistencia' : ''}">
                <div class="pos-num ${isDesistencia ? 'text-danger' : ''}">
                    #${idOriginal}<small>ID</small>
                </div>
                
                <div class="nome-container">
                    <div class="d-flex align-items-center gap-2 flex-wrap">
                        <span class="res-nome ${isDesistencia ? 'text-danger' : ''}">${cliente.nome}</span>
                        <span class="badge badge-info">Pos: ${posicaoAnterior}º</span>
                        ${cliente.numMesa ? `<span class="mesa-numero">Mesa ${cliente.numMesa}</span>` : ''}
                    </div>
                    <small class="text-muted" style="font-size: 10px;">
                        ⏱️ ${tempoFormatado} | 🕐 ${new Date(cliente.horaSentado).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} | ${statusLabel}
                    </small>
                    ${qtdBebidas > 0 ? `
                        <div class="total-bebidas-trigger" onclick="verConsumo(event, ${cliente.id})">
                            🍹 ${qtdBebidas}
                        </div>
                    ` : ''}
                </div>
                
                <div class="pax-focus"><strong class="${isDesistencia ? 'text-danger' : ''}">${cliente.numPessoas}</strong><small>Pax</small></div>
                
                <button class="btn btn-link text-muted p-0" onclick="voltarFila(${cliente.id})" title="Retornar à fila">
                    <i class="material-icons" style="font-size: 20px;">undo</i>
                </button>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', html);
    });
}

function atualizarTotais() {
    const totalPaxEspera = filaData.espera.reduce((acc, e) => acc + e.numPessoas, 0);
    const atendidos = filaData.historico.filter(h => h.status === 1);
    const cancelados = filaData.historico.filter(h => h.status === 2);
    const totalPaxAtendidos = atendidos.reduce((acc, e) => acc + e.numPessoas, 0);
    const totalPaxCancelados = cancelados.reduce((acc, e) => acc + e.numPessoas, 0);
    const totalBebidasQtd = filaData.bebidas.length;
    const totalVendas = filaData.bebidas.reduce((acc, b) => acc + b.valor, 0) * 1.12;

    document.getElementById('totalPaxEspera').textContent = `${totalPaxEspera} PAX`;
    document.getElementById('totalPaxAtendidos').textContent = `${totalPaxAtendidos} PAX`;
    document.getElementById('totalDesistencias').textContent = `${totalPaxCancelados} DESIST.`;
    document.getElementById('totalBebidasBadge').textContent = `🍹 ${totalBebidasQtd}`;
    document.getElementById('totalVendasBadge').textContent = `R$ ${totalVendas.toFixed(2).replace('.', ',')}`;
}

function chamarClienteWhatsApp(event, telefone, nome) {
    event.stopPropagation();
    const mensagem = `Olá ${nome}! 👋\n\nSua mesa está pronta! 🎉\n\nPor favor, dirija-se ao responsável para se sentar.\n\nObrigado!`;
    const url = `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
}

async function adicionarCliente(e) {
    e.preventDefault();

    const nome = document.getElementById('nomePessoa').value.trim();
    const telefone = document.getElementById('telefonePessoa').value.trim();
    const numPessoas = parseInt(document.getElementById('qtdPessoas').value);
    const prioridade = document.getElementById('prioridade').value;

    if (!nome) {
        alert('Digite o nome do cliente');
        return;
    }

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/fila`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ nome, telefone, numPessoas, prioMotivo: prioridade })
        });

        if (!response.ok) throw new Error('Erro ao adicionar');

        document.getElementById('formAddCliente').reset();
        document.getElementById('qtdPessoas').value = '1';

        console.log("✅ Cliente adicionado!");
        
        const data = document.getElementById('dataSelecionada').value;
        await carregarDadosSemZerar(data);

    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

function abrirSentar(id) {
    const mesa = prompt('Número da Mesa:');
    if (mesa !== null) sentarCliente(id, mesa);
}

async function sentarCliente(id, mesa) {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/fila/sentar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ id, mesa })
        });

        if (!response.ok) throw new Error('Erro');
        
        console.log("✅ Cliente sentado!");
        
        const data = document.getElementById('dataSelecionada').value;
        await carregarDados(data);
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

async function cancelarFila(id) {
    if (!confirm('Confirma cancelamento?')) return;

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/fila/${id}/cancelar`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!response.ok) throw new Error('Erro');
        const data = document.getElementById('dataSelecionada').value;
        await carregarDados(data);
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

async function voltarFila(id) {
    if (!confirm('Retornar à fila?')) return;

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/fila/${id}/voltar`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!response.ok) throw new Error('Erro');
        const data = document.getElementById('dataSelecionada').value;
        await carregarDados(data);
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

function abrirEditar(event, id, nome, pax, tel) {
    event.stopPropagation();
    tempId = id;
    document.getElementById('edNome').value = nome;
    document.getElementById('edPax').value = pax;
    document.getElementById('edTel').value = tel;
    new bootstrap.Modal(document.getElementById('modalEditar')).show();
}

async function confirmarEdicao() {
    const nome = document.getElementById('edNome').value.trim();
    const pax = parseInt(document.getElementById('edPax').value);
    const tel = document.getElementById('edTel').value.trim();

    if (!nome || pax <= 0) {
        alert('Preencha os campos');
        return;
    }

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/fila/${tempId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ nome, numPessoas: pax, telefone: tel })
        });

        if (!response.ok) throw new Error('Erro');
        bootstrap.Modal.getInstance(document.getElementById('modalEditar')).hide();
        const data = document.getElementById('dataSelecionada').value;
        await carregarDados(data);
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

function abrirAddBebida(event, id) {
    event.stopPropagation();
    tempId = id;
    document.getElementById('nomeBebida').value = '';
    document.getElementById('precoBebida').value = '';
    new bootstrap.Modal(document.getElementById('modalAddBebida')).show();
}

async function confirmarBebida() {
    const nomeBebida = document.getElementById('nomeBebida').value.trim();
    const preco = parseFloat(document.getElementById('precoBebida').value);

    if (!nomeBebida || preco <= 0) {
        alert('Preencha nome e preço');
        return;
    }

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/fila/${tempId}/bebida`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ nomeBebida, preco })
        });

        if (!response.ok) throw new Error('Erro');
        bootstrap.Modal.getInstance(document.getElementById('modalAddBebida')).hide();
        const data = document.getElementById('dataSelecionada').value;
        await carregarDadosSemZerar(data);
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

async function verConsumo(event, id) {
    event.stopPropagation();
    
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/fila/${id}/consumo`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        const result = await response.json();

        let html = '';
        if (result.itens && result.itens.length > 0) {
            result.itens.forEach(b => {
                html += `
                    <div class="d-flex justify-content-between mb-2 pb-2 border-bottom">
                        <span><strong>#${b.id}</strong> ${b.bebida}</span>
                        <span class="fw-bold">R$ ${b.valor.toFixed(2).replace('.', ',')}</span>
                    </div>
                `;
            });
        } else {
            html = '<p class="text-center text-muted">Sem consumo</p>';
        }

        document.getElementById('corpoConsumo').innerHTML = html;
        document.getElementById('financeiroConsumo').innerHTML = `
            <div class="d-flex justify-content-between small"><span>Subtotal:</span><span>R$ ${result.subtotal.toFixed(2).replace('.', ',')}</span></div>
            <div class="d-flex justify-content-between fw-bold text-success mt-2 pt-2 border-top">
                <span>TOTAL (+12%):</span><span>R$ ${result.total.toFixed(2).replace('.', ',')}</span>
            </div>
        `;

        new bootstrap.Modal(document.getElementById('modalConsumo')).show();
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

async function salvarNumeroInicial() {
    const numero = parseInt(document.getElementById('numeroInicial').value);

    if (!numero || numero < 1) {
        alert('Número válido (mínimo 1)');
        return;
    }

    try {
        const data = document.getElementById('dataSelecionada').value;
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/fila/config/numero-inicial`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ numeroInicial: numero, data })
        });

        if (!response.ok) throw new Error('Erro');
        alert('✅ Começará do ' + numero);
        await carregarDados(data);
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

// ========== FILTROS COM CARDS COMPLETOS ==========

/**
 * ✅ FILTRAR POR MESAS - MOSTRA CARDS COMPLETOS
 */
function abrirModalFiltrar(faixa) {
    const filtrados = filaData.espera.filter(cliente => {
        const pax = cliente.numPessoas;
        if (faixa === 'ate2') return pax <= 2;
        if (faixa === '3a4') return pax >= 3 && pax <= 4;
        if (faixa === '5a6') return pax >= 5 && pax <= 6;
        if (faixa === '7a8') return pax >= 7 && pax <= 8;
        if (faixa === '9mais') return pax >= 9;
        return false;
    });

    let html = '';
    if (filtrados.length > 0) {
        filtrados.forEach((cliente) => {
            const posicaoGlobal = filaData.espera.indexOf(cliente) + 1;
            const numVirtual = filaData.numeroInicial + (posicaoGlobal - 1);
            const prioClass = getPrioridadeClass(cliente.prioMotivo);
            const qtdBebidas = filaData.bebidas.filter(b => b.filaId === cliente.id).length;
            const dataStart = Math.floor(new Date(cliente.dataCriacao).getTime() / 1000);

            html += `
                <div class="fila-item ${prioClass}" data-pax="${cliente.numPessoas}" data-id="${cliente.id}">
                    ${cliente.prioMotivo ? `<span class="badge-prioridade ${cliente.prioMotivo.toLowerCase()}">${cliente.prioMotivo.toUpperCase()}</span>` : ''}
                    
                    <div class="pos-num">${numVirtual}<small>#${cliente.id}</small></div>
                    
                    <div class="nome-container">
                        <span class="res-nome">${cliente.nome}</span>
                        <div class="acoes-sub">
                            <button class="btn-icon" onclick="abrirEditar(event, ${cliente.id}, '${cliente.nome.replace(/'/g, "\\'")}', ${cliente.numPessoas}, '${cliente.telefone || ''}')" title="Editar">
                                <i class="material-icons">edit</i>
                            </button>
                            <button class="btn-icon" onclick="abrirAddBebida(event, ${cliente.id})" title="Bebida">
                                <i class="material-icons">add</i>
                            </button>
                            ${cliente.telefone ? `
                                <button class="btn-icon" onclick="chamarClienteWhatsApp(event, '${cliente.telefone}', '${cliente.nome}')" title="WhatsApp">
                                    <i class="material-icons" style="color: #25d366;">chat</i>
                                </button>
                            ` : ''}
                            <div class="total-bebidas-trigger" onclick="verConsumo(event, ${cliente.id})">
                                🍹 ${qtdBebidas}
                            </div>
                        </div>
                    </div>
                    
                    <div class="pax-focus"><strong>${cliente.numPessoas}</strong><small>Pax</small></div>
                    <div class="timer" data-start="${dataStart}">00:00</div>
                    
                    <div class="btn-sentar-group">
                        <button class="btn-circle btn-seat" onclick="abrirSentar(${cliente.id})" title="Sentar"><i class="material-icons">event_seat</i></button>
                        <button class="btn-circle btn-close" onclick="cancelarFila(${cliente.id})" title="Cancelar"><i class="material-icons">close</i></button>
                    </div>
                </div>
            `;
        });
    } else {
        html = '<p class="text-center text-muted">Nenhum</p>';
    }

    document.getElementById('corpoFiltro').innerHTML = html;
    new bootstrap.Modal(document.getElementById('modalFiltro')).show();
}

/**
 * ✅ FILTRAR POR PRIORIDADE - MOSTRA CARDS COMPLETOS
 */
function abrirModalFiltrarPrioridade() {
    const filtrados = filaData.espera.filter(e => e.prioMotivo && e.prioMotivo.trim() !== '');

    let html = '<div class="alert alert-warning mb-3"><strong>⭐ Com Prioridade</strong></div>';

    if (filtrados.length > 0) {
        filtrados.forEach((cliente) => {
            const posicaoGlobal = filaData.espera.indexOf(cliente) + 1;
            const numVirtual = filaData.numeroInicial + (posicaoGlobal - 1);
            const prioClass = getPrioridadeClass(cliente.prioMotivo);
            const qtdBebidas = filaData.bebidas.filter(b => b.filaId === cliente.id).length;
            const dataStart = Math.floor(new Date(cliente.dataCriacao).getTime() / 1000);

            html += `
                <div class="fila-item ${prioClass}" data-pax="${cliente.numPessoas}" data-id="${cliente.id}">
                    <span class="badge-prioridade ${cliente.prioMotivo.toLowerCase()}">${cliente.prioMotivo.toUpperCase()}</span>
                    
                    <div class="pos-num">${numVirtual}<small>#${cliente.id}</small></div>
                    
                    <div class="nome-container">
                        <span class="res-nome">${cliente.nome}</span>
                        <div class="acoes-sub">
                            <button class="btn-icon" onclick="abrirEditar(event, ${cliente.id}, '${cliente.nome.replace(/'/g, "\\'")}', ${cliente.numPessoas}, '${cliente.telefone || ''}')" title="Editar">
                                <i class="material-icons">edit</i>
                            </button>
                            <button class="btn-icon" onclick="abrirAddBebida(event, ${cliente.id})" title="Bebida">
                                <i class="material-icons">add</i>
                            </button>
                            ${cliente.telefone ? `
                                <button class="btn-icon" onclick="chamarClienteWhatsApp(event, '${cliente.telefone}', '${cliente.nome}')" title="WhatsApp">
                                    <i class="material-icons" style="color: #25d366;">chat</i>
                                </button>
                            ` : ''}
                            <div class="total-bebidas-trigger" onclick="verConsumo(event, ${cliente.id})">
                                🍹 ${qtdBebidas}
                            </div>
                        </div>
                    </div>
                    
                    <div class="pax-focus"><strong>${cliente.numPessoas}</strong><small>Pax</small></div>
                    <div class="timer" data-start="${dataStart}">00:00</div>
                    
                    <div class="btn-sentar-group">
                        <button class="btn-circle btn-seat" onclick="abrirSentar(${cliente.id})" title="Sentar"><i class="material-icons">event_seat</i></button>
                        <button class="btn-circle btn-close" onclick="cancelarFila(${cliente.id})" title="Cancelar"><i class="material-icons">close</i></button>
                    </div>
                </div>
            `;
        });
    } else {
        html += '<p class="text-center text-muted">Nenhum</p>';
    }

    document.getElementById('corpoFiltro').innerHTML = html;
    new bootstrap.Modal(document.getElementById('modalFiltro')).show();
}

// ========== UTILITÁRIOS ==========

function contarMesas() {
    const mesas = { ate2: 0, '3a4': 0, '5a6': 0, '7a8': 0, '9mais': 0 };
    filaData.espera.forEach(e => {
        const p = e.numPessoas;
        if (p <= 2) mesas.ate2++;
        else if (p <= 4) mesas['3a4']++;
        else if (p <= 6) mesas['5a6']++;
        else if (p <= 8) mesas['7a8']++;
        else mesas['9mais']++;
    });
    return mesas;
}

function formatarTempo(segundos) {
    if (segundos >= 3600) {
        const h = Math.floor(segundos / 3600);
        const m = Math.floor((segundos % 3600) / 60);
        return `${h}hs ${String(m).padStart(2, '0')}m`;
    }
    const m = Math.floor(segundos / 60);
    const s = Math.floor(segundos % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getPrioridadeClass(prioridade) {
    const mapa = {
        'Idoso': 'prioridade-idoso',
        'Colo': 'prioridade-colo',
        'Deficiente': 'prioridade-deficiente',
        'Gestante': 'prioridade-gestante'
    };
    return mapa[prioridade] || '';
}

function maskPhone(input) {
    let v = input.value.replace(/\D/g, '');
    v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
    v = v.replace(/(\d{5})(\d)/, '$1-$2');
    input.value = v;
}

function atualizarTimers() {
    const agora = Math.floor(Date.now() / 1000);

    document.querySelectorAll('.timer').forEach(el => {
        const start = parseInt(el.getAttribute('data-start'));
        if (!start || isNaN(start)) return;

        const diff = Math.max(0, agora - start);
        el.textContent = formatarTempo(diff);
    });
}

window.addEventListener('beforeunload', () => {
    desconectarWebSocketFila();
});

console.log("✅ fila.js REFATORADO carregado!");