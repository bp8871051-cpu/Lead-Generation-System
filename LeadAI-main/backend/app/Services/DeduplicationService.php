<?php

namespace App\Services;

class DeduplicationService
{
    public static function normalizeUrl(?string $url): string
    {
        if (!$url) {
            return '';
        }
        $clean = strtolower(trim($url));
        $clean = preg_replace('/^https?:\/\//i', '', $clean);
        $clean = preg_replace('/^www\./i', '', $clean);
        return rtrim($clean, '/');
    }

    public static function normalizePhone(?string $phone): string
    {
        if (!$phone) {
            return '';
        }
        $digits = preg_replace('/\D/', '', $phone);
        return strlen($digits) >= 10 ? substr($digits, -10) : $digits;
    }

    public static function normalizeNameAddress(string $name, ?string $address): string
    {
        $nameClean = preg_replace('/[^a-zA-Z0-9]/', '', strtolower($name));
        $addrClean = substr(preg_replace('/[^a-zA-Z0-9]/', '', strtolower($address ?? '')), 0, 25);
        return "{$nameClean}_{$addrClean}";
    }

    public static function deduplicateLeads(array $newLeads, $existingBusinesses = []): array
    {
        $seenPlaceIds = [];
        $seenWebsites = [];
        $seenPhones = [];
        $seenSlugs = [];

        if ($existingBusinesses) {
            foreach ($existingBusinesses as $b) {
                if (!empty($b->google_place_id)) {
                    $seenPlaceIds[$b->google_place_id] = true;
                }
                if (!empty($b->website)) {
                    $w = self::normalizeUrl($b->website);
                    if ($w) $seenWebsites[$w] = true;
                }
                if (!empty($b->phone)) {
                    $p = self::normalizePhone($b->phone);
                    if ($p) $seenPhones[$p] = true;
                }
                if (!empty($b->name)) {
                    $s = self::normalizeNameAddress($b->name, $b->address ?? '');
                    if ($s) $seenSlugs[$s] = true;
                }
            }
        }

        $uniqueLeads = [];
        $duplicateCount = 0;

        foreach ($newLeads as $lead) {
            $placeId = $lead['google_place_id'] ?? null;
            $website = self::normalizeUrl($lead['website'] ?? null);
            $phone = self::normalizePhone($lead['phone'] ?? null);
            $slug = self::normalizeNameAddress($lead['name'] ?? '', $lead['address'] ?? null);

            $isDup = false;

            if ($placeId && isset($seenPlaceIds[$placeId])) {
                $isDup = true;
            } elseif ($website && isset($seenWebsites[$website])) {
                $isDup = true;
            } elseif ($phone && isset($seenPhones[$phone])) {
                $isDup = true;
            } elseif ($slug && isset($seenSlugs[$slug])) {
                $isDup = true;
            }

            if ($isDup) {
                $duplicateCount++;
            } else {
                $uniqueLeads[] = $lead;
                if ($placeId) $seenPlaceIds[$placeId] = true;
                if ($website) $seenWebsites[$website] = true;
                if ($phone) $seenPhones[$phone] = true;
                if ($slug) $seenSlugs[$slug] = true;
            }
        }

        return [$uniqueLeads, $duplicateCount];
    }
}
