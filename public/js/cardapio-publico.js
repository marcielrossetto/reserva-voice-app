/**
 * cardapio-publico.js
 * Renderiza o cardápio digital público (sem autenticação)
 * Extrai empresaId da URL: /cardapio/:empresaId
 */

(function () {
    let dadosEmpresa = null;
    let dadosCardapios = [];

    // ─── INIT ──────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', carregarCardapio);

    async function carregarCardapio() {
        const empresaId = extrairEmpresaId();
        if (!empresaId) {
            mostrarErro('Cardápio não encontrado');
            return;
        }

        try {
            const res = await fetch(`/api/cardapio/publico/${empresaId}`);
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.erro || 'Erro ao carregar');
            }

            dadosEmpresa = data.empresa;
            dadosCardapios = data.cardapios || [];

            renderHeader();
            renderTabs();
            renderContent();

        } catch (e) {
            console.error('Erro:', e);
            mostrarErro('Não foi possível carregar o cardápio');
        }
    }

    function extrairEmpresaId() {
        // URL: /cardapio/10 → empresaId = 10
        const parts = window.location.pathname.split('/');
        const idx = parts.indexOf('cardapio');
        if (idx >= 0 && parts[idx + 1]) {
            return parseInt(parts[idx + 1]);
        }
        return null;
    }

    // ─── HEADER ────────────────────────────────────────────
    function renderHeader() {
        document.getElementById('nomeEmpresa').textContent = dadosEmpresa.nomeEmpresa || 'Restaurante';
        document.title = `Cardápio - ${dadosEmpresa.nomeEmpresa || 'Digital'}`;

        if (dadosEmpresa.logoCaminho) {
            document.getElementById('logoPub').src = dadosEmpresa.logoCaminho;
            document.getElementById('logoPubArea').style.display = 'flex';
        }
    }

    // ─── TABS ──────────────────────────────────────────────
    function renderTabs() {
        const container = document.getElementById('tabsScroll');
        const tabsWrapper = document.getElementById('tabsContainer');

        if (dadosCardapios.length <= 1) {
            tabsWrapper.style.display = 'none';
            return;
        }

        tabsWrapper.style.display = 'block';
        container.innerHTML = dadosCardapios.map((card, i) =>
            `<button class="tab-btn ${i === 0 ? 'active' : ''}" data-tab="${card.id}" onclick="trocarTab(${card.id})">
                ${esc(card.nome)}
            </button>`
        ).join('');
    }

    // ─── CONTEÚDO ──────────────────────────────────────────
    function renderContent() {
        const content = document.getElementById('cardapioContent');

        if (!dadosCardapios.length) {
            content.innerHTML = `
                <div class="error-pub">
                    <i class="fas fa-utensils"></i>
                    <p>Cardápio em preparação</p>
                </div>`;
            return;
        }

        content.innerHTML = dadosCardapios.map((card, i) =>
            `<div class="tab-panel ${i === 0 ? 'active' : ''}" id="panel-${card.id}">
                ${renderCategoriasPublico(card.categorias)}
            </div>`
        ).join('');
    }

    function renderCategoriasPublico(categorias) {
        if (!categorias || !categorias.length) {
            return '<div class="text-center text-muted py-4">Sem itens disponíveis</div>';
        }

        return categorias.map(cat => {
            if (!cat.produtos || !cat.produtos.length) return '';

            const layout = cat.layoutTipo || 'vinho';
            const gridClass = `grid-${layout}`;

            return `
                <div class="cat-section">
                    <div class="cat-title">${esc(cat.nome)}</div>
                    <div class="prod-grid ${gridClass}">
                        ${cat.produtos.map(prod => renderProdutoPublico(prod, layout)).join('')}
                    </div>
                </div>`;
        }).join('');
    }

    function renderProdutoPublico(prod, layout) {
        const imgTag = prod.fotoCaminho
            ? `<img src="${prod.fotoCaminho}" alt="${esc(prod.nome)}" class="card-img" loading="lazy">`
            : `<div class="card-no-img"><i class="fas fa-utensils"></i></div>`;

        const dataAttrs = `data-nome="${esc(prod.nome)}" data-desc="${esc(prod.descricao || '')}" data-preco="${prod.preco}" data-foto="${prod.fotoCaminho || ''}" data-pais="${esc(prod.origemPais || '')}" data-uva="${esc(prod.tipoUva || '')}" data-dose="${esc(prod.tamanhoDose || '')}"`;

        if (layout === 'texto') {
            return `
                <div class="card-texto" onclick="abrirZoom(this)" ${dataAttrs}>
                    <span class="card-nome">${esc(prod.nome)}</span>
                    <span class="card-dots"></span>
                    <span class="card-preco">${formatPreco(prod.preco)}</span>
                </div>`;
        }

        if (layout === 'bebidas') {
            return `
                <div class="card-bebidas" onclick="abrirZoom(this)" ${dataAttrs}>
                    ${imgTag}
                    <div class="card-body">
                        <div class="card-nome">${esc(prod.nome)}</div>
                        ${prod.descricao ? `<div class="card-desc">${esc(prod.descricao)}</div>` : ''}
                        <div class="card-preco">${formatPreco(prod.preco)}</div>
                    </div>
                </div>`;
        }

        if (layout === 'sobremesa') {
            return `
                <div class="card-sobremesa" onclick="abrirZoom(this)" ${dataAttrs}>
                    ${imgTag}
                    <div class="card-body">
                        <div class="card-nome">${esc(prod.nome)}</div>
                        <div class="card-preco">${formatPreco(prod.preco)}</div>
                    </div>
                </div>`;
        }

        // Default: vinho
        return `
            <div class="card-vinho" onclick="abrirZoom(this)" ${dataAttrs}>
                ${imgTag}
                <div class="card-body">
                    <div class="card-nome">${esc(prod.nome)}</div>
                    ${prod.descricao ? `<div class="card-desc">${esc(prod.descricao)}</div>` : ''}
                    <div class="card-preco">${formatPreco(prod.preco)}</div>
                    <div class="card-badges">
                        ${prod.origemPais ? `<span><i class="fas fa-globe-americas"></i> ${esc(prod.origemPais)}</span>` : ''}
                        ${prod.tipoUva ? `<span><i class="fas fa-wine-glass-alt"></i> ${esc(prod.tipoUva)}</span>` : ''}
                        ${prod.tamanhoDose ? `<span>${esc(prod.tamanhoDose)}</span>` : ''}
                    </div>
                </div>
            </div>`;
    }

    // ─── TABS SWITCH ───────────────────────────────────────
    globalThis.trocarTab = (cardapioId) => {
        // Atualizar tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.tab) === cardapioId);
        });

        // Atualizar panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `panel-${cardapioId}`);
        });

        // Scroll pro topo do conteúdo
        document.getElementById('cardapioContent').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // ─── ZOOM MODAL ────────────────────────────────────────
    globalThis.abrirZoom = (el) => {
        const overlay = document.getElementById('zoomOverlay');
        const nome = el.dataset.nome;
        const desc = el.dataset.desc;
        const preco = el.dataset.preco;
        const foto = el.dataset.foto;
        const pais = el.dataset.pais;
        const uva = el.dataset.uva;
        const dose = el.dataset.dose;

        document.getElementById('zoomNome').textContent = nome;
        document.getElementById('zoomDesc').textContent = desc || '';
        document.getElementById('zoomDesc').style.display = desc ? 'block' : 'none';
        document.getElementById('zoomPreco').textContent = formatPreco(preco);

        const zoomImg = document.getElementById('zoomImg');
        if (foto) {
            zoomImg.src = foto;
            zoomImg.style.display = 'block';
        } else {
            zoomImg.style.display = 'none';
        }

        // Badges
        const badges = document.getElementById('zoomBadges');
        let badgesHtml = '';
        if (pais) badgesHtml += `<span><i class="fas fa-globe-americas"></i> ${pais}</span>`;
        if (uva) badgesHtml += `<span><i class="fas fa-wine-glass-alt"></i> ${uva}</span>`;
        if (dose) badgesHtml += `<span>${dose}</span>`;
        badges.innerHTML = badgesHtml;
        badges.style.display = badgesHtml ? 'flex' : 'none';

        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    globalThis.fecharZoom = (event) => {
        if (event && event.target !== event.currentTarget && !event.target.closest('.zoom-close')) return;
        document.getElementById('zoomOverlay').classList.remove('active');
        document.body.style.overflow = '';
    };

    // Fechar com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') fecharZoom();
    });

    // ─── HELPERS ───────────────────────────────────────────
    function esc(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatPreco(valor) {
        const num = parseFloat(valor) || 0;
        return `R$ ${num.toFixed(2).replace('.', ',')}`;
    }

    function mostrarErro(msg) {
        document.getElementById('cardapioContent').innerHTML = `
            <div class="error-pub">
                <i class="fas fa-exclamation-circle"></i>
                <p>${msg}</p>
            </div>`;
        document.getElementById('nomeEmpresa').textContent = 'Cardápio';
    }

})();
