<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FrontendAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_pages_render_and_student_registration_creates_a_session(): void
    {
        $this->get('/')->assertOk()->assertSee('lang="es"', false);
        $this->get('/glosario')->assertOk();
        $this->get('/registro')->assertOk();

        $this->post('/registro', [
            'name' => 'Ana Test',
            'cedula' => '0201234567',
            'email' => 'ana@example.test',
            'password' => 'ClaveSegura123',
            'password_confirmation' => 'ClaveSegura123',
        ])->assertRedirect('/aprender');

        $this->assertAuthenticated();
        $this->get('/aprender')->assertOk();
        $this->getJson('/api/levels')->assertOk();
        $this->get('/admin')->assertForbidden();
    }

    public function test_admin_session_is_restricted_to_admin_pages(): void
    {
        $admin = User::factory()->create([
            'role_id' => Role::where('code', 'admin')->firstOrFail()->id,
        ]);

        $this->actingAs($admin)->get('/admin')->assertOk();
        $this->get('/admin/contenidos')->assertOk();
        $this->getJson('/api/admin/students')->assertOk();
        $this->get('/aprender')->assertForbidden();
        $this->post('/cerrar-sesion')->assertRedirect('/');
        $this->assertGuest('web');
    }

    public function test_login_accepts_email_or_cedula_and_rejects_an_invalid_password(): void
    {
        $student = User::factory()->create(['cedula' => '0201234567']);

        $this->post('/iniciar-sesion', [
            'identifier' => $student->cedula,
            'password' => 'incorrecta',
        ])->assertSessionHasErrors('identifier');

        $this->post('/iniciar-sesion', [
            'identifier' => $student->email,
            'password' => 'password',
        ])->assertRedirect('/aprender');

        $this->getJson('/api/progress')->assertOk();

        $this->post('/cerrar-sesion')->assertRedirect('/');
        $this->post('/iniciar-sesion', [
            'identifier' => $student->cedula,
            'password' => 'password',
        ])->assertRedirect('/aprender');
    }

    public function test_student_can_register_with_email_without_cedula(): void
    {
        $this->post('/registro', [
            'name' => 'Rosa Test',
            'email' => 'rosa@example.test',
            'password' => 'ClaveSegura123',
            'password_confirmation' => 'ClaveSegura123',
        ])->assertRedirect('/aprender');

        $this->assertDatabaseHas('users', [
            'email' => 'rosa@example.test',
            'cedula' => null,
        ]);
    }
}
