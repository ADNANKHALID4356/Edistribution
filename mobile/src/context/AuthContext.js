import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '../services/authService';
import dbHelper from '../database/dbHelper';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize SQLite database first (critical for offline mode)
      console.log('🔄 Initializing database...');
      await dbHelper.init();
      console.log('✅ Database initialized');

      // Then check authentication status
      await checkAuthStatus();
    } catch (error) {
      console.error('❌ App initialization error:', error);
      setLoading(false);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const token = await authService.isAuthenticated();
      const savedUser = await authService.getCurrentUser();
      
      if (token && savedUser) {
        setUser(savedUser);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await authService.login({ username, password });
      if (response.success) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
      // Provide detailed error messages for debugging
      let message = 'Login failed. Please try again.';
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        message = 'Cannot connect to server. Please check:\n• Backend server is running\n• Both devices on same network\n• Server IP is correctly configured in Settings';
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        message = 'Connection timeout. Server not responding.\nCheck desktop app is running.';
      } else if (error.response?.status === 401) {
        message = 'Invalid username or password.\nPlease check your credentials.';
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message) {
        message = `Error: ${error.message}`;
      }
      
      return { success: false, message };
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
