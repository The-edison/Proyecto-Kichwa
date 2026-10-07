<?php

namespace Tests\Feature;

use App\Models\Usuario;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class StudentListingTest extends TestCase
{
    use UsesPostgreSQL;

    #[TestWith(['/api/admin/students?q=&page=1'])]
    #[TestWith(['/api/admin/students?q=%20%20&page=1'])]
    #[TestWith(['/api/admin/students?page=1'])]
    public function test_empty_search_lists_registered_students_including_blocked_accounts(string $url): void
    {
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $first = Usuario::factory()->create(['nombre_usuario' => 'Ana Estudiante']);
        $last = Usuario::factory()->create(['nombre_usuario' => 'Zoe Estudiante', 'estado_usuario' => 'bloqueado']);

        $response = $this->getJson($url)->assertOk()->assertJsonPath('total', 2)
            ->assertJsonPath('data.0.id', $first->id_usuario)->assertJsonPath('data.1.id', $last->id_usuario)
            ->assertJsonPath('data.1.state', 'bloqueado')->assertJsonPath('per_page', 20);
        $this->assertArrayNotHasKey('contrasena_usuario', $response->json('data.0'));
        $this->assertArrayNotHasKey('remember_token', $response->json('data.0'));
    }

    public function test_pages_are_stable_when_students_have_the_same_name(): void
    {
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $students = Usuario::factory()->count(45)->create(['nombre_usuario' => 'Estudiante Registrado']);

        $ids = [];
        foreach ([1 => 20, 2 => 20, 3 => 5] as $page => $count) {
            $response = $this->getJson('/api/admin/students?q=&page='.$page)->assertOk()->assertJsonPath('total', 45)
                ->assertJsonPath('current_page', $page)->assertJsonPath('last_page', 3)->assertJsonCount($count, 'data');
            $ids = array_merge($ids, array_column($response->json('data'), 'id'));
        }
        $this->assertSame($students->pluck('id_usuario')->all(), $ids);
    }

    public function test_search_matches_name_email_and_cedula_and_keeps_pattern_characters_literal(): void
    {
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $student = Usuario::factory()->create(['nombre_usuario' => 'Ana Perez', 'correo_usuario' => 'ana@example.com', 'cedula_usuario' => '1710034065']);
        Usuario::factory()->create(['nombre_usuario' => 'Otro Estudiante']);

        foreach (['ANA', 'ana@example.com', '1710034065'] as $query) {
            $this->getJson('/api/admin/students?'.http_build_query(['q' => $query]))->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $student->id_usuario);
        }
        $this->getJson('/api/admin/students?q=%25')->assertOk()->assertJsonPath('total', 0);
        $this->getJson('/api/admin/students?q=inexistente')->assertOk()->assertJsonPath('total', 0);
        $this->getJson('/api/admin/students?page=0')->assertUnprocessable()->assertJsonValidationErrors('page');
    }

    public function test_student_list_requires_administrator_access(): void
    {
        $this->getJson('/api/admin/students?q=')->assertUnauthorized();
        Sanctum::actingAs(Usuario::factory()->create());

        $this->getJson('/api/admin/students?q=')->assertForbidden();
    }
}
