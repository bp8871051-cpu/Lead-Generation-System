import React from 'react';
import { NavLink } from 'react-router-dom';
import { Logo } from './Logo';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Search,
  Users,
  Mail,
  Settings,
  Link,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const navigation = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { name: 'Lead Discovery', to: '/dashboard/search', icon: Search },
    { name: 'Saved Leads & CRM', to: '/dashboard/leads', icon: Users },
    { name: 'Outreach & Campaigns', to: '/dashboard/emails', icon: Mail },
    { name: 'Link Scraper', to: '/dashboard/scraper', icon: Link },
    { name: 'Admin & Settings', to: '/dashboard/settings', icon: Settings, adminOnly: false },
  ];

  return (
    <aside className="w-64 bg-[#0B0F19] border-r border-slate-800/80 flex flex-col justify-between h-screen sticky top-0 z-40 p-4">
      <div>
        {/* Brand Header */}
        <div className="px-2 py-4 border-b border-slate-800/60 mb-6">
          <Logo size="md" />
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          <div className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 px-3 mb-2">
            Main Menu
          </div>

          {navigation.map((item) => {
            if (item.adminOnly && user?.role !== 'admin') return null;

            return (
              <NavLink
                key={item.name}
                to={item.to}
                end={item.to === '/dashboard'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 text-white shadow-lg shadow-purple-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <item.icon
                        className={`w-4 h-4 transition-colors ${
                          isActive ? 'text-purple-400' : 'text-slate-500 group-hover:text-slate-300'
                        }`}
                      />
                      <span>{item.name}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-purple-400" />}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Box */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800/80">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">BLUEBOXX.DA</div>
            <div className="text-[10px] text-slate-400">Enterprise CRM Suite</div>
          </div>
        </div>
        <div className="text-[10px] text-slate-500 leading-relaxed">
          Logged in as <span className="text-slate-300 font-medium">{user?.email}</span>
        </div>
      </div>
    </aside>
  );
};
