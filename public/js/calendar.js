class Calendar {
    constructor(token) {
        this.token = token;
        this.currentDate = new Date();
        this.selectedDate = new Date().toISOString().split('T')[0];
        this.init();
    }

    init() {
        document.getElementById('prevMonth').onclick = () => { this.currentDate.setMonth(this.currentDate.getMonth() - 1); this.render(); };
        document.getElementById('nextMonth').onclick = () => { this.currentDate.setMonth(this.currentDate.getMonth() + 1); this.render(); };
        document.getElementById('toggleCalendarBtn').onclick = () => document.getElementById('calendarWrapper').classList.toggle('collapsed');
        this.render();
    }

    async render() {
        const month = this.currentDate.getMonth() + 1;
        const year = this.currentDate.getFullYear();
        try {
            const res = await fetch(`/api/calendar/data?month=${month}&year=${year}`, {
                headers: { "Authorization": `Bearer ${this.token}` }
            });
            const { mapa, totalPax, totalRes } = await res.json();
            document.getElementById('monthYear').textContent = this.currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            document.getElementById('totalMonth').innerHTML = `👥 Pax: ${totalPax} | 📋 Res: ${totalRes}`;
            this.renderGrid(mapa);
        } catch (e) { console.error(e); }
    }

    renderGrid(mapa) {
        const grid = document.getElementById('calendarGrid');
        grid.innerHTML = '';
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1).getDay();
        const daysInMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0).getDate();

        ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].forEach(d => grid.innerHTML += `<div class="day-header">${d}</div>`);
        for (let i = 0; i < firstDay; i++) grid.innerHTML += '<div class="day-cell empty"></div>';

        for (let day = 1; day <= daysInMonth; day++) {
            const dataISO = `${this.currentDate.getFullYear()}-${String(this.currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dados = mapa[dataISO] || { almoco: 0, jantar: 0 };
            const cell = document.createElement('div');
            cell.className = `day-cell ${dataISO === this.selectedDate ? 'selected' : ''}`;
            cell.innerHTML = `
                <div class="day-num">${day}</div>
                <div class="pill-container">
                    ${dados.almoco > 0 ? `<div class="pill pill-a" style="background:#f1c40f; color:#000; font-size:10px; padding:2px; border-radius:3px;">A: ${dados.almoco}</div>` : ''}
                    ${dados.jantar > 0 ? `<div class="pill pill-j" style="background:#3699ff; color:#fff; font-size:10px; padding:2px; border-radius:3px;">J: ${dados.jantar}</div>` : ''}
                </div>`;
            cell.onclick = () => this.selecionarData(dataISO);
            grid.appendChild(cell);
        }
    }

    selecionarData(data) {
        this.selectedDate = data;
        document.getElementById('filterStartDate').value = data;
        document.querySelectorAll('.day-cell').forEach(el => el.classList.remove('selected'));
        document.querySelector(`[data-data="${data}"]`)?.classList.add('selected');
        globalThis.carregarReservas();
    }
}