<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('searches', function (Blueprint $table) {
            $table->id();
            $table->string('category')->index();
            $table->string('location')->index();
            $table->double('radius')->default(5000.0);
            $table->integer('max_results')->default(20);
            $table->integer('total_results')->default(0);
            $table->integer('new_leads_count')->default(0);
            $table->integer('duplicates_removed_count')->default(0);
            $table->boolean('is_multi_search')->default(false);
            $table->double('duration_ms')->default(0.0);
            $table->string('status')->default('Completed');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('searches');
    }
};
