"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Building2, Mail, Image, User, Moon, Sun, Database, Download, Trash2, 
  ShieldCheck, ArrowLeft, Loader2, Check, Users, UserPlus, Lock, Server, 
  Activity, AlertTriangle, RefreshCw, FileText, Settings2, Zap, AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { adminService, exportService, authService } from "@/services/api";

const PROVIDER_PRESETS: Record<string, { host: string; port: number; encryption: string; authMethod: string }> = {
  "Gmail": { host: "smtp.gmail.com", port: 465, encryption: "SSL", authMethod: "SMTP" },
  "Google Workspace": { host: "smtp.gmail.com", port: 465, encryption: "SSL", authMethod: "SMTP" },
  "Microsoft 365 / Outlook": { host: "smtp.office365.com", port: 587, encryption: "TLS", authMethod: "SMTP" },
  "Hostinger": { host: "smtp.hostinger.com", port: 465, encryption: "SSL", authMethod: "SMTP" },
  "Custom SMTP": { host: "", port: 587, encryption: "TLS", authMethod: "SMTP" }
};


export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"company" | "employees" | "smtp" | "theme" | "backup" | "logs">("company");
  
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
  const [testingConnectionId, setTestingConnectionId] = useState<number | null>(null);

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
      console.error(err);
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
    } catch (err: any) {
      alert(err.message || "Could not toggle employee status.");
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

  const handleDeleteEmailAccount = async (empId: number) => {
    if (!confirm("Are you sure you want to remove this employee's email configuration?")) return;
    try {
      await adminService.deleteEmployeeEmailAccount(empId);
      setEditingEmailEmployee(null);
      const updatedEmps = await adminService.getEmployees();
      setEmployees(updatedEmps);
      setFeedback({ type: "success", message: "Email configuration removed." });
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to delete email configuration." });
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

  const activeEmployeeCount = employees.filter(e => e.role === "employee" && e.is_active).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="space-y-6 max-w-5xl font-sans">
      {/* Page Header */}
      <div className="space-y-2">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary transition-all font-bold uppercase tracking-wider">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              Internal CRM Settings
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
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
          className={`p-4 rounded-2xl border text-xs flex gap-2 items-center font-bold ${
            feedback.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/20 text-rose-300"
          }`}
        >
          {feedback.type === "success" ? <ShieldCheck className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{feedback.message}</span>
        </motion.div>
      )}

      {/* Tabs Bar */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab("company")}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
            activeTab === "company" 
              ? "bg-primary text-white shadow-lg shadow-primary/20" 
              : "bg-slate-950 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Building2 className="w-4 h-4" /> Company Profile
        </button>

        <button
          onClick={() => setActiveTab("employees")}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
            activeTab === "employees" 
              ? "bg-primary text-white shadow-lg shadow-primary/20" 
              : "bg-slate-950 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="w-4 h-4" /> Employees ({activeEmployeeCount}/5)
        </button>

        <button
          onClick={() => setActiveTab("smtp")}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
            activeTab === "smtp" 
              ? "bg-primary text-white shadow-lg shadow-primary/20" 
              : "bg-slate-950 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Server className="w-4 h-4" /> SMTP Status
        </button>

        <button
          onClick={() => setActiveTab("theme")}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
            activeTab === "theme" 
              ? "bg-primary text-white shadow-lg shadow-primary/20" 
              : "bg-slate-950 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Moon className="w-4 h-4" /> Theme
        </button>

        <button
          onClick={() => setActiveTab("backup")}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
            activeTab === "backup" 
              ? "bg-primary text-white shadow-lg shadow-primary/20" 
              : "bg-slate-950 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Database className="w-4 h-4" /> Backup & Export
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
            activeTab === "logs" 
              ? "bg-primary text-white shadow-lg shadow-primary/20" 
              : "bg-slate-950 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-4 h-4" /> System Logs
        </button>
      </div>

      {/* 1. COMPANY PROFILE TAB */}
      {activeTab === "company" && (
        <form onSubmit={handleSaveCompany} className="space-y-6">
          <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800 space-y-4 text-xs font-semibold">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
                <Building2 className="w-4 h-4 text-primary" /> Single Company Profile Details
              </h3>
              {!isAdmin && (
                <span className="text-[10px] text-amber-400 font-bold px-2 py-0.5 bg-amber-500/10 rounded-md">
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
                  placeholder="27AAAAA0000A1Z5"
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
                className="px-6 py-3 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-2xl shadow-lg shadow-primary/20 flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Save Company Profile
              </button>
            </div>
          )}
        </form>
      )}

      {/* 2. EMPLOYEES & EMAIL CONFIGURATION TAB */}
      {activeTab === "employees" && (
        <div className="space-y-6">
          <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xs font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
                  <Users className="w-4 h-4 text-primary" /> Company Employee & Email Account Management
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Active Employees: <strong className="text-emerald-400">{activeEmployeeCount} / 5 Maximum</strong>. Each employee can have their own sending email account.
                </p>
              </div>

              {isAdmin && (
                <button
                  onClick={() => setShowAddEmployeeModal(true)}
                  disabled={activeEmployeeCount >= 5}
                  className="px-4 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md shadow-primary/20"
                >
                  <UserPlus className="w-4 h-4" /> Add Employee Account
                </button>
              )}
            </div>

            {activeEmployeeCount >= 5 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs rounded-xl font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Maximum 5 active employees allowed in this company installation.</span>
              </div>
            )}

            {/* Employee Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3">Employee</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Sending Email Account</th>
                    <th className="py-3 px-3">Connection Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {employees.map(emp => {
                    const acct = emp.email_account;
                    const isTesting = testingConnectionId === emp.id;
                    const isConnected = acct?.last_test_status === "Connected";
                    const isFailed = acct?.last_test_status?.startsWith("Connection Failed");

                    return (
                      <tr key={emp.id} className="hover:bg-slate-900/50">
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-white">{emp.full_name || emp.email}</div>
                          <div className="text-[10px] text-slate-400">{emp.email}</div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            emp.role === "admin" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          }`}>
                            {emp.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          {acct ? (
                            <div>
                              <div className="font-mono text-white text-[11px] font-bold">{acct.email}</div>
                              <div className="text-[9px] text-slate-400">{acct.provider || "Custom SMTP"} ({acct.smtp_host}:{acct.smtp_port})</div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Not Configured</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          {acct ? (
                            <div>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1 ${
                                isConnected
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : isFailed
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                  : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                              }`}>
                                <Check className="w-3 h-3" />
                                {acct.last_test_status || "Configured (Not Tested)"}
                              </span>
                              {acct.last_tested_at && (
                                <div className="text-[9px] text-slate-500 mt-0.5">
                                  Last tested: {new Date(acct.last_tested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-800 text-slate-400">
                              No Config
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {acct && (
                              <button
                                onClick={() => handleTestConnection(emp.id)}
                                disabled={isTesting}
                                className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                              >
                                {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-emerald-400" />}
                                {isTesting ? "Testing..." : "Test"}
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenEmailModal(emp)}
                              className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary-light border border-primary/20 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                            >
                              <Settings2 className="w-3 h-3" />
                              {acct ? "Edit Email" : "Configure Email"}
                            </button>

                            {isAdmin && emp.role !== "admin" && (
                              <button
                                onClick={() => handleToggleActive(emp.id)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                  emp.is_active ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                }`}
                              >
                                {emp.is_active ? "Deactivate" : "Activate"}
                              </button>
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

          {/* Add Employee Account Modal */}
          {showAddEmployeeModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-extrabold text-white text-sm">Add Company Employee</h3>
                  <button onClick={() => setShowAddEmployeeModal(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <form onSubmit={handleCreateEmployee} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 mb-1">Company Email</label>
                    <input
                      type="email"
                      required
                      placeholder="employee@company.com"
                      value={newEmployee.email}
                      onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      value={newEmployee.full_name}
                      onChange={e => setNewEmployee({ ...newEmployee, full_name: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 mb-1">Designation</label>
                    <input
                      type="text"
                      required
                      placeholder="Sales Executive / Prospector"
                      value={newEmployee.designation}
                      onChange={e => setNewEmployee({ ...newEmployee, designation: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 mb-1">Initial Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={newEmployee.password}
                      onChange={e => setNewEmployee({ ...newEmployee, password: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddEmployeeModal(false)}
                      className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 bg-primary text-white font-bold rounded-xl flex items-center gap-2"
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
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-5 text-xs font-sans max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary" />
                      Email Configuration for {editingEmailEmployee.full_name || editingEmailEmployee.email}
                    </h3>
                    <p className="text-[10px] text-slate-400">Configure dedicated SMTP account used for cold email outreach.</p>
                  </div>
                  <button onClick={() => setEditingEmailEmployee(null)} className="text-slate-400 hover:text-white">✕</button>
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
                        <option value="Gmail">Gmail</option>
                        <option value="Google Workspace">Google Workspace</option>
                        <option value="Microsoft 365 / Outlook">Microsoft 365 / Outlook</option>
                        <option value="Hostinger">Hostinger</option>
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
                      SMTP Password / App Password 🔒
                    </label>
                    <input
                      type="password"
                      placeholder={editingEmailEmployee.email_account?.has_password ? "•••••••• (Saved - Leave blank to keep unchanged)" : "Enter password or App Password"}
                      value={emailForm.password}
                      onChange={e => setEmailForm({ ...emailForm, password: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                    />
                    <div className="mt-1 space-y-1">
                      {(emailForm.provider === "Gmail" || emailForm.provider === "Google Workspace") && (
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
                    {editingEmailEmployee.email_account ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteEmailAccount(editingEmailEmployee.id)}
                        className="px-3 py-1.5 text-rose-400 hover:bg-rose-500/10 font-bold rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Configuration
                      </button>
                    ) : <div />}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingEmailEmployee(null)}
                        className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={savingEmailConfig}
                        className="px-5 py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-primary/20"
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
        </div>
      )}

      {/* 3. SMTP STATUS TAB */}
      {activeTab === "smtp" && (
        <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800 space-y-4">
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
                <p className="font-mono text-white mt-0.5">{smtpStatus?.active_employee_accounts || 0} Accounts</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Tested Connections:</span>
                <p className="font-mono text-white mt-0.5">{smtpStatus?.connected_accounts || 0} Connected</p>
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
        <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-extrabold text-white flex items-center gap-2 uppercase tracking-wider border-b border-slate-800 pb-3">
            <Moon className="w-4 h-4 text-primary" /> Appearance & Theme Preferences
          </h3>

          <div className="flex gap-4">
            <button
              onClick={() => setThemeMode("dark")}
              className={`flex-1 py-3.5 px-4 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                themeMode === "dark"
                  ? "bg-primary/20 border-primary text-white"
                  : "bg-slate-900 border-slate-800 text-slate-400"
              }`}
            >
              <Moon className="w-4 h-4 text-primary" /> Dark Mode (Recommended)
            </button>

            <button
              onClick={() => setThemeMode("light")}
              className={`flex-1 py-3.5 px-4 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                themeMode === "light"
                  ? "bg-primary/20 border-primary text-white"
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
        <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800 space-y-4">
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
        <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-extrabold text-white flex items-center gap-2 uppercase tracking-wider border-b border-slate-800 pb-3">
            <Activity className="w-4 h-4 text-primary" /> Internal Audit & Activity Logs
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
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
    </div>
  );
}
