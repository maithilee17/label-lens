import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('labellens_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('labellens_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyUser() {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.user);
            localStorage.setItem('labellens_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.error('[Auth] Token verification failed:', err);
          logout();
        }
      }
      setLoading(false);
    }
    verifyUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('labellens_token', res.data.token);
      localStorage.setItem('labellens_user', JSON.stringify(res.data.user));
      return res.data;
    }
  };

  const register = async (name, email, password, confirmPassword) => {
    const res = await api.post('/auth/register', { name, email, password, confirmPassword });
    if (res.data.success) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('labellens_token', res.data.token);
      localStorage.setItem('labellens_user', JSON.stringify(res.data.user));
      return res.data;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('labellens_token');
    localStorage.removeItem('labellens_user');
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('labellens_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
