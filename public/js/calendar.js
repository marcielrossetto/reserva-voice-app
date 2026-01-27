/**
 * CALENDAR.JS - Calendário com reservas
 */

let calendar = null;

class Calendar {
    constructor(token) {
        this.token = token;
        this.currentDate = new Date();
        this.selectedDate = new Date().toISOString().split('T')[0];
        this.init();
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

        this.render();
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

        // Carregar reservas do dia - CHAMADA DIRETA
        console.log("📍 Chamando loadReservations()...");
        loadReservations();
    }
}

// Inicializar calendário quando DOM estiver pronto
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 DOM ready - Inicializando calendário");
    calendar = new Calendar(token);
});