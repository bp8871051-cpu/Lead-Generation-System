<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'users';

    protected $fillable = [
        'email',
        'hashed_password',
        'full_name',
        'designation',
        'avatar',
        'role',
        'is_active',
        'last_login',
    ];

    protected $hidden = [
        'hashed_password',
        'remember_token',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'last_login' => 'datetime',
    ];

    public function getAuthPassword()
    {
        return $this->hashed_password;
    }

    public function searches()
    {
        return $this->hasMany(Search::class, 'user_id');
    }

    public function activityLogs()
    {
        return $this->hasMany(ActivityLog::class, 'user_id');
    }

    public function assignedLeads()
    {
        return $this->hasMany(Lead::class, 'assigned_to_user_id');
    }

    public function emailAccount()
    {
        return $this->hasOne(EmployeeEmailAccount::class, 'employee_id');
    }

    public function campaigns()
    {
        return $this->hasMany(Campaign::class, 'user_id');
    }
}
