<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;
use Laravel\Socialite\Two\User as GoogleUser;
use Tests\TestCase;

class GoogleAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('services.google.client_id', 'test-client-id');
        config()->set('services.google.client_secret', 'test-client-secret');
    }

    public function test_verified_google_user_registers_as_student_without_cedula_or_password(): void
    {
        Socialite::fake('google', GoogleUser::fake([
            'id' => 'google-123',
            'name' => 'Rosa Yánez',
            'email' => 'rosa@example.test',
            'email_verified' => true,
        ]));

        $this->get('/auth/google')->assertRedirect('https://socialite.fake/google/authorize');
        $this->get('/auth/google/callback')->assertRedirect('/aprender');

        $this->assertDatabaseHas('users', [
            'email' => 'rosa@example.test',
            'google_id' => 'google-123',
            'cedula' => null,
            'password' => null,
            'role_id' => Role::where('code', 'student')->firstOrFail()->id,
        ]);
        $this->assertAuthenticated('web');

        $this->post('/cerrar-sesion')->assertRedirect('/');
        $this->post('/iniciar-sesion', [
            'identifier' => 'rosa@example.test',
            'password' => 'cualquier-clave',
        ])->assertSessionHasErrors('identifier');
        $this->postJson('/api/auth/login', [
            'identifier' => 'rosa@example.test',
            'password' => 'cualquier-clave',
        ])->assertUnprocessable();
    }

    public function test_existing_email_requires_password_login_before_google_is_linked(): void
    {
        $student = User::factory()->create(['email' => 'rosa@example.test']);
        Socialite::fake('google', GoogleUser::fake([
            'id' => 'google-456',
            'email' => $student->email,
            'email_verified' => true,
        ]));

        $this->get('/auth/google')->assertRedirect();
        $this->get('/auth/google/callback')->assertRedirect('/iniciar-sesion')->assertSessionHasErrors('google');

        $this->assertGuest('web');
        $this->assertDatabaseHas('users', ['id' => $student->id, 'google_id' => null]);
        $this->assertDatabaseCount('users', 1);
    }

    public function test_authenticated_admin_can_link_matching_google_and_later_sign_in(): void
    {
        $admin = User::factory()->create(['role_id' => Role::where('code', 'admin')->firstOrFail()->id]);
        Socialite::fake('google', GoogleUser::fake([
            'id' => 'google-admin',
            'email' => $admin->email,
            'email_verified' => true,
        ]));

        $this->actingAs($admin)->get('/cuenta/google')->assertRedirect();
        $this->get('/auth/google/callback')->assertRedirect('/cuenta');
        $this->assertDatabaseHas('users', ['id' => $admin->id, 'google_id' => 'google-admin']);

        $this->post('/cerrar-sesion')->assertRedirect('/');
        $this->get('/auth/google')->assertRedirect();
        $this->get('/auth/google/callback')->assertRedirect('/admin');
        $this->assertAuthenticatedAs($admin, 'web');
    }

    public function test_google_cannot_link_to_a_different_email(): void
    {
        $student = User::factory()->create(['email' => 'student@example.test']);
        Socialite::fake('google', GoogleUser::fake([
            'id' => 'google-other',
            'email' => 'other@example.test',
            'email_verified' => true,
        ]));

        $this->actingAs($student)->get('/cuenta/google')->assertRedirect();
        $this->get('/auth/google/callback')->assertRedirect('/cuenta')->assertSessionHasErrors('google');
        $this->assertDatabaseHas('users', ['id' => $student->id, 'google_id' => null]);
    }

    public function test_unverified_email_and_callback_without_initiated_flow_are_rejected(): void
    {
        Socialite::fake('google', GoogleUser::fake([
            'id' => 'google-unverified',
            'email' => 'unverified@example.test',
            'email_verified' => false,
        ]));

        $this->get('/auth/google/callback')->assertRedirect('/iniciar-sesion')->assertSessionHasErrors('google');
        $this->get('/auth/google')->assertRedirect();
        $this->get('/auth/google/callback')->assertRedirect('/iniciar-sesion')->assertSessionHasErrors('google');
        $this->assertDatabaseCount('users', 0);
    }

    public function test_failed_google_state_does_not_authenticate_anyone(): void
    {
        Socialite::fake('google', function () {
            throw new InvalidStateException;
        });

        $this->get('/auth/google')->assertRedirect();
        $this->get('/auth/google/callback')->assertRedirect('/iniciar-sesion')->assertSessionHasErrors('google');
        $this->assertGuest('web');
        $this->assertDatabaseCount('users', 0);
    }

    public function test_google_redirect_is_unavailable_without_oauth_credentials(): void
    {
        config()->set('services.google.client_id', null);
        $this->get('/auth/google')->assertStatus(503);
    }
}
