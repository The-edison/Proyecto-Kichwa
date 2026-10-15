<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\Modulo;
use App\Models\Nivel;
use App\Models\Tema;
use App\Models\Unidad;
use App\Models\Usuario;
use Database\Seeders\UnidadUnoDefinitivaSeeder;
use Database\Seeders\UnidadUnoGuiadaSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class StudentVisibleCatalogTest extends TestCase
{
    use UsesPostgreSQL;

    private function activity(Unidad $unit, bool $published = true, ?int $topic = null): Actividad
    {
        return Actividad::create(['id_unidad' => $unit->id_unidad, 'id_tema' => $topic, 'tipo_actividad' => 'seleccion_multiple',
            'enunciado_actividad' => 'Selecciona la palabra.', 'elementos_actividad' => [['id' => 'a', 'texto' => 'wasi'], ['id' => 'b', 'texto' => 'sisa']],
            'zonas_actividad' => [], 'solucion_actividad' => ['seleccion' => ['a']], 'publicado' => $published,
            'configuracion' => ['max_selections' => 1, 'managed' => true, 'reviewed' => true],
            'orden_actividad' => 1 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad')]);
    }

    private function unit(int $module, bool $published = true): Unidad
    {
        return Unidad::create(['id_modulo' => $module, 'titulo_unidad' => 'Palabras de práctica', 'objetivo_unidad' => 'Reconocer palabras.',
            'orden_unidad' => 1 + (int) Unidad::where('id_modulo', $module)->max('orden_unidad'), 'publicado' => $published]);
    }

    public function test_admin_overview_and_student_progress_count_only_the_four_visible_guided_activities(): void
    {
        $this->seed(UnidadUnoGuiadaSeeder::class);
        $house = Actividad::where('origen_reactivo', 'u1-guided-v3-1')->firstOrFail();
        $unit = Unidad::findOrFail($house->id_unidad);
        $this->activity($unit, false);
        $this->activity($unit, true, Tema::where('clave_leccion', UnidadUnoGuiadaSeeder::LESSON_KEY)->value('id_tema'));
        Sanctum::actingAs(Usuario::factory()->create());
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 4);
        $this->getJson('/api/progress')->assertOk()->assertJsonPath('0.total_activities', 4)->assertJsonPath('0.completed_activities', 0);
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->getJson('/api/admin/overview')->assertOk()->assertJsonPath('exercises', 4)->assertJsonPath('contents', 1);
        $this->assertDatabaseHas('actividades', ['id_actividad' => $house->id_actividad]);
    }

    public function test_hidden_parents_hidden_topics_and_old_versions_are_excluded_from_both_roles(): void
    {
        $this->seed(UnidadUnoGuiadaSeeder::class);
        $house = Actividad::where('origen_reactivo', 'u1-guided-v3-1')->firstOrFail();
        $unit = Unidad::findOrFail($house->id_unidad);
        $unit->update(['configuracion' => ['learning_mode' => 'classic']]);
        $topic = Tema::create(['id_unidad' => $unit->id_unidad, 'titulo_tema' => 'Tema pendiente', 'tipo_tema' => 'vocabulario',
            'contenido_tema' => 'Contenido pendiente.', 'orden_tema' => 99, 'publicado' => false]);
        $this->activity($unit, true, $topic->id_tema);
        $this->activity($this->unit($unit->id_modulo, false));
        $hiddenModule = Modulo::create(['id_nivel' => Modulo::findOrFail($unit->id_modulo)->id_nivel, 'nombre_modulo' => 'Módulo pendiente',
            'descripcion_modulo' => 'Preparación.', 'orden_modulo' => 99, 'publicado' => false]);
        $this->activity($this->unit($hiddenModule->id_modulo));
        $hiddenLevel = Nivel::create(['nombre_nivel' => 'Nivel pendiente', 'descripcion_nivel' => 'Preparación.', 'orden_nivel' => 99, 'publicado' => false]);
        $module = Modulo::create(['id_nivel' => $hiddenLevel->id_nivel, 'nombre_modulo' => 'Módulo de nivel oculto',
            'descripcion_modulo' => 'Preparación.', 'orden_modulo' => 1, 'publicado' => true]);
        $this->activity($this->unit($module->id_modulo));
        $copy = $house->replicate();
        $copy->orden_actividad = 1 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
        $copy->save();
        Sanctum::actingAs(Usuario::factory()->create());
        $catalog = $this->getJson('/api/units/'.$unit->id_unidad.'/exercises')->assertOk()->assertJsonPath('total', 4)->json('data');
        $this->assertContains($copy->id_actividad, array_column($catalog, 'id'));
        $this->assertNotContains($house->id_actividad, array_column($catalog, 'id'));
        $this->getJson('/api/progress')->assertOk()->assertJsonPath('0.total_activities', 4);
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->getJson('/api/admin/overview')->assertOk()->assertJsonPath('exercises', 4)->assertJsonPath('contents', 1);
    }

    public function test_sequence_counts_exclude_published_activities_outside_the_student_route(): void
    {
        $this->seed(UnidadUnoDefinitivaSeeder::class);
        $unit = Unidad::where('configuracion->learning_mode', 'sequence')->firstOrFail();
        $this->activity($unit);
        Sanctum::actingAs(Usuario::factory()->create());
        $this->getJson('/api/units/'.$unit->id_unidad.'/sequence')->assertOk()->assertJsonCount(7, 'exercises');
        $this->getJson('/api/units/'.$unit->id_unidad.'/exercises')->assertOk()->assertJsonPath('total', 7);
        $this->getJson('/api/progress')->assertOk()->assertJsonPath('0.total_activities', 7);
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->getJson('/api/admin/overview')->assertOk()->assertJsonPath('exercises', 7);
    }

    public function test_published_topic_exercises_are_included_in_the_student_and_admin_totals(): void
    {
        $this->seed(UnidadUnoGuiadaSeeder::class);
        $house = Actividad::where('origen_reactivo', 'u1-guided-v3-1')->firstOrFail();
        $unit = Unidad::findOrFail($house->id_unidad);
        $unit->update(['configuracion' => ['learning_mode' => 'classic']]);
        $topic = Tema::where('clave_leccion', UnidadUnoGuiadaSeeder::LESSON_KEY)->firstOrFail();
        $this->activity($unit, true, $topic->id_tema);
        Sanctum::actingAs(Usuario::factory()->create());
        $this->getJson('/api/units/'.$unit->id_unidad.'/exercises')->assertOk()->assertJsonPath('total', 4);
        $this->getJson('/api/units/'.$unit->id_unidad.'/exercises?topic_id='.$topic->id_tema)->assertOk()->assertJsonPath('total', 1);
        $this->getJson('/api/progress')->assertOk()->assertJsonPath('0.total_activities', 5);
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->getJson('/api/admin/overview')->assertOk()->assertJsonPath('exercises', 5);
    }
}
