<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade');
            $table->foreignId('assigned_to_user_id')->nullable()->constrained('users')->onDelete('set null');
            
            // CRM Status: New, Contacted, Interested, Meeting, Proposal Sent, Won, Lost
            $table->string('status')->default('New')->index();
            $table->string('priority')->default('Medium')->index(); // High, Medium, Low
            $table->integer('website_score')->default(0);
            
            // AI Analysis & Scoring
            $table->integer('lead_score')->default(50)->index(); // 0-100
            $table->text('ai_summary')->nullable();
            $table->text('ai_strengths')->nullable();
            $table->text('ai_weaknesses')->nullable();
            $table->text('ai_digital_presence')->nullable();
            $table->text('ai_website_analysis')->nullable();
            $table->text('ai_seo_opportunity')->nullable();
            $table->text('ai_marketing_opportunity')->nullable();
            $table->text('ai_sales_opportunity')->nullable();
            $table->text('ai_recommended_services')->nullable();
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};
