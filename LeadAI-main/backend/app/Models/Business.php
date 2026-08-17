<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Business extends Model
{
    use HasFactory;

    protected $table = 'businesses';

    protected $fillable = [
        'google_place_id',
        'name',
        'address',
        'city',
        'state',
        'country',
        'latitude',
        'longitude',
        'phone',
        'email',
        'website',
        'google_rating',
        'reviews_count',
        'maps_url',
        'opening_hours',
        'photos',
        'business_status',
        'industry',
        'website_score',
        'ssl_enabled',
        'mobile_friendly',
        'tech_stack',
        'meta_title',
        'meta_description',
        'has_analytics',
        'has_pixel',
        'broken_links_count',
        'search_id',
    ];

    protected $casts = [
        'latitude' => 'double',
        'longitude' => 'double',
        'google_rating' => 'double',
        'reviews_count' => 'integer',
        'website_score' => 'integer',
        'ssl_enabled' => 'boolean',
        'mobile_friendly' => 'boolean',
        'has_analytics' => 'boolean',
        'has_pixel' => 'boolean',
        'broken_links_count' => 'integer',
    ];

    public function search()
    {
        return $this->belongsTo(Search::class, 'search_id');
    }

    public function leads()
    {
        return $this->hasMany(Lead::class, 'business_id');
    }
}
