<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FrontendAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('sanctum.stateful', ['127.0.0.1:5173']);
        $this->withHeader('Origin', 'http://127.0.0.1:5173');
    }

    public function test_spa_registration_creates_a_session_without_returning_a_token(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'Ana Test',
            'email' => 'ana@example.test',
            'password' => 'ClaveSegura123',
            'password_confirmation' => 'ClaveSegura123',
        ])->assertCreated()->assertJsonMissingPath('token')->assertJsonPath('user.role.code', 'student');

        $this->assertAuthenticated('web');
        $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('email', 'ana@example.test');
        $this->getJson('/api/levels')->assertOk();
        $this->getJson('/api/admin/levels')->assertForbidden();
        $this->postJson('/api/auth/logout')->assertNoContent();
        $this->assertGuest('web');
        $this->flushSession();
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_spa_login_accepts_email_and_admin_can_access_admin_levels(): void
    {
        $admin = User::factory()->create([
            'role_id' => Role::where('code', 'admin')->firstOrFail()->id,
        ]);

        $this->postJson('/api/auth/login', [
            'identifier' => $admin->email,
            'password' => 'incorrecta',
        ])->assertUnprocessable();

        $this->postJson('/api/auth/login', [
            'identifier' => $admin->email,
            'password' => 'password',
        ])->assertOk()->assertJsonMissingPath('token')->assertJsonPath('user.role.code', 'admin');

        $this->getJson('/api/admin/levels')->assertOk();
        $this->getJson('/api/levels')->assertForbidden();
    }

    public function test_api_allows_only_the_configured_frontend_origin_with_credentials(): void
    {
        $this->getJson('/api/config')
            ->assertOk()
            ->assertHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5173')
            ->assertHeader('Access-Control-Allow-Credentials', 'true');

        $response = $this->withHeader('Origin', 'https://untrusted.example')->getJson('/api/config');
        $this->assertNotSame('https://untrusted.example', $response->headers->get('Access-Control-Allow-Origin'));
    }
}
