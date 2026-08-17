<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('businesses', function (Blueprint $table) {
            $table->id();
            $table->string('google_place_id')->nullable()->unique()->index();
            $table->string('name')->index();
            $table->string('address')->nullable();
            $table->string('city')->nullable()->index();
            $table->string('state')->nullable()->index();
            $table->string('country')->nullable()->index();
            $table->double('latitude')->nullable();
            $table->double('longitude')->nullable();
            $table->string('phone')->nullable()->index();
            $table->string('email')->nullable()->index();
            $table->string('website')->nullable()->index();
            $table->double('google_rating')->default(0.0);
            $table->integer('reviews_count')->default(0);
            $table->string('maps_url')->nullable();
            $table->text('opening_hours')->nullable();
            $table->text('photos')->nullable();
            $table->string('business_status')->default('OPERATIONAL');
            $table->string('industry')->nullable()->index();
            
            // Technical & Website Security Audits
            $table->integer('website_score')->default(0);
            $table->boolean('ssl_enabled')->default(false);
            $table->boolean('mobile_friendly')->default(true);
            $table->string('tech_stack')->nullable();
            $table->string('meta_title')->nullable();
            $table->text('meta_description')->nullable();
            $table->boolean('has_analytics')->default(false);
            $table->boolean('has_pixel')->default(false);
            $table->integer('broken_links_count')->default(0);

            $table->foreignId('search_id')->nullable()->constrained('searches')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('businesses');
    }
};
