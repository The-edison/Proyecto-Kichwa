<?php

namespace Tests\Feature;

use App\Models\Usuario;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class SessionSecurityTest extends TestCase
{
    use UsesPostgreSQL;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('sanctum.stateful', ['127.0.0.1:5173']);
        $this->withHeader('Origin', 'http://127.0.0.1:5173');
    }

    private function loginInTab(Usuario $user, string $token): void
    {
        $this->withHeader('X-Tab-Session', $token)->postJson('/api/auth/login', ['identifier' => $user->correo_usuario, 'password' => 'PruebaSegura#2026'])->assertOk()->assertJsonMissingPath('token');
    }

    public function test_cookie_alone_or_another_tab_key_cannot_access_private_routes(): void
    {
        $admin = Usuario::factory()->administrador()->create();
        $this->loginInTab($admin, str_repeat('a', 64));
        $this->withHeader('X-Tab-Session', '')->getJson('/api/auth/me')->assertUnauthorized();
        $this->withHeader('X-Tab-Session', str_repeat('b', 64))->getJson('/api/admin/overview')->assertUnauthorized();
        $this->withHeader('Authorization', 'Bearer invalido')->getJson('/api/admin/overview')->assertUnauthorized();
        $this->withHeader('Authorization', '');
        $this->withHeader('X-Tab-Session', str_repeat('a', 64))->getJson('/api/admin/overview')->assertOk();
    }

    public function test_admin_and_student_tabs_keep_their_accounts_and_roles_separate(): void
    {
        $admin = Usuario::factory()->administrador()->create();
        $student = Usuario::factory()->create();
        $this->loginInTab($admin, str_repeat('a', 64));
        $this->loginInTab($student, str_repeat('b', 64));
        $this->withHeader('X-Tab-Session', str_repeat('a', 64))->getJson('/api/auth/me')->assertOk()->assertJsonPath('id', $admin->id_usuario);
        $this->getJson('/api/admin/overview')->assertOk();
        $this->getJson('/api/levels')->assertForbidden();
        $this->withHeader('X-Tab-Session', str_repeat('b', 64))->getJson('/api/auth/me')->assertOk()->assertJsonPath('id', $student->id_usuario);
        $this->getJson('/api/levels')->assertOk();
        $this->getJson('/api/admin/overview')->assertForbidden();
    }

    public function test_logout_revokes_only_the_current_tab_and_preserves_other_tabs(): void
    {
        $admin = Usuario::factory()->administrador()->create();
        $student = Usuario::factory()->create();
        $this->loginInTab($admin, str_repeat('a', 64));
        $this->loginInTab($student, str_repeat('b', 64));
        $this->postJson('/api/auth/logout')->assertNoContent();
        $this->getJson('/api/auth/me')->assertUnauthorized();
        $this->withHeader('X-Tab-Session', str_repeat('a', 64))->getJson('/api/admin/overview')->assertOk();
    }

    public function test_tab_expires_after_inactivity_even_when_another_tab_stays_active(): void
    {
        config()->set('session.lifetime', 30);
        $this->freezeTime();
        $user = Usuario::factory()->create();
        $this->loginInTab($user, str_repeat('a', 64));
        $this->travel(20)->minutes();
        $this->loginInTab($user, str_repeat('b', 64));
        $this->travel(11)->minutes();
        $this->withHeader('X-Tab-Session', str_repeat('a', 64))->getJson('/api/auth/me')->assertUnauthorized();
        $this->withHeader('X-Tab-Session', str_repeat('b', 64))->getJson('/api/auth/me')->assertOk();
    }

    public function test_blocked_user_loses_access_in_each_of_their_tabs(): void
    {
        $user = Usuario::factory()->create();
        $this->loginInTab($user, str_repeat('a', 64));
        $this->loginInTab($user, str_repeat('b', 64));
        $user->forceFill(['estado_usuario' => 'bloqueado'])->save();
        $this->withHeader('X-Tab-Session', str_repeat('a', 64))->getJson('/api/levels')->assertUnauthorized();
        $this->withHeader('X-Tab-Session', str_repeat('b', 64))->getJson('/api/levels')->assertUnauthorized();
    }

    public function test_password_change_revokes_other_tabs_but_keeps_current_tab(): void
    {
        $user = Usuario::factory()->create();
        $this->loginInTab($user, str_repeat('a', 64));
        $this->loginInTab($user, str_repeat('b', 64));
        $this->postJson('/api/auth/change-password', ['current_password' => 'PruebaSegura#2026', 'password' => 'OtraClaveSegura#2026', 'password_confirmation' => 'OtraClaveSegura#2026'])->assertOk();
        $this->getJson('/api/auth/me')->assertOk();
        $this->withHeader('X-Tab-Session', str_repeat('a', 64))->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_changed_password_revokes_tab_even_if_shared_cookie_survives(): void
    {
        $user = Usuario::factory()->create();
        $this->loginInTab($user, str_repeat('a', 64));
        $this->loginInTab(Usuario::factory()->administrador()->create(), str_repeat('b', 64));
        $user->forceFill(['contrasena_usuario' => 'CambioExterno#2026'])->save();
        $this->withHeader('X-Tab-Session', str_repeat('a', 64))->getJson('/api/auth/me')->assertUnauthorized();
        $this->withHeader('X-Tab-Session', str_repeat('b', 64))->getJson('/api/admin/overview')->assertOk();
    }

    public function test_private_responses_cannot_be_stored_by_browser_or_shared_cache(): void
    {
        $this->loginInTab(Usuario::factory()->create(), str_repeat('a', 64));
        $response = $this->getJson('/api/auth/me')->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff')->assertHeader('X-Frame-Options', 'DENY');
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
    }

    public function test_login_without_a_tab_key_does_not_authenticate_the_browser(): void
    {
        $user = Usuario::factory()->create();
        $this->postJson('/api/auth/login', ['identifier' => $user->correo_usuario, 'password' => 'PruebaSegura#2026'])->assertUnauthorized();
        $this->assertGuest('web');
    }

    public function test_browser_login_rejects_missing_csrf_token_outside_testing(): void
    {
        $user = Usuario::factory()->create();
        $original = app()->environment();
        app()->detectEnvironment(fn () => 'local');
        try {
            $this->withHeader('X-Tab-Session', str_repeat('a', 64))->postJson('/api/auth/login', ['identifier' => $user->correo_usuario, 'password' => 'PruebaSegura#2026'])->assertStatus(419);
            $this->assertGuest('web');
        } finally {
            app()->detectEnvironment(fn () => $original);
        }
    }

    public function test_google_navigation_cannot_start_without_tab_preparation(): void
    {
        config(['services.google.client_id' => 'test', 'services.google.client_secret' => 'test']);
        $this->get('/auth/google')->assertForbidden();
        $this->get('/cuenta/google')->assertForbidden();
    }
}
