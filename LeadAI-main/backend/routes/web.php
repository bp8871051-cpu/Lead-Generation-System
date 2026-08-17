<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'name' => 'LeadAI REST API Backend',
        'status' => 'online',
        'version' => '1.0.0',
        'framework' => 'Laravel 11',
        'timestamp' => now()->toIso8601String(),
    ]);
});
