<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\Campaign;
use App\Models\Lead;
use App\Models\Search as SearchModel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function dashboard(Request $request)
    {
        $totalLeads = Lead::count();
        $todayLeads = Lead::where('created_at', '>=', now()->startOfDay())->count();

        $uniqueLeads = Business::whereNotNull('google_place_id')->distinct('google_place_id')->count('google_place_id');
        if ($uniqueLeads === 0) {
            $uniqueLeads = $totalLeads;
        }

        $duplicateCount = (int) SearchModel::sum('duplicates_removed_count');

        $websiteMissing = Business::whereNull('website')
            ->orWhere('website', '')
            ->orWhere('website', 'N/A')
            ->count();

        $avgWebsiteScore = round((float) Business::avg('website_score'), 1);

        $highPriorityLeads = Lead::where('priority', 'High')
            ->orWhere('lead_score', '>=', 65)
            ->count();

        $averageRating = round((float) Business::avg('google_rating'), 1) ?: 4.2;
        $hotLeads = $highPriorityLeads;
        $campaignsCount = Campaign::where('user_id', $request->user()->id)->count();

        $wonLeads = Lead::where('status', 'Won')->count();
        $conversionRate = $totalLeads > 0 ? round(($wonLeads / $totalLeads) * 100, 1) : 0.0;

        // Daily leads chart (Last 7 days)
        $dailyLeads = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = now()->subDays($i);
            $count = Lead::whereDate('created_at', $day->toDateString())->count();
            $dailyLeads[] = [
                'date' => $day->format('M d'),
                'count' => $count,
            ];
        }

        // Industry Distribution
        $industryData = Business::join('leads', 'businesses.id', '=', 'leads.business_id')
            ->select('businesses.industry', DB::raw('count(leads.id) as count'))
            ->groupBy('businesses.industry')
            ->get();

        $industryDistribution = [];
        foreach ($industryData as $row) {
            $industryDistribution[] = [
                'industry' => $row->industry ?: 'Unknown',
                'count' => (int) $row->count,
            ];
        }

        if (empty($industryDistribution)) {
            $industryDistribution = [
                ['industry' => 'Restaurant', 'count' => 0],
                ['industry' => 'Gym', 'count' => 0],
                ['industry' => 'Real Estate', 'count' => 0],
                ['industry' => 'Healthcare', 'count' => 0],
            ];
        }

        // Score Distribution
        $scoreRanges = [
            ['range' => '0-20 (Very Cold)', 'min' => 0, 'max' => 20],
            ['range' => '21-40 (Cold)', 'min' => 21, 'max' => 40],
            ['range' => '41-60 (Neutral)', 'min' => 41, 'max' => 60],
            ['range' => '61-80 (Warm)', 'min' => 61, 'max' => 80],
            ['range' => '81-100 (Hot)', 'min' => 81, 'max' => 100],
        ];

        $scoreDistribution = [];
        foreach ($scoreRanges as $r) {
            $count = Lead::whereBetween('lead_score', [$r['min'], $r['max']])->count();
            $scoreDistribution[] = [
                'range' => $r['range'],
                'count' => $count,
            ];
        }

        return response()->json([
            'total_leads' => $totalLeads,
            'today_leads' => $todayLeads,
            'unique_leads' => $uniqueLeads,
            'duplicate_count' => $duplicateCount,
            'website_missing' => $websiteMissing,
            'avg_website_score' => $avgWebsiteScore,
            'high_priority_leads' => $highPriorityLeads,
            'average_rating' => $averageRating,
            'hot_leads' => $hotLeads,
            'campaigns_count' => $campaignsCount,
            'conversion_rate' => $conversionRate,
            'daily_leads' => $dailyLeads,
            'industry_distribution' => $industryDistribution,
            'score_distribution' => $scoreDistribution,
        ]);
    }
}
