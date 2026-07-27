// Mock completo do Supabase para testes
const supabaseMock = {
  auth: {
    getSession: jest.fn().mockResolvedValue({ 
      data: { session: { access_token: 'mock-token', user: { email: 'test@example.com' } } },
      error: null
    }),
    session: jest.fn(() => ({ access_token: 'mock-token' })),
    signInWithPassword: jest.fn().mockResolvedValue({ error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null })
  }
};

module.exports = {
  createClient: jest.fn(() => supabaseMock)
};