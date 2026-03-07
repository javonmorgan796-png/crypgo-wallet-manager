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

  const USER_CACHE_KEY = 'cachedUser';

  const getCachedUser = (): User | null => {
    try {
      const raw = localStorage.getItem(USER_CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  };

  const setCachedUser = (nextUser: User | null) => {
    if (!nextUser) {
      localStorage.removeItem(USER_CACHE_KEY);
      return;
    }

    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(nextUser));
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const isInvalidSessionResult = (result: any) => {
    const message = String(result?.message || result?.error || '').toLowerCase();
    return message.includes('no active session') || message.includes('user not found');
  };

  const checkAuth = async () => {
    try {
      const hasStoredSessionId = !!localStorage.getItem('sessionId');
      const cachedUser = hasStoredSessionId ? getCachedUser() : null;

      if (cachedUser) {
        setUser(cachedUser);
      }

      const maxAttempts = hasStoredSessionId ? 5 : 1;
      let result: any = { success: false };

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        result = await api.checkSession();

        if (result.success || isInvalidSessionResult(result)) {
          break;
        }

        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 450 * (attempt + 1)));
        }
      }

      let resolvedUser: User | null = cachedUser;

      if (result.success) {
        const payload = result as any;

        if (payload.sessionId) {
          localStorage.setItem('sessionId', payload.sessionId);
        }

        const userData = payload?.data?.data || payload?.data || payload;

        if (userData?.id || userData?._id) {
          resolvedUser = {
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
          };
          setCachedUser(resolvedUser);
        }
      } else if (hasStoredSessionId && isInvalidSessionResult(result)) {
        api.clearSessionId();
        resolvedUser = null;
        setCachedUser(null);
      }

      setUser(resolvedUser);
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(getCachedUser());
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await api.login(email, password);
      const resultPayload = result as any;

      

      if (result.success) {
        // Check for 2FA requirement before expecting user payload
        if (resultPayload.requires2FA) {
          setPending2FA(true);
          setIsLoading(false);
          return { success: true, requires2FA: true };
        }

        const responseData = resultPayload.data ?? resultPayload;

        // Extract user data
        let userData = null;
        if (responseData.data?.user) {
          userData = responseData.data.user;
        } else if (responseData.user) {
          userData = responseData.user;
        } else if (responseData.data?.id || responseData.data?._id) {
          userData = responseData.data;
        } else if (responseData.id || responseData._id) {
          userData = responseData;
        }

        if (!userData) {
          console.error('Could not extract user data from response:', result.data);
          setIsLoading(false);
          return { success: false, error: 'Invalid response from server. Please try again.' };
        }

        if (userData.is2FAEnabled) {
          setPending2FA(true);
          setIsLoading(false);
          return { success: true, requires2FA: true };
        }

        const userRole = userData.role || 'user';

        const userObj: User = {
          id: userData.id || userData._id,
          name: userData.name || email.split('@')[0],
          email: userData.email || email,
          role: userRole as 'user' | 'admin',
          isVerified: userData.isVerified ?? true,
          is2FAEnabled: userData.is2FAEnabled || false,
          kycStatus: userData.kycStatus || 'none',
          balance: userData.balance || 0,
          totalProfit: userData.totalProfit || 0,
          totalInvested: userData.totalInvested || 0,
          avatar: userData.avatar,
          referralCode: userData.referralCode,
          createdAt: userData.createdAt || new Date().toISOString(),
        };

        setCachedUser(userObj);
        setUser(userObj);
        setIsLoading(false);
        return { success: true, isAdmin: userRole === 'admin' };
      }

      setIsLoading(false);
      return { success: false, error: result.error || 'Login failed. Please check your credentials.' };
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      return { success: false, error: 'Login failed. Please try again.' };
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

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    api.clearSessionId();
    setCachedUser(null);
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
