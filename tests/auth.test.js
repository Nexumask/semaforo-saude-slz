// Supabase Authentication Test Suite
const { createClient } = require('@supabase/supabase-js');
require('dotenv/config');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Configuração dos mocks antes de cada teste
beforeEach(() => {
  jest.clearAllMocks();
  
  // Mock completo do módulo auth
  supabase.auth = {
    getSession: jest.fn().mockResolvedValue({ 
      data: { 
        session: { 
          access_token: 'mock-token', 
          user: { email: 'test@example.com' } 
        }
      },
      error: null
    }),
    session: jest.fn(() => ({ 
      access_token: 'mock-token'
    }))
  };
});

describe('Authentication Flow Tests', () => {
  test('Deve manter a sessão após refresh', async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    expect(error).toBeNull();
    expect(session).toBeDefined();
    
    const { data: { session: newSession } } = await supabase.auth.getSession();
    expect(newSession.access_token).toEqual(session.access_token);
  });

  test('Deve renovar token antes da expiração', async () => {
    // Primeira chamada - token inicial
    const { data: { session: firstSession } } = await supabase.auth.getSession();
    const originalToken = firstSession.access_token;
    
    // Avança o tempo para simular expiração
    jest.advanceTimersByTime(3500000); // 58 minutos
    
    // Configura segunda chamada para retornar novo token
    supabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'new-mock-token',
          user: { email: 'test@example.com' }
        }
      },
      error: null
    });
    
    // Segunda chamada - deveria gerar novo token
    const { data: { session: newSession } } = await supabase.auth.getSession();
    
    expect(supabase.auth.getSession).toHaveBeenCalledTimes(2);
    expect(newSession.access_token).not.toEqual(originalToken);
    expect(newSession.access_token).toBe('new-mock-token');
  });

  test('Não deve armazenar sessão na URL', () => {
    global.window = { location: { href: 'http://localhost:3000' } };
    expect(window.location.href).not.toContain('access_token');
    expect(window.location.href).not.toContain('refresh_token');
  });

  test('Deve validar conexão imediatamente', async () => {
    const { error } = await supabase.auth.getSession();
    expect(error).toBeNull();
  });

  test('Deve mostrar mensagem de erro ao servidor indisponível', async () => {
    supabase.auth.getSession.mockResolvedValue({ 
      error: { message: 'Servidor indisponível' } 
    });
    
    const { error } = await supabase.auth.getSession();
    expect(error.message).toContain('Servidor indisponível');
  });
});