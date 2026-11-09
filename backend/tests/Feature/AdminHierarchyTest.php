<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\Nivel;
use App\Models\Tema;
use App\Models\Unidad;
use App\Models\Usuario;
use Database\Seeders\DemostracionSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class AdminHierarchyTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_intermediate_becomes_available_when_its_module_is_published(): void
    {
        $admin = Usuario::factory()->administrador()->create();
        $student = Usuario::factory()->create();
        $level = Nivel::where('orden_nivel', 2)->firstOrFail()->id_nivel;
        Sanctum::actingAs($admin);
        $module = $this->postJson('/api/admin/modules', ['level_id' => $level, 'title' => '[DEMO] Intermedio', 'description' => 'Verificación'])->assertCreated()->json('id');
        $unit = $this->postJson('/api/admin/units', ['module_id' => $module, 'title' => '[DEMO] Unidad', 'description' => 'Verificación', 'published' => true])->assertCreated()->json('id');
        Sanctum::actingAs($student);
        $this->getJson('/api/levels')->assertJsonPath('1.available', false);
        $this->getJson('/api/units/'.$unit)->assertNotFound();
        Sanctum::actingAs($admin);
        $this->patchJson('/api/admin/modules/'.$module, ['published' => true])->assertOk();
        Sanctum::actingAs($student);
        $this->getJson('/api/levels')->assertJsonPath('1.available', true);
        $this->getJson('/api/levels/'.$level.'/modules')->assertOk()->assertJsonPath('data.0.id', $module);
        $this->getJson('/api/units/'.$unit)->assertOk()->assertJsonPath('level_id', $level);
        $this->getJson('/api/progress')->assertOk()->assertJsonCount(2)->assertJsonPath('1.level.id', $level);
        Sanctum::actingAs($admin);
        $this->patchJson('/api/admin/modules/'.$module, ['published' => false])->assertOk();
        Sanctum::actingAs($student);
        $this->getJson('/api/levels')->assertJsonPath('1.available', false);
        $this->getJson('/api/units/'.$unit)->assertNotFound();
    }

    public function test_drafts_are_hidden_until_all_parents_are_published_and_reorder_keeps_unique_orders(): void
    {
        $admin = Usuario::factory()->administrador()->create();
        $student = Usuario::factory()->create();
        Sanctum::actingAs($admin);
        $level = Nivel::where('orden_nivel', 1)->firstOrFail()->id_nivel;
        $module = $this->postJson('/api/admin/modules', ['level_id' => $level, 'title' => '[DEMO] Módulo', 'description' => 'Técnico'])->assertCreated()->assertJsonPath('published', false)->json('id');
        $unit = $this->postJson('/api/admin/units', ['module_id' => $module, 'title' => '[DEMO] Unidad', 'description' => 'Técnico'])->assertCreated()->json('id');
        $second = $this->postJson('/api/admin/units', ['module_id' => $module, 'title' => '[DEMO] Segunda', 'description' => 'Técnico'])->assertCreated()->json('id');
        $topic = $this->postJson('/api/admin/contents', ['unit_id' => $unit, 'title' => '[DEMO] Tema', 'body' => 'Técnico', 'kind' => 'culture'])->assertCreated()->json('id');
        $this->patchJson('/api/admin/units/'.$second.'/move', ['direction' => 'up'])->assertOk();
        $this->assertDatabaseHas('unidades', ['id_unidad' => $second, 'orden_unidad' => 1]);
        $this->assertDatabaseHas('unidades', ['id_unidad' => $unit, 'orden_unidad' => 2]);
        $this->deleteJson('/api/admin/modules/'.$module)->assertStatus(409)->assertJsonPath('dependencies.unidades', 2);
        Sanctum::actingAs($student);
        $this->getJson('/api/levels/'.$level.'/modules')->assertOk()->assertJsonPath('total', 0);
        $this->getJson('/api/units/'.$unit.'/contents')->assertNotFound();
        Sanctum::actingAs($admin);
        $this->patchJson('/api/admin/modules/'.$module, ['published' => true])->assertOk();
        $this->patchJson('/api/admin/units/'.$unit, ['published' => true])->assertOk();
        Sanctum::actingAs($student);
        $this->getJson('/api/levels/'.$level.'/modules')->assertOk()->assertJsonPath('data.0.id', $module);
        $this->getJson('/api/units/'.$unit.'/contents')->assertOk()->assertJsonPath('total', 0);
        Sanctum::actingAs($admin);
        $this->patchJson('/api/admin/contents/'.$topic, ['published' => true])->assertOk();
        Sanctum::actingAs($student);
        $this->getJson('/api/units/'.$unit.'/contents')->assertOk()->assertJsonPath('data.0.id', $topic);
    }

    public function test_activity_cannot_reference_a_topic_from_another_unit(): void
    {
        $this->seed(DemostracionSeeder::class);
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $unit = Unidad::firstOrFail();
        $topic = Tema::firstOrFail();
        $other = $this->postJson('/api/admin/units', ['module_id' => $unit->id_modulo, 'title' => '[DEMO] Otra unidad', 'description' => 'Prueba'])->assertCreated()->json('id');
        $payload = ['unit_id' => $other, 'topic_id' => $topic->id_tema, 'type' => 'completar', 'prompt' => '[DEMO] Prueba', 'elements' => [['id' => 'a', 'texto' => 'Prueba']], 'zones' => [], 'solution' => ['textos' => ['a' => ['respuesta']]]];
        $this->postJson('/api/admin/exercises', $payload)->assertUnprocessable()->assertJsonValidationErrors('topic_id');
    }

    public function test_used_activity_can_be_reordered_but_its_content_remains_immutable(): void
    {
        $this->seed(DemostracionSeeder::class);
        $activity = Actividad::orderBy('orden_actividad')->firstOrFail();
        Sanctum::actingAs(Usuario::factory()->create());
        $this->postJson('/api/exercises/'.$activity->id_actividad.'/answer', ['answer' => ['seleccion' => ['a']]])->assertOk();
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->patchJson('/api/admin/exercises/'.$activity->id_actividad.'/move', ['direction' => 'down'])->assertOk();
        $this->assertDatabaseHas('actividades', ['id_actividad' => $activity->id_actividad, 'orden_actividad' => 2]);
        $this->patchJson('/api/admin/exercises/'.$activity->id_actividad, ['prompt' => 'Cambiar historia'])->assertStatus(409);
    }

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
        $this->postJson('/api/admin/contents', $topic)->assertCreated()->assertJsonPath('sort_order', 2);
    }
}
