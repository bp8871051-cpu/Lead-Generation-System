import React, { useState, useEffect } from 'react';
import { adminService } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { Building, Users, Shield, Database, Activity, CheckCircle, AlertCircle, Plus, Key } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const { user } = useAuth();

  // Tabs: Company, Employees, Email Config, System Logs, Backup
  const [activeTab, setActiveTab] = useState<'company' | 'employees' | 'logs' | 'backup'>('company');

  // Company Profile state
  const [company, setCompany] = useState<any>({
    company_name: 'BLUEBOXX.DA PRIVATE LIMITED',
    brand_name: 'BLUEBOXX.DA',
    company_email: 'contact@blueboxxda.com',
    company_phone: '+91 98765 43210',
    company_address: 'BLUEBOXX.DA Tower, Tech Park Road',
    city: 'Ahmedabad',
    state: 'Gujarat',
    country: 'India',
    gst_number: '24AAAAA0000A1Z5',
    cin_number: 'U72900GJ2026PTC123456',
  });

  // Employees List state
  const [employees, setEmployees] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  // Employee creation modal state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('employee');

  // Email Config state for selected employee
  const [selectedUserEmail, setSelectedUserEmail] = useState<any>(null);
  const [smtpKey, setSmtpKey] = useState('');

  const [msg, setMsg] = useState('');

  const loadData = async () => {
    try {
      const [cData, eData, lData] = await Promise.all([
        adminService.getCompanyProfile(),
        adminService.getEmployees(),
        adminService.getSystemLogs()
      ]);
      if (cData) setCompany(cData);
      setEmployees(eData || []);
      setLogs(lData || []);
    } catch (err: any) {
      console.error('Failed to load settings data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    try {
      await adminService.updateCompanyProfile(company);
      setMsg('Company Profile updated successfully!');
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    try {
      await adminService.createEmployee({
        email: newEmail,
        password: newPassword,
        full_name: newName,
        role: newRole,
      });
      setMsg('Employee created successfully!');
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      loadData();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const handleToggleEmployee = async (id: number) => {
    try {
      await adminService.toggleEmployeeStatus(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const handleSaveEmployeeEmail = async (userId: number) => {
    try {
      await adminService.saveEmployeeEmailAccount(userId, {
        email: selectedUserEmail?.email || user?.email,
        password: smtpKey,
        provider: 'Brevo HTTPS API'
      });
      setMsg('Employee Email API Key saved!');
      loadData();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const handleTestConnection = async (userId: number) => {
    try {
      const res = await adminService.testEmployeeEmailConnection(userId);
      alert(`Test Result: ${res.message}`);
    } catch (err: any) {
      alert(`Connection failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Admin & Single-Company Settings</h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure agency branding, manage team members (Max 5 Active Limit), and verify system audit logs.
        </p>
      </div>

      {msg && (
        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs">
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('company')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'company' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Company Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('employees')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'employees' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Employee Management (Max 5 Limit)</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'logs' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>System Audit Logs</span>
        </button>
      </div>

      {/* Tab 1: Company Profile */}
      {activeTab === 'company' && (
        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-md space-y-4">
          <h2 className="text-sm font-bold text-slate-100">Agency Branding & Official Details</h2>

          <form onSubmit={handleUpdateCompany} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Company Name</label>
              <input
                type="text"
                value={company.company_name}
                onChange={(e) => setCompany({ ...company, company_name: e.target.value })}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Brand Name</label>
              <input
                type="text"
                value={company.brand_name}
                onChange={(e) => setCompany({ ...company, brand_name: e.target.value })}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Company Email</label>
              <input
                type="email"
                value={company.company_email}
                onChange={(e) => setCompany({ ...company, company_email: e.target.value })}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Company Phone</label>
              <input
                type="text"
                value={company.company_phone}
                onChange={(e) => setCompany({ ...company, company_phone: e.target.value })}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">City / State</label>
              <input
                type="text"
                value={`${company.city}, ${company.state}`}
                onChange={(e) => {
                  const parts = e.target.value.split(',');
                  setCompany({ ...company, city: parts[0]?.trim() || '', state: parts[1]?.trim() || '' });
                }}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">GST Number</label>
              <input
                type="text"
                value={company.gst_number}
                onChange={(e) => setCompany({ ...company, gst_number: e.target.value })}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="py-2.5 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 transition-all"
              >
                Save Company Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Employee Management */}
      {activeTab === 'employees' && (
        <div className="space-y-6">
          {/* Create Employee Box */}
          {user?.role === 'admin' && (
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-md space-y-4">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                <span>Create Team Member Account (Max 5 Active Limit)</span>
              </h2>

              <form onSubmit={handleCreateEmployee} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="glass-input px-3 py-2 rounded-xl text-xs"
                />
                <input
                  type="email"
                  required
                  placeholder="Employee Email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="glass-input px-3 py-2 rounded-xl text-xs"
                />
                <input
                  type="password"
                  required
                  placeholder="Password (min 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="glass-input px-3 py-2 rounded-xl text-xs"
                />
                <button
                  type="submit"
                  className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md shadow-purple-500/20"
                >
                  Create Account
                </button>
              </form>
            </div>
          )}

          {/* Employee Table */}
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-md space-y-4">
            <h2 className="text-sm font-bold text-slate-100">Team Accounts & Email Configuration</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Outreach Email API Key</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-200">{emp.full_name || emp.email}</div>
                        <div className="text-[11px] text-slate-400">{emp.email}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {emp.role}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          emp.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {emp.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="password"
                            placeholder="xkeysib-..."
                            onChange={(e) => {
                              setSelectedUserEmail(emp);
                              setSmtpKey(e.target.value);
                            }}
                            className="glass-input px-2.5 py-1 rounded-lg text-xs w-44"
                          />
                          <button
                            onClick={() => handleSaveEmployeeEmail(emp.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
                          >
                            Save API Key
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleTestConnection(emp.id)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30"
                          >
                            Test Connection
                          </button>
                          {user?.role === 'admin' && emp.id !== user.id && (
                            <button
                              onClick={() => handleToggleEmployee(emp.id)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-xs font-bold"
                            >
                              {emp.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: System Audit Logs */}
      {activeTab === 'logs' && (
        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-md space-y-4">
          <h2 className="text-sm font-bold text-slate-100">Audit Trail (Last 100 User Actions)</h2>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {logs.map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-purple-400 mr-2">[{log.action}]</span>
                  <span className="text-slate-300">{log.description}</span>
                  <div className="text-[10px] text-slate-500 mt-0.5">By {log.user_name || 'System User'}</div>
                </div>
                <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
