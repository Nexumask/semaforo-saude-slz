// footer-news.js - Módulo de notícias do rodapé (carrossel)
let currentNewsList = [];
let currentNewsIndex = 0;
let carouselInterval = null;

(function() {
    function getClient() {
        // Reutiliza o cliente global já inicializado no index.html
        if (window._supabase) return window._supabase;
        
        // Fallback apenas se o SDK estiver disponível e credenciais existirem
        if (typeof window.supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_KEY) {
            return window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
        }
        return null;
    }

    async function verificarAdmin() {
        const client = getClient();
        if (!client) throw new Error('Cliente Supabase não configurado');

        const { data: { session } } = await client.auth.getSession();
        const user = session ? session.user : null;

        if (!user) {
            // Fallback para módulo auth.js (se configurado)
            const fallbackUser = window.auth ? window.auth.getUsuarioLogado() : null;
            if (!fallbackUser) throw new Error('Acesso restrito a administradores');
            
            const admins = ['admin@teste.com', 'seu_email@exemplo.com', 'teste@semaforo.com'];
            if (!admins.includes(fallbackUser.email)) throw new Error('Acesso restrito a administradores');
            return true;
        }
        
        const admins = ['admin@teste.com', 'seu_email@exemplo.com', 'teste@semaforo.com'];
        if (!admins.includes(user.email)) throw new Error('Acesso restrito a administradores');
        return true;
    }

    window.$newsAPI = {
        verificarAdmin: verificarAdmin,

        stopNewsCarousel: function() {
            if (carouselInterval) {
                clearInterval(carouselInterval);
                carouselInterval = null;
            }
        },

        saveNews: async function(content, urlVideo = null) {
            try {
                await verificarAdmin();
                const client = getClient();
                if (!client) throw new Error('Cliente Supabase não configurado');

                // Concatena o link ao content para que o carrossel detecte o YouTube/imagem
                let textoFinal = content;
                if (urlVideo && urlVideo.trim()) {
                    textoFinal = `${content} ${urlVideo.trim()}`;
                }

                const { data, error } = await client
                    .from('footer_news')
                    .insert([{ content: textoFinal }])
                    .select();
                
                if (error) throw error;
                return data;
            } catch (error) {
                console.error('Erro ao salvar notícia:', error);
                throw error;
            }
        },

        updateNews: async function(id, content, table = 'footer_news', urlVideo = null) {
            try {
                await verificarAdmin();

                // Para footer_news (Rodapé) não existe coluna url_video.
                // Concatena o link no final do content para que o carrossel detecte o YouTube/imagem.
                let textoFinal = content;
                if (table === 'footer_news' && urlVideo && urlVideo.trim()) {
                    textoFinal = `${content} ${urlVideo.trim()}`;
                }

                const fieldName = table === 'noticias' ? 'conteudo' : 'content';
                const updateData = { [fieldName]: textoFinal };
                if (table === 'noticias' && urlVideo !== null) {
                    updateData.url_video = urlVideo;
                }

                // Obtém token de sessão autenticada (não o anon key)
                const client = getClient();
                let token = window.SUPABASE_KEY;
                if (client) {
                    const { data: { session } } = await client.auth.getSession();
                    if (session && session.access_token) {
                        token = session.access_token;
                    }
                }

                // PATCH direto ao endpoint REST do Supabase — controle explícito do método HTTP
                const res = await fetch(`${window.SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'apikey': window.SUPABASE_KEY,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(updateData)
                });

                if (!res.ok) {
                    const errText = await res.text().catch(() => '');
                    throw new Error(`Falha na atualização (HTTP ${res.status})${errText ? `: ${errText}` : ''}`);
                }
                return await res.json();
            } catch (error) {
                console.error('Erro ao atualizar notícia:', error);
                throw error;
            }
        },

        deleteNews: async function(id, table = 'footer_news') {
            try {
                await verificarAdmin();

                const client = getClient();
                let token = window.SUPABASE_KEY;
                if (client) {
                    const { data: { session } } = await client.auth.getSession();
                    if (session && session.access_token) {
                        token = session.access_token;
                    }
                }

                // DELETE direto ao endpoint REST do Supabase com token de sessão autenticada.
                // O SDK pode aplicar o anon key se não houver sessão, e se a RLS policy
                // não permitir DELETE anônimo, ele retorna sucesso sem apagar nada.
                const res = await fetch(`${window.SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'apikey': window.SUPABASE_KEY,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    }
                });

                if (!res.ok) {
                    const errText = await res.text().catch(() => '');
                    throw new Error(`Falha na exclusão (HTTP ${res.status})${errText ? `: ${errText}` : ''}`);
                }

                const data = await res.json().catch(() => []);
                if (!Array.isArray(data) || data.length === 0) {
                    throw new Error('Nenhum registro foi excluído. Verifique se a RLS policy permite exclusão.');
                }
                return data;
            } catch (error) {
                console.error('Erro ao deletar notícia:', error);
                throw error;
            }
        },

        getAllNewsForAdmin: async function() {
            try {
                await verificarAdmin();
                const client = getClient();
                if (!client) throw new Error('Cliente Supabase não configurado');

                const [resFooter, resNoticias] = await Promise.allSettled([
                    client.from('footer_news').select('id, content, created_at').order('created_at', { ascending: false }),
                    client.from('noticias').select('id, titulo, conteudo, fonte, url_video, criado_em').order('criado_em', { ascending: false })
                ]);

                let items = [];
                if (resFooter.status === 'fulfilled' && resFooter.value.data) {
                    resFooter.value.data.forEach(item => {
                        // Extrai URL (YouTube/imagem) do content para preencher o campo de vídeo na edição
                        const urlExtraido = (item.content || '').match(/https?:\/\/\S+/i);
                        items.push({ id: item.id, content: item.content, created_at: item.created_at, table: 'footer_news', url_video: urlExtraido ? urlExtraido[0] : '' });
                    });
                }
                if (resNoticias.status === 'fulfilled' && resNoticias.value.data) {
                    resNoticias.value.data.forEach(item => items.push({ id: item.id, content: item.conteudo || item.titulo, created_at: item.criado_em, table: 'noticias', fonte: item.fonte, url_video: item.url_video }));
                }
                items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                return items;
            } catch (error) {
                console.error('Erro ao buscar lista admin de notícias:', error);
                return [];
            }
        },
        
        getLatestNews: async function() {
            try {
                const client = getClient();
                if (!client) throw new Error('Cliente Supabase não configurado');

                // Busca via SDK Supabase
                const [resFooter, resNoticias] = await Promise.allSettled([
                    client.from('footer_news').select('id, content, created_at').order('created_at', { ascending: false }).limit(5),
                    client.from('noticias').select('id, titulo, conteudo, fonte, url_video, criado_em').order('criado_em', { ascending: false }).limit(5)
                ]);

                let items = [];

                if (resFooter.status === 'fulfilled' && resFooter.value.data) {
                    resFooter.value.data.forEach(item => {
                        items.push({
                            id: item.id,
                            titulo: 'Plantão Informativo',
                            content: item.content,
                            fonte: 'Administração',
                            created_at: item.created_at
                        });
                    });
                }

                if (resNoticias.status === 'fulfilled' && resNoticias.value.data) {
                    resNoticias.value.data.forEach(item => {
                        items.push({
                            id: item.id,
                            titulo: item.titulo,
                            content: item.conteudo ? `${item.titulo}: ${item.conteudo}` : item.titulo,
                            fonte: item.fonte || 'Saúde São Luís',
                            url_video: item.url_video,
                            created_at: item.criado_em
                        });
                    });
                }

                items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                return items.slice(0, 10);
            } catch (err) {
                console.error('Erro na chamada ao Supabase:', err);
                return [];
            }
        },
        
        startNewsCarousel: function(newsContainerId, interval = 6000) {
            const initContainer = () => {
                const container = document.getElementById(newsContainerId);
                if (!container) return false;

                this.stopNewsCarousel();
                container.innerHTML = '';
                
                container.style.display = 'flex';
                container.style.overflowX = 'auto';
                container.style.scrollBehavior = 'smooth';
                container.style.gap = '10px';
                container.style.scrollSnapType = 'x mandatory';

                const modal = document.getElementById('noticia-modal');
                const modalContent = document.getElementById('modal-conteudo');
                const modalTitle = document.getElementById('modal-titulo');
                const modalFonte = document.getElementById('modal-fonte');

                container.onclick = (e) => {
                    const clickedItem = e.target.closest('.news-item');
                    if (!clickedItem) return;
                    
                    const clickedIndex = parseInt(clickedItem.dataset?.index, 10);
                    if (isNaN(clickedIndex) || !currentNewsList[clickedIndex]) return;
                    
                    const activeNews = currentNewsList[clickedIndex];
                    if (modalTitle) modalTitle.textContent = activeNews.titulo || 'Notícia Completa';
                    if (modalFonte) modalFonte.textContent = activeNews.fonte ? `Fonte: ${activeNews.fonte}` : '';
                    
                    const fullText = (activeNews.content || '') + ' ' + (activeNews.url_video || '');
                    let mediaHtml = '';
                    
                    const youtubeMatch = fullText.match(/(?:v=|embed\/|youtu\.be\/|watch\?v=)([a-zA-Z0-9_-]{11})/);
                    const supabaseMatch = fullText.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/i);
                    
                    // Extrai a URL do texto (se houver) para exibir como link separado
                    const urlMatch = fullText.match(/https?:\/\/\S+/i);
                    const linkExtra = urlMatch && urlMatch[0] ? `<p style="margin-top: 12px;"><a href="${urlMatch[0]}" target="_blank" rel="noopener" style="color: #2563eb; text-decoration: underline; word-break: break-all; font-size: 0.85rem;">🔗 Abrir link externo</a></p>` : '';
                    
                    // Remove URL do texto visível
                    const textoLimpo = (activeNews.content || 'Sem mais detalhes informados.').replace(/https?:\/\/\S+/g, '').trim() || 'Sem mais detalhes informados.';
                    
                    if (youtubeMatch && youtubeMatch[1]) {
                        // Lazy-load: thumbnail clicável que só carrega o iframe sob demanda.
                        // Evita disparo dos scripts de ads do YouTube (doubleclick) e o erro de CORS no console.
                        const videoId = youtubeMatch[1];
                        mediaHtml = `
                            <div class="yt-lazy" data-video-id="${videoId}" style="margin-bottom: 15px; position: relative; cursor: pointer;">
                                <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" style="width: 100%; max-height: 220px; object-fit: cover; border-radius: 12px; display: block;">
                                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 68px; height: 48px; background: rgba(0,0,0,0.75); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                                    <svg width="34" height="34" viewBox="0 0 24 24" fill="#ffffff"><path d="M8 5v14l11-7z"/></svg>
                                </div>
                            </div>`;
                    } else if (supabaseMatch && supabaseMatch[0]) {
                        mediaHtml = `<div style="margin-bottom: 15px;"><img src="${supabaseMatch[0]}" style="width: 100%; max-height: 220px; object-fit: cover; border-radius: 12px;"></div>`;
                    }
                    
                    if (modalContent) {
                        modalContent.innerHTML = `${mediaHtml}<p style="color: #334155; font-size: 1rem; line-height: 1.5; margin-top: 10px;">${textoLimpo}</p>${linkExtra}`;

                        // Delegação: clicar na thumbnail troca pelo iframe do YouTube sob demanda
                        const ytLazy = modalContent.querySelector('.yt-lazy');
                        if (ytLazy) {
                            ytLazy.addEventListener('click', function() {
                                const vid = this.dataset.videoId;
                                this.innerHTML = `<iframe width="100%" height="220" src="https://www.youtube.com/embed/${vid}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen style="border-radius:12px; display:block;"></iframe>`;
                            });
                        }
                    }
                    
                    if (modal) modal.style.display = 'flex';
                };
                
                const fetchAndRender = async () => {
                    try {
                        currentNewsList = await this.getLatestNews();
                        container.innerHTML = '';
                        
                        if (currentNewsList.length === 0) {
                            container.innerHTML = '<div class="news-item"><p class="news-text">Nenhuma notícia disponível no momento.</p></div>';
                            return;
                        }

                        currentNewsList.forEach((news, index) => {
                            const newsItem = document.createElement('div');
                            newsItem.className = 'news-item';
                            newsItem.dataset.index = index;
                            newsItem.style.minWidth = '85%';
                            newsItem.style.flexShrink = '0';
                            newsItem.style.scrollSnapAlign = 'start';
                            newsItem.style.cursor = 'pointer';
                            
                            const fullText = (news.content || '') + ' ' + (news.url_video || '');
                            let thumbnailHtml = '';
                            
                            const youtubeMatch = fullText.match(/(?:v=|embed\/|youtu\.be\/|watch\?v=)([a-zA-Z0-9_-]{11})/);
                            const supabaseMatch = fullText.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/i);
                            
                            if (youtubeMatch && youtubeMatch[1]) {
                                thumbnailHtml = `<img src="https://img.youtube.com/vi/${youtubeMatch[1]}/hqdefault.jpg" style="width: 70px; height: 45px; object-fit: cover; border-radius: 6px; flex-shrink: 0;">`;
                            } else if (supabaseMatch && supabaseMatch[0]) {
                                thumbnailHtml = `<img src="${supabaseMatch[0]}" style="width: 70px; height: 45px; object-fit: cover; border-radius: 6px; flex-shrink: 0;">`;
                            } else {
                                thumbnailHtml = `<div style="width: 45px; height: 45px; background: #e2e8f0; display: flex; align-items: center; justify-content: center; border-radius: 6px; flex-shrink: 0; font-size: 1.2rem;">📰</div>`;
                            }

                            // Remove URL (http/https) do texto visível para não poluir o card
                            const exibirTexto = (news.content || news.titulo || '').replace(/https?:\/\/\S+/g, '').trim() || 'Clique para ver a notícia completa';
                            
                            newsItem.innerHTML = `
                                <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
                                    ${thumbnailHtml}
                                    <div style="flex: 1; overflow: hidden;">
                                        <p class="news-text" style="font-size: 0.85rem; font-weight: 600; color: #1e293b; margin: 0; line-clamp: 2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${exibirTexto}</p>
                                        <span class="news-source" style="font-size: 0.7rem; color: #64748b;">Fonte: ${news.fonte || 'Geral'}</span>
                                    </div>
                                </div>
                            `;
                            container.appendChild(newsItem);
                        });

                        if (currentNewsList.length > 1) {
                            currentNewsIndex = 0;
                            carouselInterval = setInterval(() => {
                                currentNewsIndex = (currentNewsIndex + 1) % currentNewsList.length;
                                const targetCard = container.children[currentNewsIndex];
                                if (targetCard) {
                                    container.scrollTo({
                                        left: targetCard.offsetLeft - container.offsetLeft,
                                        behavior: 'smooth'
                                    });
                                }
                            }, interval);
                        }
                    } catch (error) {
                        console.error('Erro ao renderizar carrossel de notícias:', error);
                    }
                };

                fetchAndRender().catch(err => {
                    console.error('Erro ao carregar notícias do carrossel:', err);
                    container.innerHTML = '<div class="news-item"><p class="news-text">Erro ao carregar notícias.</p></div>';
                });
                return true;
            };

            if (!initContainer()) {
                document.addEventListener('DOMContentLoaded', () => initContainer());
            }
        }
    };

    // Autoinicializa o carrossel se o container existir na página
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(() => {
            if (document.getElementById('news-container')) {
                window.$newsAPI.startNewsCarousel('news-container', 6000);
            }
        }, 100);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            if (document.getElementById('news-container')) {
                window.$newsAPI.startNewsCarousel('news-container', 5000);
            }
        });
    }
})();
