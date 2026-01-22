class Calendar {
    constructor(token) {
        this.token = token;
        this.currentDate = new Date();
        this.selectedDate = new Date().toISOString().split('T')[0];
        this.isCollapsed = false;
        this.init();
    }

    // Método seguro para pegar elementos e evitar o erro "null"
    getElement(id) {
        const el = document.getElementById(id);
        if (!el) console.warn(`Elemento #${id} não encontrado no DOM.`);
        return el;
    }

    init() {
        const prev = this.getElement('prevMonth');
        const next = this.getElement('nextMonth');
        const toggle = this.getElement('toggleCalendarBtn');

        if (prev) prev.onclick = () => this.changeMonth(-1);
        if (next) next.onclick = () => this.changeMonth(1);
        if (toggle) toggle.onclick = () => this.toggleCollapse();

        this.render();
    }

    toggleCollapse() {
        this.isCollapsed = !this.isCollapsed;
        const wrapper = this.getElement('calendarWrapper');
        const btn = this.getElement('toggleCalendarBtn');
        
        if (wrapper) wrapper.classList.toggle('collapsed');
        if (btn) {
            btn.innerHTML = this.isCollapsed 
                ? 'Exibir Calendário <i class="fas fa-chevron-down"></i>' 
                : 'Esconder Calendário <i class="fas fa-chevron-up"></i>';
        }
    }

    changeMonth(val) {
        this.currentDate.setMonth(this.currentDate.getMonth() + val);
        this.render();
    }

    async render() {
        const month = this.currentDate.getMonth() + 1;
        const year = this.currentDate.getFullYear();
        
        try {
            const res = await fetch(`http://localhost:3001/api/calendar/data?month=${month}&year=${year}`, {
                headers: { "Authorization": `Bearer ${this.token}` }
            });
            const { mapa, totalPax, totalRes } = await res.json();

            const monthName = this.currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            const titleEl = this.getElement('monthYear');
            const totalEl = this.getElement('totalMonth');

            if (titleEl) titleEl.textContent = monthName;
            if (totalEl) totalEl.innerHTML = `👥 Total Pax: ${totalPax} | 📋 Reservas: ${totalRes}`;

            this.renderGrid(mapa);
        } catch (err) {
            console.error("Erro ao carregar mapa:", err);
        }
    }

    renderGrid(mapa) {
        const grid = this.getElement('calendarGrid');
        if (!grid) return;
        grid.innerHTML = '';
        
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1).getDay();
        const daysInMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0).getDate();

        // 1. Adiciona Cabeçalhos (Dom, Seg...)
        ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].forEach(d => {
            const h = document.createElement('div');
            h.className = 'day-header';
            h.textContent = d;
            grid.appendChild(h);
        });

        // 2. Adiciona Dias vazios do mês anterior
        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'day-cell empty';
            grid.appendChild(empty);
        }

        const hoje = new Date().toISOString().split('T')[0];

        // 3. Adiciona os dias do mês
        for (let day = 1; day <= daysInMonth; day++) {
            const dataISO = `${this.currentDate.getFullYear()}-${String(this.currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dados = mapa[dataISO] || { almoco: 0, jantar: 0 };
            
            const cell = document.createElement('div');
            cell.className = `day-cell ${dataISO === hoje ? 'today' : ''} ${dataISO === this.selectedDate ? 'selected' : ''}`;
            cell.dataset.data = dataISO;
            
            cell.innerHTML = `
                <div class="day-num">${day}</div>
                <div class="pill-container">
                    ${dados.almoco > 0 ? `<div class="pill pill-a">A: ${dados.almoco}</div>` : ''}
                    ${dados.jantar > 0 ? `<div class="pill pill-j">J: ${dados.jantar}</div>` : ''}
                </div>
            `;

            cell.onclick = () => this.selecionarData(dataISO);
            grid.appendChild(cell);
        }
    }

    selecionarData(data) {
    this.selectedDate = data;
    
    // Sincroniza o input de data
    const input = document.getElementById('filterStartDate');
    if (input) input.value = data;

    // Força a limpeza visual de seleções anteriores
    document.querySelectorAll('.day-cell').forEach(el => el.classList.remove('selected'));
    const target = document.querySelector(`.day-cell[data-data="${data}"]`);
    if (target) target.classList.add('selected');

    this.render(); // Re-renderiza o calendário para aplicar classes
    window.carregarReservas(); // Chama a query atualizada
}
}