# Semáforo da Saúde - Estado do Projeto

## Contexto
- Aplicação estática para deploy no Cloudflare Workers.
- Ambiente: Windows nativo (sem Docker/Dev Containers), Node.js, Wrangler CLI.
- **Plataforma oficial: Cloudflare Workers** (escolhida para médio-longo prazo, escalabilidade e futuro app Android/iOS).
- **Cloudflare Pages: descontinuado** — não receberá mais deploys.

## Estado Atual
- Limpeza do ambiente (Docker/Dev Containers) concluída com sucesso.
- Ferramentas verificadas:
  - Node.js v24.16.0 (operacional)
  - npm v11.13.0 (operacional)
  - Wrangler v4.116.0 (operacional)
- Deploy em produção (oficial): [https://semaforo-saude-slz.semaforodasaude.workers.dev/](https://semaforo-saude-slz.semaforodasaude.workers.dev/) (HTTP 200 OK).
- ~~Cloudflare Pages: [https://semaforo-saude-slz.pages.dev/](https://semaforo-saude-slz.pages.dev/)~~ — **descontinuado** (não recebe mais deploys).
- Pipeline automático via GitHub Actions (Wrangler → Workers) operacional.
- Deploy manual: `npm run deploy`.

## Integração com Supabase

### Funcionalidades Implementadas:
1. **Autenticação**:
   - Login via Supabase (Email/Senha) 100% funcional.
   - Fluxos de cadastro, login e recuperação de senha operacionais.

2. **Notícias**:
   - Tabela `footer_news` configurada e integrada ao Supabase.
   - Formulário para atualização de notícias.
   - Exibição automática no rodapé do `index.html`.

3. **Carrossel de Notícias**:
   - Exibição automática das últimas notícias.
   - Suporte para imagens do Supabase e vídeos do YouTube.
   - Transições suaves e modal responsivo.

## Correções Aplicadas (08/05/2026)

### 1. `assets/footer-news.js` — Remoção de credenciais hardcoded
- **Antes:** URL e chave do Supabase hardcoded em múltiplos fallbacks.
- **Depois:** Reutiliza `window._supabase` global; fallback via `window.SUPABASE_URL`/`window.SUPABASE_KEY` do `config.js`.
- **Adicionado:** Autoinicialização do carrossel (DOMContentLoaded) — única fonte de inicialização.

### 2. `assets/admin.js` — Lista de admins centralizada
- **Antes:** Lista de e-mails admin duplicada inline.
- **Depois:** Constante `ADMIN_EMAILS` + função `isAdmin(email)` no topo do arquivo.
- **Correção:** `window.$newsAPI.supabase` → `window._supabase` (propriedade inexistente).

### 3. `assets/auth.js` — Logout otimizado
- **Antes:** `location.reload()` após signOut.
- **Depois:** Removido reload — `onAuthStateChange` atualiza a UI automaticamente.

### 4. `index.html` — Remoção de dupla inicialização do carrossel
- **Antes:** Carrossel inicializado tanto pelo `footer-news.js` quanto pelo `DOMContentLoaded`.
- **Depois:** Apenas `footer-news.js` inicializa.

### 5. `painel.html` — Inicialização do cliente Supabase
- **Adicionado:** Inicialização de `window._supabase` no `inicializarPainel()`.

## Credenciais

### Supabase API
- **URL:** `https://ecphyqttiffjwqnebolm.supabase.co`
- **Key (anon):** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjcGh5cXR0aWZmandxbmVib2xtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNzM0NDgsImV4cCI6MjA5NTY0OTQ0OH0.ZiZnzsbWPR0zgBQBXR0mj3otQ5xe4uxxFxobZMW82BM`

### E-mails admin (acesso ao Painel Admin)
- `admin@teste.com`
- `seu_email@exemplo.com`
- `teste@semaforo.com`

### Senhas
- **Não estão no código.** Devem ser criadas no painel do Supabase (Authentication → Users) para um dos e-mails admin acima.

## Testes
- **5/5 testes passando** (`npm test`): Suíte de autenticação validada.

## Próximos Passos
- Monitorar engajamento e exibição de notícias em produção.
- Adicionar mais funcionalidades conforme necessário.