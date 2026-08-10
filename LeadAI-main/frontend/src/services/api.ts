const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return "http://localhost:8000/api";
  }
  return "https://lead-generation-system-tz7e.onrender.com/api";
};

class ApiClient {
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("leadai_token") || localStorage.getItem("token");
      if (token && token !== "internal_admin_token") {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  async request<T>(endpoint: string, options: RequestInit = {}, retries: number = 2): Promise<T> {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${endpoint}`;
    const headers = { ...this.getHeaders(), ...options.headers };

    
    try {
      const response = await fetch(url, { 
        ...options, 
        headers,
        credentials: "include"
      });
      
      if (response.status === 204) {
        return {} as T;
      }
      
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
            localStorage.removeItem("leadai_token");
            localStorage.removeItem("token");
            document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
            document.cookie = "leadai_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
            window.location.href = "/login";
          }
        }
        throw new Error(data.detail || "Something went wrong");
      }
      return data as T;
    } catch (error: any) {
      if (retries > 0 && (error?.name === "TypeError" || error?.message === "Failed to fetch")) {
        await new Promise((res) => setTimeout(res, 1500));
        return this.request<T>(endpoint, options, retries - 1);
      }
      if (error?.name === "TypeError" || error?.message === "Failed to fetch") {
        throw new Error(`Unable to connect to backend server. Render backend server is warming up, please refresh in a few seconds.`);
      }
      throw error;
    }
  }


  get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  post<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

export const api = new ApiClient();

// Auth Endpoints (Single Company Internal)
export const authService = {
  login: async (credentials: any) => {
    const res = await api.post<{ access_token: string }>("/auth/login", credentials);
    if (typeof window !== "undefined") {
      localStorage.setItem("leadai_token", res.access_token);
      localStorage.setItem("token", res.access_token);
      document.cookie = `token=${res.access_token}; path=/; max-age=${30 * 24 * 3600}; SameSite=Lax`;
    }
    return res;
  },
  forgotPassword: async (email: string) => {
    return api.post<any>("/auth/forgot-password", { email });
  },
  resetPassword: async (data: { token: string; new_password: string }) => {
    return api.post<any>("/auth/reset-password", data);
  },
  logout: async () => {
    try {
      await api.post<any>("/auth/logout");
    } catch (e) {
      console.error("Logout API notice:", e);
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("leadai_token");
      localStorage.removeItem("token");
      localStorage.removeItem("leadai_user");
      
      document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      document.cookie = "leadai_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      document.cookie = "token=; path=/; max-age=0;";
      document.cookie = "leadai_session=; path=/; max-age=0;";

      window.location.href = "/login";
    }
  },
  getCurrentUser: async () => {
    return api.get<any>("/auth/me");
  },
  updateProfile: async (data: any) => {
    return api.put<any>("/auth/me", data);
  },
  isAuthenticated: () => {
    if (typeof window === "undefined") return false;
    const token = localStorage.getItem("leadai_token") || localStorage.getItem("token");
    if (token && token !== "internal_admin_token") return true;
    const cookieToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token=") || row.startsWith("leadai_session="))
      ?.split("=")[1];
    return !!(cookieToken && cookieToken !== "internal_admin_token");
  }
};

// Admin & Company Management Endpoints
export const adminService = {
  getCompanyProfile: async () => {
    return api.get<any>("/admin/company");
  },
  updateCompanyProfile: async (data: any) => {
    return api.put<any>("/admin/company", data);
  },
  getEmployees: async () => {
    return api.get<any[]>("/admin/employees");
  },
  createEmployee: async (data: any) => {
    return api.post<any>("/admin/employees", data);
  },
  updateEmployee: async (id: number, data: any) => {
    return api.put<any>(`/admin/employees/${id}`, data);
  },
  toggleEmployeeStatus: async (id: number) => {
    return api.post<any>(`/admin/employees/${id}/toggle-active`);
  },
  getEmployeeEmailAccount: async (userId: number) => {
    return api.get<any>(`/admin/employees/${userId}/email-account`);
  },
  saveEmployeeEmailAccount: async (userId: number, data: any) => {
    return api.post<any>(`/admin/employees/${userId}/email-account`, data);
  },
  deleteEmployeeEmailAccount: async (userId: number) => {
    return api.delete<any>(`/admin/employees/${userId}/email-account`);
  },
  testEmployeeEmailConnection: async (userId: number) => {
    return api.post<any>(`/admin/employees/${userId}/test-email-connection`);
  },
  getSmtpStatus: async () => {
    return api.get<any>("/admin/smtp-status");
  },
  getSystemLogs: async () => {
    return api.get<any[]>("/admin/system-logs");
  },
  backupDatabase: async () => {
    return api.get<any>("/admin/backup-db");
  }
};

// Search Endpoints
export const searchService = {
  runSearch: async (criteria: any) => {
    return api.post<any[]>("/search", criteria);
  },
  getHistory: async () => {
    return api.get<any[]>("/search/history");
  },
  getScanBusinesses: async (searchId: number) => {
    return api.get<any[]>(`/search/history/${searchId}/businesses`);
  },
  deleteScan: async (searchId: number) => {
    return api.delete<any>(`/search/history/${searchId}`);
  },
  scrapeLink: async (url: string) => {
    return api.post<any[]>("/search/scrape-link", { url });
  }
};

// Leads Endpoints
export const leadsService = {
  getLeads: async (params: Record<string, any>) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        query.append(key, String(val));
      }
    });
    return api.get<any>(`/leads?${query.toString()}`);
  },
  getLeadDetails: async (leadId: number) => {
    return api.get<any>(`/leads/${leadId}`);
  },
  saveLead: async (businessId: number) => {
    return api.post<any>(`/leads/save/${businessId}`);
  },
  assignLead: async (leadId: number, userId: number) => {
    return api.post<any>(`/leads/${leadId}/assign`, { user_id: userId });
  },
  deleteLead: async (leadId: number) => {
    return api.delete<any>(`/leads/${leadId}`);
  },
  analyzeLead: async (leadId: number) => {
    return api.post<any>(`/leads/${leadId}/analyze`);
  }
};

// CRM Endpoints
export const crmService = {
  getPipeline: async () => {
    return api.get<Record<string, any[]>>("/crm/pipeline");
  },
  updateLeadStatus: async (leadId: number, status: string) => {
    return api.patch<any>(`/crm/leads/${leadId}/status`, { status });
  },
  addNote: async (leadId: number, content: string) => {
    return api.post<any>(`/crm/leads/${leadId}/notes`, { content });
  },
  getNotes: async (leadId: number) => {
    return api.get<any[]>(`/crm/leads/${leadId}/notes`);
  },
  addTask: async (leadId: number, title: string, dueDate?: string) => {
    return api.post<any>(`/crm/leads/${leadId}/tasks`, { title, due_date: dueDate });
  },
  getTasks: async (leadId: number) => {
    return api.get<any[]>(`/crm/leads/${leadId}/tasks`);
  },
  updateTaskStatus: async (taskId: number, status: string) => {
    return api.patch<any>(`/crm/tasks/${taskId}`, { status });
  }
};

// Analytics Endpoints
export const analyticsService = {
  getDashboardStats: async () => {
    return api.get<any>("/analytics/dashboard");
  }
};

// Email Endpoints (Dynamic Employee SMTP)
export const emailService = {
  getActiveSenders: async () => {
    return api.get<any[]>("/emails/active-senders");
  },
  createCampaign: async (campaignData: { name: string; subject?: string; body_template?: string; employee_id?: number }) => {
    return api.post<any>("/emails/campaigns", campaignData);
  },
  getCampaigns: async () => {
    return api.get<any[]>("/emails/campaigns");
  },
  generateDraft: async (leadId: number, channel: string) => {
    return api.post<any>("/emails/generate-draft", { lead_id: leadId, channel });
  },
  getLeadDrafts: async (leadId: number) => {
    return api.get<any[]>(`/emails/lead/${leadId}/drafts`);
  },
  sendEmail: async (payload: {
    lead_id: number;
    subject: string;
    body: string;
    recipient_email: string;
    employee_id?: number;

  }) => {
    return api.post<any>("/emails/send", payload);
  }
};


// Export Endpoints
export const exportService = {
  downloadCsv: () => {
    const token = typeof window !== "undefined" ? (localStorage.getItem("leadai_token") || localStorage.getItem("token")) : "";
    window.open(`${API_BASE_URL}/export/csv?token=${token}`, "_blank");
  },
  downloadExcel: () => {
    const token = typeof window !== "undefined" ? (localStorage.getItem("leadai_token") || localStorage.getItem("token")) : "";
    window.open(`${API_BASE_URL}/export/excel?token=${token}`, "_blank");
  },
  downloadJson: () => {
    const token = typeof window !== "undefined" ? (localStorage.getItem("leadai_token") || localStorage.getItem("token")) : "";
    window.open(`${API_BASE_URL}/export/json?token=${token}`, "_blank");
  }
};
