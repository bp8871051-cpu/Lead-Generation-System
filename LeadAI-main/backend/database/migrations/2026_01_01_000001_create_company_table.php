<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company', function (Blueprint $table) {
            $table->id();
            $table->string('company_name')->default('BLUEBOXX.DA PRIVATE LIMITED');
            $table->string('brand_name')->default('BLUEBOXX.DA');
            $table->string('tagline')->default('Turning Ideas Into Digital Excellence');
            $table->text('company_logo')->nullable();
            $table->string('company_website')->default('https://blueboxxda.com');
            $table->string('company_email')->default('contact@blueboxxda.com');
            $table->string('support_email')->default('contact@blueboxxda.com');
            $table->string('company_phone')->default('+91 98765 43210');
            $table->string('alternate_phone')->default('+91 98765 43211');
            $table->text('company_address')->nullable();
            $table->string('city')->default('Ahmedabad');
            $table->string('state')->default('Gujarat');
            $table->string('country')->default('India');
            $table->string('pin_code')->default('380058');
            $table->string('gst_number')->default('24AAAAA0000A1Z5');
            $table->string('cin_number')->default('U72900GJ2026PTC123456');
            $table->string('working_hours')->default('Mon - Sat: 9:00 AM - 7:00 PM IST');
            $table->string('google_maps_url')->nullable();
            
            $table->string('linkedin_url')->nullable();
            $table->string('facebook_url')->nullable();
            $table->string('instagram_url')->nullable();
            $table->string('youtube_url')->nullable();
            $table->string('behance_url')->nullable();
            $table->string('dribbble_url')->nullable();
            $table->string('twitter_url')->nullable();
            $table->string('whatsapp_number')->nullable();
            
            $table->text('services_list')->nullable();
            $table->text('email_signature')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company');
    }
};
