// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Hidrata o estado do usuário no carregamento
  useEffect(() => {
    const stored = localStorage.getItem('genius_user');
    const token  = localStorage.getItem('genius_token');
    if (stored && token) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  async function login(email, password) {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem('genius_token', data.token);
    localStorage.setItem('genius_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem('genius_token');
    localStorage.removeItem('genius_user');
    setUser(null);
  }

  const isCollaborator = user?.role === 'COLLABORATOR' || user?.role === 'ADMIN';
  const isClient       = user?.role === 'CLIENT';
  const isAdmin        = user?.role === 'ADMIN';
  const isExecutive    = user?.role === 'EXECUTIVE' || user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isCollaborator, isClient, isAdmin, isExecutive }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
};
