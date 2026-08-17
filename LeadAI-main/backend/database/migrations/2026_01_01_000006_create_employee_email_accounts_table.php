<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_email_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->unique()->constrained('users')->onDelete('cascade');
            $table->string('email')->index();
            $table->string('provider')->default('Custom SMTP');
            $table->string('authentication_method')->default('SMTP');
            $table->string('smtp_host')->nullable();
            $table->integer('smtp_port')->default(587);
            $table->string('encryption')->default('TLS');
            $table->string('smtp_username')->nullable();
            $table->text('encrypted_smtp_password')->nullable();
            $table->string('sender_name')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->timestamp('last_tested_at')->nullable();
            $table->string('last_test_status')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_email_accounts');
    }
};
