<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\GrupoController;
use App\Models\Grupo;
use App\Models\Usuario;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class GruposTest extends TestCase
{
    use UsesPostgreSQL;

    private function group(Usuario $admin, string $code = 'KCH-7F3A9', bool $active = true): Grupo
    {
        $group = Grupo::create(['nombre' => 'Kichwa A', 'codigo' => $code, 'admin_id' => $admin->id_usuario]);
        $group->activo = $active;
        $group->save();

        return $group;
    }

    public function test_an_admin_creates_readable_unique_codes_and_only_lists_their_own_groups(): void
    {
        $admin = Usuario::factory()->administrador()->create();
        $this->group(Usuario::factory()->administrador()->create());
        Sanctum::actingAs($admin);
        $first = $this->postJson('/api/admin/grupos', ['nombre' => ' Kichwa B '])->assertCreated()->assertJsonPath('nombre', 'Kichwa B')->assertJsonPath('activo', true)->json();
        $second = $this->postJson('/api/admin/grupos', ['nombre' => 'Kichwa C'])->assertCreated()->json();
        $this->assertMatchesRegularExpression('/^KCH-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/', $first['codigo']);
        $this->assertNotSame($first['codigo'], $second['codigo']);
        $this->assertDatabaseHas('grupos', ['id' => $first['id'], 'admin_id' => $admin->id_usuario, 'codigo' => $first['codigo']]);
        $this->getJson('/api/admin/grupos')->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('data.0.id', $second['id'])->assertJsonPath('data.1.estudiantes_count', 0);
    }

    public function test_group_creation_validates_the_name_and_rejects_manually_supplied_codes_or_owners(): void
    {
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->postJson('/api/admin/grupos', ['nombre' => '   '])->assertUnprocessable()->assertJsonValidationErrors('nombre');
        $this->postJson('/api/admin/grupos', ['nombre' => '<script>grupo</script>'])->assertUnprocessable()->assertJsonValidationErrors('nombre');
        $this->postJson('/api/admin/grupos', ['nombre' => 'Curso', 'codigo' => 'KCH-AAAAA', 'admin_id' => 99])->assertUnprocessable()->assertJsonValidationErrors(['codigo', 'admin_id']);
        $this->assertDatabaseCount('grupos', 0);
    }

    public function test_a_generated_code_collision_retries_without_changing_the_existing_group(): void
    {
        $existing = $this->group(Usuario::factory()->administrador()->create());
        $controller = new class extends GrupoController
        {
            private array $codes = ['KCH-7F3A9', 'KCH-AAAAA'];

            protected function generateCode(): string
            {
                return array_shift($this->codes);
            }
        };
        $this->app->instance(GrupoController::class, $controller);
        $admin = Usuario::factory()->administrador()->create();
        Sanctum::actingAs($admin);

        $this->postJson('/api/admin/grupos', ['nombre' => 'Otro curso'])->assertCreated()->assertJsonPath('codigo', 'KCH-AAAAA');

        $this->assertDatabaseHas('grupos', ['id' => $existing->id, 'codigo' => 'KCH-7F3A9', 'admin_id' => $existing->admin_id]);
        $this->assertDatabaseHas('grupos', ['nombre' => 'Otro curso', 'codigo' => 'KCH-AAAAA', 'admin_id' => $admin->id_usuario]);
        $this->assertDatabaseCount('grupos', 2);
    }

    public function test_only_the_owner_can_toggle_a_group_without_removing_its_students(): void
    {
        $admin = Usuario::factory()->administrador()->create();
        $group = $this->group($admin);
        $student = Usuario::factory()->create();
        $student->grupo_id = $group->id;
        $student->save();
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->patchJson('/api/admin/grupos/'.$group->id, ['activo' => false])->assertNotFound();
        Sanctum::actingAs($admin);
        $this->patchJson('/api/admin/grupos/'.$group->id, ['activo' => false])->assertOk()->assertJsonPath('activo', false);
        $this->assertDatabaseHas('usuarios', ['id_usuario' => $student->id_usuario, 'grupo_id' => $group->id]);
        $this->getJson('/api/admin/grupos')->assertJsonPath('data.0.estudiantes_count', 1);
        $this->patchJson('/api/admin/grupos/'.$group->id, ['activo' => true])->assertOk()->assertJsonPath('activo', true);
        $this->patchJson('/api/admin/grupos/'.$group->id, ['activo' => 'yes'])->assertUnprocessable()->assertJsonValidationErrors('activo');
    }

    public function test_a_student_can_join_once_leave_and_then_join_a_different_group(): void
    {
        $admin = Usuario::factory()->administrador()->create();
        $group = $this->group($admin);
        $other = $this->group($admin, 'KCH-AAAAA');
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $this->getJson('/api/mi-grupo')->assertOk()->assertExactJson(['grupo' => null]);
        $this->postJson('/api/mi-grupo', ['codigo' => '  kch-7f3a9  '])->assertOk()->assertJsonPath('grupo.id', $group->id);
        $this->getJson('/api/mi-grupo')->assertOk()->assertJsonPath('grupo.nombre', 'Kichwa A')->assertJsonMissingPath('grupo.admin_id')->assertJsonMissingPath('grupo.codigo');
        $this->postJson('/api/mi-grupo', ['codigo' => $group->codigo])->assertOk();
        $this->postJson('/api/mi-grupo', ['codigo' => $other->codigo])->assertConflict();
        $this->assertDatabaseHas('usuarios', ['id_usuario' => $student->id_usuario, 'grupo_id' => $group->id]);
        $this->deleteJson('/api/mi-grupo')->assertOk()->assertJsonPath('grupo', null);
        $this->assertNull($student->fresh()->grupo_id);
        $this->postJson('/api/mi-grupo', ['codigo' => $other->codigo])->assertOk();
        $this->assertDatabaseHas('usuarios', ['id_usuario' => $student->id_usuario, 'grupo_id' => $other->id]);
    }

    public function test_invalid_and_inactive_codes_never_enroll_a_student_and_attempts_are_limited(): void
    {
        $group = $this->group(Usuario::factory()->administrador()->create(), active: false);
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $this->postJson('/api/mi-grupo', ['codigo' => $group->codigo])->assertUnprocessable()->assertJsonValidationErrors('codigo');
        $this->postJson('/api/mi-grupo', ['codigo' => 'KCH-AAAAA'])->assertUnprocessable()->assertJsonValidationErrors('codigo');
        $this->postJson('/api/mi-grupo', ['codigo' => ''])->assertUnprocessable()->assertJsonValidationErrors('codigo');
        $this->postJson('/api/mi-grupo', ['codigo' => ['bad']])->assertUnprocessable()->assertJsonValidationErrors('codigo');
        $this->postJson('/api/mi-grupo', ['codigo' => 'KCH-0O1II'])->assertUnprocessable()->assertJsonValidationErrors('codigo');
        $this->postJson('/api/mi-grupo', ['codigo' => 'KCH-AAAAA'])->assertTooManyRequests();
        $this->assertNull($student->fresh()->grupo_id);
    }

    public function test_existing_members_keep_their_membership_when_a_group_is_disabled_and_can_leave(): void
    {
        $group = $this->group(Usuario::factory()->administrador()->create(), active: false);
        $student = Usuario::factory()->create();
        $student->grupo_id = $group->id;
        $student->save();
        Sanctum::actingAs($student);
        $this->getJson('/api/mi-grupo')->assertOk()->assertJsonPath('grupo.activo', false);
        $this->deleteJson('/api/mi-grupo')->assertOk();
        $this->assertNull($student->fresh()->grupo_id);
    }

    public function test_student_filters_apply_to_the_entire_result_before_search_and_pagination_and_reject_other_admin_groups(): void
    {
        $admin = Usuario::factory()->administrador()->create();
        $group = $this->group($admin);
        $other = $this->group(Usuario::factory()->administrador()->create(), 'KCH-AAAAA');
        Usuario::factory()->count(12)->create(['grupo_id' => $group->id, 'nombre_usuario' => 'Ana Estudiante']);
        Usuario::factory()->create(['grupo_id' => $other->id]);
        $ungrouped = Usuario::factory()->create(['nombre_usuario' => 'Sin grupo']);
        Sanctum::actingAs($admin);
        $this->getJson('/api/admin/students?grupo_id='.$group->id.'&q=Ana&page=2')->assertOk()->assertJsonPath('total', 12)->assertJsonCount(2, 'data');
        $this->getJson('/api/admin/students?grupo_id=sin_grupo')->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $ungrouped->id_usuario);
        $this->getJson('/api/admin/students')->assertOk()->assertJsonPath('total', 14);
        $this->getJson('/api/admin/students?grupo_id='.$other->id)->assertNotFound();
        $this->getJson('/api/admin/students?grupo_id=invalid')->assertUnprocessable()->assertJsonValidationErrors('grupo_id');
    }

    public function test_group_endpoints_are_protected_by_authentication_and_role(): void
    {
        $this->getJson('/api/admin/grupos')->assertUnauthorized();
        $this->postJson('/api/mi-grupo', ['codigo' => 'KCH-AAAAA'])->assertUnauthorized();
        Sanctum::actingAs(Usuario::factory()->create());
        $this->getJson('/api/admin/grupos')->assertForbidden();
        $this->postJson('/api/admin/grupos', ['nombre' => 'Curso'])->assertForbidden();
        $this->patchJson('/api/admin/grupos/1', ['activo' => false])->assertForbidden();
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->getJson('/api/mi-grupo')->assertForbidden();
        $this->postJson('/api/mi-grupo', ['codigo' => 'KCH-AAAAA'])->assertForbidden();
        $this->deleteJson('/api/mi-grupo')->assertForbidden();
    }
}
