<?php

namespace Tests\Feature;

use App\Models\Nivel;
use App\Models\Usuario;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class AdminHierarchyTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_admin_creates_consecutive_modules_without_manual_order_and_gets_specific_duplicate_error(): void
    {
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $parent = Nivel::where('orden_nivel', 1)->firstOrFail()->id_nivel;
        $input = ['level_id' => $parent, 'title' => 'Módulo de prueba', 'description' => 'Objetivo técnico'];
        $this->postJson('/api/admin/modules', $input)->assertCreated()->assertJsonPath('sort_order', 1);
        $this->postJson('/api/admin/modules', $input)->assertCreated()->assertJsonPath('sort_order', 2);
        $this->postJson('/api/admin/modules', $input + ['sort_order' => 1])->assertUnprocessable()
            ->assertJsonPath('errors.sort_order.0', 'Ya existe un módulo con ese orden en este nivel.');
        $this->assertDatabaseCount('modulos', 2);
    }

    public function test_missing_parent_returns_validation_error_and_students_cannot_create_modules(): void
    {
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->postJson('/api/admin/modules', ['level_id' => 999999, 'title' => 'Prueba', 'description' => 'Prueba'])
            ->assertUnprocessable()->assertJsonValidationErrors('level_id');
        Sanctum::actingAs(Usuario::factory()->create());
        $this->postJson('/api/admin/modules', [])->assertForbidden();
    }

    public function test_units_and_topics_also_allocate_orders_within_their_parent(): void
    {
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $parent = Nivel::where('orden_nivel', 1)->firstOrFail()->id_nivel;
        $module = $this->postJson('/api/admin/modules', ['level_id' => $parent, 'title' => 'Prueba', 'description' => 'Prueba'])->assertCreated()->json('id');
        $data = ['module_id' => $module, 'title' => 'Unidad', 'description' => 'Objetivo'];
        $unit = $this->postJson('/api/admin/units', $data)->assertCreated()->assertJsonPath('sort_order', 1)->json('id');
        $this->postJson('/api/admin/units', $data)->assertCreated()->assertJsonPath('sort_order', 2);
        $topic = ['unit_id' => $unit, 'title' => 'Tema', 'body' => 'Texto técnico', 'kind' => 'culture'];
        $this->postJson('/api/admin/contents', $topic)->assertCreated()->assertJsonPath('sort_order', 1);
        $this->postJson('/api/admin/contents', $topic)->assertCreated()->assertJsonPath('sort_order',2);
    }
}
