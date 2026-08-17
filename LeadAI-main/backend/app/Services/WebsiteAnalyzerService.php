<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class WebsiteAnalyzerService
{
    public static function analyzeWebsite(?string $url): array
    {
        if (!$url || in_array(trim($url), ['', 'N/A', 'None', 'null'])) {
            return [
                'website_exists' => false,
                'ssl_enabled' => false,
                'mobile_friendly' => false,
                'page_speed_ms' => 0,
                'tech_stack' => 'No Website',
                'meta_title' => '',
                'meta_description' => '',
                'has_analytics' => false,
                'has_pixel' => false,
                'broken_links_count' => 0,
                'website_score' => 0,
                'extracted_email' => '',
                'extracted_phone' => '',
                'extracted_address' => '',
                'social_links' => [],
            ];
        }

        $cleanUrl = trim($url);
        if (!preg_match('/^https?:\/\//i', $cleanUrl)) {
            $cleanUrl = "https://{$cleanUrl}";
        }

        $sslEnabled = str_starts_with($cleanUrl, 'https://');
        $score = $sslEnabled ? 50 : 30;
        $techStackList = [];
        $metaTitle = '';
        $metaDescription = '';
        $hasAnalytics = false;
        $hasPixel = false;
        $mobileFriendly = true;
        $brokenLinksCount = 0;
        $extractedEmail = '';
        $extractedPhone = '';
        $extractedAddress = '';
        $socialLinks = [];
        $startTime = microtime(true);

        try {
            $response = Http::timeout(8)
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                ])
                ->get($cleanUrl);

            $pageSpeedMs = (int) ((microtime(true) - $startTime) * 1000);
            $rawHtml = $response->body();
            $htmlLower = strtolower($rawHtml);

            if ($response->effectiveUri() && str_starts_with((string) $response->effectiveUri(), 'https://')) {
                $sslEnabled = true;
                $score += 15;
            }

            // Extract Meta Title
            if (preg_match('/<title[^>]*>(.*?)<\/title>/is', $rawHtml, $titleMatch)) {
                $metaTitle = substr(trim(strip_tags($titleMatch[1])), 0, 150);
                $score += 5;
            } elseif (preg_match('/<meta\s+property=["\']og:title["\']\s+content=["\'](.*?)["\']/is', $rawHtml, $ogTitle)) {
                $metaTitle = substr(trim($ogTitle[1]), 0, 150);
            }

            // Extract Meta Description
            if (preg_match('/<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']/is', $rawHtml, $descMatch)) {
                $metaDescription = substr(trim($descMatch[1]), 0, 250);
                $score += 5;
            } elseif (preg_match('/<meta\s+property=["\']og:description["\']\s+content=["\'](.*?)["\']/is', $rawHtml, $ogDesc)) {
                $metaDescription = substr(trim($ogDesc[1]), 0, 250);
            }

            // Tech Stack Detection
            if (str_contains($htmlLower, 'wp-content') || str_contains($htmlLower, 'wordpress')) $techStackList[] = 'WordPress';
            if (str_contains($htmlLower, 'shopify')) $techStackList[] = 'Shopify';
            if (str_contains($htmlLower, 'wix.com') || str_contains($htmlLower, 'wix-code')) $techStackList[] = 'Wix';
            if (str_contains($htmlLower, 'squarespace')) $techStackList[] = 'Squarespace';
            if (str_contains($htmlLower, 'react') || str_contains($htmlLower, '_next')) $techStackList[] = 'React / Next.js';
            if (str_contains($htmlLower, 'elementor')) $techStackList[] = 'Elementor';
            if (str_contains($htmlLower, 'bootstrap')) $techStackList[] = 'Bootstrap';
            if (str_contains($htmlLower, 'tailwind')) $techStackList[] = 'Tailwind CSS';
            if (str_contains($htmlLower, 'laravel')) $techStackList[] = 'Laravel';
            if (str_contains($htmlLower, 'woocommerce')) $techStackList[] = 'WooCommerce';

            if (empty($techStackList)) {
                $techStackList[] = 'Custom HTML/JS';
            }

            // Analytics & Tracking
            if (str_contains($htmlLower, 'gtag') || str_contains($htmlLower, 'google-analytics') || str_contains($htmlLower, 'ua-') || str_contains($htmlLower, 'gtm-')) {
                $hasAnalytics = true;
                $score += 10;
            }

            if (str_contains($htmlLower, 'fbq(') || str_contains($htmlLower, 'connect.facebook.net')) {
                $hasPixel = true;
                $score += 10;
            }

            if (str_contains($htmlLower, 'viewport')) {
                $mobileFriendly = true;
                $score += 10;
            }

            if ($pageSpeedMs < 1500) $score += 10;
            elseif ($pageSpeedMs > 4000) $score -= 10;

            // Email Extraction Regex
            $extractedEmail = self::extractEmailsFromHtml($rawHtml);

            // Phone Extraction Regex
            $extractedPhone = self::extractPhoneFromHtml($rawHtml);

            // Schema.org / JSON-LD Address Extraction
            if (preg_match_all('/<script\s+type=["\']application\/ld\+json["\']>(.*?)<\/script>/is', $rawHtml, $jsonLdMatches)) {
                foreach ($jsonLdMatches[1] as $jsonStr) {
                    $data = json_decode(trim($jsonStr), true);
                    if (is_array($data)) {
                        if (isset($data['telephone'])) $extractedPhone = $data['telephone'];
                        if (isset($data['email'])) $extractedEmail = $data['email'];
                        if (isset($data['address'])) {
                            if (is_string($data['address'])) {
                                $extractedAddress = $data['address'];
                            } elseif (is_array($data['address'])) {
                                $addrParts = array_filter([
                                    $data['address']['streetAddress'] ?? '',
                                    $data['address']['addressLocality'] ?? '',
                                    $data['address']['addressRegion'] ?? '',
                                    $data['address']['postalCode'] ?? '',
                                    $data['address']['addressCountry'] ?? ''
                                ]);
                                if (!empty($addrParts)) $extractedAddress = implode(', ', $addrParts);
                            }
                        }
                    }
                }
            }

            // Social Media Profiles Extraction
            preg_match_all('/https?:\/\/(www\.)?(facebook|instagram|linkedin|twitter|x|youtube)\.com\/[a-zA-Z0-9_.-]+/i', $rawHtml, $socialMatches);
            if (!empty($socialMatches[0])) {
                $socialLinks = array_values(array_unique($socialMatches[0]));
            }

            // If email is still missing, attempt fetching /contact or /about page
            if (empty($extractedEmail) || empty($extractedPhone)) {
                $subpages = ['/contact', '/contact-us', '/about', '/about-us'];
                $baseDomain = rtrim($cleanUrl, '/');

                foreach ($subpages as $sub) {
                    try {
                        $subResp = Http::timeout(4)->withHeaders([
                            'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                        ])->get($baseDomain . $sub);

                        if ($subResp->successful()) {
                            $subHtml = $subResp->body();
                            if (empty($extractedEmail)) {
                                $subEmail = self::extractEmailsFromHtml($subHtml);
                                if ($subEmail) $extractedEmail = $subEmail;
                            }
                            if (empty($extractedPhone)) {
                                $subPhone = self::extractPhoneFromHtml($subHtml);
                                if ($subPhone) $extractedPhone = $subPhone;
                            }
                            if ($extractedEmail && $extractedPhone) break;
                        }
                    } catch (\Throwable $e) {
                        // ignore subpage error
                    }
                }
            }

            return [
                'website_exists' => true,
                'ssl_enabled' => $sslEnabled,
                'mobile_friendly' => $mobileFriendly,
                'page_speed_ms' => $pageSpeedMs,
                'tech_stack' => implode(', ', $techStackList),
                'meta_title' => $metaTitle,
                'meta_description' => $metaDescription,
                'has_analytics' => $hasAnalytics,
                'has_pixel' => $hasPixel,
                'broken_links_count' => $brokenLinksCount,
                'website_score' => max(5, min(99, $score)),
                'extracted_email' => $extractedEmail,
                'extracted_phone' => $extractedPhone,
                'extracted_address' => $extractedAddress,
                'social_links' => $socialLinks,
            ];
        } catch (\Throwable $e) {
            $pageSpeedMs = (int) ((microtime(true) - $startTime) * 1000);
            return [
                'website_exists' => true,
                'ssl_enabled' => $sslEnabled,
                'mobile_friendly' => false,
                'page_speed_ms' => $pageSpeedMs,
                'tech_stack' => 'Unreachable / Legacy',
                'meta_title' => '',
                'meta_description' => '',
                'has_analytics' => false,
                'has_pixel' => false,
                'broken_links_count' => 1,
                'website_score' => 15,
                'extracted_email' => '',
                'extracted_phone' => '',
                'extracted_address' => '',
                'social_links' => [],
            ];
        }
    }

    private static function extractEmailsFromHtml(string $html): string
    {
        preg_match_all('/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/', $html, $emailMatches);
        if (!empty($emailMatches[0])) {
            $validEmails = array_values(array_filter(array_unique($emailMatches[0]), function ($e) {
                return !preg_match('/\.(png|jpg|jpeg|gif|svg|webp|pdf|js|css|woff|ttf|eot)$/i', $e)
                    && !str_contains(strtolower($e), 'example.com')
                    && !str_contains(strtolower($e), 'schema.org')
                    && !str_contains(strtolower($e), 'w3.org');
            }));
            if (!empty($validEmails)) {
                return $validEmails[0];
            }
        }
        return '';
    }

    private static function extractPhoneFromHtml(string $html): string
    {
        // Check href="tel:..."
        if (preg_match('/href=["\']tel:([^"\']+)["\']/i', $html, $telMatch)) {
            return trim($telMatch[1]);
        }

        // Check common international phone formats
        preg_match_all('/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}/', $html, $phoneMatches);
        if (!empty($phoneMatches[0])) {
            $validPhones = array_values(array_filter(array_unique($phoneMatches[0]), function ($p) {
                $digits = preg_replace('/[^0-9]/', '', $p);
                return strlen($digits) >= 10 && strlen($digits) <= 13;
            }));
            if (!empty($validPhones)) {
                return trim($validPhones[0]);
            }
        }
        return '';
    }
}
