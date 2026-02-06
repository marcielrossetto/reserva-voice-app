/**
 * configCardapio.js - CRUD completo do cardápio digital
 * Gestão de menus, categorias e produtos com upload de imagem
 */

(function () {
    const API = '/api/cardapio';
    const TOKEN = localStorage.getItem('token');
    const EMPRESA_ID = localStorage.getItem('empresaId');
    const HEADERS = { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

    let dadosCardapios = []; // cache local

    // ─── INIT ──────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        carregarCardapios();
        configurarQrLink();
    });

    function configurarQrLink() {
        const link = document.getElementById('btnQrLink');
        if (link && EMPRESA_ID) {
            link.href = `/cardapio/${EMPRESA_ID}`;
        }
    }

    // ─── TOAST ─────────────────────────────────────────────
    function mostrarToast(msg, tipo = 'success') {
        const el = document.getElementById('toastCardapio');
        const icon = document.getElementById('toastIcon');
        const texto = document.getElementById('toastMsg');
        texto.textContent = msg;
        icon.className = tipo === 'success'
            ? 'fas fa-check-circle text-success'
            : 'fas fa-exclamation-circle text-danger';
        const toast = bootstrap.Toast.getOrCreateInstance(el, { delay: 3000 });
        toast.show();
    }

    // ─── FETCH HELPER ──────────────────────────────────────
    async function apiFetch(url, opts = {}) {
        try {
            const res = await fetch(url, {
                ...opts,
                headers: opts.body instanceof FormData
                    ? { 'Authorization': `Bearer ${TOKEN}` }
                    : HEADERS
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.erro || 'Erro na requisição');
            return data;
        } catch (e) {
            mostrarToast(e.message, 'error');
            throw e;
        }
    }

    // ═══════════════════════════════════════════════════════
    // CARREGAR E RENDERIZAR
    // ═══════════════════════════════════════════════════════

    async function carregarCardapios() {
        try {
            const data = await apiFetch(`${API}/listar`);
            dadosCardapios = data.cardapios || [];
            renderCardapios();
        } catch (e) {
            document.getElementById('listaCardapios').innerHTML =
                '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Erro ao carregar cardápio</p></div>';
        }
    }

    function renderCardapios() {
        const container = document.getElementById('listaCardapios');

        if (!dadosCardapios.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-utensils"></i>
                    <p>Nenhum cardápio criado ainda</p>
                    <button class="btn btn-primary btn-sm" onclick="abrirModalCardapio()">
                        <i class="fas fa-plus"></i> Criar Primeiro Cardápio
                    </button>
                </div>`;
            return;
        }

        container.innerHTML = dadosCardapios.map(card => `
            <div class="cardapio-card" data-cardapio-id="${card.id}" draggable="true">
                <div class="cardapio-card-header" onclick="toggleCardapio(${card.id})">
                    <h6>
                        <i class="fas fa-book-open"></i> ${esc(card.nome)}
                        <span class="badge ${card.status ? 'status-active' : 'status-inactive'}">
                            ${card.status ? 'Ativo' : 'Inativo'}
                        </span>
                        <span class="badge bg-light text-dark">${contarProdutos(card)} itens</span>
                    </h6>
                    <div class="cardapio-header-actions">
                        <button class="btn" title="Editar" onclick="event.stopPropagation(); editarCardapio(${card.id})">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="btn" title="Nova Categoria" onclick="event.stopPropagation(); abrirModalCategoria(${card.id})">
                            <i class="fas fa-layer-group"></i>
                        </button>
                        <button class="btn" title="Excluir" onclick="event.stopPropagation(); excluirCardapio(${card.id}, '${esc(card.nome)}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="cardapio-card-body" id="body-${card.id}">
                    ${renderCategorias(card)}
                </div>
            </div>
        `).join('');

        // Drag & drop
        initDragDrop();
    }

    function renderCategorias(cardapio) {
        if (!cardapio.categorias || !cardapio.categorias.length) {
            return '<div class="text-center text-muted py-3" style="font-size:13px">Nenhuma categoria — clique em <i class="fas fa-layer-group"></i> para criar</div>';
        }

        return cardapio.categorias.map(cat => `
            <div class="categoria-block layout-${cat.layoutTipo}" data-categoria-id="${cat.id}">
                <div class="categoria-header">
                    <h6>
                        ${esc(cat.nome)}
                        <span class="layout-badge">${cat.layoutTipo}</span>
                        ${!cat.status ? '<span class="badge bg-secondary">Inativo</span>' : ''}
                    </h6>
                    <div class="categoria-actions">
                        <button class="btn btn-outline-primary btn-sm" title="Novo Produto" onclick="abrirModalProduto(${cat.id})">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn btn-outline-secondary btn-sm" title="Editar" onclick="editarCategoria(${cat.id})">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" title="Excluir" onclick="excluirCategoria(${cat.id}, '${esc(cat.nome)}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="produtos-grid">
                    ${renderProdutos(cat)}
                </div>
            </div>
        `).join('');
    }

    function renderProdutos(categoria) {
        if (!categoria.produtos || !categoria.produtos.length) {
            return '<div class="text-center text-muted py-3" style="font-size:12px">Nenhum produto</div>';
        }

        const layout = categoria.layoutTipo || 'vinho';

        return categoria.produtos.map(prod => {
            const pausadoClass = prod.status ? '' : 'pausado';
            const imgTag = prod.fotoCaminho
                ? `<img src="${prod.fotoCaminho}" alt="${esc(prod.nome)}" class="produto-img" loading="lazy">`
                : `<div class="produto-no-img"><i class="fas fa-image"></i></div>`;

            const overlay = `
                <div class="produto-overlay">
                    <button class="btn btn-editar" title="Editar" onclick="editarProduto(${prod.id})"><i class="fas fa-pen"></i></button>
                    <button class="btn btn-duplicar" title="Duplicar" onclick="duplicarProduto(${prod.id})"><i class="fas fa-copy"></i></button>
                    <button class="btn btn-pausar" title="${prod.status ? 'Pausar' : 'Ativar'}" onclick="toggleStatusProduto(${prod.id}, ${!prod.status})">
                        <i class="fas fa-${prod.status ? 'pause' : 'play'}"></i>
                    </button>
                    <button class="btn btn-excluir" title="Excluir" onclick="excluirProduto(${prod.id}, '${esc(prod.nome)}')"><i class="fas fa-trash"></i></button>
                </div>`;

            if (layout === 'texto') {
                return `
                    <div class="produto-card produto-card-texto ${pausadoClass}">
                        <span class="produto-nome">${esc(prod.nome)}</span>
                        <span class="produto-dots"></span>
                        <span class="produto-preco">${formatPreco(prod.preco)}</span>
                        ${overlay}
                    </div>`;
            }

            if (layout === 'bebidas') {
                return `
                    <div class="produto-card produto-card-horizontal ${pausadoClass}">
                        ${imgTag}
                        <div class="produto-info">
                            <div class="produto-nome">${esc(prod.nome)}</div>
                            ${prod.descricao ? `<div class="produto-desc">${esc(prod.descricao)}</div>` : ''}
                            <div class="produto-preco">${formatPreco(prod.preco)}</div>
                        </div>
                        ${overlay}
                    </div>`;
            }

            if (layout === 'sobremesa') {
                return `
                    <div class="produto-card produto-card-compact ${pausadoClass}">
                        ${imgTag}
                        <div class="produto-info">
                            <div class="produto-nome">${esc(prod.nome)}</div>
                            <div class="produto-preco">${formatPreco(prod.preco)}</div>
                        </div>
                        ${overlay}
                    </div>`;
            }

            // Default: vinho (vertical)
            return `
                <div class="produto-card produto-card-vertical ${pausadoClass}">
                    ${imgTag}
                    <div class="produto-info">
                        <div class="produto-nome">${esc(prod.nome)}</div>
                        ${prod.descricao ? `<div class="produto-desc">${esc(prod.descricao)}</div>` : ''}
                        <div class="produto-preco">${formatPreco(prod.preco)}</div>
                        <div class="produto-badges">
                            ${prod.origemPais ? `<span><i class="fas fa-globe"></i> ${esc(prod.origemPais)}</span>` : ''}
                            ${prod.tipoUva ? `<span><i class="fas fa-wine-glass"></i> ${esc(prod.tipoUva)}</span>` : ''}
                            ${prod.tamanhoDose ? `<span>${esc(prod.tamanhoDose)}</span>` : ''}
                        </div>
                    </div>
                    ${overlay}
                </div>`;
        }).join('');
    }

    // ═══════════════════════════════════════════════════════
    // CARDÁPIO CRUD
    // ═══════════════════════════════════════════════════════

    globalThis.abrirModalCardapio = (editId) => {
        document.getElementById('cardapioEditId').value = '';
        document.getElementById('cardapioNome').value = '';
        document.getElementById('modalCardapioTitulo').textContent = 'Novo Cardápio';
        new bootstrap.Modal(document.getElementById('modalCardapio')).show();
    };

    globalThis.editarCardapio = (id) => {
        const card = dadosCardapios.find(c => c.id === id);
        if (!card) return;
        document.getElementById('cardapioEditId').value = id;
        document.getElementById('cardapioNome').value = card.nome;
        document.getElementById('modalCardapioTitulo').textContent = 'Editar Cardápio';
        new bootstrap.Modal(document.getElementById('modalCardapio')).show();
    };

    globalThis.salvarCardapio = async () => {
        const id = document.getElementById('cardapioEditId').value;
        const nome = document.getElementById('cardapioNome').value.trim();
        if (!nome) return mostrarToast('Nome é obrigatório', 'error');

        try {
            if (id) {
                await apiFetch(`${API}/cardapio/${id}`, { method: 'PUT', body: JSON.stringify({ nome }) });
                mostrarToast('Cardápio atualizado!');
            } else {
                await apiFetch(`${API}/cardapio`, { method: 'POST', body: JSON.stringify({ nome }) });
                mostrarToast('Cardápio criado!');
            }
            bootstrap.Modal.getInstance(document.getElementById('modalCardapio'))?.hide();
            await carregarCardapios();
        } catch (e) { /* toast já mostrado */ }
    };

    globalThis.excluirCardapio = async (id, nome) => {
        if (!confirm(`Excluir cardápio "${nome}" e todos seus itens?`)) return;
        try {
            await apiFetch(`${API}/cardapio/${id}`, { method: 'DELETE' });
            mostrarToast('Cardápio excluído!');
            await carregarCardapios();
        } catch (e) { /* toast já mostrado */ }
    };

    globalThis.toggleCardapio = (id) => {
        const body = document.getElementById(`body-${id}`);
        if (body) body.classList.toggle('collapsed');
    };

    // ═══════════════════════════════════════════════════════
    // CATEGORIA CRUD
    // ═══════════════════════════════════════════════════════

    globalThis.abrirModalCategoria = (preselectedCardapioId) => {
        document.getElementById('categoriaEditId').value = '';
        document.getElementById('categoriaNome').value = '';
        document.getElementById('categoriaLayout').value = 'vinho';
        document.getElementById('modalCategoriaTitulo').textContent = 'Nova Categoria';

        // Popular select de cardápios
        const select = document.getElementById('categoriaCardapioId');
        select.innerHTML = '<option value="">Selecione o cardápio...</option>' +
            dadosCardapios.map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');

        if (preselectedCardapioId) select.value = preselectedCardapioId;

        new bootstrap.Modal(document.getElementById('modalCategoria')).show();
    };

    globalThis.editarCategoria = (id) => {
        let cat = null, parentId = null;
        for (const card of dadosCardapios) {
            const found = card.categorias?.find(c => c.id === id);
            if (found) { cat = found; parentId = card.id; break; }
        }
        if (!cat) return;

        document.getElementById('categoriaEditId').value = id;
        document.getElementById('categoriaNome').value = cat.nome;
        document.getElementById('categoriaLayout').value = cat.layoutTipo;
        document.getElementById('modalCategoriaTitulo').textContent = 'Editar Categoria';

        const select = document.getElementById('categoriaCardapioId');
        select.innerHTML = dadosCardapios.map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
        select.value = parentId;

        new bootstrap.Modal(document.getElementById('modalCategoria')).show();
    };

    globalThis.salvarCategoria = async () => {
        const id = document.getElementById('categoriaEditId').value;
        const cardapioId = document.getElementById('categoriaCardapioId').value;
        const nome = document.getElementById('categoriaNome').value.trim();
        const layoutTipo = document.getElementById('categoriaLayout').value;

        if (!nome) return mostrarToast('Nome é obrigatório', 'error');
        if (!id && !cardapioId) return mostrarToast('Selecione um cardápio', 'error');

        try {
            if (id) {
                await apiFetch(`${API}/categoria/${id}`, { method: 'PUT', body: JSON.stringify({ nome, layoutTipo }) });
                mostrarToast('Categoria atualizada!');
            } else {
                await apiFetch(`${API}/categoria`, { method: 'POST', body: JSON.stringify({ cardapioId: parseInt(cardapioId), nome, layoutTipo }) });
                mostrarToast('Categoria criada!');
            }
            bootstrap.Modal.getInstance(document.getElementById('modalCategoria'))?.hide();
            await carregarCardapios();
        } catch (e) { /* toast */ }
    };

    globalThis.excluirCategoria = async (id, nome) => {
        if (!confirm(`Excluir categoria "${nome}" e todos seus produtos?`)) return;
        try {
            await apiFetch(`${API}/categoria/${id}`, { method: 'DELETE' });
            mostrarToast('Categoria excluída!');
            await carregarCardapios();
        } catch (e) { /* toast */ }
    };

    // ═══════════════════════════════════════════════════════
    // PRODUTO CRUD
    // ═══════════════════════════════════════════════════════

    globalThis.abrirModalProduto = (preselectedCategoriaId) => {
        document.getElementById('produtoEditId').value = '';
        document.getElementById('produtoNome').value = '';
        document.getElementById('produtoDescricao').value = '';
        document.getElementById('produtoPreco').value = '';
        document.getElementById('produtoCodPdv').value = '';
        document.getElementById('produtoOrigem').value = '';
        document.getElementById('produtoUva').value = '';
        document.getElementById('produtoDose').value = '';
        document.getElementById('produtoLayout').value = 'normal';
        document.getElementById('modalProdutoTitulo').textContent = 'Novo Produto';
        removerFotoPreview();

        // Popular select de categorias (agrupado por cardápio)
        const select = document.getElementById('produtoCategoriaId');
        select.innerHTML = '<option value="">Selecione a categoria...</option>';
        dadosCardapios.forEach(card => {
            if (card.categorias?.length) {
                const group = document.createElement('optgroup');
                group.label = card.nome;
                card.categorias.forEach(cat => {
                    const opt = document.createElement('option');
                    opt.value = cat.id;
                    opt.textContent = cat.nome;
                    group.appendChild(opt);
                });
                select.appendChild(group);
            }
        });

        if (preselectedCategoriaId) select.value = preselectedCategoriaId;

        new bootstrap.Modal(document.getElementById('modalProduto')).show();
    };

    globalThis.editarProduto = (id) => {
        let prod = null;
        for (const card of dadosCardapios) {
            for (const cat of card.categorias || []) {
                const found = cat.produtos?.find(p => p.id === id);
                if (found) { prod = found; break; }
            }
            if (prod) break;
        }
        if (!prod) return;

        document.getElementById('produtoEditId').value = id;
        document.getElementById('produtoNome').value = prod.nome || '';
        document.getElementById('produtoDescricao').value = prod.descricao || '';
        document.getElementById('produtoPreco').value = prod.preco || '';
        document.getElementById('produtoCodPdv').value = prod.codPdv || '';
        document.getElementById('produtoOrigem').value = prod.origemPais || '';
        document.getElementById('produtoUva').value = prod.tipoUva || '';
        document.getElementById('produtoDose').value = prod.tamanhoDose || '';
        document.getElementById('produtoLayout').value = prod.layoutTipo || 'normal';
        document.getElementById('modalProdutoTitulo').textContent = 'Editar Produto';

        // Popular categorias
        const select = document.getElementById('produtoCategoriaId');
        select.innerHTML = '';
        dadosCardapios.forEach(card => {
            if (card.categorias?.length) {
                const group = document.createElement('optgroup');
                group.label = card.nome;
                card.categorias.forEach(cat => {
                    const opt = document.createElement('option');
                    opt.value = cat.id;
                    opt.textContent = cat.nome;
                    group.appendChild(opt);
                });
                select.appendChild(group);
            }
        });
        select.value = prod.categoriaId;

        // Foto preview
        if (prod.fotoCaminho) {
            document.getElementById('fotoPreviewImg').src = prod.fotoCaminho;
            document.getElementById('fotoPreviewImg').style.display = 'block';
            document.getElementById('fotoPlaceholder').style.display = 'none';
            document.getElementById('btnRemoveFoto').style.display = 'flex';
        } else {
            removerFotoPreview();
        }

        new bootstrap.Modal(document.getElementById('modalProduto')).show();
    };

    globalThis.salvarProduto = async () => {
        const id = document.getElementById('produtoEditId').value;
        const categoriaId = document.getElementById('produtoCategoriaId').value;
        const nome = document.getElementById('produtoNome').value.trim();

        if (!nome) return mostrarToast('Nome é obrigatório', 'error');
        if (!id && !categoriaId) return mostrarToast('Selecione uma categoria', 'error');

        const fd = new FormData();
        if (categoriaId) fd.append('categoriaId', categoriaId);
        fd.append('nome', nome);
        fd.append('descricao', document.getElementById('produtoDescricao').value);
        fd.append('preco', document.getElementById('produtoPreco').value || '0');
        fd.append('codPdv', document.getElementById('produtoCodPdv').value);
        fd.append('origemPais', document.getElementById('produtoOrigem').value);
        fd.append('tipoUva', document.getElementById('produtoUva').value);
        fd.append('tamanhoDose', document.getElementById('produtoDose').value);
        fd.append('layoutTipo', document.getElementById('produtoLayout').value);

        const fotoInput = document.getElementById('produtoFoto');
        if (fotoInput.files[0]) {
            fd.append('foto', fotoInput.files[0]);
        }

        try {
            if (id) {
                await apiFetch(`${API}/produto/${id}`, { method: 'PUT', body: fd });
                mostrarToast('Produto atualizado!');
            } else {
                await apiFetch(`${API}/produto`, { method: 'POST', body: fd });
                mostrarToast('Produto criado!');
            }
            bootstrap.Modal.getInstance(document.getElementById('modalProduto'))?.hide();
            await carregarCardapios();
        } catch (e) { /* toast */ }
    };

    globalThis.excluirProduto = async (id, nome) => {
        if (!confirm(`Excluir produto "${nome}"?`)) return;
        try {
            await apiFetch(`${API}/produto/${id}`, { method: 'DELETE' });
            mostrarToast('Produto excluído!');
            await carregarCardapios();
        } catch (e) { /* toast */ }
    };

    globalThis.toggleStatusProduto = async (id, novoStatus) => {
        try {
            const data = await apiFetch(`${API}/produto/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: novoStatus })
            });
            mostrarToast(data.mensagem);
            await carregarCardapios();
        } catch (e) { /* toast */ }
    };

    globalThis.duplicarProduto = async (id) => {
        try {
            await apiFetch(`${API}/produto/${id}/duplicar`, { method: 'POST' });
            mostrarToast('Produto duplicado!');
            await carregarCardapios();
        } catch (e) { /* toast */ }
    };

    // ═══════════════════════════════════════════════════════
    // FOTO PREVIEW
    // ═══════════════════════════════════════════════════════

    globalThis.previewFoto = (input) => {
        if (!input.files[0]) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('fotoPreviewImg').src = e.target.result;
            document.getElementById('fotoPreviewImg').style.display = 'block';
            document.getElementById('fotoPlaceholder').style.display = 'none';
            document.getElementById('btnRemoveFoto').style.display = 'flex';
        };
        reader.readAsDataURL(input.files[0]);
    };

    globalThis.removerFotoPreview = () => {
        document.getElementById('fotoPreviewImg').style.display = 'none';
        document.getElementById('fotoPreviewImg').src = '';
        document.getElementById('fotoPlaceholder').style.display = 'block';
        document.getElementById('btnRemoveFoto').style.display = 'none';
        document.getElementById('produtoFoto').value = '';
    };

    // ═══════════════════════════════════════════════════════
    // DRAG & DROP (reordenar cardápios)
    // ═══════════════════════════════════════════════════════

    function initDragDrop() {
        const cards = document.querySelectorAll('.cardapio-card[draggable]');
        let dragItem = null;

        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                dragItem = card;
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
                salvarOrdem();
            });

            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (card !== dragItem) card.classList.add('drag-over');
            });

            card.addEventListener('dragleave', () => {
                card.classList.remove('drag-over');
            });

            card.addEventListener('drop', (e) => {
                e.preventDefault();
                card.classList.remove('drag-over');
                if (dragItem && dragItem !== card) {
                    const container = card.parentNode;
                    const cards = [...container.children];
                    const fromIdx = cards.indexOf(dragItem);
                    const toIdx = cards.indexOf(card);
                    if (fromIdx < toIdx) {
                        container.insertBefore(dragItem, card.nextSibling);
                    } else {
                        container.insertBefore(dragItem, card);
                    }
                }
            });
        });
    }

    async function salvarOrdem() {
        const cards = document.querySelectorAll('.cardapio-card[data-cardapio-id]');
        const itens = [];
        cards.forEach((card, idx) => {
            itens.push({ id: parseInt(card.dataset.cardapioId), ordem: idx + 1 });
        });

        try {
            await apiFetch(`${API}/reordenar`, {
                method: 'PUT',
                body: JSON.stringify({ tipo: 'cardapio', itens })
            });
        } catch (e) { /* silencioso */ }
    }

    // ═══════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════

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

    function contarProdutos(cardapio) {
        let total = 0;
        (cardapio.categorias || []).forEach(cat => {
            total += (cat.produtos || []).length;
        });
        return total;
    }

})();
