import React from 'react';
import { Outlet } from 'react-router-dom';
import { Logo } from '../components/Logo';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-600/15 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Header Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        {/* Content Card */}
        <div className="glass-panel p-8 rounded-3xl shadow-2xl border border-slate-800">
          <Outlet />
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-500 mt-6">
          &copy; 2026 BLUEBOXX.DA PRIVATE LIMITED. All Rights Reserved.
        </div>
      </div>
    </div>
  );
};
