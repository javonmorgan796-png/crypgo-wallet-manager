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
  balance: number;
  totalProfit: number;
  totalInvested: number;
  avatar?: string;
  referralCode?: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requires2FA?: boolean }>;
  signup: (name: string, email: string, password: string, referralCode?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  verify2FA: (code: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
          setUser({
            id: result.data.id || result.data._id,
            name: result.data.name,
            email: result.data.email,
            role: result.data.role || 'user',
            isVerified: result.data.isVerified || false,
            is2FAEnabled: result.data.is2FAEnabled || false,
            kycStatus: result.data.kycStatus || 'none',
            balance: result.data.balance || 0,
            totalProfit: result.data.totalProfit || 0,
            totalInvested: result.data.totalInvested || 0,
            avatar: result.data.avatar,
            referralCode: result.data.referralCode,
            createdAt: result.data.createdAt,
          });
        } else {
          // Token invalid, clear it
          api.clearToken();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        api.clearToken();
      }
    }
    setIsLoading(false);
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await api.login(email, password);
      
      if (result.success && result.data) {
        // Handle both response structures: result.data.user or result.data directly
        const userData = result.data.user || result.data;
        
        if (!userData || (!userData.id && !userData._id)) {
          console.error('Invalid user data received:', result.data);
          return { success: false, error: 'Invalid response from server. Please try again.' };
        }
        
        if (userData.is2FAEnabled) {
          setPending2FA(true);
          return { success: true, requires2FA: true };
        }
        
        // Set user data from login response
        setUser({
          id: userData.id || userData._id,
          name: userData.name,
          email: userData.email,
          role: userData.role || 'user',
          isVerified: userData.isVerified || false,
          is2FAEnabled: userData.is2FAEnabled || false,
          kycStatus: userData.kycStatus || 'none',
          balance: userData.balance || 0,
          totalProfit: userData.totalProfit || 0,
          totalInvested: userData.totalInvested || 0,
          avatar: userData.avatar,
          referralCode: userData.referralCode,
          createdAt: userData.createdAt,
        });
        return { success: true };
      }
      
      return { success: false, error: result.error || 'Login failed. Please check your credentials.' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string, referralCode?: string) => {
    setIsLoading(true);
    try {
      const result = await api.signup(name, email, password, referralCode);
      
      if (result.success) {
        return { success: true };
      }
      
      return { success: false, error: result.error || 'Signup failed. Please try again.' };
    } catch (error) {
      console.error('Signup error:', error);
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
    setUser(null);
    setPending2FA(false);
  };

  const refreshUser = async () => {
    try {
      const result = await api.getProfile();
      if (result.success && result.data) {
        setUser({
          id: result.data.id || result.data._id,
          name: result.data.name,
          email: result.data.email,
          role: result.data.role || 'user',
          isVerified: result.data.isVerified || false,
          is2FAEnabled: result.data.is2FAEnabled || false,
          kycStatus: result.data.kycStatus || 'none',
          balance: result.data.balance || 0,
          totalProfit: result.data.totalProfit || 0,
          totalInvested: result.data.totalInvested || 0,
          avatar: result.data.avatar,
          referralCode: result.data.referralCode,
          createdAt: result.data.createdAt,
        });
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
