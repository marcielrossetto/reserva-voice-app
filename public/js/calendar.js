class Calendar {
    constructor(token) {
        this.token = token;
        this.currentMonth = new Date().getMonth() + 1;
        this.currentYear = new Date().getFullYear();
        this.periodoSelecionado = 'todos';
        this.isCollapsed = false;
        this.init();
    }

    init() {
        document.getElementById('prevMonth').addEventListener('click', () => this.prevMonth());
        document.getElementById('nextMonth').addEventListener('click', () => this.nextMonth());
        document.getElementById('toggleCalendarBtn').addEventListener('click', () => this.toggleCollapse());
        this.render();
    }

    toggleCollapse() {
        this.isCollapsed = !this.isCollapsed;
        const wrapper = document.getElementById('calendarWrapper');
        const mainContent = document.getElementById('mainContent');
        const btn = document.getElementById('toggleCalendarBtn');
        
        wrapper.classList.toggle('collapsed');
        mainContent.classList.toggle('full-width');
        btn.textContent = this.isCollapsed ? '→' : '←';
    }

    async render() {
        await this.carregarCalendario();
    }

    prevMonth() {
        this.currentMonth--;
        if (this.currentMonth < 1) {
            this.currentMonth = 12;
            this.currentYear--;
        }
        this.render();
    }

    nextMonth() {
        this.currentMonth++;
        if (this.currentMonth > 12) {
            this.currentMonth = 1;
            this.currentYear++;
        }
        this.render();
    }

    async carregarCalendario() {
        try {
            console.log(`🔄 Carregando calendário: ${this.currentMonth}/${this.currentYear}`);
            
            const res = await fetch(
                `http://localhost:3001/api/calendar/data?month=${this.currentMonth}&year=${this.currentYear}`,
                { headers: { "Authorization": `Bearer ${this.token}` } }
            );
            
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            
            const { mapa, totalPax, totalRes } = await res.json();
            
            console.log("✅ Dados recebidos:", { totalPax, totalRes, dias: Object.keys(mapa).length });

            const monthName = new Date(this.currentYear, this.currentMonth - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            document.getElementById('monthYear').textContent = monthName;
            document.getElementById('totalMonth').innerHTML = `👥 ${totalPax} | 📋 ${totalRes}`;

            this.renderGrid(mapa);
        } catch (err) {
            console.error("❌ Erro ao carregar calendário:", err);
            document.getElementById('totalMonth').innerHTML = '❌ Erro ao carregar';
        }
    }

    renderGrid(mapa) {
        console.log("🎨 Renderizando grid com", Object.keys(mapa).length, "dias com dados");
        
        const firstDay = new Date(this.currentYear, this.currentMonth - 1, 1).getDay();
        const daysInMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();
        const hoje = new Date().toISOString().split('T')[0];

        let html = '';
        const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

        dias.forEach(d => {
            html += `<div class="day-header">${d}</div>`;
        });

        for (let i = 0; i < firstDay; i++) {
            html += '<div class="day-cell empty"></div>';
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dataISO = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dados = mapa[dataISO] || { almoco: 0, jantar: 0 };
            const isToday = dataISO === hoje;

            html += `<div class="day-cell ${isToday ? 'today' : ''}" data-data="${dataISO}" onclick="calendar.selecionarData('${dataISO}')">
                <div class="day-num">${day}</div>
                <button class="day-eye" onclick="calendar.verReservasDia('${dataISO}', event)">👁️</button>
                <div class="day-pills">
                    ${dados.almoco > 0 ? `<div class="pill pill-almoco">A:${dados.almoco}</div>` : ''}
                    ${dados.jantar > 0 ? `<div class="pill pill-jantar">J:${dados.jantar}</div>` : ''}
                </div>
            </div>`;
        }

        document.getElementById('calendarGrid').innerHTML = html;
        console.log("✅ Grid renderizado");
    }

    selecionarData(data) {
        document.querySelectorAll('.day-cell.selected').forEach(el => el.classList.remove('selected'));
        document.querySelector(`[data-data="${data}"]`).classList.add('selected');
        document.getElementById('filterStartDate').value = data;
        carregarReservas();
    }

    async verReservasDia(data, e) {
        e.stopPropagation();
        const modal = document.getElementById('modalDia');
        modal.classList.add('show');

        const periodo = document.querySelector('.periodo-btn.active')?.dataset.periodo || 'todos';
        
        try {
            console.log(`👁️ Abrindo reservas: ${data} (${periodo})`);
            
            const res = await fetch(
                `http://localhost:3001/api/calendar/reservas-dia?data=${data}&periodo=${periodo}`,
                { headers: { "Authorization": `Bearer ${this.token}` } }
            );
            const { reservas, resumo } = await res.json();

            console.log("✅ Reservas carregadas:", reservas.length);

            let html = `<div class="modal-day-content">
                <div class="modal-day-header">
                    <h3>Reservas - ${new Date(data).toLocaleDateString('pt-BR')}</h3>
                    <button class="close-btn" onclick="fecharModalDia()">×</button>
                </div>

                <div class="periodo-selector">
                    <button class="periodo-btn active" data-periodo="todos" onclick="calendar.filtrarPeriodo('todos', '${data}')">Todos</button>
                    <button class="periodo-btn" data-periodo="almoco" onclick="calendar.filtrarPeriodo('almoco', '${data}')">🌞 Almoço</button>
                    <button class="periodo-btn" data-periodo="jantar" onclick="calendar.filtrarPeriodo('jantar', '${data}')">🌙 Jantar</button>
                </div>`;

            if (reservas.length === 0) {
                html += '<div style="text-align:center; padding:20px; color:#999;">Nenhuma reserva neste período</div>';
            } else {
                reservas.forEach(r => {
                    const hora = new Date(r.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    html += `<div class="reserva-item-modal">
                        <div class="reserva-info">
                            <strong>${r.nome}</strong>
                            <small>${r.numPessoas}p • ${hora}</small>
                        </div>
                        <button class="btn-edit-modal" onclick="abrirModalEditar(${r.id})">✏️</button>
                    </div>`;
                });
            }

            html += `<div class="modal-day-total">Total: ${resumo.total} pessoas</div>
            <button class="btn-print-period" onclick="imprimirPeriodo('${data}', '${periodo}')">🖨️ Imprimir</button>
            </div>`;

            modal.innerHTML = html;
        } catch (err) {
            console.error("❌ Erro ao carregar reservas:", err);
            modal.innerHTML = `<div class="modal-day-content"><p>Erro ao carregar reservas</p></div>`;
        }
    }

    async filtrarPeriodo(periodo, data) {
        document.querySelectorAll('.periodo-btn').forEach(b => b.classList.remove('active'));
        event.target.classList.add('active');
        
        const res = await fetch(
            `http://localhost:3001/api/calendar/reservas-dia?data=${data}&periodo=${periodo}`,
            { headers: { "Authorization": `Bearer ${this.token}` } }
        );
        const { reservas, resumo } = await res.json();

        let html = '';
        
        if (reservas.length === 0) {
            html += '<div style="text-align:center; padding:20px; color:#999;">Nenhuma reserva neste período</div>';
        } else {
            reservas.forEach(r => {
                const hora = new Date(r.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                html += `<div class="reserva-item-modal">
                    <div class="reserva-info">
                        <strong>${r.nome}</strong>
                        <small>${r.numPessoas}p • ${hora}</small>
                    </div>
                    <button class="btn-edit-modal" onclick="abrirModalEditar(${r.id})">✏️</button>
                </div>`;
            });
        }

        html += `<div class="modal-day-total">Total: ${resumo.total} pessoas</div>
        <button class="btn-print-period" onclick="imprimirPeriodo('${data}', '${periodo}')">🖨️ Imprimir</button>`;

        const modal = document.getElementById('modalDia');
        modal.innerHTML = `<div class="modal-day-content">
            <div class="modal-day-header">
                <h3>Reservas - ${new Date(data).toLocaleDateString('pt-BR')}</h3>
                <button class="close-btn" onclick="fecharModalDia()">×</button>
            </div>
            <div class="periodo-selector">
                <button class="periodo-btn ${periodo === 'todos' ? 'active' : ''}" data-periodo="todos" onclick="calendar.filtrarPeriodo('todos', '${data}')">Todos</button>
                <button class="periodo-btn ${periodo === 'almoco' ? 'active' : ''}" data-periodo="almoco" onclick="calendar.filtrarPeriodo('almoco', '${data}')">🌞 Almoço</button>
                <button class="periodo-btn ${periodo === 'jantar' ? 'active' : ''}" data-periodo="jantar" onclick="calendar.filtrarPeriodo('jantar', '${data}')">🌙 Jantar</button>
            </div>` + html + `</div>`;
    }
}

function fecharModalDia() {
    document.getElementById('modalDia').classList.remove('show');
}

function imprimirPeriodo(data, periodo) {
    const conteudo = document.querySelector('.modal-day-content').innerHTML;
    const w = window.open('', '', 'height=600,width=900');
    w.document.write(`<html><head><title>Imprimir - ${data}</title>
    <style>
        body { font-family: Arial; padding: 20px; }
        .modal-day-header, .periodo-selector, .btn-print-period { display: none; }
        .reserva-item-modal { padding: 10px; border: 1px solid #000; margin: 5px 0; }
        .modal-day-total { text-align: center; font-weight: bold; padding: 10px; border: 1px solid #000; }
    </style>
    </head><body>${conteudo}</body></html>`);
    w.document.close();
    w.print();
}

let calendar;