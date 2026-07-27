// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: key => store[key],
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: key => {
      delete store[key];
    }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock Supabase auth methods
jest.mock('../assets/supabase.js', () => ({
  auth: {
    getSession: jest.fn(() => Promise.resolve({ 
      data: { session: { access_token: 'mock-token' } }
    })),
    session: jest.fn(() => ({ 
      access_token: 'mock-token'
    }))
  }
}));