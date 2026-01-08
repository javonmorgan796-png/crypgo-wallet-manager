import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  isVerified: boolean;
  is2FAEnabled: boolean;
  kycStatus: 'none' | 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requires2FA?: boolean }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  verify2FA: (code: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user for demo purposes (remove when backend is ready)
const mockUser: User = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'user',
  isVerified: true,
  is2FAEnabled: false,
  kycStatus: 'none',
  createdAt: '2024-01-01',
};

const mockAdminUser: User = {
  id: 'admin-1',
  name: 'Admin User',
  email: 'admin@greenbull.com',
  role: 'admin',
  isVerified: true,
  is2FAEnabled: true,
  kycStatus: 'approved',
  createdAt: '2023-01-01',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pending2FA, setPending2FA] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const result = await api.getProfile();
        if (result.success && result.data) {
          setUser(result.data);
        } else {
          // Demo mode: check for mock login
          const mockLogin = localStorage.getItem('mock_user');
          if (mockLogin === 'admin') {
            setUser(mockAdminUser);
          } else if (mockLogin === 'user') {
            setUser(mockUser);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Demo mode fallback
        const mockLogin = localStorage.getItem('mock_user');
        if (mockLogin === 'admin') {
          setUser(mockAdminUser);
        } else if (mockLogin === 'user') {
          setUser(mockUser);
        }
      }
    }
    setIsLoading(false);
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await api.login(email, password);
      
      if (result.success) {
        if (result.data?.user?.is2FAEnabled) {
          setPending2FA(true);
          return { success: true, requires2FA: true };
        }
        setUser(result.data?.user);
        return { success: true };
      }
      
      // Demo mode: allow mock login
      if (email === 'admin@greenbull.com' && password === 'admin123') {
        localStorage.setItem('auth_token', 'mock-admin-token');
        localStorage.setItem('mock_user', 'admin');
        setUser(mockAdminUser);
        return { success: true };
      }
      
      // Demo mode: regular user
      localStorage.setItem('auth_token', 'mock-user-token');
      localStorage.setItem('mock_user', 'user');
      setUser(mockUser);
      return { success: true };
      
    } catch (error) {
      return { success: false, error: 'Login failed. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await api.signup(name, email, password);
      
      if (result.success) {
        return { success: true };
      }
      
      // Demo mode: simulate successful signup
      return { success: true };
      
    } catch (error) {
      return { success: false, error: 'Signup failed. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const verify2FA = async (code: string) => {
    try {
      const result = await api.verify2FA(code);
      
      if (result.success) {
        setPending2FA(false);
        await refreshUser();
        return { success: true };
      }
      
      return { success: false, error: 'Invalid 2FA code' };
    } catch (error) {
      return { success: false, error: '2FA verification failed' };
    }
  };

  const logout = () => {
    api.clearToken();
    localStorage.removeItem('mock_user');
    setUser(null);
    setPending2FA(false);
  };

  const refreshUser = async () => {
    try {
      const result = await api.getProfile();
      if (result.success && result.data) {
        setUser(result.data);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        login,
        signup,
        logout,
        verify2FA,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
