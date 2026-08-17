<?php

namespace App\Services;

class BrevoEmailService
{
    public static function getApiKey(?string $customKey = null): ?string
    {
        return 'standard_smtp';
    }

    public static function verifyApiKey(?string $apiKey = null): array
    {
        return NormalEmailService::testSmtpConnection(null);
    }

    public static function sendTransactionalEmail(
        string $senderName,
        string $senderEmail,
        string $recipientEmail,
        string $subject,
        string $htmlContent,
        ?string $customApiKey = null
    ): array {
        return NormalEmailService::sendEmail($senderName, $senderEmail, $recipientEmail, $subject, $htmlContent);
    }
}
