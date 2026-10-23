<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class PrivacyController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json([
            'contact' => config('kichwa.privacy'),
            'session' => [
                'cookie' => config('session.cookie'),
                'lifetime_minutes' => (int) config('session.lifetime'),
                'expires_on_close' => (bool) config('session.expire_on_close'),
                'secure' => (bool) config('session.secure'),
                'http_only' => (bool) config('session.http_only'),
                'same_site' => config('session.same_site'),
            ],
            'google_enabled' => (bool) (config('services.google.client_id') && config('services.google.client_secret')),
            'password_breach_check' => (bool) config('kichwa.check_breached_passwords'),
            'gmail_smtp' => config('mail.default') === 'smtp' && config('mail.mailers.smtp.host') === 'smtp.gmail.com',
            'password_reset_minutes' => (int) config('auth.passwords.users.expire'),
        ]);
    }
}
