<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeEmailAccount extends Model
{
    use HasFactory;

    protected $table = 'employee_email_accounts';

    protected $fillable = [
        'employee_id',
        'email',
        'provider',
        'authentication_method',
        'smtp_host',
        'smtp_port',
        'encryption',
        'smtp_username',
        'encrypted_smtp_password',
        'sender_name',
        'is_active',
        'is_default',
        'last_tested_at',
        'last_test_status',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_default' => 'boolean',
        'last_tested_at' => 'datetime',
        'smtp_port' => 'integer',
    ];

    public function employee()
    {
        return $this->belongsTo(User::class, 'employee_id');
    }
}
