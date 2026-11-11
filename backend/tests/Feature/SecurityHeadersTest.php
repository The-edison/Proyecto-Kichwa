<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class SecurityHeadersTest extends TestCase
{
    #[TestWith(['/api/config', 200])]
    #[TestWith(['/api/auth/me', 401])]
    #[TestWith(['/api/nonexistent-security-test', 404])]
    public function test_api_success_and_errors_keep_security_headers(string $path, int $status): void
    {
        $this->getJson($path)->assertStatus($status)
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY');
    }

    #[TestWith([true])]
    #[TestWith([false])]
    public function test_session_is_http_only_while_csrf_remains_readable_and_secure_follows_configuration(bool $secure): void
    {
        config()->set('session.secure', $secure);
        $response = $this->get('/sanctum/csrf-cookie')->assertNoContent();
        $cookies = collect($response->headers->getCookies())->keyBy(fn ($cookie) => $cookie->getName());
        $session = $cookies->get(config('session.cookie'));
        $csrf = $cookies->get('XSRF-TOKEN');

        $this->assertNotNull($session);
        $this->assertNotNull($csrf);
        $this->assertTrue($session->isHttpOnly());
        $this->assertFalse($csrf->isHttpOnly());
        $this->assertSame($secure, $session->isSecure());
        $this->assertSame($secure, $csrf->isSecure());
        $this->assertSame('lax', $session->getSameSite());
        $this->assertSame('lax', $csrf->getSameSite());
    }

    public function test_preflight_does_not_grant_credentials_to_an_untrusted_origin(): void
    {
        $response = $this->withHeaders([
            'Origin' => 'https://untrusted.example',
            'Access-Control-Request-Method' => 'POST',
            'Access-Control-Request-Headers' => 'X-XSRF-TOKEN,X-Tab-Session,Content-Type',
        ])->options('/api/auth/login')->assertNoContent();

        $this->assertNotSame('https://untrusted.example', $response->headers->get('Access-Control-Allow-Origin'));
        $this->assertNotSame('*', $response->headers->get('Access-Control-Allow-Origin'));
    }
}
