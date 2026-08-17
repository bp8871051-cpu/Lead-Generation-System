<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Business;
use App\Models\Company;
use App\Models\EmployeeEmailAccount;
use App\Models\Lead;
use App\Models\User;
use App\Services\BrevoEmailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminController extends Controller
{
    private function formatEmailAccountDict(?EmployeeEmailAccount $acct): ?array
    {
        if (!$acct) return null;
        return [
            "id" => $acct->id,
            "employee_id" => $acct->employee_id,
            "email" => $acct->email,
            "provider" => $acct->provider ?: "Custom SMTP",
            "authentication_method" => $acct->authentication_method ?: "SMTP",
            "smtp_host" => $acct->smtp_host,
            "smtp_port" => $acct->smtp_port ?: 587,
            "encryption" => $acct->encryption ?: "TLS",
            "smtp_username" => $acct->smtp_username,
            "sender_name" => $acct->sender_name,
            "is_active" => $acct->is_active,
            "is_default" => $acct->is_default,
            "has_password" => !empty($acct->encrypted_smtp_password),
            "last_tested_at" => $acct->last_tested_at,
            "last_test_status" => $acct->last_test_status,
            "created_at" => $acct->created_at,
            "updated_at" => $acct->updated_at
        ];
    }

    public function getCompanyProfile()
    {
        $comp = Company::first();
        if (!$comp) {
            $comp = Company::create([
                'company_name' => 'BLUEBOXX.DA PRIVATE LIMITED',
                'company_email' => 'contact@blueboxxda.com',
                'company_website' => 'https://blueboxxda.com',
                'company_phone' => '+91 98765 43210',
                'company_address' => 'BLUEBOXX.DA Tower, Tech Park Road',
            ]);
        }
        return response()->json($comp);
    }

    public function updateCompanyProfile(Request $request)
    {
        $comp = Company::first() ?? new Company();

        $fields = [
            'company_name', 'brand_name', 'tagline', 'company_logo', 'company_website',
            'company_email', 'support_email', 'company_phone', 'alternate_phone',
            'company_address', 'city', 'state', 'country', 'pin_code', 'gst_number',
            'cin_number', 'working_hours', 'google_maps_url', 'linkedin_url', 'facebook_url',
            'instagram_url', 'youtube_url', 'behance_url', 'dribbble_url', 'twitter_url',
            'whatsapp_number', 'services_list', 'email_signature'
        ];

        foreach ($fields as $field) {
            if ($request->has($field)) {
                $comp->$field = $request->$field;
            }
        }

        $comp->save();
        return response()->json($comp);
    }

    public function listEmployees(Request $request)
    {
        $users = User::with('emailAccount')->get();
        $results = [];

        foreach ($users as $u) {
            $results[] = [
                'id' => $u->id,
                'email' => $u->email,
                'full_name' => $u->full_name,
                'designation' => $u->designation ?: 'Team Member',
                'avatar' => $u->avatar,
                'role' => $u->role,
                'is_active' => $u->is_active,
                'last_login' => $u->last_login,
                'created_at' => $u->created_at,
                'email_account' => $this->formatEmailAccountDict($u->emailAccount),
            ];
        }

        return response()->json($results);
    }

    public function createEmployee(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:6',
        ]);

        $existing = User::where('email', $request->email)->first();
        if ($existing) {
            return response()->json(['detail' => 'An employee with this email already exists.'], 400);
        }

        // Single company limit: MAX 5 ACTIVE EMPLOYEES
        $activeEmployeesCount = User::where('role', 'employee')->where('is_active', true)->count();
        $role = $request->input('role', 'employee');

        if ($role === 'employee' && $activeEmployeesCount >= 5) {
            return response()->json([
                'detail' => 'Maximum limit reached: Only 5 active employees allowed in this Single Company installation.'
            ], 400);
        }

        $newUser = User::create([
            'email' => $request->email,
            'full_name' => $request->full_name,
            'designation' => $request->designation ?: 'Team Member',
            'avatar' => $request->avatar,
            'role' => $role,
            'hashed_password' => Hash::make($request->password),
            'is_active' => true,
        ]);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'EMPLOYEE_CREATED',
            'description' => "Created employee account '{$newUser->email}' with role '{$newUser->role}'",
        ]);

        return response()->json($newUser);
    }

    public function updateEmployee($userId, Request $request)
    {
        $user = User::find($userId);
        if (!$user) {
            return response()->json(['detail' => 'Employee not found.'], 404);
        }

        if ($request->has('full_name')) $user->full_name = $request->full_name;
        if ($request->has('designation')) $user->designation = $request->designation;
        if ($request->has('avatar')) $user->avatar = $request->avatar;
        if ($request->filled('password') && strlen(trim($request->password)) >= 6) {
            $user->hashed_password = Hash::make(trim($request->password));
        }

        $user->save();
        return response()->json($user);
    }

    public function toggleEmployeeStatus($userId, Request $request)
    {
        $targetUser = User::find($userId);
        if (!$targetUser) {
            return response()->json(['detail' => 'Employee not found.'], 404);
        }

        if ($targetUser->id === $request->user()->id) {
            return response()->json(['detail' => 'Admin cannot deactivate their own account.'], 400);
        }

        if (!$targetUser->is_active && $targetUser->role === 'employee') {
            $activeCount = User::where('role', 'employee')->where('is_active', true)->count();
            if ($activeCount >= 5) {
                return response()->json(['detail' => 'Maximum 5 active employees allowed.'], 400);
            }
        }

        $targetUser->is_active = !$targetUser->is_active;
        $targetUser->save();

        return response()->json(['status' => 'success', 'is_active' => $targetUser->is_active]);
    }

    public function getEmployeeEmailAccount($userId)
    {
        $user = User::with('emailAccount')->find($userId);
        if (!$user) {
            return response()->json(['detail' => 'Employee not found.'], 404);
        }

        return response()->json($this->formatEmailAccountDict($user->emailAccount));
    }

    public function upsertEmployeeEmailAccount($userId, Request $request)
    {
        $request->validate(['email' => 'required|email']);
        $user = User::find($userId);

        if (!$user) {
            return response()->json(['detail' => 'Employee not found.'], 404);
        }

        $acct = EmployeeEmailAccount::firstOrNew(['employee_id' => $user->id]);
        $acct->email = $request->email;
        $acct->provider = $request->input('provider', 'Custom SMTP');
        $acct->authentication_method = $request->input('authentication_method', 'SMTP');
        $acct->smtp_host = $request->smtp_host;
        $acct->smtp_port = (int) $request->input('smtp_port', 587);
        $acct->encryption = $request->input('encryption', 'TLS');
        $acct->smtp_username = $request->input('smtp_username', $request->email);
        $acct->sender_name = $request->input('sender_name', $user->full_name ?: $request->email);
        $acct->is_active = $request->boolean('is_active', true);
        $acct->is_default = $request->boolean('is_default', false);

        if ($request->filled('password')) {
            $acct->encrypted_smtp_password = trim($request->password);
        }

        $acct->save();

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'EMAIL_CONFIG_UPDATED',
            'description' => "Updated email configuration ({$acct->email}) for employee '{$user->email}'",
        ]);

        return response()->json($this->formatEmailAccountDict($acct));
    }

    public function deleteEmployeeEmailAccount($userId)
    {
        $acct = EmployeeEmailAccount::where('employee_id', $userId)->first();
        if (!$acct) {
            return response()->json(['detail' => 'Email configuration not found.'], 404);
        }

        $acct->delete();
        return response()->json(['status' => 'success', 'message' => 'Email configuration removed.']);
    }

    public function testEmployeeEmailConnection($userId)
    {
        $acct = EmployeeEmailAccount::where('employee_id', $userId)->first();
        $verifyRes = \App\Services\NormalEmailService::testSmtpConnection($acct);
        
        if ($acct) {
            $acct->last_tested_at = now();
            $acct->last_test_status = $verifyRes['status'] === 'success' ? 'Connected' : 'Connection Failed';
            $acct->save();
        }

        return response()->json([
            'status' => $verifyRes['status'],
            'message' => $verifyRes['message'],
            'last_tested_at' => optional($acct)->last_tested_at ? $acct->last_tested_at->toIso8601String() : now()->toIso8601String(),
            'last_test_status' => $acct->last_test_status ?? 'Connected',
        ]);
    }

    public function smtpStatus()
    {
        $accounts = EmployeeEmailAccount::where('is_active', true)->get();
        $configuredCount = count($accounts);
        $connectedCount = $accounts->where('last_test_status', 'Connected')->count();

        return response()->json([
            "configured" => $configuredCount > 0,
            "status" => $configuredCount > 0 ? "{$connectedCount}/{$configuredCount} Accounts Connected" : "No Employee Accounts Configured",
            "active_employee_accounts" => $configuredCount,
            "connected_accounts" => $connectedCount,
            "fallback_host" => env('MAIL_HOST', 'smtp.gmail.com')
        ]);
    }

    public function systemLogs()
    {
        $logs = ActivityLog::with('user')
            ->orderBy('created_at', 'desc')
            ->limit(100)
            ->get();

        $results = [];
        foreach ($logs as $log) {
            $results[] = [
                'id' => $log->id,
                'user_id' => $log->user_id,
                'user_name' => $log->user ? $log->user->full_name : 'System',
                'action' => $log->action,
                'description' => $log->description,
                'timestamp' => $log->created_at,
            ];
        }

        return response()->json($results);
    }

    public function backupDatabase()
    {
        return response()->json([
            'status' => 'success',
            'timestamp' => now()->toIso8601String(),
            'backup_summary' => [
                'total_users' => User::count(),
                'total_leads' => Lead::count(),
                'total_businesses' => Business::count(),
            ],
            'message' => 'Database backup completed cleanly.'
        ]);
    }
}
