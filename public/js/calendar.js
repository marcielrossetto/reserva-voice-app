/**
 * CALENDAR.JS - Calendário com WebSocket para atualização em TEMPO REAL
 */

let calendar = null;
let autoRefreshInterval = null;
let ws = null;

class Calendar {
    constructor(token) {
        this.token = token;
        this.currentDate = new Date();
        this.selectedDate = new Date().toISOString().split('T')[0];
        this.empresaId = localStorage.getItem('empresaId');
        this.init();
        this.inicializarWebSocket();
    }

    /**
     * ✅ INICIALIZAR WEBSOCKET
     */
    inicializarWebSocket() {
        console.log("🔌 Conectando WebSocket...");
        
        // Detectar protocolo (ws ou wss)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/calendar/ws`;
        
        try {
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log("✅ WebSocket conectado!");
                
                // Enviar empresa_id para filtrar atualizações
                const mensagem = {
                    type: 'subscribe',
                    empresaId: this.empresaId,
                    timestamp: new Date().toISOString()
                };
                ws.send(JSON.stringify(mensagem));
                console.log("📤 Inscrito na empresa:", this.empresaId);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log("📨 Mensagem WebSocket recebida:", data.type);
                    
                    switch (data.type) {
                        case 'reserva:criada':
                            console.log("🆕 Nova reserva detectada!");
                            this.atualizarCalendario();
                            break;
                            
                        case 'reserva:editada':
                            console.log("✏️ Reserva editada!");
                            this.atualizarCalendario();
                            break;
                            
                        case 'reserva:cancelada':
                            console.log("❌ Reserva cancelada!");
                            this.atualizarCalendario();
                            break;
                            
                        case 'reserva:confirmada':
                            console.log("✅ Reserva confirmada!");
                            this.atualizarCalendario();
                            break;
                            
                        case 'fila:alterada':
                            console.log("📋 Fila alterada!");
                            this.atualizarCalendario();
                            break;
                            
                        case 'pong':
                            // Resposta ao ping
                            break;
                            
                        default:
                            console.warn("⚠️ Tipo de mensagem desconhecido:", data.type);
                    }
                } catch (error) {
                    console.error("❌ Erro ao processar mensagem WebSocket:", error);
                }
            };

            ws.onerror = (error) => {
                console.error("❌ Erro WebSocket:", error);
            };

            ws.onclose = () => {
                console.warn("⚠️ WebSocket desconectado. Tentando reconectar em 5s...");
                
                // Reconectar após 5 segundos
                setTimeout(() => {
                    if (!ws || ws.readyState === WebSocket.CLOSED) {
                        this.inicializarWebSocket();
                    }
                }, 5000);
            };

        } catch (error) {
            console.error("❌ Erro ao inicializar WebSocket:", error);
        }
    }

    /**
     * ✅ ENVIAR PING PARA MANTER CONEXÃO VIVA
     */
    iniciarPing() {
        setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'ping',
                    timestamp: new Date().toISOString()
                }));
            }
        }, 30000); // A cada 30 segundos
    }

    /**
     * ✅ DESCONECTAR WEBSOCKET
     */
    desconectarWebSocket() {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
            console.log("🔌 WebSocket desconectado");
        }
    }

    init() {
        console.log("📅 Inicializando calendário...");
        
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');
        const toggleBtn = document.getElementById('toggleCalendarBtn');

        if (prevBtn) prevBtn.onclick = () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.render();
        };

        if (nextBtn) nextBtn.onclick = () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.render();
        };

        if (toggleBtn) toggleBtn.onclick = () => {
            const wrapper = document.getElementById('calendarWrapper');
            if (wrapper) {
                wrapper.classList.toggle('collapsed');
                const icon = toggleBtn.querySelector('i');
                if (icon) {
                    if (wrapper.classList.contains('collapsed')) {
                        toggleBtn.textContent = 'Expandir Calendário ';
                        icon.className = 'fas fa-chevron-down';
                    } else {
                        toggleBtn.textContent = 'Esconder Calendário ';
                        icon.className = 'fas fa-chevron-up';
                    }
                }
            }
        };

        // ✅ FALLBACK: ATUALIZAR A CADA 30 SEGUNDOS SE WEBSOCKET FALHAR
        this.iniciarAutoRefresh();
        
        // ✅ INICIAR PING PARA MANTER CONEXÃO VIVA
        this.iniciarPing();
        
        this.render();
    }

    /**
     * Iniciar auto-refresh a cada 30 segundos (fallback)
     */
    iniciarAutoRefresh() {
        if (autoRefreshInterval) clearInterval(autoRefreshInterval);

        autoRefreshInterval = setInterval(() => {
            console.log("🔄 Auto-refresh calendário (fallback)...");
            this.render();
        }, 30000); // 30 segundos

        console.log("✅ Auto-refresh iniciado (30s fallback)");
    }

    /**
     * Parar auto-refresh
     */
    pararAutoRefresh() {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
            console.log("⏹️ Auto-refresh parado");
        }
    }

    /**
     * ✅ ATUALIZAR CALENDÁRIO (chamado via WebSocket)
     */
    async atualizarCalendario() {
        console.log("🔄 Atualizando calendário via WebSocket...");
        await this.render();
        
        // Também recarregar as reservas do dia
        if (typeof loadReservations === 'function') {
            console.log("🔄 Recarregando reservas...");
            loadReservations();
        }
    }

    async render() {
        const month = this.currentDate.getMonth() + 1;
        const year = this.currentDate.getFullYear();
        const token = localStorage.getItem("token");
        
        console.log(`📅 Renderizando calendário: ${month}/${year}`);

        try {
            const res = await fetch(`/api/calendar/data?month=${month}&year=${year}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.status === 401) {
                console.error("❌ Token expirado!");
                this.pararAutoRefresh();
                this.desconectarWebSocket();
                window.location.href = "/login.html";
                return;
            }

            const { mapa, totalPax, totalRes } = await res.json();
            
            console.log(`✅ Dados recebidos: ${totalPax} pax, ${totalRes} reservas`);

            const monthYearEl = document.getElementById('monthYear');
            if (monthYearEl) {
                monthYearEl.textContent = this.currentDate.toLocaleDateString('pt-BR', { 
                    month: 'long', 
                    year: 'numeric' 
                });
            }

            const totalMonthEl = document.getElementById('totalMonth');
            if (totalMonthEl) {
                totalMonthEl.innerHTML = `👥 Pax: ${totalPax} | 📋 Res: ${totalRes}`;
            }

            this.renderGrid(mapa);
        } catch (e) {
            console.error("❌ Erro ao renderizar calendário:", e);
        }
    }

    renderGrid(mapa) {
        const grid = document.getElementById('calendarGrid');
        if (!grid) return;

        grid.innerHTML = '';

        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1).getDay();
        const daysInMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0).getDate();

        // Headers dos dias
        ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].forEach(d => {
            const header = document.createElement('div');
            header.className = 'day-header';
            header.textContent = d;
            grid.appendChild(header);
        });

        // Dias vazios no início
        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'day-cell empty';
            grid.appendChild(empty);
        }

        // Dias do mês
        for (let day = 1; day <= daysInMonth; day++) {
            const dataISO = `${this.currentDate.getFullYear()}-${String(this.currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dados = mapa[dataISO] || { almoco: 0, jantar: 0 };

            const cell = document.createElement('div');
            cell.className = `day-cell ${dataISO === this.selectedDate ? 'selected' : ''}`;
            cell.setAttribute('data-data', dataISO);

            cell.innerHTML = `
                <div class="day-num">${day}</div>
                <div class="pill-container">
                    ${dados.almoco > 0 ? `<div class="pill pill-a" style="background:#f1c40f; color:#000; font-size:10px; padding:2px; border-radius:3px;">A: ${dados.almoco}</div>` : ''}
                    ${dados.jantar > 0 ? `<div class="pill pill-j" style="background:#3699ff; color:#fff; font-size:10px; padding:2px; border-radius:3px;">J: ${dados.jantar}</div>` : ''}
                </div>
            `;

            cell.onclick = () => this.selecionarData(dataISO);
            grid.appendChild(cell);
        }
    }

    selecionarData(data) {
        console.log(`📍 Data selecionada: ${data}`);
        
        this.selectedDate = data;
        
        // Atualizar campo de data
        const filterDataEl = document.getElementById('filterData');
        if (filterDataEl) {
            filterDataEl.value = data;
            console.log(`✅ filterData atualizado para: ${data}`);
        }

        // Remover selected de todas as células
        document.querySelectorAll('.day-cell').forEach(el => el.classList.remove('selected'));
        
        // Adicionar selected na célula clicada
        const selectedCell = document.querySelector(`[data-data="${data}"]`);
        if (selectedCell) {
            selectedCell.classList.add('selected');
        }

        // Carregar reservas do dia
        console.log("📍 Chamando loadReservations()...");
        loadReservations();
    }
}

// ========== LISTENER PARA NOVA RESERVA ==========

/**
 * Atualizar calendário quando uma nova reserva é criada
 */
function atualizarCalendarioAposNovaReserva() {
    if (calendar) {
        console.log("🆕 Nova reserva detectada! Atualizando calendário...");
        calendar.atualizarCalendario();
    }
}

/**
 * Escuta de eventos globais
 */
window.addEventListener('reserva:nova', (event) => {
    console.log("📢 Evento de nova reserva capturado!", event.detail);
    atualizarCalendarioAposNovaReserva();
});

// ========== AJUSTE EM FORMS DE CRIAÇÃO DE RESERVA ==========

/**
 * Wrapper para criar reserva com auto-refresh
 */
async function criarReservaComAutoRefresh(endpoint, dados) {
    try {
        const token = localStorage.getItem("token");
        
        const res = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(dados)
        });

        const result = await res.json();

        if (res.ok) {
            console.log("✅ Reserva criada com sucesso!");
            
            // ✅ ATUALIZAR CALENDÁRIO AUTOMATICAMENTE (WebSocket fará isso também)
            atualizarCalendarioAposNovaReserva();
            
            // ✅ NOTIFICAR VIA WEBSOCKET (se necessário)
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'reserva:criada',
                    empresaId: localStorage.getItem('empresaId'),
                    timestamp: new Date().toISOString()
                }));
            }
            
            return result;
        } else {
            console.error("❌ Erro ao criar reserva:", result.erro);
            return null;
        }
    } catch (error) {
        console.error("❌ Erro de conexão:", error);
        return null;
    }
}

// ========== INICIALIZAR ==========

document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 DOM ready - Inicializando calendário com WebSocket");
    const token = localStorage.getItem("token");
    if (token) {
        calendar = new Calendar(token);
    }
});

// Parar auto-refresh e desconectar WebSocket quando sair da página
window.addEventListener('beforeunload', () => {
    if (calendar) {
        calendar.pararAutoRefresh();
        calendar.desconectarWebSocket();
    }
});

console.log("✅ calendar.js carregado com WebSocket!");