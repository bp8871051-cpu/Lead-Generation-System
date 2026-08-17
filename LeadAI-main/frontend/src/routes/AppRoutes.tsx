import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { AdminRoute } from './AdminRoute';

import { Login } from '../pages/Login';
import { ResetPassword } from '../pages/ResetPassword';
import { DashboardOverview } from '../pages/DashboardOverview';
import { LeadDiscovery } from '../pages/LeadDiscovery';
import { SavedLeads } from '../pages/SavedLeads';
import { LeadDetail } from '../pages/LeadDetail';
import { EmailOutreach } from '../pages/EmailOutreach';
import { AdminSettings } from '../pages/AdminSettings';
import { LinkScraper } from '../pages/LinkScraper';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      {/* Protected Dashboard Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardOverview />} />
          <Route path="/dashboard/search" element={<LeadDiscovery />} />
          <Route path="/dashboard/leads" element={<SavedLeads />} />
          <Route path="/dashboard/leads/:id" element={<LeadDetail />} />
          <Route path="/dashboard/emails" element={<EmailOutreach />} />
          <Route path="/dashboard/scraper" element={<LinkScraper />} />
          <Route path="/dashboard/settings" element={<AdminSettings />} />
        </Route>
      </Route>

      {/* Fallback Redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
