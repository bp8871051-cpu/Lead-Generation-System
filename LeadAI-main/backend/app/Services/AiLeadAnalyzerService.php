<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class AiLeadAnalyzerService
{
    public static function calculateLeadScore(
        ?string $website = null,
        ?string $email = null,
        float $rating = 0.0,
        int $reviewsCount = 0,
        bool $sslEnabled = false,
        int $websiteScore = 0,
        bool $hasSocial = false
    ): array {
        $score = 10; // base score

        if (!$website || in_array(trim($website), ['', 'N/A', 'None', 'null'])) {
            $score += 30;
        } elseif ($websiteScore < 50) {
            $score += 20;
        }

        if (!$sslEnabled) {
            $score += 10;
        }

        if (!$email || in_array(trim($email), ['', 'N/A', 'None', 'null'])) {
            $score += 15;
        }

        if (!$hasSocial) {
            $score += 10;
        }

        if ($rating > 0 && $rating < 4.0) {
            $score += 5;
        }

        if ($reviewsCount === 0 || $reviewsCount < 10) {
            $score += 10;
        }

        $finalScore = max(10, min(99, $score));
        $priority = $finalScore >= 65 ? "High" : ($finalScore >= 40 ? "Medium" : "Low");

        return [$finalScore, $priority];
    }

    public static function generateMockAnalysis(string $leadName, ?string $website, float $rating, int $reviewsCount, string $industry): array
    {
        [$score, $priority] = self::calculateLeadScore($website);
        $hasWeb = (bool) ($website && trim($website) !== '');

        $webCritique = $hasWeb
            ? "{$leadName} has an active website ({$website}), but lacks modern responsive UI/UX and conversion funnels."
            : "{$leadName} has NO official website, missing out on over 70% of potential online client bookings in {$industry}.";

        return [
            "lead_score" => $score,
            "ai_summary" => "{$leadName} is a local {$industry} provider with active community demand ({$reviewsCount} reviews, {$rating} stars). However, their digital footprint leaves substantial room for revenue growth.",
            "ai_strengths" => "• Established local presence & loyal client base\n• Positive customer word-of-mouth\n• High expansion potential for digital bookings",
            "ai_weaknesses" => "• Missing or unoptimized digital website interface\n• No automated online lead capture system\n• Limited local SEO map visibility",
            "ai_digital_presence" => "Currently ranked below top competitors in local map searches due to unoptimized metadata and lack of a modern web application.",
            "ai_website_analysis" => $webCritique,
            "ai_seo_opportunity" => "Target high-intent keywords like '{$industry} near me' and optimize Google Business Profile.",
            "ai_marketing_opportunity" => "Run automated review collection campaigns and targeted social media lead funnels.",
            "ai_sales_opportunity" => "Pitch a complete Web Development + Local Marketing starter package to capture offline prospects.",
            "ai_recommended_services" => "• Modern Web Development & Responsive Site\n• Graphic Design & Brand Identity Package\n• Local SEO & Digital Marketing Setup\n• Automated Review Collection Funnel",
        ];
    }

    public static function analyzeLead(string $leadName, ?string $website, float $rating, int $reviewsCount, string $industry): array
    {
        $openAiKey = env('OPENAI_API_KEY');
        if (!$openAiKey) {
            return self::generateMockAnalysis($leadName, $website, $rating, $reviewsCount, $industry);
        }

        try {
            [$score, $priority] = self::calculateLeadScore($website);

            $prompt = "
            Analyze the following business for lead generation purposes:
            Name: {$leadName}
            Website: " . ($website ?: 'None') . "
            Google Rating: {$rating} ({$reviewsCount} reviews)
            Industry: {$industry}
            Calculated Lead Score: {$score}

            Provide a structured JSON response containing:
            - summary: A 2-3 sentence overview of their business and digital presence.
            - strengths: Array of 3 strings detailing strengths.
            - weaknesses: Array of 3 strings outlining weaknesses in Graphic Design, Digital Marketing, or Web Development.
            - digital_presence: 1-2 sentences reviewing their overall online visibility.
            - website_analysis: Analysis of their website (or critique if missing).
            - seo_opportunity: Opportunities for SEO optimization.
            - marketing_opportunity: Paid search, social media, review gathering, or branding updates.
            - sales_opportunity: Specific sales pitch approaches offering Web Development, Graphic Design, or Digital Marketing.
            - recommended_services: Array of 3-4 professional services we can sell them.
            ";

            $response = Http::timeout(15)
                ->withHeaders([
                    'Authorization' => "Bearer {$openAiKey}",
                    'Content-Type' => 'application/json',
                ])
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => 'gpt-3.5-turbo',
                    'response_format' => ['type' => 'json_object'],
                    'messages' => [
                        ['role' => 'system', 'content' => 'You are a senior digital agency growth auditor.'],
                        ['role' => 'user', 'content' => $prompt]
                    ],
                    'temperature' => 0.2
                ]);

            if ($response->successful()) {
                $content = $response->json('choices.0.message.content');
                $analysis = json_decode($content, true);

                return [
                    "lead_score" => $score,
                    "ai_summary" => $analysis['summary'] ?? null,
                    "ai_strengths" => is_array($analysis['strengths'] ?? null) ? implode("\n", $analysis['strengths']) : ($analysis['strengths'] ?? ''),
                    "ai_weaknesses" => is_array($analysis['weaknesses'] ?? null) ? implode("\n", $analysis['weaknesses']) : ($analysis['weaknesses'] ?? ''),
                    "ai_digital_presence" => $analysis['digital_presence'] ?? null,
                    "ai_website_analysis" => $analysis['website_analysis'] ?? null,
                    "ai_seo_opportunity" => $analysis['seo_opportunity'] ?? null,
                    "ai_marketing_opportunity" => $analysis['marketing_opportunity'] ?? null,
                    "ai_sales_opportunity" => $analysis['sales_opportunity'] ?? null,
                    "ai_recommended_services" => is_array($analysis['recommended_services'] ?? null) ? implode("\n", $analysis['recommended_services']) : ($analysis['recommended_services'] ?? ''),
                ];
            }
        } catch (\Throwable $e) {
            // Fallthrough to mock
        }

        return self::generateMockAnalysis($leadName, $website, $rating, $reviewsCount, $industry);
    }

    public static function generateMessageTemplate(string $leadName, ?string $contactName, string $industry, int $score, string $channel, array $details): string
    {
        $contact = $contactName ?: "Team";

        if (strtolower($channel) === "cold email") {
            return "Subject: Website Development & Digital Growth Proposal for {$leadName}\n\nHi {$contact},\n\nI hope this email finds you well.\n\nWe came across {$leadName} and were really impressed by your business reputation. However, after reviewing your current web presence, we noticed several key digital opportunities:\n\n1. Web Applications & Website Development: A modern, high-speed responsive website layout.\n2. UI/UX & Graphic Design: High-impact brand visuals and logo design.\n3. Digital Marketing & SEO: Ranking on top local Google search results to capture high-intent leads.\n\nWe specialize in Website Development, UI/UX Design, Graphic Design, Lead Generation, and CRM Automation tailored for businesses like yours.\n\nWould you be open to a quick 5-minute call next Tuesday to discuss how these updates can boost your revenue?";
        } elseif (strtolower($channel) === "linkedin message") {
            return "Hi {$contact}, noticed you're growing {$leadName} in {$industry}. I ran a quick digital & UI/UX audit on your web presence. Found a few key web app and design updates to capture more clients. Let's connect!";
        } elseif (strtolower($channel) === "whatsapp message") {
            return "Hi {$contact}! This is BLUEBOXX.DA PRIVATE LIMITED. We noticed {$leadName} could benefit from some Website Development, Graphic Design, and SEO updates to boost client bookings. Can we send you a quick 2-minute mockup proposal?";
        } elseif (strtolower($channel) === "follow-up email") {
            return "Subject: Quick follow up / Modernizing {$leadName}'s web presence\n\nHi {$contact},\n\nI wanted to quickly follow up on our previous note.\n\nBLUEBOXX.DA PRIVATE LIMITED recently completed a Web Application and UI/UX Design overhaul for a business in the {$industry} space, which increased their inbound client bookings by 35% within 30 days.\n\nWe would love to deliver the exact same results for {$leadName}. Do you have time for a brief consultation call this week?";
        } else {
            return "PROPOSAL FOR " . strtoupper($leadName) . "\nPrepared by: BLUEBOXX.DA PRIVATE LIMITED\nFocus Area: Website Development, UI/UX Design, Branding, and Digital Growth Solutions\n\nSCOPE OF WORK:\n1. Website & Application Development: Custom responsive website rebuild or speed optimization.\n2. UI/UX & Graphic Design: Visual identity, modern logo design, and brand collateral.\n3. Digital Marketing & SEO: High-ranking keyword setup and automated review generation funnel.\n\nESTIMATED INVESTMENT: Customized enterprise package\nLet us know if you'd like to schedule a preview demo, {$contact}!";
        }
    }
}
