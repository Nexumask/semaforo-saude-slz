// admin.js - Módulo administrativo

function abrirPainelAdmin(usuarioLogado) {
    if (!usuarioLogado) {
        window.auth.abrirAuthModal();
        return;
    }
    
    try {
        // Lista de e-mails administradores
        const admins = [
            'admin@teste.com',
            'seu_email@exemplo.com',
            'teste@semaforo.com'
        ];
        
        if (admins.includes(usuarioLogado.email)) {
            criarModalAdmin();
        } else {
            alert('Acesso restrito a administradores');
        }
    } catch (err) {
        console.error('Erro ao verificar admin:', err);
        alert('Erro ao verificar permissões - Modo Teste');
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
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    carregarListaNoticiasAdmin();
}

async function carregarListaNoticiasAdmin() {
    const listContainer = document.getElementById('admin-news-list');
    if (!listContainer) return;

    try {
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

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                    <span style="background: ${badgeColor}; color: white; font-size: 0.75rem; font-weight: bold; padding: 2px 8px; border-radius: 12px;">${badgeText}</span>
                    <span style="color: #94a3b8; font-size: 0.75rem;">${new Date(item.created_at).toLocaleString('pt-BR')}</span>
                </div>
                <p style="margin: 0; font-size: 0.9rem; color: #334155; line-clamp: 2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${item.content}</p>
                <div style="display: flex; gap: 10px; margin-top: 5px; border-top: 1px solid #f1f5f9; padding-top: 8px;">
                    <button onclick="admin.prepararEdicao('${item.id}', '${item.table}', \`${encodeURIComponent(item.content)}\`)" style="background: #f59e0b; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-weight: 600;">Editar</button>
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

function prepararEdicao(id, table, encodedContent) {
    const content = decodeURIComponent(encodedContent);
    document.getElementById('admin-news-id').value = id;
    document.getElementById('admin-news-table').value = table;
    document.getElementById('admin-news-content').value = content;
    
    document.getElementById('form-title').textContent = `Editar Notícia (${table === 'noticias' ? 'Principal' : 'Rodapé'})`;
    document.getElementById('btn-salvar').textContent = 'Atualizar Notícia';
    document.getElementById('btn-cancelar').style.display = 'inline-block';
    
    document.getElementById('admin-news-content').focus();
}

function cancelarEdicao() {
    document.getElementById('admin-news-id').value = '';
    document.getElementById('admin-news-table').value = 'footer_news';
    document.getElementById('admin-news-content').value = '';
    
    document.getElementById('form-title').textContent = 'Nova Notícia (Rodapé)';
    document.getElementById('btn-salvar').textContent = 'Salvar Notícia';
    document.getElementById('btn-cancelar').style.display = 'none';
}

async function salvarNoticia() {
    const id = document.getElementById('admin-news-id').value;
    const table = document.getElementById('admin-news-table').value;
    const content = document.getElementById('admin-news-content').value.trim();
    
    if (!content) {
        alert('Digite o conteúdo da notícia');
        return;
    }
    
    try {
        if (id) {
            await window.$newsAPI.updateNews(id, content, table);
            alert('Notícia atualizada com sucesso!');
            cancelarEdicao();
        } else {
            await window.$newsAPI.saveNews(content);
            alert('Notícia salva com sucesso!');
            document.getElementById('admin-news-content').value = '';
        }
        carregarListaNoticiasAdmin();
        
        // Recarrega o carrossel se estiver na página principal
        if (window.$newsAPI && typeof window.$newsAPI.startNewsCarousel === 'function' && document.getElementById('news-container')) {
            window.$newsAPI.startNewsCarousel('news-container');
        }
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
        await window.$newsAPI.deleteNews(id, table);
        alert('Notícia excluída com sucesso!');
        carregarListaNoticiasAdmin();
        
        // Recarrega o carrossel se estiver na página principal
        if (window.$newsAPI && typeof window.$newsAPI.startNewsCarousel === 'function' && document.getElementById('news-container')) {
            window.$newsAPI.startNewsCarousel('news-container');
        }
    } catch (err) {
        console.error('Erro ao excluir notícia:', err);
        alert('Erro ao excluir notícia');
    }
}

// Exportar funções para uso global
window.admin = {
    abrirPainelAdmin,
    salvarNoticia,
    prepararEdicao,
    cancelarEdicao,
    excluirNoticia
};
