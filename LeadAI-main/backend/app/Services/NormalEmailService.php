<?php

namespace App\Services;

use App\Models\EmployeeEmailAccount;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;

class NormalEmailService
{
    /**
     * Dynamically configure SMTP mailer for an employee account or system default .env settings.
     */
    public static function configureMailer(?EmployeeEmailAccount $account = null): array
    {
        $smtpHost = $account && $account->smtp_host ? $account->smtp_host : env('MAIL_HOST', 'smtp.gmail.com');
        $smtpPort = $account && $account->smtp_port ? (int) $account->smtp_port : (int) env('MAIL_PORT', 587);
        $encryption = $account && $account->encryption ? strtolower($account->encryption) : strtolower(env('MAIL_ENCRYPTION', 'tls'));
        $username = $account && $account->smtp_username ? $account->smtp_username : env('MAIL_USERNAME', '');
        $password = $account && $account->encrypted_smtp_password ? $account->encrypted_smtp_password : env('MAIL_PASSWORD', '');
        $senderEmail = $account && $account->email ? $account->email : env('MAIL_FROM_ADDRESS', env('DEFAULT_SENDER_EMAIL', 'contact@blueboxxda.com'));
        $senderName = $account && $account->sender_name ? $account->sender_name : env('MAIL_FROM_NAME', env('DEFAULT_SENDER_NAME', 'LeadAI Outreach'));

        $scheme = null;
        if (in_array($encryption, ['ssl', 'smtps'])) {
            $scheme = 'smtps';
        } elseif (in_array($encryption, ['tls', 'starttls'])) {
            $scheme = 'smtp';
        }

        Config::set('mail.default', 'smtp');
        Config::set('mail.mailers.smtp', [
            'transport' => 'smtp',
            'host' => $smtpHost,
            'port' => $smtpPort,
            'encryption' => $scheme,
            'username' => $username,
            'password' => $password,
            'timeout' => 15,
            'local_domain' => env('MAIL_EHLO_DOMAIN'),
        ]);

        Config::set('mail.from', [
            'address' => $senderEmail,
            'name' => $senderName,
        ]);

        return [
            'host' => $smtpHost,
            'port' => $smtpPort,
            'username' => $username,
            'sender_email' => $senderEmail,
            'sender_name' => $senderName,
        ];
    }

    /**
     * Send standard HTML email using configured SMTP / Laravel Mail.
     */
    public static function sendEmail(
        string $senderName,
        string $senderEmail,
        string $recipientEmail,
        string $subject,
        string $htmlContent,
        ?EmployeeEmailAccount $account = null
    ): array {
        try {
            self::configureMailer($account);

            Mail::html($htmlContent, function ($message) use ($recipientEmail, $senderEmail, $senderName, $subject) {
                $message->to($recipientEmail)
                    ->from($senderEmail, $senderName)
                    ->subject($subject);
            });

            return [
                'status' => 'success',
                'message' => "Email dispatched successfully via SMTP to {$recipientEmail}",
                'message_id' => 'smtp_' . uniqid() . '_' . time()
            ];
        } catch (\Throwable $e) {
            // Fallback attempt: standard PHP mail() header dispatch if SMTP fails
            try {
                $headers = "MIME-Version: 1.0" . "\r\n";
                $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
                $headers .= "From: {$senderName} <{$senderEmail}>" . "\r\n";

                $sent = @mail($recipientEmail, $subject, $htmlContent, $headers);
                if ($sent) {
                    return [
                        'status' => 'success',
                        'message' => "Email sent successfully via standard PHP mailer to {$recipientEmail}",
                        'message_id' => 'phpmail_' . uniqid()
                    ];
                }
            } catch (\Throwable $ex) {
                // Ignore secondary fallback error
            }

            return [
                'status' => 'failed',
                'message' => "Standard Email Delivery Failed: {$e->getMessage()}",
                'error_message' => $e->getMessage()
            ];
        }
    }

    /**
     * Verify SMTP connectivity for employee / system email settings.
     */
    public static function testSmtpConnection(?EmployeeEmailAccount $account = null): array
    {
        $config = self::configureMailer($account);
        $host = $config['host'];
        $port = $config['port'];

        if (empty($host)) {
            return [
                'status' => 'failed',
                'message' => 'SMTP host is not configured.'
            ];
        }

        try {
            $connection = @fsockopen($host, $port, $errno, $errstr, 5);
            if (is_resource($connection)) {
                fclose($connection);
                return [
                    'status' => 'success',
                    'message' => "SMTP Server connection to {$host}:{$port} established successfully."
                ];
            }

            return [
                'status' => 'failed',
                'message' => "Cannot connect to SMTP server {$host}:{$port} - {$errstr}"
            ];
        } catch (\Throwable $e) {
            return [
                'status' => 'failed',
                'message' => "SMTP connection test error: {$e->getMessage()}"
            ];
        }
    }
}
