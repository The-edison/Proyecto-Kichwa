<?php

namespace Tests\Feature;

use App\Models\Nivel;
use App\Models\Usuario;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class ModuleContentsTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_published_units_are_visible_without_topics_and_publication_invalidates_cached_lists(): void
    {
        $admin = Usuario::factory()->administrador()->create();
        $student = Usuario::factory()->create();
        Sanctum::actingAs($admin);
        $level = Nivel::where('orden_nivel', 1)->firstOrFail()->id_nivel;
        $module = $this->createContent('modules', ['level_id' => $level, 'title' => 'Módulo publicado', 'description' => 'Objetivo', 'published' => true]);
        $unit = $this->createContent('units', ['module_id' => $module, 'title' => 'Unidad sin temas', 'description' => 'En preparación']);
        Sanctum::actingAs($student);
        $this->getJson('/api/modules/'.$module.'/units')->assertOk()->assertJsonPath('total', 0);
        $this->getJson('/api/modules/'.$module.'/contents')->assertOk()->assertJsonPath('total', 0);

        Sanctum::actingAs($admin);
        $this->patchJson('/api/admin/units/'.$unit, ['published' => true])->assertOk();
        Sanctum::actingAs($student);
        $this->getJson('/api/modules/'.$module.'/units')->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $unit);
        $this->getJson('/api/modules/'.$module.'/contents')->assertOk()->assertJsonPath('total', 0);

        Sanctum::actingAs($admin);
        $this->patchJson('/api/admin/units/'.$unit, ['published' => false])->assertOk();
        Sanctum::actingAs($student);
        $this->getJson('/api/modules/'.$module.'/units')->assertOk()->assertJsonPath('total', 0);
        $this->getJson('/api/units/'.$unit)->assertNotFound();
    }

    public function test_admin_objective_updates_reach_student_lists_topics_and_unit_detail(): void
    {
        $admin = Usuario::factory()->administrador()->create();
        $student = Usuario::factory()->create();
        Sanctum::actingAs($admin);
        $level = Nivel::where('orden_nivel', 1)->firstOrFail()->id_nivel;
        $module = $this->createContent('modules', ['level_id' => $level, 'title' => 'Curso', 'description' => 'Objetivo', 'published' => true]);
        $unit = $this->createContent('units', ['module_id' => $module, 'title' => 'Unidad', 'description' => "Aprender palabras.\nPracticar saludos.", 'published' => true]);
        $this->createContent('contents', ['unit_id' => $unit, 'title' => 'Saludos', 'body' => 'Contenido', 'kind' => 'vocabulary', 'published' => true]);
        Sanctum::actingAs($student);
        $this->getJson('/api/modules/'.$module.'/units')->assertOk()->assertJsonPath('data.0.description', "Aprender palabras.\nPracticar saludos.");
        $this->getJson('/api/modules/'.$module.'/contents')->assertOk()->assertJsonPath('data.0.unit_objective', "Aprender palabras.\nPracticar saludos.");
        $this->getJson('/api/units/'.$unit)->assertOk()->assertJsonPath('description', "Aprender palabras.\nPracticar saludos.");
        Sanctum::actingAs($admin);
        $this->patchJson('/api/admin/units/'.$unit, ['description' => 'Objetivo actualizado'])->assertOk();
        Sanctum::actingAs($student);
        $this->getJson('/api/modules/'.$module.'/units')->assertOk()->assertJsonPath('data.0.description', 'Objetivo actualizado');
        $this->getJson('/api/modules/'.$module.'/contents')->assertOk()->assertJsonPath('data.0.unit_objective', 'Objetivo actualizado');
        $this->getJson('/api/units/'.$unit)->assertOk()->assertJsonPath('description', 'Objetivo actualizado');
    }

    private function createContent(string $resource, array $data): int
    {
        return $this->postJson('/api/admin/'.$resource, $data)->assertCreated()->json('id');
    }

    public function test_module_index_filters_drafts_and_other_modules_orders_topics_and_keeps_progress_private(): void
    {
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $level = Nivel::where('orden_nivel', 1)->firstOrFail()->id_nivel;
        $module = $this->createContent('modules', ['level_id' => $level, 'title' => 'Curso', 'description' => 'Objetivo', 'published' => true]);
        $unit = $this->createContent('units', ['module_id' => $module, 'title' => 'Primera unidad', 'description' => 'Objetivo', 'published' => true]);
        $second = $this->createContent('units', ['module_id' => $module, 'title' => 'Segunda unidad', 'description' => 'Objetivo', 'published' => true]);
        $later = $this->createContent('contents', ['unit_id' => $unit, 'title' => 'Segundo tema', 'body' => 'No enviar el cuerpo en el índice', 'kind' => 'vocabulary', 'sort_order' => 2, 'published' => true]);
        $first = $this->createContent('contents', ['unit_id' => $unit, 'title' => 'Primer tema', 'body' => 'Lectura', 'kind' => 'vocabulary', 'sort_order' => 1, 'published' => true]);
        $last = $this->createContent('contents', ['unit_id' => $second, 'title' => 'Último tema', 'body' => 'Lectura', 'kind' => 'culture', 'published' => true]);
        $this->createContent('contents', ['unit_id' => $unit, 'title' => 'Tema borrador', 'body' => 'Oculto', 'kind' => 'culture']);
        $draftUnit = $this->createContent('units', ['module_id' => $module, 'title' => 'Unidad borrador', 'description' => 'Oculta']);
        $this->createContent('contents', ['unit_id' => $draftUnit, 'title' => 'Tema de unidad borrador', 'body' => 'Oculto', 'kind' => 'culture', 'published' => true]);
        $other = $this->createContent('modules', ['level_id' => $level, 'title' => 'Otro curso', 'description' => 'Objetivo', 'published' => true]);
        $otherUnit = $this->createContent('units', ['module_id' => $other, 'title' => 'Otra unidad', 'description' => 'Objetivo', 'published' => true]);
        $this->createContent('contents', ['unit_id' => $otherUnit, 'title' => 'Otro tema', 'body' => 'Ajeno', 'kind' => 'culture', 'published' => true]);
        $exercise = $this->createContent('exercises', ['unit_id' => $unit, 'topic_id' => $first, 'type' => 'completar', 'prompt' => 'm_kuna', 'elements' => [['id' => 'a', 'texto' => 'm_kuna', 'opciones' => ['i', 'e', 'o']]], 'zones' => [], 'solution' => ['textos' => ['a' => ['i']]]]);

        Sanctum::actingAs(Usuario::factory()->create());
        $this->postJson('/api/exercises/'.$exercise.'/answer', ['answer' => ['textos' => ['a' => 'i']]])->assertOk();
        $response = $this->getJson('/api/modules/'.$module.'/contents')->assertOk()->assertJsonPath('total', 3)
            ->assertJsonPath('data.0.id', $first)->assertJsonPath('data.1.id', $later)->assertJsonPath('data.2.id', $last)
            ->assertJsonPath('data.0.unit_title', 'Primera unidad')->assertJsonPath('data.0.unit_objective', 'Objetivo')->assertJsonPath('data.0.exercise_count', 1)->assertJsonPath('data.0.percentage', 100)
            ->assertJsonPath('data.2.unit_order', 2);
        $this->assertArrayNotHasKey('body', $response->json('data.0'));
        $this->assertArrayNotHasKey('solution', $response->json('data.0'));
        Sanctum::actingAs(Usuario::factory()->create());
        $this->getJson('/api/modules/'.$module.'/contents')->assertOk()->assertJsonPath('data.0.percentage', 0);
    }

    public function test_module_index_is_paginated_and_rejects_unpublished_modules_and_invalid_pages(): void
    {
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $level = Nivel::where('orden_nivel', 1)->firstOrFail()->id_nivel;
        $module = $this->createContent('modules', ['level_id' => $level, 'title' => 'Curso', 'description' => 'Objetivo', 'published' => true]);
        $draft = $this->createContent('modules', ['level_id' => $level, 'title' => 'Borrador', 'description' => 'Objetivo']);
        $unit = $this->createContent('units', ['module_id' => $module, 'title' => 'Unidad', 'description' => 'Objetivo', 'published' => true]);
        foreach (range(1, 21) as $i) {
            $this->createContent('contents', ['unit_id' => $unit, 'title' => 'Tema '.$i, 'body' => 'Lectura', 'kind' => 'vocabulary', 'published' => true]);
        }
        Sanctum::actingAs(Usuario::factory()->create());
        $this->getJson('/api/modules/'.$module.'/contents')->assertOk()->assertJsonCount(20, 'data')->assertJsonPath('total', 21)->assertJsonPath('last_page', 2);
        $this->getJson('/api/modules/'.$module.'/contents?page=2')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.title', 'Tema 21');
        $this->getJson('/api/modules/'.$module.'/contents?page=0')->assertUnprocessable();
        $this->getJson('/api/modules/'.$draft.'/contents')->assertNotFound();
    }
}
