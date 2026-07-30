// Configuração inicial do Supabase - versão modular segura
let currentNewsList = [];
let currentNewsIndex = 0;
let carouselInterval;

(function() {
    // Garante que Supabase está disponível globalmente
    if (typeof window.supabase === 'undefined') {
        throw new Error('Supabase não foi carregado. Certifique-se que assets/supabase.js está sendo importado antes deste script');
    }
    
    // Obtém credenciais (prioridade: window > localStorage > env)
    const supabaseUrl = window.SUPABASE_URL || localStorage.getItem('SUPABASE_URL') || '';
    const supabaseKey = window.SUPABASE_KEY || localStorage.getItem('SUPABASE_KEY') || '';
    
    // Cria nova instância se necessário
    const supabaseClient = window.supabase.createClient(
        supabaseUrl,
        supabaseKey
    );

    window.$newsAPI = {
        saveNews: async function(content) {
            try {
                const { data, error } = await supabaseClient
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
        
        getLatestNews: async function() {
            try {
                const { data, error } = await supabaseClient
                    .from('footer_news')
                    .select('content, created_at')
                    .order('created_at', { ascending: false })
                    .limit(5);
                
                if (error) throw error;
                return data || [];
            } catch (error) {
                console.error('Erro ao buscar notícias:', error);
                throw error;
            }
        },
        
        startNewsCarousel: function(newsContainerId, interval = 7000) {
            console.log('[DEBUG] Iniciando carrossel para container:', newsContainerId);
            const container = document.getElementById(newsContainerId);
            if (!container) {
                console.error('Container de notícias não encontrado');
                return;
            }
            console.log('[DEBUG] Container encontrado:', container);
            
            currentNewsIndex = 0;
            
        const updateNewsDisplay = () => {
            if (currentNewsList.length === 0) return;
            
            container.style.opacity = 0;
            
            setTimeout(() => {
                const newsItem = document.createElement('div');
                newsItem.style.display = 'flex';
                newsItem.style.alignItems = 'center';
                newsItem.style.gap = '10px';
                newsItem.style.cursor = 'pointer';
                newsItem.dataset.content = currentNewsList[currentNewsIndex].content;
                newsItem.dataset.index = currentNewsIndex;
                
                // Extrai URL de imagem ou ID do YouTube do conteúdo
                const content = currentNewsList[currentNewsIndex].content;
                let thumbnailHtml = '';
                
                // Verifica se há URL do YouTube
                const youtubeMatch = content.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                // Verifica se há URL de imagem do Supabase
                const supabaseMatch = content.match(/https?:\/\/[^\s]+\.supabase\.co[^\s]+\.(jpg|jpeg|png|gif)/i);
                
                if (youtubeMatch && youtubeMatch[1]) {
                    thumbnailHtml = `<img src="https://img.youtube.com/vi/${youtubeMatch[1]}/hqdefault.jpg" style="width: 80px; height: 45px; object-fit: cover; border-radius: 4px;">`;
                } else if (supabaseMatch && supabaseMatch[0]) {
                    thumbnailHtml = `<img src="${supabaseMatch[0]}" style="width: 80px; height: 45px; object-fit: cover; border-radius: 4px;">`;
                } else {
                    // Fallback: ícone padrão quando não há mídia
                    thumbnailHtml = '<div style="width: 80px; height: 45px; background: #e2e8f0; display: flex; align-items: center; justify-content: center; border-radius: 4px;">📰</div>';
                }
                
                newsItem.innerHTML = `${thumbnailHtml}<div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${content}</div>`;
                
                container.innerHTML = '';
                container.appendChild(newsItem);
                container.style.opacity = 1;
                
                console.log('[DEBUG] Texto mudou. Índice atual:', currentNewsIndex, 'Notícia:', currentNewsList[currentNewsIndex]?.content);
                
                currentNewsIndex = (currentNewsIndex + 1) % currentNewsList.length;
            }, 500); // Tempo para a transição de fade-out
            };
            
            // Delegation de evento para o container pai
            console.log('[DEBUG] Tentando vincular ouvinte de clique ao container:', document.getElementById('news-container'));
            
            container.addEventListener('click', (e) => {
                console.log('[DEBUG] CLIQUE DETECTADO NO RODAPÉ!', e.target);
                
                if (e.target !== container && currentNewsList.length > 0) {
                    const modal = document.getElementById('noticia-modal');
                    const modalContent = document.getElementById('modal-conteudo');
                    const modalTitle = document.getElementById('modal-titulo');
                    
                    if (modal && modalContent && modalTitle) {
                        const clickedIndex = parseInt(e.currentTarget.firstChild.dataset.index);
                        const activeNews = currentNewsList[clickedIndex];
                        console.log('[DEBUG] Dados da notícia clicada:', activeNews, 'Índice:', clickedIndex);
                        
                        modalTitle.textContent = 'Notícia Completa';
                        
                        // Extrai URL de imagem ou ID do YouTube do conteúdo
                        const content = activeNews.content;
                        let mediaHtml = '';
                        
                        // Verifica se há URL do YouTube
                        const youtubeMatch = content.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                        // Verifica se há URL de imagem do Supabase
                        const supabaseMatch = content.match(/https?:\/\/[^\s]+\.supabase\.co[^\s]+\.(jpg|jpeg|png|gif)/i);
                        
                        if (youtubeMatch && youtubeMatch[1]) {
                            mediaHtml = `<div style="margin-bottom: 15px;"><img src="https://img.youtube.com/vi/${youtubeMatch[1]}/hqdefault.jpg" style="width: 100%; max-height: 180px; object-fit: cover; border-radius: 8px;"></div>`;
                        } else if (supabaseMatch && supabaseMatch[0]) {
                            mediaHtml = `<div style="margin-bottom: 15px;"><img src="${supabaseMatch[0]}" style="width: 100%; max-height: 180px; object-fit: cover; border-radius: 8px;"></div>`;
                        }
                        
                        modalContent.innerHTML = `${mediaHtml}<p style="color: #334155; font-size: 1rem; line-height: 1.5;">${content || 'Conteúdo não disponível'}</p>`;
                        modal.style.display = 'flex';
                        clearInterval(carouselInterval);
                    } else {
                        console.log('[DEBUG] Elementos do modal não encontrados:', {modal, modalContent, modalTitle});
                    }
                }
            });
            
            const fetchAndStart = async () => {
                try {
                    console.log('[DEBUG] Iniciando busca de notícias no Supabase');
                    currentNewsList = await this.getLatestNews();
                    console.log('[DEBUG] Notícias recebidas:', currentNewsList);
                    
                    if (currentNewsList.length === 0) {
                        container.textContent = 'Nenhuma notícia disponível';
                        return;
                    }
                    
                    if (currentNewsList.length === 1) {
                        container.textContent = currentNewsList[0].content;
                        return;
                    }
                    
                    updateNewsDisplay();
                    carouselInterval = setInterval(updateNewsDisplay, interval);
                    console.log('[DEBUG] Carrossel iniciado com sucesso');
                } catch (error) {
                    console.error('Erro ao iniciar carrossel:', error);
                }
            };
            
            // Inicia imediatamente ao carregar
            console.log('[DEBUG] Iniciando carregamento do carrossel');
            fetchAndStart();
        }
    };
})();

