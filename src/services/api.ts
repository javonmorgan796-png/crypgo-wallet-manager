// API Service for MongoDB Backend on Render.com
// Connected to live Render backend

const RENDER_API_URL = import.meta.env.VITE_RENDER_API_URL || 'https://greenbull-api.onrender.com/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = RENDER_API_URL;
    this.token = localStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const responseData = await response.json();

      if (!response.ok) {
        return { success: false, error: responseData.message || 'Request failed' };
      }

      // Backend already returns { success: true, data: ... } format
      // Return the response as-is if it has success field, otherwise wrap it
      if (responseData && typeof responseData.success === 'boolean') {
        return responseData;
      }

      return { success: true, data: responseData };
    } catch (error) {
      console.error('API Error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  // Authentication
  async login(email: string, password: string) {
    const result = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (result.success && result.data) {
      // Handle nested response structure from backend
      // Backend returns: { success: true, isAdmin: boolean, data: { token, user } }
      const responseData = result.data;
      const token = responseData.token || responseData.data?.token;
      
      if (token) {
        this.setToken(token);
      }
      
      // Return isAdmin from server response
      return {
        ...result,
        isAdmin: responseData.isAdmin === true
      };
    }

    return result;
  }

  async signup(name: string, email: string, password: string, referralCode?: string) {
    return this.request<{ token: string; user: any }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, referralCode }),
    });
  }

  async verifyEmail(token: string) {
    return this.request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async resendVerification(email: string) {
    return this.request('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async forgotPassword(email: string) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  // 2FA
  async enable2FA() {
    return this.request<{ qrCode: string; secret: string }>('/auth/2fa/enable', {
      method: 'POST',
    });
  }

  async verify2FA(code: string) {
    return this.request('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async disable2FA(code: string) {
    return this.request('/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  // User Profile
  async getProfile() {
    return this.request<any>('/user/profile');
  }

  async updateProfile(data: { name?: string; email?: string }) {
    return this.request('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request('/user/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // KYC
  async submitKYC(formData: FormData) {
    const response = await fetch(`${this.baseUrl}/kyc/submit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });
    return response.json();
  }

  async getKYCStatus() {
    return this.request<{ status: string; documents: any[] }>('/kyc/status');
  }

  // Wallet & Transactions
  async getWalletBalance() {
    return this.request<{ balance: number; currency: string }>('/wallet/balance');
  }

  async deposit(amount: number, method: string, receipt?: File) {
    const formData = new FormData();
    formData.append('amount', amount.toString());
    formData.append('method', method);
    if (receipt) {
      formData.append('receipt', receipt);
    }

    try {
      const response = await fetch(`${this.baseUrl}/wallet/deposit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.message || 'Deposit failed', message: data.message };
      }
      
      return data;
    } catch (error: any) {
      console.error('Deposit API error:', error);
      return { success: false, error: error.message || 'Network error', message: error.message };
    }
  }

  async withdraw(amount: number, address: string, method: string) {
    return this.request('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount, address, method }),
    });
  }

  async getTransactions(filters?: {
    type?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);

    return this.request<any[]>(`/transactions?${params.toString()}`);
  }

  // Notifications
  async getNotifications() {
    return this.request<any[]>('/notifications');
  }

  async markNotificationRead(id: string) {
    return this.request(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  // Referrals
  async getReferralInfo() {
    return this.request<{ code: string; referrals: any[]; earnings: number }>('/referral/info');
  }

  // Investments
  async getInvestmentPlans() {
    return this.request<any[]>('/investments/plans');
  }

  async getMyInvestments() {
    return this.request<any[]>('/investments/my-investments');
  }

  async createInvestment(planId: string, amount: number) {
    return this.request('/investments/create', {
      method: 'POST',
      body: JSON.stringify({ planId, amount }),
    });
  }

  async getInvestmentStats() {
    return this.request<any>('/investments/stats');
  }

  async cancelInvestment(id: string) {
    return this.request(`/investments/${id}/cancel`, {
      method: 'POST',
    });
  }

  // Copy Trading
  async getTraders() {
    return this.request<any[]>('/copy-trade/traders');
  }

  async getTrader(id: string) {
    return this.request<any>(`/copy-trade/traders/${id}`);
  }

  async startCopyTrade(traderId: string, amount: number, settings?: any) {
    return this.request('/copy-trade/copy', {
      method: 'POST',
      body: JSON.stringify({ traderId, amount, settings }),
    });
  }

  async getMyCopyTrades() {
    return this.request<any[]>('/copy-trade/my-copies');
  }

  async stopCopyTrade(id: string) {
    return this.request(`/copy-trade/stop/${id}`, {
      method: 'POST',
    });
  }

  async getCopyTradeStats() {
    return this.request<any>('/copy-trade/stats');
  }

  // Admin endpoints
  async adminGetUsers(page = 1, limit = 20) {
    return this.request<{ users: any[]; total: number }>(`/admin/users?page=${page}&limit=${limit}`);
  }

  async adminUpdateUser(userId: string, data: any) {
    return this.request(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async adminGetKYCRequests(status?: string) {
    return this.request<any[]>(`/admin/kyc?status=${status || 'pending'}`);
  }

  async adminApproveKYC(userId: string) {
    return this.request(`/admin/kyc/${userId}/approve`, {
      method: 'POST',
    });
  }

  async adminRejectKYC(userId: string, reason: string) {
    return this.request(`/admin/kyc/${userId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async adminGetTransactions(filters?: { type?: string; status?: string; page?: number; limit?: number }) {
    const params = new URLSearchParams();
    if (filters?.type && filters.type !== 'undefined') params.append('type', filters.type);
    if (filters?.status && filters.status !== 'undefined') params.append('status', filters.status);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    return this.request<any[]>(`/admin/transactions?${params.toString()}`);
  }

  async adminApproveTransaction(id: string) {
    return this.request(`/admin/transactions/${id}/approve`, {
      method: 'POST',
    });
  }

  async adminRejectTransaction(id: string, reason: string) {
    return this.request(`/admin/transactions/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async adminSendNotification(data: { userId?: string; title: string; message: string; type: string }) {
    return this.request('/admin/notifications/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async adminGetDashboardStats() {
    return this.request<{
      totalUsers: number;
      activeUsers: number;
      pendingKYC: number;
      pendingDeposits: number;
      pendingWithdrawals: number;
      totalDeposits: number;
      totalWithdrawals: number;
      activeInvestments: number;
      totalInvestmentValue: number;
    }>('/admin/dashboard/stats');
  }

  async adminGetDashboardAnalytics(period: string = '30') {
    return this.request<{
      dailyDeposits: any[];
      dailyWithdrawals: any[];
      dailyUsers: any[];
      dailyInvestments: any[];
      investmentByPlan: any[];
      userGrowth: any[];
    }>(`/admin/dashboard/analytics?period=${period}`);
  }

  // Admin: Trader management
  async adminCreateTrader(data: any) {
    return this.request('/copy-trade/admin/traders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async adminUpdateTrader(id: string, data: any) {
    return this.request(`/copy-trade/admin/traders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async adminDeleteTrader(id: string) {
    return this.request(`/copy-trade/admin/traders/${id}`, {
      method: 'DELETE',
    });
  }

  // Admin: Investment plan management
  async adminGetInvestmentPlans() {
    return this.request<any[]>('/investments/admin/plans');
  }

  async adminCreateInvestmentPlan(data: any) {
    return this.request('/investments/admin/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async adminUpdateInvestmentPlan(id: string, data: any) {
    return this.request(`/investments/admin/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async adminDeleteInvestmentPlan(id: string) {
    return this.request(`/investments/admin/plans/${id}`, {
      method: 'DELETE',
    });
  }

  // Signals
  async getSignals(status: string = 'active') {
    return this.request<any[]>(`/signals?status=${status}`);
  }

  async adminGetSignals() {
    return this.request<any[]>('/signals/admin');
  }

  async adminCreateSignal(data: any) {
    return this.request('/signals/admin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async adminUpdateSignal(id: string, data: any) {
    return this.request(`/signals/admin/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async adminCloseSignal(id: string, data: { closedPrice: number; result: string }) {
    return this.request(`/signals/admin/${id}/close`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async adminDeleteSignal(id: string) {
    return this.request(`/signals/admin/${id}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiService();
export default api;
