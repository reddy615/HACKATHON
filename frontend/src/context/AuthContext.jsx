import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('cartrescue_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        setUser(response.data?.data?.user || null);
      } catch (error) {
        localStorage.removeItem('cartrescue_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  const persistAuthSession = (userData, newToken) => {
    localStorage.setItem('cartrescue_token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const login = async (payload) => {
    const response = await api.post('/auth/login', payload);
    const { user: userData, token: newToken } = response.data.data;
    persistAuthSession(userData, newToken);
    return response.data;
  };

  const register = async (payload) => {
    const response = await api.post('/auth/register', payload);
    const { user: userData, token: newToken } = response.data.data;
    persistAuthSession(userData, newToken);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('cartrescue_token');
    setUser(null);
    setToken(null);
  };

  const value = useMemo(() => ({ user, token, loading, login, register, logout }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
