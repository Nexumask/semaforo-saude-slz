// footer-news.js - Módulo de notícias do rodapé (carrossel)
let currentNewsList = [];
let currentNewsIndex = 0;
let carouselInterval = null;

(function() {
    // ------------------------------------------------------------------
    // HELPERS DO MODAL DE NOTÍCIA
    // O modal SEMPRE incorpora o vídeo (iframe) de forma consistente.
    // NÃO há mais redirecionamento externo para o YouTube (window.open /
    // links "Abrir link externo") — qualquer reprodução deve ocorrer
    // dentro do próprio modal.
    // ------------------------------------------------------------------
    // Aceita youtube.com, youtube-nocookie.com e youtu.be, com ou sem www.
    const YOUTUBE_ID_REGEX = /(?:youtube(?:-nocookie)?\.com\/(?:watch\?[^#\s&]*v=|embed\/|live\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

    function extrairVideoYouTube(texto) {
        if (!texto) return null;
        const match = String(texto).match(YOUTUBE_ID_REGEX);
        return match ? match[1] : null;
    }

    // Monta uma "fonte de busca" a partir de todos os campos do item, de
    // forma que a URL do YouTube seja encontrada onde quer que esteja.
    function montarFonteBusca(item) {
        if (!item) return '';
        const partes = [];
        Object.keys(item).forEach(function (chave) {
            try {
                var valor = item[chave];
                if (typeof valor === 'object' || typeof valor === 'function') return;
                if (valor === null || valor === undefined) return;
                partes.push(String(valor));
            } catch (e) { /* ignora campos não serializáveis */ }
        });
        // Garante que props aninhadas sejam contempladas no pior caso.
        try { partes.push(JSON.stringify(item)); } catch (e) { /* noop */ }
        return partes.join(' \n ');
    }

    // Limpa pontuações que porventura fiquem grudadas na URL
    // (ex.: "(https://youtu.be/abc123)" ou "abc123,") e tenta extrair o ID.
    function extrairVideoIDviaLimpeza(texto) {
        if (!texto) return null;
        // Primeira tentativa: direto (com a regex ampliada, cobre também o
        // formato markdown "[url](url)" sem precisar de limpeza).
        let candidato = extrairVideoYouTube(texto);
        if (candidato) return candidato;

        // Segunda tentativa: se o campo tiver embutido a URL em formato
        // Markdown "[texto](url)", "perdoa" colchetes e parênteses.
        const semMarkdown = String(texto).replace(/[[\]()]/g, ' ');
        candidato = extrairVideoYouTube(semMarkdown);
        if (candidato) return candidato;

        return null;
    }

    // Determina o tipo de mídia da notícia: 'video' (YouTube) ou 'image'.
    function resolverTipoMidia(news) {
        const fonteBusca = montarFonteBusca(news);
        return extrairVideoIDviaLimpeza(fonteBusca) ? 'video' : 'image';
    }

    // Resolve a URL exibida no card: thumbnail do YouTube (vídeo) ou imagem.
    function resolverUrlMidia(news, tipo) {
        const fonteBusca = montarFonteBusca(news);
        if (tipo === 'video') {
            const videoId = extrairVideoIDviaLimpeza(fonteBusca);
            return videoId ? 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg' : '';
        }
        const imagemMatch = fonteBusca.match(/https?:\/\/[^\s"')]+\.(?:jpe?g|png|gif|webp)(?:\?[^\s"')]*)?/i);
        return imagemMatch ? imagemMatch[0] : '';
    }

    // Remove qualquer tag HTML residual de textos vindos do banco (ex.: títulos
    // salvos com <a href="...">) antes de injetá-los no DOM.
    function limparTextoHtml(texto) {
        return String(texto || '')
            .replace(/<[^>]*>?/gm, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Exibe "FONTE:" apenas uma vez: o banco já grava "FONTE: GOOGLE NEWS" e o
    // front não deve prefixar "Fonte: " novamente.
    function formatarFonte(fonte) {
        const f = String(fonte || '').trim();
        if (!f) return '';
        return /^fonte:/i.test(f) ? f : `Fonte: ${f}`;
    }

    // Extrai a URL real do link externo (coluna url_video), perdoando formatos
    // Markdown "[texto](url)", tags <a href="..."> e caracteres residuais.
    function extrairUrlReal(texto) {
        if (!texto) return '';
        let url = String(texto).trim();

        const matchMd = url.match(/\(((?:https?:)?\/\/[^)\s]+)\)/);
        if (matchMd && matchMd[1]) url = matchMd[1];

        const matchHref = url.match(/href=["']([^"']+)["']/i);
        if (matchHref && matchHref[1]) url = matchHref[1];

        url = url.replace(/[\[\]()]/g, '').trim();
        if (/^\/\//.test(url)) url = 'https:' + url;

        return /^https?:\/\//i.test(url) ? url : '';
    }

    // Sincroniza o indicador (dot) ativo com o card visível no carrossel.
    function atualizarDotAtivo(containerDots, indiceAtivo) {
        if (!containerDots) return;
        Array.prototype.forEach.call(containerDots.children, (dot, i) => {
            dot.classList.toggle('active', i === indiceAtivo);
        });
    }


    function abrirModal(activeNews) {
        if (!activeNews) return;

        const modal = document.getElementById('noticia-modal');
        const modalContent = document.getElementById('modal-conteudo');
        const modalTitle = document.getElementById('modal-titulo');
        const modalFonte = document.getElementById('modal-fonte');
        if (!modal || !modalContent) return;

        if (modalTitle) modalTitle.textContent = limparTextoHtml(activeNews.titulo) || 'Notícia Completa';
        if (modalFonte) modalFonte.textContent = formatarFonte(activeNews.fonte);

        // Busca o link do YouTube onde quer que esteja (content, url_video,
        // ou qualquer outro campo do item).
        const fonteBusca = montarFonteBusca(activeNews);
        const videoId = extrairVideoIDviaLimpeza(fonteBusca) || extrairVideoYouTube(activeNews.url_video);
        const imagemMatch = fonteBusca.match(/https?:\/\/[^\s"')]+\.(?:jpe?g|png|gif|webp)(?:\?[^\s"')]*)?/i);

        // Remove qualquer URL (YouTube/imagem) e tag HTML do texto visível para não poluir a leitura.
        const textoLimpo = limparTextoHtml(
            (activeNews.content || 'Sem mais detalhes informados.').replace(/https?:\/\/\S+/g, '')
        ) || 'Sem mais detalhes informados.';

        // Limpa o conteúdo e adiciona o texto da notícia.
        modalContent.innerHTML = '';
        const paragrafo = document.createElement('p');
        paragrafo.textContent = textoLimpo;
        paragrafo.style.cssText = 'color: #334155; font-size: 1rem; line-height: 1.5; margin-top: 10px; white-space: pre-line;';

        if (videoId) {
            // ------------------------------------------------------------
            // VÍDEO EMBUTIDO (comportamento canônico).
            //
            // Técnica "padding-top" 56.25%: mantém a proporção 16:9 sem
            // depender de aspect-ratio (que colapsava a altura para ~0 e
            // escondia o player, sobrando apenas o texto). O iframe é
            // criado via DOM API para evitar erros de parsing de HTML.
            // ------------------------------------------------------------
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'position: relative; width: 100%; height: 0; padding-top: 56.25%;' +
                ' margin-bottom: 15px; border-radius: 12px; overflow: hidden; background: #0f172a;';

            const iframe = document.createElement('iframe');
            // youtube-nocookie evita cookies de rastreio de terceiros.
            iframe.src = 'https://www.youtube-nocookie.com/embed/' + videoId + '?rel=0&modestbranding=1&color=white&autoplay=1';
            iframe.title = 'Vídeo da notícia';
            iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
            iframe.setAttribute('allowfullscreen', '');
            iframe.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;';

            wrapper.appendChild(iframe);
            modalContent.appendChild(wrapper);
        } else if (imagemMatch && imagemMatch[0]) {
            const figura = document.createElement('div');
            figura.style.cssText = 'position: relative; width: 100%; margin-bottom: 15px; border-radius: 12px;' +
                ' overflow: hidden; background: #f1f5f9; display: flex; align-items: center; justify-content: center;';

            const img = document.createElement('img');
            img.src = imagemMatch[0];
            img.alt = 'Imagem da notícia';
            img.style.cssText = 'width: 100%; max-height: 220px; object-fit: cover; display: block;';

            figura.appendChild(img);
            modalContent.appendChild(figura);
        }

        modalContent.appendChild(paragrafo);
        modal.style.display = 'flex';
    }

    function abrirModalPorIndice(indice) {
        const idx = parseInt(indice, 10);
        if (isNaN(idx) || !currentNewsList[idx]) return;
        abrirModal(currentNewsList[idx]);
    }

    // Delegação global de eventos: registra UMA única vez e sobrevive a
    // re-renderizações do container (chamadas repetidas de startNewsCarousel,
    // reescritas de innerHTML, etc.), pois não depende de referência de nó.
    function garantirDelegacaoDeCliques() {
        if (window.__newsModalDelegacaoInstalada) return;
        window.__newsModalDelegacaoInstalada = true;

        // Clique no card: se a notícia tiver link externo (url_video), abre a
        // matéria original em nova aba. Sem link, abre o modal interno.
        document.addEventListener('click', (e) => {
            const item = e.target && e.target.closest ? e.target.closest('#news-container .news-item') : null;
            if (!item) return;
            // Controles do player já aberto no modal (iframe/vídeo/áudio) ficam de
            // fora para não interferir na reprodução.
            if (e.target.closest('iframe, video, audio')) return;
            e.preventDefault();

            const indice = item.dataset && item.dataset.index;
            const noticia = currentNewsList[parseInt(indice, 10)];
            const urlExterna = noticia ? extrairUrlReal(noticia.url_video || '') : '';

            if (urlExterna) {
                window.open(urlExterna, '_blank', 'noopener');
                return;
            }
            abrirModalPorIndice(indice);
        });

        // Limpa o player ao fechar o modal (botão X / backdrop), parando a reprodução.
        const limparAoFechar = () => {
            const conteudo = document.getElementById('modal-conteudo');
            if (conteudo) conteudo.innerHTML = '';
        };
        document.addEventListener('click', (e) => {
            if (!e.target) return;
            const clicouFechar = !!e.target.closest && e.target.closest('#fechar-modal');
            const clicouNoBackdrop = e.target.id === 'noticia-modal';
            if (clicouFechar || clicouNoBackdrop) {
                // Pequeno atraso para não sobrescrever o "display" definido pelo index.html.
                setTimeout(limparAoFechar, 0);
            }
        });
    }

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
            
            const admins = ['vonnis@gmail.com'];
            if (!admins.includes(fallbackUser.email)) throw new Error('Acesso restrito a administradores');
            return true;
        }
        
        const admins = ['vonnis@gmail.com'];
        if (!admins.includes(user.email)) throw new Error('Acesso restrito a administradores');
        return true;
    }

    // ------------------------------------------------------------------
    // LEITURA ANTI-CACHE DO SUPABASE (fetch REST nativo)
    // ------------------------------------------------------------------
    // O PWA estava mantendo respostas da API do Supabase no cache local,
    // impedindo o usuário de ver as notícias atualizadas do cron sem
    // limpar o cache do navegador. Toda LEITURA deste módulo passa por
    // `lerSupabaseAntiCache()`, que usa:
    //   - `cache: 'no-store'`        -> proíbe o navegador de reutilizar
    //   - `&_t=${Date.now()}`        -> cache-busting (URL sempre inédita)
    // Assim a requisição traz SEMPRE o estado em tempo real do banco.
    function cabecalhosSupabase() {
        return {
            'apikey': window.SUPABASE_KEY,
            'Authorization': 'Bearer ' + window.SUPABASE_KEY,
            'Accept': 'application/json'
        };
    }

    // GET anti-cache ao endpoint REST do Supabase. Retorna o objeto
    // `{ data }` no mesmo formato do cliente supabase-js, permitindo
    // reaproveitar o Promise.allSettled + `.value.data` já existente.
    // `rotulo` identifica a tabela consultada ('footer_news' | 'noticias')
    // para os logs de erro abaixo (status 400/401/500, falha de rede/CORS).
    async function lerSupabaseAntiCache(url, rotulo) {
        let res;
        try {
            res = await fetch(url, {
                cache: 'no-store',
                headers: cabecalhosSupabase()
            });
        } catch (err) {
            // Falha de rede / CORS: log por tabela para diagnóstico no DevTools.
            if (rotulo === 'noticias') {
                console.error('Erro noticias:', err);
            } else {
                console.error('Erro footer_news:', err);
            }
            throw err;
        }
        if (!res.ok) {
            // Respostas 400/401/500 (ex.: RLS, coluna inexistente, chave inválida)
            // são capturadas e exibidas identificando a tabela que falhou.
            if (rotulo === 'noticias') {
                console.error('Erro noticias:', 'Supabase HTTP ' + res.status, url);
            } else {
                console.error('Erro footer_news:', 'Supabase HTTP ' + res.status, url);
            }
            throw new Error('Supabase HTTP ' + res.status);
        }
        const json = await res.json();
        return { data: Array.isArray(json) ? json : (json || []) };
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

                // Timestamp explícito: se a coluna `created_at` não tem default
                // `now()`, o post manual ficaría com NULL e o sort o mandaría ao
                // fundo (new Date(null) = 1970) até desaparecer da janela top-10.
                const nowIso = new Date().toISOString();

                // INSERT simples (SEM upsert e SEM chave única no JS): cada
                // publicação manual gera uma fila nova com id próprio — postagens
                // manuais múltiplas coexistem sem sobrescribirse.
                const { data, error } = await client
                    .from('footer_news')
                    .insert([{ content: textoFinal, created_at: nowIso }])
                    .select();

                if (error) throw error;
                if (!data || data.length === 0) {
                    // Escudo contra "falso éxito": quando uma policy RLS de INSERT
                    // bloqueia a fila, PostgREST pode responder 200 com array
                    // vazio — a publicação NÃO existe e não deve simular sucesso.
                    throw new Error('A publicação não foi confirmada pelo servidor — verifique as políticas RLS de INSERT em footer_news.');
                }
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
                    cache: 'no-store',
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
            console.log(`[deleteNews] Iniciando exclusão | id=${id} (${typeof id}) | table=${table}`);
            try {
                // Valida o id antes de prosseguir — evita exclusão sem critério.
                if (id === undefined || id === null || id === '') {
                    throw new Error('ID da notícia ausente ou inválido. Não é possível excluir.');
                }
                if (table !== 'noticias' && table !== 'footer_news') {
                    throw new Error(`Tabela não permitida: ${table}`);
                }

                await verificarAdmin();

                const client = getClient();
                if (!client) throw new Error('Cliente Supabase não configurado');

                // Converte o id para número inteiro antes de enviar.
                // (O log anterior acusava id=4 como STRING — PostgREST aceita, mas
                //  garantimos sempre um inteiro de verdade para evitar mismatch.)
                const idNum = parseInt(id, 10);
                if (Number.isNaN(idNum)) {
                    throw new Error(`ID inválido: '${id}' não é um número válido.`);
                }

                // ------------------------------------------------------------------
                // DELETE padrão do Supabase (PostgREST/REST) — SEM RPC.
                // A autorização fica por conta da RLS policy "noticias_admin_delete"
                // / "news_admin_delete" (role authenticated + e-mail do admin na USING).
                //
                // Usamos .select() para receber de volta as linhas excluídas:
                //   - exclusão ok  -> retorna as linhas apagadas (data.length > 0)
                //   - bloqueada    -> RLS barra e devolve 200 com [] (sem erro!)
                // Assim conseguimos detectar o bloqueio e mostrar erro real.
                // ------------------------------------------------------------------
                const { data, error } = await client
                    .from(table)
                    .delete()
                    .eq('id', idNum)
                    .select();

                if (error) throw error;

                const excluidas = (data && data.length) ? data.length : 0;
                console.log(`[deleteNews] DELETE padrão | id=${idNum} | table=${table} | excluidas=${excluidas}`);

                if (excluidas === 0) {
                    throw new Error(
                        `O DELETE foi bloqueado pela RLS policy ou o id não existe ` +
                        `(table='${table}', id=${idNum}).`
                    );
                }

                return data;
            } catch (error) {
                console.error('[deleteNews] Erro ao excluir notícia:', error);
                throw error;
            }
        },

        getAllNewsForAdmin: async function() {
            try {
                await verificarAdmin();
                const client = getClient();
                if (!client) throw new Error('Cliente Supabase não configurado');

                const [resFooter, resNoticias] = await Promise.allSettled([
                    lerSupabaseAntiCache(`${window.SUPABASE_URL}/rest/v1/footer_news?select=id,content,created_at&order=created_at.desc&_t=${Date.now()}`, 'footer_news'),
                    lerSupabaseAntiCache(`${window.SUPABASE_URL}/rest/v1/noticias?select=id,titulo,conteudo,fonte,url_video,criado_em&order=criado_em.desc&_t=${Date.now()}`, 'noticias')
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

                // -------------------------------------------------------------------
                // FIX ANTI-"SUMIÇO" das postagens manuais (footer_news).
                //
                // ANTES: .limit(5) por tabela + fusão + .slice(0,10). Quando a Edge
                // Function buscar-noticias-saude roda, o UPSERT refresca criado_em
                // de muitas filas de `noticias` ao "agora", empurrando a postagem
                // manual FORA da janela top-10 → desaperecía no próximo reload.
                //
                // AGORA: as publicações manuais (footer_news) têm PRIORIDADE MÁXIMA
                // e NUNCA são descartadas; as noticias RSS apenas preenchem os
                // slots restantes (até 10). O RSS NUNCA ultrapassa uma postagem
                // manual no índice do carrossel (pinning absoluto). Sort à prova
                // de NULL/datas inválidas.
                //
                // ANTI-STALE CACHE: leitura via fetch REST nativo com
                // `cache: 'no-store'` e `&_t=${Date.now()}` de cache-busting —
                // o PWA/SW não pode entregar resposta antiga da API depois que
                // o cron (buscar-noticias-saude) grava novas notícias.
                // -------------------------------------------------------------------
                const [resFooter, resNoticias] = await Promise.allSettled([
                    lerSupabaseAntiCache(`${window.SUPABASE_URL}/rest/v1/footer_news?select=id,content,created_at&order=created_at.desc&limit=20&_t=${Date.now()}`, 'footer_news'),
                    lerSupabaseAntiCache(`${window.SUPABASE_URL}/rest/v1/noticias?select=id,titulo,conteudo,fonte,url_video,criado_em&order=criado_em.desc&limit=20&_t=${Date.now()}`, 'noticias')
                ]);

                // Comparador seguro: datas nulas/inválidas vão ao fundo (0) em vez
                // de NaN — o sort anterior podia reordenar silenciosamente.
                const fechaTsn = (v) => {
                    if (!v) return 0;
                    const t = new Date(v).getTime();
                    return Number.isNaN(t) ? 0 : t;
                };
                const compararPorFecha = (a, b) => fechaTsn(b.created_at) - fechaTsn(a.created_at);

                const manuales = [];    // footer_news (postagem manual)
                const automaticas = []; // noticias (RSS)

                if (resFooter.status === 'fulfilled' && resFooter.value.data) {
                    resFooter.value.data.forEach(item => {
                        manuales.push({
                            id: item.id,
                            titulo: 'Plantão Informativo',
                            content: item.content,
                            fonte: 'Administração',
                            created_at: item.created_at,
                            tipo: resolverTipoMidia(item)
                        });
                    });
                }

                if (resNoticias.status === 'fulfilled' && resNoticias.value.data) {
                    resNoticias.value.data.forEach(item => {
                        automaticas.push({
                            id: item.id,
                            titulo: item.titulo,
                            // Não prefixamos o título aqui: o modal/card já o
                            // exibem em separado (evita "Título: Título: ...").
                            content: item.conteudo || '',
                            fonte: item.fonte || 'Saúde São Luís',
                            url_video: item.url_video,
                            created_at: item.criado_em,
                            tipo: resolverTipoMidia(item)
                        });
                    });
                }

                manuales.sort(compararPorFecha);
                automaticas.sort(compararPorFecha);
                // FIX PIN ABSOLUTO: o post institucional de boas-vindas
                // ("Conheça o Semáforo da Saúde...") fica SEMPRE cravado no
                // índice 0 do carrossel, aconteça o que aconteça com as datas.
                // As demais postagens manuais (footer_news) seguem na sequência
                // (índices 1, 2...) e o RSS só preenche os slots até 10.
                const normalizarTexto = (s) => {
                    const t = String(s || '').toLowerCase();
                    return typeof t.normalize === 'function'
                        ? t.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                        : t;
                };
                // Marcador de boas-vindas em forma NORMALIZADA (sem acentos/
                // cedilla): "Conheça o Semáforo da Saúde..." → "conheca o
                // semaforo da salud".
                const MARCA_BOAS_VENIDAS = 'conheca o semaforo da salud';
                const esBoasVendidas = (n) => normalizarTexto(n.content).includes(MARCA_BOAS_VENIDAS);

                const boasVendidas = [];
                const demaisManuais = [];
                manuales.forEach(n => {
                    (esBoasVendidas(n) ? boasVendidas : demaisManuais).push(n);
                });
                const manualesOrdenados = boasVendidas.concat(demaisManuais);

                // Dedupe por conteúdo: se o texto já é visível como manual, a
                // noticia RSS duplicada se descarta (nunca ao revés).
                const textosVisibles = new Set();
                manualesOrdenados.slice(0, 10).forEach(n => textosVisibles.add(String(n.content).trim()));

                const mezcladas = manualesOrdenados.slice(0, 10);
                for (const item of automaticas) {
                    if (mezcladas.length >= 10) break;
                    const clave = String(item.content || '').trim();
                    if (!clave || textosVisibles.has(clave)) continue;
                    textosVisibles.add(clave);
                    mezcladas.push(item);
                }

                return mezcladas;
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

                // Abertura do modal é 100% delegada no `document` (ver helpers do
                // topo do módulo). Isso garante consistência do iframe incorporado
                // e sobrevivência a re-renderizações do container.
                garantirDelegacaoDeCliques();

                // Centraliza um card específico no container (snap via smooth scroll).
                function scrollParaIndice(targetContainer, indice) {
                    const card = targetContainer.children[indice];
                    if (!card) return;
                    targetContainer.scrollTo({
                        left: card.offsetLeft - targetContainer.offsetLeft,
                        behavior: 'smooth'
                    });
                }

                function iniciarAutoplay() {
                    if (carouselInterval) clearInterval(carouselInterval);
                    carouselInterval = setInterval(() => {
                        currentNewsIndex = (currentNewsIndex + 1) % currentNewsList.length;
                        scrollParaIndice(container, currentNewsIndex);
                    }, interval);
                }

                function atualizarDotAtivo(dots, indice) {
                    if (!dots) return;
                    Array.from(dots.children).forEach((dot, i) => {
                        dot.classList.toggle('active', i === indice);
                    });
                }
                
                const fetchAndRender = async () => {
                    try {
                        currentNewsList = await this.getLatestNews();
                        container.innerHTML = '';
                        
                        if (currentNewsList.length === 0) {
                            container.innerHTML = '<div class="news-item"><p class="news-text">Nenhuma notícia disponível no momento.</p></div>';
                            return;
                        }

                        currentNewsList.forEach((news, index) => {
                            const tipoMidia = news.tipo === 'video' ? 'video' : 'image';
                            const urlMidia = resolverUrlMidia(news, tipoMidia);
                            
                            const newsItem = document.createElement('article');
                            newsItem.className = 'news-item';
                            newsItem.dataset.index = index;
                            
                            let midiaHtml = '';
                            if (urlMidia) {
                                midiaHtml = `<img class="news-media" src="${urlMidia}" alt="" loading="lazy">`;
                                if (tipoMidia === 'video') {
                                    midiaHtml += `
                                        <span class="news-play" role="img" aria-label="Assistir vídeo">
                                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                        </span>`;
                                }
                            } else {
                                midiaHtml = `<div class="news-media news-media--placeholder">📰</div>`;
                            }
                            
                            // Remove URL (http/https) e tags HTML do texto visível para não poluir o card
                            const exibirTexto = limparTextoHtml(
                                (news.content || news.titulo || '').replace(/https?:\/\/\S+/g, '')
                            ) || 'Clique para ver a notícia completa';
                            
                            newsItem.innerHTML = `
                                <div class="news-media-wrap">
                                    ${midiaHtml}
                                </div>
                                <div class="caption">
                                    <p class="news-text">${exibirTexto}</p>
                                    <span class="news-source">${formatarFonte(news.fonte) || 'Fonte: Geral'}</span>
                                </div>
                            `;
                            container.appendChild(newsItem);
                        });
                        
                        // Indicadores visuais (dots) da quantidade de notícias
                        const dotsContainer = document.getElementById('news-dots');
                        if (dotsContainer) {
                            dotsContainer.innerHTML = '';
                            currentNewsList.forEach((_, i) => {
                                const dot = document.createElement('button');
                                dot.type = 'button';
                                dot.className = 'news-dot' + (i === 0 ? ' active' : '');
                                dot.setAttribute('aria-label', 'Ir para a notícia ' + (i + 1));
                                dot.addEventListener('click', () => {
                                    if (carouselInterval) clearInterval(carouselInterval);
                                    currentNewsIndex = i;
                                    scrollParaIndice(container, currentNewsIndex);
                                    iniciarAutoplay();
                                });
                                dotsContainer.appendChild(dot);
                            });
                        }
                        
                        // Sincroniza os dots conforme o usuário arrasta o carrossel
                        container.addEventListener('scroll', () => {
                            const larguraCard = container.children[0] ? container.children[0].offsetWidth : 1;
                            const alvo = Math.round(container.scrollLeft / larguraCard);
                            const indice = Math.max(0, Math.min(alvo, currentNewsList.length - 1));
                            if (indice !== currentNewsIndex) {
                                currentNewsIndex = indice;
                                atualizarDotAtivo(dotsContainer, indice);
                            }
                        });
                        
                        if (currentNewsList.length > 1) {
                            currentNewsIndex = 0;
                            iniciarAutoplay();
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
