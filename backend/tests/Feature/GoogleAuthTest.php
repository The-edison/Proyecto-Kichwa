<?php

namespace Tests\Feature;

use App\Models\Usuario;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;
use Laravel\Socialite\Two\User as GoogleUser;
use Tests\TestCase;
use Tests\UsesPostgreSQL as RefreshDatabase;

class GoogleAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('services.google.client_id', 'test-client-id');
        config()->set('services.google.client_secret', 'test-client-secret');
        config()->set('sanctum.stateful', ['127.0.0.1:5173']);
        $this->withHeader('Origin', 'http://127.0.0.1:5173');
        $this->withHeader('X-Tab-Session', str_repeat('a', 64));
    }

    public function test_verified_google_user_registers_as_student_without_cedula_or_password(): void
    {
        Socialite::fake('google', GoogleUser::fake([
            'id' => 'google-123',
            'name' => 'Rosa Yánez',
            'email' => 'rosa@example.test',
            'email_verified' => true,
        ]));

        $this->postJson('/api/auth/google/prepare')->assertOk();
        $this->get('/auth/google')->assertRedirect('https://socialite.fake/google/authorize');
        $this->get('/auth/google/callback')->assertRedirect('http://127.0.0.1:5173/aprender');

        $this->assertDatabaseHas('usuarios', [
            'correo_usuario' => 'rosa@example.test',
            'google_id' => 'google-123',
            'cedula_usuario' => null,
            'contrasena_usuario' => null,
            'rol_usuario' => 'estudiante',
        ]);
        $this->assertAuthenticated('web');

        $this->postJson('/api/auth/logout')->assertNoContent();
        $this->postJson('/api/auth/login', [
            'identifier' => 'rosa@example.test',
            'password' => 'cualquier-clave',
        ])->assertUnprocessable();
    }

    public function test_existing_email_requires_password_login_before_google_is_linked(): void
    {
        $student = Usuario::factory()->create(['correo_usuario' => 'rosa@example.test']);
        Socialite::fake('google', GoogleUser::fake([
            'id' => 'google-456',
            'email' => $student->correo_usuario,
            'email_verified' => true,
        ]));

        $this->postJson('/api/auth/google/prepare')->assertOk();
        $this->get('/auth/google')->assertRedirect();
        $response = $this->get('/auth/google/callback')->assertRedirect();
        $this->assertStringStartsWith('http://127.0.0.1:5173/iniciar-sesion?google_error=', (string) $response->headers->get('Location'));

        $this->assertGuest('web');
        $this->assertDatabaseHas('usuarios', ['id_usuario' => $student->id_usuario, 'google_id' => null]);
        $this->assertDatabaseCount('usuarios', 1);
    }

    public function test_authenticated_admin_can_link_matching_google_and_later_sign_in(): void
    {
        $admin = Usuario::factory()->create(['rol_usuario' => 'administrador']);
        Socialite::fake('google', GoogleUser::fake([
            'id' => 'google-admin',
            'email' => $admin->correo_usuario,
            'email_verified' => true,
        ]));

        $this->postJson('/api/auth/login', ['identifier' => $admin->correo_usuario, 'password' => 'PruebaSegura#2026'])->assertOk();
        $this->postJson('/api/auth/google/link-prepare')->assertOk();
        $this->get('/cuenta/google')->assertRedirect();
        $this->get('/auth/google/callback')->assertRedirect();
        $this->assertDatabaseHas('usuarios', ['id_usuario' => $admin->id_usuario, 'google_id' => 'google-admin']);

        $this->postJson('/api/auth/logout')->assertNoContent();
        $this->assertGuest('web');
        $this->flushSession();
        $this->app['auth']->forgetGuards();
        $this->postJson('/api/auth/google/prepare')->assertOk();
        $this->get('/auth/google')->assertRedirect('https://socialite.fake/google/authorize');
        $this->get('/auth/google/callback')->assertRedirect('http://127.0.0.1:5173/admin');
        $this->assertAuthenticatedAs($admin, 'web');
    }

    public function test_google_cannot_link_to_a_different_email(): void
    {
        $student = Usuario::factory()->create(['correo_usuario' => 'student@example.test']);
        Socialite::fake('google', GoogleUser::fake([
            'id' => 'google-other',
            'email' => 'other@example.test',
            'email_verified' => true,
        ]));

        $this->postJson('/api/auth/login', ['identifier' => $student->correo_usuario, 'password' => 'PruebaSegura#2026'])->assertOk();
        $this->postJson('/api/auth/google/link-prepare')->assertOk();
        $this->get('/cuenta/google')->assertRedirect();
        $response = $this->get('/auth/google/callback')->assertRedirect();
        $this->assertStringStartsWith('http://127.0.0.1:5173/cuenta?google_error=', (string) $response->headers->get('Location'));
        $this->assertDatabaseHas('usuarios', ['id_usuario' => $student->id_usuario, 'google_id' => null]);
    }

    public function test_unverified_email_and_callback_without_initiated_flow_are_rejected(): void
    {
        Socialite::fake('google', GoogleUser::fake([
            'id' => 'google-unverified',
            'email' => 'unverified@example.test',
            'email_verified' => false,
        ]));

        $this->get('/auth/google/callback')->assertRedirect();
        $this->postJson('/api/auth/google/prepare')->assertOk();
        $this->get('/auth/google')->assertRedirect();
        $this->get('/auth/google/callback')->assertRedirect();
        $this->assertDatabaseCount('usuarios', 0);
    }

    public function test_failed_google_state_does_not_authenticate_anyone(): void
    {
        Socialite::fake('google', function () {
            throw new InvalidStateException;
        });

        $this->postJson('/api/auth/google/prepare')->assertOk();
        $this->get('/auth/google')->assertRedirect();
        $this->get('/auth/google/callback')->assertRedirect();
        $this->assertGuest('web');
        $this->assertDatabaseCount('usuarios', 0);
    }

    public function test_google_redirect_is_unavailable_without_oauth_credentials(): void
    {
        config()->set('services.google.client_id', null);
        $this->get('/auth/google')->assertStatus(503);
    }
}
