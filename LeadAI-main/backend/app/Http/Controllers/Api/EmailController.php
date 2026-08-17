<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Campaign;
use App\Models\Company;
use App\Models\Email;
use App\Models\EmployeeEmailAccount;
use App\Models\Lead;
use App\Models\User;
use App\Services\AiLeadAnalyzerService;
use App\Services\BrevoEmailService;
use Illuminate\Http\Request;

class EmailController extends Controller
{
    public function getActiveSenders(Request $request)
    {
        $usersWithAccounts = User::where('is_active', true)
            ->whereHas('emailAccount', function ($q) {
                $q->where('is_active', true);
            })
            ->with('emailAccount')
            ->get();

        $results = [];
        foreach ($usersWithAccounts as $u) {
            $acct = $u->emailAccount;
            if ($acct && $acct->email) {
                $results[] = [
                    "employee_id" => $u->id,
                    "employee_name" => $u->full_name ?: $u->email,
                    "email" => $acct->email,
                    "sender_name" => $acct->sender_name ?: ($u->full_name ?: $u->email),
                    "provider" => $acct->provider ?: "Custom SMTP",
                    "is_active" => $acct->is_active,
                    "last_test_status" => $acct->last_test_status
                ];
            }
        }

        return response()->json($results);
    }

    public function createCampaign(Request $request)
    {
        $request->validate(['name' => 'required|string']);

        $targetEmpId = $request->input('employee_id', $request->user()->id);
        $campaign = Campaign::create([
            'name' => $request->name,
            'subject' => $request->subject,
            'body_template' => $request->body_template,
            'status' => 'Draft',
            'user_id' => $targetEmpId,
        ]);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'CAMPAIGN_CREATE',
            'description' => "Created email campaign '{$request->name}' for employee ID {$targetEmpId}",
        ]);

        return response()->json($campaign);
    }

    public function getCampaigns(Request $request)
    {
        $campaigns = Campaign::orderBy('created_at', 'desc')->get();
        return response()->json($campaigns);
    }

    public function generateDraft(Request $request)
    {
        $request->validate([
            'lead_id' => 'required|integer',
            'channel' => 'required|string',
        ]);

        $lead = Lead::with('business')->find($request->lead_id);
        if (!$lead) {
            return response()->json(['detail' => 'Lead profile not found'], 404);
        }

        $details = [
            "ai_recommended_services" => $lead->ai_recommended_services ?: "Web design, SEO optimization",
            "rating" => $lead->business->google_rating ?? 0.0
        ];

        $generatedText = AiLeadAnalyzerService::generateMessageTemplate(
            $lead->business->name,
            $lead->business->name,
            $lead->business->industry ?: "local business",
            $lead->lead_score,
            $request->channel,
            $details
        );

        $defaultCampaign = Campaign::firstOrCreate(
            ['name' => 'Direct Outreach'],
            ['user_id' => $request->user()->id, 'status' => 'Active']
        );

        $newEmail = Email::create([
            'campaign_id' => $defaultCampaign->id,
            'lead_id' => $lead->id,
            'sender_id' => $request->user()->id,
            'sender_email' => $request->user()->email,
            'recipient_email' => $lead->business->email ?: '',
            'generated_body' => $generatedText,
            'subject' => "Outreach Opportunity for {$lead->business->name}",
            'status' => 'Draft',
        ]);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'DRAFT_GENERATE',
            'description' => "Generated {$request->channel} email draft for lead '{$lead->business->name}'",
        ]);

        return response()->json($newEmail);
    }

    public function getLeadDrafts($leadId, Request $request)
    {
        $emails = Email::where('lead_id', $leadId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($emails);
    }

    public function sendEmail(Request $request)
    {
        $request->validate([
            'lead_id' => 'required|integer',
            'subject' => 'required|string',
            'body' => 'required|string',
            'recipient_email' => 'required|email',
        ]);

        $lead = Lead::with('business')->find($request->lead_id);
        if (!$lead) {
            return response()->json(['detail' => 'Lead profile not found'], 404);
        }

        $company = Company::first() ?? new Company();
        $targetEmpId = $request->input('employee_id', $request->user()->id);
        $targetUser = User::where('id', $targetEmpId)->where('is_active', true)->first() ?: $request->user();

        $emailAccount = $targetUser->emailAccount;
        $senderEmail = $emailAccount && $emailAccount->is_active ? ($emailAccount->email ?: env('DEFAULT_SENDER_EMAIL', 'contact@blueboxxda.com')) : env('DEFAULT_SENDER_EMAIL', 'contact@blueboxxda.com');
        $senderName = $emailAccount && $emailAccount->is_active ? ($emailAccount->sender_name ?: ($targetUser->full_name ?: $targetUser->email)) : ($targetUser->full_name ?: 'LeadAI Outreach');

        $finalBody = $request->body;
        $res = \App\Services\NormalEmailService::sendEmail(
            $senderName,
            $senderEmail,
            $request->recipient_email,
            $request->subject,
            $finalBody,
            $emailAccount
        );

        $sentSuccessfully = ($res['status'] === 'success');
        $defaultCampaign = Campaign::firstOrCreate(
            ['name' => 'Direct Outreach'],
            ['user_id' => $targetUser->id, 'status' => 'Active']
        );

        $newEmail = Email::create([
            'campaign_id' => $defaultCampaign->id,
            'lead_id' => $request->lead_id,
            'sender_id' => $targetUser->id,
            'sender_email' => $senderEmail,
            'recipient_email' => $request->recipient_email,
            'provider' => 'Standard SMTP / Mail',
            'error_message' => $sentSuccessfully ? null : ($res['error_message'] ?? $res['message']),
            'provider_message_id' => $res['message_id'] ?? null,
            'generated_body' => $finalBody,
            'subject' => $request->subject,
            'status' => $sentSuccessfully ? 'Sent' : 'Failed',
            'sent_at' => $sentSuccessfully ? now() : null,
        ]);

        if ($sentSuccessfully) {
            $lead->status = 'Contacted';
            $lead->save();

            ActivityLog::create([
                'user_id' => $targetUser->id,
                'action' => 'EMAIL_SENT',
                'description' => "Sent outreach from '{$senderEmail}' to '{$request->recipient_email}' for lead '{$lead->business->name}'",
            ]);

            return response()->json([
                'status' => 'success',
                'message' => "Email successfully sent from {$senderEmail} to {$request->recipient_email}",
                'sender_email' => $senderEmail,
                'provider_message_id' => $res['message_id'] ?? null
            ]);
        }

        return response()->json([
            'status' => 'failed',
            'detail' => "Email delivery status: " . ($res['error_message'] ?? $res['message']),
            'message' => "Email saved as Failed. " . ($res['error_message'] ?? $res['message']),
            'sender_email' => $senderEmail,
        ], 200);
    }
}
