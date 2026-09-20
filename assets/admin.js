// admin.js - Módulo administrativo

// Lista centralizada de e-mails administradores
const ADMIN_EMAILS = [
    'vonnis@gmail.com'
];

function isAdmin(email) {
    return ADMIN_EMAILS.includes(email);
}

function verificarAdminAtual() {
    if (window.$newsAPI && typeof window.$newsAPI.verificarAdmin === 'function') {
        return window.$newsAPI.verificarAdmin();
    }
    const user = window.auth ? window.auth.getUsuarioLogado() : null;
    if (!user) throw new Error('Acesso restrito a administradores');
    if (!isAdmin(user.email)) throw new Error('Acesso restrito a administradores');
    return true;
}

function abrirPainelAdmin(usuarioLogado) {
    if (!usuarioLogado) {
        window.auth.abrirAuthModal();
        return;
    }
    
    try {
        if (isAdmin(usuarioLogado.email)) {
            criarModalAdmin();
        } else {
            alert('Acesso restrito a administradores');
        }
    } catch (err) {
        console.error('Erro ao verificar admin:', err);
        alert('Erro ao verificar permissões');
    }
}

function criarModalAdmin() {
    const modal = document.createElement('div');
    modal.id = 'admin-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '3000';
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 95%; max-width: 600px; position: relative; max-height: 90vh; display: flex; flex-direction: column;">
            <h2 style="margin-top: 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Painel Administrativo</h2>
            <button onclick="document.getElementById('admin-modal').remove()" style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b;">×</button>
            
            <div style="overflow-y: auto; flex: 1; padding-right: 5px;">
                <div style="margin-top: 10px; background: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0;">
                    <h3 id="form-title" style="margin-top: 0; font-size: 1.1rem; color: #1e293b;">Nova Notícia (Rodapé)</h3>
                    <input type="hidden" id="admin-news-id" value="">
                    <input type="hidden" id="admin-news-table" value="footer_news">
                    <textarea id="admin-news-content" style="width: 100%; min-height: 80px; margin-bottom: 10px; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-family: inherit;" placeholder="Digite o conteúdo da notícia..."></textarea>
                    <div id="admin-url-video-field" style="margin-bottom: 10px;">
                        <label for="admin-news-url" style="display: block; font-size: 0.85rem; color: #1e293b; font-weight: 600; margin-bottom: 4px;">Link de Vídeo / URL (opcional)</label>
                        <input type="url" id="admin-news-url" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-family: inherit; box-sizing: border-box;" placeholder="https://www.youtube.com/watch?v=... ou outra URL">
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button id="btn-salvar" onclick="admin.salvarNoticia()" style="background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 600;">Salvar Notícia</button>
                        <button id="btn-cancelar" onclick="admin.cancelarEdicao()" style="background: #64748b; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 600; display: none;">Cancelar</button>
                    </div>
                </div>

                <div style="margin-top: 20px;">
                    <h3 style="font-size: 1.1rem; color: #1e293b; margin-bottom: 10px;">Gerenciar Notícias Existentes</h3>
                    <div id="admin-news-list" style="display: flex; flex-direction: column; gap: 10px;">
                        <p style="color: #64748b; font-style: italic;">Carregando notícias...</p>
                    </div>
                </div>

                <div style="margin-top: 20px; background: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0;">
                    <h3 style="margin-top: 0; font-size: 1.1rem; color: #1e293b;">Gerenciar Status das Unidades</h3>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <div>
                            <label for="admin-unidade-select" style="display: block; font-size: 0.85rem; color: #1e293b; font-weight: 600; margin-bottom: 4px;">Unidade</label>
                            <select id="admin-unidade-select" onchange="admin.carregarDadosUnidade(this.value)" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-family: inherit; box-sizing: border-box;">
                                <option value="">Selecione a unidade...</option>
                            </select>
                        </div>
                        <div>
                            <label for="admin-status-select" style="display: block; font-size: 0.85rem; color: #1e293b; font-weight: 600; margin-bottom: 4px;">Status</label>
                            <select id="admin-status-select" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-family: inherit; box-sizing: border-box;">
                                <option value="Verde (Tranquilo)">Verde (Tranquilo)</option>
                                <option value="Amarelo (Moderado)">Amarelo (Moderado)</option>
                                <option value="Vermelho (Crítico)">Vermelho (Crítico)</option>
                            </select>
                        </div>
                        <div>
                            <label for="admin-motivo-select" style="display: block; font-size: 0.85rem; color: #1e293b; font-weight: 600; margin-bottom: 4px;">Motivo do Status</label>
                            <select id="admin-motivo-select" onchange="admin.alternarMotivoOutro()" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-family: inherit; box-sizing: border-box;">
                                <option value="Nenhum">Nenhum</option>
                                <option value="Sistema inoperante">Sistema inoperante</option>
                                <option value="Superlotação">Superlotação</option>
                                <option value="Falta de profissionais">Falta de profissionais</option>
                                <option value="Falta de energia">Falta de energia</option>
                                <option value="Outro">Outro</option>
                            </select>
                        </div>
                        <div id="admin-motivo-outro-field" style="display: none;">
                            <label for="admin-motivo-outro" style="display: block; font-size: 0.85rem; color: #1e293b; font-weight: 600; margin-bottom: 4px;">Descreva o motivo</label>
                            <input type="text" id="admin-motivo-outro" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-family: inherit; box-sizing: border-box;" placeholder="Digite o motivo...">
                        </div>
                        <div style="display: flex; gap: 10px; margin-top: 5px;">
                            <button onclick="admin.salvarUnidade()" style="background: #16a34a; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 600;">Salvar Unidade</button>
                        </div>
                        <div id="admin-unidade-msg" style="font-size: 0.8rem;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    carregarListaNoticiasAdmin();
    carregarUnidadesAdmin();
}

async function carregarListaNoticiasAdmin() {
    const listContainer = document.getElementById('admin-news-list');
    if (!listContainer) return;

    try {
        verificarAdminAtual();
        const news = await window.$newsAPI.getAllNewsForAdmin();
        listContainer.innerHTML = '';

        if (news.length === 0) {
            listContainer.innerHTML = '<p style="color: #64748b; font-style: italic;">Nenhuma notícia cadastrada.</p>';
            return;
        }

                news.forEach(item => {
                    const card = document.createElement('div');
                    card.style.background = '#ffffff';
                    card.style.border = '1px solid #e2e8f0';
                    card.style.borderRadius = '6px';
                    card.style.padding = '12px';
                    card.style.display = 'flex';
                    card.style.flexDirection = 'column';
                    card.style.gap = '8px';

                    const badgeColor = item.table === 'noticias' ? '#0ea5e9' : '#10b981';
                    const badgeText = item.table === 'noticias' ? 'Notícia Principal' : 'Rodapé';
                    const urlVideo = item.url_video || '';
                    const urlEncode = urlVideo ? encodeURIComponent(urlVideo) : '';

                    const linkHtml = urlVideo ? `
                        <a href="${urlVideo}" target="_blank" rel="noopener" style="font-size: 0.8rem; color: #2563eb; text-decoration: underline; word-break: break-all;">🔗 ${urlVideo}</a>
                    ` : '';

                    card.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                            <span style="background: ${badgeColor}; color: white; font-size: 0.75rem; font-weight: bold; padding: 2px 8px; border-radius: 12px;">${badgeText}</span>
                            <span style="color: #94a3b8; font-size: 0.75rem;">${new Date(item.created_at).toLocaleString('pt-BR')}</span>
                        </div>
                        <p style="margin: 0; font-size: 0.9rem; color: #334155; line-clamp: 2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${item.content}</p>
                        ${linkHtml}
                        <div style="display: flex; gap: 10px; margin-top: 5px; border-top: 1px solid #f1f5f9; padding-top: 8px;">
                            <button onclick="admin.prepararEdicao('${item.id}', '${item.table}', \`${encodeURIComponent(item.content)}\`, '${urlEncode}')" style="background: #f59e0b; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-weight: 600;">Editar</button>
                            <button onclick="admin.excluirNoticia('${item.id}', '${item.table}')" style="background: #ef4444; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-weight: 600;">Excluir</button>
                        </div>
                    `;
                    listContainer.appendChild(card);
                });
    } catch (error) {
        console.error('Erro ao carregar lista de notícias no admin:', error);
        listContainer.innerHTML = '<p style="color: #ef4444; font-style: italic;">Erro ao carregar notícias.</p>';
    }
}

function prepararEdicao(id, table, encodedContent, encodedUrl = '') {
    const content = decodeURIComponent(encodedContent);
    const urlVideo = encodedUrl ? decodeURIComponent(encodedUrl) : '';
    document.getElementById('admin-news-id').value = id;
    document.getElementById('admin-news-table').value = table;
    document.getElementById('admin-news-content').value = content;
    document.getElementById('admin-news-url').value = urlVideo;
    
    document.getElementById('form-title').textContent = `Editar Notícia (${table === 'noticias' ? 'Principal' : 'Rodapé'})`;
    document.getElementById('btn-salvar').textContent = 'Atualizar Notícia';
    document.getElementById('btn-cancelar').style.display = 'inline-block';
    
    document.getElementById('admin-news-content').focus();
}

function cancelarEdicao() {
    document.getElementById('admin-news-id').value = '';
    document.getElementById('admin-news-table').value = 'footer_news';
    document.getElementById('admin-news-content').value = '';
    document.getElementById('admin-news-url').value = '';
    
    document.getElementById('form-title').textContent = 'Nova Notícia (Rodapé)';
    document.getElementById('btn-salvar').textContent = 'Salvar Notícia';
    document.getElementById('btn-cancelar').style.display = 'none';
}

async function salvarNoticia() {
    const id = document.getElementById('admin-news-id').value;
    const table = document.getElementById('admin-news-table').value;
    const content = document.getElementById('admin-news-content').value.trim();
    const urlVideo = document.getElementById('admin-news-url').value.trim();
    
    if (!content) {
        alert('Digite o conteúdo da notícia');
        return;
    }
    
    try {
        verificarAdminAtual();
        if (id) {
            await window.$newsAPI.updateNews(id, content, table, urlVideo);
            alert('Notícia atualizada com sucesso!');
            cancelarEdicao();
        } else {
            // IMPORTANTE: o link de vídeo/URL DEBE ser passado — saveNews() é
            // quem concatena o link ao content para que o carrossel detecte o
            // YouTube/imagem. Antes se passava only content e o vídeo se perdía.
            await window.$newsAPI.saveNews(content, urlVideo);
            alert('Notícia salva com sucesso!');
            document.getElementById('admin-news-content').value = '';
            document.getElementById('admin-news-url').value = '';
        }
        carregarListaNoticiasAdmin();
        
        // Recarrega o carrossel se estiver na página principal
        if (window.$newsAPI && typeof window.$newsAPI.startNewsCarousel === 'function' && document.getElementById('news-container')) {
            window.$newsAPI.startNewsCarousel('news-container');
        }
        
        // Recarrega o carrossel unificado (footer-news.js), que é a fonte
        // oficial de renderização. O antigo news.js/carregarNoticias era
        // removido do conteúdo pois reintroduzia redirecionamento externo.
    } catch (err) {
        console.error('Erro ao salvar notícia:', err);
        alert('Erro ao salvar notícia');
    }
}

async function excluirNoticia(id, table) {
    if (!confirm('Tem certeza que deseja excluir esta notícia permanentemente?')) {
        return;
    }

    try {
        verificarAdminAtual();
        await window.$newsAPI.deleteNews(id, table);
        alert('Notícia excluída com sucesso!');
        carregarListaNoticiasAdmin();
        
        // Recarrega o carrossel se estiver na página principal
        if (window.$newsAPI && typeof window.$newsAPI.startNewsCarousel === 'function' && document.getElementById('news-container')) {
            window.$newsAPI.startNewsCarousel('news-container');
        }
        
        // Recarrega o carrossel unificado (footer-news.js), que é a fonte
        // oficial de renderização. O antigo news.js/carregarNoticias era
        // removido do conteúdo pois reintroduzia redirecionamento externo.
    } catch (err) {
        console.error('Erro ao excluir notícia:', err);
        alert('Erro ao excluir notícia');
    }
}

// ==========================================
// GERENCIAMENTO DE UNIDADES DE SAÚDE
// ==========================================

const OPCOES_MOTIVO_PADRAO = ['Nenhum', 'Sistema inoperante', 'Superlotação', 'Falta de profissionais', 'Falta de energia'];

async function carregarUnidadesAdmin() {
    const select = document.getElementById('admin-unidade-select');
    if (!select) return;

    try {
        verificarAdminAtual();
        if (!window._supabase) return;

        const { data: unidades, error } = await window._supabase
            .from('unidades_saude')
            .select('id, nome')
            .order('nome');

        if (error) throw error;

        select.innerHTML = '<option value="">Selecione a unidade...</option>';
        unidades.forEach(unidade => {
            const opt = document.createElement('option');
            opt.value = unidade.id;
            opt.textContent = unidade.nome;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Erro ao carregar unidades no admin:', err);
    }
}

function alternarMotivoOutro() {
    const select = document.getElementById('admin-motivo-select');
    const field = document.getElementById('admin-motivo-outro-field');
    if (!select || !field) return;
    field.style.display = select.value === 'Outro' ? 'block' : 'none';
}

async function carregarDadosUnidade(idUnidade) {
    if (!idUnidade || !window._supabase) return;

    try {
        verificarAdminAtual();
        const { data, error } = await window._supabase
            .from('unidades_saude')
            .select('status_atual, motivo_status')
            .eq('id', idUnidade)
            .maybeSingle();

        if (error) throw error;

        const statusSelect = document.getElementById('admin-status-select');
        const motivoSelect = document.getElementById('admin-motivo-select');
        const motivoOutro = document.getElementById('admin-motivo-outro');
        if (!statusSelect || !motivoSelect || !motivoOutro) return;

        statusSelect.value = (data && data.status_atual) ? data.status_atual : '';

        const motivo = (data && data.motivo_status) ? data.motivo_status : 'Nenhum';
        if (OPCOES_MOTIVO_PADRAO.includes(motivo)) {
            motivoSelect.value = motivo;
            motivoOutro.value = '';
        } else if (motivo && motivo !== 'Nenhum') {
            motivoSelect.value = 'Outro';
            motivoOutro.value = motivo;
        } else {
            motivoSelect.value = 'Nenhum';
            motivoOutro.value = '';
        }
        alternarMotivoOutro();
    } catch (err) {
        console.error('Erro ao carregar dados da unidade no painel:', err);
    }
}

async function salvarUnidade() {
    const idUnidade = document.getElementById('admin-unidade-select').value;
    const status = document.getElementById('admin-status-select').value;

    if (!idUnidade) {
        alert('Selecione uma unidade.');
        return;
    }
    if (!status) {
        alert('Selecione um status para a unidade.');
        return;
    }

    let motivo = document.getElementById('admin-motivo-select').value;
    if (motivo === 'Outro') {
        motivo = document.getElementById('admin-motivo-outro').value.trim() || 'Outro';
    } else if (motivo === 'Nenhum') {
        motivo = null;
    }

    try {
        verificarAdminAtual();
        if (!window._supabase) {
            alert('Indisponível localmente.');
            return;
        }

        const { error } = await window._supabase
            .from('unidades_saude')
            .update({ status_atual: status, motivo_status: motivo })
            .eq('id', idUnidade);

        if (error) throw error;

        const msg = document.getElementById('admin-unidade-msg');
        if (msg) {
            msg.innerHTML = '<span style="color: #16a34a; font-weight: 600;">Unidade atualizada com sucesso!</span>';
        }

        // Atualiza a cor do marcador no mapa, se a página for a principal
        try {
            if (window.mapModule && typeof window.mapModule.atualizarMarcadorNoMapa === 'function') {
                window.mapModule.atualizarMarcadorNoMapa(idUnidade, status);
            }
        } catch (e) {
            console.warn('Não foi possível atualizar o marcador no mapa:', e);
        }
    } catch (err) {
        console.error('Erro ao salvar unidade:', err);
        alert('Erro ao salvar unidade.');
    }
}

// Exportar funções para uso global
window.admin = {
    abrirPainelAdmin,
    salvarNoticia,
    prepararEdicao,
    cancelarEdicao,
    excluirNoticia,
    carregarUnidadesAdmin,
    alternarMotivoOutro,
    carregarDadosUnidade,
    salvarUnidade
};
