// Configuração inicial do Supabase - versão modular segura
let currentNewsList = [];
let currentNewsIndex = 0;
let carouselInterval = null;

(function() {
    function getClient() {
        if (typeof window.supabase !== 'undefined') {
            const url = window.SUPABASE_URL || localStorage.getItem('SUPABASE_URL') || '';
            const key = window.SUPABASE_KEY || localStorage.getItem('SUPABASE_KEY') || '';
            if (url && key) {
                return window.supabase.createClient(url, key);
            }
        }
        return null;
    }

    window.$newsAPI = {
        stopNewsCarousel: function() {
            if (carouselInterval) {
                clearInterval(carouselInterval);
                carouselInterval = null;
            }
        },

        saveNews: async function(content) {
            try {
                const client = getClient();
                if (!client) throw new Error('Cliente Supabase não configurado');
                const { data, error } = await client
                    .from('footer_news')
                    .insert([{ content }])
                    .select();
                
                if (error) throw error;
                return data;
            } catch (error) {
                console.error('Erro ao salvar notícia:', error);
                throw error;
            }
        },

        updateNews: async function(id, content, table = 'footer_news') {
            try {
                const client = getClient();
                if (!client) throw new Error('Cliente Supabase não configurado');
                const fieldName = table === 'noticias' ? 'conteudo' : 'content';
                const { data, error } = await client
                    .from(table)
                    .update({ [fieldName]: content })
                    .eq('id', id)
                    .select();

                if (error) throw error;
                return data;
            } catch (error) {
                console.error('Erro ao atualizar notícia:', error);
                throw error;
            }
        },

        deleteNews: async function(id, table = 'footer_news') {
            try {
                const client = getClient();
                if (!client) throw new Error('Cliente Supabase não configurado');
                const { data, error } = await client
                    .from(table)
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                return data;
            } catch (error) {
                console.error('Erro ao deletar notícia:', error);
                throw error;
            }
        },

        getAllNewsForAdmin: async function() {
            try {
                const client = getClient();
                if (!client) {
                    const url = window.SUPABASE_URL || 'https://ecphyqttiffjwqnebolm.supabase.co';
                    const key = window.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjcGh5cXR0aWZmandxbmVib2xtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNzM0NDgsImV4cCI6MjA5NTY0OTQ0OH0.ZiZnzsbWPR0zgBQBXR0mj3otQ5xe4uxxFxobZMW82BM';
                    
                    const [resFooter, resNoticias] = await Promise.allSettled([
                        fetch(`${url}/rest/v1/footer_news?select=id,content,created_at&order=created_at.desc`, { headers: { apikey: key, Authorization: `Bearer ${key}` } }).then(r => r.json()),
                        fetch(`${url}/rest/v1/noticias?select=id,titulo,conteudo,fonte,url_video,criado_em&order=criado_em.desc`, { headers: { apikey: key, Authorization: `Bearer ${key}` } }).then(r => r.json())
                    ]);

                    let items = [];
                    if (resFooter.status === 'fulfilled' && Array.isArray(resFooter.value)) {
                        resFooter.value.forEach(item => {
                            items.push({ id: item.id, content: item.content, created_at: item.created_at, table: 'footer_news' });
                        });
                    }
                    if (resNoticias.status === 'fulfilled' && Array.isArray(resNoticias.value)) {
                        resNoticias.value.forEach(item => {
                            items.push({ id: item.id, content: item.conteudo || item.titulo, created_at: item.criado_em, table: 'noticias' });
                        });
                    }
                    items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    return items;
                }

                const [resFooter, resNoticias] = await Promise.allSettled([
                    client.from('footer_news').select('id, content, created_at').order('created_at', { ascending: false }),
                    client.from('noticias').select('id, titulo, conteudo, criado_em').order('criado_em', { ascending: false })
                ]);

                let items = [];
                if (resFooter.status === 'fulfilled' && resFooter.value.data) {
                    resFooter.value.data.forEach(item => items.push({ id: item.id, content: item.content, created_at: item.created_at, table: 'footer_news' }));
                }
                if (resNoticias.status === 'fulfilled' && resNoticias.value.data) {
                    resNoticias.value.data.forEach(item => items.push({ id: item.id, content: item.conteudo || item.titulo, created_at: item.criado_em, table: 'noticias' }));
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
                if (!client) {
                    // Fallback se cliente Supabase ainda não inicializado via SDK de script estático
                    const url = window.SUPABASE_URL || 'https://ecphyqttiffjwqnebolm.supabase.co';
                    const key = window.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjcGh5cXR0aWZmandxbmVib2xtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNzM0NDgsImV4cCI6MjA5NTY0OTQ0OH0.ZiZnzsbWPR0zgBQBXR0mj3otQ5xe4uxxFxobZMW82BM';
                    
                    const [resFooter, resNoticias] = await Promise.allSettled([
                        fetch(`${url}/rest/v1/footer_news?select=id,content,created_at&order=created_at.desc&limit=5`, { headers: { apikey: key, Authorization: `Bearer ${key}` } }).then(r => r.json()),
                        fetch(`${url}/rest/v1/noticias?select=id,titulo,conteudo,fonte,url_video,criado_em&order=criado_em.desc&limit=5`, { headers: { apikey: key, Authorization: `Bearer ${key}` } }).then(r => r.json())
                    ]);

                    let items = [];
                    if (resFooter.status === 'fulfilled' && Array.isArray(resFooter.value)) {
                        resFooter.value.forEach(item => {
                            items.push({
                                id: item.id,
                                titulo: 'Plantão Informativo',
                                content: item.content,
                                fonte: 'Administração',
                                created_at: item.created_at
                            });
                        });
                    }

                    if (resNoticias.status === 'fulfilled' && Array.isArray(resNoticias.value)) {
                        resNoticias.value.forEach(item => {
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
                }

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
                    
                    if (youtubeMatch && youtubeMatch[1]) {
                        mediaHtml = `<div style="margin-bottom: 15px;"><iframe width="100%" height="220" src="https://www.youtube.com/embed/${youtubeMatch[1]}" frameborder="0" allowfullscreen style="border-radius:12px;"></iframe></div>`;
                    } else if (supabaseMatch && supabaseMatch[0]) {
                        mediaHtml = `<div style="margin-bottom: 15px;"><img src="${supabaseMatch[0]}" style="width: 100%; max-height: 220px; object-fit: cover; border-radius: 12px;"></div>`;
                    }
                    
                    if (modalContent) {
                        modalContent.innerHTML = `${mediaHtml}<p style="color: #334155; font-size: 1rem; line-height: 1.5; margin-top: 10px;">${activeNews.content || 'Sem mais detalhes informados.'}</p>`;
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
                            
                            newsItem.innerHTML = `
                                <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
                                    ${thumbnailHtml}
                                    <div style="flex: 1; overflow: hidden;">
                                        <p class="news-text" style="font-size: 0.85rem; font-weight: 600; color: #1e293b; margin: 0; line-clamp: 2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${news.content || news.titulo}</p>
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

                fetchAndRender();
                return true;
            };

            if (!initContainer()) {
                document.addEventListener('DOMContentLoaded', () => initContainer());
            }
        }
    };

    // Tenta autoinicializar se o container já existir na página
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