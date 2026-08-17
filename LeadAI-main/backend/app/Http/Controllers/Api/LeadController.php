<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Business;
use App\Models\Lead;
use App\Models\User;
use App\Services\AiLeadAnalyzerService;
use Illuminate\Http\Request;

class LeadController extends Controller
{
    public function index(Request $request)
    {
        $query = Lead::with('business', 'assignedUser');

        if ($request->filled('search_query')) {
            $search = $request->search_query;
            $query->whereHas('business', function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%");
            });
        }

        if ($request->filled('industry')) {
            $ind = $request->industry;
            $query->whereHas('business', function ($q) use ($ind) {
                $q->where('industry', 'LIKE', $ind);
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('min_rating')) {
            $rating = (float) $request->min_rating;
            $query->whereHas('business', function ($q) use ($rating) {
                $q->where('google_rating', '>=', $rating);
            });
        }

        if ($request->has('has_website')) {
            $hasWeb = filter_var($request->has_website, FILTER_VALIDATE_BOOLEAN);
            $query->whereHas('business', function ($q) use ($hasWeb) {
                if ($hasWeb) {
                    $q->whereNotNull('website')->where('website', '!=', '');
                } else {
                    $q->whereNull('website')->orWhere('website', '');
                }
            });
        }

        if ($request->has('has_phone')) {
            $hasPhone = filter_var($request->has_phone, FILTER_VALIDATE_BOOLEAN);
            $query->whereHas('business', function ($q) use ($hasPhone) {
                if ($hasPhone) {
                    $q->whereNotNull('phone')->where('phone', '!=', '');
                } else {
                    $q->whereNull('phone')->orWhere('phone', '');
                }
            });
        }

        if ($request->boolean('assigned_to_me_only')) {
            $query->where('assigned_to_user_id', $request->user()->id);
        }

        if ($request->filled('score_category')) {
            $cat = strtolower($request->score_category);
            if ($cat === 'hot') {
                $query->where('lead_score', '>=', 75);
            } elseif ($cat === 'warm') {
                $query->whereBetween('lead_score', [40, 74]);
            } elseif ($cat === 'cold') {
                $query->where('lead_score', '<', 40);
            }
        }

        $sortBy = $request->input('sort_by', 'created_at');
        $order = $request->input('order', 'desc');

        if ($sortBy === 'rating') {
            $query->join('businesses', 'leads.business_id', '=', 'businesses.id')
                ->orderBy('businesses.google_rating', $order)
                ->select('leads.*');
        } elseif ($sortBy === 'reviews') {
            $query->join('businesses', 'leads.business_id', '=', 'businesses.id')
                ->orderBy('businesses.reviews_count', $order)
                ->select('leads.*');
        } elseif ($sortBy === 'score') {
            $query->orderBy('lead_score', $order);
        } elseif ($sortBy === 'name') {
            $query->join('businesses', 'leads.business_id', '=', 'businesses.id')
                ->orderBy('businesses.name', $order)
                ->select('leads.*');
        } else {
            $query->orderBy('created_at', $order);
        }

        $total = $query->count();
        $skip = (int) $request->input('skip', 0);
        $limit = (int) $request->input('limit', 100);

        $leads = $query->skip($skip)->take($limit)->get();

        return response()->json([
            'total' => $total,
            'leads' => $leads,
            'skip' => $skip,
            'limit' => $limit,
        ]);
    }

    public function saveLead($businessId, Request $request)
    {
        $biz = Business::find($businessId);
        if (!$biz) {
            return response()->json(['detail' => 'Business not found'], 404);
        }

        $existingLead = Lead::where('business_id', $businessId)->first();
        if ($existingLead) {
            return response()->json($existingLead->load('business', 'assignedUser'));
        }

        [$baseScore, $priority] = AiLeadAnalyzerService::calculateLeadScore(
            $biz->website,
            $biz->email,
            $biz->google_rating ?? 0.0,
            $biz->reviews_count ?? 0,
            $biz->ssl_enabled ?? false,
            $biz->website_score ?? 0
        );

        $newLead = Lead::create([
            'business_id' => $businessId,
            'assigned_to_user_id' => $request->user()->id,
            'status' => 'New',
            'priority' => $priority,
            'lead_score' => $baseScore,
        ]);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'LEAD_SAVE',
            'description' => "Saved lead: '{$biz->name}'",
        ]);

        return response()->json($newLead->load('business', 'assignedUser'));
    }

    public function show($id, Request $request)
    {
        $lead = Lead::where('id', $id)->with('business', 'assignedUser', 'notes', 'tasks', 'emails')->first();
        if ($lead) {
            return response()->json($lead);
        }

        $bizLead = Lead::where('business_id', $id)->with('business', 'assignedUser', 'notes', 'tasks', 'emails')->first();
        if ($bizLead) {
            return response()->json($bizLead);
        }

        // Auto-save business as lead if not saved yet
        $biz = Business::find($id);
        if ($biz) {
            [$baseScore, $priority] = AiLeadAnalyzerService::calculateLeadScore(
                $biz->website,
                $biz->email,
                $biz->google_rating ?? 0.0,
                $biz->reviews_count ?? 0,
                $biz->ssl_enabled ?? false,
                $biz->website_score ?? 0
            );

            $newLead = Lead::create([
                'business_id' => $biz->id,
                'assigned_to_user_id' => $request->user()->id,
                'status' => 'New',
                'priority' => $priority,
                'lead_score' => $baseScore,
            ]);

            return response()->json($newLead->load('business', 'assignedUser', 'notes', 'tasks', 'emails'));
        }

        return response()->json(['detail' => 'Lead profile not found'], 404);
    }

    public function assignLead($id, Request $request)
    {
        $request->validate(['user_id' => 'required|integer']);

        $lead = Lead::find($id);
        if (!$lead) {
            return response()->json(['detail' => 'Lead not found'], 404);
        }

        $targetUser = User::find($request->user_id);
        if (!$targetUser) {
            return response()->json(['detail' => 'Assigned employee not found'], 404);
        }

        $currentUser = $request->user();
        if ($currentUser->role !== 'admin' && $lead->assigned_to_user_id && $lead->assigned_to_user_id !== $currentUser->id) {
            return response()->json(['detail' => 'You cannot reassign a lead assigned to another employee.'], 403);
        }

        $lead->assigned_to_user_id = $targetUser->id;
        $lead->save();

        ActivityLog::create([
            'user_id' => $currentUser->id,
            'action' => 'LEAD_ASSIGNED',
            'description' => "Assigned lead '{$lead->business->name}' to '" . ($targetUser->full_name ?: $targetUser->email) . "'",
        ]);

        return response()->json([
            'status' => 'success',
            'lead_id' => $lead->id,
            'assigned_to' => $targetUser->full_name ?: $targetUser->email,
        ]);
    }

    public function updateStatus($id, Request $request)
    {
        $request->validate(['status' => 'required|string']);

        $lead = Lead::find($id);
        if (!$lead) {
            return response()->json(['detail' => 'Lead not found'], 404);
        }

        $currentUser = $request->user();
        if ($currentUser->role !== 'admin' && $lead->assigned_to_user_id && $lead->assigned_to_user_id !== $currentUser->id) {
            return response()->json(['detail' => 'You cannot edit leads assigned to another employee.'], 403);
        }

        $lead->status = $request->status;
        $lead->save();

        return response()->json($lead->load('business'));
    }

    public function analyzeLead($id, Request $request)
    {
        $lead = Lead::with('business')->find($id);
        if (!$lead) {
            return response()->json(['detail' => 'Lead not found'], 404);
        }

        $analysis = AiLeadAnalyzerService::analyzeLead(
            $lead->business->name,
            $lead->business->website,
            (float) ($lead->business->google_rating ?? 0.0),
            (int) ($lead->business->reviews_count ?? 0),
            $lead->business->industry ?: 'Local Business'
        );

        $lead->lead_score = $analysis['lead_score'];
        $lead->ai_summary = $analysis['ai_summary'];
        $lead->ai_strengths = $analysis['ai_strengths'];
        $lead->ai_weaknesses = $analysis['ai_weaknesses'];
        $lead->ai_digital_presence = $analysis['ai_digital_presence'];
        $lead->ai_website_analysis = $analysis['ai_website_analysis'];
        $lead->ai_seo_opportunity = $analysis['ai_seo_opportunity'];
        $lead->ai_marketing_opportunity = $analysis['ai_marketing_opportunity'];
        $lead->ai_sales_opportunity = $analysis['ai_sales_opportunity'];
        $lead->ai_recommended_services = $analysis['ai_recommended_services'];
        $lead->save();

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'LEAD_ANALYZE',
            'description' => "Analyzed lead '{$lead->business->name}' using AI. Score: {$lead->lead_score}",
        ]);

        return response()->json($lead->load('business', 'assignedUser'));
    }

    public function destroy($id, Request $request)
    {
        $lead = Lead::find($id);
        if (!$lead) {
            return response()->json(['detail' => 'Lead not found'], 404);
        }

        $currentUser = $request->user();
        if ($currentUser->role !== 'admin' && $lead->assigned_to_user_id && $lead->assigned_to_user_id !== $currentUser->id) {
            return response()->json(['detail' => 'You cannot delete leads assigned to another employee.'], 403);
        }

        $lead->delete();

        ActivityLog::create([
            'user_id' => $currentUser->id,
            'action' => 'LEAD_DELETE',
            'description' => "Deleted saved lead ID {$id}",
        ]);

        return response()->json(null, 204);
    }

    public function updateBusiness($id, Request $request)
    {
        $biz = Business::find($id);
        if (!$biz) {
            $lead = Lead::find($id);
            if ($lead) {
                $biz = $lead->business;
            }
        }

        if (!$biz) {
            return response()->json(['detail' => 'Business record not found'], 404);
        }

        if ($request->has('email')) {
            $biz->email = $request->email;
        }
        if ($request->has('phone')) {
            $biz->phone = $request->phone;
        }
        if ($request->has('website')) {
            $biz->website = $request->website;
        }
        if ($request->has('name')) {
            $biz->name = $request->name;
        }

        $biz->save();

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'BUSINESS_UPDATED',
            'description' => "Updated contact info (Email: '{$biz->email}') for business '{$biz->name}'",
        ]);

        return response()->json($biz);
    }
}
