<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Lead extends Model
{
    use HasFactory;

    protected $table = 'leads';

    protected $fillable = [
        'business_id',
        'assigned_to_user_id',
        'status',
        'priority',
        'website_score',
        'lead_score',
        'ai_summary',
        'ai_strengths',
        'ai_weaknesses',
        'ai_digital_presence',
        'ai_website_analysis',
        'ai_seo_opportunity',
        'ai_marketing_opportunity',
        'ai_sales_opportunity',
        'ai_recommended_services',
    ];

    protected $casts = [
        'website_score' => 'integer',
        'lead_score' => 'integer',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class, 'business_id');
    }

    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_to_user_id');
    }

    public function notes()
    {
        return $this->hasMany(Note::class, 'lead_id');
    }

    public function tasks()
    {
        return $this->hasMany(Task::class, 'lead_id');
    }

    public function emails()
    {
        return $this->hasMany(Email::class, 'lead_id');
    }
}
