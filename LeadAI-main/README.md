# LeadAI — Enterprise B2B Lead Generation & Outreach Platform

## Production Full Stack Architecture Migration

This repository contains the complete migrated **LeadAI** platform restructured into a production-ready **React.js + Vite** frontend and **PHP 8.2+ / Laravel 11** REST API backend powered by **MySQL 8+**.

---

## 🛠️ Technology Stack

### **Frontend**
- **Framework**: React.js 19 + Vite 6
- **Routing**: React Router DOM (`react-router-dom` v7)
- **Styling**: Tailwind CSS + Framer Motion (Glassmorphic dark UI)
- **Icons**: Lucide React
- **API Client**: Axios with centralized Bearer auth interceptors

### **Backend**
- **Framework**: PHP 8.2+ / Laravel 11/12 REST API Architecture
- **Authentication**: Laravel Sanctum (Tokens & Secure Cookies)
- **Database & ORM**: MySQL 8+ with Eloquent ORM & 13 Database Migrations
- **Integrations**: Brevo Transactional Email HTTPS API, OpenAI GPT-3.5/4 SWOT Engine, OpenStreetMap Scraper, Apify Google Maps Actor

---

## 📁 Final Folder Structure

```
project/
├── frontend/                     # React.js + Vite Frontend
│   ├── src/
│   │   ├── api/                  # Axios Client & Services (auth, search, leads, crm, emails, analytics, admin, export)
│   │   ├── components/           # Logo, Navbar, Sidebar, StatCard, LeadTable, Modals
│   │   ├── context/              # AuthContext provider
│   │   ├── layouts/              # AuthLayout, DashboardLayout
│   │   ├── pages/                # Login, ResetPassword, DashboardOverview, LeadDiscovery, SavedLeads, LeadDetail, EmailOutreach, AdminSettings, LinkScraper
│   │   ├── routes/               # AppRoutes, ProtectedRoute, AdminRoute
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css             # Glassmorphism design tokens
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── .env                      # VITE_API_URL=http://localhost:8000/api
│
├── backend/                      # PHP 8.2+ Laravel 11 REST API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/  # Auth, Search, Lead, Crm, Email, Analytics, Admin, Export
│   │   │   └── Middleware/       # EnsureAdmin, ForceJsonResponse
│   │   ├── Models/               # User, Company, Search, Business, Lead, Campaign, EmployeeEmailAccount, Email, Note, Task, ActivityLog, PasswordResetToken
│   │   └── Services/             # Deduplication, WebsiteAnalyzer, GoogleMapsScraper, AiLeadAnalyzer, BrevoEmail
│   ├── config/                   # cors, sanctum, database
│   ├── database/
│   │   ├── migrations/           # 13 MySQL Table Migrations
│   │   └── seeders/              # DatabaseSeeder (Default Admin & Company)
│   ├── routes/
│   │   └── api.php               # Grouped Sanctum REST API Routes
│   ├── artisan
│   ├── composer.json
│   └── .env
│
├── run_all.bat
└── README.md
```

---

## 🚀 Execution & Setup Guide

### 1. Database Setup (MySQL 8+)
Create a MySQL database named `leadai`:
```sql
CREATE DATABASE leadai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend Setup (Laravel 11)
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve --port 8000
```
- **Backend API Base URL**: `http://localhost:8000/api`
- **Default Admin Login**: `admin@blueboxxda.com` | Password: `admin123`
- **Default Employee Login**: `employee@blueboxxda.com` | Password: `employee123`

### 3. Frontend Setup (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
- **Frontend App URL**: `http://localhost:5173`

---

## 🔒 Security & Business Rules Preserved
1. **Single Company Employee Limit**: Maximum of 5 active employees enforced inside `AdminController` and `User` models.
2. **4-Tier Deduplication**: 1. Google Place ID -> 2. Website Domain -> 3. Phone Number -> 4. Name+Address Slug.
3. **Brevo HTTPS Email Delivery**: Safe transaction email dispatching over Port 443.
