<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportController extends Controller
{
    public function exportCsv(Request $request)
    {
        $leads = Lead::with('business')->get();

        $response = new StreamedResponse(function () use ($leads) {
            $handle = fopen('php://output', 'w');

            // Header
            fputcsv($handle, [
                "Lead ID", "Business Name", "Industry", "Phone", "Email", "Website",
                "Address", "City", "State", "Country", "Google Rating", "Reviews Count",
                "Website Score", "SSL Enabled", "Tech Stack", "Lead Priority", "Lead Score",
                "Status", "Google Maps URL", "Created At"
            ]);

            foreach ($leads as $l) {
                $b = $l->business;
                if (!$b) continue;
                fputcsv($handle, [
                    $l->id,
                    $b->name ?? "",
                    $b->industry ?? "",
                    $b->phone ?? "",
                    $b->email ?? "",
                    $b->website ?? "",
                    $b->address ?? "",
                    $b->city ?? "",
                    $b->state ?? "",
                    $b->country ?? "",
                    $b->google_rating ?? 0.0,
                    $b->reviews_count ?? 0,
                    $b->website_score ?? 0,
                    $b->ssl_enabled ? "Yes" : "No",
                    $b->tech_stack ?? "",
                    $l->priority ?? "Medium",
                    $l->lead_score ?? 50,
                    $l->status ?? "New",
                    $b->maps_url ?? "",
                    $l->created_at ? $l->created_at->format('Y-m-d H:i:s') : ""
                ]);
            }

            fclose($handle);
        }, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="leads_export.csv"',
        ]);

        return $response;
    }

    public function exportJson(Request $request)
    {
        $leads = Lead::with('business')->get();
        $exportData = [];

        foreach ($leads as $l) {
            $b = $l->business;
            if (!$b) continue;
            $exportData[] = [
                "lead_id" => $l->id,
                "business_name" => $b->name,
                "industry" => $b->industry,
                "phone" => $b->phone,
                "email" => $b->email,
                "website" => $b->website,
                "address" => $b->address,
                "city" => $b->city,
                "state" => $b->state,
                "country" => $b->country,
                "google_rating" => $b->google_rating,
                "reviews_count" => $b->reviews_count,
                "opening_hours" => $b->opening_hours,
                "maps_url" => $b->maps_url,
                "technical_audit" => [
                    "website_score" => $b->website_score,
                    "ssl_enabled" => $b->ssl_enabled,
                    "mobile_friendly" => $b->mobile_friendly,
                    "tech_stack" => $b->tech_stack,
                    "meta_title" => $b->meta_title,
                    "meta_description" => $b->meta_description,
                    "has_analytics" => $b->has_analytics,
                    "has_pixel" => $b->has_pixel
                ],
                "crm" => [
                    "status" => $l->status,
                    "priority" => $l->priority,
                    "lead_score" => $l->lead_score
                ],
                "created_at" => $l->created_at ? $l->created_at->toIso8601String() : null
            ];
        }

        return response()->json($exportData, 200, [
            'Content-Disposition' => 'attachment; filename="leads_export.json"'
        ]);
    }

    public function exportExcel(Request $request)
    {
        return $this->exportCsv($request);
    }
}
