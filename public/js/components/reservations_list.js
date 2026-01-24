/**
 * js/components/reservations_list.js
 * Listagem de Reservas - Igual ao PHP
 */

class ReservationsList {
    constructor() {
        this.currentDate = new Date().toISOString().split('T')[0];
        this.currentPeriod = 'todos';
        this.filterName = '';
        this.filterCancelled = false;
        this.token = localStorage.getItem('token');
    }

    /**
     * Inicializar
     */
    async init() {
        console.log('✓ ReservationsList iniciando...');
        document.addEventListener('click', (e) => this.handleClickFora(e));
        await this.load();
    }

    /**
     * Carregar reservas da API
     */
    async load(date = null, period = null, name = '') {
        try {
            if (date) this.currentDate = date;
            if (period) this.currentPeriod = period;
            if (name !== undefined) this.filterName = name;

            const params = new URLSearchParams({
                date: this.currentDate,
                periodo: this.currentPeriod,
                nome: this.filterName,
                canceladas: this.filterCancelled
            });

            const res = await fetch(`/api/reservations?${params}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!res.ok) throw new Error(`Erro: ${res.status}`);

            const result = await res.json();

            if (result.success && result.reservas) {
                this.render(result.reservas, result.stats);
            } else {
                this.renderEmpty();
            }
        } catch (err) {
            console.error('❌ Erro ao carregar reservas:', err);
            this.renderEmpty();
        }
    }

    /**
     * Renderizar listagem
     */
    render(reservas, stats) {
        const container = document.getElementById('reservasListContent');
        if (!container) {
            console.warn('⚠ Container não encontrado, tentando novamente...');
            setTimeout(() => this.render(reservas, stats), 200);
            return;
        }

        const dataBr = new Date(this.currentDate).toLocaleDateString('pt-BR');
        const periodTitle = this.getPeriodTitle();

        // Atualizar header
        const headerDate = document.getElementById('statsDateDisplay');
        const headerPeriod = document.getElementById('statsPeriodDisplay');
        const headerTotal = document.getElementById('statsTotalActive');

        if (headerDate) headerDate.textContent = dataBr;
        if (headerPeriod) headerPeriod.textContent = periodTitle;
        if (headerTotal) headerTotal.textContent = stats.totalPessoas || 0;

        // Renderizar cards
        if (reservas.length === 0) {
            container.innerHTML = '<div class="text-center py-4 text-muted">Nenhuma reserva encontrada.</div>';
            return;
        }

        const html = reservas.map(r => this.renderCard(r)).join('');
        container.innerHTML = html;

        // Preparar tabela de impressão
        this.preparePrint(reservas, dataBr, periodTitle);

        // Inicializar menus
        this.initMenus();
    }

    /**
     * Renderizar um card de reserva
     */
    renderCard(r) {
        const isCancelado = r.status === 0;
        const isConfirmado = r.confirmado === 1 || r.confirmado === true;

        let classeBorda, textoBadge, classBadge;

        if (isCancelado) {
            classeBorda = 'status-cancelado';
            textoBadge = 'Cancelado';
            classBadge = 'badge-cancel';
        } else {
            classeBorda = isConfirmado ? 'status-confirmado' : 'status-pendente';
            textoBadge = isConfirmado ? 'Confirmado' : 'Pendente';
            classBadge = isConfirmado ? 'badge-ok' : 'badge-wait';
        }

        const horaShort = String(r.horario).substring(0, 5);
        const nome = this.capitalize(r.nome);
        const nomeSafe = this.escapeHtml(nome);
        const telLimpo = String(r.telefone).replace(/\D/g, '');
        const linkZapDireto = `https://wa.me/55${telLimpo}`;
        const msgZap = `Olá ${nome}! Confirmando reserva para dia ${new Date(r.data).toLocaleDateString('pt-BR')} às ${horaShort} para ${r.numPessoas} pessoas.`;
        const linkZapComMsg = `https://wa.me/55${telLimpo}?text=${encodeURIComponent(msgZap)}`;
        const obsTexto = r.observacoes
            ? this.escapeHtml(r.observacoes)
            : '<span class="text-muted small" style="font-style:italic">...</span>';

        return `
            <div class="reserva-card ${classeBorda}" id="card-${r.id}">
                <span class="badge-id-corner">${r.id}</span>
                <div class="card-content-wrapper">
                    <span class="badge-status ${classBadge}">${textoBadge}</span>

                    <!-- INFO -->
                    <div class="sec-info">
                        <div class="client-name" style="${isCancelado ? 'text-decoration: line-through; color: #999;' : ''}">
                            ${this.escapeHtml(nome)}
                        </div>
                        <span class="btn-perfil" onclick="reservationsList.openProfile('${telLimpo}')">
                            <i class="fas fa-history"></i>
                            <span class="d-none d-md-inline">Histórico</span>
                        </span>
                    </div>

                    <!-- META -->
                    <div class="sec-meta-group">
                        <div class="meta-item meta-pax">
                            <span class="pax-val" style="${isCancelado ? 'color: #999;' : ''}">${r.numPessoas}</span>
                            <span class="pax-lbl">Pax</span>
                        </div>
                        <div class="meta-item meta-time">
                            <span class="time-val" style="${isCancelado ? 'color: #999;' : ''}">${horaShort}</span>
                            ${r.numMesa ? `<span class="mesa-val">M:${r.numMesa}</span>` : ''}
                        </div>
                    </div>

                    <!-- OBS -->
                    <div class="sec-obs-container">
                        <div class="obs-box">${obsTexto}</div>
                    </div>
                </div>

                <!-- BOTÃO AÇÕES -->
                <button class="btn-actions-ios" onclick="reservationsList.toggleMenu(${r.id})">
                    <i class="fas fa-ellipsis-v"></i>
                </button>

                <!-- MENU iOS -->
                <div class="ios-menu" id="ios-menu-${r.id}">
                    <button class="ios-action text-success" 
                        onclick="reservationsList.openWhatsApp(${r.id}, '${this.escapeHtml(linkZapComMsg)}', '${this.escapeHtml(linkZapDireto)}')" 
                        title="WhatsApp">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                    <button type="button" class="ios-action text-primary" 
                        onclick="reservationsList.openEdit(${r.id})" 
                        title="Editar">
                        <i class="fas fa-pen"></i>
                    </button>
                    ${isCancelado
                        ? `<button class="ios-action text-success" 
                            onclick="reservationsList.activate(${r.id}, '${nomeSafe}')" 
                            title="Reativar">
                            <i class="fas fa-check-circle"></i>
                        </button>`
                        : `<button class="ios-action text-danger" 
                            onclick="reservationsList.cancel(${r.id}, '${nomeSafe}')" 
                            title="Cancelar">
                            <i class="fas fa-trash"></i>
                        </button>`
                    }
                </div>
            </div>
        `;
    }

    /**
     * Renderizar vazio
     */
    renderEmpty() {
        const container = document.getElementById('reservasListContent');
        if (!container) {
            console.warn('⚠ Container reservasListContent não encontrado ainda');
            return;
        }
        container.innerHTML =
            '<div class="text-center py-4 text-muted">Nenhuma reserva encontrada.</div>';
    }

    /**
     * AÇÕES
     */

    toggleMenu(id) {
        event.stopPropagation();
        const menu = document.getElementById(`ios-menu-${id}`);
        
        // Fechar outros
        document.querySelectorAll('.ios-menu.show').forEach(m => {
            if (m.id !== `ios-menu-${id}`) m.classList.remove('show');
        });
        
        // Toggle atual
        menu.classList.toggle('show');
    }

    handleClickFora(e) {
        if (!e.target.closest('.btn-actions-ios') && !e.target.closest('.ios-menu')) {
            document.querySelectorAll('.ios-menu.show').forEach(m => m.classList.remove('show'));
        }
    }

    async openWhatsApp(id, linkMsg, linkDireto) {
        event?.stopPropagation();
        
        // Simular modal WhatsApp
        const choice = confirm('Deseja confirmar a reserva ao enviar o WhatsApp?');
        
        if (choice) {
            // Abrir WhatsApp com mensagem
            window.open(linkMsg, '_blank');
            
            // Confirmar reserva
            try {
                await fetch(`/api/reservations/${id}/confirmar`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${this.token}` }
                });
                this.load();
            } catch (err) {
                console.error('Erro ao confirmar:', err);
            }
        } else {
            // Apenas abrir WhatsApp
            window.open(linkDireto, '_blank');
        }
    }

    async openEdit(id) {
        event?.stopPropagation();
        
        try {
            const res = await fetch(`/api/reservations/${id}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await res.json();
            
            if (data.reserva && globalThis.abrirModalEditar) {
                globalThis.abrirModalEditar(id, data.reserva);
            }
        } catch (err) {
            console.error('Erro ao abrir editar:', err);
        }
    }

    async openProfile(phone) {
        event?.stopPropagation();
        
        try {
            const res = await fetch(`/api/reservations/profile/${phone}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const profile = await res.json();
            
            if (profile.found && globalThis.abrirModalPerfil) {
                globalThis.abrirModalPerfil(phone);
            }
        } catch (err) {
            console.error('Erro ao abrir perfil:', err);
        }
    }

    async activate(id, name) {
        event?.stopPropagation();
        
        if (!confirm(`Reativar reserva de ${name}?`)) return;
        
        try {
            await fetch(`/api/reservations/${id}/ativar`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            this.load();
        } catch (err) {
            console.error('Erro ao ativar:', err);
        }
    }

    async cancel(id, name) {
        event?.stopPropagation();
        
        if (!confirm(`Cancelar reserva de ${name}?`)) return;
        
        try {
            await fetch(`/api/reservations/${id}/cancelar`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            this.load();
        } catch (err) {
            console.error('Erro ao cancelar:', err);
        }
    }

    /**
     * HELPERS
     */

    getPeriodTitle() {
        const titles = {
            'todos': 'Dia Completo',
            'almoco': 'Almoço',
            'jantar': 'Jantar'
        };
        return titles[this.currentPeriod] || 'Dia Completo';
    }

    capitalize(str) {
        return String(str || '')
            .toLowerCase()
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text || '').replace(/[&<>"']/g, m => map[m]);
    }

    preparePrint(reservas, dataBr, periodTitle) {
        const printDate = document.getElementById('printHeaderDate');
        const tbody = document.getElementById('printTableBody');
        
        if (printDate) {
            const [dia, mes, ano] = dataBr.split('/');
            printDate.textContent = `${dia}/${mes}/${ano} | ${periodTitle}`;
        }

        if (tbody) {
            tbody.innerHTML = reservas
                .filter(r => r.status !== 0)
                .map(r => `
                    <tr>
                        <td style="border:1px solid #000;padding:4px;">${r.id}</td>
                        <td style="border:1px solid #000;padding:4px;">${this.escapeHtml(r.nome)}</td>
                        <td style="border:1px solid #000;padding:4px; text-align:center;">${r.numPessoas}</td>
                        <td style="border:1px solid #000;padding:4px; text-align:center;">${String(r.horario).substring(0, 5)}</td>
                        <td style="border:1px solid #000;padding:4px;">${this.escapeHtml(r.observacoes || '')}</td>
                        <td style="border:1px solid #000;padding:4px; text-align:center;">${this.escapeHtml(r.numMesa || '')}</td>
                    </tr>
                `)
                .join('');
        }
    }

    initMenus() {
        document.querySelectorAll('.ios-menu').forEach(menu => {
            menu.classList.remove('show');
        });
    }
}

// Instância global
const reservationsList = new ReservationsList();

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    reservationsList.init();
});