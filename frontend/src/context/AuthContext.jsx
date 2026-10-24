import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getAuthToken, getStoredUser, setAuthToken, setStoredUser, removeAuthToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser());
  const [token, setToken] = useState(getAuthToken());
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState(null);

  const checkStatus = async () => {
    try {
      const res = await api.getStatus();
      setSystemStatus(res.data);
      return res.data;
    } catch (err) {
      console.error('Failed to get system status:', err);
      return null;
    }
  };

  const loadUser = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.getMe();
      setUser(res.data);
      setStoredUser(res.data);
    } catch (err) {
      console.warn('Invalid token, logging out:', err.message);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus().then(() => {
      loadUser();
    });

    const handleUnauthorized = () => logout();
    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth-unauthorized', handleUnauthorized);
  }, [token]);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    const { token: newToken, user: newUser } = res.data;
    setAuthToken(newToken);
    setStoredUser(newUser);
    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  const logout = () => {
    removeAuthToken();
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const res = await api.getMe();
    setUser(res.data);
    setStoredUser(res.data);
    return res.data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        systemStatus,
        checkStatus,
        login,
        logout,
        refreshUser,
        isAuthenticated: !!token && !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

