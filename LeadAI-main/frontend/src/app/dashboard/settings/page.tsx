"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Building2, Mail, Image, User, Moon, Sun, Database, Download, Trash2, 
  ShieldCheck, ArrowLeft, Loader2, Check, Users, UserPlus, Lock, Server, 
  Activity, AlertTriangle, RefreshCw, FileText, Settings2, Zap, AlertCircle,
  MoreVertical, ChevronRight, CheckCircle2, XCircle, Shield, Info, ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { adminService, exportService, authService } from "@/services/api";

const PROVIDER_PRESETS: Record<string, { host: string; port: number; encryption: string; authMethod: string }> = {
  "Gmail (App Password - Local/VPS)": { host: "smtp.gmail.com", port: 587, encryption: "TLS", authMethod: "SMTP" },
  "Resend (HTTP API - Recommended for Render Cloud)": { host: "https://api.resend.com/emails", port: 443, encryption: "SSL", authMethod: "HTTP_API" },
  "Brevo (HTTP API - Recommended for Render Cloud)": { host: "https://api.brevo.com/v3/smtp/email", port: 443, encryption: "SSL", authMethod: "HTTP_API" },
  "Google Workspace": { host: "smtp.gmail.com", port: 587, encryption: "TLS", authMethod: "SMTP" },
  "Microsoft 365 / Outlook": { host: "smtp.office365.com", port: 587, encryption: "TLS", authMethod: "SMTP" },
  "Hostinger": { host: "smtp.hostinger.com", port: 465, encryption: "SSL", authMethod: "SMTP" },
  "Custom SMTP": { host: "", port: 587, encryption: "TLS", authMethod: "SMTP" }
};

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"company" | "employees" | "smtp" | "theme" | "backup" | "logs">("employees");
  
  // Company Profile state
  const [companyData, setCompanyData] = useState({
    company_name: "BLUEBOXX.DA PRIVATE LIMITED",
    company_logo: "/blueboxx_logo.png",
    company_website: "https://blueboxxda.com",
    company_email: "contact@blueboxxda.com",
    company_phone: "+91 98765 43210",
    company_address: "BLUEBOXX.DA Tower, Tech Park Road, Ahmedabad",
    gst_number: "24AAAAA0000A1Z5",
    linkedin_url: "https://linkedin.com/company/blueboxxda",
    facebook_url: "https://facebook.com/blueboxxda",
    instagram_url: "https://instagram.com/blueboxxda",
    youtube_url: "https://youtube.com/@blueboxxda",
    support_email: "contact@blueboxxda.com",
    email_signature: "BLUEBOXX.DA PRIVATE LIMITED"
  });
  
  // Employees state
  const [employees, setEmployees] = useState<any[]>([]);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    email: "",
    full_name: "",
    designation: "Sales Executive",
    password: "",
    role: "employee"
  });

  // Employee Email Account Modal State
  const [editingEmailEmployee, setEditingEmailEmployee] = useState<any | null>(null);
  const [removingEmailEmployee, setRemovingEmailEmployee] = useState<any | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showRemoveInactiveModal, setShowRemoveInactiveModal] = useState(false);
  const [activeActionMenuId, setActiveActionMenuId] = useState<number | null>(null);

  const [emailForm, setEmailForm] = useState({
    email: "",
    provider: "Hostinger",
    authentication_method: "SMTP",
    smtp_host: "smtp.hostinger.com",
    smtp_port: 465,
    encryption: "SSL",
    smtp_username: "",
    password: "",
    sender_name: "",
    is_active: true,
    is_default: false
  });
  const [savingEmailConfig, setSavingEmailConfig] = useState(false);

  // Testing Connection States
  const [testingConnectionId, setTestingConnectionId] = useState<number | "all" | null>(null);

  // SMTP & System state
  const [smtpStatus, setSmtpStatus] = useState<any>(null);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [themeMode, setThemeMode] = useState<"light" | "dark">("dark");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const me = await authService.getCurrentUser();
      setCurrentUser(me);

      const comp = await adminService.getCompanyProfile();
      if (comp) setCompanyData(comp);

      let emps = await adminService.getEmployees() || [];
      setEmployees(emps || []);

      const smtp = await adminService.getSmtpStatus();
      setSmtpStatus(smtp);

      const logs = await adminService.getSystemLogs();
      setSystemLogs(logs || []);
    } catch (err: any) {
      console.error("Error loading settings data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const updated = await adminService.updateCompanyProfile(companyData);
      setCompanyData(updated);
      setFeedback({ type: "success", message: "Company profile updated successfully!" });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to update company profile." });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await adminService.createEmployee(newEmployee);
      setShowAddEmployeeModal(false);
      setNewEmployee({ email: "", full_name: "", designation: "Sales Executive", password: "", role: "employee" });
      const updatedEmps = await adminService.getEmployees();
      setEmployees(updatedEmps);
      setFeedback({ type: "success", message: "Employee account created successfully!" });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to create employee account." });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (empId: number) => {
    try {
      await adminService.toggleEmployeeStatus(empId);
      const updatedEmps = await adminService.getEmployees();
      setEmployees(updatedEmps);
      setFeedback({ type: "success", message: "Employee status updated successfully." });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Could not toggle employee status." });
    }
  };

  // Open Email Account Config Modal for an Employee
  const handleOpenEmailModal = (emp: any) => {
    setEditingEmailEmployee(emp);
    const existing = emp.email_account || {};
    setEmailForm({
      email: existing.email || emp.email || "",
      provider: existing.provider || "Hostinger",
      authentication_method: existing.authentication_method || "SMTP",
      smtp_host: existing.smtp_host || "smtp.hostinger.com",
      smtp_port: existing.smtp_port || 465,
      encryption: existing.encryption || "SSL",
      smtp_username: existing.smtp_username || existing.email || emp.email || "",
      password: "",
      sender_name: existing.sender_name || emp.full_name || emp.email || "",
      is_active: existing.is_active !== undefined ? existing.is_active : true,
      is_default: existing.is_default || false
    });
  };

  // Auto-fill preset settings when selecting provider
  const handleProviderChange = (providerName: string) => {
    const preset = PROVIDER_PRESETS[providerName];
    if (preset) {
      setEmailForm(prev => ({
        ...prev,
        provider: providerName,
        smtp_host: preset.host || prev.smtp_host,
        smtp_port: preset.port || prev.smtp_port,
        encryption: preset.encryption || prev.encryption,
        authentication_method: preset.authMethod || prev.authentication_method
      }));
    } else {
      setEmailForm(prev => ({ ...prev, provider: providerName }));
    }
  };

  const handleSaveEmailAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmailEmployee) return;
    setSavingEmailConfig(true);
    setFeedback(null);

    try {
      await adminService.saveEmployeeEmailAccount(editingEmailEmployee.id, emailForm);
      setEditingEmailEmployee(null);
      const updatedEmps = await adminService.getEmployees();
      setEmployees(updatedEmps);
      const smtp = await adminService.getSmtpStatus();
      setSmtpStatus(smtp);

      setFeedback({
        type: "success",
        message: `Email account configured successfully for ${editingEmailEmployee.full_name || editingEmailEmployee.email}`
      });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to save employee email configuration." });
    } finally {
      setSavingEmailConfig(false);
    }
  };

  const confirmRemoveEmailAccount = async () => {
    if (!removingEmailEmployee) return;
    setDeletingAccount(true);
    try {
      await adminService.deleteEmployeeEmailAccount(removingEmailEmployee.id);
      setRemovingEmailEmployee(null);
      const updatedEmps = await adminService.getEmployees();
      setEmployees(updatedEmps);
      const smtp = await adminService.getSmtpStatus();
      setSmtpStatus(smtp);
      setFeedback({ type: "success", message: "Email account configuration removed successfully." });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to remove email account." });
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleTestConnection = async (empId: number) => {
    setTestingConnectionId(empId);
    setFeedback(null);
    try {
      const res = await adminService.testEmployeeEmailConnection(empId);
      const updatedEmps = await adminService.getEmployees();
      setEmployees(updatedEmps);
      const smtp = await adminService.getSmtpStatus();
      setSmtpStatus(smtp);

      if (res.status === "success") {
        setFeedback({ type: "success", message: `Test Connection Succeeded: ${res.message}` });
      } else {
        setFeedback({ type: "error", message: `Test Connection Failed: ${res.message}` });
      }
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Connection test failed." });
    } finally {
      setTestingConnectionId(null);
    }
  };

  // Quick Action Handlers
  const handleTestAllConnections = async () => {
    const configuredEmployees = employees.filter(e => e.email_account && e.email_account.email);
    if (configuredEmployees.length === 0) {
      setFeedback({ type: "error", message: "No configured employee email accounts found to test." });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    setTestingConnectionId("all");
    setFeedback({ type: "success", message: "Testing all employee email account connections..." });
    try {
      for (const emp of configuredEmployees) {
        await adminService.testEmployeeEmailConnection(emp.id);
      }
      const updatedEmps = await adminService.getEmployees();
      setEmployees(updatedEmps);
      const smtp = await adminService.getSmtpStatus();
      setSmtpStatus(smtp);
      setFeedback({ type: "success", message: "All employee connection tests completed successfully!" });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed during connection testing." });
    } finally {
      setTestingConnectionId(null);
    }
  };

  const handleExportEmployees = () => {
    if (!employees || employees.length === 0) return;
    const headers = ["ID", "Name", "Email", "Role", "Designation", "Active", "Sending Email", "Provider", "Status", "Last Tested"];
    const rows = employees.map(emp => [
      emp.id,
      `"${(emp.full_name || '').replace(/"/g, '""')}"`,
      `"${(emp.email || '').replace(/"/g, '""')}"`,
      emp.role,
      `"${(emp.designation || '').replace(/"/g, '""')}"`,
      emp.is_active ? "Yes" : "No",
      emp.email_account ? `"${emp.email_account.email}"` : "Not Configured",
      emp.email_account ? `"${emp.email_account.provider || 'Hostinger'}"` : "N/A",
      emp.email_account?.last_test_status || "N/A",
      emp.email_account?.last_tested_at || "Never"
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BLUEBOXX_Employees_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setFeedback({ type: "success", message: "Employee directory exported to CSV!" });
    setTimeout(() => setFeedback(null), 3000);
  };

  const confirmRemoveInactiveAccounts = async () => {
    const inactiveEmps = employees.filter(e => !e.is_active && e.role !== "admin");
    if (inactiveEmps.length === 0) {
      setFeedback({ type: "error", message: "No inactive employee accounts found to remove." });
      setShowRemoveInactiveModal(false);
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    setSaving(true);
    try {
      for (const emp of inactiveEmps) {
        if (emp.email_account) {
          await adminService.deleteEmployeeEmailAccount(emp.id);
        }
      }
      const updatedEmps = await adminService.getEmployees();
      setEmployees(updatedEmps);
      setShowRemoveInactiveModal(false);
      setFeedback({ type: "success", message: `Deconfigured email accounts for ${inactiveEmps.length} inactive employee(s).` });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to remove inactive account configurations." });
    } finally {
      setSaving(false);
    }
  };

  // Metrics calculations for Employee Summary
  const activeEmployeeCount = employees.filter(e => e.role === "employee" && e.is_active).length;
  const configuredEmailAccountsCount = employees.filter(e => e.email_account && e.email_account.email).length;
  const connectedAccountsCount = employees.filter(e => e.email_account?.last_test_status === "Connected").length;
  const disconnectedAccountsCount = employees.filter(e => e.email_account && e.email_account.last_test_status && e.email_account.last_test_status !== "Connected").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-slate-400 text-xs font-bold">Loading CRM Settings & Employees...</p>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* 2. PAGE HEADER */}
      <div className="space-y-2">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary transition-all font-bold uppercase tracking-wider">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3 flex-wrap">
              Internal CRM Settings
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold uppercase tracking-wider">
                Single Company Mode
              </span>
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Manage Company Profile, Employee Email Accounts (Max 5 active), SMTP status, and system audit logs.
            </p>
          </div>
        </div>
      </div>

      {feedback && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border text-xs flex gap-2.5 items-center font-bold shadow-lg ${
            feedback.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300 shadow-emerald-500/5"
              : "bg-rose-500/10 border-rose-500/20 text-rose-300 shadow-rose-500/5"
          }`}
        >
          {feedback.type === "success" ? <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />}
          <span>{feedback.message}</span>
        </motion.div>
      )}

      {/* 3. SETTINGS TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("company")}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "company" 
              ? "bg-primary text-white shadow-lg shadow-primary/20" 
              : "bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800/80"
          }`}
        >
          <Building2 className="w-4 h-4" /> Company Profile
        </button>

        <button
          onClick={() => setActiveTab("employees")}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "employees" 
              ? "bg-primary text-white shadow-lg shadow-primary/20" 
              : "bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800/80"
          }`}
        >
          <Users className="w-4 h-4" /> Employees ({activeEmployeeCount}/5)
        </button>

        <button
          onClick={() => setActiveTab("smtp")}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "smtp" 
              ? "bg-primary text-white shadow-lg shadow-primary/20" 
              : "bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800/80"
          }`}
        >
          <Server className="w-4 h-4" /> SMTP Status
        </button>

        <button
          onClick={() => setActiveTab("theme")}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "theme" 
              ? "bg-primary text-white shadow-lg shadow-primary/20" 
              : "bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800/80"
          }`}
        >
          <Moon className="w-4 h-4" /> Theme
        </button>

        <button
          onClick={() => setActiveTab("backup")}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "backup" 
              ? "bg-primary text-white shadow-lg shadow-primary/20" 
              : "bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800/80"
          }`}
        >
          <Database className="w-4 h-4" /> Backup & Export
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "logs" 
              ? "bg-primary text-white shadow-lg shadow-primary/20" 
              : "bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800/80"
          }`}
        >
          <Activity className="w-4 h-4" /> System Logs
        </button>
      </div>

      {/* 1. COMPANY PROFILE TAB */}
      {activeTab === "company" && (
        <form onSubmit={handleSaveCompany} className="space-y-6">
          <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800 space-y-4 text-xs font-semibold shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
                <Building2 className="w-4 h-4 text-primary" /> Single Company Profile Details
              </h3>
              {!isAdmin && (
                <span className="text-[10px] text-amber-400 font-bold px-2 py-0.5 bg-amber-500/10 rounded-md border border-amber-500/20">
                  Read Only (Admin Only Editing)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Company Name</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={companyData.company_name}
                  onChange={e => setCompanyData({ ...companyData, company_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-primary disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Company Email</label>
                <input
                  type="email"
                  disabled={!isAdmin}
                  value={companyData.company_email}
                  onChange={e => setCompanyData({ ...companyData, company_email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-primary disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Company Website</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={companyData.company_website}
                  onChange={e => setCompanyData({ ...companyData, company_website: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-primary disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Company Phone</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={companyData.company_phone}
                  onChange={e => setCompanyData({ ...companyData, company_phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-primary disabled:opacity-60"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Company Address</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={companyData.company_address}
                  onChange={e => setCompanyData({ ...companyData, company_address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-primary disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Company Logo URL</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  placeholder="https://company.com/logo.png"
                  value={companyData.company_logo || ""}
                  onChange={e => setCompanyData({ ...companyData, company_logo: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-primary disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">GST Number (Optional)</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  placeholder="24AAAAA0000A1Z5"
                  value={companyData.gst_number || ""}
                  onChange={e => setCompanyData({ ...companyData, gst_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-primary disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-2xl shadow-lg shadow-primary/20 flex items-center gap-2 transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Save Company Profile
              </button>
            </div>
          )}
        </form>
      )}

      {/* 4. MAIN CONTENT LAYOUT FOR EMPLOYEES TAB */}
      {activeTab === "employees" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT SIDE: Employee Management Table & Security Card (~70-75% width on desktop) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 5. EMPLOYEE MANAGEMENT CARD */}
            <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800 space-y-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-xs font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
                    <Users className="w-4 h-4 text-primary" /> COMPANY EMPLOYEE & EMAIL ACCOUNT MANAGEMENT
                  </h3>
                  <p className="text-[11.5px] text-slate-400 mt-1">
                    Active Employees: <strong className="text-emerald-400">{activeEmployeeCount}/5</strong>
                    <span className="text-slate-500 ml-1.5 font-medium">
                      ({activeEmployeeCount >= 5 ? "0 slots remaining" : `${5 - activeEmployeeCount} employee slot${5 - activeEmployeeCount === 1 ? '' : 's'} remaining`})
                    </span>
                  </p>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => setShowAddEmployeeModal(true)}
                    disabled={activeEmployeeCount >= 5}
                    className="px-4 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md shadow-primary/20 transition-all shrink-0"
                  >
                    <UserPlus className="w-4 h-4" /> Add Employee Account
                  </button>
                )}
              </div>

              {activeEmployeeCount >= 5 && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs rounded-xl font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Maximum 5 active employees reached. You cannot add more employee slots.</span>
                </div>
              )}

              {/* 6. EMPLOYEE TABLE */}
              <div className="overflow-x-auto border border-slate-800/80 rounded-xl [scrollbar-color:#334155_transparent] [scrollbar-width:thin]">
                <table className="w-full text-left text-xs min-w-[720px]">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4 font-extrabold whitespace-nowrap min-w-[140px]">EMPLOYEE</th>
                      <th className="py-3 px-3 font-extrabold whitespace-nowrap min-w-[80px]">ROLE</th>
                      <th className="py-3 px-3 font-extrabold whitespace-nowrap min-w-[160px]">SENDING EMAIL ACCOUNT</th>
                      <th className="py-3 px-3 font-extrabold whitespace-nowrap min-w-[140px]">CONNECTION STATUS</th>
                      <th className="py-3 px-3 font-extrabold whitespace-nowrap min-w-[130px]">LAST TESTED</th>
                      <th className="py-3 px-4 text-right font-extrabold whitespace-nowrap min-w-[160px]">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {employees.map(emp => {
                      const acct = emp.email_account;
                      const isTesting = testingConnectionId === emp.id || testingConnectionId === "all";
                      const isConnected = acct?.last_test_status === "Connected";
                      const isFailed = !!acct?.last_test_status && (
                        acct.last_test_status.startsWith("Connection Failed") ||
                        acct.last_test_status.includes("SMTP_") ||
                        acct.last_test_status.includes("timed out")
                      );

                      const formattedLastTested = acct?.last_tested_at
                        ? new Date(acct.last_tested_at).toLocaleString([], {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : "Never";

                      return (
                        <tr key={emp.id} className="hover:bg-slate-900/60 transition-colors group">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-bold text-white text-xs whitespace-nowrap">{emp.full_name || emp.email}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">{emp.email}</div>
                          </td>

                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold inline-block whitespace-nowrap ${
                              emp.role === "admin" 
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" 
                                : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            }`}>
                              {emp.role.toUpperCase()}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {acct && acct.email ? (
                              <div>
                                <div className="font-mono text-white text-[11px] font-bold whitespace-nowrap">{acct.email}</div>
                                <div className="text-[9.5px] text-slate-400 font-semibold whitespace-nowrap">{acct.provider || "Hostinger"}</div>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic whitespace-nowrap">Not Configured</span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {acct && acct.email ? (
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1 whitespace-nowrap ${
                                isConnected
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : isFailed
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                  : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                              }`}>
                                {isConnected ? <Check className="w-3 h-3" /> : isFailed ? <AlertTriangle className="w-3 h-3" /> : <Zap className="w-3 h-3 text-amber-400" />}
                                {isConnected ? "Connected" : isFailed ? "Connection Failed" : (acct.last_test_status || "Configured")}
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-800/80 text-slate-400 border border-slate-700/50 whitespace-nowrap">
                                No Config
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <div className="text-[10.5px] text-slate-300 font-mono whitespace-nowrap">
                              {formattedLastTested}
                            </div>
                          </td>

                          {/* 7. ACTIONS WITH 3-DOT MENU */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                              {acct && acct.email ? (
                                <>
                                  <button
                                    onClick={() => handleTestConnection(emp.id)}
                                    disabled={isTesting}
                                    className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 rounded-xl text-[10.5px] font-bold inline-flex items-center gap-1.5 transition-all disabled:opacity-50 whitespace-nowrap shrink-0"
                                    title="Test Email Connection"
                                  >
                                    {isTesting ? <Loader2 className="w-3 h-3 animate-spin text-emerald-400 shrink-0" /> : <Zap className="w-3 h-3 text-emerald-400 shrink-0" />}
                                    <span className="whitespace-nowrap">{isTesting ? "Testing..." : "Test Connection"}</span>
                                  </button>

                                  {/* 3-Dot Action Menu Button */}
                                  <div className="relative shrink-0">
                                    <button
                                      onClick={() => setActiveActionMenuId(activeActionMenuId === emp.id ? null : emp.id)}
                                      className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl transition-all shrink-0"
                                      title="More Actions"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>

                                    {activeActionMenuId === emp.id && (
                                      <>
                                        <div className="fixed inset-0 z-10" onClick={() => setActiveActionMenuId(null)} />
                                        <div className="absolute right-0 top-full mt-1.5 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-20 py-1.5 text-xs font-semibold text-left overflow-hidden">
                                          <button
                                            onClick={() => {
                                              setActiveActionMenuId(null);
                                              handleOpenEmailModal(emp);
                                            }}
                                            className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                                          >
                                            <Settings2 className="w-3.5 h-3.5 text-primary" /> Edit Email
                                          </button>

                                          <button
                                            onClick={() => {
                                              setActiveActionMenuId(null);
                                              handleTestConnection(emp.id);
                                            }}
                                            className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                                          >
                                            <Zap className="w-3.5 h-3.5 text-emerald-400" /> Test Connection
                                          </button>

                                          {isAdmin && emp.role !== "admin" && (
                                            <button
                                              onClick={() => {
                                                setActiveActionMenuId(null);
                                                handleToggleActive(emp.id);
                                              }}
                                              className="w-full flex items-center gap-2 px-3.5 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                                            >
                                              <User className="w-3.5 h-3.5 text-amber-400" /> {emp.is_active ? "Deactivate" : "Activate"}
                                            </button>
                                          )}

                                          <div className="my-1 border-t border-slate-800" />

                                          {isAdmin && (
                                            <button
                                              onClick={() => {
                                                setActiveActionMenuId(null);
                                                setRemovingEmailEmployee(emp);
                                              }}
                                              className="w-full flex items-center gap-2 px-3.5 py-2 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors font-bold"
                                            >
                                              <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Remove Account
                                            </button>
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleOpenEmailModal(emp)}
                                    className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-[10.5px] font-bold inline-flex items-center gap-1.5 transition-all shadow-md shadow-primary/20 whitespace-nowrap shrink-0"
                                  >
                                    <Mail className="w-3 h-3 shrink-0" /> Configure Email
                                  </button>

                                  {isAdmin && emp.role !== "admin" && (
                                    <button
                                      onClick={() => handleToggleActive(emp.id)}
                                      className={`px-2.5 py-1.5 rounded-xl text-[10.5px] font-bold transition-all border whitespace-nowrap shrink-0 ${
                                        emp.is_active 
                                          ? "bg-slate-800 text-slate-400 hover:bg-slate-700 border-slate-700" 
                                          : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20"
                                      }`}
                                      title={emp.is_active ? "Deactivate Employee" : "Activate Employee"}
                                    >
                                      {emp.is_active ? "Deactivate" : "Activate"}
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 11. SECURITY CARD */}
            <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5 uppercase tracking-wider">
                    SECURE & ENCRYPTED
                  </h4>
                  <p className="text-[11.5px] text-slate-400 mt-0.5">
                    Email credentials and provider configuration are securely stored and are never exposed to the frontend.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowSecurityModal(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-center"
              >
                <Info className="w-3.5 h-3.5 text-primary" /> Learn More
              </button>
            </div>

          </div>

          {/* RIGHT SIDE: Employee Summary & Quick Actions (~25-30% width on desktop) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 9. EMPLOYEE SUMMARY */}
            <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> EMPLOYEE SUMMARY
                </h3>
                <span className="text-[10px] text-slate-500 font-extrabold uppercase">Live Stats</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Metric 1 */}
                <div className="p-3.5 bg-slate-900/80 border border-slate-800/80 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Active Employees</span>
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div className="text-lg font-black text-white">{activeEmployeeCount}/5</div>
                  <div className="text-[9.5px] text-slate-400">{5 - activeEmployeeCount} slots remaining</div>
                </div>

                {/* Metric 2 */}
                <div className="p-3.5 bg-slate-900/80 border border-slate-800/80 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Email Accounts</span>
                    <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div className="text-lg font-black text-white">{configuredEmailAccountsCount}</div>
                  <div className="text-[9.5px] text-slate-400">Configured addresses</div>
                </div>

                {/* Metric 3 */}
                <div className="p-3.5 bg-slate-900/80 border border-slate-800/80 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Connected</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="text-lg font-black text-emerald-400">{connectedAccountsCount}</div>
                  <div className="text-[9.5px] text-emerald-400/80">Active SMTP / API</div>
                </div>

                {/* Metric 4 */}
                <div className="p-3.5 bg-slate-900/80 border border-slate-800/80 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Disconnected</span>
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  </div>
                  <div className={`text-lg font-black ${disconnectedAccountsCount > 0 ? "text-rose-400" : "text-slate-400"}`}>
                    {disconnectedAccountsCount}
                  </div>
                  <div className="text-[9.5px] text-slate-400">Failed / Pending</div>
                </div>
              </div>
            </div>

            {/* 10. QUICK ACTIONS */}
            <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-3.5 shadow-xl">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" /> QUICK ACTIONS
                </h3>
              </div>

              <div className="space-y-2">
                {/* Action 1 */}
                <button
                  onClick={() => setShowAddEmployeeModal(true)}
                  disabled={activeEmployeeCount >= 5 || !isAdmin}
                  className="w-full p-3 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-primary/40 rounded-xl flex items-center justify-between transition-all group disabled:opacity-50 text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-200 group-hover:text-white">Add Employee Account</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                </button>

                {/* Action 2 */}
                <button
                  onClick={handleTestAllConnections}
                  disabled={testingConnectionId === "all"}
                  className="w-full p-3 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/40 rounded-xl flex items-center justify-between transition-all group text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {testingConnectionId === "all" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    </div>
                    <span className="text-xs font-bold text-slate-200 group-hover:text-white">Test All Connections</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-transform group-hover:translate-x-0.5" />
                </button>

                {/* Action 3 */}
                <button
                  onClick={handleExportEmployees}
                  className="w-full p-3 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/40 rounded-xl flex items-center justify-between transition-all group text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <Download className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-200 group-hover:text-white">Export Employees</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-transform group-hover:translate-x-0.5" />
                </button>

                {/* Action 4 (Red Danger Style) */}
                <button
                  onClick={() => setShowRemoveInactiveModal(true)}
                  disabled={!isAdmin}
                  className="w-full p-3 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 rounded-xl flex items-center justify-between transition-all group text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-rose-300 group-hover:text-rose-200">Remove Inactive Accounts</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-400/60 group-hover:text-rose-400 transition-transform group-hover:translate-x-0.5" />
                </button>

                {/* Action 5 */}
                <button
                  onClick={() => setActiveTab("logs")}
                  className="w-full p-3 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-purple-500/40 rounded-xl flex items-center justify-between transition-all group text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <Activity className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-200 group-hover:text-white">System Audit Logs</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 3. SMTP STATUS TAB */}
      {activeTab === "smtp" && (
        <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
          <h3 className="text-xs font-extrabold text-white flex items-center gap-2 uppercase tracking-wider border-b border-slate-800 pb-3">
            <Server className="w-4 h-4 text-emerald-400" /> Employee Email Accounts & System SMTP Status
          </h3>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Employee Sending Accounts Status:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 ${
                smtpStatus?.configured 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}>
                <Check className="w-3.5 h-3.5" />
                {smtpStatus?.status || "Unknown"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-800/60">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Configured Active Accounts:</span>
                <p className="font-mono text-white mt-0.5">{smtpStatus?.active_employee_accounts || configuredEmailAccountsCount} Accounts</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Tested Connections:</span>
                <p className="font-mono text-white mt-0.5">{smtpStatus?.connected_accounts || connectedAccountsCount} Connected</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
              🔒 <strong>Employee-Wise System:</strong> Each employee configures their own SMTP/OAuth email account in the Employees tab above. When sending campaign emails, selecting an employee will dynamically authenticate using that employee's encrypted credentials.
            </p>
          </div>
        </div>
      )}

      {/* 4. THEME TAB */}
      {activeTab === "theme" && (
        <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
          <h3 className="text-xs font-extrabold text-white flex items-center gap-2 uppercase tracking-wider border-b border-slate-800 pb-3">
            <Moon className="w-4 h-4 text-primary" /> Appearance & Theme Preferences
          </h3>

          <div className="flex gap-4">
            <button
              onClick={() => setThemeMode("dark")}
              className={`flex-1 py-3.5 px-4 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                themeMode === "dark"
                  ? "bg-primary/20 border-primary text-white shadow-lg shadow-primary/10"
                  : "bg-slate-900 border-slate-800 text-slate-400"
              }`}
            >
              <Moon className="w-4 h-4 text-primary" /> Dark Mode (Recommended)
            </button>

            <button
              onClick={() => setThemeMode("light")}
              className={`flex-1 py-3.5 px-4 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                themeMode === "light"
                  ? "bg-primary/20 border-primary text-white shadow-lg shadow-primary/10"
                  : "bg-slate-900 border-slate-800 text-slate-400"
              }`}
            >
              <Sun className="w-4 h-4 text-amber-400" /> Light Mode
            </button>
          </div>
        </div>
      )}

      {/* 5. BACKUP & EXPORT TAB */}
      {activeTab === "backup" && (
        <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
          <h3 className="text-xs font-extrabold text-white flex items-center gap-2 uppercase tracking-wider border-b border-slate-800 pb-3">
            <Database className="w-4 h-4 text-emerald-400" /> Data Backup & CRM Export
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => exportService.downloadCsv()}
              className="p-5 bg-slate-900 border border-slate-800 rounded-2xl hover:border-emerald-500/40 text-left space-y-2 group transition-all"
            >
              <Download className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
              <h4 className="font-bold text-white text-xs">Export Leads Dataset (CSV)</h4>
              <p className="text-[11px] text-slate-400">Download formatted CSV containing all business leads, scores, and contacts.</p>
            </button>

            <button
              onClick={() => exportService.downloadJson()}
              className="p-5 bg-slate-900 border border-slate-800 rounded-2xl hover:border-indigo-500/40 text-left space-y-2 group transition-all"
            >
              <FileText className="w-6 h-6 text-indigo-400 group-hover:scale-110 transition-transform" />
              <h4 className="font-bold text-white text-xs">Full System Snapshot (JSON)</h4>
              <p className="text-[11px] text-slate-400">Export complete structural database snapshot for backup and offline analysis.</p>
            </button>
          </div>
        </div>
      )}

      {/* 6. LOGS TAB */}
      {activeTab === "logs" && (
        <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
          <h3 className="text-xs font-extrabold text-white flex items-center gap-2 uppercase tracking-wider border-b border-slate-800 pb-3">
            <Activity className="w-4 h-4 text-primary" /> Internal Audit & Activity Logs
          </h3>

          <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {systemLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 text-white font-bold">{log.user_name}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{log.description || "N/A"}</td>
                    <td className="py-2.5 px-3 text-slate-400 text-[10px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALS SECTION */}

      {/* Add Employee Account Modal */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" /> Add Company Employee
              </h3>
              <button onClick={() => setShowAddEmployeeModal(false)} className="text-slate-400 hover:text-white font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 mb-1 uppercase tracking-wider">Company Email</label>
                <input
                  type="email"
                  required
                  placeholder="employee@blueboxxda.com"
                  value={newEmployee.email}
                  onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 mb-1 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={newEmployee.full_name}
                  onChange={e => setNewEmployee({ ...newEmployee, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 mb-1 uppercase tracking-wider">Designation</label>
                <input
                  type="text"
                  required
                  placeholder="Sales Executive / Prospector"
                  value={newEmployee.designation}
                  onChange={e => setNewEmployee({ ...newEmployee, designation: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 mb-1 uppercase tracking-wider">Initial Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newEmployee.password}
                  onChange={e => setNewEmployee({ ...newEmployee, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEmployeeModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-primary/20 transition-all"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create Employee Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMPLOYEE EMAIL CONFIGURATION MODAL */}
      {editingEmailEmployee && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-5 text-xs font-sans max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Email Configuration for {editingEmailEmployee.full_name || editingEmailEmployee.email}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Configure dedicated SMTP account used for cold email outreach.</p>
              </div>
              <button onClick={() => setEditingEmailEmployee(null)} className="text-slate-400 hover:text-white font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleSaveEmailAccount} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Employee Email Address</label>
                  <input
                    type="email"
                    required
                    value={emailForm.email}
                    onChange={e => setEmailForm({ ...emailForm, email: e.target.value })}
                    placeholder="sales@company.com"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Email Provider</label>
                  <select
                    value={emailForm.provider}
                    onChange={e => handleProviderChange(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                  >
                    <option value="Hostinger">Hostinger</option>
                    <option value="Gmail (App Password - Local/VPS)">Gmail (App Password)</option>
                    <option value="Resend (HTTP API - Recommended for Render Cloud)">Resend (HTTP API)</option>
                    <option value="Brevo (HTTP API - Recommended for Render Cloud)">Brevo (HTTP API)</option>
                    <option value="Google Workspace">Google Workspace</option>
                    <option value="Microsoft 365 / Outlook">Microsoft 365 / Outlook</option>
                    <option value="Custom SMTP">Custom SMTP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Auth Method</label>
                  <select
                    value={emailForm.authentication_method}
                    onChange={e => setEmailForm({ ...emailForm, authentication_method: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold"
                  >
                    <option value="SMTP">SMTP Server Authentication</option>
                    <option value="HTTP_API">HTTP API Key (Brevo / Resend)</option>
                    <option value="OAuth 2.0">OAuth 2.0 (Google Workspace / Outlook)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Sender Display Name</label>
                  <input
                    type="text"
                    value={emailForm.sender_name}
                    onChange={e => setEmailForm({ ...emailForm, sender_name: e.target.value })}
                    placeholder="e.g. Bhaumik - BLUEBOXX"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3">SMTP Server Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-extrabold text-slate-400 mb-1">SMTP Host</label>
                    <input
                      type="text"
                      required
                      value={emailForm.smtp_host}
                      onChange={e => setEmailForm({ ...emailForm, smtp_host: e.target.value })}
                      placeholder="smtp.company.com"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 mb-1">SMTP Port</label>
                    <input
                      type="number"
                      required
                      value={emailForm.smtp_port}
                      onChange={e => setEmailForm({ ...emailForm, smtp_port: parseInt(e.target.value) || 587 })}
                      placeholder="587"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 mb-1">Encryption</label>
                    <select
                      value={emailForm.encryption}
                      onChange={e => setEmailForm({ ...emailForm, encryption: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold"
                    >
                      <option value="TLS">TLS (Port 587)</option>
                      <option value="SSL">SSL (Port 465)</option>
                      <option value="None">None</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-extrabold text-slate-400 mb-1">SMTP Username</label>
                    <input
                      type="text"
                      required
                      value={emailForm.smtp_username}
                      onChange={e => setEmailForm({ ...emailForm, smtp_username: e.target.value })}
                      placeholder="sales@company.com"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                  SMTP Password / App Password / API Key 🔒
                </label>
                <input
                  type="password"
                  placeholder={editingEmailEmployee.email_account?.has_password ? "•••••••• (Saved - Leave blank to keep unchanged)" : "Enter password or App Password / API key"}
                  value={emailForm.password}
                  onChange={e => setEmailForm({ ...emailForm, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
                <div className="mt-1 space-y-1">
                  {(emailForm.provider.includes("Gmail") || emailForm.provider === "Google Workspace") && (
                    <p className="text-[10px] text-amber-400 font-bold bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                      💡 <strong>Gmail / Google Workspace Tip:</strong> Use a 16-character <strong>App Password</strong> generated at <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline text-amber-300">myaccount.google.com/apppasswords</a>. Your regular Google account password will fail.
                    </p>
                  )}
                  <p className="text-[9.5px] text-slate-500">
                    🔒 Credentials are encrypted server-side with AES/Fernet encryption before saving.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                {editingEmailEmployee.email_account && editingEmailEmployee.email_account.email ? (
                  <button
                    type="button"
                    onClick={() => {
                      const emp = editingEmailEmployee;
                      setEditingEmailEmployee(null);
                      setRemovingEmailEmployee(emp);
                    }}
                    className="px-3 py-1.5 text-rose-400 hover:bg-rose-500/10 font-bold rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Configuration
                  </button>
                ) : <div />}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingEmailEmployee(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={savingEmailConfig}
                    className="px-5 py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-primary/20 transition-all"
                  >
                    {savingEmailConfig && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Configuration
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. REMOVE ACCOUNT CONFIRMATION MODAL */}
      {removingEmailEmployee && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 font-sans shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Remove Email Account?</h3>
                <p className="text-[11px] text-slate-400">Deconfigure employee sending address</p>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl space-y-2 text-xs">
              <p className="text-slate-300">
                Are you sure you want to remove <strong className="text-white font-mono">{removingEmailEmployee.email_account?.email || removingEmailEmployee.email}</strong> from <strong className="text-white">{removingEmailEmployee.full_name || removingEmailEmployee.email}</strong>?
              </p>
              <p className="text-[11.5px] text-slate-400 leading-relaxed font-normal border-t border-slate-800/60 pt-2">
                This will remove the email configuration from this employee. The employee account itself will not be deleted.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRemovingEmailEmployee(null)}
                disabled={deletingAccount}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmRemoveEmailAccount}
                disabled={deletingAccount}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50"
              >
                {deletingAccount ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Remove Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECURITY LEARN MORE MODAL */}
      {showSecurityModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 text-xs font-sans shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Enterprise Security Architecture
              </h3>
              <button onClick={() => setShowSecurityModal(false)} className="text-slate-400 hover:text-white font-bold text-sm">✕</button>
            </div>

            <div className="space-y-3 text-slate-300 leading-relaxed">
              <p>
                BLUEBOXX.DA PRIVATE LIMITED enforces strict data security for all employee email integrations:
              </p>
              <ul className="space-y-2 list-disc list-inside text-slate-400">
                <li><strong className="text-white">AES-256 / Fernet Encryption:</strong> Passwords and API keys are encrypted at rest using server-side keys.</li>
                <li><strong className="text-white">No Plaintext Exposure:</strong> Backend APIs never return saved passwords to the browser.</li>
                <li><strong className="text-white">Isolated Employee Senders:</strong> Cold outreach emails are sent strictly using each employee's authorized credentials.</li>
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowSecurityModal(false)}
                className="px-5 py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-xs shadow-md shadow-primary/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REMOVE INACTIVE ACCOUNTS CONFIRMATION MODAL */}
      {showRemoveInactiveModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 font-sans shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Clean Inactive Account Email Configurations?</h3>
                <p className="text-[11px] text-slate-400">Remove SMTP configs for deactivated employees</p>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl space-y-2 text-xs">
              <p className="text-slate-300">
                This action will remove all configured email credentials for inactive/deactivated employees.
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Active employee accounts will remain untouched.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowRemoveInactiveModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmRemoveInactiveAccounts}
                disabled={saving}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Remove Configurations
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
