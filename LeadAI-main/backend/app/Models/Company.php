<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    use HasFactory;

    protected $table = 'company';

    protected $fillable = [
        'company_name',
        'brand_name',
        'tagline',
        'company_logo',
        'company_website',
        'company_email',
        'support_email',
        'company_phone',
        'alternate_phone',
        'company_address',
        'city',
        'state',
        'country',
        'pin_code',
        'gst_number',
        'cin_number',
        'working_hours',
        'google_maps_url',
        'linkedin_url',
        'facebook_url',
        'instagram_url',
        'youtube_url',
        'behance_url',
        'dribbble_url',
        'twitter_url',
        'whatsapp_number',
        'services_list',
        'email_signature',
    ];
}
