"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Building2, Mail, Image, User, Moon, Sun, Database, Download, Trash2, 
  ShieldCheck, ArrowLeft, Loader2, Check, Users, UserPlus, Lock, Server, 
  Activity, AlertTriangle, RefreshCw, FileText
} from "lucide-react";
import { motion } from "framer-motion";
import { adminService, exportService, authService } from "@/services/api";

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

      const emps = await adminService.getEmployees();
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
              Manage Company Profile, Employees (Max 5 active), SMTP status, theme, and system audit logs.
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

            <div className="pt-4 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Social Profiles & Support</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 mb-1">LinkedIn URL</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={companyData.linkedin_url || ""}
                    onChange={e => setCompanyData({ ...companyData, linkedin_url: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-primary disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 mb-1">Facebook URL</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={companyData.facebook_url || ""}
                    onChange={e => setCompanyData({ ...companyData, facebook_url: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-primary disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 mb-1">Instagram URL</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={companyData.instagram_url || ""}
                    onChange={e => setCompanyData({ ...companyData, instagram_url: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-primary disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 mb-1">Support Email</label>
                  <input
                    type="email"
                    disabled={!isAdmin}
                    value={companyData.support_email || ""}
                    onChange={e => setCompanyData({ ...companyData, support_email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-primary disabled:opacity-60"
                  />
                </div>
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

      {/* 2. EMPLOYEES TAB */}
      {activeTab === "employees" && (
        <div className="space-y-6">
          <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xs font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
                  <Users className="w-4 h-4 text-primary" /> Company Employee Management
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Active Employees: <strong className="text-emerald-400">{activeEmployeeCount} / 5 Maximum</strong>
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

            {/* Employee Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3">Employee</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Designation</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {employees.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-900/50">
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{emp.full_name || emp.email}</div>
                        <div className="text-[10px] text-slate-400">{emp.email}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          emp.role === "admin" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        }`}>
                          {emp.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{emp.designation || "Team Member"}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          emp.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                        }`}>
                          {emp.is_active ? "Active" : "Deactivated"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isAdmin && emp.role !== "admin" && (
                          <button
                            onClick={() => handleToggleActive(emp.id)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                              emp.is_active ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                            }`}
                          >
                            {emp.is_active ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Employee Modal */}
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
        </div>
      )}

      {/* 3. SMTP STATUS TAB */}
      {activeTab === "smtp" && (
        <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-extrabold text-white flex items-center gap-2 uppercase tracking-wider border-b border-slate-800 pb-3">
            <Server className="w-4 h-4 text-emerald-400" /> Outgoing SMTP Server Configuration
          </h3>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">SMTP Server Status:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 ${
                smtpStatus?.configured 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              }`}>
                <Check className="w-3.5 h-3.5" />
                {smtpStatus?.status || "Unknown"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-800/60">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">SMTP Host:</span>
                <p className="font-mono text-white mt-0.5">{smtpStatus?.host || "Loaded from .env"}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">SMTP Port:</span>
                <p className="font-mono text-white mt-0.5">{smtpStatus?.port || 587}</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
              🔒 <strong>Note:</strong> All SMTP credentials and API keys are loaded strictly from the backend <code className="text-emerald-400 font-mono">.env</code> file. No key inputs required in UI.
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
