<?php

namespace Database\Seeders;

use App\Models\Business;
use App\Models\Campaign;
use App\Models\Company;
use App\Models\Lead;
use App\Models\Search;
use App\Models\User;
use App\Services\GoogleMapsScraperService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Create Default Admin User
        $admin = User::firstOrCreate(
            ['email' => 'admin@blueboxxda.com'],
            [
                'hashed_password' => Hash::make('admin123'),
                'full_name' => 'Sumedha Agrawal',
                'designation' => 'Managing Director & Lead Strategist',
                'role' => 'admin',
                'is_active' => true,
            ]
        );

        // 2. Create Default Employee User
        $employee = User::firstOrCreate(
            ['email' => 'employee@blueboxxda.com'],
            [
                'hashed_password' => Hash::make('employee123'),
                'full_name' => 'Rahul Sharma',
                'designation' => 'Sales Associate',
                'role' => 'employee',
                'is_active' => true,
            ]
        );

        // 3. Create Company Profile
        Company::firstOrCreate(
            ['id' => 1],
            [
                'company_name' => 'BLUEBOXX.DA PRIVATE LIMITED',
                'brand_name' => 'BLUEBOXX.DA',
                'tagline' => 'Turning Ideas Into Digital Excellence',
                'company_logo' => '/blueboxx_logo.png',
                'company_website' => 'https://blueboxxda.com',
                'company_email' => 'contact@blueboxxda.com',
                'support_email' => 'contact@blueboxxda.com',
                'company_phone' => '+91 98765 43210',
                'alternate_phone' => '+91 98765 43211',
                'company_address' => 'BLUEBOXX.DA Tower, Tech Park Road',
                'city' => 'Ahmedabad',
                'state' => 'Gujarat',
                'country' => 'India',
                'pin_code' => '380058',
                'gst_number' => '24AAAAA0000A1Z5',
                'cin_number' => 'U72900GJ2026PTC123456',
                'working_hours' => 'Mon - Sat: 9:00 AM - 7:00 PM IST',
                'linkedin_url' => 'https://linkedin.com/company/blueboxxda',
                'instagram_url' => 'https://instagram.com/blueboxxda',
                'facebook_url' => 'https://facebook.com/blueboxxda',
                'youtube_url' => 'https://youtube.com/@blueboxxda',
                'services_list' => 'Website Development, Web Applications, UI / UX Design, Graphic Design, Logo Design, Branding, Digital Marketing, SEO, Lead Generation, Automation Solutions',
            ]
        );

        // 4. Create Default Campaign
        Campaign::firstOrCreate(
            ['name' => 'Direct Outreach'],
            [
                'subject' => 'Website Development & Digital Growth Proposal',
                'body_template' => 'Hi Team, We noticed several key digital opportunities to boost your online revenue...',
                'status' => 'Active',
                'user_id' => $admin->id,
            ]
        );

        // 5. Seed Initial Search & Businesses
        $search = Search::create([
            'category' => 'Restaurant',
            'location' => 'Ahmedabad',
            'radius' => 5000,
            'max_results' => 10,
            'total_results' => 10,
            'new_leads_count' => 10,
            'duplicates_removed_count' => 0,
            'is_multi_search' => false,
            'duration_ms' => 1200,
            'status' => 'Completed',
            'user_id' => $admin->id,
        ]);

        $mockLeads = GoogleMapsScraperService::generateMockResults('Restaurant', 'Ahmedabad', 10);
        foreach ($mockLeads as $idx => $bizData) {
            $biz = Business::create($bizData + ['search_id' => $search->id]);

            // Save first 5 businesses as Leads
            if ($idx < 5) {
                Lead::create([
                    'business_id' => $biz->id,
                    'assigned_to_user_id' => $admin->id,
                    'status' => $idx === 0 ? 'New' : ($idx === 1 ? 'Contacted' : ($idx === 2 ? 'Interested' : ($idx === 3 ? 'Meeting' : 'Won'))),
                    'priority' => $idx % 2 === 0 ? 'High' : 'Medium',
                    'lead_score' => 60 + ($idx * 8),
                    'ai_summary' => "{$biz->name} is a high-potential lead in {$biz->city} requiring web updates and marketing setup.",
                    'ai_strengths' => "• Strong offline reputation\n• High customer rating",
                    'ai_weaknesses' => "• Outdated web design\n• Missing Google Analytics",
                ]);
            }
        }
    }
}
