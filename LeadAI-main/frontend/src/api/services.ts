import apiClient from './client';

// Auth & Profile Services
export const authService = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await apiClient.post('/auth/login', credentials);
    const data = response.data;
    if (data.access_token) {
      localStorage.setItem('leadai_token', data.access_token);
      localStorage.setItem('token', data.access_token);
      if (data.user) {
        localStorage.setItem('leadai_user', JSON.stringify(data.user));
      }
    }
    return data;
  },
  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      console.warn('Logout notification error:', e);
    } finally {
      localStorage.removeItem('leadai_token');
      localStorage.removeItem('token');
      localStorage.removeItem('leadai_user');
      window.location.href = '/login';
    }
  },
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
  updateProfile: async (data: any) => {
    const response = await apiClient.put('/auth/me', data);
    return response.data;
  },
  forgotPassword: async (email: string) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },
  resetPassword: async (payload: { token: string; new_password: string }) => {
    const response = await apiClient.post('/auth/reset-password', payload);
    return response.data;
  },
  isAuthenticated: (): boolean => {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('leadai_token') || localStorage.getItem('token');
    return !!(token && token !== 'internal_admin_token');
  }
};

// Search & Scraper Services
export const searchService = {
  runSearch: async (criteria: any) => {
    const response = await apiClient.post('/search', criteria);
    return response.data;
  },
  getHistory: async () => {
    const response = await apiClient.get('/search/history');
    return response.data;
  },
  getScanBusinesses: async (searchId: number) => {
    const response = await apiClient.get(`/search/history/${searchId}/businesses`);
    return response.data;
  },
  deleteScan: async (searchId: number) => {
    const response = await apiClient.delete(`/search/history/${searchId}`);
    return response.data;
  },
  scrapeLink: async (url: string) => {
    const response = await apiClient.post('/search/scrape-link', { url });
    return response.data;
  }
};

// Leads & Audit Services
export const leadsService = {
  getLeads: async (params: Record<string, any>) => {
    const response = await apiClient.get('/leads', { params });
    return response.data;
  },
  getLeadDetails: async (leadId: number) => {
    const response = await apiClient.get(`/leads/${leadId}`);
    return response.data;
  },
  saveLead: async (businessId: number) => {
    const response = await apiClient.post(`/leads/save/${businessId}`);
    return response.data;
  },
  assignLead: async (leadId: number, userId: number) => {
    const response = await apiClient.post(`/leads/${leadId}/assign`, { user_id: userId });
    return response.data;
  },
  updateStatus: async (leadId: number, status: string) => {
    const response = await apiClient.patch(`/leads/${leadId}/status`, { status });
    return response.data;
  },
  analyzeLead: async (leadId: number) => {
    const response = await apiClient.post(`/leads/${leadId}/analyze`);
    return response.data;
  },
  deleteLead: async (leadId: number) => {
    const response = await apiClient.delete(`/leads/${leadId}`);
    return response.data;
  },
  updateBusiness: async (id: number, data: { email?: string; phone?: string; website?: string; name?: string }) => {
    const response = await apiClient.put(`/businesses/${id}`, data);
    return response.data;
  }
};

// CRM Services
export const crmService = {
  getPipeline: async () => {
    const response = await apiClient.get('/crm/pipeline');
    return response.data;
  },
  updateLeadStage: async (leadId: number, status: string) => {
    const response = await apiClient.patch(`/crm/leads/${leadId}/status`, { status });
    return response.data;
  },
  addNote: async (leadId: number, content: string) => {
    const response = await apiClient.post(`/crm/leads/${leadId}/notes`, { content });
    return response.data;
  },
  getNotes: async (leadId: number) => {
    const response = await apiClient.get(`/crm/leads/${leadId}/notes`);
    return response.data;
  },
  addTask: async (leadId: number, title: string, dueDate?: string) => {
    const response = await apiClient.post(`/crm/leads/${leadId}/tasks`, { title, due_date: dueDate });
    return response.data;
  },
  getTasks: async (leadId: number) => {
    const response = await apiClient.get(`/crm/leads/${leadId}/tasks`);
    return response.data;
  },
  updateTaskStatus: async (taskId: number, status: string) => {
    const response = await apiClient.patch(`/crm/tasks/${taskId}`, { status });
    return response.data;
  }
};

// Email & Outreach Services
export const emailService = {
  getActiveSenders: async () => {
    const response = await apiClient.get('/emails/active-senders');
    return response.data;
  },
  createCampaign: async (payload: { name: string; subject?: string; body_template?: string; employee_id?: number }) => {
    const response = await apiClient.post('/emails/campaigns', payload);
    return response.data;
  },
  getCampaigns: async () => {
    const response = await apiClient.get('/emails/campaigns');
    return response.data;
  },
  generateDraft: async (leadId: number, channel: string) => {
    const response = await apiClient.post('/emails/generate-draft', { lead_id: leadId, channel });
    return response.data;
  },
  getLeadDrafts: async (leadId: number) => {
    const response = await apiClient.get(`/emails/lead/${leadId}/drafts`);
    return response.data;
  },
  sendEmail: async (payload: { lead_id: number; subject: string; body: string; recipient_email: string; employee_id?: number }) => {
    const response = await apiClient.post('/emails/send', payload);
    return response.data;
  }
};

// Analytics Services
export const analyticsService = {
  getDashboardStats: async () => {
    const response = await apiClient.get('/analytics/dashboard');
    return response.data;
  }
};

// Admin & Settings Services
export const adminService = {
  getCompanyProfile: async () => {
    const response = await apiClient.get('/admin/company');
    return response.data;
  },
  updateCompanyProfile: async (data: any) => {
    const response = await apiClient.put('/admin/company', data);
    return response.data;
  },
  getEmployees: async () => {
    const response = await apiClient.get('/admin/employees');
    return response.data;
  },
  createEmployee: async (data: any) => {
    const response = await apiClient.post('/admin/employees', data);
    return response.data;
  },
  updateEmployee: async (id: number, data: any) => {
    const response = await apiClient.put(`/admin/employees/${id}`, data);
    return response.data;
  },
  toggleEmployeeStatus: async (id: number) => {
    const response = await apiClient.post(`/admin/employees/${id}/toggle-active`);
    return response.data;
  },
  getEmployeeEmailAccount: async (userId: number) => {
    const response = await apiClient.get(`/admin/employees/${userId}/email-account`);
    return response.data;
  },
  saveEmployeeEmailAccount: async (userId: number, data: any) => {
    const response = await apiClient.post(`/admin/employees/${userId}/email-account`, data);
    return response.data;
  },
  deleteEmployeeEmailAccount: async (userId: number) => {
    const response = await apiClient.delete(`/admin/employees/${userId}/email-account`);
    return response.data;
  },
  testEmployeeEmailConnection: async (userId: number) => {
    const response = await apiClient.post(`/admin/employees/${userId}/test-email-connection`);
    return response.data;
  },
  getSmtpStatus: async () => {
    const response = await apiClient.get('/admin/smtp-status');
    return response.data;
  },
  getSystemLogs: async () => {
    const response = await apiClient.get('/admin/system-logs');
    return response.data;
  },
  backupDatabase: async () => {
    const response = await apiClient.get('/admin/backup-db');
    return response.data;
  }
};

// Export Services
export const exportService = {
  downloadCsv: () => {
    const token = localStorage.getItem('leadai_token') || localStorage.getItem('token') || '';
    const baseUrl = apiClient.defaults.baseURL;
    window.open(`${baseUrl}/export/csv?token=${token}`, '_blank');
  },
  downloadExcel: () => {
    const token = localStorage.getItem('leadai_token') || localStorage.getItem('token') || '';
    const baseUrl = apiClient.defaults.baseURL;
    window.open(`${baseUrl}/export/excel?token=${token}`, '_blank');
  },
  downloadJson: () => {
    const token = localStorage.getItem('leadai_token') || localStorage.getItem('token') || '';
    const baseUrl = apiClient.defaults.baseURL;
    window.open(`${baseUrl}/export/json?token=${token}`, '_blank');
  }
};
