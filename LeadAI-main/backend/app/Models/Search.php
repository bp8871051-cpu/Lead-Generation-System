<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Search extends Model
{
    use HasFactory;

    protected $table = 'searches';

    protected $fillable = [
        'category',
        'location',
        'radius',
        'max_results',
        'total_results',
        'new_leads_count',
        'duplicates_removed_count',
        'is_multi_search',
        'duration_ms',
        'status',
        'user_id',
    ];

    protected $casts = [
        'is_multi_search' => 'boolean',
        'radius' => 'double',
        'duration_ms' => 'double',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function businesses()
    {
        return $this->hasMany(Business::class, 'search_id');
    }
}
