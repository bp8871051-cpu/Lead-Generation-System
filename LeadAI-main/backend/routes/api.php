<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CrmController;
use App\Http\Controllers\Api\EmailController;
use App\Http\Controllers\Api\ExportController;
use App\Http\Controllers\Api\LeadController;
use App\Http\Controllers\Api\SearchController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - LeadAI Platform
|--------------------------------------------------------------------------
*/

// Public Authentication Routes
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('reset-password', [AuthController::class, 'resetPassword']);
});

// Protected API Routes (Sanctum Bearer / Cookie Auth)
Route::middleware('auth:sanctum')->group(function () {
    // Auth Profile & Logout
    Route::prefix('auth')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::put('me', [AuthController::class, 'updateProfile']);
        Route::post('logout', [AuthController::class, 'logout']);
    });

    // Search & Scraper Endpoints
    Route::prefix('search')->group(function () {
        Route::post('', [SearchController::class, 'runSearch']);
        Route::get('history', [SearchController::class, 'history']);
        Route::get('history/{id}/businesses', [SearchController::class, 'scanBusinesses']);
        Route::delete('history/{id}', [SearchController::class, 'deleteScan']);
        Route::post('scrape-link', [SearchController::class, 'scrapeLink']);
    });

    // Leads & Audit Endpoints
    Route::prefix('leads')->group(function () {
        Route::get('', [LeadController::class, 'index']);
        Route::post('save/{businessId}', [LeadController::class, 'saveLead']);
        Route::get('{id}', [LeadController::class, 'show']);
        Route::post('{id}/assign', [LeadController::class, 'assignLead']);
        Route::patch('{id}/status', [LeadController::class, 'updateStatus']);
        Route::put('{id}/business', [LeadController::class, 'updateBusiness']);
        Route::delete('{id}', [LeadController::class, 'destroy']);
    });

    Route::put('businesses/{id}', [LeadController::class, 'updateBusiness']);

    // CRM Pipeline, Notes & Tasks
    Route::prefix('crm')->group(function () {
        Route::get('pipeline', [CrmController::class, 'pipeline']);
        Route::patch('leads/{leadId}/status', [CrmController::class, 'updateLeadStage']);
        Route::post('leads/{leadId}/notes', [CrmController::class, 'addNote']);
        Route::get('leads/{leadId}/notes', [CrmController::class, 'getNotes']);
        Route::post('leads/{leadId}/tasks', [CrmController::class, 'addTask']);
        Route::get('leads/{leadId}/tasks', [CrmController::class, 'getTasks']);
        Route::patch('tasks/{taskId}', [CrmController::class, 'updateTaskStatus']);
    });

    // Email Outreach & Campaigns
    Route::prefix('emails')->group(function () {
        Route::get('active-senders', [EmailController::class, 'getActiveSenders']);
        Route::post('campaigns', [EmailController::class, 'createCampaign']);
        Route::get('campaigns', [EmailController::class, 'getCampaigns']);
        Route::post('generate-draft', [EmailController::class, 'generateDraft']);
        Route::get('lead/{leadId}/drafts', [EmailController::class, 'getLeadDrafts']);
        Route::post('send', [EmailController::class, 'sendEmail']);
    });

    // Analytics Dashboard
    Route::prefix('analytics')->group(function () {
        Route::get('dashboard', [AnalyticsController::class, 'dashboard']);
    });

    // Data Export Streaming
    Route::prefix('export')->group(function () {
        Route::get('csv', [ExportController::class, 'exportCsv']);
        Route::get('json', [ExportController::class, 'exportJson']);
        Route::get('excel', [ExportController::class, 'exportExcel']);
    });

    // Admin & Single-Company Settings
    Route::prefix('admin')->group(function () {
        Route::get('company', [AdminController::class, 'getCompanyProfile']);
        Route::put('company', [AdminController::class, 'updateCompanyProfile'])->middleware('admin');
        Route::get('employees', [AdminController::class, 'listEmployees']);
        Route::post('employees', [AdminController::class, 'createEmployee'])->middleware('admin');
        Route::put('employees/{id}', [AdminController::class, 'updateEmployee'])->middleware('admin');
        Route::post('employees/{id}/toggle-active', [AdminController::class, 'toggleEmployeeStatus'])->middleware('admin');
        Route::get('employees/{id}/email-account', [AdminController::class, 'getEmployeeEmailAccount']);
        Route::post('employees/{id}/email-account', [AdminController::class, 'upsertEmployeeEmailAccount']);
        Route::delete('employees/{id}/email-account', [AdminController::class, 'deleteEmployeeEmailAccount']);
        Route::post('employees/{id}/test-email-connection', [AdminController::class, 'testEmployeeEmailConnection']);
        Route::get('smtp-status', [AdminController::class, 'smtpStatus']);
        Route::get('system-logs', [AdminController::class, 'systemLogs']);
        Route::get('backup-db', [AdminController::class, 'backupDatabase'])->middleware('admin');
    });
});
